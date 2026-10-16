# Responsive Chatbot Test Suite

This Playwright suite validates the chatbot UI across representative iOS and
Android viewport ranges from 2015 through the current project baseline.

The matrix intentionally uses CSS viewport sizes rather than physical screen
pixels. That is the browser behavior that determines whether text, buttons,
menus, fixed panels, and calendars fit correctly.

## Coverage

- Compact phones such as iPhone SE and fold cover displays.
- Standard iPhone and Android phone sizes from 2015 onward.
- Large modern iOS and Android phones.
- Tablet portrait sizes for iPad mini and iPad Pro.
- Chatbot launch, name entry, main menu rendering, footer/input usability.
- Rebook calendar rendering with green, red, orange, and purple date states.
- Booking card date-tone rendering for today and future bookings.
- Horizontal overflow checks for every viewport in the matrix.

## Commands

Run locally when Playwright browsers are installed:

```bash
cd frontend
npm run test:responsive
```

Run against the Docker frontend service:

```bash
docker compose exec -T frontend sh -c \
  'PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4200 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npm run test:responsive'
```

The Docker frontend image installs Chromium through `frontend/Dockerfile`, so
the responsive suite remains available after container rebuilds.
