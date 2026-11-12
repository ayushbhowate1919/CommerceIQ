# CommerceIQ — Production Deployment Guide

This guide details the complete deployment process for CommerceIQ across our free-tier target stack:
- **Frontend:** Vercel Hobby (React + TypeScript + Vite SPA)
- **Backend:** Render Free Web Service (Node.js + Express + TypeScript)
- **Database:** MongoDB Atlas (M0 Free Tier Shared Cluster)
- **AI Engine:** Google Gemini API (`@google/genai`)

---

## 1. Prerequisites & Required Accounts

Before beginning deployment, ensure you have active accounts on:
1. [GitHub](https://github.com/) (repository host)
2. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (database)
3. [Render](https://render.com/) (API web service)
4. [Vercel](https://vercel.com/) (frontend hosting)
5. [Google AI Studio](https://aistudio.google.com/) (Gemini API key)

---

## 2. Step 1: MongoDB Atlas Preparation

1. **Create an M0 Free Cluster:**
   - Provider: AWS (or GCP)
   - Tier: `M0 Sandbox` (Free 512MB storage)
   - Cluster Name: `CommerceIQ-Cluster`
2. **Configure Database Access:**
   - Under **Security > Database Access**, click **Add New Database User**.
   - Authentication Method: **Password**.
   - Assign role: **Read and write to any database**.
   - Note username and secure password (avoid special characters that break URL encoding, or URL-encode them).
3. **Configure Network Access:**
   - Under **Security > Network Access**, click **Add IP Address**.
   - Select **Allow Access From Anywhere (`0.0.0.0/0`)** because Render assigns dynamic outbound IPs.
4. **Obtain Connection String:**
   - Go to **Database > Connect > Drivers (Node.js)**.
   - Connection String Format:
     ```text
     mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/commerceiq?retryWrites=true&w=majority
     ```

---

## 3. Step 2: Render Backend Web Service Setup

1. **Create a New Web Service:**
   - Sign in to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
   - Connect your GitHub repository (`CommerceIQ`).
2. **Configure Web Service Settings:**
   - **Name:** `commerceiq-api` (or unique name, e.g. `commerceiq-api-prod`)
   - **Region:** Closest to your users (e.g., Oregon, Frankfurt, or Singapore)
   - **Branch:** `main`
   - **Root Directory:** `.` (leave as root; monorepo builds run from root)
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install --include=dev && npm run build --workspace server
     ```
     *(The `--include=dev` flag ensures `typescript` is available to execute `tsc`)*
   - **Start Command:**
     ```bash
     npm run start --workspace server
     ```
     *(Runs compiled JavaScript: `node dist/server.js`)*
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/ready`
     *(Under **Advanced Settings > Health Check Path**, set to `/api/ready`. Render monitors this path and requires HTTP 200 to complete deployment; returns HTTP 503 if MongoDB is disconnected).*
3. **Configure Backend Environment Variables on Render:**
   In the **Environment** tab, add the following key-value pairs:

   | Key | Value | Purpose |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production error handling and optimizations |
   | `PORT` | `10000` | Injected automatically by Render (server binds `0.0.0.0`) |
   | `MONGODB_URI` | `mongodb+srv://...` | Connection string from MongoDB Atlas |
   | `JWT_SECRET` | *(64-char random hex string)* | Signs merchant authentication tokens |
   | `GEMINI_API_KEY` | *(AI Studio API Key)* | Enables live Gemini analytics & descriptions |
   | `GEMINI_MODEL` | `gemini-3.6-flash` | Gemini model variant |
   | `CLIENT_URL` | `https://<your-vercel-app>.vercel.app` | Allowed CORS origin (temporarily use placeholder or update after Vercel step) |

   > [!IMPORTANT]
   > Do **NOT** set `ALLOW_PRODUCTION_SEED=true` on Render. This protects live merchant data.

4. **Deploy Backend Service:**
   - Click **Create Web Service**.
   - Monitor the deploy logs until `MongoDB connected` and `Server running on http://localhost:10000` appear.
   - Note your Render backend URL (e.g., `https://commerceiq-api.onrender.com`).

---

## 4. Step 3: Vercel Frontend Setup

1. **Import Project to Vercel:**
   - Sign in to [Vercel](https://vercel.com/) and click **Add New... > Project**.
   - Select your `CommerceIQ` repository.
2. **Configure Project Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `client`.
   - **Build and Output Settings:**
     - Build Command: `npm run build` (or left as Vite default `tsc --noEmit && vite build`)
     - Output Directory: `dist`
     - Install Command: `npm install`
3. **Configure Frontend Environment Variables on Vercel:**
   Under **Environment Variables**, add:

   | Key | Value | Purpose |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://commerceiq-api.onrender.com/api` | Render backend URL **including the `/api` suffix** |

   > [!CAUTION]
   > `VITE_API_URL` must include `/api`. For example: `https://commerceiq-api.onrender.com/api`. Omitting `/api` will result in 404 errors for all client requests.
   > Never place `MONGODB_URI`, `JWT_SECRET`, or `GEMINI_API_KEY` on Vercel.

4. **Deploy Frontend:**
   - Click **Deploy**.
   - Vercel will build the frontend and deploy to `https://<project-name>.vercel.app`.
   - Direct navigation to `/dashboard`, `/inventory`, `/reviews`, etc., is automatically routed to `/index.html` via [`client/vercel.json`](file:///d:/Projects/CommerceIQ/client/vercel.json).

---

## 5. Step 4: Finalize CORS Handshake

Now that your Vercel public URL is known:
1. Return to the **Render Dashboard > `commerceiq-api` > Environment**.
2. Update `CLIENT_URL` to your live Vercel URL (e.g. `https://commerceiq.vercel.app`).
   - If you also want to allow local testing against the deployed backend, configure comma-separated origins:
     ```text
     https://commerceiq.vercel.app, http://localhost:5173
     ```
   - Trailing slashes are automatically sanitized by the server.
3. Save changes. Render will automatically redeploy the backend with the updated origin policy.

---

## 6. Recommended Deployment Sequence

```text
[Step 1: MongoDB Atlas]
   ├── Create M0 Free Cluster
   ├── Add DB user (read/write)
   └── Allow IP 0.0.0.0/0
         │
         ▼
[Step 2: Render Backend]
   ├── Connect repo (Root: .)
   ├── Build: npm install --include=dev && npm run build --workspace server
   ├── Start: npm run start --workspace server
   ├── Set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
   └── Deploy & copy Render API URL (e.g. https://api.onrender.com)
         │
         ▼
[Step 3: Vercel Frontend]
   ├── Import repo (Root Directory: client)
   ├── Set VITE_API_URL = https://api.onrender.com/api
   └── Deploy & copy Vercel app URL (e.g. https://app.vercel.app)
         │
         ▼
[Step 4: Update Render CORS]
   └── Set CLIENT_URL = https://app.vercel.app on Render
```

---

## 7. Production Smoke Tests

Once both services are deployed, perform these verification checks:

### 1. Backend Liveness Check
Run in terminal or browser:
```bash
curl -i https://<your-render-service>.onrender.com/api/health
```
**Expected Response:**
```json
HTTP/1.1 200 OK
{
  "status": "ok",
  "database": "connected"
}
```

### 2. Backend Readiness Check
Run in terminal or browser to verify database readiness:
```bash
curl -i https://<your-render-service>.onrender.com/api/ready
```
**Expected Response:**
```json
HTTP/1.1 200 OK
{
  "status": "ok",
  "database": "connected"
}
```
*(If MongoDB is disconnected, returns HTTP 503 with `"status": "degraded", "database": "disconnected"`).*

### 3. CORS Preflight Verification
Verify that preflight headers are returned for your Vercel domain:
```bash
curl -i -X OPTIONS https://<your-render-service>.onrender.com/api/health \
  -H "Origin: https://<your-vercel-app>.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```
**Expected Response:**
```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://<your-vercel-app>.vercel.app
Access-Control-Allow-Credentials: true
```

### 3. Frontend Direct Route Refresh (SPA Verification)
1. Open your browser and navigate to `https://<your-vercel-app>.vercel.app/login`.
2. Press **Refresh (F5)** or reload the page.
3. Confirm the page loads cleanly without returning a `404: NOT_FOUND` error.
4. Repeat for `https://<your-vercel-app>.vercel.app/dashboard`.

### 4. End-to-End User Flow
1. **Register a new merchant:**
   - Navigate to `/register`.
   - Enter merchant name, email, and password.
   - Verify redirect to `/dashboard`.
2. **Verify Product Catalog:**
   - Navigate to `/products`.
   - Create a sample product.
   - Verify product appears in the list and database.
3. **Verify Gemini AI Assistant:**
   - Navigate to `/ai/assistant`.
   - Send query: *"What are my top selling categories?"*
   - Verify the assistant executes database tools and returns analytical answers.
4. **Logout:**
   - Click Logout in the sidebar.
   - Verify auth token is cleared and user is redirected to `/login`.

---

## 8. Troubleshooting Free-Tier Quirks

- **Render Cold Starts:**
  Render's free tier spins down web services after 15 minutes of inactivity. The first request after sleep may take 30–50 seconds to respond. This is normal free-tier behavior. Subsequent requests are fast.
- **MongoDB Atlas Connection Limits:**
  The M0 sandbox allows 500 maximum connections. Connection pooling in Mongoose is automatically managed.
- **Vercel Build Cache:**
  If you update `VITE_API_URL` on Vercel, you must trigger a new deployment (or check **Redeploy without cache**) for the new environment variable to be baked into client assets.

