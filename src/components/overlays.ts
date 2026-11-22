import type { Page } from '@playwright/test';

export const OVERLAYS = ['cookieBanner', 'promoModal', 'protectionPlanModal'] as const;
export type Overlay = (typeof OVERLAYS)[number];

/**
 * Overlays that appear at unpredictable times and block clicks (see docs/exploration.md).
 * Playwright runs these handlers automatically before any action when the overlay is visible.
 * The add-to-cart upsell is not here: it is part of the purchase flow (ProductPage.addToCart).
 */
export async function registerOverlayHandlers(
  page: Page,
  overlays: readonly Overlay[],
): Promise<void> {
  if (overlays.includes('cookieBanner')) {
    await page.addLocatorHandler(
      page.getByRole('button', { name: 'Accept All Cookies' }),
      (button) => button.click(),
    );
  }

  if (overlays.includes('promoModal')) {
    // Dynamic Yield email-capture popup ("Memorial Day Sale!").
    const promoModal = page
      .getByRole('dialog')
      .filter({ has: page.getByPlaceholder('Enter Email') });
    await page.addLocatorHandler(promoModal, (modal) =>
      modal.getByRole('button', { name: 'Close' }).click(),
    );
  }

  if (overlays.includes('protectionPlanModal')) {
    // Extend protection-plan upsell on the cart page.
    const protectionPlanModal = page.getByRole('dialog').filter({ hasText: 'Protection Plan' });
    await page.addLocatorHandler(protectionPlanModal, (modal) =>
      modal.getByRole('button', { name: 'No Thanks' }).click(),
    );
  }
}
