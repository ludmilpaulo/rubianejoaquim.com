import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.TEST_EMAIL || 'Maitland@2025'
const PASSWORD = process.env.TEST_PASSWORD || 'Maitland@2025'

async function waitForLogin(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('login-screen')).toBeVisible({ timeout: 90_000 })
}

test.describe('Zenda web — auth', () => {
  test('shows login screen', async ({ page }) => {
    await waitForLogin(page)
    await expect(page.getByTestId('login-screen')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('login-email')).toBeVisible()
    await expect(page.getByTestId('login-password')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toBeVisible()
  })

  test('login reaches home or onboarding', async ({ page }) => {
    await waitForLogin(page)
    await page.getByTestId('login-email').fill(EMAIL)
    await page.getByTestId('login-password').fill(PASSWORD)
    await page.getByTestId('login-submit').click()

    const home = page.getByTestId('home-screen')
    const onboarding = page.getByTestId('onboarding-screen')

    await expect(home.or(onboarding)).toBeVisible({ timeout: 45_000 })

    if (await onboarding.isVisible().catch(() => false)) {
      await page.getByTestId('onboarding-skip').click()
    }

    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 })
  })

  test('main tabs visible after login', async ({ page }) => {
    await waitForLogin(page)
    await page.getByTestId('login-email').fill(EMAIL)
    await page.getByTestId('login-password').fill(PASSWORD)
    await page.getByTestId('login-submit').click()

    const skip = page.getByTestId('onboarding-skip')
    if (await skip.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skip.click()
    }

    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByTestId('tab-home')).toBeVisible()
    await expect(page.getByTestId('tab-personal')).toBeVisible()
    await expect(page.getByTestId('tab-business')).toBeVisible()
    await expect(page.getByTestId('tab-education')).toBeVisible()
    await expect(page.getByTestId('tab-profile')).toBeVisible()
  })
})
