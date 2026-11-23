import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The menu panel renders after the page's route prefetches (`/mattress?_rsc`, …), which can take
 * ~20 s on the shared QA env; the menu reports open (aria-expanded) while the panel is still empty.
 */
const MENU_CONTENT_TIMEOUT = 30_000;
/** After the page appears the menu ignores hovers for 3-9 s (bug #31, measured 2026-11-23). */
const MENU_OPEN_TIMEOUT = 20_000;
/** How long one menu click may take to change the URL (the next page's data can take ~20 s). */
const NAVIGATION_TIMEOUT = 20_000;

export class Header {
  readonly logo: Locator;
  readonly cartIcon: Locator;
  readonly mattressesLink: Locator;
  readonly shopAllMattresses: Locator;
  /** The expand chevron: keyboard-only, but its aria-expanded reflects the menu state. */
  readonly mattressesToggle: Locator;
  private readonly menu: Locator;

  constructor(private readonly page: Page) {
    this.logo = page.getByTestId('desktop_logo');
    // Two cart icons exist (mobile copy is hidden); the badge text is the item count.
    this.cartIcon = page.getByTestId('cart-icon').filter({ visible: true });
    // Scoped to the real menu: a hidden, inert duplicate nav also has a "Mattresses" link.
    this.menu = page.getByTestId('menu_dropdown_mattresses');
    this.mattressesLink = this.menu.getByRole('link', { name: 'Mattresses', exact: true });
    this.shopAllMattresses = page.getByTestId('cta_btn_shop_all_mattresses');
    this.mattressesToggle = this.menu.getByRole('button', { name: /^Expand Mattresses/ });
  }

  /**
   * Opens the mega menu for tests about its content. For several seconds after the page appears
   * the menu ignores hovers (bug #31, docs/exploration.md), so like a shopper this moves the mouse
   * away and hovers again until the menu opens.
   */
  async openMattressesMenu(): Promise<void> {
    await expect(async () => {
      await this.page.mouse.move(0, 0);
      await this.mattressesLink.hover();
      await expect(this.mattressesToggle).toHaveAttribute('aria-expanded', 'true', {
        timeout: 2_000,
      });
    }).toPass({ timeout: MENU_OPEN_TIMEOUT });
    await expect(this.shopAllMattresses).toBeVisible({ timeout: MENU_CONTENT_TIMEOUT });
  }

  menuCard(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  async clickMattressMenuCard(testId: string): Promise<void> {
    await this.clickInMattressesMenu(this.menuCard(testId));
  }

  async clickShopAllMattresses(): Promise<void> {
    await this.clickInMattressesMenu(this.shopAllMattresses);
  }

  /**
   * Opens the menu, clicks a link in it once and waits for the URL change. The app changes the URL
   * only after the next page's data (`?_rsc`) arrives, which took up to ~20 s on the QA env.
   */
  private async clickInMattressesMenu(target: Locator): Promise<void> {
    const startUrl = this.page.url();
    await this.openMattressesMenu();
    await target.click();
    await this.page.waitForURL((url) => url.href !== startUrl, {
      waitUntil: 'commit',
      timeout: NAVIGATION_TIMEOUT,
    });
  }
}
