"""Canonical string constants for audit log action names."""

# ── Booking events ────────────────────────────────────────────────────────────
BOOKING_CREATED = "booking.created"
BOOKING_CANCELLED = "booking.cancelled"
BOOKING_MODIFIED = "booking.modified"

# ── Guest events ──────────────────────────────────────────────────────────────
GUEST_BOOKING_CREATED = "guest_booking.created"
GUEST_VISIT_CREATED = "guest_visit.created"
GUEST_CREATED = "guest.created"
GUEST_UPDATED = "guest.updated"
GUEST_STATUS_UPDATED = "guest.status_updated"

# ── User management events ────────────────────────────────────────────────────
USER_PROFILE_UPDATED = "user.profile_updated"
USER_PREFERENCES_UPDATED = "user.preferences_updated"
USER_ACCESS_UPDATED = "user.access_updated"

# ── Auth events ───────────────────────────────────────────────────────────────
USER_LOGIN = "user.login"
USER_LOGOUT = "user.logout"

# ── Location / infrastructure events (TENANT_ADMIN) ──────────────────────────
SITE_CREATED = "site.created"
SITE_UPDATED = "site.updated"
BUILDING_CREATED = "building.created"
BUILDING_UPDATED = "building.updated"
FLOOR_CREATED = "floor.created"
FLOOR_UPDATED = "floor.updated"
SEAT_CONFIGURED = "seat.configured"

# ── Amenity events ────────────────────────────────────────────────────────────
AMENITY_CATEGORY_CREATED = "amenity_category.created"
AMENITY_CATEGORY_UPDATED = "amenity_category.updated"
AMENITY_CREATED = "amenity.created"
AMENITY_UPDATED = "amenity.updated"

# ── Floor layout events ───────────────────────────────────────────────────────
FLOOR_LAYOUT_UPLOADED = "floor_layout.uploaded"
FLOOR_LAYOUT_PUBLISHED = "floor_layout.published"
FLOOR_LAYOUT_DELETED = "floor_layout.deleted"

# ── Guest booking lifecycle events ────────────────────────────────────────────
GUEST_BOOKING_CANCELLED = "guest_booking.cancelled"
GUEST_BOOKING_MODIFIED = "guest_booking.modified"

# ── Guest visit lifecycle events ──────────────────────────────────────────────
GUEST_VISIT_CHECKED_IN = "guest_visit.checked_in"
GUEST_VISIT_CHECKED_OUT = "guest_visit.checked_out"
GUEST_VISIT_CANCELLED = "guest_visit.cancelled"
GUEST_VISIT_MODIFIED = "guest_visit.modified"
GUEST_VISIT_WORKFLOW_EXECUTED = "guest_visit.workflow_executed"
GUEST_VISIT_BOOKING_ADDED = "guest_visit.booking_added"
GUEST_VISIT_BOOKING_CANCELLED = "guest_visit.booking_cancelled"
GUEST_VISIT_AND_BOOKING_MODIFIED = "guest_visit.visit_and_booking_modified"
