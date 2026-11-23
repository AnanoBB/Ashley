# Awara QA Automation

[![CI](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml)

Playwright + TypeScript tests for the **Awara** mattress store (QA environment): its **products API**
and its **website** (home page → product page → cart), reported with **Allure** and run by
**GitHub Actions** on every push and every night.

**Latest test report:** https://ananobb.github.io/Ashley/ (updated on every `main` run)

## The assignment

| Part   | What is checked                                                                                                                                   | Tests                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| UI     | With User-Agent `E2EUI-Tests`: open the site → click "Shop Mattress" in the hero → on a mattress page → add to cart → the mattress is in the cart | UI-01, UI-03, UI-13 (`@smoke`) |
| API    | `GET /products?brand=awara` returns 200 and data; `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns 200 and 1 item    | API-01, API-02 (`@smoke`)      |
| Extras | GitHub repo, this README, Allure report, CI on every commit with artifacts                                                                        | this repo, `.github/`          |

Three things differ from the assignment text, each checked against the real systems:

1. **Website address:** `qa.awaraslep.com` doesn't exist (typo); the real one is `https://qa.awarasleep.com`.
2. **API User-Agent:** Cloudflare blocks `E2EUI-Tests` on the API host (403 HTML page), so the API
   tests use `E2EUI-Tests-Brands-CI`, provided for this. The browser sends `E2EUI-Tests` as asked.
   To see the block: `API_USER_AGENT=E2EUI-Tests npm run test:api`.
3. **Response path:** the body is `{ "status": "ok", "result": { "data": [...] } }`, so the tests read
   `result.data` (the assignment writes `status.result.data`).

**"On /mattress":** the hero button opens `/mattresses/essential-latex-hybrid-mattress`, and the exact
path `/mattress` is a different product (bug #1). The assignment flow accepts `/mattress` or
`/mattresses/…`; UI-02 checks the exact path and is marked `test.fail()`: it passes while the bug
exists and turns red once it's fixed.

## Quick start

Requires **Node.js 22+**.

```bash
git clone https://github.com/AnanoBB/Ashley.git && cd Ashley
npm ci
npx playwright install --with-deps chromium
npm run test:smoke          # the assignment: 5 tests, about 1 min
npm run report:html         # or: npm run allure:generate && npm run allure:open
```

No `.env` is needed. To override `BASE_URL`, `API_URL`, `UI_USER_AGENT` or `API_USER_AGENT`, copy
`.env.example` to `.env`. With Docker instead of Node (the same image as CI): `npm run test:docker`.

| Command                                | What it runs                                       |
| -------------------------------------- | -------------------------------------------------- |
| `npm test`                             | Everything: 27 tests (14 API + 13 UI), about 2 min |
| `npm run test:smoke`                   | The assignment only (5 tests)                      |
| `npm run test:api` / `npm run test:ui` | One layer                                          |
| `npx playwright test -g "UI-13"`       | One test by ID; `--grep @negative` by tag          |
| `npm run test:docker -- --project=api` | In the CI Docker image                             |
| `npm run lint` / `npm run typecheck`   | ESLint + Prettier / TypeScript                     |

## What is tested

- **API (14):** the two assignment calls (API-01/02), filter behaviour (03–07), a name/brand-list
  consistency check (08) and bad input (09–11: missing, empty, unknown and odd values). Every test
  checks status → `Content-Type` → zod schema, then its own assertions, and attaches the response.
- **UI (13):** the assignment flow (UI-01/03/13), the exact hero path (UI-02, known bug #1), the
  mattresses mega menu (UI-05/06/08), the cart after a reload and in a new browser (UI-21/22), the
  404 page (UI-25) and a stubbed failing add-to-cart (UI-26).
- **"In the cart"** (UI-13) means: the add-to-cart API call answered 200 with 1 item, the cart line
  shows the name, size, price and quantity, the total matches, and the header counter shows 1.
  Expected prices come from the storefront's catalog API, not hard-coded.

Tags: `@api`/`@ui`, `@smoke` (assignment) / `@regression`, `@negative`, `@cart`/`@header`,
`@known-bug`. Every case, including the ones left out and why, is in
[docs/test-plan.md](docs/test-plan.md).

## Reports and CI

- **Allure:** `npm run allure:generate`, then `npm run allure:open`, or the
  [published report](https://ananobb.github.io/Ashley/) with history. **Playwright HTML:**
  `npm run report:html`, with screenshot, video and trace of a failed UI test.
- **CI** (`.github/workflows/ci.yml`) runs on every push, nightly at 03:00 UTC on `main`, and
  manually (`gh workflow run ci.yml --ref <branch>`):
  `lint` (ESLint, Prettier, TypeScript) → `test` (API and UI in parallel, in the official Playwright
  image that the `Dockerfile` also uses) → `report` (merged Allure) → `publish-report` (GitHub
  Pages, `main` only).
- **Artifacts** (run page → Artifacts, 14 days, uploaded even when tests fail): `allure-report`,
  `allure-results-{api,ui}`, `playwright-report-{api,ui}`, `test-results-{api,ui}` (traces, videos,
  screenshots).
- **Retries:** 1 in CI (a pass on retry shows as flaky), none locally. 2 workers: the shared QA site
  times out with more.

## Project structure

```
src/api/            API clients (return the raw response) and zod schemas
src/pages/          Page objects: Home, Product, Cart, Mattresses, NotFound
src/components/     Header (mega menu) and popup handlers
src/fixtures/       test/expect with page objects, API clients and catalog prices
src/data/           The 3 mattresses (routes, test ids); prices are loaded from the catalog API
tests/api/          products.spec (API-01, 02, 08), -filters (03–07), -negative (09–11), support.ts
tests/ui/           home.spec (UI-01–03, 25), header-mattresses (05–08), cart (13, 21, 22, 26)
docs/               exploration.md (site walkthrough, locators, bugs), test-plan.md
```

**Design decisions**

- Real responses were checked before writing schemas; that found the `result.data` path, the
  User-Agent block and the host typo.
- Specs hold the assertions; selectors live in page objects. Specs import `test`/`expect` only from
  `src/fixtures` (ESLint enforces it). Locators by role, label or test id, never XPath.
- Unexpected API behaviour is asserted as it is, with a `finding` annotation.
- Popups: Dynamic Yield scripts are blocked, the cookie consent is pre-set, and the protection-plan
  dialog is closed by a locator handler.
- No fixed sleeps, and no retry loops around clicks. A test made unstable by a site bug is left out
  and the bug documented, not retried until green.

## Findings

Numbers refer to [docs/exploration.md](docs/exploration.md#possible-bugs), which lists 32 issues.

| #   | Finding                                                                                                  | Evidence                                        |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | Hero "Shop Mattress" opens `/mattresses/essential-latex-hybrid-mattress`; `/mattress` is another product | UI-02 (`test.fail`)                             |
| 13  | Header "Mattresses" opens `/mattress` (one product), not the `/mattresses` listing                       | exploration                                     |
| 25  | Add to Cart sometimes succeeds (200) but the app never opens the cart                                    | UI-13 names it when it happens                  |
| 26  | Removing the last cart item sometimes doesn't update the cart page, although the server deleted it       | exploration                                     |
| 29  | A failed add-to-cart shows no error: the click silently does nothing                                     | UI-26                                           |
| 30  | A size picked before the price quote arrives is reset to Queen                                           | exploration (10/10 when the quote is held back) |
| 31  | The header menu ignores hovers for 3–9 s after the page appears                                          | exploration                                     |
| 32  | The product page sometimes shows no sizes for 45 s (unconfirmed)                                         | product-page tests name it when it happens      |

**API:** `brand` is required even with `name` (API-05); `lang` has no effect (API-06); `brand`
ignores case but `name` doesn't, and an empty `name` matches nothing (API-07b, API-11); lists are
capped at 200 items while `total_count` can be higher (`nectar`: 1025). `POST`/`PUT`/`DELETE` return
405 (not tested: only GET is in scope).

## Left out on purpose

- **Size changes, menu prices, cart quantity and remove:** site bugs #25, #26, #30 and #32 make
  these fail at random. They're in the test plan, not in the suite. Next step: reproduce each bug on
  purpose (e.g. hold the price quote back) and set up the cart through the API.
- **Firefox, WebKit, mobile viewports and cart API contract tests:** next, once the QA site is stable.

## AI usage

This project was built with **Claude Code** (Anthropic's AI coding assistant) as a pair programmer:
exploring the site (Playwright MCP), writing tests, page objects and the CI pipeline, analysing
failure traces, and drafting docs.

How the output was checked:

- Every change was linted, type-checked and run before it was committed; CI runs on every push.
- API response shapes and URLs were checked against the real services before any schema was written.
- Flaky failures were investigated in traces (actions, network calls, screenshots) before deciding
  on a fix; tests that couldn't be made stable were removed, not retried.
