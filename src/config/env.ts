import 'dotenv/config';

export const env = {
  apiUrl: process.env.API_URL || 'https://api.qa-env.residenthome.com',
  baseUrl: process.env.BASE_URL || 'https://qa.awarasleep.com',
  // The assignment's User-Agent, used by the browser and the storefront catalog calls.
  uiUserAgent: process.env.UI_USER_AGENT || 'E2EUI-Tests',
  // Cloudflare blocks `E2EUI-Tests` on the API host only (403); see README "User-Agent".
  apiUserAgent: process.env.API_USER_AGENT || 'E2EUI-Tests-Brands-CI',
  isCI: !!process.env.CI && process.env.CI !== 'false',
} as const;
