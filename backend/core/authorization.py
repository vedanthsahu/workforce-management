"""Shared resource-ownership authorization.

The base rule (per dev-notes/backend/Rules.md): a caller may act on an
*existing* resource only if they are its creator or its subject ("acted
upon") -- unless their role carries an explicit bypass. TENANT_ADMIN
carries one (2026-10-23, reversing the earlier narrowing below): an
admin can manage any booking, guest-booking, or guest-visit regardless
of who created or is the subject of it, so they are never blocked from
acting in a crisis. FACILITATOR gets no such bypass here -- their
rights on an *existing* resource still come only from being its actual
creator or subject; see ``can_create_for_user``/``GUEST_OPERATOR_ROLES``
for the separate, role-based allowances FACILITATOR does have.

(History: TENANT_ADMIN originally had this same unconditional bypass,
then Rules.md explicitly narrowed it away -- "Admin can't change
bookings unless he himself is the one who created or he is the acted
upon." The 2026-10-23 change reverses that narrowing by direct
instruction.)

Two separate things layer on top of that base rule, each confirmed in
Rules.md:
  - *Creating* a new booking/guest-booking for someone else is a
    distinct, role-based allowance (there's no prior resource to be
    "involved in" yet) -- TENANT_ADMIN and FACILITATOR may originate one
    for another person; EMPLOYEE and FRONT_OFFICE may not. See
    ``can_create_for_user``.
  - Guest check-in/check-out is FRONT_OFFICE's alone -- not the visit's
    creator, not its host, not TENANT_ADMIN. Confirmed explicitly:
    "let's not give [facilitator] check in and check out, as this is
    front office person task." See ``can_check_in_out_guest_visit``.
  - The general guest-domain API surface (create/modify/cancel/list on
    guests, guest-visits, guest-bookings) is TENANT_ADMIN/FACILITATOR
    only -- FRONT_OFFICE's entire positive-scenario list in Rules.md is
    exactly one line: check-in/check-out. They are not a guest operator
    for anything else.
"""

from typing import Any

TENANT_ADMIN = "TENANT_ADMIN"
FACILITATOR = "FACILITATOR"
# chk_app_users_role stores this role with a literal space ("FRONT OFFICE"),
# but auth_service.attach_permissions_to_user normalizes every current_user's
# role_name/role to this underscore form before any service code sees it
# (called unconditionally from deps.get_current_user) -- so this constant,
# and every comparison against current_user's role, uses the underscore
# form throughout the app. Only code reading/writing the raw DB column
# directly needs the space form (see user_repository.normalize_role_name /
# _role_name_for_storage).
FRONT_OFFICE = "FRONT_OFFICE"
EMPLOYEE = "EMPLOYEE"
MANAGER = "MANAGER"  # dormant: assignable, but carries no authority in this module

# Roles allowed to create a booking/guest-booking for someone other than
# themselves. Confirmed in Rules.md (admin #15/#19, facilitator #1/#6);
# EMPLOYEE and FRONT_OFFICE are explicitly negative for this.
CAN_CREATE_FOR_OTHERS_ROLES = {TENANT_ADMIN, FACILITATOR}

# The general guest-domain API surface (create/modify/cancel/list on
# guests, guest-visits, guest-bookings) -- FRONT_OFFICE is deliberately
# excluded; their only confirmed access is check-in/check-out, handled
# separately by can_check_in_out_guest_visit.
GUEST_OPERATOR_ROLES = {TENANT_ADMIN, FACILITATOR}


def current_user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("user_id") or current_user.get("id") or "")


def user_role(user: dict[str, Any]) -> str:
    return str(user.get("role_name") or user.get("role") or "").strip().upper()


def is_guest_operator(current_user: dict[str, Any]) -> bool:
    return user_role(current_user) in GUEST_OPERATOR_ROLES


def can_create_for_user(current_user: dict[str, Any], *, subject_user_id: Any) -> bool:
    """Can this caller originate a new booking/guest-booking for
    ``subject_user_id`` (who may not be themselves)? There is no prior
    resource here, so this is a role-based allowance, not an ownership
    check -- see CAN_CREATE_FOR_OTHERS_ROLES."""
    caller_id = current_user_id(current_user)
    if subject_user_id is not None and caller_id == str(subject_user_id):
        return True
    return user_role(current_user) in CAN_CREATE_FOR_OTHERS_ROLES


def can_manage_resource(
    current_user: dict[str, Any],
    *,
    created_by_user_id: Any,
    subject_user_id: Any = None,
) -> bool:
    """The rule for an *existing* resource: creator, subject, or
    TENANT_ADMIN. TENANT_ADMIN is an unconditional bypass here (see the
    module docstring) -- every other role's rights still come only from
    actually being the resource's creator or subject.

    ``created_by_user_id`` is who actually made the resource (e.g.
    ``booked_by_user_id`` / ``created_by_user_id``). ``subject_user_id``
    is who it's for (e.g. ``booked_for_user_id`` / ``host_user_id``) --
    optional since not every resource has a distinct subject.
    """
    if user_role(current_user) == TENANT_ADMIN:
        return True

    caller_id = current_user_id(current_user)

    if created_by_user_id is not None and caller_id == str(created_by_user_id):
        return True

    return subject_user_id is not None and caller_id == str(subject_user_id)


def can_check_in_out_guest_visit(current_user: dict[str, Any]) -> bool:
    """Check-in/out is FRONT_OFFICE's one job here, and nobody else's --
    confirmed explicitly: not the visit's creator, not its host, not
    TENANT_ADMIN. "Front office is basically the watchman on the door";
    tracking who's actually in the building is their responsibility
    alone, not something a creator/host/admin substitutes for."""
    return user_role(current_user) == FRONT_OFFICE
