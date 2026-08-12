# Validation Results

This folder is used to preserve chatbot validation evidence for demos, Jira updates, and sign-off.

## Responsive Playwright Results

Run the preserved validation suite from the Docker frontend service:

```bash
docker compose exec -T frontend sh -c 'PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4200 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npm run test:responsive:validation'
```

The command writes:

- `validation-results/playwright-report/` - browsable HTML report.
- `validation-results/playwright-responsive-results.json` - machine-readable Playwright results.
- `validation-results/playwright-responsive-summary.md` - short human-readable summary.

The responsive suite validates:

- Main menu layout across representative iOS and Android viewport profiles.
- Rebook calendar green, red, orange, and purple states.
- Booking-card date tones for today and future bookings.
- Horizontal overflow prevention across all supported mobile profiles.
