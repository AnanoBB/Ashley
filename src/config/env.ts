import 'dotenv/config';

export const USER_AGENT = 'E2EUI-Tests';

export const env = {
  apiUrl: process.env.API_URL ?? 'https://api.qa-env.residenthome.com',
  baseUrl: process.env.BASE_URL ?? 'https://qa.awarasleep.com',
  isCI: Boolean(process.env.CI),
  runQuarantined: process.env.RUN_QUARANTINED === 'true',
} as const;
