import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

export async function newAccount(page: Page) {
  await expect(page.locator("h6:has-text('My accounts')")).toBeVisible()
  await page.click("[aria-label='Create new wallet']")
}
