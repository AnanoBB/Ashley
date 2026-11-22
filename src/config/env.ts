import 'dotenv/config';

export const USER_AGENT = process.env.USER_AGENT ?? 'E2EUI-Tests-Brands-CI';

export const env = {
  apiUrl: process.env.API_URL ?? 'https://api.qa-env.residenthome.com',
  baseUrl: process.env.BASE_URL ?? 'https://qa.awarasleep.com',
  isCI: Boolean(process.env.CI),
} as const;
