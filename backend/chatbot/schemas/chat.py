"""
Pydantic schemas for request/response validation.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# â”€â”€ Enums â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class MessageType(str, Enum):
    TEXT = "TEXT"
    OPTIONS = "OPTIONS"
    FORM_CARD = "FORM_CARD"
    SEAT_LIST = "SEAT_LIST"
    CONFIRMATION = "CONFIRMATION"
    SUCCESS = "SUCCESS"
    ERROR = "ERROR"
    QUICK_BOOK = "QUICK_BOOK"
    BOOKING_LIST = "BOOKING_LIST"
    REBOOK_CALENDAR = "REBOOK_CALENDAR"


# â”€â”€ Session schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class CreateSessionRequest(BaseModel):
    user_name: str | None = Field(
        default=None,
        max_length=255,
        description="Deprecated; browser identity comes from SeatBook.",
    )


class SessionOut(BaseModel):
    session_id: str
    user_name: str
    current_node: str
    state: str
    initial_response: ChatResponse | None = None

    class Config:
        from_attributes = True


# â”€â”€ Chat message schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class UserMessage(BaseModel):
    text: str | None = None
    form_data: dict[str, Any] | None = None
    message_type: str = "TEXT"


class ChatOption(BaseModel):
    number: int
    label: str
    value: Any


class FormField(BaseModel):
    key: str
    label: str
    field_type: str
    required: bool = True
    options: list[dict] | None = None
    default_value: Any | None = None
    lookup_endpoint: str | None = None
    depends_on: str | None = None
    min_value: int | None = None
    max_value: int | None = None
    min_date: str | None = None
    max_date: str | None = None
    placeholder: str | None = None


class FormCard(BaseModel):
    title: str
    subtitle: str | None = None
    node: str
    fields: list[FormField]
    submit_label: str = "Continue"


class SeatCard(BaseModel):
    id: int
    seat_code: str
    seat_type: str
    seat_neighborhood: str | None
    amenities: list[str] = []
    is_available: bool = True
    x: float | None = None
    y: float | None = None


class SeatList(BaseModel):
    seats: list[SeatCard]
    seat_catalog: list[SeatCard] = []
    total: int
    floor_name: str
    building_name: str
    headcount: int = 1


class BookingConfirmation(BaseModel):
    booking_date: str
    site_name: str
    building_name: str
    floor_name: str
    seat_code: str
    seat_type: str
    headcount: int
    amenities: list[str]


class BookingSuccess(BaseModel):
    booking_ref: str
    booking_date: str
    seat_code: str
    site_name: str
    message: str


class QuickBookCard(BaseModel):
    prompt: str
    last_seat_code: str
    last_site: str
    last_building: str
    last_floor: str
    last_seat_type: str


class BookingCard(BaseModel):
    booking_id: str
    booking_ref: str
    booking_date: str
    site_name: str
    building_name: str
    floor_name: str
    seat_code: str
    seat_type: str
    status: str
    can_modify: bool = True
    can_cancel: bool = True
    can_rebook: bool = False


class BookingListData(BaseModel):
    bookings: list[BookingCard]
    total: int
    mode: str = "upcoming"


class RebookCalendarDay(BaseModel):
    date: str
    available: bool
    selectable: bool = True
    reserved: bool = False
    reserved_seat_available: bool = False


class RebookCalendarData(BaseModel):
    booking_id: str
    seat_code: str
    site_name: str
    building_name: str
    floor_name: str
    month_start: str
    previous_month_start: str | None = None
    next_month_start: str
    days: list[RebookCalendarDay]


class BotMessage(BaseModel):
    type: MessageType
    text: str | None = None
    options: list[ChatOption] | None = None
    form_card: FormCard | None = None
    seat_list: SeatList | None = None
    confirmation: BookingConfirmation | None = None
    success: BookingSuccess | None = None
    quick_book: QuickBookCard | None = None
    booking_list: BookingListData | None = None
    rebook_calendar: RebookCalendarData | None = None


class ChatResponse(BaseModel):
    session_id: str
    current_node: str
    state: str
    messages: list[BotMessage]
