# Data Model

## Overview

SeatBook stores its data in PostgreSQL: 36 tables in four domains. Every business record carries the organisation it belongs to.

| Domain | Main tables |
|---|---|
| Identity and access | Organisations, users, identities, sessions, roles, permissions, teams |
| Locations and layouts | Sites, buildings, floors, floor layouts, desk mappings, desks, amenities |
| Bookings and visitors | Bookings, blocked seats, visitors, visits |
| Configuration and records | Business rules and organisation values, preferences, audit log, chatbot sessions and messages |

## Core model

```mermaid
erDiagram
    tenants ||--o{ app_users : has
    tenants ||--o{ sites : has
    sites ||--o{ buildings : contains
    buildings ||--o{ floors : contains
    floors ||--o{ floor_layouts : "plan versions"
    floor_layouts ||--o{ layout_seat_mappings : "seat shapes"
    floors ||--o{ seats : has
    seats ||--o{ bookings : "booked on a date"
    app_users ||--o{ bookings : "booked for or by"
    guests ||--o{ guest_visits : visits
    guest_visits ||--o| bookings : "optional seat"
    guests ||--o{ bookings : "booked for guest"
    seats ||--o{ blocked_seats : "blocked for range"
    roles ||--o{ role_permissions : grants
    permissions ||--o{ role_permissions : granted
    business_rules ||--o{ tenant_business_rules : "tenant values"
    app_users ||--o{ audit_logs : actor
```

*Figure: The core entities and how they relate.*

## Key entities

| Entity | Holds |
|---|---|
| Organisation (`tenants`) | A customer organisation and its Microsoft tenant |
| User (`app_users`) | Name, e-mail, role, status, profile |
| Site, building, floor | The location hierarchy |
| Floor layout | A version of a floor's drawing and its status |
| Desk (`seats`) | A bookable place on a published layout, with its amenities |
| Booking | One desk, one day, for an employee or a visitor, with who booked it and its status |
| Visitor (`guests`) and visit | Visitor profile and planned visits with host and status |
| Blocked seat | A desk taken out of use for a period |
| Business rule | A setting's default and each organisation's value |
| Audit log | Who did what, when, with what outcome and which changes |

## Integrity rules built into the database

| Rule | Mechanism |
|---|---|
| One active booking per desk per day | Unique index on organisation, desk and date for active bookings |
| One active booking per employee per day | Unique index on organisation, employee and date |
| One active booking per visitor per day | Unique index on organisation, visitor and date |
| One published layout per floor | Unique index on floor for published layouts |
| One planned layout per floor | Unique index on floor for scheduled layouts |
| One active visitor profile per e-mail | Unique index on organisation and lower-cased e-mail |
| Referential integrity | Foreign keys link related entities such as desks, bookings, visits and users |

## Domain diagrams

### Locations and layouts

```mermaid
erDiagram
    sites ||--o{ buildings : "site_id"
    buildings ||--o{ floors : "building_id"
    floors ||--o{ floor_layouts : "floor_id"
    layout_seat_mappings ||--o{ seats : "source_layout_mapping_id"
    floors ||--o{ seats : "floor_id"
    floor_layouts ||--o{ seats : "layout_id"
    amenity_categories ||--o{ amenities : "category_id"
    seats ||--o{ seat_amenities : "seat_id"
    amenities ||--o{ seat_amenities : "amenity_id"
```

*Figure: Locations and layouts.*

### Bookings and visitors

```mermaid
erDiagram
    seats ||--o{ bookings : "seat_id"
    app_users ||--o{ bookings : "booked_for_user_id"
    guests ||--o{ bookings : "booked_for_guest_id"
    guest_visits ||--o| bookings : "guest_visit_id"
    bookings ||--o| bookings : "modified_from_booking_id"
    guests ||--o{ guest_visits : "guest_id"
    app_users ||--o{ guest_visits : "host_user_id"
    seats ||--o{ blocked_seats : "seat_id"
```

*Figure: Bookings and visitors.*
