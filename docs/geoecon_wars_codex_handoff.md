# GEOECON WARS — Full Codex Handoff

## 1) Product overview

**Product name:** GEOECON WARS

**One-line pitch:**
A viral web app where users trigger economic conflict scenarios on a realistic 3D globe and instantly watch simulated market prices move, then share replay links publicly.

**Goal of MVP:**
Ship a solo-dev, low-cost, production-capable MVP that is visually impressive, fast, secure, mobile-friendly, and easy to evolve.

**Core promise to the user:**
- Click a country on a 3D globe
- Choose an economic conflict action
- See a dramatic but deterministic simulated economic shock
- Watch prices animate in real time
- Share the replay
- Use guest mode for 3 free simulations, then convert to Pro

**Non-goals for MVP:**
- No true geopolitical forecasting engine
- No AI-driven price calculations
- No Kubernetes
- No Kafka
- No complex microservices in production at launch
- No multiplayer at massive scale
- No native mobile app

---

## 2) MVP scope

### In scope
- Guest mode with 3 free simulations
- Email signup/login
- JWT auth
- 3D globe interaction with Cesium
- 5 predefined scenario actions
- Deterministic rules engine based on JSON configs
- Animated price ticker
- Replay page with public share link
- Basic session history
- Stripe checkout for Pro plan
- Responsive UI for desktop/tablet/mobile
- Production deployment with Railway + managed Postgres
- Optional Redis/Redis Streams for cache and lightweight event propagation

### Out of scope
- Real-world predictive accuracy
- AI-generated economics
- Advanced chat / DMs
- User-generated custom rules editor
- Admin dashboard with full BI
- Team workspaces
- Enterprise SSO
- Real-time multiplayer strategy gameplay

---

## 3) Functional requirements

### 3.1 User roles
- **Guest**
  - Can enter app instantly
  - Can run up to 3 simulations total or 3/day depending on config
  - Can view public replays
  - Cannot access premium scenarios
- **Registered Free User**
  - Can save limited history
  - Can run 3 simulations/day
  - Can share replay links
- **Pro User**
  - Higher or unlimited simulation quota
  - Full history
  - Access to premium scenarios and future features
- **Admin** (internal only)
  - Manage scenarios and feature flags

### 3.2 Core user journeys

#### Journey A — Guest viral loop
1. User lands on homepage
2. User sees globe and CTA
3. User clicks Taiwan
4. User chooses “Naval blockade”
5. User sees countdown/feedback
6. Price ticker animates over 10 seconds
7. User gets a replay card and share link
8. After quota exhaustion, user sees paywall modal

#### Journey B — Registered user
1. User signs up or logs in
2. User runs simulations
3. App saves simulation history
4. User opens prior replay
5. User shares replay

#### Journey C — Paid conversion
1. User hits quota or premium scenario gate
2. App opens Stripe checkout
3. User pays
4. Stripe webhook confirms subscription
5. User gains Pro entitlements

### 3.3 Scenario actions in MVP
1. `blocus_naval`
2. `embargo_tech`
3. `cyber_attack`
4. `sanctions_financieres`
5. `alliance_energie`

Each action has:
- key
- label
- description
- affected sectors
- price impacts
- affected countries
- replay text
- optional visual intensity

### 3.4 Simulation behavior
- Simulation inputs:
  - country
  - action
  - duration_hours
  - allies[]
- Simulation outputs:
  - impacts per asset
  - affected countries
  - severity score
  - narrative summary
  - replay metadata
- Simulations must be:
  - deterministic for identical inputs and same rules version
  - quick
  - cacheable
  - auditable

### 3.5 Replay behavior
- Every successful simulation generates a replay object
- Replay can be public via share token URL
- Replay page shows:
  - scenario title
  - impacted country
  - action
  - price deltas
  - animated ticker summary
  - timestamp
  - CTA to try scenario

---

## 4) Non-functional requirements

### Performance
- First meaningful load should feel fast on average 4G/mobile
- Globe should remain interactive during UI updates
- Simulation response target:
  - cached: under 300 ms perceived
  - uncached: under 2 s preferred, under 5 s max
- Price animation happens client-side for smoothness
- Avoid blocking the main thread with heavy UI work

### Availability
- App should degrade gracefully if Redis is unavailable
- App should remain usable if AI narrative generation fails
- Core simulation must still work without optional services
- Health endpoint required

### Scalability
- Design as modular monolith initially
- Ready to split into services later if needed
- Use stateless backend instances where possible
- Keep Postgres as source of truth
- Use caching for repeated scenarios
- Keep websocket fanout lightweight

### Security
- JWT auth with refresh tokens
- Passwords hashed securely with BCrypt/Argon2
- Rate limiting on sensitive endpoints
- Input validation for all request bodies
- Server-side entitlement checks
- Stripe webhook signature verification
- No trusting client-side quota or billing state
- CORS restricted by environment
- Secure headers
- Audit logs for auth, billing, simulation events

### Accessibility
- Keyboard-navigable UI except globe advanced interactions
- Proper contrast on overlays and ticker
- Reduced-motion mode for animations if possible
- Semantic structure for auth/paywall/history UI

### Responsive UI
- Must work on:
  - mobile portrait
  - tablet
  - laptop
  - desktop wide screens
- Globe remains central visual element
- Panels collapse to drawers on small screens
- Ticker remains legible across breakpoints

---

## 5) Recommended architecture

## Architecture choice
**Launch as a modular monolith, not distributed microservices.**

This keeps cost and complexity low while preserving clean separation.

### Logical modules
- `auth`
- `users`
- `simulations`
- `rules`
- `realtime`
- `billing`
- `replay`
- `history`
- `shared`

### Runtime components at MVP
- `web` — React/Vite frontend
- `backend` — Spring Boot app
- `postgres` — primary DB
- `redis` — optional cache/event stream

### Future extraction candidates
If scale justifies it later, extract:
- simulation engine
- realtime gateway
- billing integration

---

## 6) Tech stack

### Frontend
- React 19
- Vite
- TypeScript
- Tailwind CSS
- CesiumJS
- TanStack Query
- Zustand
- Axios
- STOMP/WebSocket client or native WebSocket abstraction
- React Router

### Backend
- Java 21
- Spring Boot 3.5.x
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- Spring WebSocket
- Spring Boot Actuator
- Flyway
- Maven

### Data
- PostgreSQL 16+
- Redis 7+ optional
- Redis Streams optional

### Payments
- Stripe Checkout
- Stripe Webhooks

### Infra
- Railway for backend and database
- Cloudflare Pages or simple static hosting for frontend
- Docker / Docker Compose for local dev
- GitLab for source control
- GitLab CI optional minimal pipeline

---

## 7) Repository structure

```text
geoecon-wars/
  apps/
    backend/
    web/
  packages/
    contracts/
    scenario-rules/
  infra/
    docker/
    railway/
  docs/
```

### Backend structure

```text
apps/backend/src/main/java/com/geoeconwars/
  auth/
  users/
  simulations/
  rules/
  realtime/
  billing/
  replay/
  history/
  shared/
  config/
```

### Frontend structure

```text
apps/web/src/
  app/
  components/
  features/
    auth/
    globe/
    simulation/
    replay/
    billing/
    history/
  hooks/
  services/
  store/
  lib/
  routes/
  styles/
```

---

## 8) Data model

### users
- id (uuid)
- email (unique, nullable for guest if using guest table separately)
- password_hash (nullable for guest)
- role
- plan_tier (`guest`, `free`, `pro`, `admin`)
- created_at
- updated_at

### guest_sessions
- id
- anonymous_token
- simulations_used
- expires_at
- created_at

### daily_usage
- id
- subject_type (`guest`, `user`)
- subject_id
- usage_date
- simulations_used

### subscriptions
- id
- user_id
- stripe_customer_id
- stripe_subscription_id
- status
- current_period_end
- created_at
- updated_at

### simulations
- id
- subject_type
- subject_id
- country_code
- action_key
- duration_hours
- allies_json
- rules_version
- severity_score
- impacts_json
- narrative_json
- cached
- created_at

### replay_links
- id
- simulation_id
- public_token
- is_public
- created_at

### audit_events
- id
- event_type
- actor_type
- actor_id
- metadata_json
- created_at

---

## 9) API design

## Authentication

### POST `/api/auth/guest`
Creates or resumes a guest identity.

Response:
```json
{
  "token": "jwt",
  "refreshToken": "refresh-token",
  "planTier": "guest",
  "simulationsRemaining": 3
}
```

### POST `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

### POST `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

### POST `/api/auth/refresh`
```json
{
  "refreshToken": "..."
}
```

### GET `/api/users/me`
Response includes plan, remaining quota, profile basics.

## Simulations

### POST `/api/simulations/war`
```json
{
  "country": "Taiwan",
  "action": "blocus_naval",
  "duration_hours": 168,
  "allies": ["USA", "Japon"]
}
```

Response:
```json
{
  "success": true,
  "simulationId": "uuid",
  "status": "COMPLETED",
  "cached": false,
  "impacts": {
    "oil": {"delta": 42, "new": 142},
    "semiconductors": {"delta": 300, "new": 450},
    "globalInflation": {"delta": 2.1},
    "tseIndex": {"delta": -15}
  },
  "affectedCountries": ["Germany", "Morocco"],
  "replayUrl": "/replay/abc123"
}
```

### GET `/api/simulations/{id}`
Returns prior simulation.

### GET `/api/history`
Returns recent simulations for current identity.

## Globe / public data

### GET `/api/globe/conflicts`
Returns hotspot overlays and current active scenario markers.

## Billing

### POST `/api/billing/checkout-session`
Creates Stripe Checkout session.

### POST `/api/billing/webhook`
Receives Stripe webhooks.

## Replay

### GET `/api/replays/{token}`
Returns public replay payload.

---

## 10) WebSocket / realtime events

Use websocket for lightweight event fanout.

### Channel examples
- `/topic/prices.global`
- `/topic/simulations/{simulationId}`

### Example event
```json
{
  "type": "PRICE_TWEEN_STARTED",
  "simulationId": "uuid",
  "durationMs": 10000,
  "prices": {
    "oil": {"from": 100, "to": 142},
    "wheat": {"from": 390, "to": 450},
    "eurUsd": {"from": 1.08, "to": 1.05}
  },
  "timestamp": 1760000000
}
```

Important rule: **server sends state transition, client animates locally**.

---

## 11) Rules engine spec

Rules live in versioned JSON files.

Example:
```json
{
  "version": "2026.01",
  "actions": [
    {
      "key": "blocus_naval",
      "country": "Taiwan",
      "baseImpacts": {
        "oil": 42,
        "semiconductors": 300,
        "globalInflation": 2.1,
        "tseIndex": -15
      },
      "affectedCountries": ["Germany", "Morocco", "Japan"],
      "severity": 0.82,
      "narrative": {
        "headline": "Taiwan shipping choke point",
        "summary": "Semiconductor supply shocks ripple through global logistics."
      }
    }
  ]
}
```

### Rules engine requirements
- deterministic output for same input + rules version
- allow optional modifiers by duration and allies count
- clamp values to sane ranges
- reject unknown countries/actions cleanly
- easy to update without code changes

---

## 12) Security requirements

### Authentication and sessions
- Access JWT short-lived
- Refresh token rotation preferred
- Guests get anonymous JWT with limited entitlements
- All protected endpoints require server-side auth checks

### Password handling
- Hash passwords with BCrypt or Argon2
- Never store plaintext
- Enforce basic password policy

### Authorization
- Free/Pro access enforced server-side
- Quota enforced server-side
- Public replay routes do not expose user private data

### API hardening
- Validate all request DTOs
- Return generic auth errors
- Prevent mass assignment
- Limit payload sizes
- Rate limit login, guest creation, checkout, simulation creation

### Billing security
- Verify Stripe webhook signature
- Webhook processing must be idempotent
- Never grant Pro from client redirect alone

### Data security
- Use HTTPS only in production
- Secrets via environment variables / platform secrets
- Restrict CORS to frontend domains
- Add security headers
- Use DB migrations, not manual drift

### Abuse prevention
- IP/user-agent rate limiting for guest creation
- Daily quota tracking
- Replay sharing can be public but should use opaque tokens
- Optional anti-bot protection later

---

## 13) Performance and fluidity requirements

### Frontend fluidity
- Cesium rendering must not be blocked by React rerenders
- Use memoization for heavy overlay components
- Keep ticker animation on client
- Use drawers and overlays carefully on mobile
- Avoid unnecessary websocket update spam

### Backend performance
- Cache identical simulation requests
- Use indexed queries for history and replay lookup
- Avoid synchronous calls to optional AI services on critical path
- Use pagination on history endpoints

### Suggested targets
- Home page interactive under 3 s on decent connection
- Simulation request server time under 2 s for uncached path
- Replay page under 1 s cached

---

## 14) Availability and resilience

- If Redis fails:
  - app still runs
  - cache disabled temporarily
  - websocket can fall back to direct backend event publish if needed
- If Stripe webhook is delayed:
  - keep user in pending billing state until confirmed
- If narrative generation fails:
  - return static fallback narrative
- Use health endpoints:
  - `/actuator/health`
  - optional readiness/liveness split later

---

## 15) UI / UX requirements

## Design principles
- High contrast
- Dramatic but readable
- Minimal clutter
- Focus on the globe
- Panels should feel fast and game-like

## Key screens
1. Landing / home
2. Main simulation screen
3. Replay page
4. Auth modal/screen
5. Pricing modal/page
6. History screen

## Layout behavior

### Desktop
- Globe centered
- Right-side action panel
- Bottom or top live ticker
- Left compact info panel optional

### Tablet
- Globe centered
- Side panel becomes collapsible drawer
- Ticker remains pinned

### Mobile
- Globe top/center
- Bottom sheet for actions
- Ticker horizontal compact strip
- Modals full-screen or drawer style
- Touch targets minimum comfortable size

## UI states to support
- loading
- empty
- error
- rate-limited
- quota-exhausted
- offline-ish / reconnecting websocket

---

## 16) Accessibility and responsive acceptance criteria

### Responsive acceptance
- Works at 320px width and up
- No clipped primary actions
- Ticker remains readable
- Action panel usable one-handed on mobile
- Replay page share button always accessible

### Accessibility acceptance
- Buttons have labels
- Inputs have labels
- Sufficient contrast
- Keyboard focus visible
- Support reduced motion where reasonable

---

## 17) Analytics requirements

Track these events:
- landing_view
- guest_created
- register_completed
- login_completed
- simulation_started
- simulation_completed
- replay_opened
- replay_shared
- paywall_opened
- checkout_started
- subscription_activated

Track these metrics:
- time to first simulation
- simulations per user/day
- replay share rate
- guest to registered conversion
- free to pro conversion
- top scenarios
- cache hit rate

---

## 18) Local development setup

### Required tools
- Java 21
- Node 20+
- Docker
- Docker Compose
- Maven

### Local services
- postgres
- redis optional

### Local run flow
1. `docker compose up -d postgres redis`
2. run backend locally
3. run frontend locally
4. set `.env.local` values

---

## 19) Environment variables

### Backend
- `SPRING_PROFILES_ACTIVE`
- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REDIS_URL`
- `APP_FRONTEND_URL`
- `APP_BASE_URL`

### Frontend
- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_CESIUM_ION_TOKEN` if used

---

## 20) Deployment requirements

### Deploy target
- Railway for backend and Postgres
- Frontend on static host / Cloudflare Pages

### Production requirements
- HTTPS enabled
- Environment secrets configured
- DB migration on deploy
- Healthcheck endpoint configured
- Log aggregation via platform logs acceptable for MVP

### Cost control rules
- Prefer one backend service at launch
- Add Redis only when needed
- Keep websocket usage compact
- Avoid expensive third-party APIs on hot path

---

## 21) Testing strategy

### Backend tests
- Unit tests for rules engine
- Unit tests for quota logic
- Auth tests
- Billing webhook idempotency tests
- Integration tests for simulation endpoint

### Frontend tests
- Component tests for action panel, ticker, paywall
- Hook tests where useful
- Responsive behavior checks

### E2E tests
1. guest login
2. click country
3. run simulation
4. price animation triggered
5. replay available
6. quota gate appears on limit
7. checkout starts

---

## 22) Definition of done for MVP

MVP is done when:
- guest can run a simulation end-to-end
- registered user can log in and see history
- replay page works publicly
- quota gating works correctly
- Stripe subscription flow works via webhook confirmation
- app is usable on mobile and desktop
- health checks pass
- no critical security holes in auth/billing flow

---

## 23) Coding standards for Codex

### General
- Prefer clarity over abstraction
- Keep files small and organized by domain
- Strong typing everywhere possible
- No dead code
- No magic numbers without constants/config

### Backend
- DTOs for requests/responses
- Service layer separate from controllers
- Repositories only for persistence
- Centralized exception handling
- Validation annotations on DTOs
- Flyway migrations for schema changes
- Use records where appropriate

### Frontend
- Feature-based structure
- Typed API client
- Reusable UI primitives
- Avoid global state unless needed
- Keep Cesium integration isolated from business state

---

## 24) What Codex should generate first

### Phase 1 generation order
1. monorepo skeleton
2. backend Spring Boot app with modules
3. frontend Vite React app
4. Docker Compose for local dev
5. Postgres schema + Flyway migrations
6. auth module
7. guest mode
8. simulation endpoint + rules engine
9. globe UI + action panel
10. replay page
11. quota/paywall
12. Stripe integration

---

## 25) Prompts/templates for Codex

## Template A — generate repo skeleton
**Prompt:**
Create a production-oriented monorepo for GEOECON WARS with:
- `apps/backend` as Spring Boot 3.5 Java 21 Maven app
- `apps/web` as React 19 + Vite + TypeScript + Tailwind app
- `packages/contracts` for shared API contracts
- `packages/scenario-rules` for JSON scenario definitions
- `infra/docker` for docker compose
- `docs` for architecture notes
Keep the structure clean and ready for solo-dev MVP work.

## Template B — backend foundation
**Prompt:**
Generate the backend foundation for GEOECON WARS as a modular Spring Boot 3.5 application using Java 21 and Maven. Include:
- modules/packages for auth, users, simulations, rules, realtime, billing, replay, shared, config
- Spring Security with JWT placeholder configuration
- Spring Data JPA
- Flyway
- Actuator
- global exception handling
- request validation
- health endpoint
- application profiles for local and prod
Do not add unnecessary abstraction.

## Template C — auth and guest mode
**Prompt:**
Implement authentication for GEOECON WARS with:
- guest login endpoint
- register endpoint
- login endpoint
- refresh token endpoint
- JWT-based access control
- password hashing
- daily quota tracking for guest/free users
- DTOs, validation, service layer, repository layer, error handling
Use Postgres entities and Flyway migrations.

## Template D — rules engine
**Prompt:**
Implement a deterministic simulation rules engine for GEOECON WARS.
Requirements:
- load scenario rules from JSON files
- support action lookup by country and action key
- apply optional duration and allies modifiers
- return stable output for same inputs
- expose a service method used by simulation controller
- include unit tests for deterministic output and invalid input handling

## Template E — simulation API
**Prompt:**
Implement the simulation API for GEOECON WARS.
Requirements:
- POST `/api/simulations/war`
- validate quotas server-side
- execute deterministic rules engine
- persist simulation history
- create replay record with public token
- return impacts and replay URL
- optionally cache identical requests
- publish a realtime event payload for client-side price animation
Include DTOs, service, repository, controller, and tests.

## Template F — frontend shell
**Prompt:**
Create the GEOECON WARS frontend shell using React 19, Vite, TypeScript, Tailwind, React Router, TanStack Query, and Zustand.
Include:
- landing page
- main simulation page
- responsive layout
- theme tokens for dramatic dark UI
- mobile, tablet, desktop responsive behavior
- API client abstraction
- route structure
Do not use overcomplicated state management.

## Template G — Cesium globe page
**Prompt:**
Implement the main globe interaction page for GEOECON WARS using CesiumJS in React.
Requirements:
- render a globe
- allow clicking supported countries
- show selected country state
- open an action panel
- submit a simulation request
- react smoothly without excessive rerenders
- work responsively on desktop and mobile
Keep Cesium integration isolated and maintainable.

## Template H — price ticker and realtime
**Prompt:**
Implement a live price ticker and realtime event handling for GEOECON WARS.
Requirements:
- receive server event with start/end prices and duration
- animate prices client-side over time
- show asset deltas clearly
- handle reconnecting websocket state
- work on small and large screens
- avoid janky re-rendering

## Template I — replay page
**Prompt:**
Implement the public replay page for GEOECON WARS.
Requirements:
- fetch replay by token
- display scenario summary, impacted country, price deltas, timestamp
- include share CTA and try-now CTA
- responsive layout
- SEO-friendly metadata where reasonable
- handle invalid token gracefully

## Template J — billing
**Prompt:**
Implement Stripe billing for GEOECON WARS.
Requirements:
- create checkout session endpoint
- process Stripe webhook securely
- verify webhook signature
- update subscription state idempotently
- expose user entitlements endpoint
- gate Pro features server-side
- include tests for webhook processing

## Template K — hardening pass
**Prompt:**
Review the GEOECON WARS codebase and improve:
- security
- input validation
- error handling
- performance hotspots
- responsive UI consistency
- accessibility basics
- logging and observability
Produce code changes only where they improve maintainability and MVP reliability.

---

## 26) Final instructions to Codex

Build for:
- solo dev maintainability
- low hosting cost
- fast perceived UX
- secure auth and billing
- easy future extraction into services

Do not:
- introduce Kubernetes
- introduce Kafka
- introduce unnecessary CQRS/event-sourcing complexity
- use AI for core calculations
- overengineer the domain

Optimize for:
- shipping quickly
- visual wow effect
- replay sharing
- clear code
- responsive UI
- reliable billing/auth flow

