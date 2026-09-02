"""
Chatbot-owned tables. These are created and managed exclusively by the chatbot service.
Use chatbot_ prefix to avoid collision with existing application tables.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
from app.database import Base


class ChatbotSession(Base):
    __tablename__ = "chatbot_sessions"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tenant_id = Column(Integer, nullable=False, default=3)
    user_name = Column(String(255), nullable=False)
    state = Column(String(50), nullable=False, default="INITIATED")
    # State values: INITIATED, NAVIGATING, BOOKING_WHEN_WHERE, BOOKING_DETAILS,
    #               SELECTING_SEAT, CONFIRMING, COMPLETED, ABANDONED, CANCELLED
    current_node = Column(String(100), nullable=False, default="MAIN_MENU")
    current_menu_id = Column(Integer, nullable=True)
    context_data = Column(MutableDict.as_mutable(JSONB), nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    messages = relationship("ChatbotMessage", back_populates="session",
                           cascade="all, delete-orphan")


class ChatbotMessage(Base):
    __tablename__ = "chatbot_messages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(PG_UUID(as_uuid=True), ForeignKey("chatbot_sessions.id"), nullable=False, index=True)
    direction = Column(String(10), nullable=False)   # IN | OUT
    message_text = Column(Text, nullable=False)
    message_type = Column(String(30), nullable=False, default="TEXT")
    # Message types: TEXT, OPTIONS, FORM_CARD, SEAT_LIST, CONFIRMATION, SUCCESS, ERROR
    node_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    session = relationship("ChatbotSession", back_populates="messages")


__all__ = ["ChatbotSession", "ChatbotMessage"]
