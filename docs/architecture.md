# MVP architecture

GEOECON WARS ships as a simple monorepo:

- React frontend hosted separately
- Spring Boot backend API
- PostgreSQL as the only required service
- SSE intelligence stream for live observed/forecast snapshots

Not included in the first deploy:

- Redis
- WebSocket fanout
- Analytics pipeline
- Generated shared client contracts
- Separate admin app

The simulation path is synchronous:

1. Frontend posts the selected country and scenario action.
2. Backend validates auth and quota.
3. Backend computes deterministic impacts from global JSON rules for any supported country.
4. Backend persists the simulation and replay token.
5. Backend returns animation-ready asset ranges.
6. Frontend animates the globe overlays and ticker locally.

The intelligence path is additive:

1. Curated adapters ingest public signals into normalized backend storage.
2. The backend exposes `observed`, `forecast`, and SSE stream endpoints.
3. The frontend renders those signals as a separate live layer on the planet.
4. Deterministic scenario simulation remains the source of truth for replayable outcomes.

Operational notes:

- `/api/users/me` returns both `planTier` and `role`.
- Admin operations live inside the account page control plane, not a separate dashboard.
- Ingestion refresh can target all sources or one source key: `news`, `commodities`, `fx`, `sanctions`, `macro`, `trade`.
