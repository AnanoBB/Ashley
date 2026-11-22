# Awara QA Automation

QA automation home assignment built with **Playwright Test + TypeScript**, with **Allure** reporting
and **GitHub Actions** CI.

> **Current phase: 1 (API).** The UI tests will be added in phase 2.

## What is tested

API base URL: `https://api.qa-env.residenthome.com`. All requests send the User-Agent `E2EUI-Tests`.

| #   | Request                                                               | Assertions                                                  |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `GET /products?brand=awara`                                           | status 200, body matches schema, `result.data.length > 0`   |
| 2   | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` | status 200, body matches schema, `result.data.length === 1` |

> **About the response path:** the assignment calls it `status.result.data`. The real response is
> `{ "status": "ok", "result": { "total_count", "count_by_category", "data": [...] } }`, so `status` is
> a string next to `result`. The tests assert `status === "ok"` (in the schema) and check
> `result.data`.

## Prerequisites

- Node.js **20+** (`node -v`)
- Java is **not** required. The Allure 3 CLI is a Node package.

## Setup

```bash
npm ci
cp .env.example .env   # optional: override API_URL / BASE_URL
```

## Running tests

| Command                             | What it does                    |
| ----------------------------------- | ------------------------------- |
| `npm test`                          | Run all tests                   |
| `npm run test:api`                  | Run the API project only        |
| `npm run test:ui`                   | Run the UI project only         |
| `npx playwright test --grep @api`   | Run tests tagged `@api`         |
| `npx playwright test --grep @ui`    | Run tests tagged `@ui`          |
| `npx playwright test --grep @smoke` | Run `@smoke` tests (API and UI) |
| `npm run test:ui -- --grep @smoke`  | Run only the UI `@smoke` tests  |
| `npm run lint`                      | ESLint + Prettier check         |
| `npm run typecheck`                 | TypeScript type check           |

Tags: `@api` and `@ui` by layer; `@smoke` and `@regression` by depth; `@cart` and `@header` by
feature.

## Reports

- **Allure:** `npm run allure:generate`, then `npm run allure:open`
- **Playwright HTML:** `npm run report:html`

Each assignment step is a `test.step()`, so the steps show up in both reports.

## CI

`.github/workflows/ci.yml` runs on every push (any branch), on pull requests from forks, and on
manual dispatch. It runs lint and the type check, then the API and UI tests (Chromium) in one run,
then generates the Allure report. The Allure report, the Playwright HTML report and the raw results are uploaded as build artifacts
(Actions run → **Artifacts**).

- A newer commit on the same branch cancels the run still in progress.
- On pushes to `main`, the Allure report is also published to GitHub Pages, even when tests fail:
  https://ananobb.github.io/Ashley/. One-time setup: **Settings → Pages → Source: GitHub Actions**.

## Project structure

```
src/
  api/            API clients (one class per resource, extending BaseApi)
  api/schemas/    zod response schemas + inferred types
  config/         env/config (API_URL, BASE_URL, User-Agent)
  fixtures/       custom Playwright fixtures — specs import test/expect from here
tests/
  api/            API specs
```

## Known environment issue

As of 2026-11-21, Cloudflare in front of `api.qa-env.residenthome.com` returns **403 (HTML block
page)** to non-browser clients (curl, Playwright's request context), whatever the User-Agent is. A
browser on the same network gets JSON. When this happens, the tests fail on the status-200 check.
That is an environment/WAF block, not a test defect. It is fixed by allowing the `E2EUI-Tests`
User-Agent (or the runner IPs) in Cloudflare.
