# Playwright Responsive Validation Summary

## Run Details

- Date: 2026-08-06
- Suite: `frontend/tests/responsive/chatbot-responsive.spec.ts`
- Command:

```bash
docker compose exec -T frontend sh -c 'PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4200 CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser npm run test:responsive:validation'
```

## Result

- Status: Passed
- Total tests: 72
- Passed: 72
- Failed: 0
- Duration: 3.0 minutes

## Coverage

- Representative iOS and Android viewport profiles from 2015 through 2026.
- Main menu rendering and usability.
- Chat input/footer visibility.
- Rebook calendar green, red, orange, and purple date states.
- Booking card date tones for today and future bookings.
- Horizontal overflow prevention across all tested mobile profiles.

## Stored Artifacts

- HTML report: `validation-results/playwright-report/index.html`
- JSON report: `validation-results/playwright-responsive-results.json`
- Summary: `validation-results/playwright-responsive-summary.md`
