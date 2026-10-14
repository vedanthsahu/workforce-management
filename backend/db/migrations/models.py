"""
REAL SCHEMA MODELS -- regenerated 2026-10-09 by refresh_models_from_db.py.
One class per real table (no prefix). This is what migrations/env.py diffs
against for autogenerate. Do not hand-edit; rerun the generator instead, or
edit directly if you are deliberately authoring the NEXT schema change before
generating its migration -- see the workflow note in migrations/env.py.
"""

from sqlalchemy import (
    Column, BigInteger, Integer, SmallInteger, String, Text, Boolean,
    DateTime, Date, Time, Numeric, ForeignKeyConstraint, UniqueConstraint,
    Index, ARRAY, text,
)
from sqlalchemy.dialects.postgresql import JSONB, JSON, UUID, INET
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Amenities(Base):
    __tablename__ = "amenities"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    amenity_key = Column(String(80), nullable=False)
    amenity_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    icon_name = Column(String(80), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    category_id = Column(BigInteger, nullable=False)
    category = Column(String(255), nullable=True)
    applicable_seat_types = Column(ARRAY(Text), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "amenity_key", name="uq_amenities_tenant_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="amenities_tenant_id_fkey"),
        ForeignKeyConstraint(["category_id"], ["amenity_categories.id"], name="fk_amenities_category"),
        Index("idx_amenities_category_id", "category_id"),
    )


class AmenityCategories(Base):
    __tablename__ = "amenity_categories"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=True)
    category_key = Column(String(80), nullable=False)
    category_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    search_keywords = Column(ARRAY(Text), nullable=True)
    is_system_defined = Column(Boolean, nullable=False, server_default=text("true"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "category_key", name="uq_amenity_categories_tenant_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="amenity_categories_tenant_id_fkey"),
        Index("idx_amenity_categories_active", "tenant_id", "is_active"),
        Index("idx_amenity_categories_tenant", "tenant_id"),
    )


class AppUsers(Base):
    __tablename__ = "app_users"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    external_user_id = Column(String(100), nullable=True)
    email = Column(String(200), nullable=False)
    full_name = Column(String(200), nullable=False)
    role_name = Column(String(30), nullable=False, server_default=text("'EMPLOYEE'::character varying"))
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    home_site_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    microsoft_object_id = Column(String(150), nullable=True)
    user_principal_name = Column(String(200), nullable=True)
    display_name = Column(String(200), nullable=True)
    mobile_phone = Column(String(50), nullable=True)
    office_location = Column(String(200), nullable=True)
    job_title = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)
    company_name = Column(String(200), nullable=True)
    employee_id = Column(String(100), nullable=True)
    manager_user_id = Column(BigInteger, nullable=True)
    graph_last_synced_at = Column(DateTime(timezone=True), nullable=True)
    skills = Column(ARRAY(Text), nullable=True)
    bio = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="app_users_tenant_id_email_key"),
        UniqueConstraint("tenant_id", "external_user_id", name="app_users_tenant_id_external_user_id_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="app_users_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["home_site_id"], ["sites.id"], name="app_users_home_site_id_fkey", ondelete="SET NULL"),
        ForeignKeyConstraint(["manager_user_id"], ["app_users.id"], name="app_users_manager_user_id_fkey"),
        Index("idx_app_users_home_site_id", "home_site_id"),
        Index("idx_app_users_role_name", "role_name"),
        Index("idx_app_users_status", "status"),
        Index("idx_app_users_tenant_id", "tenant_id"),
        Index("uq_app_users_ms_object", "tenant_id", "microsoft_object_id", unique=True),
    )


class AuditLogs(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    actor_user_id = Column(BigInteger, nullable=True)
    actor_email = Column(String(255), nullable=True)
    actor_role = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    module = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    event_status = Column(String(30), nullable=False, server_default=text("'SUCCESS'::character varying"))
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    request_id = Column(String(100), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    source_channel = Column(String(50), nullable=True)
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    changed_fields = Column(JSONB, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    failure_code = Column(String(100), nullable=True)
    failure_reason = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_audit_logs_tenant"),
        ForeignKeyConstraint(["actor_user_id"], ["app_users.id"], name="fk_audit_logs_actor_user", ondelete="SET NULL"),
        Index("idx_audit_logs_action", "tenant_id", "action", text("occurred_at DESC")),
        Index("idx_audit_logs_actor", "tenant_id", "actor_user_id", text("occurred_at DESC")),
        Index("idx_audit_logs_entity", "tenant_id", "entity_type", "entity_id"),
        Index("idx_audit_logs_module", "tenant_id", "module", text("occurred_at DESC")),
        Index("idx_audit_logs_request_id", "request_id"),
        Index("idx_audit_logs_tenant_occurred", "tenant_id", text("occurred_at DESC")),
    )


class AuthIdentities(Base):
    __tablename__ = "auth_identities"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    provider = Column(String(50), nullable=False)
    provider_tenant_id = Column(String(100), nullable=True)
    provider_user_id = Column(String(150), nullable=False)
    email = Column(String(200), nullable=False)
    raw_profile = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="auth_identities_provider_provider_user_id_key"),
        UniqueConstraint("tenant_id", "provider", "email", name="auth_identities_tenant_id_provider_email_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="auth_identities_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="auth_identities_user_id_fkey", ondelete="CASCADE"),
    )


class AuthTokenEvents(Base):
    __tablename__ = "auth_token_events"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=True)
    user_id = Column(BigInteger, nullable=True)
    session_id = Column(UUID, nullable=True)
    event_type = Column(String(50), nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="auth_token_events_tenant_id_fkey", ondelete="SET NULL"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="auth_token_events_user_id_fkey", ondelete="SET NULL"),
    )


class BlockedSeats(Base):
    __tablename__ = "blocked_seats"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    seat_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=False)
    blocked_from = Column(Date, nullable=False)
    blocked_to = Column(Date, nullable=False)
    reason = Column(String(255), nullable=True)
    block_type = Column(String(50), nullable=False, server_default=text("'Operational block'::character varying"))
    status = Column(String(30), nullable=False, server_default=text("'ACTIVE'::character varying"))
    blocked_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="blocked_seats_tenant_id_fkey"),
        ForeignKeyConstraint(["seat_id"], ["seats.id"], name="blocked_seats_seat_id_fkey"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="blocked_seats_site_id_fkey"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="blocked_seats_building_id_fkey"),
        ForeignKeyConstraint(["floor_id"], ["floors.id"], name="blocked_seats_floor_id_fkey"),
        ForeignKeyConstraint(["blocked_by_user_id"], ["app_users.id"], name="blocked_seats_blocked_by_user_id_fkey"),
        Index("idx_blocked_seats_floor_status", "floor_id", "status"),
        Index("idx_blocked_seats_seat_date", "seat_id", "blocked_from", "blocked_to"),
        Index("idx_blocked_seats_tenant_date", "tenant_id", "blocked_from", "blocked_to"),
    )


class Bookings(Base):
    __tablename__ = "bookings"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=True)
    seat_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=False)
    booking_date = Column(Date, nullable=False)
    booking_status = Column(String(20), nullable=False, server_default=text("'CONFIRMED'::character varying"))
    source_channel = Column(String(20), nullable=False, server_default=text("'WEB'::character varying"))
    check_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(250), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    booked_for_user_id = Column(BigInteger, nullable=True)
    booked_by_user_id = Column(BigInteger, nullable=False)
    booked_for_guest_id = Column(BigInteger, nullable=True)
    guest_visit_id = Column(BigInteger, nullable=True)
    booking_type = Column(String(20), nullable=False)
    modified_from_booking_id = Column(BigInteger, nullable=True)
    modification_reason = Column(String(100), nullable=True)
    updated_by_user_id = Column(BigInteger, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="bookings_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="bookings_user_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["seat_id"], ["seats.id"], name="bookings_seat_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="bookings_site_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="bookings_building_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["floor_id"], ["floors.id"], name="bookings_floor_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["booked_for_user_id"], ["app_users.id"], name="bookings_booked_for_user_id_fkey"),
        ForeignKeyConstraint(["booked_by_user_id"], ["app_users.id"], name="bookings_booked_by_user_id_fkey"),
        ForeignKeyConstraint(["booked_for_guest_id"], ["guests.id"], name="bookings_booked_for_guest_id_fkey"),
        ForeignKeyConstraint(["guest_visit_id"], ["guest_visits.id"], name="bookings_guest_visit_id_fkey"),
        ForeignKeyConstraint(["modified_from_booking_id"], ["bookings.id"], name="fk_modified_from_booking"),
        ForeignKeyConstraint(["updated_by_user_id"], ["app_users.id"], name="bookings_updated_by_user_id_fkey"),
        Index("idx_bookings_booking_date", "booking_date"),
        Index("idx_bookings_guest_visit_id", "guest_visit_id"),
        Index("idx_bookings_seat_id", "seat_id"),
        Index("idx_bookings_site_date", "site_id", "booking_date"),
        Index("idx_bookings_status", "booking_status"),
        Index("idx_bookings_tenant_date", "tenant_id", "booking_date"),
        Index("idx_bookings_tenant_id", "tenant_id"),
        Index("idx_bookings_user_id", "user_id"),
        Index("uq_bookings_tenant_guest_date_active", "tenant_id", "booked_for_guest_id", "booking_date", unique=True, postgresql_where=text("(((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_guest_id IS NOT NULL))")),
        Index("uq_bookings_tenant_seat_date", "tenant_id", "seat_id", "booking_date", unique=True, postgresql_where=text("((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text]))")),
        Index("uq_bookings_tenant_user_date_active", "tenant_id", "booked_for_user_id", "booking_date", unique=True, postgresql_where=text("(((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_user_id IS NOT NULL))")),
    )


class Buildings(Base):
    __tablename__ = "buildings"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_code = Column(String(50), nullable=False)
    building_name = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("site_id", "building_code", name="buildings_site_id_building_code_key"),
        UniqueConstraint("site_id", "building_name", name="buildings_site_id_building_name_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="buildings_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="buildings_site_id_fkey", ondelete="RESTRICT"),
        Index("idx_buildings_site_id", "site_id"),
        Index("idx_buildings_tenant_id", "tenant_id"),
    )


class BusinessRules(Base):
    __tablename__ = "business_rules"

    id = Column(BigInteger, primary_key=True)
    business_rule_key = Column(String(100), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_value = Column(String(255), nullable=False)
    data_type = Column(String(20), nullable=False)


class ChatbotMessages(Base):
    __tablename__ = "chatbot_messages"

    id = Column(UUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    session_id = Column(UUID, nullable=False)
    direction = Column(String(10), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(30), nullable=False, server_default=text("'TEXT'::character varying"))
    node_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        ForeignKeyConstraint(["session_id"], ["chatbot_sessions.id"], name="fk_chatbot_messages_session", ondelete="CASCADE"),
        Index("idx_cb_messages_session", "session_id", "created_at"),
    )


class ChatbotSessions(Base):
    __tablename__ = "chatbot_sessions"

    id = Column(UUID, primary_key=True, server_default=text("uuid_generate_v4()"))
    tenant_id = Column(Integer, nullable=False, server_default=text("3"))
    user_name = Column(String(255), nullable=False)
    state = Column(String(50), nullable=False, server_default=text("'INITIATED'::character varying"))
    current_node = Column(String(100), nullable=False, server_default=text("'MAIN_MENU'::character varying"))
    current_menu_id = Column(Integer, nullable=True)
    context_data = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    expires_at = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_cb_sessions_expires", "expires_at"),
        Index("idx_cb_sessions_user", "user_name"),
    )


class EmailLogs(Base):
    __tablename__ = "email_logs"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=True)
    email_type = Column(String(100), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    status = Column(String(50), nullable=False, server_default=text("'PENDING'::character varying"))
    provider = Column(String(50), nullable=True, server_default=text("'AWS_SES'::character varying"))
    provider_message_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    triggered_by_user_id = Column(BigInteger, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    sent_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="email_logs_tenant_id_fkey"),
        ForeignKeyConstraint(["triggered_by_user_id"], ["app_users.id"], name="email_logs_triggered_by_user_id_fkey"),
        Index("idx_email_logs_status", "status"),
        Index("idx_email_logs_tenant_created", "tenant_id", text("created_at DESC")),
        Index("idx_email_logs_type", "email_type"),
    )


class FloorLayouts(Base):
    __tablename__ = "floor_layouts"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=False)
    layout_name = Column(String(150), nullable=False)
    layout_file_url = Column(Text, nullable=False)
    file_storage_provider = Column(String(30), nullable=True, server_default=text("'S3'::character varying"))
    layout_type = Column(String(30), nullable=False, server_default=text("'SVG'::character varying"))
    version_no = Column(Integer, nullable=False, server_default=text("1"))
    is_published = Column(Boolean, nullable=False, server_default=text("false"))
    layout_metadata = Column(JSONB, nullable=True)
    uploaded_by_user_id = Column(BigInteger, nullable=True)
    published_by_user_id = Column(BigInteger, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), nullable=False, server_default=text("'DRAFT'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_by_user_id = Column(BigInteger, nullable=True)
    effective_from = Column(DateTime(timezone=True), nullable=True)
    effective_till = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "floor_id", "version_no", name="uq_floor_layout_version"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="floor_layouts_tenant_id_fkey"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="floor_layouts_site_id_fkey"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="floor_layouts_building_id_fkey"),
        ForeignKeyConstraint(["floor_id"], ["floors.id"], name="floor_layouts_floor_id_fkey"),
        ForeignKeyConstraint(["uploaded_by_user_id"], ["app_users.id"], name="floor_layouts_uploaded_by_user_id_fkey"),
        ForeignKeyConstraint(["published_by_user_id"], ["app_users.id"], name="floor_layouts_published_by_user_id_fkey"),
        ForeignKeyConstraint(["updated_by_user_id"], ["app_users.id"], name="fk_layout_updated_by_user", ondelete="SET NULL"),
        ForeignKeyConstraint(["updated_by_user_id"], ["app_users.id"], name="floor_layouts_updated_by_user_id_fkey"),
        Index("idx_floor_layouts_effective_window", "floor_id", "effective_from", "effective_till", postgresql_where=text("((status)::text = ANY ((ARRAY['PUBLISHED'::character varying, 'SCHEDULED'::character varying])::text[]))")),
        Index("ix_floor_layouts_updated_by_user_id", "updated_by_user_id"),
        Index("ix_layout_updated_by_user_id", "updated_by_user_id"),
        Index("uq_floor_layout_one_published_per_floor", "tenant_id", "floor_id", unique=True, postgresql_where=text("((is_published = true) AND ((status)::text = 'PUBLISHED'::text))")),
        Index("uq_floor_layouts_one_published_per_floor", "floor_id", unique=True, postgresql_where=text("((status)::text = 'PUBLISHED'::text)")),
        Index("uq_floor_layouts_one_scheduled_per_floor", "floor_id", unique=True, postgresql_where=text("((status)::text = 'SCHEDULED'::text)")),
    )


class Floors(Base):
    __tablename__ = "floors"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_code = Column(String(50), nullable=False)
    floor_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("building_id", "floor_code", name="floors_building_id_floor_code_key"),
        UniqueConstraint("building_id", "floor_name", name="floors_building_id_floor_name_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="floors_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="floors_site_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="floors_building_id_fkey", ondelete="RESTRICT"),
        Index("idx_floors_building_id", "building_id"),
        Index("idx_floors_site_id", "site_id"),
        Index("idx_floors_tenant_id", "tenant_id"),
    )


class GroupPermissions(Base):
    __tablename__ = "group_permissions"

    id = Column(BigInteger, primary_key=True)
    group_id = Column(BigInteger, nullable=False)
    permission_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("group_id", "permission_id", name="uq_group_permission"),
        ForeignKeyConstraint(["group_id"], ["groups.id"], name="group_permissions_group_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["permission_id"], ["permissions.id"], name="group_permissions_permission_id_fkey", ondelete="CASCADE"),
        Index("idx_group_permissions_group_id", "group_id"),
        Index("idx_group_permissions_permission_id", "permission_id"),
    )


class Groups(Base):
    __tablename__ = "groups"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    group_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, nullable=False, server_default=text("false"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    version = Column(Integer, nullable=False, server_default=text("1"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    group_name_normalized = Column(String(100), nullable=True)
    permission_set_hash = Column(String(32), nullable=True)
    group_tier = Column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "group_name_normalized", name="uq_groups_tenant_name_normalized"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="groups_tenant_id_fkey"),
        Index("idx_groups_tenant_id", "tenant_id"),
        Index("uq_groups_tenant_permission_set", "tenant_id", "permission_set_hash", unique=True, postgresql_where=text("(permission_set_hash IS NOT NULL)")),
    )


class GuestVisits(Base):
    __tablename__ = "guest_visits"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    guest_id = Column(BigInteger, nullable=False)
    host_user_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=True)
    visit_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    guest_type = Column(String(50), nullable=False)
    purpose_of_visit = Column(String(100), nullable=True)
    requires_seat = Column(Boolean, nullable=False, server_default=text("false"))
    visit_status = Column(String(30), nullable=False, server_default=text("'SCHEDULED'::character varying"))
    notes = Column(Text, nullable=True)
    created_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    modified_from_guest_visit_id = Column(BigInteger, nullable=True)
    modification_reason = Column(String(100), nullable=True)
    updated_by_user_id = Column(BigInteger, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="guest_visits_tenant_id_fkey"),
        ForeignKeyConstraint(["guest_id"], ["guests.id"], name="guest_visits_guest_id_fkey"),
        ForeignKeyConstraint(["host_user_id"], ["app_users.id"], name="guest_visits_host_user_id_fkey"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="guest_visits_site_id_fkey"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="guest_visits_building_id_fkey"),
        ForeignKeyConstraint(["floor_id"], ["floors.id"], name="guest_visits_floor_id_fkey"),
        ForeignKeyConstraint(["created_by_user_id"], ["app_users.id"], name="guest_visits_created_by_user_id_fkey"),
        ForeignKeyConstraint(["modified_from_guest_visit_id"], ["guest_visits.id"], name="fk_guest_visits_modified_from"),
        ForeignKeyConstraint(["updated_by_user_id"], ["app_users.id"], name="guest_visits_updated_by_user_id_fkey"),
        Index("idx_guest_visits_host_date", "host_user_id", "visit_date"),
        Index("idx_guest_visits_host_visit_date", "host_user_id", "visit_date"),
        Index("idx_guest_visits_status", "tenant_id", "visit_status"),
        Index("idx_guest_visits_tenant_date", "tenant_id", "visit_date"),
        Index("idx_guest_visits_tenant_guest", "tenant_id", "guest_id"),
        Index("idx_guest_visits_tenant_visit_date", "tenant_id", "visit_date"),
    )


class Guests(Base):
    __tablename__ = "guests"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=True)
    organization = Column(String(150), nullable=True)
    status = Column(String(30), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="guests_tenant_id_fkey"),
        ForeignKeyConstraint(["created_by_user_id"], ["app_users.id"], name="guests_created_by_user_id_fkey"),
        Index("idx_guests_tenant_name", "tenant_id", text("lower(full_name::text)")),
        Index("idx_guests_tenant_phone", "tenant_id", "phone"),
        Index("uq_guests_tenant_email_active", "tenant_id", text("lower(email::text)"), unique=True, postgresql_where=text("((email IS NOT NULL) AND ((status)::text = 'ACTIVE'::text))")),
    )


class LayoutSeatMappings(Base):
    __tablename__ = "layout_seat_mappings"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    layout_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=False)
    svg_element_id = Column(String(100), nullable=False)
    seat_code = Column(String(100), nullable=False)
    seat_name = Column(String(150), nullable=True)
    seat_type = Column(String(50), nullable=True)
    status = Column(String(30), nullable=True, server_default=text("'ACTIVE'::character varying"))
    is_bookable = Column(Boolean, nullable=True, server_default=text("true"))
    is_reserved = Column(Boolean, nullable=True, server_default=text("false"))
    is_configured = Column(Boolean, nullable=True, server_default=text("false"))
    configuration_status = Column(String(30), nullable=True, server_default=text("'PENDING'::character varying"))
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=True, server_default=text("now()"))
    created_by = Column(BigInteger, nullable=True)
    updated_by = Column(BigInteger, nullable=True)
    amenity_ids = Column(JSONB, nullable=True, server_default=text("'[]'::jsonb"))
    capacity = Column(Integer, nullable=True, server_default=text("1"))

    __table_args__ = (
        UniqueConstraint("layout_id", "svg_element_id", name="uq_layout_svg_element"),
        Index("idx_layout_seat_configured", "layout_id", "is_configured"),
        Index("idx_layout_seat_floor", "floor_id"),
        Index("idx_layout_seat_layout", "layout_id"),
        Index("idx_layout_seat_mappings_layout_config", "layout_id", "is_configured"),
        Index("idx_layout_seat_mappings_layout_seat_code", "layout_id", "seat_code"),
    )


class Permissions(Base):
    __tablename__ = "permissions"

    id = Column(BigInteger, primary_key=True)
    permission_key = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    module_name = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    enforcement_scope = Column(String(20), nullable=False, server_default=text("'backend'::character varying"))


class RoleGroups(Base):
    __tablename__ = "role_groups"

    id = Column(BigInteger, primary_key=True)
    role_id = Column(BigInteger, nullable=False)
    group_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("role_id", "group_id", name="uq_role_group"),
        ForeignKeyConstraint(["role_id"], ["roles.id"], name="role_groups_role_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["group_id"], ["groups.id"], name="role_groups_group_id_fkey", ondelete="CASCADE"),
        Index("idx_role_groups_group_id", "group_id"),
        Index("idx_role_groups_role_id", "role_id"),
    )


class RolePermissions(Base):
    __tablename__ = "role_permissions"

    id = Column(BigInteger, primary_key=True)
    role_id = Column(BigInteger, nullable=False)
    permission_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
        ForeignKeyConstraint(["role_id"], ["roles.id"], name="role_permissions_role_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["permission_id"], ["permissions.id"], name="role_permissions_permission_id_fkey", ondelete="CASCADE"),
    )


class Roles(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=True)
    role_name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "role_name", name="uq_roles_tenant_role"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="roles_tenant_id_fkey", ondelete="CASCADE"),
    )


class SeatAmenities(Base):
    __tablename__ = "seat_amenities"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    seat_id = Column(BigInteger, nullable=False)
    amenity_id = Column(BigInteger, nullable=False)
    assigned_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "seat_id", "amenity_id", name="uq_seat_amenity"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="seat_amenities_tenant_id_fkey"),
        ForeignKeyConstraint(["seat_id"], ["seats.id"], name="seat_amenities_seat_id_fkey"),
        ForeignKeyConstraint(["amenity_id"], ["amenities.id"], name="seat_amenities_amenity_id_fkey"),
        ForeignKeyConstraint(["assigned_by_user_id"], ["app_users.id"], name="seat_amenities_assigned_by_user_id_fkey"),
        Index("idx_seat_amenities_amenity_id", "amenity_id"),
        Index("idx_seat_amenities_seat_id", "seat_id"),
        Index("idx_seat_amenities_tenant_amenity", "tenant_id", "amenity_id"),
    )


class Seats(Base):
    __tablename__ = "seats"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    site_id = Column(BigInteger, nullable=False)
    building_id = Column(BigInteger, nullable=False)
    floor_id = Column(BigInteger, nullable=False)
    seat_code = Column(String(50), nullable=False)
    seat_type = Column(String(30), nullable=False, server_default=text("'STANDARD'::character varying"))
    seat_neighborhood = Column(String(100), nullable=True)
    is_bookable = Column(Boolean, nullable=False, server_default=text("true"))
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    map_x = Column(Numeric(10, 2), nullable=True)
    map_y = Column(Numeric(10, 2), nullable=True)
    map_width = Column(Numeric(10, 2), nullable=True)
    map_height = Column(Numeric(10, 2), nullable=True)
    rotation_angle = Column(Numeric(6, 2), nullable=True, server_default=text("0"))
    svg_element_id = Column(String(100), nullable=True)
    layout_id = Column(BigInteger, nullable=True)
    source_layout_mapping_id = Column(BigInteger, nullable=True)
    seat_name = Column(String(150), nullable=True)
    is_reserved = Column(Boolean, nullable=False, server_default=text("false"))
    live_from = Column(DateTime(timezone=True), nullable=True)
    live_until = Column(DateTime(timezone=True), nullable=True)
    retired_reason = Column(String(100), nullable=True)
    capacity = Column(Integer, nullable=True, server_default=text("1"))

    __table_args__ = (
        UniqueConstraint("floor_id", "layout_id", "seat_code", name="seats_floor_layout_seat_code_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="seats_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["site_id"], ["sites.id"], name="seats_site_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["building_id"], ["buildings.id"], name="seats_building_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["floor_id"], ["floors.id"], name="seats_floor_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["layout_id"], ["floor_layouts.id"], name="seats_layout_id_fkey"),
        ForeignKeyConstraint(["source_layout_mapping_id"], ["layout_seat_mappings.id"], name="seats_source_layout_mapping_id_fkey"),
        Index("idx_seats_bookable_status", "is_bookable", "status"),
        Index("idx_seats_building_id", "building_id"),
        Index("idx_seats_floor_id", "floor_id"),
        Index("idx_seats_layout_id", "layout_id"),
        Index("idx_seats_live_floor_status", "tenant_id", "floor_id", "status"),
        Index("idx_seats_site_id", "site_id"),
        Index("idx_seats_source_layout_mapping_id", "source_layout_mapping_id"),
        Index("idx_seats_tenant_id", "tenant_id"),
    )


class Sites(Base):
    __tablename__ = "sites"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    site_code = Column(String(50), nullable=False)
    site_name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    timezone = Column(String(100), nullable=False)
    address_line1 = Column(String(250), nullable=True)
    address_line2 = Column(String(250), nullable=True)
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "site_code", name="sites_tenant_id_site_code_key"),
        UniqueConstraint("tenant_id", "site_name", name="sites_tenant_id_site_name_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="sites_tenant_id_fkey", ondelete="RESTRICT"),
        Index("idx_sites_tenant_id", "tenant_id"),
    )


class TeamMembers(Base):
    __tablename__ = "team_members"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    team_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    member_role = Column(String(50), nullable=True, server_default=text("'MEMBER'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "team_id", "user_id", name="team_members_tenant_id_team_id_user_id_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="team_members_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["team_id"], ["teams.id"], name="team_members_team_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="team_members_user_id_fkey", ondelete="CASCADE"),
    )


class Teams(Base):
    __tablename__ = "teams"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    team_key = Column(String(100), nullable=False)
    team_name = Column(String(200), nullable=False)
    source = Column(String(50), nullable=False, server_default=text("'GRAPH'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "team_key", name="teams_tenant_id_team_key_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="teams_tenant_id_fkey", ondelete="RESTRICT"),
    )


class TenantBusinessRules(Base):
    __tablename__ = "tenant_business_rules"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    business_rule_id = Column(BigInteger, nullable=False)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    updated_by_user_id = Column(BigInteger, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "business_rule_id", name="uq_tenant_business_rules_tenant_rule"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_tenant_business_rules_tenant"),
        ForeignKeyConstraint(["business_rule_id"], ["business_rules.id"], name="fk_tenant_business_rules_rule"),
        ForeignKeyConstraint(["updated_by_user_id"], ["app_users.id"], name="fk_tenant_business_rules_updated_by"),
    )


class Tenants(Base):
    __tablename__ = "tenants"

    id = Column(BigInteger, primary_key=True)
    tenant_key = Column(String(50), nullable=False, unique=True)
    tenant_name = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'ACTIVE'::character varying"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class UserGraphProfiles(Base):
    __tablename__ = "user_graph_profiles"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    graph_object_id = Column(String(150), nullable=False)
    user_principal_name = Column(String(200), nullable=True)
    display_name = Column(String(200), nullable=True)
    given_name = Column(String(100), nullable=True)
    surname = Column(String(100), nullable=True)
    mail = Column(String(200), nullable=True)
    mobile_phone = Column(String(50), nullable=True)
    business_phones = Column(JSONB, nullable=True)
    job_title = Column(String(150), nullable=True)
    department = Column(String(150), nullable=True)
    company_name = Column(String(200), nullable=True)
    employee_id = Column(String(100), nullable=True)
    office_location = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    manager_graph_object_id = Column(String(150), nullable=True)
    raw_profile = Column(JSONB, nullable=True)
    synced_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "graph_object_id", name="user_graph_profiles_tenant_id_graph_object_id_key"),
        UniqueConstraint("tenant_id", "user_id", name="user_graph_profiles_tenant_id_user_id_key"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="user_graph_profiles_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="user_graph_profiles_user_id_fkey", ondelete="CASCADE"),
    )


class UserGroups(Base):
    __tablename__ = "user_groups"

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    group_id = Column(BigInteger, nullable=False)
    assigned_by_user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("user_id", "group_id", name="uq_user_group"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="user_groups_user_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["group_id"], ["groups.id"], name="user_groups_group_id_fkey", ondelete="CASCADE"),
        ForeignKeyConstraint(["assigned_by_user_id"], ["app_users.id"], name="user_groups_assigned_by_user_id_fkey"),
        Index("idx_user_groups_group_id", "group_id"),
        Index("idx_user_groups_user_id", "user_id"),
    )


class UserPreferredAmenities(Base):
    __tablename__ = "user_preferred_amenities"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    amenity_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "amenity_id", name="uq_user_preferred_amenity"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_user_preferred_amenities_tenant"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="fk_user_preferred_amenities_user"),
        ForeignKeyConstraint(["amenity_id"], ["amenities.id"], name="fk_user_preferred_amenities_amenity"),
        Index("idx_user_preferred_amenities_amenity", "amenity_id"),
        Index("idx_user_preferred_amenities_tenant", "tenant_id"),
        Index("idx_user_preferred_amenities_user", "user_id"),
    )


class UserSessions(Base):
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    session_id = Column(UUID, nullable=False, unique=True)
    refresh_token_hash = Column(Text, nullable=False)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(INET, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    previous_refresh_token_hash = Column(Text, nullable=True)
    previous_token_grace_expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="user_sessions_tenant_id_fkey", ondelete="RESTRICT"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="user_sessions_user_id_fkey", ondelete="CASCADE"),
    )


class UserWorkPreferences(Base):
    __tablename__ = "user_work_preferences"

    preference_id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    default_site_id = Column(BigInteger, nullable=True)
    default_building_id = Column(BigInteger, nullable=True)
    default_floor_id = Column(BigInteger, nullable=True)
    preferred_seat_type = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", name="uq_user_work_preferences_user"),
        ForeignKeyConstraint(["tenant_id"], ["tenants.id"], name="fk_user_work_preferences_tenant"),
        ForeignKeyConstraint(["user_id"], ["app_users.id"], name="fk_user_work_preferences_user"),
        ForeignKeyConstraint(["default_site_id"], ["sites.id"], name="fk_user_work_preferences_site"),
        ForeignKeyConstraint(["default_building_id"], ["buildings.id"], name="fk_user_work_preferences_building"),
        ForeignKeyConstraint(["default_floor_id"], ["floors.id"], name="fk_user_work_preferences_floor"),
        Index("idx_user_work_preferences_building", "default_building_id"),
        Index("idx_user_work_preferences_floor", "default_floor_id"),
        Index("idx_user_work_preferences_site", "default_site_id"),
        Index("idx_user_work_preferences_tenant", "tenant_id"),
        Index("idx_user_work_preferences_user", "user_id"),
    )
