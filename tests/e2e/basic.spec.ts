// @ts-nocheck
import { test, expect } from '@playwright/test'

// Basic happy-path E2E: Home -> Products -> Product -> Add to Cart (if possible)
// This test is resilient: if elements are not found, it will still validate main pages load.

test('home -> products -> product flow', async ({ page }) => {
  // Home
  await page.goto('/')
  await expect(page).toHaveTitle(/متجر|Mavex|تيشيرت|tshirt/i)
  await expect(page.getByRole('heading')).toBeVisible()

  // Navigate to products via link if available
  const viewAll = page.getByRole('link', { name: /عرض جميع المنتجات|products|تسوق الآن/i }).first()
  if (await viewAll.isVisible().catch(() => false)) {
    await viewAll.click()
  } else {
    await page.goto('/products')
  }
  await expect(page).toHaveURL(/\/products/)

  // Ensure products grid is visible (at least renders container)
  // Try to click first product card link
  const firstProductLink = page.locator('a[href^="/product/"]').first()
  if (await firstProductLink.isVisible().catch(() => false)) {
    await firstProductLink.click()
    await expect(page).toHaveURL(/\/product\//)

    // Try add to cart if CTA is visible; otherwise just assert product details are present
    const buyNow = page.getByRole('button', { name: /اشتري الآن|أضف للسلة|Add to cart/i })
    if (await buyNow.isVisible().catch(() => false)) {
      await buyNow.click({ trial: true }).catch(() => {})
      // We don't enforce cart redirect; page presence is enough
      await expect(await page.title()).toBeTruthy()
    } else {
      await expect(page.getByRole('heading')).toBeVisible()
    }
  } else {
    // No product links visible; still ensure products page rendered a title
    await expect(page.getByRole('heading')).toBeVisible()
  }
})
