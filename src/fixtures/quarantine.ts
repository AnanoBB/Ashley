import type { TestDetails } from '@playwright/test';

/**
 * Details for a test that a site bug makes fail at random (use with `test(title, details, body)`):
 * the `@quarantine` tag and the reason. The `quarantineGate` fixture skips it as fixme, unless
 * RUN_QUARANTINED=1; the CI summary lists it with the reason.
 */
export function quarantine(reason: string): TestDetails {
  return {
    tag: '@quarantine',
    annotation: { type: 'quarantine', description: reason },
  };
}
