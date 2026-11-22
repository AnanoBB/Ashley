import type { Page } from '@playwright/test';
import { Header } from '../components/Header';

export abstract class BasePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  /**
   * Waits for DOMContentLoaded only: the `load` event depends on dozens of third-party scripts
   * and can take over a minute. Each page then waits for its own readiness signal.
   */
  protected async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }
}
