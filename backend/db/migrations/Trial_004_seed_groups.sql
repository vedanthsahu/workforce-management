-- Trial_004_seed_groups.sql
-- DRAFT for review -- not yet applied to any database.
-- Seeds the 16 system groups (is_system = true) into every ACTIVE
-- tenant, their role_groups eligibility, and their exact
-- group_permissions (both UI and backend keys, from the audited
-- Permission-Groups-Summary.xlsx). All keyed by name/permission_key
-- via subqueries -- no hardcoded ids, safe to run on any tenant set.
-- Requires Trial_001 (tables) and Trial_003 (permissions) applied first.

BEGIN;

-- ── Employee Basic (BASE) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Employee Basic', 'Minimum viable employee: book, view, modify and cancel your own seat. Nothing else.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Employee Basic' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Employee Basic' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Employee Basic'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:mybookings:action_cancel', 'ui:mybookings:action_modify', 'ui:mybookings:action_new_booking', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:dashboard', 'ui:nav:my_bookings', 'ui:usermenu:my_profile', 'booking:cancel_own', 'booking:create_own', 'booking:eligibility_check', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Employee Standard (BASE/COMMON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Employee Standard', 'Full self-service employee experience: adds dashboard widgets, Find Teammates, and profile self-service on top of Basic. Covers the majority of employees.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Employee Standard' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Employee Standard' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Employee Standard'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:dashboard:action_cancel_booking', 'ui:dashboard:action_modify_booking', 'ui:dashboard:banner_book_now', 'ui:dashboard:card_favourite_seat', 'ui:dashboard:card_upcoming_bookings', 'ui:dashboard:quick_book', 'ui:dashboard:stat_days_in_office', 'ui:dashboard:stat_office_visits', 'ui:dashboard:stat_team_present', 'ui:findteammate:action_search', 'ui:findteammate:result_card', 'ui:findteammate:team_overview', 'ui:mybookings:action_cancel', 'ui:mybookings:action_modify', 'ui:mybookings:action_new_booking', 'ui:mybookings:action_refresh', 'ui:mybookings:stat_completed', 'ui:mybookings:stat_team_today', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:dashboard', 'ui:nav:find_teammates', 'ui:nav:my_bookings', 'ui:nav:my_schedule', 'ui:nav:notifications_personal', 'ui:nav:preferences_personal', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'booking:cancel_own', 'booking:create_own', 'booking:eligibility_check', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'team:occupancy_view', 'team:view', 'teammate:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Employee + Guest Booking (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Employee + Guest Booking', 'An employee who also hosts visitors — can book a seat for a guest — without any Facilitator capability. Audited: contains no internal-delegation permissions.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Employee + Guest Booking' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Employee + Guest Booking' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Employee + Guest Booking'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_visitor_guest', 'ui:dashboard:action_cancel_booking', 'ui:dashboard:action_modify_booking', 'ui:dashboard:banner_book_now', 'ui:dashboard:card_favourite_seat', 'ui:dashboard:card_upcoming_bookings', 'ui:dashboard:quick_book', 'ui:dashboard:stat_days_in_office', 'ui:dashboard:stat_office_visits', 'ui:dashboard:stat_team_present', 'ui:findteammate:action_search', 'ui:findteammate:result_card', 'ui:findteammate:team_overview', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify', 'ui:mybookings:action_modify_visit', 'ui:mybookings:action_new_booking', 'ui:mybookings:action_refresh', 'ui:mybookings:stat_completed', 'ui:mybookings:stat_delegated', 'ui:mybookings:stat_team_today', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_booked_for_someone', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:book_for_someone', 'ui:nav:dashboard', 'ui:nav:find_teammates', 'ui:nav:my_bookings', 'ui:nav:my_schedule', 'ui:nav:notifications_personal', 'ui:nav:preferences_personal', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'booking:cancel_own', 'booking:create_for_guest', 'booking:create_own', 'booking:eligibility_check', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow', 'team:occupancy_view', 'team:view', 'teammate:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Employee + Internal Delegated Booking (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Employee + Internal Delegated Booking', 'An employee who books seats on behalf of coworkers (e.g. team coordinator) — without guest or admin capability. Audited: contains no guest permissions.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Employee + Internal Delegated Booking' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Employee + Internal Delegated Booking' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Employee + Internal Delegated Booking'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:bookforsomeone:option_internal_employee', 'ui:dashboard:action_cancel_booking', 'ui:dashboard:action_modify_booking', 'ui:dashboard:banner_book_now', 'ui:dashboard:card_favourite_seat', 'ui:dashboard:card_upcoming_bookings', 'ui:dashboard:quick_book', 'ui:dashboard:stat_days_in_office', 'ui:dashboard:stat_office_visits', 'ui:dashboard:stat_team_present', 'ui:findteammate:action_search', 'ui:findteammate:result_card', 'ui:findteammate:team_overview', 'ui:mybookings:action_cancel', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_modify', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:action_new_booking', 'ui:mybookings:action_refresh', 'ui:mybookings:stat_completed', 'ui:mybookings:stat_delegated', 'ui:mybookings:stat_team_today', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_booked_for_someone', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:book_for_someone', 'ui:nav:dashboard', 'ui:nav:find_teammates', 'ui:nav:my_bookings', 'ui:nav:my_schedule', 'ui:nav:notifications_personal', 'ui:nav:preferences_personal', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'booking:cancel_for_employee', 'booking:cancel_own', 'booking:create_for_employee', 'booking:create_own', 'booking:eligibility_check', 'booking:update_for_employee', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'team:occupancy_view', 'team:view', 'teammate:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Facilitator Basic (BASE) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Facilitator Basic', 'Minimum viable facilitator: own booking plus booking for coworkers. No guest operations — audited clean of guest:*/guest_visit:*/booking:*_for_guest.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Facilitator Basic' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Facilitator Basic'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:bookforsomeone:option_internal_employee', 'ui:mybookings:action_cancel', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_modify', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:action_new_booking', 'ui:mybookings:stat_delegated', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_booked_for_someone', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:book_for_someone', 'ui:nav:dashboard', 'ui:nav:my_bookings', 'ui:usermenu:my_profile', 'booking:cancel_for_employee', 'booking:cancel_own', 'booking:create_for_employee', 'booking:create_own', 'booking:eligibility_check', 'booking:update_for_employee', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Facilitator Guest Operations (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Facilitator Guest Operations', 'A facilitator focused purely on guest/visitor workflow — no delegated employee booking. Audited clean of booking:*_for_employee.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Facilitator Guest Operations' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Facilitator Guest Operations'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_visitor_guest', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify', 'ui:mybookings:action_modify_visit', 'ui:mybookings:action_new_booking', 'ui:mybookings:stat_delegated', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_booked_for_someone', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:book_for_someone', 'ui:nav:dashboard', 'ui:nav:my_bookings', 'ui:usermenu:my_profile', 'booking:cancel_own', 'booking:create_for_guest', 'booking:create_own', 'booking:eligibility_check', 'booking:update_own', 'booking:view_own', 'dashboard:view', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Facilitator Full (COMMON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Facilitator Full', 'The normal facilitator workflow: full self-service, booking for any employee, and full guest operations. Covers the majority of facilitators.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Facilitator Full' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Facilitator Full'
  AND p.permission_key IN (
    'ui:book:wizard', 'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_internal_employee', 'ui:bookforsomeone:option_visitor_guest', 'ui:dashboard:action_cancel_booking', 'ui:dashboard:action_modify_booking', 'ui:dashboard:banner_book_now', 'ui:dashboard:card_favourite_seat', 'ui:dashboard:card_upcoming_bookings', 'ui:dashboard:quick_book', 'ui:dashboard:stat_days_in_office', 'ui:dashboard:stat_office_visits', 'ui:dashboard:stat_team_present', 'ui:findteammate:action_search', 'ui:findteammate:result_card', 'ui:findteammate:team_overview', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:action_modify_visit', 'ui:mybookings:action_new_booking', 'ui:mybookings:action_refresh', 'ui:mybookings:stat_completed', 'ui:mybookings:stat_delegated', 'ui:mybookings:stat_team_today', 'ui:mybookings:stat_upcoming', 'ui:mybookings:tab_booked_for_someone', 'ui:mybookings:tab_my_bookings', 'ui:nav:book_a_seat', 'ui:nav:book_for_someone', 'ui:nav:dashboard', 'ui:nav:find_teammates', 'ui:nav:my_bookings', 'ui:nav:my_schedule', 'ui:nav:notifications_personal', 'ui:nav:preferences_personal', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'booking:cancel_for_employee', 'booking:cancel_own', 'booking:create_for_employee', 'booking:create_for_guest', 'booking:create_own', 'booking:eligibility_check', 'booking:update_for_employee', 'booking:update_own', 'booking:view_for_employee', 'booking:view_own', 'dashboard:view', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow', 'team:occupancy_view', 'team:view', 'teammate:view', 'user:profile_update_own', 'user:view_any', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Front Office Basic (BASE) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Front Office Basic', 'Minimum viable front-desk role: see who''s expected, checked in, and overdue. Cannot check anyone in or out (e.g. a trainee shadowing the desk).', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FRONT_OFFICE' AND g.group_name = 'Front Office Basic' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Front Office Basic'
  AND p.permission_key IN (
    'ui:frontoffice:action_view_visit_details', 'ui:frontoffice:stat_cancelled_noshow', 'ui:frontoffice:stat_checked_in', 'ui:frontoffice:stat_expected_today', 'ui:frontoffice:stat_overdue_checkout', 'ui:frontoffice:table_todays_visitors', 'ui:nav:front_office_dashboard', 'ui:usermenu:my_profile', 'dashboard:view', 'guest_visit:view', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Front Office Standard (COMMON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Front Office Standard', 'The normal front-desk operator: everything in Basic plus check-in/check-out. Covers the majority of Front Office users. Only 2 tiers exist — nothing else in Front Office''s scope is built yet.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FRONT_OFFICE' AND g.group_name = 'Front Office Standard' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Front Office Standard'
  AND p.permission_key IN (
    'ui:frontoffice:action_check_in', 'ui:frontoffice:action_check_out', 'ui:frontoffice:action_view_visit_details', 'ui:frontoffice:stat_cancelled_noshow', 'ui:frontoffice:stat_checked_in', 'ui:frontoffice:stat_expected_today', 'ui:frontoffice:stat_overdue_checkout', 'ui:frontoffice:table_todays_visitors', 'ui:nav:checked_in_visitors', 'ui:nav:front_office_dashboard', 'ui:nav:past_visits', 'ui:nav:todays_visitors', 'ui:nav:visitor_search', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'booking:view_own', 'dashboard:view', 'guest_visit:check_in', 'guest_visit:check_out', 'guest_visit:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Tenant Admin — Dashboard & Reporting (BASE) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Tenant Admin — Dashboard & Reporting', 'Minimum viable admin: read-only oversight — admin dashboard, occupancy and audit reporting. No write access anywhere (e.g. an executive who wants visibility only).', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — Dashboard & Reporting' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Tenant Admin — Dashboard & Reporting'
  AND p.permission_key IN (
    'ui:admindashboard:stat_blocked', 'ui:admindashboard:stat_bookings', 'ui:admindashboard:stat_total_floors', 'ui:admindashboard:stat_total_offices', 'ui:admindashboard:stat_total_seats', 'ui:admindashboard:widget_occupancy_trend', 'ui:admindashboard:widget_recent_activities', 'ui:admindashboard:widget_todays_overview', 'ui:admindashboard:widget_top_offices', 'ui:nav:admin_dashboard', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'admin_dashboard:view', 'audit:view', 'booking:view_own', 'occupancy:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Tenant Admin — Booking Operations (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Tenant Admin — Booking Operations', 'Manages tenant-wide bookings and guest/delegated booking operations. No workplace configuration, no user/role administration.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — Booking Operations' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Tenant Admin — Booking Operations'
  AND p.permission_key IN (
    'ui:adminbookings:action_book_for_someone_entry', 'ui:adminbookings:action_cancel_booking', 'ui:adminbookings:action_cancel_visit', 'ui:adminbookings:action_export', 'ui:adminbookings:action_modify_booking', 'ui:adminbookings:action_modify_visit', 'ui:adminbookings:action_more_options', 'ui:adminbookings:action_view_details', 'ui:adminbookings:stat_cancelled', 'ui:adminbookings:stat_checked_in', 'ui:adminbookings:stat_guests', 'ui:adminbookings:stat_not_checked_in', 'ui:adminbookings:stat_todays_bookings', 'ui:adminbookings:table_list', 'ui:admindashboard:stat_blocked', 'ui:admindashboard:stat_bookings', 'ui:admindashboard:stat_total_floors', 'ui:admindashboard:stat_total_offices', 'ui:admindashboard:stat_total_seats', 'ui:admindashboard:widget_occupancy_trend', 'ui:admindashboard:widget_recent_activities', 'ui:admindashboard:widget_todays_overview', 'ui:admindashboard:widget_top_offices', 'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_internal_employee', 'ui:bookforsomeone:option_visitor_guest', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:action_modify_visit', 'ui:mybookings:stat_delegated', 'ui:mybookings:tab_booked_for_someone', 'ui:nav:admin_bookings', 'ui:nav:admin_dashboard', 'ui:nav:book_for_someone', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'admin_dashboard:view', 'audit:view', 'booking:cancel_any_employee', 'booking:cancel_any_guest', 'booking:cancel_for_employee', 'booking:create_for_employee', 'booking:create_for_guest', 'booking:export', 'booking:update_any_employee', 'booking:update_any_guest', 'booking:update_for_employee', 'booking:view_any_employee', 'booking:view_any_guest', 'booking:view_own', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow', 'occupancy:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Tenant Admin — Workplace Configuration (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Tenant Admin — Workplace Configuration', 'Manages offices, buildings, floors, floor layouts, seats and amenities. No booking administration, no user/role administration. Audited clean of booking:*/user:*/role:*.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — Workplace Configuration' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Tenant Admin — Workplace Configuration'
  AND p.permission_key IN (
    'ui:admindashboard:stat_blocked', 'ui:admindashboard:stat_bookings', 'ui:admindashboard:stat_total_floors', 'ui:admindashboard:stat_total_offices', 'ui:admindashboard:stat_total_seats', 'ui:admindashboard:widget_occupancy_trend', 'ui:admindashboard:widget_recent_activities', 'ui:admindashboard:widget_todays_overview', 'ui:admindashboard:widget_top_offices', 'ui:amenities:action_add', 'ui:amenities:action_edit', 'ui:amenities:table_list', 'ui:buildings:action_add', 'ui:buildings:action_edit', 'ui:buildings:table_list', 'ui:floors:action_add', 'ui:floors:action_edit', 'ui:floors:table_list', 'ui:layouts:action_discard', 'ui:layouts:action_download_svg', 'ui:layouts:action_manage_seats_entry', 'ui:layouts:action_publish', 'ui:layouts:action_upload_new', 'ui:layouts:action_view', 'ui:layouts:quick_action_manage_amenities', 'ui:layouts:quick_action_manage_seats', 'ui:layouts:table_list', 'ui:nav:admin_dashboard', 'ui:nav:amenities', 'ui:nav:buildings', 'ui:nav:floor_layouts', 'ui:nav:floors', 'ui:nav:offices', 'ui:nav:seat_status', 'ui:nav:seats', 'ui:offices:action_add', 'ui:offices:action_edit', 'ui:offices:table_list', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:seats:action_bulk_edit', 'ui:seats:action_edit_seat', 'ui:seats:action_visual_configure', 'ui:seats:table_list', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'admin_dashboard:view', 'amenity:create', 'amenity:update', 'amenity:view', 'amenity_category:create', 'amenity_category:update', 'amenity_category:view', 'audit:view', 'booking:view_own', 'building:create', 'building:update', 'building:view', 'floor:create', 'floor:update', 'floor:view', 'layout:create', 'layout:delete', 'layout:download', 'layout:publish', 'layout:view', 'layout_seat:bulk_update', 'layout_seat:update', 'occupancy:view', 'office:create', 'office:update', 'office:view', 'user:profile_update_own', 'user:view_own_details'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Tenant Admin — User & Access Administration (SPECIALIZED) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Tenant Admin — User & Access Administration', 'Manages the user directory, role changes and account status, plus role visibility. No booking or workplace administration. Audited clean of booking:*/office:*/building:*/floor:*/layout:*/amenity:*.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — User & Access Administration' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Tenant Admin — User & Access Administration'
  AND p.permission_key IN (
    'ui:admindashboard:stat_blocked', 'ui:admindashboard:stat_bookings', 'ui:admindashboard:stat_total_floors', 'ui:admindashboard:stat_total_offices', 'ui:admindashboard:stat_total_seats', 'ui:admindashboard:widget_occupancy_trend', 'ui:admindashboard:widget_recent_activities', 'ui:admindashboard:widget_todays_overview', 'ui:admindashboard:widget_top_offices', 'ui:nav:admin_dashboard', 'ui:nav:role_management', 'ui:nav:users', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:roles:action_add_role', 'ui:roles:action_view_role', 'ui:roles:table_list', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'ui:users:action_change_role', 'ui:users:action_view_details', 'ui:users:table_list',
    'ui:nav:group_management', 'ui:groups:table_list', 'ui:groups:action_add', 'ui:groups:action_edit', 'ui:groups:action_edit_permissions', 'ui:groups:action_edit_role_eligibility', 'ui:groups:action_assign_user', 'ui:groups:action_remove_user', 'ui:groups:action_deactivate',
    'admin_dashboard:view', 'audit:view', 'booking:view_own', 'occupancy:view', 'role:create', 'role:view', 'user:change_role', 'user:profile_update_own', 'user:update_status', 'user:view', 'user:view_any', 'user:view_own_details',
    'group:view', 'group:create', 'group:update', 'group:delete', 'group:view_permissions', 'group:update_permissions', 'group:assign_user', 'group:remove_user', 'role:view_groups', 'role:assign_group', 'role:remove_group'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Tenant Admin — Full (COMMON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Tenant Admin — Full', 'The complete Tenant Admin capability set: dashboard, booking operations, workplace configuration, and user/access administration combined. Covers the majority of admins.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Tenant Admin — Full' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Tenant Admin — Full'
  AND p.permission_key IN (
    'ui:adminbookings:action_book_for_someone_entry', 'ui:adminbookings:action_cancel_booking', 'ui:adminbookings:action_cancel_visit', 'ui:adminbookings:action_export', 'ui:adminbookings:action_modify_booking', 'ui:adminbookings:action_modify_visit', 'ui:adminbookings:action_more_options', 'ui:adminbookings:action_view_details', 'ui:adminbookings:stat_cancelled', 'ui:adminbookings:stat_checked_in', 'ui:adminbookings:stat_guests', 'ui:adminbookings:stat_not_checked_in', 'ui:adminbookings:stat_todays_bookings', 'ui:adminbookings:table_list', 'ui:admindashboard:stat_blocked', 'ui:admindashboard:stat_bookings', 'ui:admindashboard:stat_total_floors', 'ui:admindashboard:stat_total_offices', 'ui:admindashboard:stat_total_seats', 'ui:admindashboard:widget_occupancy_trend', 'ui:admindashboard:widget_recent_activities', 'ui:admindashboard:widget_todays_overview', 'ui:admindashboard:widget_top_offices', 'ui:amenities:action_add', 'ui:amenities:action_edit', 'ui:amenities:table_list', 'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_internal_employee', 'ui:bookforsomeone:option_visitor_guest', 'ui:buildings:action_add', 'ui:buildings:action_edit', 'ui:buildings:table_list', 'ui:floors:action_add', 'ui:floors:action_edit', 'ui:floors:table_list', 'ui:layouts:action_discard', 'ui:layouts:action_download_svg', 'ui:layouts:action_manage_seats_entry', 'ui:layouts:action_publish', 'ui:layouts:action_upload_new', 'ui:layouts:action_view', 'ui:layouts:quick_action_manage_amenities', 'ui:layouts:quick_action_manage_seats', 'ui:layouts:table_list', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:action_modify_visit', 'ui:mybookings:stat_delegated', 'ui:mybookings:tab_booked_for_someone', 'ui:nav:admin_bookings', 'ui:nav:admin_dashboard', 'ui:nav:amenities', 'ui:nav:book_for_someone', 'ui:nav:buildings', 'ui:nav:floor_layouts', 'ui:nav:floors', 'ui:nav:offices', 'ui:nav:role_management', 'ui:nav:seat_status', 'ui:nav:seats', 'ui:nav:users', 'ui:offices:action_add', 'ui:offices:action_edit', 'ui:offices:table_list', 'ui:profile:action_edit_about_me', 'ui:profile:action_edit_preferences', 'ui:profile:action_upload_avatar', 'ui:profile:action_view_booking_history', 'ui:roles:action_add_role', 'ui:roles:action_view_role', 'ui:roles:table_list', 'ui:seats:action_bulk_edit', 'ui:seats:action_edit_seat', 'ui:seats:action_visual_configure', 'ui:seats:table_list', 'ui:usermenu:my_profile', 'ui:usermenu:notifications', 'ui:users:action_change_role', 'ui:users:action_view_details', 'ui:users:table_list',
    'ui:nav:group_management', 'ui:groups:table_list', 'ui:groups:action_add', 'ui:groups:action_edit', 'ui:groups:action_edit_permissions', 'ui:groups:action_edit_role_eligibility', 'ui:groups:action_assign_user', 'ui:groups:action_remove_user', 'ui:groups:action_deactivate',
    'admin_dashboard:view', 'amenity:create', 'amenity:update', 'amenity:view', 'amenity_category:create', 'amenity_category:update', 'amenity_category:view', 'audit:view', 'booking:cancel_any_employee', 'booking:cancel_any_guest', 'booking:cancel_for_employee', 'booking:create_for_employee', 'booking:create_for_guest', 'booking:export', 'booking:update_any_employee', 'booking:update_any_guest', 'booking:update_for_employee', 'booking:view_any_employee', 'booking:view_any_guest', 'booking:view_own', 'building:create', 'building:update', 'building:view', 'floor:create', 'floor:update', 'floor:view', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow', 'layout:create', 'layout:delete', 'layout:download', 'layout:publish', 'layout:view', 'layout_seat:bulk_update', 'layout_seat:update', 'occupancy:view', 'office:create', 'office:update', 'office:view', 'role:create', 'role:view', 'user:change_role', 'user:profile_update_own', 'user:update_status', 'user:view', 'user:view_any', 'user:view_own_details',
    'group:view', 'group:create', 'group:update', 'group:delete', 'group:view_permissions', 'group:update_permissions', 'group:assign_user', 'group:remove_user', 'role:view_groups', 'role:assign_group', 'role:remove_group'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Guest Booking Add-on (ADD-ON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Guest Booking Add-on', 'Reusable capability: book a seat for a guest, manage guest profiles, and manage the resulting guest visit (modify/cancel). Composable into Employee, Facilitator, or Tenant Admin groups. Eligible roles: EMPLOYEE, FACILITATOR, TENANT_ADMIN.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Guest Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Guest Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Guest Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Guest Booking Add-on'
  AND p.permission_key IN (
    'ui:bookforsomeone:action_create_guest', 'ui:bookforsomeone:action_edit_guest', 'ui:bookforsomeone:action_search_guest', 'ui:bookforsomeone:option_visitor_guest', 'ui:mybookings:action_add_booking', 'ui:mybookings:action_cancel_visit', 'ui:mybookings:action_modify_visit', 'ui:mybookings:stat_delegated', 'ui:mybookings:tab_booked_for_someone', 'ui:nav:book_for_someone', 'booking:create_for_guest', 'guest:create', 'guest:update', 'guest:view', 'guest_visit:workflow'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ── Internal Delegated Booking Add-on (ADD-ON) ──
INSERT INTO groups (tenant_id, group_name, description, is_system) SELECT t.id, 'Internal Delegated Booking Add-on', 'Reusable capability: book, modify and cancel a seat on behalf of another employee. Composable into Employee, Facilitator, or Tenant Admin groups. Eligible roles: EMPLOYEE, FACILITATOR, TENANT_ADMIN.', true FROM tenants t WHERE t.status = 'ACTIVE' ON CONFLICT (tenant_id, group_name) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'EMPLOYEE' AND g.group_name = 'Internal Delegated Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'FACILITATOR' AND g.group_name = 'Internal Delegated Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO role_groups (role_id, group_id) SELECT r.id, g.id FROM roles r JOIN groups g ON g.tenant_id = r.tenant_id WHERE UPPER(REPLACE(r.role_name, ' ', '_')) = 'TENANT_ADMIN' AND g.group_name = 'Internal Delegated Booking Add-on' ON CONFLICT (role_id, group_id) DO NOTHING;
INSERT INTO group_permissions (group_id, permission_id)
SELECT g.id, p.id FROM groups g JOIN permissions p ON TRUE
WHERE g.group_name = 'Internal Delegated Booking Add-on'
  AND p.permission_key IN (
    'ui:bookforsomeone:option_internal_employee', 'ui:mybookings:action_cancel_delegated', 'ui:mybookings:action_modify_delegated', 'ui:mybookings:stat_delegated', 'ui:mybookings:tab_booked_for_someone', 'ui:nav:book_for_someone', 'booking:cancel_for_employee', 'booking:create_for_employee', 'booking:update_for_employee'
  )
ON CONFLICT (group_id, permission_id) DO NOTHING;

COMMIT;