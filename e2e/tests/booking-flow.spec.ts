import { test, expect } from '@playwright/test'

test('guest books a slot and owner sees the booking', async ({ page }) => {
  const apiBase = process.env.BASE_URL || 'http://localhost:3001'

  // Create a meeting type via API first
  const createRes = await fetch(`${apiBase}/api/meeting-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Консультация',
      description: 'Тестовая консультация для E2E',
      durationMinutes: 30,
    }),
  })
  expect(createRes.status).toBe(201)

  // ─── Guest flow ───

  // Step 1: Guest opens homepage
  await page.goto('/')
  await page.waitForTimeout(2000)

  // Step 2: Guest clicks to select meeting type
  await page.click('text=Выбрать тип встречи')
  await page.waitForTimeout(1000)

  // Step 3: Guest selects the meeting type
  await page.click('text=E2E Консультация')
  await page.waitForTimeout(1000)

  // Step 4: Guest selects the first available date
  const dateButtons = page.getByRole('button').filter({ hasText: /\d/ })
  await dateButtons.first().click()
  await page.waitForTimeout(3000)

  // Step 5: Guest selects the first available time slot
  const timeSlots = page.getByRole('button').filter({ hasText: /:/ })
  await timeSlots.first().click()
  await page.waitForTimeout(1000)

  // Step 6: Guest fills in the form
  await page.getByLabel('Имя').fill('E2E Тест')
  await page.getByLabel('Email').fill('e2e@test.com')

  // Step 7: Guest submits the booking
  await page.getByRole('button', { name: 'Записаться' }).click()

  // Step 8: Guest sees confirmation
  await expect(page.getByText('Записано!')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('E2E Тест')).toBeVisible()
  await expect(page.getByText('e2e@test.com')).toBeVisible()

  // ─── Owner flow ───

  // Navigate to dashboard (owner page)
  await page.goto('/dashboard')
  await page.waitForTimeout(2000)

  // Owner sees the booking in the table (use first() to avoid strict mode violation)
  await expect(page.getByText('E2E Тест')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('e2e@test.com')).toBeVisible()
})
