import type { Page } from '@playwright/test';

/**
 * Overlays that appear at unpredictable times and block clicks (see docs/exploration.md).
 * Playwright runs these handlers automatically before any action when the overlay is visible.
 * The Dynamic Yield email popup needs no handler: its scripts are blocked (ui.fixtures.ts).
 * The add-to-cart upsell is not here: it is part of the purchase flow (ProductPage.addToCart).
 */
export async function registerOverlayHandlers(page: Page): Promise<void> {
  await page.addLocatorHandler(page.getByRole('button', { name: 'Accept All Cookies' }), (button) =>
    button.click(),
  );

  // Extend protection-plan upsell on the cart page.
  const protectionPlanModal = page.getByRole('dialog').filter({ hasText: 'Protection Plan' });
  await page.addLocatorHandler(protectionPlanModal, (modal) =>
    modal.getByRole('button', { name: 'No Thanks' }).click(),
  );
}
