import { mergeTests } from '@playwright/test';
import { env } from '../config/env';
import { apiTest } from './api.fixtures';
import { uiTest } from './ui.fixtures';

export const test = mergeTests(apiTest, uiTest).extend<{ quarantineGate: void }>({
  // Skips @quarantine tests (as fixme, with their reason) unless RUN_QUARANTINED=1.
  quarantineGate: [
    async ({}, use, testInfo) => {
      if (testInfo.tags.includes('@quarantine') && !env.runQuarantined) {
        const reason = testInfo.annotations.find(({ type }) => type === 'quarantine')?.description;
        testInfo.fixme(true, `quarantined: ${reason ?? 'no reason given'}`);
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
export { knownBug } from './knownBug';
export { quarantine } from './quarantine';
