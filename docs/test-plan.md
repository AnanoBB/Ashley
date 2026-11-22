# Test plan: Awara QA home assignment

> Draft, 2026-11-21. Based on the assignment in `CLAUDE.md`, the API check in `docs/api-overview.md`
> and the UI exploration in `docs/exploration.md` (bug numbers like **#1** refer to that file).

## 1. Goal

Prove that the core purchase path for a mattress works, and that the products API behind it returns
correct data. The assignment's 3 UI steps and 2 API calls are the minimum. Around them, add a small,
realistic set of checks for the mattress-related header navigation and API edge cases. These are the
first slice of a regression suite that can grow later.

## 2. Scope

| Area                        | What is covered                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API: products**           | `GET /products` by brand and by name: status, response schema (`{ status, result: { total_count, data } }`), result counts, key field values, and a few negative/edge filters. |
| **UI: home page**           | The page opens, the hero banner renders, and "Shop Mattress" navigates correctly.                                                                                              |
| **UI: mattress PDP**        | The right product opens, the default size and price show, and a different size can be selected.                                                                                |
| **UI: add to cart**         | The upsell popup is handled, the item is added (API call + header counter), and the cart shows the right name, size, price, quantity and total.                                |
| **UI: header (mattresses)** | The mattress mega menu (3 product cards, "Shop All Mattresses"), the top-level "Mattresses" link, the logo and the cart icon.                                                  |
| **Cross-cutting**           | User-Agent `E2EUI-Tests` on every request, overlays (cookie banner, promo popup) handled centrally, Allure + HTML reports, CI on every push.                                   |

**Environment:** QA only: UI `https://qa.awarasleep.com`, API `https://api.qa-env.residenthome.com`.
**Browser:** desktop Chromium 1440×900 (the viewport the exploration used).

## 3. Out of scope

| Item                                                                    | Reason                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout, payment (card, PayPal, Amazon Pay, Affirm), order placement   | Not in the assignment. It would also create real orders and payment calls in a shared QA environment.                                  |
| My Account / login / registration                                       | Not in the assignment, and no test credentials were provided.                                                                          |
| Bundles, bed frames, bedding, accessories                               | The assignment is about mattresses. The framework supports them later (data-driven product catalog).                                   |
| Mobile and tablet layouts, Firefox and WebKit                           | Time-boxed home assignment. Exploration showed separate responsive layouts, so this is the first thing to add next.                    |
| Cart API write endpoints (`POST /carts/my/items`, etc.) as API tests    | The API host is behind a Cloudflare block for scripted clients (see §6). The add-to-cart call is verified through the UI test instead. |
| Performance, load and security testing                                  | Needs dedicated tooling and the environment owner's permission. Load would also trip Cloudflare and DataDome bot protection.           |
| Full accessibility audit                                                | Out of time budget. The a11y findings from exploration are reported as bugs (#9, #15, #21, #23) rather than automated.                 |
| Visual regression (screenshots)                                         | Marketing content changes often (promos, countdowns, A/B tests through Dynamic Yield), so snapshots would be unstable.                 |
| Third-party widgets (Intercom chat, UserWay, Extend protection content) | Owned by vendors. We only make sure they don't block the flow.                                                                         |
| Pricing correctness against business rules                              | No pricing spec is available. Price checks assert UI/API consistency (the same price on PDP, cart and API), not the "right" price.     |

## 4. Approach

- **Layers:** API tests use Playwright's `request` fixture and zod schemas. UI tests use page objects
  plus shared component objects (Header, CookieBanner, PromoModal, UpsellModal).
- **Order of assertions (API):** status 200, then the schema, then the business rule.
- **Overlays:** handled once with `page.addLocatorHandler()` and a pre-set cookie consent, never with
  sleeps.
- **Locators:** prefer test IDs and role-based locators, as documented in `docs/exploration.md`. No CSS
  classes (MUI hashes them).
- **Test isolation:** a fresh browser context per test, because the cart is stored on the server and
  tied to cookies.
- **Known bugs:** a test that hits a documented bug is marked `test.fail()` with an annotation pointing
  to the bug, so the report shows "known issue", not just "red". Assertions are never weakened to pass.
- **Tags:** `@api`/`@ui`, `@smoke`/`@regression`, plus area tags (`@mattress`, `@header`, `@cart`).

## 5. Test cases

Priority: **P1** = assignment requirement or core purchase path · **P2** = important regression ·
**P3** = nice to have.

### API

| ID     | Layer | Title                                                                                                                                                 | Type     | Priority | Notes                                                         |
| ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------- |
| API-01 | API   | `GET /products?brand=awara` returns 200 and `result.data.length > 0`                                                                                  | Positive | P1       | Assignment step 1. Currently blocked by Cloudflare (403).     |
| API-02 | API   | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns 200 and exactly 1 item                                                  | Positive | P1       | Assignment step 2. Currently blocked by Cloudflare (403).     |
| API-03 | API   | Brand list response matches the products schema (envelope + required product fields)                                                                  | Positive | P1       | Part of API-01's checks                                       |
| API-04 | API   | Every product in the brand list has `brand === "awara"`                                                                                               | Positive | P2       |                                                               |
| API-05 | API   | `result.total_count` equals `result.data.length`                                                                                                      | Positive | P2       | Seen in both samples. Confirm there's no pagination.          |
| API-06 | API   | The product found by name has `name === "the-awara-hybrid-mattress-30"`, title "Awara Classic Hybrid Mattress", and a positive `pricing.price.amount` | Positive | P2       |                                                               |
| API-07 | API   | Unknown product name (`name=does-not-exist&brand=awara`) returns 200 with an empty `result.data`                                                      | Negative | P2       | Expected behavior not observed yet. Confirm on the first run. |
| API-08 | API   | Unknown brand (`brand=unknown-brand`) returns 200 with empty data or a 4xx, never 5xx                                                                 | Negative | P3       | Expected behavior not observed yet.                           |
| API-09 | API   | Missing `brand` parameter: the response is handled (no 5xx), behavior documented                                                                      | Edge     | P3       | Exploratory: records actual behavior                          |
| API-10 | API   | Name lookup is exact: a partial name (`the-awara-hybrid`) does not return the full product                                                            | Edge     | P3       |                                                               |
| API-11 | API   | Requests send `User-Agent: E2EUI-Tests` (checked through the request trace / echo)                                                                    | Edge     | P3       | Guards the global config                                      |

### UI: home and navigation

| ID    | Layer | Title                                                                                                    | Type     | Priority | Notes                                                                                                                |
| ----- | ----- | -------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| UI-01 | UI    | Home page opens: URL `/`, title present, hero h1 visible                                                 | Positive | P1       | Assignment step 1                                                                                                    |
| UI-02 | UI    | Clicking hero "Shop Mattress" opens `/mattress`                                                          | Positive | P1       | Assignment step 2. **Known bug #1**: it goes to `/mattresses/essential-latex-hybrid-mattress`. Marked `test.fail()`. |
| UI-03 | UI    | Hero "Shop Mattress" opens a mattress product page (h1 contains "Mattress", Add to Cart visible)         | Positive | P1       | Proves the click works regardless of bug #1                                                                          |
| UI-04 | UI    | The cookie banner and promo popup don't block the flow (handled automatically)                           | Edge     | P1       | Delayed overlays (~seconds and ~16 s)                                                                                |
| UI-05 | UI    | Header "Mattresses" hover opens the mega menu with 3 cards: Essential, Classic, Premier                  | Positive | P2       |                                                                                                                      |
| UI-06 | UI    | Each mega menu card opens the matching product page (h1 = card name)                                     | Positive | P2       | Data-driven ×3                                                                                                       |
| UI-07 | UI    | The "from" price on each mega menu card ($499+/$599+/$749+) equals the cheapest size on its product page | Positive | P2       | Data-driven ×3                                                                                                       |
| UI-08 | UI    | "Shop All Mattresses" opens `/mattresses` and lists all 3 mattresses                                     | Positive | P2       |                                                                                                                      |
| UI-09 | UI    | Header "Mattresses" link opens the mattress listing                                                      | Negative | P2       | **Known bug #13**: it opens a single product. Marked `test.fail()`.                                                  |
| UI-10 | UI    | The logo returns to the home page from a product page                                                    | Positive | P3       |                                                                                                                      |
| UI-11 | UI    | The product page `<title>` matches its h1 (all 3 mattresses)                                             | Edge     | P3       | **Known bug #22** (Premier)                                                                                          |

### UI: product page and cart

| ID    | Layer | Title                                                                                                                           | Type     | Priority | Notes                                                                         |
| ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------------- |
| UI-12 | UI    | The product page shows the default size Queen with a price and an enabled Add to Cart                                           | Positive | P1       |                                                                               |
| UI-13 | UI    | Add to Cart (default size) → dismiss the upsell → item added: `POST /carts/my/items` returns 200 and the header counter shows 1 | Positive | P1       | Assignment step 3                                                             |
| UI-14 | UI    | The cart shows exactly 1 line item with the right product name, "Size: Queen", price and quantity 1                             | Positive | P1       | Assignment step 3                                                             |
| UI-15 | UI    | The cart total equals the product page price for the chosen size                                                                | Positive | P1       | Consistency between product page and cart                                     |
| UI-16 | UI    | Choosing another size (e.g. King) updates the price, and the cart shows that size and price                                     | Positive | P2       |                                                                               |
| UI-17 | UI    | Upsell "Upgrade Now" path: the cart contains the upgraded product/price (not the base one)                                      | Positive | P3       | Upsell is driven by A/B testing (Dynamic Yield), so skip if it doesn't appear |
| UI-18 | UI    | Adding the same mattress twice gives 1 line item with quantity 2 (or 2 items), and the counter matches the cart                 | Edge     | P2       | Documents the merge behavior                                                  |
| UI-19 | UI    | Increasing quantity in the cart (+) updates the line total and order total                                                      | Positive | P2       |                                                                               |
| UI-20 | UI    | Removing the item (trash at qty 1) empties the cart and the counter disappears or shows 0                                       | Positive | P2       |                                                                               |
| UI-21 | UI    | Reloading the cart page keeps the item (it's stored on the server)                                                              | Edge     | P2       |                                                                               |
| UI-22 | UI    | A new browser context starts with an empty cart (test isolation)                                                                | Edge     | P2       | Guards against leaks between tests                                            |
| UI-23 | UI    | Dismissing the cart-page "Extend" protection popup doesn't add protection to the cart                                           | Negative | P3       |                                                                               |
| UI-24 | UI    | Going straight to `/checkout/cart` with an empty cart shows an empty-cart state, not an error                                   | Negative | P3       |                                                                               |

**Total: 35 cases.** 11 are P1 (the assignment plus the core path), 15 are P2 and 9 are P3. For this
assignment, the plan is to automate all P1 cases, then P2 as time allows. P3 cases are a backlog.

## 6. Risks and known issues

| Risk / issue                                                                                                                              | Impact                                  | Mitigation                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **The API host is blocked by Cloudflare for scripted clients** (every path returns 403 regardless of User-Agent; a real browser gets 200) | API-01…11 fail with 403                 | Report it as an environment defect with evidence (Ray IDs). Ask the owner to allow UA `E2EUI-Tests`. Keep the assertions unchanged. |
| **The assignment URL has a typo** (`qa.awaraslep.com` doesn't exist)                                                                      | Nothing runs against the documented URL | Use `qa.awarasleep.com` (configurable via `BASE_URL`). Noted in the README.                                                         |
| **The hero "Shop Mattress" goes to the wrong URL** (bug #1)                                                                               | UI-02 fails                             | `test.fail()` with an annotation. UI-03 still covers the navigation.                                                                |
| Delayed overlays (cookie banner, promo popup, upsell popups)                                                                              | Flaky clicks                            | Central `addLocatorHandler()` handlers and a pre-set consent cookie.                                                                |
| A/B tests and promo changes (Dynamic Yield, countdowns)                                                                                   | Copy and popups vary                    | Never assert marketing text or timers. Make the upsell handling optional.                                                           |
| Duplicate hidden DOM (responsive copies, a hidden inert nav)                                                                              | Strict-mode locator errors              | Scoped locators from `docs/exploration.md`. Ask devs for missing test IDs.                                                          |
| Bot protection (DataDome) during parallel CI runs                                                                                         | Random blocks                           | Limit workers in CI, and retry ×2 only in CI.                                                                                       |
| Shared QA environment, with the cart stored on the server                                                                                 | Data leaks between tests                | A fresh context per test. No checkout, so no orders are created.                                                                    |

## 7. Entry and exit criteria

- **Entry:** the QA environment is reachable, and the API is reachable for scripted clients (still open, see §6).
- **Exit:** every P1 case is automated and either passing or marked as a known defect with evidence,
  lint and the type check pass, CI is green on `main`, and the Allure report is generated and uploaded.

## 8. Deliverables

- Automated tests in `tests/api` and `tests/ui`, runnable with `npm test` (README).
- Allure and Playwright HTML reports, uploaded as CI artifacts.
- `docs/exploration.md` (findings, locators, bugs), `docs/api-overview.md`, and this plan.
