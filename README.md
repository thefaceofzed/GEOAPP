# GEOECON WARS

First-deploy MVP for a shareable geopolitical market-shock simulator.

## Structure

- `apps/backend` Spring Boot API
- `apps/web` React + Vite frontend
- `packages/scenario-rules` versioned simulation rules
- `infra/docker` local development services
- `docs` product and deployment documentation

## Local development

1. Start Postgres:

```powershell
docker compose -f infra/docker/docker-compose.yml up -d
```

2. Run backend from `apps/backend`:

```powershell
.\mvnw.cmd spring-boot:run
```

3. Run frontend from `apps/web`:

```powershell
npm install
npm run dev
```

4. Optional browser smoke tests from `apps/web`:

```powershell
npm run test:e2e
```

## MVP scope

- Guest entry with 3 lifetime simulations
- Free users with 3 simulations per day
- Pro subscription via Stripe
- Planet-first 3D simulation UI with any-country selection
- Five deterministic scenario actions: `war`, `embargo`, `sanctions`, `cyberattack`, `alliance`
- Public replay pages
- Logout flow with refresh-cookie invalidation
- Live `Observed` and `Forecast` overlays backed by backend intelligence endpoints
- Admin control plane embedded in the account page for privileged users

## Signal ingestion

The backend now includes an opt-in ingestion layer that enriches simulation explanations with curated public signals.

- Sources: GDELT news API, Frankfurter FX API, Stooq commodity quotes, OFAC sanctions XML, FRED macro releases, World Bank trade exposure indicators
- Storage: normalized metadata only, short extracted summaries, derived sentiment/severity, and deduplicated raw reference IDs
- Use: ranked `supportingSignals` are attached to simulation and replay responses without changing the deterministic rules engine
- Activation: enable the `APP_INGESTION_*` flags in `apps/backend/.env.example`
- Operations: admins can refresh all sources or a single source from `/account`, and can invalidate observed/forecast intelligence caches
