const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  // Whole amounts without cents ("$1,199"), as the storefront shows them; cents are never rounded away.
  trailingZeroDisplay: 'stripIfInteger',
});

/** Formats an amount in cents the way the storefront shows it, e.g. 119900 -> "$1,199". */
export function formatUsd(cents: number): string {
  return usd.format(cents / 100);
}
