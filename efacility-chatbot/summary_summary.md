# eFACiLiTY Chatbot Summary

## Current Status

The eFACiLiTY chatbot is a deterministic seat-booking assistant with a FastAPI backend, Next.js browser widget, WhatsApp webhook support, PostgreSQL session storage, Redis-backed active memory, and Docker Compose local runtime.

## Key Capabilities

- Three main journeys are available: `Quick Book`, `Book a seat`, and `My Bookings`.
- Quick Book minimizes clicks by asking for date, ranking preferred/history-based seats, auto-selecting the first available preferred seat, and showing confirmation directly.
- Book a seat supports guided date, office/site, building, floor, seat selection, and confirmation.
- My Bookings supports upcoming, past, and cancelled tabs with in-place tab refresh for smoother mobile UX.
- Past bookings show `Expired` and include `Rebook`; upcoming bookings support Modify and Cancel when allowed.
- Rebook uses a calendar with green, red, orange, and purple date states to show same-seat availability and existing-booking change paths.
- Free text supports natural booking, quick-book, booking lookup, modify, cancel, greeting, help, typo, and date/location prompts.
- WhatsApp uses the same backend chat engine so intent handling and booking rules stay consistent across channels.

## Recent Jira Enhancements

- Added responsive Playwright regression coverage across representative iOS and Android viewport profiles.
- Added Docker-backed Chromium support so responsive tests run reliably after frontend container rebuilds.
- Added future/today/past visual treatment for booking dates on mobile booking cards.
- Replaced generic failure text with friendly session/backend recovery messages.
- Expanded browser and WhatsApp free-text keyword handling for more natural expressions.
- Added telemetry for user journey steps, intent confidence, seat-backend API calls, duplicate API calls, latency, and bounded process memory.

## Validation

- Backend compile: passed.
- Backend unit tests: `118 tests OK`.
- Frontend production build: passed.
- Responsive Playwright suite: `72 tests passed`.
- Docker services restarted successfully for API and frontend.

## Demo Highlights

- Show the three-menu home experience.
- Demonstrate Quick Book with date-only input and direct confirmation.
- Demonstrate My Bookings tabs and the mobile-friendly card layout.
- Open a past booking and show Rebook calendar colors.
- Try natural prompts such as:
  - `Book my preferred desk for Friday`
  - `Show me where I am supposed to sit tomorrow`
  - `Show cancelled bookings`
  - `Can I switch my seat?`
  - `WFH tomorrow`

## Notes

- Real seat data comes from the external eFACiLiTY seat-management backend.
- Token/cookie values are read from `backend/.env` and can also be cached in `backend/.seat_backend_tokens.json`.
- Native Android Studio/Xcode emulator launches are separate from the Docker-based Playwright viewport matrix.
