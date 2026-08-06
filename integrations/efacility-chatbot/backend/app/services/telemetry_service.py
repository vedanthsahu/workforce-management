from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import logging
import os
try:
    import resource
except ImportError:  # Windows does not provide the Unix resource module.
    resource = None
from time import perf_counter
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class TelemetryEvent:
    event_type: str
    created_at: str
    data: dict[str, Any] = field(default_factory=dict)


class TelemetryService:
    """In-memory operational telemetry for local/admin visibility.

    This is intentionally lightweight. It gives a confidence/performance snapshot
    without requiring a new persistence dependency; production can later replace
    this with OpenTelemetry, Prometheus, or a database-backed collector.
    """

    def __init__(self, max_events: int = 500):
        self._events: deque[TelemetryEvent] = deque(maxlen=max_events)
        self._intent_counts: Counter[str] = Counter()
        self._intent_source_counts: Counter[str] = Counter()
        self._intent_acceptance_counts: Counter[str] = Counter()
        self._intent_confidence_sum: Counter[str] = Counter()
        self._intent_confidence_count: Counter[str] = Counter()
        self._intent_confidence_buckets: Counter[str] = Counter()
        self._fallback_count = 0
        self._fallback_by_reason: Counter[str] = Counter()
        self._fallback_by_source: Counter[str] = Counter()
        self._fallback_by_node: Counter[str] = Counter()
        self._confirmation_count = 0
        self._latencies_ms: deque[float] = deque(maxlen=max_events)
        self._menu_view_counts: Counter[str] = Counter()
        self._menu_selection_counts: Counter[str] = Counter()
        self._menu_labels: dict[str, str] = {}
        self._booking_funnel: Counter[str] = Counter()
        self._seat_recommendation_counts: Counter[str] = Counter()
        self._step_counts: Counter[str] = Counter()
        self._api_call_counts: Counter[str] = Counter()
        self._api_call_status_counts: Counter[str] = Counter()
        self._api_call_duplicate_counts: Counter[str] = Counter()

    def record_intent(
        self,
        intent: str,
        confidence: float,
        source: str,
        *,
        accepted: bool,
        needs_confirmation: bool,
        node: Optional[str] = None,
    ):
        if not settings.ENABLE_TELEMETRY:
            return
        self._intent_counts[intent] += 1
        self._intent_source_counts[f"{intent}:{source}"] += 1
        self._intent_acceptance_counts["accepted" if accepted else "rejected"] += 1
        self._intent_confidence_sum[intent] += confidence
        self._intent_confidence_count[intent] += 1
        self._intent_confidence_buckets[self._confidence_bucket(confidence)] += 1

        fallback_reason = None
        if intent == "UNKNOWN":
            fallback_reason = "unknown_intent"
        elif not accepted:
            fallback_reason = "low_confidence_or_guard"
        elif source == "pgvector":
            fallback_reason = "pgvector_used"

        if fallback_reason:
            self._fallback_count += 1
            self._fallback_by_reason[fallback_reason] += 1
            self._fallback_by_source[source] += 1
            if node:
                self._fallback_by_node[node] += 1
        if needs_confirmation:
            self._confirmation_count += 1
        data = {
            "intent": intent,
            "confidence": round(confidence, 4),
            "confidence_bucket": self._confidence_bucket(confidence),
            "source": source,
            "accepted": accepted,
            "needs_confirmation": needs_confirmation,
            "fallback_reason": fallback_reason,
            "node": node,
        }
        logger.info("Telemetry intent=%s confidence=%.4f source=%s accepted=%s node=%s fallback=%s",
                    intent, confidence, source, accepted, node, fallback_reason)
        self._append("intent", data)

    def record_latency(self, route: str, elapsed_ms: float, *, ok: bool = True):
        if not settings.ENABLE_TELEMETRY:
            return
        self._latencies_ms.append(elapsed_ms)
        self._append("latency", {"route": route, "elapsed_ms": round(elapsed_ms, 2), "ok": ok})

    def record_menu_view(self, *, parent_id: Optional[int], option_count: int, node: str):
        if not settings.ENABLE_TELEMETRY:
            return
        key = "root" if parent_id is None else f"menu:{parent_id}"
        self._menu_view_counts[key] += 1
        self._append("menu_view", {
            "menu_key": key,
            "parent_id": parent_id,
            "option_count": option_count,
            "node": node,
        })

    def record_menu_selection(
        self,
        *,
        menu_key: str,
        label: str,
        target_node: Optional[str],
        parent_id: Optional[int],
    ):
        if not settings.ENABLE_TELEMETRY:
            return
        key = menu_key or label
        self._menu_selection_counts[key] += 1
        self._menu_labels[key] = label
        logger.info("Telemetry menu_selection key=%s label=%s target=%s parent=%s",
                    key, label, target_node, parent_id)
        self._append("menu_selection", {
            "menu_key": key,
            "label": label,
            "target_node": target_node,
            "parent_id": parent_id,
        })

    def record_booking_event(self, event_name: str, **data: Any):
        if not settings.ENABLE_TELEMETRY:
            return
        self._booking_funnel[event_name] += 1
        logger.info("Telemetry booking_event=%s data=%s", event_name, data)
        self._append("booking", {"booking_event": event_name, **data})

    def record_step(self, step: str, **data: Any):
        if not settings.ENABLE_TELEMETRY:
            return
        self._step_counts[step] += 1
        logger.info("Telemetry step=%s data=%s", step, data)
        self._append("step", {"step": step, **data})

    def record_seat_backend_call(
        self,
        *,
        method: str,
        path: str,
        params: Optional[dict[str, Any]] = None,
        status_code: Optional[int] = None,
        elapsed_ms: Optional[float] = None,
        ok: bool,
        request_id: str = "",
        payload_shape: Optional[str] = None,
        item_count: Optional[int] = None,
        error: Optional[str] = None,
    ):
        if not settings.ENABLE_TELEMETRY:
            return
        params = params or {}
        signature = self._api_signature(method, path, params)
        self._api_call_counts[signature] += 1
        if status_code is not None:
            self._api_call_status_counts[f"{path}:{status_code}"] += 1
        request_signature = f"{request_id or 'no_request'}:{signature}"
        self._api_call_duplicate_counts[request_signature] += 1
        duplicate_count = self._api_call_duplicate_counts[request_signature]
        data = {
            "method": method,
            "path": path,
            "params": self._safe_params(params),
            "status_code": status_code,
            "elapsed_ms": round(elapsed_ms or 0.0, 2),
            "ok": ok,
            "request_id": request_id,
            "payload_shape": payload_shape,
            "item_count": item_count,
            "duplicate_count_in_request": duplicate_count,
            "error": error,
        }
        logger.info(
            "Telemetry seat_backend_call request_id=%s method=%s path=%s params=%s status=%s elapsed_ms=%s ok=%s duplicate_count=%s payload=%s item_count=%s error=%s",
            request_id,
            method,
            path,
            data["params"],
            status_code,
            data["elapsed_ms"],
            ok,
            duplicate_count,
            payload_shape,
            item_count,
            error,
        )
        self._append("seat_backend_call", data)

    def record_seat_recommendation(
        self,
        *,
        strategy: str,
        seat_count: int,
        amenity_fallback: bool,
        seat_type_fallback: bool,
    ):
        if not settings.ENABLE_TELEMETRY:
            return
        self._seat_recommendation_counts[f"strategy:{strategy or 'unknown'}"] += 1
        if amenity_fallback:
            self._seat_recommendation_counts["fallback:amenity"] += 1
        if seat_type_fallback:
            self._seat_recommendation_counts["fallback:seat_type"] += 1
        if seat_count == 0:
            self._seat_recommendation_counts["result:no_seats"] += 1
        else:
            self._seat_recommendation_counts["result:seats_found"] += 1
        self._append("seat_recommendation", {
            "strategy": strategy,
            "seat_count": seat_count,
            "amenity_fallback": amenity_fallback,
            "seat_type_fallback": seat_type_fallback,
        })

    def timer(self) -> float:
        return perf_counter()

    def elapsed_ms(self, start: float) -> float:
        return (perf_counter() - start) * 1000

    def snapshot(self) -> dict[str, Any]:
        latencies = list(self._latencies_ms)
        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
        intent_total = sum(self._intent_counts.values())
        booking_started = self._booking_funnel["booking_flow_started"]
        booking_confirmed = self._booking_funnel["booking_created"]
        confirmation_shown = self._booking_funnel["confirmation_shown"]
        return {
            "enabled": settings.ENABLE_TELEMETRY,
            "intent": {
                "total": intent_total,
                "counts": dict(self._intent_counts),
                "by_source": dict(self._intent_source_counts),
                "acceptance": dict(self._intent_acceptance_counts),
                "confidence_buckets": dict(self._intent_confidence_buckets),
                "avg_confidence_by_intent": self._avg_confidence_by_intent(),
                "confirmation_count": self._confirmation_count,
            },
            "fallback": {
                "count": self._fallback_count,
                "rate": self._rate(self._fallback_count, intent_total),
                "by_reason": dict(self._fallback_by_reason),
                "by_source": dict(self._fallback_by_source),
                "by_node": dict(self._fallback_by_node),
            },
            "booking_conversion": {
                "funnel": dict(self._booking_funnel),
                "confirmation_rate": self._rate(confirmation_shown, booking_started),
                "conversion_rate": self._rate(booking_confirmed, booking_started),
            },
            "seat_recommendations": dict(self._seat_recommendation_counts),
            "steps": self._ranked_counter(self._step_counts),
            "seat_backend_api": {
                "top_calls": self._ranked_counter(self._api_call_counts),
                "statuses": dict(self._api_call_status_counts),
                "duplicate_calls_in_request": [
                    {"key": key, "count": count}
                    for key, count in self._api_call_duplicate_counts.most_common(20)
                    if count > 1
                ],
            },
            "menus": {
                "views": self._ranked_counter(self._menu_view_counts),
                "selections": [
                    {
                        "menu_key": key,
                        "label": self._menu_labels.get(key, key),
                        "count": count,
                    }
                    for key, count in self._menu_selection_counts.most_common(10)
                ],
            },
            "latency": {
                "count": len(latencies),
                "avg_ms": round(avg_latency, 2),
                "max_ms": round(max(latencies), 2) if latencies else 0.0,
            },
            "memory": self._memory_snapshot(),
            "recent_events": [
                {"event_type": event.event_type, "created_at": event.created_at, **event.data}
                for event in list(self._events)[-25:]
            ],
        }

    def _append(self, event_type: str, data: dict[str, Any]):
        self._events.append(TelemetryEvent(
            event_type=event_type,
            created_at=datetime.now(timezone.utc).isoformat(),
            data=data,
        ))

    @staticmethod
    def _safe_params(params: dict[str, Any]) -> dict[str, Any]:
        sensitive = {"access_token", "refresh_token", "session_token", "authorization", "cookie"}
        return {
            key: ("***" if str(key).lower() in sensitive else value)
            for key, value in sorted(params.items(), key=lambda item: str(item[0]))
        }

    @classmethod
    def _api_signature(cls, method: str, path: str, params: dict[str, Any]) -> str:
        safe_params = cls._safe_params(params)
        param_text = "&".join(f"{key}={safe_params[key]}" for key in safe_params)
        return f"{method.upper()} {path}?{param_text}" if param_text else f"{method.upper()} {path}"

    def _avg_confidence_by_intent(self) -> dict[str, float]:
        averages: dict[str, float] = {}
        for intent, total in self._intent_confidence_sum.items():
            count = self._intent_confidence_count[intent]
            averages[intent] = round(total / count, 4) if count else 0.0
        return averages

    @staticmethod
    def _confidence_bucket(confidence: float) -> str:
        if confidence >= 0.80:
            return "high"
        if confidence >= 0.60:
            return "medium"
        return "low"

    @staticmethod
    def _rate(numerator: int, denominator: int) -> float:
        return round(numerator / denominator, 4) if denominator else 0.0

    @staticmethod
    def _ranked_counter(counter: Counter[str], limit: int = 10) -> list[dict[str, Any]]:
        return [{"key": key, "count": count} for key, count in counter.most_common(limit)]

    def _memory_snapshot(self) -> dict[str, Any]:
        rss_mb = None
        if resource is not None:
            rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            rss_mb = round(rss_kb / 1024, 2)
        events = list(self._events)
        event_bytes = len(json.dumps(
            [{"event_type": event.event_type, "created_at": event.created_at, **event.data} for event in events],
            default=str,
        ))
        return {
            "process_id": os.getpid(),
            "process_max_rss_mb": rss_mb,
            "telemetry_event_count": len(events),
            "telemetry_event_capacity": self._events.maxlen,
            "telemetry_event_buffer_kb": round(event_bytes / 1024, 2),
            "session_memory_design": "Redis TTL-backed context plus bounded in-process telemetry buffer",
        }


telemetry_service = TelemetryService()
