# Test plan: Awara QA home assignment

> Written 2026-11-21, updated 2026-11-22 to match what is automated. Based on the assignment in
> `CLAUDE.md`, the API notes in `docs/api-overview.md` and the UI exploration in
> `docs/exploration.md` (bug numbers like **#1** refer to that file).

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
| **Cross-cutting**           | User-Agent `E2EUI-Tests-Brands-CI` on every request, overlays (cookie banner, promo popup) handled centrally, Allure + HTML reports, CI on every push.                         |

**Environment:** QA only: UI `https://qa.awarasleep.com`, API `https://api.qa-env.residenthome.com`.
**Browser:** desktop Chromium 1440×900 (the viewport the exploration used).

## 3. Out of scope

| Item                                                                    | Reason                                                                                                                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout, payment (card, PayPal, Amazon Pay, Affirm), order placement   | Not in the assignment. It would also create real orders and payment calls in a shared QA environment.                                                                            |
| My Account / login / registration                                       | Not in the assignment, and no test credentials were provided.                                                                                                                    |
| Bundles, bed frames, bedding, accessories                               | The assignment is about mattresses. The framework supports them later (data-driven product catalog).                                                                             |
| Mobile and tablet layouts, Firefox and WebKit                           | Time-boxed home assignment. Exploration showed separate responsive layouts, so this is the first thing to add next.                                                              |
| Cart API write endpoints (`POST /carts/my/items`, etc.) as API tests    | Not in the assignment. The cart is tied to the browser's auth token, so API writes need that token to be reliable. The add-to-cart call is verified through the UI test instead. |
| Performance, load and security testing                                  | Needs dedicated tooling and the environment owner's permission. Load would also trip Cloudflare and DataDome bot protection.                                                     |
| Full accessibility audit                                                | Out of time budget. The a11y findings from exploration are reported as bugs (#9, #15, #21, #23) rather than automated.                                                           |
| Visual regression (screenshots)                                         | Marketing content changes often (promos, countdowns, A/B tests through Dynamic Yield), so snapshots would be unstable.                                                           |
| Third-party widgets (Intercom chat, UserWay, Extend protection content) | Owned by vendors. We only make sure they don't block the flow.                                                                                                                   |
| Pricing correctness against business rules                              | No pricing spec is available. Price checks assert UI/API consistency (the same price on PDP, cart and API), not the "right" price.                                               |

## 4. Approach

- **Layers:** API tests use Playwright's `request` fixture and zod schemas. UI tests use page objects
  plus a shared `Header` component; popups (cookie banner, promo, protection plan) are closed by
  handlers in `src/components/overlays.ts`, and the add-to-cart upsell by `ProductPage.addToCart()`.
- **Order of assertions (API):** status, then the Content-Type, then the schema, then the business
  rule.
- **Overlays:** handled once with `page.addLocatorHandler()` and a pre-set cookie consent, never with
  sleeps.
- **Locators:** prefer test IDs and role-based locators, as documented in `docs/exploration.md`. No CSS
  classes (MUI hashes them).
- **Test isolation:** a fresh browser context per test, because the cart is stored on the server and
  tied to the browser's auth token.
- **Known bugs:** a test that hits a documented bug is declared with `test.fail()` and tagged
  `@known-bug`, with a note pointing to the bug. CI stays green, and Allure shows it red under
  "Known product bugs". Assertions are never weakened to pass.
- **Tags:** `@api`/`@ui`, `@smoke`/`@regression`, area tags (`@header`, `@cart`), `@negative` and
  `@known-bug`.

## 5. Test cases

Priority: **P1** = assignment requirement or core purchase path · **P2** = important regression ·
**P3** = nice to have.

### API

All automated in `tests/api/` and checked against the real API on 2026-11-22. Every test checks the
status, a JSON `Content-Type` and the zod schema
(products or error) before its own assertions. Where
the API behaves differently from what we'd expect, the test asserts the actual behaviour and carries
a `finding` annotation.

| ID      | Layer | Title                                                                                                               | Type        | Priority | Notes                                                                                       |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------- | ----------- | -------- | ------------------------------------------------------------------------------------------- |
| API-01  | API   | `GET /products?brand=awara` returns 200, `result.data.length > 0`, and every product has `brand === "awara"`        | Positive    | P1       | Assignment step 1 (`@smoke`). `products.spec.ts`                                            |
| API-02  | API   | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns exactly 1 product, and it is that one | Positive    | P1       | Assignment step 2 (`@smoke`). `products.spec.ts`                                            |
| API-03  | API   | Unknown brand (`brand=nonexistent`) returns 400 with an error naming the brand                                      | Negative    | P2       | `{"status":"error","error":"No such brand name 'nonexistent'"}`. `products-filters.spec.ts` |
| API-04  | API   | Unknown product name returns 200 with empty `data` and `total_count: 0`                                             | Negative    | P2       | `products-filters.spec.ts`                                                                  |
| API-05  | API   | Name without brand returns 400 "missed brand values"                                                                | Edge        | P2       | **Finding:** brand is required even when the name is given. `products-filters.spec.ts`      |
| API-06  | API   | `lang=es`, `lang=fr` and an unknown `lang=xx` return the same body as `lang=en`                                     | Edge        | P3       | **Finding:** lang has no effect and any value is accepted; `translations` is empty          |
| API-07a | API   | The brand filter is case-insensitive: `brand=AWARA` returns the same products as `brand=awara`                      | Edge        | P3       | `products-filters.spec.ts`                                                                  |
| API-07b | API   | The name filter is case-sensitive: an uppercase name returns no products                                            | Edge        | P3       | **Finding:** brand ignores case but name doesn't                                            |
| API-08  | API   | The product found by name matches its entry in the brand list (id, name, title, brand, price)                       | Consistency | P2       | `products.spec.ts`                                                                          |
| API-09  | API   | No query parameters returns 400 "missed brand values"                                                               | Negative    | P2       | `@negative`. `products-negative.spec.ts`                                                    |
| API-10  | API   | Empty brand (`brand=`) returns 400 "No such brand name"                                                             | Negative    | P3       | `@negative`                                                                                 |
| API-11  | API   | A name with SQL-like characters, 3000 characters, or an empty value returns 200 with empty `data`, never 5xx        | Negative    | P2       | `@negative`, 3 tests                                                                        |

Considered but not automated:

- `total_count` equals `data.length` as a rule for every brand: lists are capped at **200** items, so
  it fails for larger brands (`nectar`: 1025 total, 200 returned). Recorded as a finding. For `awara`
  (91) API-07a and API-08 check it as a precondition before comparing lists.
- `POST`, `PUT` and `DELETE /products`: out of scope, only `GET` is tested. (Observed on
  2026-11-22: they return 405 `text/plain` "Defined methods: GET".)
- A partial name (`the-awara-hybrid`) not matching the full product: covered in spirit by API-04 and
  API-07b (the name filter is exact).
- The User-Agent header on every request: set per project in `playwright.config.ts`. The browser
  sends the assignment's `E2EUI-Tests`; the API tests send `E2EUI-Tests-Brands-CI`, because the API
  rejects `E2EUI-Tests` with 403.

### UI: home and navigation

| ID    | Layer | Title                                                                                                                | Type     | Priority | Notes                                                                                                                |
| ----- | ----- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| UI-01 | UI    | Home page opens: URL `/`, title present, hero h1 visible                                                             | Positive | P1       | Assignment step 1                                                                                                    |
| UI-02 | UI    | Clicking hero "Shop Mattress" opens `/mattress`                                                                      | Positive | P1       | Assignment step 2. **Known bug #1**: it goes to `/mattresses/essential-latex-hybrid-mattress`. Marked `test.fail()`. |
| UI-03 | UI    | Hero "Shop Mattress" opens a mattress product page (URL is `/mattress` or `/mattresses/…`, h1 is a catalog mattress) | Positive | P1       | Proves the click works regardless of bug #1                                                                          |
| UI-04 | UI    | The cookie banner and promo popup don't block the flow (handled automatically)                                       | Edge     | P1       | Delayed overlays (~seconds and ~16 s)                                                                                |
| UI-05 | UI    | Header "Mattresses" hover opens the mega menu with 3 cards: Essential, Classic, Premier                              | Positive | P2       |                                                                                                                      |
| UI-06 | UI    | Each mega menu card opens the matching product page (h1 = card name)                                                 | Positive | P2       | Data-driven ×3                                                                                                       |
| UI-07 | UI    | The "from" price on each mega menu card ($499+/$599+/$749+) equals the cheapest size on its product page             | Positive | P2       | Data-driven ×3                                                                                                       |
| UI-08 | UI    | "Shop All Mattresses" opens `/mattresses` and lists all 3 mattresses                                                 | Positive | P2       |                                                                                                                      |
| UI-09 | UI    | Header "Mattresses" link opens the mattress listing                                                                  | Negative | P2       | **Known bug #13**: it opens a single product. Marked `test.fail()`.                                                  |
| UI-10 | UI    | The logo returns to the home page from a product page                                                                | Positive | P3       |                                                                                                                      |
| UI-11 | UI    | The product page `<title>` matches its h1 (all 3 mattresses)                                                         | Edge     | P3       | **Known bug #22** (Premier)                                                                                          |

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
| UI-25 | UI    | An unknown URL returns 404 and shows the not-found page, whose "Back to home" link works                                        | Negative | P2       |                                                                               |
| UI-26 | UI    | When `POST /carts/my/items` fails (stubbed 500), the shopper stays on the product page and the cart stays empty                 | Negative | P2       | Finding #29: no error message is shown                                        |

**Total: 37 cases.** 11 are P1 (the assignment plus the core path), 17 are P2 and 9 are P3. For this
assignment, the plan is to automate all P1 cases, then P2 as time allows. P3 cases are a backlog.

**Automated (33 tests):** all API cases (API-01 … 11, 14 tests) and UI-01, 02, 03, 05, 06 (×3),
07 (×3), 08, 09, 12, 13 (UI-14 and UI-15 are its steps: one user journey, one add to cart), 16,
21, 22, 25, 26.

**Not automated:**

| ID                    | Why                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| UI-04                 | Cut in the submission review; the popups are still closed by fixtures in every UI test          |
| UI-18, UI-19, UI-20   | Cut: unstable at 0 retries because of cart page bugs (README findings 3–4, exploration #25–#26) |
| UI-10, 11, 17, 23, 24 | P3 backlog                                                                                      |

## 6. Risks and known issues

| Risk / issue                                                                                       | Impact                                  | Mitigation                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **The API host is blocked by Cloudflare for the assignment's User-Agent** (`E2EUI-Tests` gets 403) | All API tests fail with 403             | Resolved: the company provided `E2EUI-Tests-Brands-CI` for the API tests (`API_USER_AGENT`). The website accepts `E2EUI-Tests`. |
| **The assignment URL has a typo** (`qa.awaraslep.com` doesn't exist)                               | Nothing runs against the documented URL | Use `qa.awarasleep.com` (configurable via `BASE_URL`). Noted in the README.                                                     |
| **The hero "Shop Mattress" goes to the wrong URL** (bug #1)                                        | UI-02 fails                             | `test.fail()` with an annotation. UI-03 still covers the navigation.                                                            |
| Delayed overlays (cookie banner, promo popup, upsell popups)                                       | Flaky clicks                            | Central `addLocatorHandler()` handlers and a pre-set consent cookie.                                                            |
| A/B tests and promo changes (Dynamic Yield, countdowns)                                            | Copy and popups vary                    | Never assert marketing text or timers. Make the upsell handling optional.                                                       |
| Duplicate hidden DOM (responsive copies, a hidden inert nav)                                       | Strict-mode locator errors              | Scoped locators from `docs/exploration.md`. Ask devs for missing test IDs.                                                      |
| Bot protection (DataDome) during parallel CI runs                                                  | Random blocks                           | 2 workers everywhere, and 1 retry only in CI (counted as flaky in the run summary).                                             |
| Shared QA environment, with the cart stored on the server                                          | Data leaks between tests                | A fresh context per test (UI-22 checks it). No checkout, so no orders are created.                                              |

## 7. Entry and exit criteria

- **Entry:** the QA environment is reachable, and the API is reachable for scripted clients (met with `E2EUI-Tests-Brands-CI`, see §6).
- **Exit:** every P1 case is automated and either passing or marked as a known defect with evidence,
  lint and the type check pass, CI is green on `main`, and the Allure report is generated and uploaded.

## 8. Deliverables

- Automated tests in `tests/api` and `tests/ui`, runnable with `npm test` (README).
- Allure and Playwright HTML reports, uploaded as CI artifacts.
- `docs/exploration.md` (findings, locators, bugs), `docs/api-overview.md`, and this plan.
