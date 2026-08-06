"""
Chatbot-owned tables. These are created and managed exclusively by the chatbot service.
Use chatbot_ prefix to avoid collision with existing application tables.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
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
    current_menu_id = Column(Integer, ForeignKey("chatbot_menu_items.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    context = relationship("ChatbotSessionContext", back_populates="session",
                          cascade="all, delete-orphan")
    messages = relationship("ChatbotMessage", back_populates="session",
                           cascade="all, delete-orphan")


class ChatbotSessionContext(Base):
    __tablename__ = "chatbot_session_context"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(PG_UUID(as_uuid=True), ForeignKey("chatbot_sessions.id"), nullable=False, index=True)
    context_key = Column(String(100), nullable=False)
    context_value = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    session = relationship("ChatbotSession", back_populates="context")

    __table_args__ = (
        # Only one value per key per session
        __import__("sqlalchemy").UniqueConstraint("session_id", "context_key",
                                                   name="uq_session_context_key"),
    )


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


class ChatbotMenuItem(Base):
    __tablename__ = "chatbot_menu_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, default=3)
    parent_id = Column(Integer, ForeignKey("chatbot_menu_items.id"), nullable=True)
    menu_key = Column(String(100), nullable=False)
    label = Column(String(255), nullable=False)
    display_order = Column(Integer, nullable=False, default=0)
    target_node = Column(String(100), nullable=True)
    context_preset = Column(JSONB, default=dict)
    placeholder_msg = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    parent = relationship("ChatbotMenuItem", remote_side=[id], backref="children_rel")


class ChatbotUserIdentityMap(Base):
    __tablename__ = "chatbot_user_identity_map"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, default=3)
    channel = Column(String(50), nullable=False, default="whatsapp")
    external_id = Column(String(255), nullable=False)
    user_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "channel", "external_id", name="uq_chatbot_user_identity_map"),
    )
