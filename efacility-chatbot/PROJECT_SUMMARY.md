# eFACiLiTY Seat Booking Chatbot - Project Summary

**Last aligned:** 27 July 2026  
**Project type:** Deterministic seat-booking chatbot with browser and WhatsApp channels  
**Purpose:** Help users book, view, modify, and cancel eFACiLiTY workspace seats using guided UI controls or free text, without using an LLM.

---

## 1. Current Architecture

The application is a multi-channel chatbot over one shared backend booking engine.

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Browser UI | Next.js, React, TypeScript | Embedded chatbot widget, forms, cards, dropdowns, booking actions |
| WhatsApp channel | Meta WhatsApp Cloud API, FastAPI webhook | Receives WhatsApp messages and adapts bot responses to text, buttons, lists, and optional Flows |
| Backend API | FastAPI, Python, SQLAlchemy async | Chat session APIs, WhatsApp webhook, lookup APIs, token-protected admin diagnostics |
| Chat engine | Deterministic Python state machine | Booking flow, menu routing, free-text routing, validations, response building |
| Database | PostgreSQL 15 with pgvector image | Lookup data, chatbot sessions, context, messages, bookings, menu config |
| Session memory | Redis | Active session/context cache and WhatsApp interaction state |
| Conversation logging | PostgreSQL plus Elasticsearch/Kibana | Durable chat messages and ELK-compatible conversation logs |
| Runtime | Docker Compose | Runs API, frontend, Postgres, Redis, Elasticsearch, Kibana, and ngrok |

The chatbot is intentionally non-LLM. It uses rules, fuzzy matching, normalization, entity extraction, optional pgvector semantic matching, and deterministic state transitions.

---

## 2. Main Capabilities

| Capability | Current behavior |
|------------|------------------|
| Simplified main menu | Root menu shows `Quick Book`, `Book a seat`, and `My Bookings` |
| Guided seat booking | Collects date, site, building, floor, and seat; seat type and amenities are defaulted internally for now |
| Free-text booking | Supports direct and natural prompts like `book seat tomorrow`, `Need somewhere to sit tomorrow`, `Show me where I am supposed to sit tomorrow`, `quick book`, `my bookings`, and typo variants |
| Slot filling | Captures known date/location details and asks only for missing required fields |
| Quick Book | Prompts for date first, checks favorite/previous seats for that date, falls back to random available seats when needed, and minimizes selections |
| Seat recommendations | Recommendation logic is isolated from booking creation |
| External seat backend bridge | Optional integration with `https://3284lwcmc1.execute-api.ap-south-1.amazonaws.com` for lookups, availability, bookings, and booking actions |
| Single-seat default | User can book only one seat by default |
| Configurable multi-seat | `ALLOW_MULTIPLE_SEATS=true` enables multi-seat/headcount behavior |
| Duplicate booking prevention | User/date duplicate checks stop duplicate confirmed bookings |
| Early duplicate check | Existing confirmed bookings for the selected date are blocked before seat selection |
| Seat conflict protection | Availability checks plus a partial unique DB index prevent double-booking a seat/date |
| My bookings | Shows upcoming bookings in ascending booking-date order with Modify and Cancel actions |
| Cancelled bookings | Free-text prompts such as `show cancelled bookings` display cancelled booking history instead of triggering cancellation |
| Future bookings | Free-text prompts such as `provide me future bookings` display upcoming booking cards |
| Past bookings | Free-text only; shows read-only past booking cards |
| Show more pagination | Upcoming and past bookings support configurable page sizes and `Show more` |
| Date-scoped actions | `cancel my booking today` filters bookings to that date |
| Booking action confirmation | Cancel/Modify always asks confirmation before changing records |
| Current-day action protection | Today/current ongoing bookings cannot be modified or cancelled; user receives a clear notification |
| DB-driven menus | Main menu and dynamic menus are loaded from `chatbot_menu_items` |
| WhatsApp interactivity | Uses native WhatsApp buttons/lists where possible, with optional WhatsApp Flow forms |
| WhatsApp building labels | Building list rows use short titles plus full-name descriptions to avoid WhatsApp title truncation |
| WhatsApp message dedupe | Incoming WhatsApp message ids are stored to suppress duplicate webhook deliveries |
| WhatsApp send retry | Outgoing Meta Cloud API sends retry transient failures |
| Seat backend token refresh | External seat backend auth refresh runs before the 15-minute token window expires, reads updated token values from the mounted `.env`, and can persist refreshed cookies to a local ignored cache |
| User identity mapping | WhatsApp phone numbers map to existing user names through DB mappings, with `.env` fallback |
| Redis memory | Active session/context, WhatsApp form progress, and WhatsApp message traces are cached in Redis |
| ELK logging | Conversation events are indexed to Elasticsearch for Kibana inspection |
| Telemetry | Tracks intent confidence, fallback count, booking conversion events, menu usage, and latency |
| Feature flags | Runtime behavior can be controlled through config/environment variables |

---

## 3. High-Level Prompt Flow

```text
User message
  -> Channel adapter
      Browser: /api/chat/session/{id}/message
      WhatsApp: /api/whatsapp/webhook
  -> Chat adapter service
      Saves inbound message
      Loads session
  -> Chat engine
      Global commands
      Input guard
      Text normalization
      Intent detection
      Entity extraction
      State-machine routing
      Booking/business validation
      Response generation
  -> Channel renderer
      Browser receives rich response schema
      WhatsApp receives text/buttons/lists/flows
  -> Persistence and telemetry
      Postgres messages
      Redis context cache
      Elasticsearch conversation logs
      In-memory telemetry counters
```

---

## 4. Project Structure

```text
efacility-chatbot/
├── backend/
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps/
│   │   │   └── admin_auth.py
│   │   ├── middleware/
│   │   │   └── request_id.py
│   │   ├── models/
│   │   │   └── chatbot.py
│   │   ├── routers/
│   │   │   ├── chat.py
│   │   │   └── whatsapp.py
│   │   ├── schemas/
│   │   │   └── chat.py
│   │   └── services/
│   │       ├── booking_edit_service.py
│   │       ├── chat_adapter_service.py
│   │       ├── chat_engine.py
│   │       ├── confidence_service.py
│   │       ├── conversation_log_service.py
│   │       ├── entity_extractor.py
│   │       ├── free_text_service.py
│   │       ├── input_guard_service.py
│   │       ├── intent_matcher.py
│   │       ├── memory_service.py
│   │       ├── menu_service.py
│   │       ├── navigation_service.py
│   │       ├── plugin_registry.py
│   │       ├── seat_backend_api_service.py
│   │       ├── session_service.py
│   │       ├── telemetry_service.py
│   │       ├── text_normalizer_service.py
│   │       ├── user_identity_service.py
│   │       ├── vector_intent_service.py
│   │       ├── whatsapp_interaction_service.py
│   │       ├── whatsapp_message_store.py
│   │       ├── whatsapp_service.py
│   │       └── whatsapp_session_service.py
│   ├── alembic.ini
│   ├── scripts/
│   │   └── seed_intent_embeddings.py
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-ml.txt
├── database/
│   ├── 01_schema.sql
│   └── schema.sql
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── README.md
└── PROJECT_SUMMARY.md
```

---

## 5. Backend APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/chat/session` | Create browser chat session |
| `POST` | `/api/chat/session/{session_id}/message` | Send browser chat message |
| `GET` | `/api/chat/session/{session_id}` | Get session status |
| `GET` | `/api/chat/lookup/sites` | Load active sites |
| `GET` | `/api/chat/lookup/buildings?site_id=` | Load buildings for a site |
| `GET` | `/api/chat/lookup/floors?building_id=` | Load floors for a building |
| `GET` | `/api/chat/lookup/amenities` | Load active amenities; retained for compatibility, not shown in the current booking flow |
| `GET` | `/api/chat/admin/telemetry` | View process-local telemetry; protected by `X-Admin-Token` when configured |
| `GET` | `/api/chat/admin/plugins` | View integration plugin metadata; protected by `X-Admin-Token` when configured |
| `GET` | `/api/chat/admin/feature-flags` | View active feature flags; protected by `X-Admin-Token` when configured |
| `GET` | `/api/chat/admin/infrastructure` | Check Redis/Elasticsearch support services; protected by `X-Admin-Token` when configured |
| `GET` | `/api/whatsapp/webhook` | Meta webhook verification |
| `POST` | `/api/whatsapp/webhook` | Receive WhatsApp messages/status callbacks |
| `GET` | `/health` | API health check |

---

## 6. Core Backend Services

| Service | Responsibility |
|---------|----------------|
| `chat_adapter_service.py` | Shared message entry point for browser and WhatsApp |
| `chat_engine.py` | Deterministic state machine, business rules, booking response builder |
| `free_text_service.py` | Orchestrates normalization, intent matching, entity extraction, confidence scoring |
| `text_normalizer_service.py` | Lowercase/spacing/symbol cleanup and normalized text preparation |
| `input_guard_service.py` | Blocks or redirects unsupported/toxic/out-of-scope input |
| `intent_matcher.py` | Rule and fuzzy intent matching |
| `vector_intent_service.py` | Optional pgvector-backed semantic intent fallback |
| `confidence_service.py` | Re-ranks intent confidence using rule/vector/entity/context signals |
| `entity_extractor.py` | Extracts date, date range, booking ref, action, and location hints using backend API lookup data |
| `booking_edit_service.py` | Detects requested booking field changes and clears affected context |
| `seat_backend_api_service.py` | Required client for the external seat-management backend with token refresh |
| `session_service.py` | Creates/loads sessions and persists chat messages |
| `memory_service.py` | Redis-backed session/context cache |
| `request_id.py` | Adds `X-Request-ID` response headers and request timing logs |
| `conversation_log_service.py` | Best-effort Elasticsearch indexing |
| `telemetry_service.py` | Intent, fallback, menu usage, booking conversion, and latency metrics |
| `menu_service.py` | DB-driven menu loading and caching |
| `navigation_service.py` | Global navigation command detection |
| `user_identity_service.py` | Maps WhatsApp phone numbers to app user identities using DB mappings first, then `.env` fallback |
| `whatsapp_service.py` | WhatsApp payload parsing and Meta Cloud API sends |
| `whatsapp_session_service.py` | Maps WhatsApp number to chatbot session id using Redis |
| `whatsapp_message_store.py` | Stores WhatsApp incoming/outgoing message ids for traceability and duplicate suppression |
| `whatsapp_interaction_service.py` | Converts form cards and seat lists into WhatsApp lists/buttons/flows |
| `plugin_registry.py` | Placeholder registry for future calendar/auth/notification plugins |

---

## 7. Browser Flow

```text
Create session
  -> Main menu
      1. Quick Book
          -> Date form
          -> Check user's favorite/previous seats for selected date
          -> If previous/favorite seats are available, show those first
          -> If none are available, show available fallback seats
          -> Booking summary
          -> Confirm booking
      2. Book a seat
          -> Date/site/building/floor flow
          -> Available seat cards
          -> Booking summary
          -> Confirm booking
      3. My Bookings
          -> Upcoming booking cards
          -> Modify/Cancel with confirmation
```

Browser response types include:

- `TEXT`
- `OPTIONS`
- `FORM_CARD`
- `SEAT_LIST`
- `CONFIRMATION`
- `SUCCESS`
- `ERROR`
- `QUICK_BOOK`
- `BOOKING_LIST`

The Next.js UI renders these as message bubbles, buttons, forms, dropdowns, seat cards, confirmation cards, and booking cards.

---

## 8. WhatsApp Flow

WhatsApp is an adapter channel over the same chatbot engine. It does not duplicate booking logic.

### Incoming

```text
Meta sends webhook payload
  -> /api/whatsapp/webhook
  -> Extract wa_id and text/interactive reply
  -> Map wa_id to chatbot session
  -> Pass message to chat_adapter_service
```

### Outgoing

```text
ChatResponse
  -> whatsapp_interaction_service
      FORM_CARD -> optional WhatsApp Flow or step-by-step WhatsApp lists/text prompts
      SEAT_LIST -> WhatsApp list rows
      OPTIONS with <= 3 options -> WhatsApp buttons
      OPTIONS with 4-10 options -> WhatsApp list
      BOOKING_LIST -> WhatsApp-friendly text cards
  -> whatsapp_service
  -> Meta Graph API /messages
```

### WhatsApp UX Notes

- The browser form experience is translated into WhatsApp Flows when configured, or step-by-step WhatsApp prompts otherwise.
- Native WhatsApp lists are used for dates, sites, buildings, floors, and seats where possible.
- A `Main menu` option is included in WhatsApp lists to prevent users from getting stuck.
- WhatsApp list rows are capped to Meta limits.
- Building choices use short row titles and full building names in descriptions so names are more readable on WhatsApp.
- Long dropdowns show the first 9 choices plus `Main menu`; users can type a more specific request when needed.
- After the user selects a booking date, the shared engine validates whether the user already has a confirmed booking for that date.
- If an existing booking is found, it offers `Cancel existing & rebook` before asking site/building/floor.

---

## 9. Free-Text Intent Flow

Supported intents:

| Intent | Example |
|--------|---------|
| `BOOK_SEAT` | `book a seat tomorrow`, `Need somewhere to sit tomorrow`, `Office tomorrow`, `Any empty seats?` |
| `QUICK_BOOK` | `quick book`, `Same as last time`, `Nothing special`, `Same office` |
| `LIST_BOOKINGS` | `my bookings`, `show past bookings`, `show cancelled bookings`, `Show me where I am supposed to sit tomorrow` |
| `CANCEL_BOOKING` | `cancel my booking today`, `Cancel the first one`, `I won't be coming`, `cancel BK-20260701-ABC123` |
| `MODIFY_BOOKING` | `modify my booking`, `Friday won't work`, `Actually Building B`, `No Floor 2` |
| `HELP` | `help`, `what can you do`, `Can you do something for me?` |
| `UNKNOWN` | Falls back to a helpful menu response |

Processing stages:

1. Normalize user text.
2. Run input guard.
3. Match intent using rules and fuzzy matching.
4. Optionally consult pgvector intent examples.
5. Re-rank confidence using vector/rule/entity/context signals.
6. Extract entities such as date, date range, location, legacy preference hints, booking ref, and action.
7. Route into the deterministic state machine.
8. Ask clarification questions if confidence or required fields are incomplete.

Seat type and amenity hints may still be recognized by the extractor for compatibility, but the current booking UX does not ask the user to select them. The booking path defaults to one standard seat with no selected amenities.

The latest free-text pass was validated against `Chatbot_FreeText.docx`. Deterministic coverage now includes greeting/help variants, indirect booking requests, quick-book synonyms, booking-list wording, modify/cancel phrases that do not include the word `booking`, typo normalization, and contextual phrases such as `Friday instead`, `Actually Building B`, and `Cancel the first one`.

---

## 10. Booking Rules

| Rule | Behavior |
|------|----------|
| One active booking per user/date | Duplicate confirmed booking is blocked unless multi-seat behavior is enabled later |
| One seat by default | `ALLOW_MULTIPLE_SEATS=false` caps headcount at 1 |
| Date cannot be past | Booking date must be today or future |
| Seat must be available | Conflicting confirmed seat/date bookings are excluded |
| Cancel/modify must be confirmed | User must confirm before state changes |
| Past bookings are read-only | Past booking cards do not show modify/cancel |
| Current-day bookings are protected | Today/current ongoing bookings cannot be modified or cancelled |
| Date-scoped actions | `today`, `tomorrow`, or explicit dates filter action lists |
| Quick Book previous/favorite seats | Uses the user's favorite or previously booked seats when available on the selected date |
| Quick Book fallback | Shows random available seats if the user's previous/favorite seats are unavailable |
| Simplified preference handling | Seat type defaults to `STANDARD`; selected amenities default to empty |

---

## 11. Database

### Seat-Management Data

Sites, buildings, floors, seats, amenities, availability, and bookings are not stored locally. The chatbot reads and writes those records through the external seat-management backend API.

### Chatbot-Owned Tables

| Table | Purpose |
|-------|---------|
| `chatbot_sessions` | Session metadata, user name, node, state, expiry |
| `chatbot_session_context` | Key/value context for in-progress flows |
| `chatbot_messages` | Durable inbound/outbound chat messages |
| `chatbot_menu_items` | Menu tree and target node configuration |
| `chatbot_intent_examples` | Optional intent examples and embeddings |
| `chatbot_user_identity_map` | Channel identity mapping, currently used for WhatsApp phone-to-user resolution |

Important database notes:

- Past and upcoming bookings are fetched from the backend API.
- Booking action context uses keys like `booking_action`, `booking_list_ids`, `date_range_start`, and `date_range_end`.
- Menu presets support runtime tokens such as `__TODAY__` and `__TOMORROW__`.
- Alembic is present for versioned DB changes; the first migration adds `chatbot_user_identity_map`.

---

## 12. Frontend

The frontend has been migrated from Angular to Next.js/React. The chatbot supports:

- Floating launcher and chat panel.
- User-name capture.
- Message bubbles.
- Numbered option buttons.
- Dynamic form cards.
- Mobile-friendly dropdowns.
- Cascading site/building/floor selection.
- Date-first Quick Book flow with previous/favorite seat suggestions.
- Full `Book a seat` guided journey.
- Single-seat default selection behavior.
- Optional multi-seat UI when enabled.
- Seat list cards.
- Confirmation and success cards.
- Upcoming booking cards in ascending order with Modify/Cancel.
- Past booking cards as details-only.
- Cancelled booking cards as details/history.
- `Show more` pagination.
- Free-text input.

Backend flags `can_modify` and `can_cancel` control whether booking cards show actions.

---

## 13. Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | Async SQLAlchemy URL |
| `SYNC_DATABASE_URL` | Optional | Sync URL for scripts |
| `APP_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `INFO` | Operational log threshold (`DEBUG`, `INFO`, `WARNING`, or `ERROR`) |
| `ALLOWED_ORIGINS` | `http://localhost:4200` | CORS origins |
| `DEFAULT_TENANT_ID` | `3` | Tenant scope |
| `SESSION_TTL_MINUTES` | `30` | Session expiry |
| `ALLOW_MULTIPLE_SEATS` | `false` | Enable multi-seat booking |
| `MY_BOOKINGS_MAX_RESULTS` | `7` | Upcoming bookings page size |
| `PAST_BOOKINGS_PAGE_SIZE` | `5` | Past bookings page size |
| `ENABLE_FREE_TEXT` | `true` | Enable free-text routing |
| `ENABLE_VECTOR_INTENT` | `true` | Enable pgvector fallback |
| `ENABLE_TELEMETRY` | `true` | Enable runtime telemetry |
| `ENABLE_QUICK_BOOK_EXACT_SEAT` | `true` | Allows Quick Book to prioritize the user's previous/favorite seats when available |
| `ENABLE_BOOKING_ACTION_CONFIRMATION` | `true` | Require cancel/modify confirmation |
| `ENABLE_REDIS_MEMORY` | `true` | Enable Redis memory |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis URL |
| `ENABLE_ELK_CONVERSATION_LOGS` | `true` | Enable Elasticsearch logs |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch URL |
| `ELASTICSEARCH_CONVERSATION_INDEX` | `logs-efacility-chatbot-conversations-default` | Conversation log index |
| `ELASTICSEARCH_TIMEOUT_SECONDS` | `2` | ELK write timeout |
| `ADMIN_API_TOKEN` | Empty | Optional token required by admin endpoints via `X-Admin-Token` |
| `ENABLE_SEAT_BACKEND_API` | `true` | Requires external seat backend API for locations, availability, and bookings |
| `SEAT_BACKEND_API_URL` | AWS API Gateway URL | External seat backend base URL |
| `SEAT_BACKEND_REFRESH_TOKEN` | Empty | Preferred SSO refresh token cookie content |
| `SEAT_BACKEND_ACCESS_TOKEN` | Empty | Optional access token cookie content |
| `SEAT_BACKEND_SESSION_TOKEN` | Empty | Optional session token cookie content |
| `SEAT_BACKEND_AUTH_COOKIE` | Empty | Legacy combined Cookie header fallback |
| `SEAT_BACKEND_TOKEN_CACHE_PATH` | `.seat_backend_tokens.json` | Local ignored cache for refreshed seat-backend cookies |
| `SEAT_BACKEND_REFRESH_INTERVAL_SECONDS` | `840` | Refresh interval; set below the 15-minute auth window |
| `SEAT_BACKEND_TIMEOUT_SECONDS` | `10` | External seat backend request timeout |
| `WHATSAPP_ENABLED` | `false` | Enable WhatsApp sends |
| `WHATSAPP_VERIFY_TOKEN` | Empty | Meta webhook verify token |
| `WHATSAPP_ACCESS_TOKEN` | Empty | Meta Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | Empty | Meta phone number id |
| `WHATSAPP_GRAPH_API_VERSION` | `v25.0` | Meta Graph API version |
| `WHATSAPP_USER_MAPPINGS` | Empty | Phone-to-user mappings, e.g. `8686123214:Naga` |
| `WHATSAPP_SEND_MAX_RETRIES` | `3` | Retry count for transient WhatsApp send failures |
| `WHATSAPP_RETRY_BACKOFF_SECONDS` | `0.75` | Base backoff between WhatsApp send retries |
| `WHATSAPP_MESSAGE_DEDUPE_TTL_SECONDS` | `86400` | Incoming WhatsApp message-id dedupe TTL |
| `WHATSAPP_USE_FLOWS` | `false` | Send configured WhatsApp Flow forms instead of step-by-step prompts |
| `WHATSAPP_BOOKING_FLOW_ID` | Empty | Meta Flow id for booking forms |
| `WHATSAPP_BOOKING_FLOW_SCREEN` | `BOOKING_FORM` | Meta Flow screen name |
| `WHATSAPP_BOOKING_FLOW_CTA` | `Open booking form` | CTA label for WhatsApp Flow messages |
| `NGROK_AUTHTOKEN` | Empty | Optional ngrok auth token |

---

## 14. Docker Runtime

`docker-compose.yml` currently defines:

| Service | Purpose | Port |
|---------|---------|------|
| `db` | PostgreSQL with pgvector image | `5432` |
| `redis` | Redis memory/session cache | `6379` |
| `elasticsearch` | Conversation log storage | `9200` |
| `kibana` | Log inspection UI | `5601` |
| `api` | FastAPI backend | `8000` |
| `frontend` | Next.js dev server | `4200` |
| `ngrok` | Public tunnel for WhatsApp webhook | `4040` inspector |

Common commands:

```bash
docker compose up --build
docker compose up -d --force-recreate api
docker compose logs -f api
docker compose logs -f ngrok
docker compose down
```

Useful URLs:

- Browser chatbot: `http://localhost:4200`
- Backend health: `http://localhost:8000/health`
- Kibana: `http://localhost:5601`
- Elasticsearch: `http://localhost:9200`
- ngrok inspector: `http://localhost:4040`

---

## 15. WhatsApp Setup

Meta webhook:

```text
Callback URL:
https://<ngrok-url>/api/whatsapp/webhook

Verify token:
efacility_chatbot_verify

Subscribed field:
messages
```

Testing examples:

```text
hi
menu
book seat tomorrow
quick book
my bookings
show past bookings
cancel my booking today
```

Logs:

```bash
docker compose logs -f api
docker compose logs -f ngrok
```

Kibana conversation logs can be inspected through the Logs Explorer or Discover using the configured `logs-efacility-chatbot-conversations-default` index.

---

## 16. Recent Changes

Latest aligned changes:

- Migrated the browser frontend from Angular to Next.js/React while keeping the backend response schema unchanged.
- Updated the root menu to three primary actions: `Quick Book`, `Book a seat`, and `My Bookings`.
- Reworked Quick Book to ask for date first, check previous/favorite seats for availability, and fall back to other available seats.
- Added a full `Book a seat` menu path so users can start the complete guided booking journey explicitly.
- Updated My Bookings to display upcoming bookings in ascending date order and to show `Quick Book`, `Book a seat`, and `Main menu` actions after booking lists.
- Added free-text support for future, past, cancelled, and date-scoped booking list prompts.
- Added safeguards so today/current ongoing bookings cannot be modified or cancelled.
- Improved free-text routing during booking flows so users can change date/location/building/floor preferences without restarting.
- Expanded greeting, help, indirect booking, quick-book, list-bookings, modify, cancel, typo, and contextual prompt handling from `Chatbot_FreeText.docx`.
- Fixed deterministic handling for prompts such as `Show me where I am supposed to sit tomorrow`, `Can you help me with tomorrow?`, `Actually Building B`, `No Floor 2`, `Friday instead`, and `Cancel the first one`.
- Added rebook calendar UX with green/red/orange/purple date states and in-place month switching.
- Added distinct booking-card date tones so future dates and today stand out on mobile.
- Replaced generic browser and WhatsApp fallback errors with user-friendly session/service recovery messages.
- Added bounded memory telemetry to admin diagnostics for process RSS and telemetry buffer usage.
- Added Docker-backed Playwright responsive regression coverage for representative iOS and Android viewport profiles, including main menu, booking cards, and rebook calendar states.

---

## 17. Validation

Current backend validation uses Python `unittest`:

```bash
docker compose exec -T api python -m unittest discover -s tests -p test_free_text_services.py
docker compose exec -T api python -m unittest discover -s tests -p test_whatsapp_integration.py
docker compose exec -T api python -m py_compile app/services/intent_matcher.py app/services/text_normalizer_service.py app/services/chat_engine.py
```

Recent successful checks:

- `Chatbot_FreeText.docx` deterministic prompt sweep: `misses=0`.
- Backend unit tests: 118 tests passed.
- Compile check for updated chatbot services: passed.
- Frontend production build: passed.
- Responsive Playwright suite: 72 tests passed.
- API and frontend containers recreated successfully with Docker Compose.

---

## 18. Current Technical Strengths

- Browser and WhatsApp share the same booking engine.
- Booking logic is not duplicated in channel adapters.
- Chat engine is deterministic and easier to audit than a generative flow.
- Expanded free text improves UX while still routing through controlled states.
- Redis reduces repeated DB context reads during active sessions.
- Postgres remains the durable source of truth.
- ELK provides production-style conversation inspection.
- Booking action confirmation protects users from accidental cancellation/modification.
- Recommendation logic is separated from booking creation.
- Feature flags allow controlled rollout.
- Admin diagnostics can be protected with `ADMIN_API_TOKEN`.
- Request ids are attached to API responses and request logs.
- WhatsApp duplicate webhooks are suppressed by message-id tracking.

---

## 19. Recommended Next Improvements

| Area | Recommendation |
|------|----------------|
| Database migrations | Continue moving schema changes into Alembic revisions |
| Persistent telemetry | Move telemetry from process memory to Postgres, Prometheus, OpenTelemetry, or Elasticsearch |
| Admin security | Replace shared admin token with role-based authentication/authorization |
| WhatsApp flows | Finalize and publish Meta WhatsApp Flow definitions for richer form-like booking UX |
| User identity | Add an admin UI or import process for `chatbot_user_identity_map` |
| Observability | Propagate request ids across WhatsApp, API logs, and ELK conversation events |
| Test coverage | Add end-to-end tests for full browser and WhatsApp booking journeys |
| Intent examples | Keep expanding `chatbot_intent_examples` and synonym dictionaries from real missed prompts |
| Plugin architecture | Convert placeholder plugin registry entries into executable plugin contracts |
| Production deployment | Add HTTPS, secrets management, and environment-specific config files |
