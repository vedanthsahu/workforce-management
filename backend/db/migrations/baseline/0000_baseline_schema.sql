-- ============================================================================
-- 0000_baseline_schema.sql
--
-- Mechanically generated snapshot of the schema as it existed BEFORE the
-- group-based permission model (Trial_001 onward). Generated via:
--   pg_dump --schema-only --no-owner --no-privileges
-- against the seatbooking_dev database, NOT hand-authored -- every table
-- below was reconstructed from the live catalog, not from memory. 28
-- tables total; only ~10 of them (tenants, roles, permissions,
-- role_permissions, app_users, user_sessions, and friends) had been
-- inspected by hand anywhere earlier in this project's history, so this
-- file is the first complete, verified picture of the rest (bookings,
-- guests, guest_visits, floor_layouts, seats, sites, teams, audit_logs,
-- auth_identities, auth_token_events, email_logs, and more).
--
-- This is NOT meant to be applied to an existing database that already has
-- these tables -- it will fail on every CREATE TABLE. Its purpose is:
--   1. A reference for exactly what "empty database, ready for Trial_001"
--      looks like, so a fresh dev/CI database can be built from
--      0000 -> Trial_001 -> ... -> Trial_005 without any manual step.
--   2. A point-in-time record of the schema this migration series was
--      designed against, for anyone auditing the Trial_* files later.
--
-- Not re-generated automatically -- if the pre-existing schema changes
-- (outside the Trial_* migrations), this file goes stale and should be
-- regenerated the same way.
-- ============================================================================

--
-- PostgreSQL database dump
--

\restrict XvO0Xk2258YOqsOYaHa3YZEVGp4LsSTgrVHFcosWCT5WV4YMuxVZg9hPE0Wj9Kx

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_user_work_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_work_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amenities (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    amenity_key character varying(80) NOT NULL,
    amenity_name character varying(150) NOT NULL,
    description text,
    icon_name character varying(80),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id bigint NOT NULL,
    category character varying(255)
);


--
-- Name: amenities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amenities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amenities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amenities_id_seq OWNED BY public.amenities.id;


--
-- Name: amenity_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amenity_categories (
    id bigint NOT NULL,
    tenant_id bigint,
    category_key character varying(80) NOT NULL,
    category_name character varying(150) NOT NULL,
    description text,
    search_keywords text[],
    is_system_defined boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: amenity_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.amenity_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: amenity_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.amenity_categories_id_seq OWNED BY public.amenity_categories.id;


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    external_user_id character varying(100),
    email character varying(200) NOT NULL,
    full_name character varying(200) NOT NULL,
    role_name character varying(30) DEFAULT 'EMPLOYEE'::character varying NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    home_site_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    microsoft_object_id character varying(150),
    user_principal_name character varying(200),
    display_name character varying(200),
    mobile_phone character varying(50),
    office_location character varying(200),
    job_title character varying(150),
    department character varying(150),
    company_name character varying(200),
    employee_id character varying(100),
    manager_user_id bigint,
    graph_last_synced_at timestamp with time zone,
    CONSTRAINT chk_app_users_role CHECK (((role_name)::text = ANY (ARRAY[('EMPLOYEE'::character varying)::text, ('MANAGER'::character varying)::text, ('TENANT_ADMIN'::character varying)::text, ('FRONT OFFICE'::character varying)::text, ('FACILITATOR'::character varying)::text]))),
    CONSTRAINT chk_app_users_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('LOCKED'::character varying)::text])))
);


--
-- Name: app_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_users_id_seq OWNED BY public.app_users.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    actor_user_id bigint,
    actor_email character varying(255),
    actor_role character varying(100),
    action character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    entity_type character varying(100),
    entity_id character varying(100),
    event_status character varying(30) DEFAULT 'SUCCESS'::character varying NOT NULL,
    request_method character varying(10),
    request_path character varying(500),
    request_id character varying(100),
    correlation_id character varying(100),
    ip_address inet,
    user_agent text,
    source_channel character varying(50),
    old_values jsonb,
    new_values jsonb,
    changed_fields jsonb,
    metadata jsonb,
    failure_code character varying(100),
    failure_reason text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_audit_event_status CHECK (((event_status)::text = ANY (ARRAY[('SUCCESS'::character varying)::text, ('FAILURE'::character varying)::text, ('DENIED'::character varying)::text])))
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: auth_identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_identities (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    provider character varying(50) NOT NULL,
    provider_tenant_id character varying(100),
    provider_user_id character varying(150) NOT NULL,
    email character varying(200) NOT NULL,
    raw_profile jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_identities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_identities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_identities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_identities_id_seq OWNED BY public.auth_identities.id;


--
-- Name: auth_token_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_token_events (
    id bigint NOT NULL,
    tenant_id bigint,
    user_id bigint,
    session_id uuid,
    event_type character varying(50) NOT NULL,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auth_token_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_token_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_token_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_token_events_id_seq OWNED BY public.auth_token_events.id;


--
-- Name: blocked_seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_seats (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    seat_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint NOT NULL,
    blocked_from date NOT NULL,
    blocked_to date NOT NULL,
    reason character varying(255),
    block_type character varying(50) DEFAULT 'MAINTENANCE'::character varying NOT NULL,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    blocked_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_blocked_seats_dates CHECK ((blocked_to >= blocked_from)),
    CONSTRAINT chk_blocked_seats_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('CANCELLED'::character varying)::text, ('EXPIRED'::character varying)::text]))),
    CONSTRAINT chk_blocked_seats_type CHECK (((block_type)::text = ANY (ARRAY[('MAINTENANCE'::character varying)::text, ('RESERVED'::character varying)::text, ('ADMIN_BLOCK'::character varying)::text, ('CLEANING'::character varying)::text, ('OTHER'::character varying)::text])))
);


--
-- Name: blocked_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blocked_seats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blocked_seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blocked_seats_id_seq OWNED BY public.blocked_seats.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint,
    seat_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint NOT NULL,
    booking_date date NOT NULL,
    booking_status character varying(20) DEFAULT 'CONFIRMED'::character varying NOT NULL,
    source_channel character varying(20) DEFAULT 'WEB'::character varying NOT NULL,
    check_in_at timestamp with time zone,
    checked_out_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason character varying(250),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booked_for_user_id bigint,
    booked_by_user_id bigint NOT NULL,
    booked_for_guest_id bigint,
    guest_visit_id bigint,
    booking_type character varying(20) NOT NULL,
    modified_from_booking_id bigint,
    modification_reason character varying(100),
    CONSTRAINT chk_booking_for_internal_or_guest CHECK ((((booked_for_user_id IS NOT NULL) AND (booked_for_guest_id IS NULL)) OR ((booked_for_user_id IS NULL) AND (booked_for_guest_id IS NOT NULL)))),
    CONSTRAINT chk_booking_modification_reason CHECK (((modification_reason IS NULL) OR ((modification_reason)::text = ANY (ARRAY[('USER_REQUEST'::character varying)::text, ('ADMIN_MODIFIED'::character varying)::text, ('FACILITATOR_MODIFIED'::character varying)::text, ('SEAT_UNAVAILABLE'::character varying)::text, ('GUEST_DETAILS_UPDATED'::character varying)::text, ('DATE_CHANGED'::character varying)::text, ('SYSTEM_REALLOCATION'::character varying)::text, ('POLICY_CHANGE'::character varying)::text, ('OTHER'::character varying)::text])))),
    CONSTRAINT chk_booking_type_consistency CHECK (((((booking_type)::text = 'EMPLOYEE'::text) AND (booked_for_user_id IS NOT NULL) AND (booked_for_guest_id IS NULL)) OR (((booking_type)::text = 'GUEST'::text) AND (booked_for_guest_id IS NOT NULL) AND (guest_visit_id IS NOT NULL)))),
    CONSTRAINT chk_bookings_booking_target CHECK ((((booked_for_user_id IS NOT NULL) AND (booked_for_guest_id IS NULL)) OR ((booked_for_user_id IS NULL) AND (booked_for_guest_id IS NOT NULL)))),
    CONSTRAINT chk_bookings_source CHECK (((source_channel)::text = ANY (ARRAY[('WEB'::character varying)::text, ('MOBILE'::character varying)::text, ('ADMIN'::character varying)::text, ('API'::character varying)::text]))),
    CONSTRAINT chk_bookings_status CHECK (((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CANCELLED'::character varying)::text, ('COMPLETED'::character varying)::text, ('NO_SHOW'::character varying)::text, ('MODIFIED'::character varying)::text]))),
    CONSTRAINT chk_bookings_type CHECK (((booking_type)::text = ANY (ARRAY[('EMPLOYEE'::character varying)::text, ('GUEST'::character varying)::text]))),
    CONSTRAINT chk_guest_booking_requires_guest_visit CHECK (((booked_for_guest_id IS NULL) OR (guest_visit_id IS NOT NULL)))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buildings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_code character varying(50) NOT NULL,
    building_name character varying(200) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_buildings_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text])))
);


--
-- Name: buildings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.buildings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: buildings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.buildings_id_seq OWNED BY public.buildings.id;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id bigint NOT NULL,
    tenant_id bigint,
    email_type character varying(100) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    provider character varying(50) DEFAULT 'AWS_SES'::character varying,
    provider_message_id character varying(255),
    error_message text,
    triggered_by_user_id bigint,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT chk_email_logs_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SENT'::character varying)::text, ('FAILED'::character varying)::text, ('RETRYING'::character varying)::text])))
);


--
-- Name: email_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_logs_id_seq OWNED BY public.email_logs.id;


--
-- Name: floor_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.floor_layouts (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint NOT NULL,
    layout_name character varying(150) NOT NULL,
    layout_file_url text NOT NULL,
    file_storage_provider character varying(30) DEFAULT 'S3'::character varying,
    layout_type character varying(30) DEFAULT 'SVG'::character varying NOT NULL,
    version_no integer DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    layout_metadata jsonb,
    uploaded_by_user_id bigint,
    published_by_user_id bigint,
    published_at timestamp with time zone,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by_user_id bigint,
    CONSTRAINT chk_floor_layout_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PUBLISHED'::character varying)::text, ('ARCHIVED'::character varying)::text, ('DELETED'::character varying)::text]))),
    CONSTRAINT chk_floor_layout_storage CHECK (((file_storage_provider)::text = ANY (ARRAY[('S3'::character varying)::text, ('AZURE_BLOB'::character varying)::text, ('LOCAL'::character varying)::text]))),
    CONSTRAINT chk_floor_layout_type CHECK (((layout_type)::text = ANY (ARRAY[('IMAGE'::character varying)::text, ('SVG'::character varying)::text, ('PDF_CONVERTED_IMAGE'::character varying)::text])))
);


--
-- Name: floor_layouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.floor_layouts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: floor_layouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.floor_layouts_id_seq OWNED BY public.floor_layouts.id;


--
-- Name: floors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.floors (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_code character varying(50) NOT NULL,
    floor_name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_floors_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text])))
);


--
-- Name: floors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.floors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: floors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.floors_id_seq OWNED BY public.floors.id;


--
-- Name: guest_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_visits (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    guest_id bigint NOT NULL,
    host_user_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint,
    visit_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    guest_type character varying(50) NOT NULL,
    purpose_of_visit character varying(100),
    requires_seat boolean DEFAULT false NOT NULL,
    visit_status character varying(30) DEFAULT 'SCHEDULED'::character varying NOT NULL,
    notes text,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    checked_in_at timestamp with time zone,
    checked_out_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    modified_from_guest_visit_id bigint,
    modification_reason character varying(100),
    CONSTRAINT chk_guest_visit_modification_reason CHECK (((modification_reason IS NULL) OR ((modification_reason)::text = ANY (ARRAY[('USER_REQUEST'::character varying)::text, ('HOST_CHANGED'::character varying)::text, ('DATE_CHANGED'::character varying)::text, ('TIME_CHANGED'::character varying)::text, ('LOCATION_CHANGED'::character varying)::text, ('PURPOSE_CHANGED'::character varying)::text, ('SEAT_REQUIREMENT_CHANGED'::character varying)::text, ('GUEST_DETAILS_UPDATED'::character varying)::text, ('ADMIN_MODIFIED'::character varying)::text, ('FACILITATOR_MODIFIED'::character varying)::text, ('SYSTEM_UPDATE'::character varying)::text, ('OTHER'::character varying)::text])))),
    CONSTRAINT chk_guest_visits_purpose CHECK (((purpose_of_visit IS NULL) OR ((purpose_of_visit)::text = ANY (ARRAY[('INTERVIEW'::character varying)::text, ('MEETING'::character varying)::text, ('WORKSHOP'::character varying)::text, ('VENDOR_VISIT'::character varying)::text, ('CUSTOMER_VISIT'::character varying)::text, ('OTHER'::character varying)::text])))),
    CONSTRAINT chk_guest_visits_status CHECK (((visit_status)::text = ANY (ARRAY[('SCHEDULED'::character varying)::text, ('CHECKED_IN'::character varying)::text, ('CHECKED_OUT'::character varying)::text, ('CANCELLED'::character varying)::text, ('NO_SHOW'::character varying)::text, ('MODIFIED'::character varying)::text]))),
    CONSTRAINT chk_guest_visits_type CHECK (((guest_type)::text = ANY (ARRAY[('INTERVIEW_CANDIDATE'::character varying)::text, ('CUSTOMER'::character varying)::text, ('VENDOR'::character varying)::text, ('PARTNER'::character varying)::text, ('CONTRACTOR'::character varying)::text, ('OTHER'::character varying)::text])))
);


--
-- Name: guest_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guest_visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guest_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guest_visits_id_seq OWNED BY public.guest_visits.id;


--
-- Name: guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guests (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(255),
    phone character varying(30),
    organization character varying(150),
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_guests_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('BLACKLISTED'::character varying)::text])))
);


--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: layout_seat_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_seat_mappings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    layout_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint NOT NULL,
    svg_element_id character varying(100) NOT NULL,
    seat_code character varying(100) NOT NULL,
    seat_name character varying(150),
    seat_type character varying(50),
    status character varying(30) DEFAULT 'ACTIVE'::character varying,
    is_bookable boolean DEFAULT true,
    is_reserved boolean DEFAULT false,
    is_configured boolean DEFAULT false,
    configuration_status character varying(30) DEFAULT 'PENDING'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by bigint,
    updated_by bigint,
    amenity_ids jsonb DEFAULT '[]'::jsonb
);


--
-- Name: layout_seat_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.layout_seat_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: layout_seat_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.layout_seat_mappings_id_seq OWNED BY public.layout_seat_mappings.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    permission_key character varying(100) NOT NULL,
    description text,
    module_name character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    tenant_id bigint,
    role_name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: seat_amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seat_amenities (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    seat_id bigint NOT NULL,
    amenity_id bigint NOT NULL,
    assigned_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seat_amenities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seat_amenities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seat_amenities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seat_amenities_id_seq OWNED BY public.seat_amenities.id;


--
-- Name: seats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seats (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    site_id bigint NOT NULL,
    building_id bigint NOT NULL,
    floor_id bigint NOT NULL,
    seat_code character varying(50) NOT NULL,
    seat_type character varying(30) DEFAULT 'STANDARD'::character varying NOT NULL,
    seat_neighborhood character varying(100),
    is_bookable boolean DEFAULT true NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    map_x numeric(10,2),
    map_y numeric(10,2),
    map_width numeric(10,2),
    map_height numeric(10,2),
    rotation_angle numeric(6,2) DEFAULT 0,
    svg_element_id character varying(100),
    layout_id bigint,
    source_layout_mapping_id bigint,
    seat_name character varying(150),
    is_reserved boolean DEFAULT false NOT NULL,
    live_from timestamp with time zone,
    live_until timestamp with time zone,
    retired_reason character varying(100),
    CONSTRAINT chk_seats_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('MAINTENANCE'::character varying)::text]))),
    CONSTRAINT chk_seats_type CHECK (((seat_type)::text = ANY (ARRAY[('STANDARD'::character varying)::text, ('WINDOW'::character varying)::text, ('CABIN'::character varying)::text, ('ACCESSIBLE'::character varying)::text, ('HOT_DESK'::character varying)::text])))
);


--
-- Name: seats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seats_id_seq OWNED BY public.seats.id;


--
-- Name: sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sites (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    site_code character varying(50) NOT NULL,
    site_name character varying(200) NOT NULL,
    city character varying(100) NOT NULL,
    country character varying(100) NOT NULL,
    timezone character varying(100) NOT NULL,
    address_line1 character varying(250),
    address_line2 character varying(250),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_sites_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text])))
);


--
-- Name: sites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sites_id_seq OWNED BY public.sites.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    team_id bigint NOT NULL,
    user_id bigint NOT NULL,
    member_role character varying(50) DEFAULT 'MEMBER'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    team_key character varying(100) NOT NULL,
    team_name character varying(200) NOT NULL,
    source character varying(50) DEFAULT 'GRAPH'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id bigint NOT NULL,
    tenant_key character varying(50) NOT NULL,
    tenant_name character varying(200) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_tenants_status CHECK (((status)::text = ANY (ARRAY[('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('SUSPENDED'::character varying)::text])))
);


--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: user_graph_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_graph_profiles (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    graph_object_id character varying(150) NOT NULL,
    user_principal_name character varying(200),
    display_name character varying(200),
    given_name character varying(100),
    surname character varying(100),
    mail character varying(200),
    mobile_phone character varying(50),
    business_phones jsonb,
    job_title character varying(150),
    department character varying(150),
    company_name character varying(200),
    employee_id character varying(100),
    office_location character varying(200),
    city character varying(100),
    state character varying(100),
    country character varying(100),
    manager_graph_object_id character varying(150),
    raw_profile jsonb,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_graph_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_graph_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_graph_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_graph_profiles_id_seq OWNED BY public.user_graph_profiles.id;


--
-- Name: user_preferred_amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferred_amenities (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    amenity_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_preferred_amenities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_preferred_amenities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_preferred_amenities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_preferred_amenities_id_seq OWNED BY public.user_preferred_amenities.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    session_id uuid NOT NULL,
    refresh_token_hash text NOT NULL,
    user_agent text,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: user_work_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_work_preferences (
    preference_id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    default_site_id bigint,
    default_building_id bigint,
    default_floor_id bigint,
    preferred_seat_type character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_work_preferences_preference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_work_preferences_preference_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_work_preferences_preference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_work_preferences_preference_id_seq OWNED BY public.user_work_preferences.preference_id;


--
-- Name: amenities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities ALTER COLUMN id SET DEFAULT nextval('public.amenities_id_seq'::regclass);


--
-- Name: amenity_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_categories ALTER COLUMN id SET DEFAULT nextval('public.amenity_categories_id_seq'::regclass);


--
-- Name: app_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users ALTER COLUMN id SET DEFAULT nextval('public.app_users_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: auth_identities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities ALTER COLUMN id SET DEFAULT nextval('public.auth_identities_id_seq'::regclass);


--
-- Name: auth_token_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token_events ALTER COLUMN id SET DEFAULT nextval('public.auth_token_events_id_seq'::regclass);


--
-- Name: blocked_seats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats ALTER COLUMN id SET DEFAULT nextval('public.blocked_seats_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: buildings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings ALTER COLUMN id SET DEFAULT nextval('public.buildings_id_seq'::regclass);


--
-- Name: email_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs ALTER COLUMN id SET DEFAULT nextval('public.email_logs_id_seq'::regclass);


--
-- Name: floor_layouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts ALTER COLUMN id SET DEFAULT nextval('public.floor_layouts_id_seq'::regclass);


--
-- Name: floors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors ALTER COLUMN id SET DEFAULT nextval('public.floors_id_seq'::regclass);


--
-- Name: guest_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits ALTER COLUMN id SET DEFAULT nextval('public.guest_visits_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: layout_seat_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_seat_mappings ALTER COLUMN id SET DEFAULT nextval('public.layout_seat_mappings_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: seat_amenities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities ALTER COLUMN id SET DEFAULT nextval('public.seat_amenities_id_seq'::regclass);


--
-- Name: seats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats ALTER COLUMN id SET DEFAULT nextval('public.seats_id_seq'::regclass);


--
-- Name: sites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites ALTER COLUMN id SET DEFAULT nextval('public.sites_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: user_graph_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles ALTER COLUMN id SET DEFAULT nextval('public.user_graph_profiles_id_seq'::regclass);


--
-- Name: user_preferred_amenities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities ALTER COLUMN id SET DEFAULT nextval('public.user_preferred_amenities_id_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: user_work_preferences preference_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences ALTER COLUMN preference_id SET DEFAULT nextval('public.user_work_preferences_preference_id_seq'::regclass);


--
-- Name: amenities amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_pkey PRIMARY KEY (id);


--
-- Name: amenity_categories amenity_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_categories
    ADD CONSTRAINT amenity_categories_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: app_users app_users_tenant_id_external_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_tenant_id_external_user_id_key UNIQUE (tenant_id, external_user_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_identities auth_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_pkey PRIMARY KEY (id);


--
-- Name: auth_identities auth_identities_provider_provider_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: auth_identities auth_identities_tenant_id_provider_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_tenant_id_provider_email_key UNIQUE (tenant_id, provider, email);


--
-- Name: auth_token_events auth_token_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token_events
    ADD CONSTRAINT auth_token_events_pkey PRIMARY KEY (id);


--
-- Name: blocked_seats blocked_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_pkey PRIMARY KEY (id);


--
-- Name: buildings buildings_site_id_building_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_site_id_building_code_key UNIQUE (site_id, building_code);


--
-- Name: buildings buildings_site_id_building_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_site_id_building_name_key UNIQUE (site_id, building_name);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: blocked_seats exclude_overlapping_active_seat_blocks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT exclude_overlapping_active_seat_blocks EXCLUDE USING gist (tenant_id WITH =, seat_id WITH =, daterange(blocked_from, (blocked_to + 1), '[]'::text) WITH &&) WHERE (((status)::text = 'ACTIVE'::text));


--
-- Name: floor_layouts floor_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_pkey PRIMARY KEY (id);


--
-- Name: floors floors_building_id_floor_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_floor_code_key UNIQUE (building_id, floor_code);


--
-- Name: floors floors_building_id_floor_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_floor_name_key UNIQUE (building_id, floor_name);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (id);


--
-- Name: guest_visits guest_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: layout_seat_mappings layout_seat_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_seat_mappings
    ADD CONSTRAINT layout_seat_mappings_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: seat_amenities seat_amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT seat_amenities_pkey PRIMARY KEY (id);


--
-- Name: seats seats_floor_layout_seat_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_floor_layout_seat_code_key UNIQUE (floor_id, layout_id, seat_code);


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: sites sites_tenant_id_site_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_tenant_id_site_code_key UNIQUE (tenant_id, site_code);


--
-- Name: sites sites_tenant_id_site_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_tenant_id_site_name_key UNIQUE (tenant_id, site_name);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_tenant_id_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_tenant_id_team_id_user_id_key UNIQUE (tenant_id, team_id, user_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_tenant_id_team_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tenant_id_team_key_key UNIQUE (tenant_id, team_key);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_tenant_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_tenant_key_key UNIQUE (tenant_key);


--
-- Name: amenities uq_amenities_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT uq_amenities_tenant_key UNIQUE (tenant_id, amenity_key);


--
-- Name: amenity_categories uq_amenity_categories_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_categories
    ADD CONSTRAINT uq_amenity_categories_tenant_key UNIQUE (tenant_id, category_key);


--
-- Name: floor_layouts uq_floor_layout_version; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT uq_floor_layout_version UNIQUE (tenant_id, floor_id, version_no);


--
-- Name: layout_seat_mappings uq_layout_svg_element; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_seat_mappings
    ADD CONSTRAINT uq_layout_svg_element UNIQUE (layout_id, svg_element_id);


--
-- Name: role_permissions uq_role_permission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id);


--
-- Name: roles uq_roles_tenant_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uq_roles_tenant_role UNIQUE (tenant_id, role_name);


--
-- Name: seat_amenities uq_seat_amenity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT uq_seat_amenity UNIQUE (tenant_id, seat_id, amenity_id);


--
-- Name: user_preferred_amenities uq_user_preferred_amenity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities
    ADD CONSTRAINT uq_user_preferred_amenity UNIQUE (tenant_id, user_id, amenity_id);


--
-- Name: user_work_preferences uq_user_work_preferences_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT uq_user_work_preferences_user UNIQUE (tenant_id, user_id);


--
-- Name: user_graph_profiles user_graph_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles
    ADD CONSTRAINT user_graph_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_graph_profiles user_graph_profiles_tenant_id_graph_object_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles
    ADD CONSTRAINT user_graph_profiles_tenant_id_graph_object_id_key UNIQUE (tenant_id, graph_object_id);


--
-- Name: user_graph_profiles user_graph_profiles_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles
    ADD CONSTRAINT user_graph_profiles_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: user_preferred_amenities user_preferred_amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities
    ADD CONSTRAINT user_preferred_amenities_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_id_key UNIQUE (session_id);


--
-- Name: user_work_preferences user_work_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT user_work_preferences_pkey PRIMARY KEY (preference_id);


--
-- Name: idx_amenities_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amenities_category_id ON public.amenities USING btree (category_id);


--
-- Name: idx_amenity_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amenity_categories_active ON public.amenity_categories USING btree (tenant_id, is_active);


--
-- Name: idx_amenity_categories_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_amenity_categories_tenant ON public.amenity_categories USING btree (tenant_id);


--
-- Name: idx_app_users_home_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_home_site_id ON public.app_users USING btree (home_site_id);


--
-- Name: idx_app_users_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_role_name ON public.app_users USING btree (role_name);


--
-- Name: idx_app_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_status ON public.app_users USING btree (status);


--
-- Name: idx_app_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_users_tenant_id ON public.app_users USING btree (tenant_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (tenant_id, action, occurred_at DESC);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (tenant_id, actor_user_id, occurred_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (tenant_id, entity_type, entity_id);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (tenant_id, module, occurred_at DESC);


--
-- Name: idx_audit_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_request_id ON public.audit_logs USING btree (request_id);


--
-- Name: idx_audit_logs_tenant_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant_occurred ON public.audit_logs USING btree (tenant_id, occurred_at DESC);


--
-- Name: idx_blocked_seats_floor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_seats_floor_status ON public.blocked_seats USING btree (floor_id, status);


--
-- Name: idx_blocked_seats_seat_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_seats_seat_date ON public.blocked_seats USING btree (seat_id, blocked_from, blocked_to);


--
-- Name: idx_blocked_seats_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_seats_tenant_date ON public.blocked_seats USING btree (tenant_id, blocked_from, blocked_to);


--
-- Name: idx_bookings_booking_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_booking_date ON public.bookings USING btree (booking_date);


--
-- Name: idx_bookings_guest_visit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_guest_visit_id ON public.bookings USING btree (guest_visit_id);


--
-- Name: idx_bookings_seat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_seat_id ON public.bookings USING btree (seat_id);


--
-- Name: idx_bookings_site_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_site_date ON public.bookings USING btree (site_id, booking_date);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (booking_status);


--
-- Name: idx_bookings_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_tenant_date ON public.bookings USING btree (tenant_id, booking_date);


--
-- Name: idx_bookings_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_tenant_id ON public.bookings USING btree (tenant_id);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_buildings_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buildings_site_id ON public.buildings USING btree (site_id);


--
-- Name: idx_buildings_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buildings_tenant_id ON public.buildings USING btree (tenant_id);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_logs_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_tenant_created ON public.email_logs USING btree (tenant_id, created_at DESC);


--
-- Name: idx_email_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_type ON public.email_logs USING btree (email_type);


--
-- Name: idx_floors_building_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_floors_building_id ON public.floors USING btree (building_id);


--
-- Name: idx_floors_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_floors_site_id ON public.floors USING btree (site_id);


--
-- Name: idx_floors_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_floors_tenant_id ON public.floors USING btree (tenant_id);


--
-- Name: idx_guest_visits_host_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_host_date ON public.guest_visits USING btree (host_user_id, visit_date);


--
-- Name: idx_guest_visits_host_visit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_host_visit_date ON public.guest_visits USING btree (host_user_id, visit_date);


--
-- Name: idx_guest_visits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_status ON public.guest_visits USING btree (tenant_id, visit_status);


--
-- Name: idx_guest_visits_tenant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_tenant_date ON public.guest_visits USING btree (tenant_id, visit_date);


--
-- Name: idx_guest_visits_tenant_guest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_tenant_guest ON public.guest_visits USING btree (tenant_id, guest_id);


--
-- Name: idx_guest_visits_tenant_visit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_visits_tenant_visit_date ON public.guest_visits USING btree (tenant_id, visit_date);


--
-- Name: idx_guests_tenant_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_tenant_name ON public.guests USING btree (tenant_id, lower((full_name)::text));


--
-- Name: idx_guests_tenant_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guests_tenant_phone ON public.guests USING btree (tenant_id, phone);


--
-- Name: idx_layout_seat_configured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_seat_configured ON public.layout_seat_mappings USING btree (layout_id, is_configured);


--
-- Name: idx_layout_seat_floor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_seat_floor ON public.layout_seat_mappings USING btree (floor_id);


--
-- Name: idx_layout_seat_layout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_seat_layout ON public.layout_seat_mappings USING btree (layout_id);


--
-- Name: idx_layout_seat_mappings_layout_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_seat_mappings_layout_config ON public.layout_seat_mappings USING btree (layout_id, is_configured);


--
-- Name: idx_layout_seat_mappings_layout_seat_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_seat_mappings_layout_seat_code ON public.layout_seat_mappings USING btree (layout_id, seat_code);


--
-- Name: idx_seat_amenities_amenity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_amenities_amenity_id ON public.seat_amenities USING btree (amenity_id);


--
-- Name: idx_seat_amenities_seat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_amenities_seat_id ON public.seat_amenities USING btree (seat_id);


--
-- Name: idx_seat_amenities_tenant_amenity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seat_amenities_tenant_amenity ON public.seat_amenities USING btree (tenant_id, amenity_id);


--
-- Name: idx_seats_bookable_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_bookable_status ON public.seats USING btree (is_bookable, status);


--
-- Name: idx_seats_building_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_building_id ON public.seats USING btree (building_id);


--
-- Name: idx_seats_floor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_floor_id ON public.seats USING btree (floor_id);


--
-- Name: idx_seats_layout_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_layout_id ON public.seats USING btree (layout_id);


--
-- Name: idx_seats_live_floor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_live_floor_status ON public.seats USING btree (tenant_id, floor_id, status);


--
-- Name: idx_seats_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_site_id ON public.seats USING btree (site_id);


--
-- Name: idx_seats_source_layout_mapping_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_source_layout_mapping_id ON public.seats USING btree (source_layout_mapping_id);


--
-- Name: idx_seats_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seats_tenant_id ON public.seats USING btree (tenant_id);


--
-- Name: idx_sites_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sites_tenant_id ON public.sites USING btree (tenant_id);


--
-- Name: idx_user_preferred_amenities_amenity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferred_amenities_amenity ON public.user_preferred_amenities USING btree (amenity_id);


--
-- Name: idx_user_preferred_amenities_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferred_amenities_tenant ON public.user_preferred_amenities USING btree (tenant_id);


--
-- Name: idx_user_preferred_amenities_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferred_amenities_user ON public.user_preferred_amenities USING btree (user_id);


--
-- Name: idx_user_work_preferences_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_work_preferences_building ON public.user_work_preferences USING btree (default_building_id);


--
-- Name: idx_user_work_preferences_floor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_work_preferences_floor ON public.user_work_preferences USING btree (default_floor_id);


--
-- Name: idx_user_work_preferences_site; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_work_preferences_site ON public.user_work_preferences USING btree (default_site_id);


--
-- Name: idx_user_work_preferences_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_work_preferences_tenant ON public.user_work_preferences USING btree (tenant_id);


--
-- Name: idx_user_work_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_work_preferences_user ON public.user_work_preferences USING btree (user_id);


--
-- Name: ix_floor_layouts_updated_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_floor_layouts_updated_by_user_id ON public.floor_layouts USING btree (updated_by_user_id);


--
-- Name: ix_layout_updated_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_layout_updated_by_user_id ON public.floor_layouts USING btree (updated_by_user_id);


--
-- Name: uq_app_users_ms_object; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_app_users_ms_object ON public.app_users USING btree (tenant_id, microsoft_object_id);


--
-- Name: uq_bookings_tenant_guest_date_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bookings_tenant_guest_date_active ON public.bookings USING btree (tenant_id, booked_for_guest_id, booking_date) WHERE (((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_guest_id IS NOT NULL));


--
-- Name: uq_bookings_tenant_seat_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bookings_tenant_seat_date ON public.bookings USING btree (tenant_id, seat_id, booking_date) WHERE ((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text]));


--
-- Name: uq_bookings_tenant_user_date_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_bookings_tenant_user_date_active ON public.bookings USING btree (tenant_id, booked_for_user_id, booking_date) WHERE (((booking_status)::text = ANY (ARRAY[('CONFIRMED'::character varying)::text, ('CHECKED_IN'::character varying)::text])) AND (booked_for_user_id IS NOT NULL));


--
-- Name: uq_floor_layout_one_published_per_floor; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_floor_layout_one_published_per_floor ON public.floor_layouts USING btree (tenant_id, floor_id) WHERE ((is_published = true) AND ((status)::text = 'PUBLISHED'::text));


--
-- Name: uq_guests_tenant_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_guests_tenant_email_active ON public.guests USING btree (tenant_id, lower((email)::text)) WHERE ((email IS NOT NULL) AND ((status)::text = 'ACTIVE'::text));


--
-- Name: user_work_preferences trg_user_work_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_work_preferences_updated_at BEFORE UPDATE ON public.user_work_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_work_preferences_updated_at();


--
-- Name: amenities amenities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT amenities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: amenity_categories amenity_categories_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenity_categories
    ADD CONSTRAINT amenity_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: app_users app_users_home_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_home_site_id_fkey FOREIGN KEY (home_site_id) REFERENCES public.sites(id) ON DELETE SET NULL;


--
-- Name: app_users app_users_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.app_users(id);


--
-- Name: app_users app_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: auth_identities auth_identities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: auth_identities auth_identities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- Name: auth_token_events auth_token_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token_events
    ADD CONSTRAINT auth_token_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: auth_token_events auth_token_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token_events
    ADD CONSTRAINT auth_token_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;


--
-- Name: blocked_seats blocked_seats_blocked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_blocked_by_user_id_fkey FOREIGN KEY (blocked_by_user_id) REFERENCES public.app_users(id);


--
-- Name: blocked_seats blocked_seats_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: blocked_seats blocked_seats_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id);


--
-- Name: blocked_seats blocked_seats_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id);


--
-- Name: blocked_seats blocked_seats_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: blocked_seats blocked_seats_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_seats
    ADD CONSTRAINT blocked_seats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: bookings bookings_booked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booked_by_user_id_fkey FOREIGN KEY (booked_by_user_id) REFERENCES public.app_users(id);


--
-- Name: bookings bookings_booked_for_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booked_for_guest_id_fkey FOREIGN KEY (booked_for_guest_id) REFERENCES public.guests(id);


--
-- Name: bookings bookings_booked_for_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booked_for_user_id_fkey FOREIGN KEY (booked_for_user_id) REFERENCES public.app_users(id);


--
-- Name: bookings bookings_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_guest_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_guest_visit_id_fkey FOREIGN KEY (guest_visit_id) REFERENCES public.guest_visits(id);


--
-- Name: bookings bookings_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;


--
-- Name: buildings buildings_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;


--
-- Name: buildings buildings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buildings
    ADD CONSTRAINT buildings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: email_logs email_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: email_logs email_logs_triggered_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_triggered_by_user_id_fkey FOREIGN KEY (triggered_by_user_id) REFERENCES public.app_users(id);


--
-- Name: amenities fk_amenities_category; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amenities
    ADD CONSTRAINT fk_amenities_category FOREIGN KEY (category_id) REFERENCES public.amenity_categories(id);


--
-- Name: audit_logs fk_audit_logs_actor_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_actor_user FOREIGN KEY (actor_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: guest_visits fk_guest_visits_modified_from; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT fk_guest_visits_modified_from FOREIGN KEY (modified_from_guest_visit_id) REFERENCES public.guest_visits(id);


--
-- Name: floor_layouts fk_layout_updated_by_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT fk_layout_updated_by_user FOREIGN KEY (updated_by_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;


--
-- Name: bookings fk_modified_from_booking; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_modified_from_booking FOREIGN KEY (modified_from_booking_id) REFERENCES public.bookings(id);


--
-- Name: user_preferred_amenities fk_user_preferred_amenities_amenity; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities
    ADD CONSTRAINT fk_user_preferred_amenities_amenity FOREIGN KEY (amenity_id) REFERENCES public.amenities(id);


--
-- Name: user_preferred_amenities fk_user_preferred_amenities_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities
    ADD CONSTRAINT fk_user_preferred_amenities_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: user_preferred_amenities fk_user_preferred_amenities_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferred_amenities
    ADD CONSTRAINT fk_user_preferred_amenities_user FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: user_work_preferences fk_user_work_preferences_building; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT fk_user_work_preferences_building FOREIGN KEY (default_building_id) REFERENCES public.buildings(id);


--
-- Name: user_work_preferences fk_user_work_preferences_floor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT fk_user_work_preferences_floor FOREIGN KEY (default_floor_id) REFERENCES public.floors(id);


--
-- Name: user_work_preferences fk_user_work_preferences_site; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT fk_user_work_preferences_site FOREIGN KEY (default_site_id) REFERENCES public.sites(id);


--
-- Name: user_work_preferences fk_user_work_preferences_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT fk_user_work_preferences_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: user_work_preferences fk_user_work_preferences_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_work_preferences
    ADD CONSTRAINT fk_user_work_preferences_user FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: floor_layouts floor_layouts_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: floor_layouts floor_layouts_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id);


--
-- Name: floor_layouts floor_layouts_published_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_published_by_user_id_fkey FOREIGN KEY (published_by_user_id) REFERENCES public.app_users(id);


--
-- Name: floor_layouts floor_layouts_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: floor_layouts floor_layouts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: floor_layouts floor_layouts_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.app_users(id);


--
-- Name: floor_layouts floor_layouts_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floor_layouts
    ADD CONSTRAINT floor_layouts_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.app_users(id);


--
-- Name: floors floors_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE RESTRICT;


--
-- Name: floors floors_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;


--
-- Name: floors floors_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: guest_visits guest_visits_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id);


--
-- Name: guest_visits guest_visits_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.app_users(id);


--
-- Name: guest_visits guest_visits_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id);


--
-- Name: guest_visits guest_visits_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id);


--
-- Name: guest_visits guest_visits_host_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.app_users(id);


--
-- Name: guest_visits guest_visits_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);


--
-- Name: guest_visits guest_visits_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_visits
    ADD CONSTRAINT guest_visits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: guests guests_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.app_users(id);


--
-- Name: guests guests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: seat_amenities seat_amenities_amenity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT seat_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenities(id);


--
-- Name: seat_amenities seat_amenities_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT seat_amenities_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.app_users(id);


--
-- Name: seat_amenities seat_amenities_seat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT seat_amenities_seat_id_fkey FOREIGN KEY (seat_id) REFERENCES public.seats(id);


--
-- Name: seat_amenities seat_amenities_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seat_amenities
    ADD CONSTRAINT seat_amenities_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: seats seats_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE RESTRICT;


--
-- Name: seats seats_floor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES public.floors(id) ON DELETE RESTRICT;


--
-- Name: seats seats_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.floor_layouts(id);


--
-- Name: seats seats_site_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE RESTRICT;


--
-- Name: seats seats_source_layout_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_source_layout_mapping_id_fkey FOREIGN KEY (source_layout_mapping_id) REFERENCES public.layout_seat_mappings(id);


--
-- Name: seats seats_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: sites sites_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- Name: teams teams_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_graph_profiles user_graph_profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles
    ADD CONSTRAINT user_graph_profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_graph_profiles user_graph_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_graph_profiles
    ADD CONSTRAINT user_graph_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict XvO0Xk2258YOqsOYaHa3YZEVGp4LsSTgrVHFcosWCT5WV4YMuxVZg9hPE0Wj9Kx

