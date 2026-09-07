"""Reusable SES-backed notification service."""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from functools import lru_cache
from pathlib import Path
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import BackgroundTasks
from jinja2 import (
    Environment,
    FileSystemLoader,
    StrictUndefined,
    TemplateError,
    select_autoescape,
)

from backend.core.app_logging import LOGGER_NAME
from backend.core.config import Settings, get_settings
from backend.core.retry import aws_retry

logger = logging.getLogger(f"{LOGGER_NAME}.notifications")


def format_notification_value(value: Any) -> str:
    """Render a DB value for email templates; null/blank become "" so templates
    can hide the row entirely with a truthiness guard.

    Shared by booking_service.py, guest_service.py, and floor_layout_service.py
    so every notification context formats dates, times, and missing values the
    same way.
    """
    if isinstance(value, datetime):
        return value.strftime("%a, %d %b %Y, %H:%M")
    if isinstance(value, date):
        return value.strftime("%a, %d %b %Y")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if value is None:
        return ""
    return str(value).strip()


def format_person(name: Any, email: Any) -> str:
    """Render a "Name (email)" label for email templates; blank when both absent."""
    display_name = str(name or "").strip()
    display_email = str(email or "").strip()
    if display_name and display_email:
        return f"{display_name} ({display_email})"
    return display_name or display_email


def booking_notification_details(booking: dict[str, Any]) -> dict[str, str]:
    """Build the common booking-fact context shared by every booking email.

    Absent values are empty strings (never placeholders or database ids) so the
    templates render only the rows that apply to the event.
    """
    seat = str(booking.get("seat_code") or "").strip()
    location = ", ".join(
        str(value)
        for value in (
            booking.get("floor_name"),
            booking.get("building_name"),
            booking.get("site_name"),
        )
        if value
    )

    return {
        "booking_id": format_notification_value(booking.get("booking_id")),
        "booking_date": format_notification_value(booking.get("booking_date")),
        "site": format_notification_value(booking.get("site_name")),
        "building": format_notification_value(booking.get("building_name")),
        "floor": format_notification_value(booking.get("floor_name")),
        "seat": seat,
        "booked_for": format_person(
            booking.get("booked_for_name"),
            booking.get("booked_for_email"),
        ),
        "booked_by": format_person(
            booking.get("booked_by_name"),
            booking.get("booked_by_email"),
        ),
        "guest_visit_id": format_notification_value(booking.get("guest_visit_id")),
        "host_name": format_notification_value(booking.get("host_name")),
        "host_email": format_notification_value(booking.get("host_email")),
        "guest_name": format_notification_value(booking.get("guest_name")),
        "guest_email": format_notification_value(booking.get("guest_email")),
        "guest_phone": format_notification_value(booking.get("guest_phone")),
        "guest_organization": format_notification_value(booking.get("guest_organization")),
        "seat_name": seat,
        "location": location,
    }


class NotificationService:
    """Render filesystem templates and send emails through Amazon SES."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._ses_client = self._build_ses_client()
        self._template_env = self._build_template_environment()

    def render_template(self, template_name: str, context: dict[str, Any]) -> str:
        """Render one HTML email template with autoescaping enabled."""
        try:
            template = self._template_env.get_template(template_name)
            return template.render(**context)
        except TemplateError:
            logger.exception(
                "notification.template_render_failed template=%s context_keys=%s",
                template_name,
                sorted(context.keys()),
            )
            raise

    def send_email(
        self,
        to_emails: list[str],
        subject: str,
        template_name: str,
        context: dict[str, Any],
    ) -> None:
        """Render and send a generic template-based SES email."""
        recipients = _normalize_emails(to_emails)
        if not recipients:
            logger.warning(
                "notification.skipped reason=no_recipients template=%s subject=%s",
                template_name,
                subject,
            )
            return

        try:
            html_body = self.render_template(template_name, context)
        except TemplateError:
            return

        @aws_retry(
            logger=logger,
            operation_name="ses.send_email",
            max_retries=self._settings.aws_ses_max_retries,
            initial_delay_seconds=self._settings.aws_retry_initial_delay_seconds,
            max_delay_seconds=self._settings.aws_retry_max_delay_seconds,
        )
        def send_with_retry() -> dict[str, Any]:
            return self._ses_client.send_email(
                Source=self._settings.aws_ses_sender_email,
                Destination={
                    "ToAddresses": recipients,
                },
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8",
                    },
                    "Body": {
                        "Html": {
                            "Data": html_body,
                            "Charset": "UTF-8",
                        },
                    },
                },
            )

        logger.info(
            "notification.send.start template=%s recipient_count=%s subject=%s",
            template_name,
            len(recipients),
            subject,
        )

        try:
            response = send_with_retry()
        except (BotoCoreError, ClientError):
            logger.exception(
                "notification.failure template=%s recipient_count=%s subject=%s",
                template_name,
                len(recipients),
                subject,
            )
            return

        logger.info(
            "notification.success template=%s recipient_count=%s message_id=%s",
            template_name,
            len(recipients),
            response.get("MessageId", "-"),
        )

    def send_booking_created(
        self,
        to_emails: list[str],
        context: dict[str, Any],
    ) -> None:
        self.send_email(
            to_emails=to_emails,
            subject="Seat booking confirmed",
            template_name="booking_created.html",
            context=context,
        )

    def send_booking_cancelled(
        self,
        to_emails: list[str],
        context: dict[str, Any],
    ) -> None:
        self.send_email(
            to_emails=to_emails,
            subject="Seat booking cancelled",
            template_name="booking_cancelled.html",
            context=context,
        )

    def send_booking_modified(
        self,
        to_emails: list[str],
        context: dict[str, Any],
    ) -> None:
        self.send_email(
            to_emails=to_emails,
            subject="Seat booking updated",
            template_name="booking_modified.html",
            context=context,
        )

    def send_floor_layout_uploaded(
        self,
        to_emails: list[str],
        context: dict[str, Any],
    ) -> None:
        self.send_email(
            to_emails=to_emails,
            subject="Floor layout uploaded",
            template_name="floor_layout_uploaded.html",
            context=context,
        )

    def _build_ses_client(self) -> BaseClient:
        return boto3.client(
        "ses",
        region_name=self._settings.aws_region,
    )

    def _build_template_environment(self) -> Environment:
        template_dir = _resolve_template_dir(self._settings.email_template_dir)
        return Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(enabled_extensions=("html", "xml")),
            undefined=StrictUndefined,
        )


@lru_cache
def get_notification_service() -> NotificationService:
    """Return the process-wide notification service instance."""
    return NotificationService()


def queue_email_notification(
    background_tasks: BackgroundTasks,
    *,
    to_emails: list[str],
    subject: str,
    template_name: str,
    context: dict[str, Any],
) -> None:
    """Queue a generic template notification for after the response is sent."""
    _queue_notification(
        background_tasks,
        method_name="send_email",
        event_name="email",
        to_emails=to_emails,
        context=context,
        subject=subject,
        template_name=template_name,
    )


def queue_booking_created_notification(
    background_tasks: BackgroundTasks,
    *,
    to_emails: list[str],
    context: dict[str, Any],
) -> None:
    _queue_notification(
        background_tasks,
        method_name="send_booking_created",
        event_name="booking_created",
        to_emails=to_emails,
        context=context,
    )


def queue_booking_cancelled_notification(
    background_tasks: BackgroundTasks,
    *,
    to_emails: list[str],
    context: dict[str, Any],
) -> None:
    _queue_notification(
        background_tasks,
        method_name="send_booking_cancelled",
        event_name="booking_cancelled",
        to_emails=to_emails,
        context=context,
    )


def queue_booking_modified_notification(
    background_tasks: BackgroundTasks,
    *,
    to_emails: list[str],
    context: dict[str, Any],
) -> None:
    _queue_notification(
        background_tasks,
        method_name="send_booking_modified",
        event_name="booking_modified",
        to_emails=to_emails,
        context=context,
    )


def queue_floor_layout_uploaded_notification(
    background_tasks: BackgroundTasks,
    *,
    to_emails: list[str],
    context: dict[str, Any],
) -> None:
    _queue_notification(
        background_tasks,
        method_name="send_floor_layout_uploaded",
        event_name="floor_layout_uploaded",
        to_emails=to_emails,
        context=context,
    )


def _queue_notification(
    background_tasks: BackgroundTasks,
    *,
    method_name: str,
    event_name: str,
    to_emails: list[str],
    context: dict[str, Any],
    subject: str | None = None,
    template_name: str | None = None,
) -> None:
    recipients = _normalize_emails(to_emails)
    if not recipients:
        logger.warning("notification.queue_skipped event=%s reason=no_recipients", event_name)
        return

    task_context = dict(context)
    background_tasks.add_task(
        _dispatch_notification,
        method_name=method_name,
        to_emails=recipients,
        context=task_context,
        subject=subject,
        template_name=template_name,
    )
    logger.info(
        "notification.queued event=%s recipient_count=%s context_keys=%s",
        event_name,
        len(recipients),
        sorted(task_context.keys()),
    )


def _dispatch_notification(
    *,
    method_name: str,
    to_emails: list[str],
    context: dict[str, Any],
    subject: str | None,
    template_name: str | None,
) -> None:
    try:
        service = get_notification_service()
        if method_name == "send_email":
            if subject is None or template_name is None:
                raise ValueError("Generic notifications require subject and template_name.")
            service.send_email(
                to_emails=to_emails,
                subject=subject,
                template_name=template_name,
                context=context,
            )
            return

        notification_method = getattr(service, method_name)
        notification_method(to_emails=to_emails, context=context)
    except Exception:
        logger.exception(
            "notification.background_failure method=%s recipient_count=%s context_keys=%s",
            method_name,
            len(to_emails),
            sorted(context.keys()),
        )


def _resolve_template_dir(configured_path: str) -> Path:
    template_dir = Path(configured_path)
    if template_dir.is_absolute():
        return template_dir
    backend_root = Path(__file__).resolve().parents[1]
    return backend_root / template_dir


def _normalize_emails(emails: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for email in emails:
        candidate = str(email or "").strip()
        if not candidate:
            continue
        dedupe_key = candidate.lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        normalized.append(candidate)
    return normalized
