# Awara QA Automation

[![CI](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AnanoBB/Ashley/actions/workflows/ci.yml)

Automated tests for the **Awara** mattress store (QA environment): its **products API** and its
**website** (home page → product page → cart). Built with **Playwright + TypeScript**, reported with
**Allure**, and run by **GitHub Actions** on every push and every night.

**Latest test report:** https://ananobb.github.io/Ashley/ (updated after every push to `main` and
every nightly run)

## Overview

| Part     | Requirement                                                                                                                                                             | Where                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| UI test  | Open the site → click "Shop mattress" in the hero banner → check we're on `/mattress` → add the mattress to the cart → check it's in the cart. User-Agent `E2EUI-Tests` | `tests/ui/`           |
| API test | `GET /products?brand=awara` returns data; `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns exactly 1 item; every response is 200           | `tests/api/`          |
| Extras   | GitHub repo, README, a test report tool (Allure), CI on every commit with artifacts                                                                                     | this repo, `.github/` |

Three things differ from the assignment text, each checked against the real systems:

1. **Website address:** `qa.awaraslep.com` doesn't exist (typo); the real one is
   `https://qa.awarasleep.com`.
2. **API User-Agent:** the website gets `E2EUI-Tests` as asked, but Cloudflare blocks it on
   `api.qa-env.residenthome.com` (403), so the API tests use `E2EUI-Tests-Brands-CI`
   ([User-Agent](#user-agent)).
3. **Response path:** the real body is `{ "status": "ok", "result": { "data": [...] } }`. `status` is
   a string next to `result`, so the tests check `status === "ok"` and read `result.data`.

## Tech stack

Playwright Test + TypeScript · zod (response schemas) · Allure 3 (Node CLI, no Java) · ESLint
(type-aware) + Prettier · dotenv · GitHub Actions + GitHub Pages · Docker (official Playwright image).

## Quick start

You need **Node.js 22 or newer** (`node -v`).

```bash
git clone https://github.com/AnanoBB/Ashley.git
cd Ashley
npm ci                                        # install dependencies
npx playwright install --with-deps chromium   # browser for UI tests (Linux: may ask for sudo)
npm run test:smoke                            # exactly the assignment: 5 tests, about 1 min
```

Then open a report: `npm run report:html` (Playwright) or `npm run allure:generate && npm run allure:open`
(Allure). No `.env` is needed; to override a setting, `cp .env.example .env`
([variables](#environment-variables)).

**Or with Docker** (no Node or browser on your machine, the same image as CI): `npm run test:docker`
([details](docs/development.md#running-in-docker)).

## What is tested

**35 tests: 14 API + 21 UI.** Each test name starts with an ID (`API-01`, `UI-13`), so you can find
it in the reports and run it alone. All cases, with priorities, are in
[docs/test-plan.md](docs/test-plan.md).

| Tag                | Meaning                                   | Count |
| ------------------ | ----------------------------------------- | ----- |
| `@smoke`           | The assignment itself                     | 5     |
| `@regression`      | Everything beyond the assignment          | 30    |
| `@negative`        | Bad input and failure handling            | 7     |
| `@known-bug`       | Checks a known site bug, expected to fail | 3     |
| `@quarantine`      | Skipped, with the reason in the report    | 1     |
| `@api`, `@ui`      | Layer                                     | 14/21 |
| `@cart`, `@header` | UI feature area                           | 7/10  |

| Area                            | Tests                                                                                                                                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API, assignment** (`@smoke`)  | API-01 brand list: 200, not empty, every product is `awara`. API-02 name query: 200, exactly 1 product, and it is `the-awara-hybrid-mattress-30`                                                                                                                        |
| **API, filters**                | API-03 unknown brand → 400. API-04 unknown name → empty. API-05 name without brand → 400. API-06 `lang` has no effect. API-07a/b brand ignores case, name doesn't. API-08 name result = its brand-list entry                                                            |
| **API, negative**               | API-09 no parameters → 400. API-10 empty brand → 400. API-11 ×3 SQL-like, 3000-char or empty name → 200 and empty, never 5xx                                                                                                                                            |
| **UI, assignment** (`@smoke`)   | UI-01 home page opens (HTTP 200, title, hero, logo). UI-03 hero "Shop Mattress" opens a mattress page. UI-13 the whole flow, below                                                                                                                                      |
| **UI, header and product page** | UI-02 hero goes to exactly `/mattress` (known bug). UI-05…08 mega menu, cards, prices, "Shop All". UI-09 header link (known bug). UI-28 the menu opens on the first hover (quarantined, bug #31). UI-12 default size and price. UI-16 a different size reaches the cart |
| **UI, cart and errors**         | UI-21 cart survives a reload. UI-22 a new browser starts with an empty cart. UI-25 unknown URL → 404 page. UI-26 a failed add-to-cart (stubbed 500) leaves the cart empty. UI-27 a size picked before the price quote stays selected (known bug)                        |

Every API test checks **status → `Content-Type: application/json` → zod schema**, then its own
assertions. UI-13 checks "added to the cart" three ways: the add-to-cart API call (200, schema,
1 item), the cart line (name, size, price, quantity, total) and the header counter.

- **"Check we are on `/mattress`":** the hero button really goes to
  `/mattresses/essential-latex-hybrid-mattress`, so the smoke tests accept `/mattress` or
  `/mattresses/…` (not e.g. `/mattress-protector`). The exact path `/mattress` is a _different_
  product, so that check is its own test, UI-02, marked as a known bug.
- **Expected prices** come from the storefront's own catalog API (`/api/catalog/products`), the
  source the page renders from. The UI tests therefore catch display and cart bugs, not wrong prices
  in the catalog itself.
- **Expected to fail:** UI-02, UI-09 and UI-27 check real site bugs with `test.fail()`. They pass while the
  bug exists (a ✘ in the terminal is normal) and turn red when it's fixed. In Allure they show red
  under **Known product bugs**, so they're never hidden among the passes, while CI stays green.

## Running tests

| Command                                   | What it runs                                        |
| ----------------------------------------- | --------------------------------------------------- |
| `npm test`                                | Everything (35 tests, about 4 min)                  |
| `npm run test:smoke`                      | The assignment only (5 tests)                       |
| `npm run test:api` / `npm run test:ui`    | One layer (API takes about 5 s)                     |
| `npm run test:ui -- --headed --workers=1` | UI tests in a visible browser, one at a time        |
| `npx playwright test -g "UI-13"`          | One test, by ID or part of its name                 |
| `npx playwright test --grep @negative`    | By tag                                              |
| `npx playwright test --ui`                | Playwright's UI mode: pick tests, step through them |
| `npm run test:docker -- --project=api`    | In the CI Docker image; any Playwright option works |
| `npm run lint` / `npm run lint:fix`       | ESLint + Prettier check / fix                       |
| `npm run typecheck`                       | TypeScript check                                    |
| `npm run check:playwright-image`          | Docker image tag matches the installed Playwright   |
| `npm run test:scripts`                    | Unit tests of the report scripts (`scripts/`)       |

Locally there are no retries, so a full run against the shared QA site can show a few failures that
come from the site, not the tests: a size reset by bug #30 (the message names it) or a slow page.
CI retries once and lists those as flaky.

### Environment variables

All optional. Put them in a `.env` file (copy `.env.example`) or in front of a command.

| Variable         | Default                               | Used by                                     |
| ---------------- | ------------------------------------- | ------------------------------------------- |
| `BASE_URL`       | `https://qa.awarasleep.com`           | Website under test                          |
| `API_URL`        | `https://api.qa-env.residenthome.com` | API under test                              |
| `UI_USER_AGENT`  | `E2EUI-Tests`                         | The browser and the storefront catalog call |
| `API_USER_AGENT` | `E2EUI-Tests-Brands-CI`               | The API tests                               |

## Reports

| Report              | How to open                                                                                                    | Best for                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Allure**          | `npm run allure:generate`, then `npm run allure:open`; or the [live report](https://ananobb.github.io/Ashley/) | Overview, steps, history, `known bug` / `finding` notes   |
| **Playwright HTML** | `npm run report:html`                                                                                          | One failure: error, screenshot, video, trace              |
| **Trace viewer**    | `npx playwright show-trace test-results/<test>/trace.zip`                                                      | Replaying a failed UI test action by action, with network |

Allure's **Environment** panel shows the URLs, both User-Agents, the browser and Node. Each API
check attaches the request URL and the raw response (status, headers, body), so a failure shows
what the API sent. Before
generating, `scripts/mark-known-bugs.mjs` turns `@known-bug` expected failures red ("Known product
bugs"). If such a test fails for another reason than the bug (say, a broken locator), it is shown
as broken instead, so a test problem never passes as the known bug. Local Allure results add up
across runs until you delete `allure-results/`.

## CI/CD

`.github/workflows/ci.yml` runs on **every push to any branch**, nightly at 03:00 UTC on `main`, on
fork pull requests, and manually (`gh workflow run ci.yml --ref <branch> -f project=ui -f grep=@smoke`).

```
lint ──► test (api) ──┐
     └─► test (ui) ───┴─► report ──► publish-report (main and nightly only)
```

- **lint:** ESLint (no warnings allowed), Prettier, TypeScript, the Docker image tag check and the
  report-script tests. Tests run only if it passes.
- **test:** API and UI in parallel, in the official Playwright Docker image (the same one the
  `Dockerfile` uses). 2 workers; 1 retry (none locally), and a pass on retry is reported as **flaky**. A
  `@known-bug` test that fails for another reason than its bug fails the job.
- **report:** merges both projects into one Allure report with history and writes a pass / fail /
  flaky / known-bug table to the run's **Summary** tab.
- **publish-report:** puts the report on [GitHub Pages](https://ananobb.github.io/Ashley/).

**Artifacts** (run page → Artifacts, kept 14 days): `allure-report`, `allure-results-{api,ui}`,
`playwright-report-{api,ui}` and `test-results-{api,ui}` (traces, videos and screenshots; only
when a test left some). Uploaded even when tests fail. Triggers, concurrency and history are
described in [docs/ci.md](docs/ci.md).

## Project structure

```
.github/workflows/ci.yml   CI pipeline          playwright.config.ts  projects, User-Agents, reporters
allurerc.mjs               Allure categories    .env.example          optional settings
Dockerfile                 local Docker runs    scripts/              CI summary, known-bug marking, image check, their tests

src/config/env.ts          URLs and User-Agents, from env vars with defaults
src/api/, api/schemas/     API clients (return the raw response) and zod schemas
src/pages/, components/    Page objects: Home, Product, Cart, Mattresses, NotFound; Header, popups
src/fixtures/              Page objects, API clients and catalog prices for tests; knownBug()
src/data/mattresses.ts     The 3 mattresses (routes, test ids), prices loaded from the catalog API

tests/api/                 products.spec (API-01, 02, 08), -filters (03…07), -negative (09…11), support.ts
tests/ui/                  home.spec (UI-01…03, 25), header-mattresses (05…09, 28), cart (12…27)
docs/                      exploration, test plan, API overview, CI details, development notes
```

## Design decisions

| Decision                                                                         | Why                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checked the real responses before writing schemas                                | That's how the `result.data` path, the User-Agent block and the host typo were found                                                                                                                            |
| Page objects + fixtures; specs import `test` / `expect` only from `src/fixtures` | Specs read like the test plan and hold the assertions; selectors live in one place (ESLint enforces it)                                                                                                         |
| Locators by role / label / test id, no XPath                                     | They read like the page and survive layout changes                                                                                                                                                              |
| Unexpected API behaviour: assert what it does, add a `finding` note              | The behaviour is documented and guarded; a deliberately red test would just be noise                                                                                                                            |
| Known site bugs: keep the strict assertion, mark `test.fail()` + `knownBug()`    | The bug stays visible (red in Allure) without failing CI; any other failure fails CI                                                                                                                            |
| Popups: block Dynamic Yield scripts, pre-set the cookie consent, handle the rest | They appear at random times and steal clicks; tests stay about behaviour                                                                                                                                        |
| No fixed sleeps; waits on conditions, with long timeouts only for slow loads     | The QA site's buy box and menu can take 20 s or more; waits end as soon as the condition is true                                                                                                                |
| One action per step, no click or hover retry loops                               | A click or hover the site ignores, or a choice it resets, is a bug: the test fails and names it. One exception: the menu-content tests hover again, because the menu ignores early hovers (bug #31, documented) |
| 2 workers; 1 retry in CI, none locally                                           | The shared QA site times out with 3 browsers. A CI retry shows up as flaky; locally, flakiness fails                                                                                                            |
| Tests are not retried until green                                                | A test made unstable by the test itself is fixed or removed. One made unstable by a site bug stays and names the bug (UI-07 and UI-16 hit #30 about 1 run in 10)                                                |
| CI and local Docker use the same Playwright image                                | Same OS, browser and fonts; a CI-only failure can be reproduced on any machine                                                                                                                                  |

## Findings

| #   | Finding                                                                                                                    | Evidence                   |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Hero "Shop Mattress" goes to `/mattresses/essential-latex-hybrid-mattress`; `/mattress` is another product (spec question) | UI-02, exploration #1      |
| 2   | Header "Mattresses" opens `/mattress` (one product) instead of the `/mattresses` listing (spec question)                   | UI-09, exploration #13     |
| 3   | A failed add-to-cart shows no error: the click silently does nothing                                                       | UI-26, exploration #29     |
| 4   | Cart: the protection-plan dialog opens a few seconds after landing and can swallow a click made at that moment             | exploration: Cart, step 5  |
| 5   | Cart: an item removed while the auto-coupon is applied can reappear on the page although the server deleted it             | exploration #26            |
| 6   | API: `brand` is required, even with `name` (400 "missed brand values")                                                     | API-05                     |
| 7   | API: `lang` has no effect; `es`, `fr` and invalid values return the same body as `en`                                      | API-06                     |
| 8   | API: `brand=AWARA` works, an uppercase `name` finds nothing; an empty `name` matches nothing instead of being ignored      | API-07b, API-11            |
| 9   | API: lists are capped at 200 items while `total_count` can be higher (brand `nectar`: 1025)                                | API-07a, API-08 skip if so |
| 10  | Product page: a size picked before the price quote arrives is reset to Queen                                               | UI-27, exploration #30     |
| 11  | Header: the menu ignores hovers for 3–9 s after the page appears                                                           | exploration #31            |

Findings 4 and 5 made the cart "+" and "remove" tests fail at random, so those tests were left out
rather than retried until green. [docs/exploration.md](docs/exploration.md) lists 31 possible issues
(broken images, inconsistent prices, accessibility and more).

## User-Agent

The assignment asks for `E2EUI-Tests`, and the browser sends exactly that. On
`api.qa-env.residenthome.com`, Cloudflare answers it with **403 (an HTML block page)**, so the API
tests would fail on the status check. The company provided **`E2EUI-Tests-Brands-CI`** for the API
tests; with it the API returns 200 JSON and the assertions are unchanged. To see the block:
`API_USER_AGENT=E2EUI-Tests npm run test:api` (expect 403 failures).

## AI usage

This project was built with **Claude Code** (Anthropic's AI coding assistant) as a pair programmer:
exploring the site (Playwright MCP), writing tests, page objects and the CI pipeline, analysing
failure traces, and drafting docs.

How the output was checked:

- Every change was linted, type-checked and run before it was committed; CI runs on every push.
- API response shapes and URLs were checked against the real services before any schema was written.
- Flaky failures were investigated in traces (actions, network calls, screenshots) before deciding
  on a fix; tests that couldn't be made stable were removed, not retried.

## What I'd add next

- Stable cart tests for quantity and remove: set up the cart through the API (bound to the browser's
  cart token) and wait until the cart page has finished loading before interacting.
- More browsers (Firefox, WebKit) and a mobile viewport, once they're stable on the QA site.
- Contract tests for the cart API.
- A nightly summary posted to a team channel (Slack or a GitHub issue).
