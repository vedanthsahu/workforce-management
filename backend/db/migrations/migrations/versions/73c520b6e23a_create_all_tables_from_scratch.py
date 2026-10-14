"""create all tables from scratch

Revision ID: 73c520b6e23a
Revises:
Create Date: 2026-10-09T17:06:29.709790

The real first revision: every one of the 36 real tables, 98 foreign
keys, every unique constraint and index, rendered directly from
models.py's metadata -- no database was read to produce this file, it
is a pure offline compile of the Python schema definitions. Meant for
an environment that does not exist yet (e.g. prod, built from scratch).

Existing environments (dev, UAT) are never meant to run this file's
upgrade() -- they already have these tables. They get `alembic stamp`
to this revision instead, after being manually brought to match this
same shape, so Alembic considers them already here without re-running
any CREATE TABLE against data that already exists.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "73c520b6e23a"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create every real table, in dependency order."""
    op.execute("""
CREATE TABLE business_rules (
	id BIGSERIAL NOT NULL, 
	business_rule_key VARCHAR(100) NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description TEXT, 
	default_value VARCHAR(255) NOT NULL, 
	data_type VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (business_rule_key)
)
""")

    op.execute("""
CREATE TABLE chatbot_sessions (
	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	tenant_id INTEGER DEFAULT 3 NOT NULL, 
	user_name VARCHAR(255) NOT NULL, 
	state VARCHAR(50) DEFAULT 'INITIATED'::character varying NOT NULL, 
	current_node VARCHAR(100) DEFAULT 'MAIN_MENU'::character varying NOT NULL, 
	current_menu_id INTEGER, 
	context_data JSONB DEFAULT '{}'::jsonb NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
)
""")

    op.execute("""
CREATE INDEX idx_cb_sessions_expires ON chatbot_sessions (expires_at)
""")

    op.execute("""
CREATE INDEX idx_cb_sessions_user ON chatbot_sessions (user_name)
""")

    op.execute("""
CREATE TABLE layout_seat_mappings (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	layout_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT NOT NULL, 
	svg_element_id VARCHAR(100) NOT NULL, 
	seat_code VARCHAR(100) NOT NULL, 
	seat_name VARCHAR(150), 
	seat_type VARCHAR(50), 
	status VARCHAR(30) DEFAULT 'ACTIVE'::character varying, 
	is_bookable BOOLEAN DEFAULT true, 
	is_reserved BOOLEAN DEFAULT false, 
	is_configured BOOLEAN DEFAULT false, 
	configuration_status VARCHAR(30) DEFAULT 'PENDING'::character varying, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	created_by BIGINT, 
	updated_by BIGINT, 
	amenity_ids JSONB DEFAULT '[]'::jsonb, 
	capacity INTEGER DEFAULT 1, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_layout_svg_element UNIQUE (layout_id, svg_element_id)
)
""")

    op.execute("""
CREATE INDEX idx_layout_seat_layout ON layout_seat_mappings (layout_id)
""")

    op.execute("""
CREATE INDEX idx_layout_seat_mappings_layout_config ON layout_seat_mappings (layout_id, is_configured)
""")

    op.execute("""
CREATE INDEX idx_layout_seat_configured ON layout_seat_mappings (layout_id, is_configured)
""")

    op.execute("""
CREATE INDEX idx_layout_seat_mappings_layout_seat_code ON layout_seat_mappings (layout_id, seat_code)
""")

    op.execute("""
CREATE INDEX idx_layout_seat_floor ON layout_seat_mappings (floor_id)
""")

    op.execute("""
CREATE TABLE permissions (
	id BIGSERIAL NOT NULL, 
	permission_key VARCHAR(100) NOT NULL, 
	description TEXT, 
	module_name VARCHAR(50), 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	enforcement_scope VARCHAR(20) DEFAULT 'backend'::character varying NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (permission_key)
)
""")

    op.execute("""
CREATE TABLE tenants (
	id BIGSERIAL NOT NULL, 
	tenant_key VARCHAR(50) NOT NULL, 
	tenant_name VARCHAR(200) NOT NULL, 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (tenant_key)
)
""")

    op.execute("""
CREATE TABLE amenity_categories (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT, 
	category_key VARCHAR(80) NOT NULL, 
	category_name VARCHAR(150) NOT NULL, 
	description TEXT, 
	search_keywords TEXT[], 
	is_system_defined BOOLEAN DEFAULT true NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_amenity_categories_tenant_key UNIQUE (tenant_id, category_key), 
	CONSTRAINT amenity_categories_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id)
)
""")

    op.execute("""
CREATE INDEX idx_amenity_categories_active ON amenity_categories (tenant_id, is_active)
""")

    op.execute("""
CREATE INDEX idx_amenity_categories_tenant ON amenity_categories (tenant_id)
""")

    op.execute("""
CREATE TABLE chatbot_messages (
	id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	session_id UUID NOT NULL, 
	direction VARCHAR(10) NOT NULL, 
	message_text TEXT NOT NULL, 
	message_type VARCHAR(30) DEFAULT 'TEXT'::character varying NOT NULL, 
	node_id VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT fk_chatbot_messages_session FOREIGN KEY(session_id) REFERENCES chatbot_sessions (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE INDEX idx_cb_messages_session ON chatbot_messages (session_id, created_at)
""")

    op.execute("""
CREATE TABLE groups (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	group_name VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_system BOOLEAN DEFAULT false NOT NULL, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	version INTEGER DEFAULT 1 NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	group_name_normalized VARCHAR(100), 
	permission_set_hash VARCHAR(32), 
	group_tier VARCHAR(20) NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_groups_tenant_name_normalized UNIQUE (tenant_id, group_name_normalized), 
	CONSTRAINT groups_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id)
)
""")

    op.execute("""
CREATE INDEX idx_groups_tenant_id ON groups (tenant_id)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_groups_tenant_permission_set ON groups (tenant_id, permission_set_hash) WHERE (permission_set_hash IS NOT NULL)
""")

    op.execute("""
CREATE TABLE roles (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT, 
	role_name VARCHAR(50) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_roles_tenant_role UNIQUE (tenant_id, role_name), 
	CONSTRAINT roles_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE TABLE sites (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	site_code VARCHAR(50) NOT NULL, 
	site_name VARCHAR(200) NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	country VARCHAR(100) NOT NULL, 
	timezone VARCHAR(100) NOT NULL, 
	address_line1 VARCHAR(250), 
	address_line2 VARCHAR(250), 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT sites_tenant_id_site_code_key UNIQUE (tenant_id, site_code), 
	CONSTRAINT sites_tenant_id_site_name_key UNIQUE (tenant_id, site_name), 
	CONSTRAINT sites_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT
)
""")

    op.execute("""
CREATE INDEX idx_sites_tenant_id ON sites (tenant_id)
""")

    op.execute("""
CREATE TABLE teams (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	team_key VARCHAR(100) NOT NULL, 
	team_name VARCHAR(200) NOT NULL, 
	source VARCHAR(50) DEFAULT 'GRAPH'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT teams_tenant_id_team_key_key UNIQUE (tenant_id, team_key), 
	CONSTRAINT teams_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT
)
""")

    op.execute("""
CREATE TABLE amenities (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	amenity_key VARCHAR(80) NOT NULL, 
	amenity_name VARCHAR(150) NOT NULL, 
	description TEXT, 
	icon_name VARCHAR(80), 
	is_active BOOLEAN DEFAULT true NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	category_id BIGINT NOT NULL, 
	category VARCHAR(255), 
	applicable_seat_types TEXT[], 
	PRIMARY KEY (id), 
	CONSTRAINT uq_amenities_tenant_key UNIQUE (tenant_id, amenity_key), 
	CONSTRAINT amenities_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT fk_amenities_category FOREIGN KEY(category_id) REFERENCES amenity_categories (id)
)
""")

    op.execute("""
CREATE INDEX idx_amenities_category_id ON amenities (category_id)
""")

    op.execute("""
CREATE TABLE app_users (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	external_user_id VARCHAR(100), 
	email VARCHAR(200) NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	role_name VARCHAR(30) DEFAULT 'EMPLOYEE'::character varying NOT NULL, 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	home_site_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	microsoft_object_id VARCHAR(150), 
	user_principal_name VARCHAR(200), 
	display_name VARCHAR(200), 
	mobile_phone VARCHAR(50), 
	office_location VARCHAR(200), 
	job_title VARCHAR(150), 
	department VARCHAR(150), 
	company_name VARCHAR(200), 
	employee_id VARCHAR(100), 
	manager_user_id BIGINT, 
	graph_last_synced_at TIMESTAMP WITH TIME ZONE, 
	skills TEXT[], 
	bio TEXT, 
	PRIMARY KEY (id), 
	CONSTRAINT app_users_tenant_id_email_key UNIQUE (tenant_id, email), 
	CONSTRAINT app_users_tenant_id_external_user_id_key UNIQUE (tenant_id, external_user_id), 
	CONSTRAINT app_users_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT app_users_home_site_id_fkey FOREIGN KEY(home_site_id) REFERENCES sites (id) ON DELETE SET NULL, 
	CONSTRAINT app_users_manager_user_id_fkey FOREIGN KEY(manager_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_app_users_home_site_id ON app_users (home_site_id)
""")

    op.execute("""
CREATE INDEX idx_app_users_tenant_id ON app_users (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_app_users_status ON app_users (status)
""")

    op.execute("""
CREATE INDEX idx_app_users_role_name ON app_users (role_name)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_app_users_ms_object ON app_users (tenant_id, microsoft_object_id)
""")

    op.execute("""
CREATE TABLE buildings (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_code VARCHAR(50) NOT NULL, 
	building_name VARCHAR(200) NOT NULL, 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT buildings_site_id_building_code_key UNIQUE (site_id, building_code), 
	CONSTRAINT buildings_site_id_building_name_key UNIQUE (site_id, building_name), 
	CONSTRAINT buildings_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT buildings_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id) ON DELETE RESTRICT
)
""")

    op.execute("""
CREATE INDEX idx_buildings_site_id ON buildings (site_id)
""")

    op.execute("""
CREATE INDEX idx_buildings_tenant_id ON buildings (tenant_id)
""")

    op.execute("""
CREATE TABLE group_permissions (
	id BIGSERIAL NOT NULL, 
	group_id BIGINT NOT NULL, 
	permission_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_group_permission UNIQUE (group_id, permission_id), 
	CONSTRAINT group_permissions_group_id_fkey FOREIGN KEY(group_id) REFERENCES groups (id) ON DELETE CASCADE, 
	CONSTRAINT group_permissions_permission_id_fkey FOREIGN KEY(permission_id) REFERENCES permissions (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE INDEX idx_group_permissions_permission_id ON group_permissions (permission_id)
""")

    op.execute("""
CREATE INDEX idx_group_permissions_group_id ON group_permissions (group_id)
""")

    op.execute("""
CREATE TABLE role_groups (
	id BIGSERIAL NOT NULL, 
	role_id BIGINT NOT NULL, 
	group_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_role_group UNIQUE (role_id, group_id), 
	CONSTRAINT role_groups_role_id_fkey FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
	CONSTRAINT role_groups_group_id_fkey FOREIGN KEY(group_id) REFERENCES groups (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE INDEX idx_role_groups_group_id ON role_groups (group_id)
""")

    op.execute("""
CREATE INDEX idx_role_groups_role_id ON role_groups (role_id)
""")

    op.execute("""
CREATE TABLE role_permissions (
	id BIGSERIAL NOT NULL, 
	role_id BIGINT NOT NULL, 
	permission_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id), 
	CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY(role_id) REFERENCES roles (id) ON DELETE CASCADE, 
	CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY(permission_id) REFERENCES permissions (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE TABLE audit_logs (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	actor_user_id BIGINT, 
	actor_email VARCHAR(255), 
	actor_role VARCHAR(100), 
	action VARCHAR(100) NOT NULL, 
	module VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(100), 
	entity_id VARCHAR(100), 
	event_status VARCHAR(30) DEFAULT 'SUCCESS'::character varying NOT NULL, 
	request_method VARCHAR(10), 
	request_path VARCHAR(500), 
	request_id VARCHAR(100), 
	correlation_id VARCHAR(100), 
	ip_address INET, 
	user_agent TEXT, 
	source_channel VARCHAR(50), 
	old_values JSONB, 
	new_values JSONB, 
	changed_fields JSONB, 
	metadata JSONB, 
	failure_code VARCHAR(100), 
	failure_reason TEXT, 
	occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT fk_audit_logs_tenant FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT fk_audit_logs_actor_user FOREIGN KEY(actor_user_id) REFERENCES app_users (id) ON DELETE SET NULL
)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_entity ON audit_logs (tenant_id, entity_type, entity_id)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_tenant_occurred ON audit_logs (tenant_id, occurred_at DESC)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_module ON audit_logs (tenant_id, module, occurred_at DESC)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_actor ON audit_logs (tenant_id, actor_user_id, occurred_at DESC)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_request_id ON audit_logs (request_id)
""")

    op.execute("""
CREATE INDEX idx_audit_logs_action ON audit_logs (tenant_id, action, occurred_at DESC)
""")

    op.execute("""
CREATE TABLE auth_identities (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	provider VARCHAR(50) NOT NULL, 
	provider_tenant_id VARCHAR(100), 
	provider_user_id VARCHAR(150) NOT NULL, 
	email VARCHAR(200) NOT NULL, 
	raw_profile JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT auth_identities_provider_provider_user_id_key UNIQUE (provider, provider_user_id), 
	CONSTRAINT auth_identities_tenant_id_provider_email_key UNIQUE (tenant_id, provider, email), 
	CONSTRAINT auth_identities_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT auth_identities_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE TABLE auth_token_events (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT, 
	user_id BIGINT, 
	session_id UUID, 
	event_type VARCHAR(50) NOT NULL, 
	ip_address INET, 
	user_agent TEXT, 
	metadata JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT auth_token_events_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE SET NULL, 
	CONSTRAINT auth_token_events_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE SET NULL
)
""")

    op.execute("""
CREATE TABLE email_logs (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT, 
	email_type VARCHAR(100) NOT NULL, 
	recipient_email VARCHAR(255) NOT NULL, 
	subject VARCHAR(500) NOT NULL, 
	status VARCHAR(50) DEFAULT 'PENDING'::character varying NOT NULL, 
	provider VARCHAR(50) DEFAULT 'AWS_SES'::character varying, 
	provider_message_id VARCHAR(255), 
	error_message TEXT, 
	triggered_by_user_id BIGINT, 
	metadata JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	sent_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT email_logs_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT email_logs_triggered_by_user_id_fkey FOREIGN KEY(triggered_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_email_logs_tenant_created ON email_logs (tenant_id, created_at DESC)
""")

    op.execute("""
CREATE INDEX idx_email_logs_type ON email_logs (email_type)
""")

    op.execute("""
CREATE INDEX idx_email_logs_status ON email_logs (status)
""")

    op.execute("""
CREATE TABLE floors (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_code VARCHAR(50) NOT NULL, 
	floor_name VARCHAR(100) NOT NULL, 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT floors_building_id_floor_code_key UNIQUE (building_id, floor_code), 
	CONSTRAINT floors_building_id_floor_name_key UNIQUE (building_id, floor_name), 
	CONSTRAINT floors_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT floors_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id) ON DELETE RESTRICT, 
	CONSTRAINT floors_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE RESTRICT
)
""")

    op.execute("""
CREATE INDEX idx_floors_site_id ON floors (site_id)
""")

    op.execute("""
CREATE INDEX idx_floors_tenant_id ON floors (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_floors_building_id ON floors (building_id)
""")

    op.execute("""
CREATE TABLE guests (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	full_name VARCHAR(150) NOT NULL, 
	email VARCHAR(255), 
	phone VARCHAR(30), 
	organization VARCHAR(150), 
	status VARCHAR(30) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_by_user_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT guests_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT guests_created_by_user_id_fkey FOREIGN KEY(created_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_guests_tenant_email_active ON guests (tenant_id, lower(email::text)) WHERE ((email IS NOT NULL) AND ((status)::text = 'ACTIVE'::text))
""")

    op.execute("""
CREATE INDEX idx_guests_tenant_name ON guests (tenant_id, lower(full_name::text))
""")

    op.execute("""
CREATE INDEX idx_guests_tenant_phone ON guests (tenant_id, phone)
""")

    op.execute("""
CREATE TABLE team_members (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	team_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	member_role VARCHAR(50) DEFAULT 'MEMBER'::character varying, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT team_members_tenant_id_team_id_user_id_key UNIQUE (tenant_id, team_id, user_id), 
	CONSTRAINT team_members_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT team_members_team_id_fkey FOREIGN KEY(team_id) REFERENCES teams (id) ON DELETE CASCADE, 
	CONSTRAINT team_members_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE TABLE tenant_business_rules (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	business_rule_id BIGINT NOT NULL, 
	value VARCHAR(255) NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	updated_by_user_id BIGINT, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_tenant_business_rules_tenant_rule UNIQUE (tenant_id, business_rule_id), 
	CONSTRAINT fk_tenant_business_rules_tenant FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT fk_tenant_business_rules_rule FOREIGN KEY(business_rule_id) REFERENCES business_rules (id), 
	CONSTRAINT fk_tenant_business_rules_updated_by FOREIGN KEY(updated_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE TABLE user_graph_profiles (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	graph_object_id VARCHAR(150) NOT NULL, 
	user_principal_name VARCHAR(200), 
	display_name VARCHAR(200), 
	given_name VARCHAR(100), 
	surname VARCHAR(100), 
	mail VARCHAR(200), 
	mobile_phone VARCHAR(50), 
	business_phones JSONB, 
	job_title VARCHAR(150), 
	department VARCHAR(150), 
	company_name VARCHAR(200), 
	employee_id VARCHAR(100), 
	office_location VARCHAR(200), 
	city VARCHAR(100), 
	state VARCHAR(100), 
	country VARCHAR(100), 
	manager_graph_object_id VARCHAR(150), 
	raw_profile JSONB, 
	synced_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT user_graph_profiles_tenant_id_graph_object_id_key UNIQUE (tenant_id, graph_object_id), 
	CONSTRAINT user_graph_profiles_tenant_id_user_id_key UNIQUE (tenant_id, user_id), 
	CONSTRAINT user_graph_profiles_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT user_graph_profiles_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE CASCADE
)
""")

    op.execute("""
CREATE TABLE user_groups (
	id BIGSERIAL NOT NULL, 
	user_id BIGINT NOT NULL, 
	group_id BIGINT NOT NULL, 
	assigned_by_user_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_group UNIQUE (user_id, group_id), 
	CONSTRAINT user_groups_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE CASCADE, 
	CONSTRAINT user_groups_group_id_fkey FOREIGN KEY(group_id) REFERENCES groups (id) ON DELETE CASCADE, 
	CONSTRAINT user_groups_assigned_by_user_id_fkey FOREIGN KEY(assigned_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_user_groups_group_id ON user_groups (group_id)
""")

    op.execute("""
CREATE INDEX idx_user_groups_user_id ON user_groups (user_id)
""")

    op.execute("""
CREATE TABLE user_preferred_amenities (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	amenity_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_user_preferred_amenity UNIQUE (tenant_id, user_id, amenity_id), 
	CONSTRAINT fk_user_preferred_amenities_tenant FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT fk_user_preferred_amenities_user FOREIGN KEY(user_id) REFERENCES app_users (id), 
	CONSTRAINT fk_user_preferred_amenities_amenity FOREIGN KEY(amenity_id) REFERENCES amenities (id)
)
""")

    op.execute("""
CREATE INDEX idx_user_preferred_amenities_tenant ON user_preferred_amenities (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_user_preferred_amenities_user ON user_preferred_amenities (user_id)
""")

    op.execute("""
CREATE INDEX idx_user_preferred_amenities_amenity ON user_preferred_amenities (amenity_id)
""")

    op.execute("""
CREATE TABLE user_sessions (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	session_id UUID NOT NULL, 
	refresh_token_hash TEXT NOT NULL, 
	user_agent TEXT, 
	ip_address INET, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	last_used_at TIMESTAMP WITH TIME ZONE, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	previous_refresh_token_hash TEXT, 
	previous_token_grace_expires_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT user_sessions_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE CASCADE, 
	UNIQUE (session_id)
)
""")

    op.execute("""
CREATE TABLE floor_layouts (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT NOT NULL, 
	layout_name VARCHAR(150) NOT NULL, 
	layout_file_url TEXT NOT NULL, 
	file_storage_provider VARCHAR(30) DEFAULT 'S3'::character varying, 
	layout_type VARCHAR(30) DEFAULT 'SVG'::character varying NOT NULL, 
	version_no INTEGER DEFAULT 1 NOT NULL, 
	is_published BOOLEAN DEFAULT false NOT NULL, 
	layout_metadata JSONB, 
	uploaded_by_user_id BIGINT, 
	published_by_user_id BIGINT, 
	published_at TIMESTAMP WITH TIME ZONE, 
	status VARCHAR(30) DEFAULT 'DRAFT'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_by_user_id BIGINT, 
	effective_from TIMESTAMP WITH TIME ZONE, 
	effective_till TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_floor_layout_version UNIQUE (tenant_id, floor_id, version_no), 
	CONSTRAINT floor_layouts_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT floor_layouts_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id), 
	CONSTRAINT floor_layouts_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id), 
	CONSTRAINT floor_layouts_floor_id_fkey FOREIGN KEY(floor_id) REFERENCES floors (id), 
	CONSTRAINT floor_layouts_uploaded_by_user_id_fkey FOREIGN KEY(uploaded_by_user_id) REFERENCES app_users (id), 
	CONSTRAINT floor_layouts_published_by_user_id_fkey FOREIGN KEY(published_by_user_id) REFERENCES app_users (id), 
	CONSTRAINT fk_layout_updated_by_user FOREIGN KEY(updated_by_user_id) REFERENCES app_users (id) ON DELETE SET NULL, 
	CONSTRAINT floor_layouts_updated_by_user_id_fkey FOREIGN KEY(updated_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_floor_layout_one_published_per_floor ON floor_layouts (tenant_id, floor_id) WHERE ((is_published = true) AND ((status)::text = 'PUBLISHED'::text))
""")

    op.execute("""
CREATE INDEX idx_floor_layouts_effective_window ON floor_layouts (floor_id, effective_from, effective_till) WHERE ((status)::text = ANY ((ARRAY['PUBLISHED'::character varying, 'SCHEDULED'::character varying])::text[]))
""")

    op.execute("""
CREATE UNIQUE INDEX uq_floor_layouts_one_published_per_floor ON floor_layouts (floor_id) WHERE ((status)::text = 'PUBLISHED'::text)
""")

    op.execute("""
CREATE INDEX ix_floor_layouts_updated_by_user_id ON floor_layouts (updated_by_user_id)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_floor_layouts_one_scheduled_per_floor ON floor_layouts (floor_id) WHERE ((status)::text = 'SCHEDULED'::text)
""")

    op.execute("""
CREATE INDEX ix_layout_updated_by_user_id ON floor_layouts (updated_by_user_id)
""")

    op.execute("""
CREATE TABLE guest_visits (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	guest_id BIGINT NOT NULL, 
	host_user_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT, 
	visit_date DATE NOT NULL, 
	start_time TIME WITHOUT TIME ZONE, 
	end_time TIME WITHOUT TIME ZONE, 
	guest_type VARCHAR(50) NOT NULL, 
	purpose_of_visit VARCHAR(100), 
	requires_seat BOOLEAN DEFAULT false NOT NULL, 
	visit_status VARCHAR(30) DEFAULT 'SCHEDULED'::character varying NOT NULL, 
	notes TEXT, 
	created_by_user_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	checked_in_at TIMESTAMP WITH TIME ZONE, 
	checked_out_at TIMESTAMP WITH TIME ZONE, 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancellation_reason TEXT, 
	modified_from_guest_visit_id BIGINT, 
	modification_reason VARCHAR(100), 
	updated_by_user_id BIGINT, 
	PRIMARY KEY (id), 
	CONSTRAINT guest_visits_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT guest_visits_guest_id_fkey FOREIGN KEY(guest_id) REFERENCES guests (id), 
	CONSTRAINT guest_visits_host_user_id_fkey FOREIGN KEY(host_user_id) REFERENCES app_users (id), 
	CONSTRAINT guest_visits_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id), 
	CONSTRAINT guest_visits_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id), 
	CONSTRAINT guest_visits_floor_id_fkey FOREIGN KEY(floor_id) REFERENCES floors (id), 
	CONSTRAINT guest_visits_created_by_user_id_fkey FOREIGN KEY(created_by_user_id) REFERENCES app_users (id), 
	CONSTRAINT fk_guest_visits_modified_from FOREIGN KEY(modified_from_guest_visit_id) REFERENCES guest_visits (id), 
	CONSTRAINT guest_visits_updated_by_user_id_fkey FOREIGN KEY(updated_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_host_date ON guest_visits (host_user_id, visit_date)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_tenant_guest ON guest_visits (tenant_id, guest_id)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_host_visit_date ON guest_visits (host_user_id, visit_date)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_tenant_visit_date ON guest_visits (tenant_id, visit_date)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_status ON guest_visits (tenant_id, visit_status)
""")

    op.execute("""
CREATE INDEX idx_guest_visits_tenant_date ON guest_visits (tenant_id, visit_date)
""")

    op.execute("""
CREATE TABLE user_work_preferences (
	preference_id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	default_site_id BIGINT, 
	default_building_id BIGINT, 
	default_floor_id BIGINT, 
	preferred_seat_type VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (preference_id), 
	CONSTRAINT uq_user_work_preferences_user UNIQUE (tenant_id, user_id), 
	CONSTRAINT fk_user_work_preferences_tenant FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT fk_user_work_preferences_user FOREIGN KEY(user_id) REFERENCES app_users (id), 
	CONSTRAINT fk_user_work_preferences_site FOREIGN KEY(default_site_id) REFERENCES sites (id), 
	CONSTRAINT fk_user_work_preferences_building FOREIGN KEY(default_building_id) REFERENCES buildings (id), 
	CONSTRAINT fk_user_work_preferences_floor FOREIGN KEY(default_floor_id) REFERENCES floors (id)
)
""")

    op.execute("""
CREATE INDEX idx_user_work_preferences_tenant ON user_work_preferences (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_user_work_preferences_building ON user_work_preferences (default_building_id)
""")

    op.execute("""
CREATE INDEX idx_user_work_preferences_user ON user_work_preferences (user_id)
""")

    op.execute("""
CREATE INDEX idx_user_work_preferences_floor ON user_work_preferences (default_floor_id)
""")

    op.execute("""
CREATE INDEX idx_user_work_preferences_site ON user_work_preferences (default_site_id)
""")

    op.execute("""
CREATE TABLE seats (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT NOT NULL, 
	seat_code VARCHAR(50) NOT NULL, 
	seat_type VARCHAR(30) DEFAULT 'STANDARD'::character varying NOT NULL, 
	seat_neighborhood VARCHAR(100), 
	is_bookable BOOLEAN DEFAULT true NOT NULL, 
	status VARCHAR(20) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	map_x NUMERIC(10, 2), 
	map_y NUMERIC(10, 2), 
	map_width NUMERIC(10, 2), 
	map_height NUMERIC(10, 2), 
	rotation_angle NUMERIC(6, 2) DEFAULT 0, 
	svg_element_id VARCHAR(100), 
	layout_id BIGINT, 
	source_layout_mapping_id BIGINT, 
	seat_name VARCHAR(150), 
	is_reserved BOOLEAN DEFAULT false NOT NULL, 
	live_from TIMESTAMP WITH TIME ZONE, 
	live_until TIMESTAMP WITH TIME ZONE, 
	retired_reason VARCHAR(100), 
	capacity INTEGER DEFAULT 1, 
	PRIMARY KEY (id), 
	CONSTRAINT seats_floor_layout_seat_code_key UNIQUE (floor_id, layout_id, seat_code), 
	CONSTRAINT seats_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT seats_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id) ON DELETE RESTRICT, 
	CONSTRAINT seats_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE RESTRICT, 
	CONSTRAINT seats_floor_id_fkey FOREIGN KEY(floor_id) REFERENCES floors (id) ON DELETE RESTRICT, 
	CONSTRAINT seats_layout_id_fkey FOREIGN KEY(layout_id) REFERENCES floor_layouts (id), 
	CONSTRAINT seats_source_layout_mapping_id_fkey FOREIGN KEY(source_layout_mapping_id) REFERENCES layout_seat_mappings (id)
)
""")

    op.execute("""
CREATE INDEX idx_seats_source_layout_mapping_id ON seats (source_layout_mapping_id)
""")

    op.execute("""
CREATE INDEX idx_seats_layout_id ON seats (layout_id)
""")

    op.execute("""
CREATE INDEX idx_seats_bookable_status ON seats (is_bookable, status)
""")

    op.execute("""
CREATE INDEX idx_seats_tenant_id ON seats (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_seats_live_floor_status ON seats (tenant_id, floor_id, status)
""")

    op.execute("""
CREATE INDEX idx_seats_building_id ON seats (building_id)
""")

    op.execute("""
CREATE INDEX idx_seats_site_id ON seats (site_id)
""")

    op.execute("""
CREATE INDEX idx_seats_floor_id ON seats (floor_id)
""")

    op.execute("""
CREATE TABLE blocked_seats (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	seat_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT NOT NULL, 
	blocked_from DATE NOT NULL, 
	blocked_to DATE NOT NULL, 
	reason VARCHAR(255), 
	block_type VARCHAR(50) DEFAULT 'Operational block'::character varying NOT NULL, 
	status VARCHAR(30) DEFAULT 'ACTIVE'::character varying NOT NULL, 
	blocked_by_user_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT blocked_seats_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT blocked_seats_seat_id_fkey FOREIGN KEY(seat_id) REFERENCES seats (id), 
	CONSTRAINT blocked_seats_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id), 
	CONSTRAINT blocked_seats_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id), 
	CONSTRAINT blocked_seats_floor_id_fkey FOREIGN KEY(floor_id) REFERENCES floors (id), 
	CONSTRAINT blocked_seats_blocked_by_user_id_fkey FOREIGN KEY(blocked_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_blocked_seats_floor_status ON blocked_seats (floor_id, status)
""")

    op.execute("""
CREATE INDEX idx_blocked_seats_seat_date ON blocked_seats (seat_id, blocked_from, blocked_to)
""")

    op.execute("""
CREATE INDEX idx_blocked_seats_tenant_date ON blocked_seats (tenant_id, blocked_from, blocked_to)
""")

    op.execute("""
CREATE TABLE bookings (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	user_id BIGINT, 
	seat_id BIGINT NOT NULL, 
	site_id BIGINT NOT NULL, 
	building_id BIGINT NOT NULL, 
	floor_id BIGINT NOT NULL, 
	booking_date DATE NOT NULL, 
	booking_status VARCHAR(20) DEFAULT 'CONFIRMED'::character varying NOT NULL, 
	source_channel VARCHAR(20) DEFAULT 'WEB'::character varying NOT NULL, 
	check_in_at TIMESTAMP WITH TIME ZONE, 
	checked_out_at TIMESTAMP WITH TIME ZONE, 
	cancelled_at TIMESTAMP WITH TIME ZONE, 
	cancellation_reason VARCHAR(250), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	booked_for_user_id BIGINT, 
	booked_by_user_id BIGINT NOT NULL, 
	booked_for_guest_id BIGINT, 
	guest_visit_id BIGINT, 
	booking_type VARCHAR(20) NOT NULL, 
	modified_from_booking_id BIGINT, 
	modification_reason VARCHAR(100), 
	updated_by_user_id BIGINT, 
	PRIMARY KEY (id), 
	CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_user_id_fkey FOREIGN KEY(user_id) REFERENCES app_users (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_seat_id_fkey FOREIGN KEY(seat_id) REFERENCES seats (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_site_id_fkey FOREIGN KEY(site_id) REFERENCES sites (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_building_id_fkey FOREIGN KEY(building_id) REFERENCES buildings (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_floor_id_fkey FOREIGN KEY(floor_id) REFERENCES floors (id) ON DELETE RESTRICT, 
	CONSTRAINT bookings_booked_for_user_id_fkey FOREIGN KEY(booked_for_user_id) REFERENCES app_users (id), 
	CONSTRAINT bookings_booked_by_user_id_fkey FOREIGN KEY(booked_by_user_id) REFERENCES app_users (id), 
	CONSTRAINT bookings_booked_for_guest_id_fkey FOREIGN KEY(booked_for_guest_id) REFERENCES guests (id), 
	CONSTRAINT bookings_guest_visit_id_fkey FOREIGN KEY(guest_visit_id) REFERENCES guest_visits (id), 
	CONSTRAINT fk_modified_from_booking FOREIGN KEY(modified_from_booking_id) REFERENCES bookings (id), 
	CONSTRAINT bookings_updated_by_user_id_fkey FOREIGN KEY(updated_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_bookings_tenant_seat_date ON bookings (tenant_id, seat_id, booking_date) WHERE ((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text]))
""")

    op.execute("""
CREATE INDEX idx_bookings_tenant_id ON bookings (tenant_id)
""")

    op.execute("""
CREATE INDEX idx_bookings_site_date ON bookings (site_id, booking_date)
""")

    op.execute("""
CREATE INDEX idx_bookings_guest_visit_id ON bookings (guest_visit_id)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_bookings_tenant_user_date_active ON bookings (tenant_id, booked_for_user_id, booking_date) WHERE (((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_user_id IS NOT NULL))
""")

    op.execute("""
CREATE INDEX idx_bookings_user_id ON bookings (user_id)
""")

    op.execute("""
CREATE INDEX idx_bookings_status ON bookings (booking_status)
""")

    op.execute("""
CREATE INDEX idx_bookings_booking_date ON bookings (booking_date)
""")

    op.execute("""
CREATE UNIQUE INDEX uq_bookings_tenant_guest_date_active ON bookings (tenant_id, booked_for_guest_id, booking_date) WHERE (((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_guest_id IS NOT NULL))
""")

    op.execute("""
CREATE INDEX idx_bookings_tenant_date ON bookings (tenant_id, booking_date)
""")

    op.execute("""
CREATE INDEX idx_bookings_seat_id ON bookings (seat_id)
""")

    op.execute("""
CREATE TABLE seat_amenities (
	id BIGSERIAL NOT NULL, 
	tenant_id BIGINT NOT NULL, 
	seat_id BIGINT NOT NULL, 
	amenity_id BIGINT NOT NULL, 
	assigned_by_user_id BIGINT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_seat_amenity UNIQUE (tenant_id, seat_id, amenity_id), 
	CONSTRAINT seat_amenities_tenant_id_fkey FOREIGN KEY(tenant_id) REFERENCES tenants (id), 
	CONSTRAINT seat_amenities_seat_id_fkey FOREIGN KEY(seat_id) REFERENCES seats (id), 
	CONSTRAINT seat_amenities_amenity_id_fkey FOREIGN KEY(amenity_id) REFERENCES amenities (id), 
	CONSTRAINT seat_amenities_assigned_by_user_id_fkey FOREIGN KEY(assigned_by_user_id) REFERENCES app_users (id)
)
""")

    op.execute("""
CREATE INDEX idx_seat_amenities_tenant_amenity ON seat_amenities (tenant_id, amenity_id)
""")

    op.execute("""
CREATE INDEX idx_seat_amenities_amenity_id ON seat_amenities (amenity_id)
""")

    op.execute("""
CREATE INDEX idx_seat_amenities_seat_id ON seat_amenities (seat_id)
""")


def downgrade() -> None:
    """Drop every real table, in reverse dependency order."""
    op.execute('DROP TABLE IF EXISTS "seat_amenities" CASCADE')
    op.execute('DROP TABLE IF EXISTS "bookings" CASCADE')
    op.execute('DROP TABLE IF EXISTS "blocked_seats" CASCADE')
    op.execute('DROP TABLE IF EXISTS "seats" CASCADE')
    op.execute('DROP TABLE IF EXISTS "user_work_preferences" CASCADE')
    op.execute('DROP TABLE IF EXISTS "guest_visits" CASCADE')
    op.execute('DROP TABLE IF EXISTS "floor_layouts" CASCADE')
    op.execute('DROP TABLE IF EXISTS "user_sessions" CASCADE')
    op.execute('DROP TABLE IF EXISTS "user_preferred_amenities" CASCADE')
    op.execute('DROP TABLE IF EXISTS "user_groups" CASCADE')
    op.execute('DROP TABLE IF EXISTS "user_graph_profiles" CASCADE')
    op.execute('DROP TABLE IF EXISTS "tenant_business_rules" CASCADE')
    op.execute('DROP TABLE IF EXISTS "team_members" CASCADE')
    op.execute('DROP TABLE IF EXISTS "guests" CASCADE')
    op.execute('DROP TABLE IF EXISTS "floors" CASCADE')
    op.execute('DROP TABLE IF EXISTS "email_logs" CASCADE')
    op.execute('DROP TABLE IF EXISTS "auth_token_events" CASCADE')
    op.execute('DROP TABLE IF EXISTS "auth_identities" CASCADE')
    op.execute('DROP TABLE IF EXISTS "audit_logs" CASCADE')
    op.execute('DROP TABLE IF EXISTS "role_permissions" CASCADE')
    op.execute('DROP TABLE IF EXISTS "role_groups" CASCADE')
    op.execute('DROP TABLE IF EXISTS "group_permissions" CASCADE')
    op.execute('DROP TABLE IF EXISTS "buildings" CASCADE')
    op.execute('DROP TABLE IF EXISTS "app_users" CASCADE')
    op.execute('DROP TABLE IF EXISTS "amenities" CASCADE')
    op.execute('DROP TABLE IF EXISTS "teams" CASCADE')
    op.execute('DROP TABLE IF EXISTS "sites" CASCADE')
    op.execute('DROP TABLE IF EXISTS "roles" CASCADE')
    op.execute('DROP TABLE IF EXISTS "groups" CASCADE')
    op.execute('DROP TABLE IF EXISTS "chatbot_messages" CASCADE')
    op.execute('DROP TABLE IF EXISTS "amenity_categories" CASCADE')
    op.execute('DROP TABLE IF EXISTS "tenants" CASCADE')
    op.execute('DROP TABLE IF EXISTS "permissions" CASCADE')
    op.execute('DROP TABLE IF EXISTS "layout_seat_mappings" CASCADE')
    op.execute('DROP TABLE IF EXISTS "chatbot_sessions" CASCADE')
    op.execute('DROP TABLE IF EXISTS "business_rules" CASCADE')
