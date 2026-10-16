"""
Pydantic schemas for request/response validation.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────────────

class MessageType(str, Enum):
    TEXT          = "TEXT"
    OPTIONS       = "OPTIONS"
    FORM_CARD     = "FORM_CARD"
    SEAT_LIST     = "SEAT_LIST"
    CONFIRMATION  = "CONFIRMATION"
    SUCCESS       = "SUCCESS"
    ERROR         = "ERROR"
    QUICK_BOOK    = "QUICK_BOOK"
    BOOKING_LIST  = "BOOKING_LIST"
    REBOOK_CALENDAR = "REBOOK_CALENDAR"


# ── Session schemas ────────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    user_name: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Deprecated; browser identity comes from SeatBook.",
    )


class SessionOut(BaseModel):
    session_id: str
    user_name: str
    current_node: str
    state: str
    initial_response: Optional[ChatResponse] = None

    class Config:
        from_attributes = True


# ── Chat message schemas ───────────────────────────────────────────────────────

class UserMessage(BaseModel):
    text: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
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
    options: Optional[List[Dict]] = None
    default_value: Optional[Any] = None
    lookup_endpoint: Optional[str] = None
    depends_on: Optional[str] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    placeholder: Optional[str] = None


class FormCard(BaseModel):
    title: str
    subtitle: Optional[str] = None
    node: str
    fields: List[FormField]
    submit_label: str = "Continue"


class SeatCard(BaseModel):
    id: int
    seat_code: str
    seat_type: str
    seat_neighborhood: Optional[str]
    amenities: List[str] = []
    is_available: bool = True
    x: Optional[float] = None
    y: Optional[float] = None


class SeatList(BaseModel):
    seats: List[SeatCard]
    seat_catalog: List[SeatCard] = []
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
    amenities: List[str]


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
    bookings: List[BookingCard]
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
    previous_month_start: Optional[str] = None
    next_month_start: str
    days: List[RebookCalendarDay]


class BotMessage(BaseModel):
    type: MessageType
    text: Optional[str] = None
    options: Optional[List[ChatOption]] = None
    form_card: Optional[FormCard] = None
    seat_list: Optional[SeatList] = None
    confirmation: Optional[BookingConfirmation] = None
    success: Optional[BookingSuccess] = None
    quick_book: Optional[QuickBookCard] = None
    booking_list: Optional[BookingListData] = None
    rebook_calendar: Optional[RebookCalendarData] = None


class ChatResponse(BaseModel):
    session_id: str
    current_node: str
    state: str
    messages: List[BotMessage]
