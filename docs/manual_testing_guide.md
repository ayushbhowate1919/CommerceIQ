# CommerceIQ — Manual Testing Guide

This document provides a step-by-step manual testing script for verifying end-to-end product functionality across authentication, catalog management, inventory health, review insights, and AI assistance.

---

## 📋 Prerequisites & Local Setup

1. **Database & Backend API**:
   Ensure MongoDB is running locally (`mongodb://127.0.0.1:27017`) and seed data is provisioned:
   ```bash
   npm run seed
   npm run dev
   ```

2. **Web Browser**:
   Open Google Chrome or Microsoft Edge at `http://localhost:5173`.

---

## 🧪 14-Step Manual Verification Protocol

### Step 1 — Merchant Registration
- Navigate to `http://localhost:5173/register`.
- Enter Name (`Test Merchant`), Email (`test@merchant.com`), and Password (`Password123!`).
- Click **Create Merchant Account**.
- **Expected Outcome**: Account is registered, JWT token is stored, and user is redirected to `/dashboard`.

### Step 2 — Merchant Login & Session Persistence
- Click **Log out** in the sidebar.
- Navigate to `http://localhost:5173/login`.
- Enter Email (`demo@commerceiq.com`) and Password (`Password123!`).
- Click **Sign In**.
- Refresh the browser page (`F5`).
- **Expected Outcome**: User remains logged in with persistent authentication token.

### Step 3 — Open Merchant Dashboard
- Confirm redirection to `/dashboard`.
- **Expected Outcome**: Page header displays "Store Dashboard & Intelligence Overview". Topbar displays live workspace connection status.

### Step 4 — Inspect Analytics & KPI Cards
- Change the Date Range selector between `7d`, `30d`, `90d`, and `12m`.
- Inspect KPI Cards: Total Revenue, Orders, Average Order Value (AOV), Units Sold.
- Hover over the **Revenue Trend** AreaChart and **Category Share** PieChart.
- **Expected Outcome**: Charts update dynamically with period comparison percentage badges.

### Step 5 — Open Product Catalog
- Click **Products** in the sidebar navigation (`/products`).
- Filter by Category (`Electronics`), Search by SKU (`WDG`), or Status.
- **Expected Outcome**: Product table filters matching products with pagination metadata.

### Step 6 — Create New Product
- Click **+ Add Product** button to open `/products/new`.
- Fill in Name (`Wireless Noise-Canceling Headphones`), SKU (`WNC-HP-99`), Category (`Electronics`), Price (`299.99`), Cost Price (`120.00`), Stock (`40`), Reorder Level (`10`).
- Click **Create Product Document**.
- **Expected Outcome**: Success toast/banner appears and product is added to catalog.

### Step 7 — Edit & Update Product
- Click **Edit** on the newly created product.
- Update Price to `279.99` and Stock to `45`.
- Click **Save Product Changes**.
- **Expected Outcome**: Updated product details persist and render accurately.

### Step 8 — Inspect Inventory Risk Intelligence
- Click **Inventory Health** in the sidebar (`/inventory`).
- Filter by Risk Severity (`Critical Risk`) or Lookback Window (`30 Days`).
- Inspect stockout estimations, average daily sales velocity, and suggested reorder quantity calculations.
- **Expected Outcome**: Out-of-stock and critical stockout alerts highlight urgent reorder needs.

### Step 9 — Customer Reviews & Feedback
- Click **Customer Reviews** in the sidebar (`/reviews`).
- Filter by Rating (`5 Stars` or `1 Star`) or search customer text.
- Inspect aggregate store rating average, star breakdown distribution, and lowest-rated products alert card.
- **Expected Outcome**: Reviews render populated customer and product details.

### Step 10 — Generate AI Product Description
- Click **Description Studio** in the sidebar (`/ai/description-generator`).
- Select a catalog product or enter Name (`Smart Fitness Tracker`), Category (`Wearables`), Features (`Heart rate monitoring, Waterproof, 7-day battery`), Tone (`Professional`).
- Click **Generate Product Copy**.
- **Expected Outcome**: Formatted AI response appears with Title, Short Description, Long Description, Bullet Points, and SEO Keywords with copy-to-clipboard support.

### Step 11 — Analyze Customer Reviews with AI
- Navigate back to `/reviews`.
- Click **Analyze Review** on a customer review card.
- **Expected Outcome**: Sentiment, key extracted topics, summary, and suggested merchant actions display cleanly.

### Step 12 — Ask AI Analytics Natural-Language Questions
- Click **AI Commerce Analyst** in the sidebar (`/ai/assistant`).
- Click a quick prompt card (e.g. *"Which category generated the most revenue last month?"*).
- Click **Send Query**.
- **Expected Outcome**: Analyst executes function tools (`get_revenue_by_category`) and responds with structured data insights and tool execution accordion.

### Step 13 — Generate AI Business Advisor Summary
- Click **AI Business Advisor** in the sidebar (`/ai/business-advisor`).
- Click **Generate Business Intelligence Report**.
- **Expected Outcome**: Health score gauge (0-100), Executive Summary, Key Strengths, Risk Alerts, and Prioritized Action Matrix render accurately.

### Step 14 — Merchant Logout
- Click **Log out** in the bottom sidebar footer.
- **Expected Outcome**: Token is cleared from localStorage and user is redirected to `/login`. Unauthenticated navigation to `/dashboard` redirects back to login.
