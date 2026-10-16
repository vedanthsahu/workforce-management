import { expect, test, type Page } from '@playwright/test';
import { responsiveDevices, type ResponsiveDevice } from './deviceMatrix';

const sessionId = 'responsive-session';

test.describe('chatbot responsive coverage across iOS and Android viewports', () => {
  for (const device of responsiveDevices) {
    test(`${device.year} ${device.os} ${device.name}: main menu fits and remains usable`, async ({ page }) => {
      await configureViewport(page, device);
      await mockChatSession(page, mainMenuMessages());
      await page.goto('/');

      await expectNoHorizontalOverflow(page);
      await page.getByLabel('Open chatbot').click();
      await expectPanelInsideViewport(page);

      await page.getByLabel('Your name').fill('Responsive Tester');
      await page.getByRole('button', { name: 'Start Booking' }).click();

      await expect(page.getByText('eFACiLiTY Assistant')).toBeVisible();
      await expect(page.getByRole('button', { name: /Quick Book/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Book a seat/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /My Bookings/i })).toBeVisible();
      await expect(page.locator('.chat-input')).toBeVisible();
      await expect(page.locator('.send-btn')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectPanelInsideViewport(page);
    });
  }

  for (const device of responsiveDevices) {
    test(`${device.year} ${device.os} ${device.name}: rebook calendar colors fit and selectable states are correct`, async ({ page }) => {
      await configureViewport(page, device);
      await mockChatSession(page, rebookCalendarMessages());
      await page.goto('/');

      await page.getByLabel('Open chatbot').click();
      await page.getByLabel('Your name').fill('Responsive Tester');
      await page.getByRole('button', { name: 'Start Booking' }).click();

      await expect(page.locator('.rebook-card')).toBeVisible();
      await expect(page.locator('.legend-dot.available')).toBeVisible();
      await expect(page.locator('.legend-dot.unavailable')).toBeVisible();
      await expect(page.locator('.legend-dot.reserved')).toBeVisible();
      await expect(page.locator('.legend-dot.reserved-unavailable')).toBeVisible();
      await expect(page.locator('.rebook-date.available')).toHaveCount(1);
      await expect(page.locator('.rebook-date.unavailable')).toHaveCount(1);
      await expect(page.locator('.rebook-date.reserved')).toHaveCount(1);
      await expect(page.locator('.rebook-date.reserved-unavailable')).toHaveCount(1);
      await expect(page.locator('.rebook-date.disabled')).toHaveCount(1);
      await expect(page.locator('.rebook-date.reserved')).toBeEnabled();
      await expect(page.locator('.rebook-date.reserved-unavailable')).toBeEnabled();
      await expect(page.locator('.rebook-date.disabled')).toBeDisabled();
      await expectNoHorizontalOverflow(page);
      await expectPanelInsideViewport(page);
    });
  }

  for (const device of responsiveDevices) {
    test(`${device.year} ${device.os} ${device.name}: booking date tones fit on cards`, async ({ page }) => {
      await configureViewport(page, device);
      await mockChatSession(page, bookingListMessages());
      await page.goto('/');

      await page.getByLabel('Open chatbot').click();
      await page.getByLabel('Your name').fill('Responsive Tester');
      await page.getByRole('button', { name: 'Start Booking' }).click();

      await expect(page.locator('.booking-card-future')).toBeVisible();
      await expect(page.locator('.booking-card-today')).toBeVisible();
      await expect(page.locator('.bk-date-future')).toBeVisible();
      await expect(page.locator('.bk-date-today')).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectPanelInsideViewport(page);
    });
  }
});

async function configureViewport(page: Page, device: ResponsiveDevice) {
  await page.setViewportSize({ width: device.width, height: device.height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function mockChatSession(page: Page, messages: unknown[]) {
  await page.route('**/api/chat/session', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: sessionId,
        user_name: 'Responsive Tester',
        current_node: 'MAIN_MENU',
        state: 'NAVIGATING',
        initial_response: {
          session_id: sessionId,
          current_node: 'MAIN_MENU',
          state: 'NAVIGATING',
          messages,
        },
      }),
    });
  });

  await page.route('**/api/chat/session/**/message', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: sessionId,
        current_node: 'MAIN_MENU',
        state: 'NAVIGATING',
        messages: mainMenuMessages(),
      }),
    });
  });
}

function mainMenuMessages() {
  return [
    {
      type: 'TEXT',
      text: 'Hi Responsive Tester! How can I help you today?',
    },
    {
      type: 'OPTIONS',
      text: 'What would you like to do?',
      options: [
        { number: 1, label: 'Quick Book', value: 'quick book' },
        { number: 2, label: 'Book a seat', value: 'book a seat' },
        { number: 3, label: 'My Bookings', value: 'my bookings' },
      ],
    },
  ];
}

function rebookCalendarMessages() {
  return [
    {
      type: 'REBOOK_CALENDAR',
      text: 'Select a new date. Green dates mean the same seat is available; red dates need smart seat recommendations; orange dates can update your existing booking; purple dates can change the existing booking with another available seat.',
      rebook_calendar: {
        booking_id: '754',
        seat_code: 'BEG-ROX-F8-A-103',
        site_name: 'Hyderabad Begumpet Office',
        building_name: 'Roxana Towers',
        floor_name: '8th Floor',
        month_start: '2026-08-01',
        previous_month_start: null,
        next_month_start: '2026-09-01',
        days: [
          { date: '2026-08-01', available: false, selectable: false },
          { date: '2026-08-02', available: true, selectable: true },
          { date: '2026-08-03', available: false, selectable: true },
          { date: '2026-08-04', available: true, selectable: true, reserved: true, reserved_seat_available: true },
          { date: '2026-08-05', available: false, selectable: true, reserved: true, reserved_seat_available: false },
        ],
      },
    },
  ];
}

function bookingListMessages() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const iso = (value: Date) => value.toISOString().slice(0, 10);

  return [
    {
      type: 'BOOKING_LIST',
      text: 'You have 2 upcoming booking(s):',
      booking_list: {
        total: 2,
        mode: 'upcoming',
        bookings: [
          {
            booking_id: 'today-booking',
            booking_ref: '801',
            booking_date: iso(today),
            site_name: 'Hyderabad Begumpet Office',
            building_name: 'Roxana Towers',
            floor_name: '8th Floor',
            seat_code: 'BEG-ROX-F8-A-103',
            seat_type: 'Standard Desk',
            status: 'CONFIRMED',
          },
          {
            booking_id: 'future-booking',
            booking_ref: '802',
            booking_date: iso(tomorrow),
            site_name: 'Bengaluru Office',
            building_name: 'BMTC Complex',
            floor_name: '1st Floor',
            seat_code: 'BLR-BMTC-F1-D-101',
            seat_type: 'Standard Desk',
            status: 'CONFIRMED',
          },
        ],
      },
    },
  ];
}

async function expectPanelInsideViewport(page: Page) {
  const panel = page.locator('.chat-panel.open');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentOverflow = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ) - viewportWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className: element.className.toString(),
          tagName: element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > viewportWidth + 1))
      .slice(0, 5);
    return { documentOverflow, offenders };
  });

  expect(overflow.documentOverflow, JSON.stringify(overflow.offenders, null, 2)).toBeLessThanOrEqual(1);
  expect(overflow.offenders, JSON.stringify(overflow.offenders, null, 2)).toHaveLength(0);
}
