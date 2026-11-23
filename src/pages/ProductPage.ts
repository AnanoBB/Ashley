import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { BasePage } from './BasePage';
import { escapeRegExp } from '../utils/regexp';

/** The buy box (sizes, prices) loads after hydration and can take >15 s on the shared QA env. */
const BUY_BOX_TIMEOUT = 45_000;
/** Click to cart page took 5-15 s in QA runs (2026-11-23); twice the longest seen. */
const ADD_TO_CART_TIMEOUT = 30_000;

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

  /**
   * What a shopper sees as ready: prices shown and Add to Cart enabled (before that it is a loading
   * shimmer and clicks are ignored). The page can still apply a late price quote after this and
   * reset the size (exploration #30, UI-27); tests don't wait it out.
   */
  async waitUntilReady(): Promise<void> {
    await expect(this.price).toHaveText(/\$\d/, { timeout: BUY_BOX_TIMEOUT });
    await expect(this.addToCartButton).toBeEnabled();
  }

  /** Opens the size list and picks a size, once. The test checks that it stays selected. */
  async selectSize(title: string): Promise<void> {
    await this.sizeSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(`^${escapeRegExp(title)} \\(`) })
      .click();
  }

  /**
   * Clicks Add to Cart, declines the upgrade upsell ("Upgrade to Certified Organic/Premier") when it
   * is shown (A/B driven, not on every visit) and waits for the app to route to the cart.
   * Resolves with the add-to-cart API response.
   */
  async addToCart(): Promise<AddToCartResult> {
    const result = await this.submitAddToCart();
    // 'commit': the URL change is the routing; the `load` event can take over a minute (BasePage).
    await this.page.waitForURL('**/checkout/cart', {
      waitUntil: 'commit',
      timeout: ADD_TO_CART_TIMEOUT,
    });
    return result;
  }

  /** Like addToCart, but done when the add-to-cart request is answered (for failing requests). */
  tryAddToCart(): Promise<AddToCartResult> {
    return this.submitAddToCart();
  }

  /**
   * With the upsell, the request is sent only once the upsell is answered, so after the click wait
   * for whichever comes first: the request or the upsell. Each is acted on once.
   */
  private async submitAddToCart(): Promise<AddToCartResult> {
    const isAddToCart = (url: string, method: string): boolean =>
      url.includes('/carts/my/items') && method === 'POST';
    const response = this.page.waitForResponse(
      (candidate) => isAddToCart(candidate.url(), candidate.request().method()),
      { timeout: ADD_TO_CART_TIMEOUT },
    );
    const requestSent = this.page.waitForRequest(
      (request) => isAddToCart(request.url(), request.method()),
      { timeout: ADD_TO_CART_TIMEOUT },
    );
    const upsellShown = this.upsellNoThanks.waitFor({ timeout: ADD_TO_CART_TIMEOUT });
    // The losing wait keeps running until the page closes; its rejection is expected.
    void requestSent.catch(() => undefined);
    void upsellShown.catch(() => undefined);
    void response.catch(() => undefined);

    await this.addToCartButton.click();
    const first = await Promise.race([
      requestSent.then(() => 'request' as const),
      upsellShown.then(() => 'upsell' as const),
    ]);
    if (first === 'upsell') {
      await this.upsellNoThanks.click();
    }
    return { response: await response, upsellDeclined: first === 'upsell' };
  }
}
