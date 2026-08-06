import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT || 4300);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';
const htmlReport = process.env.PLAYWRIGHT_HTML_REPORT || 'playwright-report';
const jsonReport = process.env.PLAYWRIGHT_JSON_REPORT;
const reporters: Parameters<typeof defineConfig>[0]['reporter'] = [
  ['list'],
  ['html', { open: 'never', outputFolder: htmlReport }],
];

if (jsonReport) {
  reporters.push(['json', { outputFile: jsonReport }]);
}

export default defineConfig({
  testDir: './tests/responsive',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: reporters,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: skipWebServer ? undefined : {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
