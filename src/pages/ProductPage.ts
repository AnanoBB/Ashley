import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { BasePage } from './BasePage';
import { escapeRegExp } from '../utils/regexp';

/** The buy box (sizes, prices) loads after hydration and can take >15 s on the shared QA env. */
const BUY_BOX_TIMEOUT = 45_000;
const ADD_TO_CART_TIMEOUT = 60_000;

export interface AddToCartResult {
  /** The `POST /carts/my/items` response sent by the storefront. */
  response: Response;
  /** Whether the "Upgrade to …" upsell was shown and declined (A/B driven). */
  upsellDeclined: boolean;
}

export class ProductPage extends BasePage {
  readonly heading: Locator;
  readonly sizeSelect: Locator;
  readonly selectedSize: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  private readonly upsellNoThanks: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sizeSelect = page.getByTestId('add_to_cart_property_selector_size');
    this.selectedSize = this.sizeSelect.getByTestId('add_to_cart_property_selector_size_selected');
    // Despite its name, this test id holds the selling price (see bug #8 in docs/exploration.md).
    this.price = this.sizeSelect.getByTestId(
      'add_to_cart_property_selector_size_selected_original_price',
    );
    // exact: the product-card button lower on the page is "Add To Cart".
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true });
    // includeHidden: when another MUI modal was opened earlier (e.g. the Extend protection plan),
    // the upsell can be marked aria-hidden although it is on screen. Scoped to the upgrade dialog
    // so the Extend modal's own "No Thanks" isn't counted as a declined upsell.
    this.upsellNoThanks = page
      .getByRole('dialog', { includeHidden: true })
      .filter({ hasText: 'Upgrade to' })
      .getByRole('button', { name: 'No Thanks', includeHidden: true })
      .filter({ visible: true })
      .first();
  }

  async goto(path: string): Promise<void> {
    await this.open(path);
    await this.waitUntilReady();
  }

  /** Until prices are loaded, Add to Cart is a loading shimmer and clicks are ignored. */
  async waitUntilReady(): Promise<void> {
    await expect(this.price).toHaveText(/\$\d/, { timeout: BUY_BOX_TIMEOUT });
    await expect(this.addToCartButton).toBeEnabled();
  }

  /**
   * A selection made while the buy box re-renders (price quotes refresh after load) is sometimes
   * dropped, so retry until the selector shows the requested size.
   */
  async selectSize(title: string): Promise<void> {
    const option = this.page.getByRole('option', {
      name: new RegExp(`^${escapeRegExp(title)} \\(`),
    });
    await expect(async () => {
      if (!(await option.isVisible())) {
        await this.sizeSelect.click();
      }
      await option.click({ timeout: 5_000 });
      await expect(this.selectedSize).toHaveText(title, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  }

  /**
   * Clicks Add to Cart, declines the upgrade upsell ("Upgrade to Certified Organic/Premier") when
   * it is shown (A/B driven, not on every visit) and waits for the app to route to the cart.
   * Declining is retried as a real click so overlay handlers (promo popup, cookie banner) that
   * stack on top of the upsell are dismissed first. Resolves with the add-to-cart API response.
   */
  async addToCart(): Promise<AddToCartResult> {
    const addRequest = this.page.waitForResponse(
      (response) =>
        response.url().includes('/carts/my/items') && response.request().method() === 'POST',
      { timeout: ADD_TO_CART_TIMEOUT },
    );
    let upsellDeclined = false;
    const routedToCart = async (): Promise<void> => {
      await this.addToCartButton.click();
      await expect(async () => {
        if (!this.isOnCartPage()) {
          await this.upsellNoThanks.click({ timeout: 2_000 });
          upsellDeclined = true;
        }
        expect(this.isOnCartPage(), 'routed to /checkout/cart').toBe(true);
      }).toPass({ timeout: ADD_TO_CART_TIMEOUT });
    };
    // Awaited together so a failed click flow doesn't leave the response wait rejecting unhandled.
    const [response] = await Promise.all([addRequest, routedToCart()]);
    return { response, upsellDeclined };
  }

  private isOnCartPage(): boolean {
    return new URL(this.page.url()).pathname === '/checkout/cart';
  }
}
