# Project: QA Automation Home Assignment – Playwright + TypeScript

## Assignment (original requirements)

### 1. UI test
- Use `E2EUI-Tests` as the User-Agent.
- Steps:
  1. Open https://qa.awarasleep.com/ → check that the page opens.
  2. Click the "Shop mattress" button on the Hero Banner → check we are on `/mattress`.
  3. Add the mattress to the cart → check the mattress has been added to the cart.

### 2. API test
- Base URL: https://api.qa-env.residenthome.com
- GET operations around the products flow:
  1. `/products?brand=awara` → `status.result.data` length > 0
  2. `/products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` → `status.result.data` length = 1
- For each step, check the response status is 200.

### 3. Additional
1. Code in a GitHub repository.
2. README.md with clear instructions for running the tests.
3. A simple tool for presenting test results (Allure).
4. CI/CD with GitHub Actions: run tests on each commit; upload test artifacts (plus).

## Current phase
**Phase 1: API only.** Framework skeleton, API tests, Allure reporting, CI for the `api` project.
Do NOT create UI tests or page objects yet. Phase 2 (UI) comes later.

## Tech stack
- Playwright Test + TypeScript, Node 20+
- dotenv for config, zod for response schema validation
- allure-playwright for reporting (plus Playwright HTML report)
- ESLint (flat config, typescript-eslint) + Prettier

## Project structure
```
src/
  api/            # API clients (one class per resource), extend BaseApi
  api/schemas/    # zod schemas + inferred TS types
  fixtures/       # custom Playwright fixtures (test, expect exported from here)
  config/         # env/config helpers
  pages/          # (phase 2) page objects
tests/
  api/            # API specs
  ui/             # (phase 2) UI specs
```

## Conventions
- Import `test` and `expect` from `src/fixtures`, never directly from `@playwright/test` in specs.
- API clients return the raw `APIResponse`; tests do the assertions. Keep clients thin and typed.
- Every API test: assert status 200 first, then validate the body with the zod schema, then the
  assignment-specific assertion (data length).
- Verify the real response shape (e.g. with curl) before writing schemas. Don't guess the path to
  `data`. The assignment writes it as `status.result.data`.
- Use `test.step()` for each assignment step so they show up in Allure/HTML reports.
- Tag tests: `@api`, `@smoke`.
- User-Agent `E2EUI-Tests` is set globally in `playwright.config.ts` (`use.userAgent`).
- Base URLs come from env vars (`API_URL`, `BASE_URL`) with the assignment URLs as defaults.
- No hard waits, no secrets in code, no commented-out code.
- Never weaken or change an assertion just to make a test pass. If a test fails, report whether it is
  a test problem or a real bug.

## Commands
- `npm run lint` – ESLint
- `npm test` – all tests
- `npm run test:api` – API project only
- `npm run allure:generate` / `npm run allure:open` – Allure report
- After any code change: run lint and the relevant tests before saying you're done.

## Git
- Conventional commits (`chore:`, `test:`, `ci:`, `docs:`).
- One logical change per commit.
