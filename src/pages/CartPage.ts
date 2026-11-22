import type { Locator, Page, Response } from '@playwright/test';
import { BasePage } from './BasePage';

/** Test ids embed the product title with spaces replaced by underscores. */
function titleKey(productTitle: string): string {
  return productTitle.replaceAll(' ', '_');
}

export class CartLineItem {
  readonly root: Locator;
  readonly title: Locator;
  readonly size: Locator;
  readonly price: Locator;
  readonly quantity: Locator;

  constructor(page: Page, productTitle: string) {
    const key = titleKey(productTitle);
    this.root = page.getByTestId(`cart_item_${key}`);
    this.title = this.root.getByTestId(`cart_product_title_${key}`);
    this.size = this.root.getByTestId('checkout_Size');
    this.price = this.root.getByTestId('current_price');
    this.quantity = this.root.getByTestId('quantity_number');
  }
}

export class CartPage extends BasePage {
  readonly heading: Locator;
  readonly lineItems: Locator;
  readonly total: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Your Cart', exact: true });
    this.lineItems = page.locator('[data-testid^="cart_item_"]');
    this.total = page.getByTestId('total_price');
    this.emptyState = page.getByTestId('empty_cart_section');
  }

  async goto(): Promise<void> {
    await this.open('/checkout/cart');
  }

  /**
   * Waits for the page's own cart request (`GET {API_URL}/carts/my`), after which the header
   * counter and the cart content reflect the server's cart. Start it before navigating.
   */
  waitForCartLoad(): Promise<Response> {
    return this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/carts/my' && response.request().method() === 'GET',
    );
  }

  item(productTitle: string): CartLineItem {
    return new CartLineItem(this.page, productTitle);
  }
}
