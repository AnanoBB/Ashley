import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The menu panel renders after the page's route prefetches (`/mattress?_rsc`, …), which can take
 * ~20 s on the shared QA env; the menu reports open (aria-expanded) while the panel is still empty.
 */
const MENU_CONTENT_TIMEOUT = 45_000;

export class Header {
  readonly logo: Locator;
  readonly cartIcon: Locator;
  readonly mattressesLink: Locator;
  readonly shopAllMattresses: Locator;

  constructor(private readonly page: Page) {
    this.logo = page.getByTestId('desktop_logo');
    // Two cart icons exist (mobile copy is hidden); the badge text is the item count.
    this.cartIcon = page.getByTestId('cart-icon').filter({ visible: true });
    // Scoped to the real menu: a hidden, inert duplicate nav also has a "Mattresses" link.
    this.mattressesLink = page
      .getByTestId('menu_dropdown_mattresses')
      .getByRole('link', { name: 'Mattresses', exact: true });
    this.shopAllMattresses = page.getByTestId('cta_btn_shop_all_mattresses');
  }

  /**
   * The mega menu opens on hover (the expand chevron is keyboard-only, but its aria-expanded
   * reflects the menu state). A hover that lands before the header hydrates is ignored, so hover
   * again until the menu reports it is open, then wait for its content.
   */
  async openMattressesMenu(): Promise<void> {
    await expect(async () => {
      await this.page.mouse.move(0, 0);
      await this.mattressesLink.hover();
      await expect(this.mattressesToggle).toHaveAttribute('aria-expanded', 'true', {
        timeout: 2_000,
      });
    }).toPass({ timeout: 30_000 });
    await expect(this.shopAllMattresses).toBeVisible({ timeout: MENU_CONTENT_TIMEOUT });
  }

  private get mattressesToggle(): Locator {
    return this.page
      .getByTestId('menu_dropdown_mattresses')
      .getByRole('button', { name: /^Expand Mattresses/ });
  }

  menuCard(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /** Hover menus can close between opening and clicking; retry until the click navigates. */
  async clickMattressMenuCard(testId: string): Promise<void> {
    const startUrl = this.page.url();
    await expect(async () => {
      await this.openMattressesMenu();
      await this.menuCard(testId).click({ timeout: 5_000 });
      await expect(this.page).not.toHaveURL(startUrl, { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
  }
}
