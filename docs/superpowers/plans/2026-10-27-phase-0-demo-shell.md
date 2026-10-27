# Phase 0 — Demo Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, log-in-able web app that shows the full product shell (sidebar, top bar, every page as a stub) on seeded dummy data, with Supabase-backed login, an entitlement library, and a minimal read-only admin — reachable at a free demo URL via one manual deploy command.

**Architecture:** pnpm monorepo. `apps/api` is a NestJS modular monolith (REST under `/api/v1`, Drizzle ORM, Postgres schemas per module). **Authentication is delegated to Supabase Auth (D22)**: the web app signs users in with Supabase and sends the access token as `Authorization: Bearer`; the API only verifies the token and maps it to its own `identity.users` row (roles and everything else live in our DB). `apps/web` is Next.js (App Router, Tailwind); the browser calls its own origin and Next rewrites `/api/*` to the API. App data is in Neon Postgres (PGlite in tests); no Redis (D18).

**Tech Stack:** Node 22 LTS, pnpm 9, TypeScript 5, NestJS 10, Drizzle ORM + drizzle-kit, `pg`, `@electric-sql/pglite` (tests), `jose` (JWT verification), `uuidv7`, `@supabase/supabase-js` + `@supabase/ssr`, Jest + supertest (API), Next.js 15 + React 19 + Tailwind + Vitest + Testing Library (web), Vercel (web), Render (API), Neon (app DB), Supabase (auth only).

**Spec:** `docs/specs/README.md` → read `00-overview.md` §6, `01-architecture.md` §2/§2a/§5, `02-auth-onboarding-profile.md` (note the D22 implementation note at its top), `03-subscriptions-entitlements.md` (mechanism only), `05-learn-content.md` §6 (tables), `18-admin-console.md` §2. Roadmap: `docs/specs/99-roadmap.md` §2 Phase 0. Decisions: `docs/specs/DECISIONS.md` D15–D22.

## Global Constraints
- API prefix `/api/v1`; JSON errors always `{"error":{"code":string,"message":string,...}}`.
- Ids are UUIDv7 (`newId()`); timestamps `timestamptz` UTC; default user timezone `Asia/Kolkata`; `locale` default `'en'`.
- Postgres schemas per module (`identity`, `billing`, `catalog`); cross-schema foreign keys only to `identity.users` and `catalog.syllabus_nodes`.
- **The API trusts only a verified Supabase JWT** (valid signature, `iss = {SUPABASE_URL}/auth/v1`, `aud = 'authenticated'`, not expired). **Roles/authorisation come only from `identity.users.roles` — never from token claims or `user_metadata`.**
- `identity.users` is keyed by our own UUIDv7 `id` with a unique `(authProvider, authSubject)`; the table is provider-agnostic so auth can be swapped later.
- Emails stored normalised (`trim().toLowerCase()`).
- Password policy (min 12 characters, "Confirm email" off for demo) is configured in the Supabase dashboard (see Task 14 owner setup); the web forms also state "at least 12 characters".
- Roles: `student`, `mentor`, `content_editor`, `moderator`, `admin`; a user may hold several.
- Nav groups and labels exactly as in `00-overview.md` §6 (group headings render upper-case).
- Redis not used (D18); no CI/CD (D19); no payments/video (D20).
- Admin 2FA (Supabase MFA) is deferred to Phase 9; email confirmation and forgot-password pages are deferred (Supabase supports both; just not built in Phase 0).
- The browser never calls a cross-origin API URL; everything goes through `/api/*` on the web origin. Service-role keys are used only by the seed CLI on the developer's machine and are never deployed.

## Review Focus
1. Forged, expired, wrong-issuer or wrong-audience JWT → 401, and a `user_metadata.roles` claim must not grant roles (Task 4).
2. Two simultaneous first requests for a brand-new Supabase user → exactly one `identity.users` row (Task 4).
3. Running the seed twice (including when the Supabase users already exist) → no duplicates, no failure (Task 7).
4. A logged-in student calling `/admin/*` API or opening `/admin` in the web app → 403 / redirect, never data (Tasks 8, 13).
5. `return_to` like `//evil.com`, `https://evil.com`, `/\evil.com` after login or OAuth callback → ignored, user lands on `/home` (Task 10).

## File Structure
```
upsc/
  package.json, pnpm-workspace.yaml, tsconfig.base.json, .nvmrc, .gitignore, .env.example, README.md
  scripts/deploy.sh, scripts/smoke.sh
  apps/api/
    package.json, tsconfig.json, jest.config.ts, drizzle.config.ts, Dockerfile, render.yaml
    drizzle/                       # generated SQL migrations (committed)
    seed-data/{syllabus,subjects,lessons}.json
    src/main.ts, app.module.ts
    src/common/{config.ts,errors.ts,error.filter.ts}
    src/db/{db.module.ts,ids.ts,schema/{identity.ts,billing.ts,catalog.ts,index.ts}}
    src/health/health.controller.ts
    src/identity/{identity.module.ts,token-verifier.ts,supabase-token-verifier.ts,users.service.ts,auth.guard.ts,roles.guard.ts,decorators.ts,me.controller.ts}
    src/billing/{feature-keys.ts,entitlements.service.ts,entitlement.guard.ts,billing.module.ts}
    src/catalog/{catalog.module.ts,catalog.controller.ts,catalog.service.ts}
    src/admin/{admin.module.ts,admin.controller.ts}
    src/seed/{run-seed.ts,cli.ts,auth-admin.ts,seed-identity.ts,seed-billing.ts,seed-catalog.ts}
    test/{db.ts,app.ts,tokens.ts}  and  *.spec.ts / *.e2e-spec.ts beside code
  apps/web/
    package.json, next.config.ts, tailwind.config.ts, vitest.config.ts, middleware.ts
    src/styles/{tokens.css,globals.css}
    src/lib/{api.ts,server-api.ts,supabase-browser.ts,supabase-server.ts,safe-redirect.ts,nav.ts,sample-data.ts}
    src/components/{AppShell.tsx,Sidebar.tsx,TopBar.tsx,UserMenu.tsx,AskAiPanel.tsx,StubPage.tsx,Icon.tsx,AuthCard.tsx,SubjectCard.tsx,AdminNav.tsx}
    src/app/(auth)/{login/page.tsx,signup/page.tsx}
    src/app/auth/callback/route.ts
    src/app/(app)/{layout.tsx,home/page.tsx,learn/page.tsx,<one stub route per nav item>}
    src/app/admin/{layout.tsx,page.tsx,users/page.tsx,plans/page.tsx}
  docs/demo/phase-0.md
```

---

### Task 1: Repository scaffold and tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc` (`22`), `.gitignore`, `.env.example`, `README.md`

**Interfaces:**
- Produces: workspace packages `@upsc/api` (`apps/api`) and `@upsc/web` (`apps/web`); root scripts `pnpm dev`, `pnpm test`, `pnpm build`; `.env.example` listing every env var used in this plan (API: `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (optional, HS256 projects), `NODE_ENV`; web: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_ENABLED`, `API_ORIGIN`; seed/deploy only: `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`, `RENDER_DEPLOY_HOOK_URL`).

- [ ] **Step 1:** Verify toolchain: `node -v` (expect `v22.x` or ≥ v20) and `pnpm -v` (expect ≥ 9). If missing, install via `corepack enable` / nvm and re-run.
- [ ] **Step 2:** Run `git init -b main` in `/Users/gagan-home-mac/Documents/GitHub/upsc` (not yet a repository); `.gitignore` covers `node_modules`, `.next`, `dist`, `.env*` (except `.env.example`), `*.log`, `.vercel`.
- [ ] **Step 3:** Create the workspace files; root `package.json` scripts delegate with `pnpm -r`. `README.md`: prerequisites, `cp .env.example .env`, `pnpm install`, `pnpm dev`, `pnpm test`, link to `docs/specs/README.md`.
- [ ] **Step 4:** Run `pnpm install` (expect success) and `git add -A && git commit -m "chore: scaffold monorepo"` (includes existing `docs/` and `CLAUDE.md`).

---

### Task 2: API skeleton — config, errors, health

**Files:**
- Create: `apps/api/package.json`, `tsconfig.json`, `jest.config.ts`, `src/main.ts`, `src/app.module.ts`, `src/common/config.ts`, `src/common/errors.ts`, `src/common/error.filter.ts`, `src/health/health.controller.ts`, `test/app.ts`
- Test: `apps/api/src/common/config.spec.ts`, `apps/api/src/health/health.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `interface AppConfig { port: number; databaseUrl: string; webOrigin: string; supabase: { url: string; jwtSecret?: string }; demoPassword: string; production: boolean }`
  - `loadConfig(env: NodeJS.ProcessEnv): AppConfig` — defaults `port 4000`, `webOrigin http://localhost:3000`; throws `Error` naming the missing variable when `DATABASE_URL` or `SUPABASE_URL` is absent.
  - `class AppError extends HttpException { constructor(status: number, code: string, message: string, extra?: Record<string, unknown>) }`
  - `createTestApp(overrides?: { config?: Partial<AppConfig> }): Promise<{ app: INestApplication; db: Db; close(): Promise<void> }>` in `test/app.ts` (DB wiring completed in Task 3).
  - Global prefix `api/v1`; global `ErrorFilter` renders every exception as `{error:{code,message,...extra}}` (unknown errors → 500 `internal_error`, no stack in body).

- [ ] **Step 1:** Write `config.spec.ts`: `loadConfig({DATABASE_URL:'postgres://x',SUPABASE_URL:'https://p.supabase.co'})` returns `port 4000`, `production false`; missing `DATABASE_URL` or `SUPABASE_URL` throws with the variable name; `NODE_ENV=production` → `production true`.
- [ ] **Step 2:** Write `health.e2e-spec.ts` (supertest): `GET /api/v1/health` → 200 `{status:'ok'}`; `GET /api/v1/nope` → 404 `{error:{code:'not_found'}}`; a throwaway controller throwing `new AppError(409,'x_conflict','m')` renders `{error:{code:'x_conflict',message:'m'}}`.
- [ ] **Step 3:** Run `pnpm --filter @upsc/api test` → expect FAIL.
- [ ] **Step 4:** Implement; `main.ts` sets the prefix, `app.set('trust proxy', 1)`, and listens on `config.port`. Health returns `{status:'ok'}` (the `db` field arrives in Task 3).
- [ ] **Step 5:** Run tests → PASS. Run `pnpm --filter @upsc/api start` and `curl localhost:4000/api/v1/health` → `{"status":"ok"}`.
- [ ] **Step 6:** Commit `feat(api): skeleton with config, error envelope, health`.

---

### Task 3: Database layer, identity schema, test database helper

**Files:**
- Create: `apps/api/drizzle.config.ts`, `src/db/db.module.ts`, `src/db/ids.ts`, `src/db/schema/identity.ts`, `src/db/schema/index.ts`, `test/db.ts`, generated `drizzle/0000_*.sql`
- Modify: `src/health/health.controller.ts` (add `db` status), `src/app.module.ts`, `test/app.ts`
- Test: `apps/api/src/db/identity.schema.spec.ts`

**Interfaces:**
- Produces:
  - `type Db = PgDatabase<any, any, any>`; provider token `export const DB = Symbol('DB')`; `DbModule.forRoot(config)` creates a `pg` Pool from `databaseUrl` (SSL on when the URL contains `neon.tech` or `sslmode=require`).
  - `newId(): string` — UUIDv7.
  - `createTestDb(): Promise<{ db: Db; close(): Promise<void> }>` — uses `TEST_DATABASE_URL` if set (fresh schema per run), else in-process PGlite; applies all `drizzle/` migrations.
  - Schema `identity`: `users(id, authProvider default 'supabase', authSubject, email, name, roles text[] default {student}, timezone default 'Asia/Kolkata', locale default 'en', status default 'active', createdAt, lastLoginAt)` with unique `(authProvider, authSubject)` and unique index on `lower(email)`; `profiles(userId pk→users, displayName, avatarUrl null, bio null)`.
  - `db:generate` and `db:migrate` scripts in `apps/api/package.json` (`db:migrate` reads `DATABASE_URL`).

- [ ] **Step 1:** Write `identity.schema.spec.ts` with `createTestDb()`: inserting users with emails `alice@example.com` then `Alice@Example.com` rejects (unique violation); two users with the same `(authProvider, authSubject)` reject; a user inserted without `roles`/`timezone`/`locale` reads back `['student']`, `'Asia/Kolkata'`, `'en'`; a `profiles` row referencing a missing user rejects (FK).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement schema with `pgSchema('identity')`, run `pnpm --filter @upsc/api db:generate`, check the SQL contains `CREATE SCHEMA "identity"`; implement `createTestDb` and `DbModule`. If PGlite cannot run under Jest here, require `TEST_DATABASE_URL` and say so in `README.md` (keep the helper's signature).
- [ ] **Step 4:** Update the health e2e test to expect `{status:'ok', db:'up'}` via `createTestApp`; run all API tests → PASS.
- [ ] **Step 5:** Commit `feat(api): drizzle, identity schema, test db helper`.

---

### Task 4: Supabase token verification, user provisioning, roles

**Files:**
- Create: `src/identity/{identity.module.ts,token-verifier.ts,supabase-token-verifier.ts,users.service.ts,auth.guard.ts,roles.guard.ts,decorators.ts,me.controller.ts}`, `test/tokens.ts`
- Modify: `src/app.module.ts`
- Test: `src/identity/supabase-token-verifier.spec.ts`, `src/identity/me.e2e-spec.ts`

**Interfaces:**
- Consumes: `Db`, `DB`, `AppConfig`, `AppError`, `newId()`.
- Produces:
  - `interface AuthClaims { sub: string; email: string; name?: string; emailVerified: boolean }`
  - `abstract class TokenVerifier { abstract verify(token: string): Promise<AuthClaims> }` — throws `AppError(401,'unauthenticated',…)` for any invalid token.
  - `SupabaseTokenVerifier implements TokenVerifier` (uses `jose`): when `config.supabase.jwtSecret` is set verifies HS256 with it, otherwise verifies against the project's JWKS at `${url}/auth/v1/.well-known/jwks.json` (`createRemoteJWKSet`); checks `iss`, `aud === 'authenticated'`, `exp`; name from `user_metadata.full_name`/`name`.
  - `interface UserView { id: string; email: string; name: string; roles: string[]; timezone: string; locale: string }`
  - `UsersService.resolve(claims: AuthClaims): Promise<UserView>` — finds by `(supabase, sub)`, else creates `users` (roles `['student']`) + `profiles` in one transaction using `ON CONFLICT DO NOTHING` then re-select (race-safe); updates `lastLoginAt` at most once per 5 minutes; syncs changed email.
  - `AuthGuard` (reads `Authorization: Bearer`, sets `req.user: UserView`, 401 `unauthenticated` otherwise), `@CurrentUser()`, `@Roles(...roles: string[])` + `RolesGuard` (403 `forbidden`).
  - `GET /me` → `{user: UserView}`.
  - `test/tokens.ts`: `signTestToken(claims: Partial<{sub;email;iss;aud;exp;user_metadata}>, secret?: string): Promise<string>` (HS256 via `jose`).

- [ ] **Step 1:** Write `supabase-token-verifier.spec.ts` (HS256 test secret): valid token → claims `{sub,email,emailVerified}`; expired → throws code `unauthenticated`; wrong `iss` → throws; wrong `aud` → throws; signed with a different secret (forged) → throws; garbage string → throws (**Review Focus 1**).
- [ ] **Step 2:** Write `me.e2e-spec.ts` (real verifier with test secret via `createTestApp`): no header → 401 `unauthenticated`; valid token for a new `sub` → 200, user email lowercased, roles `['student']`, exactly one `users` and one `profiles` row after the call; a token whose `user_metadata` contains `roles:['admin']` still yields `['student']` (**Review Focus 1**); five parallel `/me` calls for a new `sub` leave exactly one `users` row (**Review Focus 2**); a route with `@Roles('admin')` → 403 for the student and 200 after the user's `roles` is set to `['admin']` in the DB.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement. **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat(api): supabase jwt verification, user provisioning, roles`.

---

### Task 5: Entitlement library

**Files:**
- Create: `src/db/schema/billing.ts`, `src/billing/{feature-keys.ts,entitlements.service.ts,entitlement.guard.ts,billing.module.ts}`, generated migration
- Modify: `src/db/schema/index.ts`, `src/app.module.ts`
- Test: `src/billing/entitlements.service.spec.ts`, `src/billing/entitlement.guard.e2e-spec.ts`

**Interfaces:**
- Consumes: `Db`, `UserView`, `AuthGuard`.
- Produces:
  - `export const FEATURE_KEYS = ['ai.ask.message','ai.mcq.generate','ai.mains.evaluate','ai.plan.weekly','practice.mock.full','practice.all_india','learn.content.premium','notes.offline','progress.advanced','forum.post','messages.send','planner.calendar_sync','revision.basic'] as const; type FeatureKey = typeof FEATURE_KEYS[number]` (13 keys).
  - Schema `billing`: `featureCatalog(key pk, name, type 'boolean'|'limit', defaultPeriod)`, `plans(id, key unique, name, isDefault, status)`, `planEntitlements(planId, featureKey, enabled, limitValue null, period 'day'|'week'|'month'|'lifetime'|'none')` pk `(planId, featureKey)`, `subscriptions(id, userId→users, planId, status, currentPeriodEnd null)`, `entitlementOverrides(id, userId→users, featureKey, enabled, limitValue null, period, expiresAt null, reason)`, `usageCounters(userId, featureKey, windowStart, count)` pk `(userId, featureKey, windowStart)`.
  - `type CheckResult = { allowed: true; remaining: number | null } | { allowed: false; reason: 'entitlement_required' | 'quota_exceeded'; resetsAt?: Date }`
  - `EntitlementsService`: `check(userId: string, key: FeatureKey, cost?: number): Promise<CheckResult>`; `consume(userId: string, key: FeatureKey, cost?: number): Promise<void>` (atomic; denial throws `AppError(402,'entitlement_required',…)` or `AppError(429,'quota_exceeded',…,{resetsAt})`); `usage(userId: string): Promise<Array<{key: FeatureKey; used: number; limit: number | null; resetsAt: Date | null}>>`. Resolution: unexpired override → active subscription plan → default plan → deny. Day windows start 00:00 in the user's `timezone`; week = Monday; month = calendar month.
  - `@RequiresEntitlement(key: FeatureKey, cost?: number)` + `EntitlementGuard` (runs after `AuthGuard`; calls `consume`).

- [ ] **Step 1:** Write `entitlements.service.spec.ts` (test DB; default plan `free` with `ai.ask.message` limit 3/day, `notes.offline` disabled, `forum.post` boolean enabled): within limit → `allowed` with `remaining` 2 after one consume; fourth consume throws `quota_exceeded` with `resetsAt` = next 00:00 Asia/Kolkata; `notes.offline` → `entitlement_required`; an override with `limitValue 10` beats the plan; an expired override is ignored; a subscription to a plan with a higher limit applies; two concurrent `consume` calls at count 2 of limit 3 → exactly one succeeds.
- [ ] **Step 2:** Write `entitlement.guard.e2e-spec.ts`: a test-only route decorated `@RequiresEntitlement('notes.offline')` returns 402 `entitlement_required` for a free-plan student and 200 once an override is inserted.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement; counter increment is one `INSERT … ON CONFLICT DO UPDATE … WHERE count + cost <= limit RETURNING` statement. **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat(api): entitlement library`.

---

### Task 6: Catalog tables and read-only subjects endpoint

**Files:**
- Create: `src/db/schema/catalog.ts`, `src/catalog/{catalog.module.ts,catalog.controller.ts,catalog.service.ts}`, generated migration
- Test: `src/catalog/catalog.e2e-spec.ts`

**Interfaces:**
- Produces:
  - Schema `catalog` (spec 05 §6, Phase-0 subset): `syllabusNodes(id, parentId null, path, level, examStage, paper, title, slug unique, order, status)`, `subjects(id, syllabusNodeId→syllabusNodes, slug unique, title, description, gsPaper, order, entitlementKey null, status)`, `modules(id, subjectId, title, order, summary, required, status)`, `activities(id, moduleId, type 'lesson'|'quiz'|'assignment'|'pyq_set'|'revision'|'resource', title, order, required, estMinutes, status)`, `lessons(activityId pk, summary, bodyBlocks jsonb, verificationStatus default 'platform_sample', locale default 'en')`.
  - `interface SubjectSummary { id: string; slug: string; title: string; gsPaper: string; moduleCount: number; lessonCount: number }`; `CatalogService.listSubjects(): Promise<SubjectSummary[]>` (published only, ordered by `order`).
  - `GET /learn/subjects` (requires `AuthGuard`) → `{subjects: SubjectSummary[]}`.

- [ ] **Step 1:** Write `catalog.e2e-spec.ts`: unauthenticated → 401; after inserting 2 subjects (one with 2 modules and 3 lessons, one `status:'draft'`) an authenticated call returns only the published one with `moduleCount 2`, `lessonCount 3`, and no `bodyBlocks` anywhere in the payload.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (one aggregate query, no N+1). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): catalog schema and subjects endpoint`.

---

### Task 7: Seed framework and demo dataset

**Files:**
- Create: `src/seed/{run-seed.ts,cli.ts,auth-admin.ts,seed-identity.ts,seed-billing.ts,seed-catalog.ts}`, `seed-data/{syllabus.json,subjects.json,lessons.json}`
- Modify: `apps/api/package.json` (script `seed` → `ts-node src/seed/cli.ts`)
- Test: `src/seed/run-seed.spec.ts`

**Interfaces:**
- Consumes: all schemas, `FEATURE_KEYS`, `newId()`.
- Produces:
  - `interface AuthAdmin { ensureUser(i: { email: string; password: string; name: string }): Promise<{ subject: string }> }` — `SupabaseAuthAdmin` (service-role `supabase-js` admin API; creates the user with `email_confirm: true`, or returns the existing user's id when it already exists) and a `FakeAuthAdmin` used in tests (deterministic subject per email).
  - `interface SeedReport { users: number; plans: number; subjects: number; modules: number; activities: number; lessons: number }`
  - `runSeed(db: Db, opts: { demoPassword: string; authAdmin: AuthAdmin }): Promise<SeedReport>` — idempotent; each seeder is `(db: Db, ctx: { demoPassword: string; authAdmin: AuthAdmin }) => Promise<void>` upserting on natural keys (`lower(email)`, `plans.key`, `subjects.slug`, composite keys for children). Later phases add `seed-*.ts` files and register them in `run-seed.ts`.
  - Dataset: users `student@example.com` ("Vinayaka", roles `['student']`) and `admin@example.com` ("Admin", roles `['admin']`), both created in Supabase and linked via `authSubject`; plan `free` (default) with every `FEATURE_KEYS` entry enabled and generous limits (e.g. `ai.ask.message` 50/day); a small syllabus tree (Prelims GS Paper I; Mains GS I–IV); **8 subjects** (Indian Polity, History, Geography, Economy, Environment, Science & Technology, Ethics, CSAT) with Polity = 4 modules / 12 activities (6 lessons), History = 2 modules / 5 activities (3 lessons), each other subject = 1 module / 1 lesson; lesson bodies are short block JSON marked `verificationStatus 'platform_sample'`.
  - CLI: `pnpm --filter @upsc/api seed` reads `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`; prints the `SeedReport`.

- [ ] **Step 1:** Write `run-seed.spec.ts` (test DB + `FakeAuthAdmin`): first run returns `{users:2, plans:1, subjects:8, modules:12, activities:23, lessons:15}`; second run returns the same and per-table row counts are unchanged (**Review Focus 3**); the seeded admin row has roles `['admin']` and the student `['student']`; `authSubject` equals the fake admin's subject for that email; the `free` plan has an entitlement row for each of the 13 `FEATURE_KEYS`; `FakeAuthAdmin.ensureUser` called twice for the same email returns the same subject.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Against a local database and the owner's Supabase project (after Task 14 setup items 1–2), run `db:migrate` then `seed` twice; expect the same `SeedReport` printed both times.
- [ ] **Step 6:** Commit `feat(api): idempotent seed framework and demo dataset`.

---

### Task 8: Admin API (read-only)

**Files:**
- Create: `src/admin/{admin.module.ts,admin.controller.ts}`
- Test: `src/admin/admin.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuthGuard`, `RolesGuard`, `@Roles`, schemas.
- Produces:
  - `GET /admin/users?limit=&cursor=` → `{users: Array<{id,email,name,roles,status,createdAt,lastLoginAt}>, nextCursor: string|null}` (limit default 25, max 100; cursor = last `createdAt,id`); no auth-provider internals (`authSubject`) in the payload.
  - `GET /admin/plans` → `{plans: Array<{key,name,isDefault,entitlements: Array<{featureKey,enabled,limitValue,period}>}>}`.
  - Both require role `admin`.

- [ ] **Step 1:** Write `admin.e2e-spec.ts` with seeded data and test tokens: student → 403 `forbidden` on both endpoints with no user data in the body (**Review Focus 4**); no token → 401; admin → users include both seeded emails and no `authSubject` key, `limit=1` returns `nextCursor` and following it returns the other user; plans returns `free` with 13 entitlements.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(api): read-only admin endpoints`.

---

### Task 9: Web scaffold, design tokens, API proxy, Supabase clients

**Files:**
- Create: `apps/web/` (Next.js app via `create-next-app`: TypeScript, Tailwind, App Router, `src/` dir), `src/styles/tokens.css`, `src/lib/{api.ts,server-api.ts,supabase-browser.ts,supabase-server.ts}`, `vitest.config.ts`
- Modify: `apps/web/next.config.ts`, `src/app/layout.tsx`, `tailwind.config.ts`
- Test: `src/lib/api.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; code: string }`; `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` — prefixes `/api/v1`, JSON, adds `Authorization: Bearer <access_token>` from the browser Supabase session when one exists, throws `ApiError` from the `{error:{code,message}}` envelope.
  - `serverApi<T>(path: string): Promise<T>` — server-only; calls `${API_ORIGIN}/api/v1${path}` with the bearer token from the server Supabase client (cookies); throws `ApiError(401,'unauthenticated')` when no session.
  - `createBrowserSupabase()` and `createServerSupabase()` (using `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
  - `next.config.ts` rewrite `/api/:path*` → `${API_ORIGIN}/api/:path*`.
  - `tokens.css` CSS variables (`--color-primary`, `--color-sidebar`, `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-danger`, radii, spacing) wired into the Tailwind theme.

- [ ] **Step 1:** Write `api.test.ts` (Vitest, mocked `fetch` and Supabase client): with a session, requests carry `Authorization: Bearer abc`; without a session no header; success returns parsed JSON; a 401 `{error:{code:'unauthenticated',message:'x'}}` throws `ApiError` with `status 401`, `code 'unauthenticated'`; a non-JSON error body → `ApiError` with code `network_error`.
- [ ] **Step 2:** Run `pnpm --filter @upsc/web test` → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Tokens: call the Figma MCP `get_variable_defs` for file `6iaUE9cOXWyq5SbDe5esKm`, node `7:1681`. If it returns colour variables, map them into `tokens.css`; if empty, use the approximations in `docs/specs/README.md` (primary ≈ `#0F766E`, sidebar ≈ `#13233A`, light grey-blue canvas, white cards, Inter) with the comment `/* derived from screenshots; replace when Figma variables exist */`. Load Inter via `next/font`.
- [ ] **Step 6:** Verify: start API + web (`pnpm dev`); `curl localhost:3000/api/v1/health` → `{"status":"ok","db":"up"}` (proves the proxy).
- [ ] **Step 7:** Commit `feat(web): scaffold, tokens, api client, supabase clients, proxy`.

---

### Task 10: Auth screens, OAuth callback, route protection

**Files:**
- Create: `src/lib/safe-redirect.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/auth/callback/route.ts`, `middleware.ts`, `src/components/AuthCard.tsx`
- Test: `src/lib/safe-redirect.test.ts`, `src/app/(auth)/login/login.test.tsx`, `src/app/auth/callback/route.test.ts`

**Interfaces:**
- Consumes: `createBrowserSupabase`, `createServerSupabase`.
- Produces:
  - `safeReturnTo(raw: string | null | undefined, fallback?: string): string` — fallback default `'/home'`; accepts only strings starting with exactly one `/` followed by a char that is neither `/` nor `\`, with no scheme or control characters.
  - Login (`/login`): email, password, "Continue with Google" (shown only when `NEXT_PUBLIC_GOOGLE_ENABLED === 'true'`; calls `signInWithOAuth({provider:'google', options:{redirectTo: <origin>/auth/callback?return_to=<encoded safe path>}})`), signup link; inline messages for `invalid_credentials`, over-limit errors, and `?error=` values. Signup (`/signup`): name, email, password (hint "at least 12 characters"), terms checkbox, Google button; shows `weak_password` / `user_already_exists` inline. Based on Figma frames `308:43045` and `308:43052`.
  - `GET /auth/callback?code&return_to` route handler: exchanges `code` with `exchangeCodeForSession`, then redirects to `safeReturnTo(return_to)`; on exchange failure redirects to `/login?error=oauth_failed`.
  - `middleware.ts`: refreshes the Supabase session cookie on each request; requests to app routes or `/admin` without a user → redirect `/login?return_to=<path>`; `/login`/`/signup` with a user → `/home`.

- [ ] **Step 1:** Write `safe-redirect.test.ts`: `'/learn'`→`'/learn'`; `'/learn?x=1'` kept; `null`→`'/home'`; `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'javascript:alert(1)'`, `'/%0d%0a'` → `'/home'` (**Review Focus 5**).
- [ ] **Step 2:** Write `login.test.tsx` (mocked Supabase client): submit calls `signInWithPassword({email,password})` then `router.replace(safeReturnTo(returnTo))`; with `return_to=//evil.com` navigates to `/home`; an `invalid_credentials` error renders "Email or password is incorrect" and keeps the typed email; button disabled while pending; Google button hidden when `NEXT_PUBLIC_GOOGLE_ENABLED` unset, and when shown calls `signInWithOAuth` with `redirectTo` containing `/auth/callback?return_to=%2Fhome`.
- [ ] **Step 3:** Write `callback/route.test.ts`: valid code + `return_to=/learn` → redirect `/learn`; `return_to=//evil.com` → redirect `/home` (**Review Focus 5**); exchange error → redirect `/login?error=oauth_failed`.
- [ ] **Step 4:** Run → FAIL. **Step 5:** Implement. **Step 6:** Run → PASS.
- [ ] **Step 7:** Commit `feat(web): login, signup, oauth callback, safe redirects, route protection`.

---

### Task 11: App shell, navigation and stub pages

**Files:**
- Create: `src/lib/nav.ts`, `src/components/{AppShell.tsx,Sidebar.tsx,TopBar.tsx,UserMenu.tsx,AskAiPanel.tsx,StubPage.tsx,Icon.tsx}`, `src/app/(app)/layout.tsx`, one `page.tsx` per nav route (`home` and `learn` are built in Task 12)
- Test: `src/lib/nav.test.ts`, `src/components/Sidebar.test.tsx`, `src/components/UserMenu.test.tsx`

**Interfaces:**
- Consumes: `serverApi` (`GET /me` → `{user: UserView}`), `createBrowserSupabase`.
- Produces:
  - `interface NavItem { key: string; label: string; href: string; group: string; icon: string; figmaNode?: string; phase: number }`; `NAV_GROUPS: Array<{ label: string; items: NavItem[] }>` in order **Overview** (Home `/home`), **Study** (Learn `/learn`, Notes `/notes`, Revision `/revision`), **Current Affairs** (Current Affairs `/current-affairs`, Magazines & Resources `/magazines`, Acts & Bills `/acts-bills`), **Practice** (Prelims `/prelims`, Mains `/mains`), **Plan & Track** (Planner `/planner`, Progress `/progress`, Ask AI `/ask-ai`), **Community** (Forum `/forum`, Mentorship `/mentorship`); `FOOTER_ITEMS: NavItem[]` = Help & Resources `/help`, Profile & Settings `/settings`.
  - `<StubPage item={NavItem} />`: title, subtitle "Arrives in Phase {phase}", Figma node reference, labelled sample-data card.
  - `<AppShell user={UserView}>`: dark-navy sidebar (brand "AI UPSC / Your preparation workspace"), top bar ("Demo · UPSC preparation" chip, search box showing `⌘ K` — inert, **Ask AI** button opening `AskAiPanel` (right drawer: "No study material attached" and the four inert actions from Figma `72:4594`), notification bell with static dot, `UserMenu`). `UserMenu` lists the eight Profile & Settings entries from Figma `72:4618`, **Log out** (`supabase.auth.signOut()` then `/login`), and an **Admin** link only when `roles` includes `admin`. Below 768 px the sidebar is a drawer toggled by a menu button with `aria-expanded`.

- [ ] **Step 1:** Write `nav.test.ts`: group labels in the exact order above; item labels per group exactly as listed; hrefs unique and start with `/`; `FOOTER_ITEMS` labels `['Help & Resources','Profile & Settings']`; every `phase` between 0 and 9.
- [ ] **Step 2:** Write `Sidebar.test.tsx`: upper-case group headings (`OVERVIEW`, `STUDY`, `CURRENT AFFAIRS`, `PRACTICE`, `PLAN & TRACK`, `COMMUNITY`); the item matching the pathname has `aria-current="page"` and others don't; the mobile menu button toggles `aria-expanded` and reveals the nav.
- [ ] **Step 3:** Write `UserMenu.test.tsx`: shows initials and name; "Admin" entry only when roles include `admin`; Log out calls `signOut` then navigates to `/login`.
- [ ] **Step 4:** Run → FAIL. **Step 5:** Implement; stub routes are generated from `NAV_GROUPS`; the `(app)` layout calls `serverApi('/me')` and redirects to `/login` on `unauthenticated`. **Step 6:** Run → PASS. Manual check at 1280 px and 390 px against Figma `7:1681`.
- [ ] **Step 7:** Commit `feat(web): app shell, navigation, stub pages`.

---

### Task 12: Home (sample) and Learn subjects (real data)

**Files:**
- Create: `src/app/(app)/home/page.tsx`, `src/app/(app)/learn/page.tsx`, `src/components/SubjectCard.tsx`, `src/lib/sample-data.ts`
- Test: `src/components/SubjectCard.test.tsx`, `src/app/(app)/learn/page.test.tsx`

**Interfaces:**
- Consumes: `serverApi<{subjects: SubjectSummary[]}>('/learn/subjects')`, `StubPage`.
- Produces: `/home` — "Your preparation at a glance" with clearly labelled sample cards (Today's plan, Continue learning, This week) from `sample-data.ts`, approximating Figma `89:3378`; `/learn` — "Learn" heading and subjects grid from the API (title, GS paper chip, "N modules · M lessons"), empty state "No subjects yet", error state with retry, note "Lesson reader arrives in Phase 8"; `<SubjectCard subject={SubjectSummary} />`.

- [ ] **Step 1:** `SubjectCard.test.tsx`: renders title, GS paper chip, "4 modules · 6 lessons"; singular "1 module · 1 lesson".
- [ ] **Step 2:** `learn/page.test.tsx`: mocked `serverApi` with 8 subjects → 8 cards; `[]` → "No subjects yet"; rejection with `ApiError(500)` → error state with retry link.
- [ ] **Step 3:** Run → FAIL. **Step 4:** Implement. **Step 5:** Run → PASS.
- [ ] **Step 6:** Verify with seeded local DB + Supabase: log in as `student@example.com`; `/learn` lists 8 subjects including Indian Polity "4 modules · 6 lessons".
- [ ] **Step 7:** Commit `feat(web): home sample and learn subjects`.

---

### Task 13: Admin shell (read-only)

**Files:**
- Create: `src/app/admin/{layout.tsx,page.tsx,users/page.tsx,plans/page.tsx}`, `src/components/AdminNav.tsx`
- Test: `src/app/admin/admin.test.tsx`

**Interfaces:**
- Consumes: `serverApi` (`/me`, `/admin/users`, `/admin/plans`).
- Produces: `/admin` layout redirecting non-admins to `/home` and unauthenticated users to `/login?return_to=/admin`; nav with the v1 sections of spec 18 §3 (Dashboard, Content, Questions, News & sources, Verification, Resources & Acts, Users, Plans & entitlements, Mentors, Payments, Community, Support, AI, Settings, Audit log) where only **Users** and **Plans & entitlements** are live and the rest show "Coming in a later phase"; `/admin/users` table (name, email, roles, status, last login, "Load more" via `nextCursor`); `/admin/plans` table (plan → entitlements with limit/period).

- [ ] **Step 1:** `admin.test.tsx`: `/me` roles `['student']` → `redirect('/home')` and no admin data fetched (**Review Focus 4**); roles `['admin']` → nav renders with exactly two live links; users page renders rows from a mocked response and no `authSubject`; plans page renders `free` with 13 entitlements.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(web): read-only admin shell`.

---

### Task 14: Demo deployment, smoke test and runbook

**Files:**
- Create: `apps/api/Dockerfile`, `apps/api/render.yaml`, `scripts/deploy.sh`, `scripts/smoke.sh`, `docs/demo/phase-0.md`
- Modify: `.env.example`, `README.md`

**Interfaces:**
- Produces:
  - `scripts/smoke.sh <WEB_URL>`: polls `/api/v1/health` up to 90 s (free API hosts sleep); signs in as `student@example.com` with `$DEMO_PASSWORD` via Supabase `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` (anon key) to obtain an access token; asserts `GET /api/v1/learn/subjects` (bearer) returns 8 subjects and `GET /api/v1/admin/users` returns 403; exits non-zero on any failure.
  - `scripts/deploy.sh`: `pnpm test` → `pnpm --filter @upsc/api db:migrate` (against `DATABASE_URL` = Neon) → POST `$RENDER_DEPLOY_HOOK_URL` → `vercel deploy --prod` in `apps/web` → `scripts/smoke.sh "$WEB_URL"`; stops at the first failure.

**Owner setup (one-time, needs your accounts — do before Step 3):**
1. **Supabase:** create a project (region Mumbai `ap-south-1` if offered). Authentication → Providers → Email: turn **Confirm email OFF** (demo) and set **minimum password length 12**. Settings → API: copy Project URL, `anon` key, `service_role` key (service role stays on your machine only). If the project uses a shared JWT secret copy it as `SUPABASE_JWT_SECRET`; if it uses asymmetric signing keys leave it unset. Authentication → URL Configuration: Site URL = your Vercel URL; add `<WEB_URL>/auth/callback` to redirect URLs.
2. **Neon:** create a project; copy the pooled connection string as `DATABASE_URL`.
3. **Render:** new Web Service from `apps/api/Dockerfile`, free plan; set API env vars from `.env.example`; create a Deploy Hook and keep its URL as `RENDER_DEPLOY_HOOK_URL`.
4. **Vercel:** `vercel link` in `apps/web`; set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_ORIGIN` (the Render URL), `NEXT_PUBLIC_GOOGLE_ENABLED`.
5. **Google (optional for first demo):** create a Google OAuth client; in Supabase enable the Google provider with its client id/secret and use Supabase's callback URL as the authorised redirect URI; then set `NEXT_PUBLIC_GOOGLE_ENABLED=true`.

- [ ] **Step 1:** Write the Dockerfile (Node 22 slim; `pnpm deploy` / build `@upsc/api`; `node dist/main.js`; listens on `$PORT`) and `render.yaml` (free web service, health check `/api/v1/health`). Build locally with `docker build -f apps/api/Dockerfile .` → expect success; if Docker is unavailable rely on the Render build log in Step 4.
- [ ] **Step 2:** Fill `.env.example` and `README.md` with the deployment variable list and the one-time setup above.
- [ ] **Step 3:** After owner setup run `pnpm --filter @upsc/api db:migrate` then `seed` with `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD` against Neon/Supabase; expect the `SeedReport` from Task 7.
- [ ] **Step 4:** Run `scripts/deploy.sh`; expect it to end with `SMOKE OK`. Open the Vercel URL, sign up a new account and log in, log in as the demo student, click every sidebar item, confirm `/learn` shows 8 subjects, then log in as admin and open `/admin/users`.
- [ ] **Step 5:** Write `docs/demo/phase-0.md`: 10-minute demo script (signup → shell tour → Learn subjects → log out → admin view); "before every demo" checklist (open the site 2 minutes early to wake the API; confirm `smoke.sh` passes; open the Supabase dashboard if the project shows as paused after inactivity; know `DEMO_PASSWORD`); known limits (free-tier sleep, no 2FA, sample data labelled); the daily deploy command.
- [ ] **Step 6:** Update `docs/specs/PROGRESS.md` session log and the Phase 0 row of `99-roadmap.md` with the live URL and date; commit `chore: demo deployment and runbook`.

---

## Self-Review

**Spec coverage (Phase 0 row of roadmap):** repo/deploy (T1, T14), Neon (T3, T14), design tokens (T9), login incl. Google (T4, T9, T10 via Supabase), app shell + sidebar + stub pages (T11), roles (T4, T8), entitlement library + default free plan (T5, T7), admin shell + login (T8, T13), seed framework + dummy syllabus/subjects/lessons (T7), live demo URL + manual deploy (T14). Deliberately deferred: forgot-password pages, email confirmation, MFA/2FA, Redis, CI/CD, payments, video. Seeds for questions, articles, mentors, posts arrive with Phases 1, 2, 5, 6.

**Interface consistency:** `Db`/`DB` (T3) used T4–T8; `UserView` (T4) used T11/T13; `AuthGuard` (T4) used by T5, T6, T8; `FEATURE_KEYS` (T5, 13 keys) used by seed (T7) and the plans tests (13 entitlements in T8/T13); seed counts (T7: 8/12/23/15) match T12 ("4 modules · 6 lessons") and the smoke test (T14: 8 subjects); `safeReturnTo` (T10) used by login and the callback route; `AuthAdmin` (T7) is the only code that touches the Supabase service key.

**Proportion:** one deliverable per task, each ending in a passing test run or a verified manual check.

**Open items for the owner before execution:** accounts for Supabase, Neon, Render, Vercel; whether Google sign-in is wanted for the first demo.
