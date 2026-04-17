# Deployment

## Backend

- Deploy `apps/backend` to Railway as a Java service.
- Set the Railway service root to `apps/backend`.
- A ready-to-use Nixpacks config is included at `apps/backend/nixpacks.toml`.
- Provision a Railway Postgres instance and map its credentials to:
  - `DATABASE_URL`
  - `DATABASE_USERNAME`
  - `DATABASE_PASSWORD`
- Add production secrets:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `APP_FRONTEND_URL`
  - `APP_BASE_URL`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRO_PRICE_ID`
  - `APP_INTELLIGENCE_ENABLED`
  - `APP_INTELLIGENCE_STREAM_ENABLED`
- Health check path: `/actuator/health`
- Optional ingestion/intelligence env vars:
  - `APP_INGESTION_ENABLED`
  - `APP_INGESTION_SCHEDULE_ENABLED`
  - `APP_INGESTION_BOOTSTRAP_ON_STARTUP`
  - `APP_INGESTION_NEWS_*`
  - `APP_INGESTION_COMMODITIES_*`
  - `APP_INGESTION_FX_*`
  - `APP_INGESTION_SANCTIONS_*`
  - `APP_INGESTION_MACRO_*`
  - `APP_INGESTION_TRADE_*`
  - `APP_INTELLIGENCE_CACHE_TTL_MS`
  - `APP_INTELLIGENCE_STREAM_INTERVAL_MS`
  - `APP_INTELLIGENCE_RATE_LIMIT_*`

## Frontend

- Deploy `apps/web` to Cloudflare Pages.
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback is already configured through `apps/web/public/_redirects`, so `/app`, `/account`, and `/replay/:token` work on direct refresh.
- Environment variables:
  - `VITE_API_BASE_URL`
  - `VITE_STRIPE_PUBLISHABLE_KEY`

## Runtime notes

- The backend expects scenario rule JSON files to be available in `packages/scenario-rules/rules` by default.
- Refresh tokens are issued as `HttpOnly` cookies. The frontend must send credentials on refresh requests.
- Logout is handled by `POST /api/auth/logout`, which clears the refresh cookie so the SPA does not silently restore the session on the next load.
- `/api/users/me` is the frontend source of truth for entitlements and operator role.
- The live intelligence layer uses SSE at `/api/intelligence/stream`; keep proxies/CDNs configured for long-lived HTTP responses.
- Admin cache invalidation and ingestion refresh are exposed under `/api/admin/**` and require a user with `role=ADMIN`.
