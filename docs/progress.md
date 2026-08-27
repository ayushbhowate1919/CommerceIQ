# Progress

## Milestone 0 — Project Bootstrap (completed)

### Completed Work

- Created root workspace configuration, environment template, and Git ignore rules.
- Created the Vite React client scaffold in `client/`.
- Created the Express API scaffold in `server/` with `GET /api/health`.

### Verification Performed

- Installed workspace dependencies with `npm install`.
- Built and linted the client and server successfully.
- Confirmed the frontend starts on `http://localhost:5173`.
- Confirmed `GET /api/health` returned `{ "status": "ok" }`.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 1 — MongoDB Connection and Core Models (completed)

### Completed Work

- Added root `.env` support for `MONGODB_URI` without committing secrets.
- Added MongoDB environment loading and a graceful Mongoose connection helper.
- Added User, Product, Customer, Order, Review, and AIInsight Mongoose models.
- Added Product indexes for unique SKU, category, stock, and creation date.
- Enhanced `GET /api/health` with database status.
- Added temporary `GET /api/debug/product-count` database verification endpoint.
- Added `mongoose` and `dotenv` dependencies.

### Verification Performed

- `npm run build` passed for the client and server with no TypeScript errors.
- `npm run lint` passed for the client and server with no warnings or errors.
- Server startup logged `MongoDB connected` and `Server running`.
- `GET /api/health` returned HTTP 200 and `{ "status": "ok", "database": "connected" }`.
- `GET /api/debug/product-count` returned HTTP 200 and `{ "success": true, "count": 0 }`.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 2 — Authentication (completed)

### Completed Work

- Added register, login, logout, and current-user API endpoints using the route → controller → service → model structure.
- Added bcrypt password hashing, JWT bearer-token authentication, request validation, authenticated-request middleware, and consistent API error/success responses.
- Added React registration and login pages, persistent auth state, protected dashboard routing, redirects, and client-side logout.
- Configured root `.env` with `JWT_SECRET` and verified MongoDB connectivity.
- Cleared background process port conflicts that caused stale health report statuses.
- Created comprehensive integration test suite `server/tests/milestone2-verification.test.ts` covering all 15 verification requirements.

### Verification Performed

- `GET /api/health` confirmed database connection: `{ "status": "ok", "database": "connected" }`.
- Verified User A (`usera@example.com`) and User B (`userb@example.com`) registration, returning 201 Created with signed JWT tokens.
- Verified MongoDB persistence for User documents.
- Verified passwords are correctly hashed with `bcrypt` in the database.
- Verified duplicate email registration (case-insensitive) is rejected with HTTP 409 `EMAIL_IN_USE`.
- Verified login for User A and User B with password verification.
- Verified JWT signature and token payload claims (`sub`, `role`).
- Verified `GET /api/auth/me` with Bearer tokens returns correct authenticated user payload.
- Verified protected routes reject unauthenticated requests and invalid tokens with HTTP 401 `UNAUTHORIZED`.
- Verified logout flow (`POST /api/auth/logout`) succeeds.
- Verified two-user data isolation: User A's token only yields User A's user details and User B's token only yields User B's user details.
- Verified frontend registration, session restoration, login, and logout flow simulation.
- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly for client and server.
- `npm.cmd test` passed all 16 unit and integration test cases across 3 test suites.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 3 — Product Management (completed)

### Completed Work

- Updated `Product` model with merchant ObjectId reference (`merchant`), indexes (`merchant`, unique `sku`, `category`, `stock`, `createdAt`), and exported `ProductDocument` type.
- Added product input validation module (`server/src/validators/product.validator.ts`) for create, update, and list query parameter validation with numeric range enforcement.
- Added product service layer (`server/src/services/product.service.ts`) enforcing merchant data isolation, search by name/SKU, category/status filtering, pagination metadata generation, single product retrieval, partial updates, and deletion.
- Added product controller layer (`server/src/controllers/product.controller.ts`) and authenticated product routes (`server/src/routes/product.routes.ts`) mounted at `/api/products`.
- Enhanced global error middleware (`server/src/middleware/error.middleware.ts`) to return HTTP 409 `SKU_ALREADY_EXISTS` on duplicate SKU database errors.
- Added frontend navigation header (`Navbar`), Product Catalog List Page (`/products`), Product Creation Page (`/products/new`), and Product Detail/Edit/Delete Page (`/products/:id`) with reactive search, filtering, pagination, status badges, and validation error banners.
- Created comprehensive integration test suite `server/tests/milestone3-verification.test.ts` verifying all 12 checklist criteria.

### Verification Performed

- Verified Product Creation: `POST /api/products` creates merchant-scoped product documents.
- Verified Listing & Pagination: `GET /api/products` returns merchant products with pagination metadata (`page`, `limit`, `total`, `totalPages`).
- Verified Search: `search` filter searches by product name and SKU (case-insensitive regex).
- Verified Filters: `category` and `status` query filters accurately isolate products.
- Verified Product Details: `GET /api/products/:id` fetches full product detail document.
- Verified Product Update: `PATCH /api/products/:id` updates product fields and persists changes.
- Verified Product Deletion: `DELETE /api/products/:id` deletes product document cleanly.
- Verified Unauthorized Access: Unauthenticated requests to product endpoints are rejected with HTTP 401 `UNAUTHORIZED`.
- Verified Merchant Isolation: User A cannot list, view, edit, or delete User B's products (returning HTTP 404 or empty list).
- Verified Validation & Error Handling: Invalid payload values (e.g. negative price) return HTTP 400 `VALIDATION_ERROR`; duplicate SKU returns HTTP 409 `SKU_ALREADY_EXISTS`.
- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly for client and server with 0 warnings or errors.
- `npm.cmd test` passed all 29 test cases across all test suites.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 4 — Seed Realistic Demo Data (completed)

### Completed Work

- Updated `Order`, `Customer`, and `Review` models with merchant ObjectId reference (`merchant`), indexes (`merchant`, `createdAt`), and exported document types (`OrderDocument`, `CustomerDocument`, `ReviewDocument`).
- Created seed dataset templates (`server/src/seed/seed-data.ts`) containing 50 products across 5 categories, 150 customer profiles with segmentations, and 500 review templates with pre-computed `aiAnalysis` structures.
- Created idempotent data seeding pipeline (`server/src/seed/seed.ts`) that provisions demo merchant (`demo@commerceiq.com` / `Password123!`), cleans prior merchant data, inserts 50 products, 150 customers, 1,500 orders over 90 days, 500 reviews, and updates product rating statistics.
- Configured CLI script commands `"seed": "npm run seed --workspace server"` in root `package.json` and `"seed": "tsx src/seed/seed.ts"` in `server/package.json`.
- Created automated test suite `server/tests/milestone4-verification.test.ts` verifying all seed database count checkpoints and date distribution trends.

### Verification Performed

- Executed `npm run seed` and verified CLI console output matching exact spec checkpoints:
  - Demo Merchant: `demo@commerceiq.com`
  - Products: 50
  - Customers: 150
  - Orders: 1,500
  - Reviews: 500
- Verified Product rating and reviewCount aggregation updates across all seeded products.
- Verified Order dates span across 90 days with realistic status breakdown (`delivered`, `shipped`, `pending`, `cancelled`, `returned`).
- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly for client and server with 0 warnings or errors.
- `npm.cmd test` passed all 37 unit and integration test cases across all 5 test suites.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 5 — Analytics Backend (completed)

### Completed Work

- Added query validator module (`server/src/validators/analytics.validator.ts`) handling preset ranges (`7d`, `30d`, `90d`, `12m`), custom ISO dates (`startDate`, `endDate`), interval groupings (`day`, `week`, `month`), parameter bounds validation, and date window calculations.
- Implemented core analytics service layer (`server/src/services/analytics.service.ts`) using MongoDB aggregation pipelines for:
  - `getDashboardSummary`: KPI cards (Revenue, Orders, AOV, Units Sold) with period-over-period percentage changes.
  - `getRevenueTrend`: Time-series revenue, order volume, and AOV grouped by date interval.
  - `getOrderSummary`: Order counts broken down by status and gross vs net revenue metrics.
  - `getCategoryRevenue`: Revenue and volume grouped by product category with percentage share of total store revenue.
  - `getTopProducts`: Product ranking by revenue or quantity sold with product details.
  - `getPeriodComparison`: Side-by-side comparison between current and previous date windows.
  - `getProductPerformance`: Detailed per-product sales metrics paired with review scores.
- Implemented analytics controller handlers (`server/src/controllers/analytics.controller.ts`).
- Created authenticated Express routers mounted at `/api/dashboard` (`server/src/routes/dashboard.routes.ts`) and `/api/analytics` (`server/src/routes/analytics.routes.ts`) enforcing merchant JWT authorization (`requireAuthentication`).
- Updated `server/package.json` test runner configuration (`--test-concurrency=1`) to prevent parallel test suite database race conditions.
- Created comprehensive integration test suite `server/tests/milestone5-verification.test.ts` testing authentication, validation errors, multi-tenant isolation, and calculations against the seeded demo dataset.

### Verification Performed

- `GET /api/dashboard/summary` returned accurate KPI figures and period change metrics.
- `GET /api/analytics/revenue` returned interval-grouped revenue trends spanning the date range.
- `GET /api/analytics/categories` returned category revenue breakdown summing to ~100%.
- `GET /api/analytics/top-products` returned top products sorted by revenue.
- `GET /api/analytics/order-summary` returned status breakdown (delivered, shipped, pending, cancelled, returned).
- `GET /api/analytics/period-comparison` returned comparative current vs previous metrics.
- `GET /api/analytics/product-performance` returned per-product sales and rating analytics.
- Multi-Tenant Isolation verified: Merchant B gets 0 revenue/orders proving data isolation.
- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly for client and server with 0 warnings or errors.
- `npm.cmd test` passed all 48 test cases across all test suites.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 6 — Inventory Intelligence (completed)

### Completed Work

- Added query validator module (`server/src/validators/inventory.validator.ts`) enforcing parameter checks for `lookbackDays` (`7`, `14`, `30`, `60`, `90`), `riskLevel` (`critical`, `high`, `medium`, `healthy`), `reorderOnly`, `category`, `search`, and pagination parameters (`page`, `limit`).
- Created inventory service engine (`server/src/services/inventory.service.ts`) computing deterministic heuristics:
  - `averageDailySales = quantitySold / lookbackDays`.
  - `estimatedDaysUntilStockout = stock / averageDailySales`.
  - Risk classification (`critical` for 0–3 days or stock=0; `high` for 4–7 days; `medium` for 8–14 days; `healthy` for 15+ days or zero sales).
  - `reorderNeeded` warning flag (`stock <= reorderLevel` or critical/high risk) and `suggestedReorderQuantity`.
  - Aggregate inventory health summary calculations (`getInventorySummary`).
- Created inventory controller (`server/src/controllers/inventory.controller.ts`) and authenticated router mounted at `/api/inventory` (`server/src/routes/inventory.routes.ts`).
- Created comprehensive integration test suite `server/tests/milestone6-verification.test.ts` testing auth protection, parameter validation, exact formula checkpoint (Stock=20, Daily Sales=10 -> Stockout in 2 days, Critical), out-of-stock items, lookback math, filters, summary totals, and multi-tenant data isolation.

### Verification Performed

- Executed `calculateProductRisk` unit test verifying exact spec checkpoint: Stock = 20, Daily Sales = 10 yields 2 estimated stockout days and `critical` risk level.
- `GET /api/inventory/risks` returned paginated risk report sorted by severity.
- `GET /api/inventory/summary` returned total products, total stock units, out-of-stock count, critical risk count, and retail valuation.
- Multi-tenant isolation verified: Merchant B receives 0 inventory items and 0 valuation.
- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly for client and server with 0 warnings or errors.
- `npm.cmd test` passed all 58 test cases across all 7 test suites.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 7 — Dashboard Frontend (completed)

### Completed Work

- Installed `recharts` library for interactive client-side charts.
- Created dashboard TypeScript type definitions (`client/src/types/dashboard.ts`) covering summary KPIs, time-series revenue trends, category revenue breakdown, top product rankings, order summary metrics, and inventory risk items.
- Created HTTP API service layer (`client/src/api/client.ts` and `client/src/api/dashboardApi.ts`) connecting React components to backend endpoints (`/api/dashboard/summary`, `/api/analytics/revenue`, `/api/analytics/categories`, `/api/analytics/top-products`, `/api/analytics/order-summary`, `/api/inventory/summary`, `/api/inventory/risks`).
- Created responsive merchant navigation layout (`client/src/components/layout/SidebarLayout.tsx`) featuring store avatar, role indicator, navigation links (`Dashboard`, `Products`, `Inventory`), active page indicators, merchant email tag, and logout action.
- Built reusable dashboard widgets:
  - `DateRangeSelector`: Interactive range filters (`7d`, `30d`, `90d`, `12m`).
  - `KpiCards`: Total Revenue, Orders, AOV, and Units Sold cards with period-over-period percentage badges and loading skeletons.
  - `RevenueTrendChart`: Recharts AreaChart with smooth gradient fills and custom tooltips.
  - `CategoryBreakdownChart`: Recharts PieChart displaying revenue share across categories.
  - `TopProductsWidget`: Ranked top-sellers list with progress bars.
  - `InventoryRiskWidget`: Inventory risk overview card highlighting out-of-stock and critical stockout alerts.
- Built full page views:
  - `DashboardPage`: Orchestrates KPI summary cards, revenue trend area chart, category pie chart, top products widget, and inventory risk preview.
  - `InventoryPage`: Dedicated Inventory Health page supporting search, category filter, lookback window selector, risk level severity filter (`critical`, `high`, `medium`, `healthy`), reorder needed toggle, and paginated inventory table.
- Updated `client/src/styles.css` with dark sidebar, topbar, KPI card glassmorphism, badge colors, chart wrappers, and responsive grid system.
- Verified dashboard works completely standalone without requiring any AI or OpenAI API key.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all 58 test cases across all test suites.
- Confirmed reactive date range selection (`7d`, `30d`, `90d`, `12m`) refreshes metrics and charts.
- Confirmed standalone functionality without AI dependencies.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 8 — Review Management (completed)

### Completed Work

- Created review query validator module (`server/src/validators/review.validator.ts`) handling `rating`, `minRating`, `maxRating`, `productId`, `search`, `verifiedOnly`, and pagination parameters (`page`, `limit`).
- Created review service module (`server/src/services/review.service.ts`) computing:
  - `getReviewsService`: Paginated review query populated with product (`name`, `sku`, `category`) and customer details.
  - `getMerchantReviewSummaryService`: Aggregate review count, average store rating, 1–5 star distribution counts & percentages, negative review alerts, lowest-rated catalog products, and recent negative reviews feed.
  - `getProductReviewSummaryService`: Product-specific review counts, average rating, and star breakdown.
- Created review controller handlers (`server/src/controllers/review.controller.ts`) and authenticated router mounted at `/api/reviews` (`server/src/routes/review.routes.ts`).
- Created client API layer (`client/src/types/review.ts` and `client/src/api/reviewApi.ts`) connecting React components to backend endpoints (`/api/reviews`, `/api/reviews/summary`, `/api/reviews/product/:productId`).
- Built responsive merchant Customer Reviews page (`client/src/pages/ReviewsPage.tsx`) featuring store rating KPI, star breakdown bars, lowest-rated products alert card, rating filter, product filter, text search, verified purchase toggle, and review feed cards.
- Updated navigation layout (`client/src/components/layout/SidebarLayout.tsx`) and application routing (`client/src/App.tsx`) with protected `/reviews` page.
- Created comprehensive integration test suite `server/tests/milestone8-verification.test.ts` verifying authentication protection, query validation, paginated queries, rating/product filters, text search, summary aggregations, and multi-tenant isolation.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all 67 test cases across all 8 test suites.
- Verified multi-tenant isolation: Merchant B receives 0 reviews and 0 aggregate stats.
- Verified standalone review management functionality without AI dependencies.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 9 — Gemini Integration Foundation (completed)

### Completed Work

- Installed official `@google/genai` SDK in `@commerceiq/server`.
- Updated environment configuration (`server/src/config/env.ts`) with `geminiApiKey` (`process.env.GEMINI_API_KEY`) and `geminiModel` (`process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'`).
- Created Gemini client module (`server/src/ai/client.ts`) encapsulating `GoogleGenAI` initialization, missing key handling, and helper functions (`isGeminiConfigured`, `getGeminiModelName`, `getGeminiClient`).
- Created AI service (`server/src/services/ai.service.ts`), controller (`server/src/controllers/ai.controller.ts`), and authenticated router (`server/src/routes/ai.routes.ts`) mounted at `/api/ai`.
- Added health test endpoint `POST /api/ai/health-test` returning structured AI operational status and handling missing API keys cleanly without crashing server boot.
- Created comprehensive integration test suite `server/tests/milestone9-verification.test.ts` verifying authentication enforcement, configuration status checks, and model metadata.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all 71 test cases across all 9 test suites.
- Verified server-side API key isolation: `GEMINI_API_KEY` stays 100% on the backend.
- Verified missing API key fallback mode returns clear configuration response without crashing the application.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 10 — AI Product Description Generator (completed)

### Completed Work

- Created Gemini JSON response schema (`server/src/ai/schemas/description.schema.ts`) using `@google/genai` `Schema` and `Type` defining structured output (`title`, `shortDescription`, `longDescription`, `bulletPoints`, `seoKeywords`).
- Created prompt generator module (`server/src/ai/prompts/description.prompt.ts`) crafting e-commerce copywriter system instructions and grounded product prompt templates.
- Created request payload validator (`server/src/validators/ai.validator.ts`) enforcing input validation on product name, category, features, target audience, brand tone, and SEO keywords.
- Updated AI service (`server/src/services/ai.service.ts`) with `generateProductDescriptionService` invoking Gemini SDK with `responseMimeType: "application/json"` and `responseSchema`.
- Added controller handler (`server/src/controllers/ai.controller.ts`) and mounted route `POST /api/ai/generate-description` on authenticated router (`server/src/routes/ai.routes.ts`).
- Added client TypeScript types (`client/src/types/ai.ts`) and API layer (`client/src/api/aiApi.ts`).
- Created AI Description Studio frontend page (`client/src/pages/DescriptionGeneratorPage.tsx`) with catalog product auto-fill selector, input form controls, tone selectors, result card displays, copy-to-clipboard functionality, loading spinners, and toast notifications.
- Integrated AI Studio route (`/ai/description-generator`) and navigation link in `client/src/components/layout/SidebarLayout.tsx` and `client/src/App.tsx`.
- Created comprehensive integration test suite `server/tests/milestone10-verification.test.ts` testing auth protection, payload validation, schema conformance, and degraded unconfigured API key handling.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all test cases across all test suites including `milestone10-verification.test.ts`.
- Verified server-side API key protection (`GEMINI_API_KEY` kept exclusively on backend).
- Verified structured output conformance and fallback handling when Gemini API key is missing.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 11 — Review AI Analysis (completed)

### Completed Work

- Created Gemini JSON response schemas (`server/src/ai/schemas/review-analysis.schema.ts`) for single review sentiment extraction (`SingleReviewAnalysis`) and product review batch analysis (`ProductReviewsAnalysis`).
- Created prompt builders (`server/src/ai/prompts/review-analysis.prompt.ts`) with system instructions enforcing Prompt Injection Awareness and strict isolation of untrusted customer review text.
- Added input payload validators (`server/src/validators/ai.validator.ts`) enforcing ObjectId validation, optional `forceRefresh` boolean flag, and `limit` parameter bounds.
- Updated AI service module (`server/src/services/ai.service.ts`) with:
  - `analyzeSingleReviewService`: Analyzes single customer review, persists `aiAnalysis` onto MongoDB `Review` model document, and reuses cached analysis when `forceRefresh=false`.
  - `analyzeProductReviewsService`: Performs aggregate sentiment analysis across product review batches, computing sentiment scores, top positive/negative themes, executive summaries, and recommended merchant actions.
- Added controller handlers (`server/src/controllers/ai.controller.ts`) and mounted routes in authenticated Express router (`server/src/routes/ai.routes.ts`):
  - `POST /api/ai/analyze-review/:reviewId`
  - `POST /api/ai/analyze-product-reviews/:productId`
- Updated client TypeScript interfaces (`client/src/types/ai.ts` & `client/src/types/review.ts`) and API service module (`client/src/api/aiApi.ts`).
- Built **AI Review Intelligence Panel** and per-review sentiment triggers on merchant Customer Reviews page (`client/src/pages/ReviewsPage.tsx`).
- Created comprehensive automated integration test suite `server/tests/milestone11-verification.test.ts` testing auth enforcement, parameter validation, MongoDB document caching, batch product review analysis, and multi-tenant data isolation.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all test cases across all 11 test suites including `milestone11-verification.test.ts`.
- Verified single review analysis caching: `aiAnalysis` is stored on the Mongoose `Review` document and returned on subsequent queries without unnecessary AI calls.
- Verified multi-tenant data isolation: Merchant B cannot request review analysis for Merchant A's reviews or products (returns HTTP 404 `NOT_FOUND`).

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 12 — AI Business Advisor (completed)

### Completed Work

- Created Gemini JSON response schema (`server/src/ai/schemas/business-advisor.schema.ts`) defining structured business advisor output (`healthScore`, `executiveSummary`, `strengths`, `risks`, `recommendedActions`).
- Created system instructions and prompt builder (`server/src/ai/prompts/business-advisor.prompt.ts`) formatting deterministic business snapshot metrics (Revenue, Growth %, Orders, AOV, Top Products, Stockout Alerts, Customer Review Complaints).
- Updated `AIInsight` Mongoose model (`server/src/models/ai-insight.model.ts`) with merchant ObjectId reference and compound indexing (`merchant`, `type`) for multi-tenant data isolation.
- Created input validator (`server/src/validators/ai.validator.ts`) handling `timeRange` (`7d`, `30d`, `90d`) and `forceRefresh` validation.
- Updated AI service module (`server/src/services/ai.service.ts`) with:
  - `generateBusinessAdvisorService`: Calculates store metrics deterministically via MongoDB aggregation pipelines (`getPeriodComparison`, `getTopProducts`, `getInventorySummary`, `getMerchantReviewSummaryService`), passes snapshot data to Gemini SDK, and persists report into `AIInsight` MongoDB collection.
  - `getLatestBusinessAdvisorService`: Retrieves latest stored business advisor insight for the merchant.
- Added controller handlers (`server/src/controllers/ai.controller.ts`) and mounted routes in authenticated router (`server/src/routes/ai.routes.ts`):
  - `POST /api/ai/business-advisor`
  - `GET /api/ai/business-advisor/latest`
- Added client TypeScript interfaces (`client/src/types/ai.ts`) and API methods (`client/src/api/aiApi.ts`).
- Created frontend **AI Business Advisor Studio** page (`client/src/pages/BusinessAdvisorPage.tsx`) rendering store health score gauge (0–100), executive summary card, key strengths, risk warnings, and prioritized action matrix (Priority, Action, Impact, Category).
- Embedded **AI Business Insights Panel** on main merchant dashboard (`client/src/pages/DashboardPage.tsx`).
- Updated sidebar navigation (`client/src/components/layout/SidebarLayout.tsx`) and application routing (`client/src/App.tsx`) with `/ai/business-advisor` link and route.
- Created comprehensive integration test suite `server/tests/milestone12-verification.test.ts` testing auth protection, payload validation, MongoDB document persistence, GET latest endpoint, multi-tenant isolation, and degraded mode handling.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all 86 test cases across all 12 test suites.
- Verified multi-tenant data isolation: Merchant B cannot retrieve Merchant A's advisor reports (`GET /api/ai/business-advisor/latest` returns `null` for Merchant B).

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 13 — AI Tool Calling / Natural-Language Analytics (completed)

### Completed Work

- Created Gemini JSON tool function declarations (`server/src/ai/tools/analytics-tools.ts`) using `@google/genai` for the 3 initial analytics tools (`get_revenue_summary`, `get_top_products`, `get_revenue_by_category`).
- Implemented tool dispatch registry (`executeAnalyticsTool`) validating parameters via `validateAnalyticsQuery` and invoking underlying MongoDB aggregation services in `analytics.service.ts` with `merchantId` scoping.
- Created prompt generator (`server/src/ai/prompts/analytics-assistant.prompt.ts`) establishing system instructions for the Analytics Assistant to strictly rely on tool function calls for store data.
- Added payload validator function (`validateAnalyticsQueryInput` in `server/src/validators/ai.validator.ts`) enforcing input checks on natural-language query strings.
- Implemented multi-turn function call loop service (`processAnalyticsQueryService` in `server/src/services/ai.service.ts`) dispatching tool calls back and forth with Gemini until final natural-language response and tool execution log are produced.
- Added controller handler (`processAnalyticsQueryHandler` in `server/src/controllers/ai.controller.ts`) and mounted route `POST /api/ai/analytics-query` protected with `requireAuthentication` in `server/src/routes/ai.routes.ts`.
- Updated client TypeScript type definitions (`client/src/types/ai.ts`) and API client (`client/src/api/aiApi.ts`).
- Created comprehensive integration test suite `server/tests/milestone13-verification.test.ts` testing auth protection, payload validation, direct tool execution logic, multi-tenant isolation, exact spec query checkpoints, and degraded mode when unconfigured.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all test cases across all test suites including `milestone13-verification.test.ts`.
- Verified multi-tenant data isolation: Merchant B tool dispatch returns 0 revenue and 0 metrics.
- Verified degraded mode handling when `GEMINI_API_KEY` is missing.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 14 — Expand Analytics Tools (completed)

### Completed Work

- Expanded AI Tool Calling whitelist (`server/src/ai/tools/analytics-tools.ts`) from 3 to 8 tools by declaring JSON function schemas for:
  - `get_sales_trend` (historical sales, order volume, and AOV trends)
  - `get_inventory_risk` (stockout warnings, risk classification, and reorder levels)
  - `get_product_performance` (detailed per-product sales metrics paired with rating scores)
  - `get_order_summary` (order status count breakdown and gross vs net revenue)
  - `get_period_comparison` (side-by-side performance comparison comparing current to previous period)
- Updated tool dispatch engine (`executeAnalyticsTool`) to validate parameters and invoke underlying database aggregation services (`getRevenueTrend`, `getInventoryRisks`, `getProductPerformance`, `getOrderSummary`, `getPeriodComparison`) with `merchantId` scoping.
- Updated system prompt (`server/src/ai/prompts/analytics-assistant.prompt.ts`) referencing all 8 available tools and guiding Gemini on tool selection logic.
- Updated `processAnalyticsQueryService` in `server/src/services/ai.service.ts` to pass `ALL_ANALYTICS_TOOL_DECLARATIONS` to Gemini `generateContent`.
- Created comprehensive integration test suite `server/tests/milestone14-verification.test.ts` verifying direct tool execution across all 5 new tools, multi-tenant isolation, and natural-language query processing.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all test cases across all 14 test suites including `milestone14-verification.test.ts`.
- Verified multi-tenant data isolation: Merchant B receives 0 metrics across all expanded tools.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Milestone 15 — AI Assistant UI (completed)

### Completed Work

- Built interactive AI Commerce Analyst workspace page (`client/src/pages/AiAssistantPage.tsx`) featuring real-time conversation thread, status header, 6 quick-suggest prompt cards, executed tools accordion, and contextual navigation chips.
- Added "AI Commerce Analyst" link (`/ai/assistant`) to sidebar navigation (`client/src/components/layout/SidebarLayout.tsx`) under AI Studio section.
- Mounted protected route `/ai/assistant` in application router (`client/src/App.tsx`).
- Created integration test suite `server/tests/milestone15-verification.test.ts` testing health checks, auth protection, and analytics queries.

### Verification Performed

- `npm.cmd run build` passed cleanly for client and server.
- `npm.cmd run lint` passed cleanly with 0 warnings or errors across client and server.
- `npm.cmd test` passed all test cases across all 15 test suites including `milestone15-verification.test.ts`.

### Known Issues

- PowerShell's `npm` shim is misconfigured on this machine; use `npm.cmd` from PowerShell until it is repaired.

## Next Milestone

16 — Security Hardening



