# Streamera — Provider Automation Context

Working log of the effort to automate playback-provider maintenance with an
Eve agent. Companion to [eve-automation-plan.md](eve-automation-plan.md) (the
detailed plan) and [agents.md](agents.md) (the codebase map).

Last updated: 2026-09-02

---

## TL;DR — current state

| Phase | What | Status | Where |
|---|---|---|---|
| 0 | Decouple providers from the build (`providers.json` + reader + fallback) | ✅ **merged to `main`** | `d0f5364` |
| — | Fix all 22 lint errors so `yarn lint` can gate CI | ✅ **merged to `main`** | `3f1c4af` |
| 1 | CI gate: schema/provider validation + lint + build on every PR/push | ✅ **merged to `main`** (PR #1) | `49ff2ca`, `d2ec50c`, `007feff` |
| 2 | The Eve agent (`eve-agent/`) that checks providers daily and commits fixes | 🔶 **on branch `eve-provider-agent`**, not merged | `d05e85f` |
| 3 | Edge Config for zero-redeploy; client failover; real health checks | ⬜ not started | — |

**Blocked on the user** (cannot be done from this environment): create a GitHub
token, pick an ntfy topic, deploy `eve-agent/` to Vercel, set its env vars.
See [Outstanding manual steps](#outstanding-manual-steps).

---

## Original goal

> "A bot to automatically search and switch providers whenever the ones in use
> stop working, using Eve by Vercel, and push the changes to GitHub."

Scope was explicitly narrowed by the user mid-effort:

> "Eve is the only thing I wanted to add here, nothing more, nothing less."

So: **Eve agent + direct commits to `main`**. No pull-request workflow, no
auto-merge — that ceremony was explored and dropped (see
[Decisions](#decisions-and-why)).

---

## What "Eve" is

[Eve](https://vercel.com/eve) is Vercel's open-source agent framework (launched
June 2026). An agent is a directory of files under `agent/`:

- `agent/instructions.md` — always-on system prompt
- `agent/agent.ts` — `defineAgent({ model })`
- `agent/tools/*.ts` — one `defineTool({ description, inputSchema, execute })`
  per file; **filename is the tool name** the model sees
- `agent/skills/*.md` — on-demand procedures/reference, loaded when relevant
- `agent/schedules/*.ts` — `defineSchedule({ cron, markdown | run })`; each
  becomes a **Vercel Cron Job**, cron evaluated in **UTC**
- `agent/channels/*` — entry points (HTTP, Slack, …)

Runs as a durable Vercel Workflow. Model strings resolve through Vercel AI
Gateway (OIDC, no provider key needed).

**Node 24 is required** (`eve@0.49.0`). This devcontainer ships Node 22, so a
local Node 24 was fetched to the scratchpad for build/typecheck during
development. `eve-agent/` is therefore its own project with its own
`package.json` / `yarn.lock` / `tsconfig.json`, kept out of the site's eslint.

---

## The bottleneck this solves

- `SOURCES` was hardcoded in `src/pages/WatchPage.tsx` with per-host `if`
  branches in `getEmbedUrl` (`src/services/tmdb.ts`).
- Third-party embed hosts (`vidlink.pro`, `vidsrcme.ru`, `vidsrc.pm`) rotate
  domains and go down. Every fix was: edit React source → commit → full Vite
  rebuild → Vercel redeploy, with a human at the keyboard.

Phase 0 moved the list to `public/providers.json`, fetched at runtime. Adding or
swapping a host is now a JSON edit, no code change. That alone removed most of
the pain; the Eve agent removes the human.

---

## Decisions and why

| Decision | Rationale |
|---|---|
| **Provider list in `public/providers.json`**, fetched at runtime, with a hardcoded `FALLBACK_PROVIDERS` mirror | Decouples provider changes from the build. Fallback keeps the player working if the fetch fails. Edge Config (zero redeploy) deferred to Phase 3 — the ~1–2 min redeploy lag isn't the bottleneck. |
| **URL templates live in each provider entry** (`{host}`/`{id}`/`{season}`/`{episode}`) | A new host needs no code — `getEmbedUrl` collapsed to one template fill (`buildEmbedUrl`). |
| **Collapsed 8 providers → 3** | The 8 were relabelled duplicates of the same 3 hosts producing identical URLs. |
| **Standardise on yarn** | Repo had a stray `package-lock.json`; `package-lock.json` + `pnpm-lock.yaml` now gitignored. |
| **Fixed all 22 lint errors** (12 `any`, 9 set-state-in-effect, 1 react-refresh) | Was required so `yarn lint` could be a gating CI check. Surfaced two real latent bugs (`getImageUrl` signature vs falsy input; `Media` union reads without narrowing). Verified behaviour-preserving by driving the app in headless Chromium against a mocked TMDB and diffing vs the pre-refactor baseline. |
| **Dropped PR + auto-merge; agent commits straight to `main`** | Repo is **private, single committer**. GitHub branch protection **is not enforced on a private repo on a personal account** (needs a Team/Enterprise org) even though the account has Pro via the Student pack and the rule UI is available. The PR/auto-merge scaffolding bought nothing here. CI still runs and reports; nothing blocks a merge. |
| **Model: whatever `minimax/*-free` is currently live on AI Gateway** (`minimax/minimax-m3-free` as of 2026-09-02), else a cheap model within the $5/mo AI Gateway free credit | User: "any free would work as long as there's free models". One-line change in `agent/agent.ts`. Free MiniMax IDs are a rotating, time-limited promo — not a stable base. |
| **Daily cadence** (`0 6 * * *` UTC) | User: providers only need swapping "if the current ones are all down". Matches the Vercel Hobby cron daily floor, so no external scheduler needed. |
| **ntfy for notifications** | Free, one HTTP POST. One-way logging only — not a control channel. Topic must be unguessable. |
| **Health checks return evidence, not verdicts; agent decides** | These hosts can't be cleanly probed (see [Key findings](#key-findings--gotchas)). |

---

## Phase detail

### Phase 0 — decouple providers ✅ merged (`d0f5364`)

Added:
- `public/providers.json` — source of truth (3 providers)
- `schema/providers.schema.json` — JSON Schema
- `src/services/providers.ts` — `loadProviders()`, `FALLBACK_PROVIDERS`, `buildEmbedUrl()`
- `src/types/providers.ts` — `Provider`, `ProvidersConfig`

Changed: `WatchPage` fetches the list; `getEmbedUrl` removed from `tmdb.ts`.
Verified: 24/24 URL outputs identical to the old `getEmbedUrl`; build + lint clean.

### Lint cleanup ✅ merged (`3f1c4af`)

22 → 0 errors. Approach: real types added to `src/types/tmdb.ts`
(`Genre`/`Season`/`Episode`/`SeasonDetails`/`CastMember`/`Credits`/`MediaDetails`);
derived state instead of set-state-in-effect; `ThemeContext` split into
`src/context/theme-context.ts` for Fast Refresh. **The lint baseline must stay
at 0** or CI (Phase 1) blocks every PR.

### Phase 1 — CI gate ✅ merged (`49ff2ca`, `d2ec50c`, merge `007feff`)

- `.github/workflows/ci.yml` — on every PR and push to `main`:
  `yarn install --frozen-lockfile` → assert `yarn.lock` unchanged by install →
  `yarn validate:providers` → `yarn lint` → `yarn build` → assert
  `dist/providers.json` shipped.
- `scripts/validate-providers.mjs` (+ `ajv` devDep, `yarn validate:providers`) —
  schema plus 6 rules the schema can't express (duplicate ids/labels, unknown
  placeholders, templates resolving off the declared host, non-https, tv
  template ignoring season+episode, `FALLBACK_PROVIDERS` drift). Each checked
  against a failing fixture.
- Lockfile assertion guards a real failure mode: yarn 1 prunes other-platform
  native binaries during install, which still builds on Linux but breaks a clean
  install on macOS/Windows.

Merged via PR #1. Branch protection is **not enforced** on a private personal
repo, so `ci.yml` reports pass/fail but does not block a merge. The validator
(`yarn validate:providers`) is available on `main`.

### Phase 2 — the Eve agent 🔶 branch `eve-provider-agent` (`d05e85f`)

`eve-agent/` — its own project. Node 24. Excluded from site eslint
(`eslint.config.js` `globalIgnores`).

| File | Purpose |
|---|---|
| `agent/instructions.md` | Standing brief. **A healthy run is silent** — writes nothing, notifies nothing. Weighs evidence: DNS-fail / 403 = weak (never remove on a 403 alone); 200-with-parked-page / 404 / framing-refusal = strong; **all providers failing at once ⇒ assume own network is broken, change nothing, notify**. |
| `agent/agent.ts` | `model: "minimax/minimax-m3-free"` (swap when the free promo rotates). |
| `agent/tools/read_providers.ts` | GET `public/providers.json` via GitHub Contents API; returns providers + blob sha. |
| `agent/tools/check_provider.ts` | Probes one embed URL. Returns evidence: status, redirects, `embeddable` (X-Frame-Options / CSP frame-ancestors), parked-page markers, player markers. **Not a verdict.** |
| `agent/tools/update_providers.ts` | PUT the complete new list, commit straight to `main`. Re-validates the whole list (same rules as `validate-providers.mjs`), refuses no-ops, refuses to empty the list. |
| `agent/tools/notify.ts` | ntfy POST. |
| `agent/skills/provider-candidates.md` | The **only** hosts the agent may add, with template shapes. Marked **unverified** — DNS for several failed from this environment (network blocking, not dead hosts). Agent told never to invent/search for domains. |
| `agent/schedules/daily-provider-check.ts` | `cron: "0 6 * * *"` (UTC), `markdown` fire-and-forget prompt. |
| `agent/lib/github.ts` | `getFile` / `putFile` against `CatastrophistUser/Streamera`, `main`, `public/providers.json`. Reads `GITHUB_TOKEN`, `STREAMERA_REPO`, `STREAMERA_BRANCH`, `PROVIDERS_PATH`. |
| `agent/lib/providers.ts` | Zod schemas + `validateConfig()` (mirrors the site's CI validator) + `fillTemplate()`. |

Verified: `tsc --noEmit` clean, `eve build` succeeds, discovery manifest picks up
all 4 tools + schedule + skill + channel. `check_provider` run against the 3
live providers — all 6 movie/tv URLs reachable + embeddable + player markers.

### Phase 3 — optional, not started

Edge Config sync (zero-redeploy); client-side iframe failover; a genuinely
trustworthy health check (needs a residential-ish vantage point or headless
browser — see findings).

---

## Key findings / gotchas

1. **This environment's network blocks the provider/candidate domains at DNS.**
   `vidsrc.xyz`, `vidsrc.net`, `embed.su`, `moviesapi.club` fail to resolve
   here; `vidsrc.to`, `vidsrc.cc` return 403. This is the same ISP-level
   blocking that `vercel.json`'s TMDB proxy works around. **Consequence:** the
   candidate list in the skill is *unverified*, and health checks from any
   datacenter IP (Vercel, GitHub Actions) will see more failures than a real
   viewer. The agent's evidence-weighting is built around this.
2. **The 3 current providers are all live** (checked 2026-09-02): `vidlink.pro`,
   `vidsrcme.ru`, `vidsrc.pm` — all 200, embeddable, player markers present.
3. **GitHub branch protection ≠ enforced on private personal repos.** Rule
   creation UI is available (account has Pro via Student pack) but the rule
   "won't be enforced… until you move to a Team or Enterprise organization."
   Rulesets have the same restriction. This is why the plan dropped PR/auto-merge.
4. **`yarn.lock` churn.** yarn 1 rewrites the lockfile on install to prune
   native binaries for other platforms. Builds locally, breaks clean installs
   elsewhere. CI asserts the lockfile is unchanged by install; always restore it
   if an install mutates it.
5. **eve requires Node ≥24**; devcontainer is Node 22. Local Node 24 lives at
   the scratchpad only. Deploy/typecheck of `eve-agent/` needs Node 24 on PATH.
6. **Free MiniMax model IDs rotate.** `minimax-m2` free ended 2025-11-07;
   `minimax-m3-free` / `minimax-m2.7-free` free through ~2026-09-06. Treat as an
   opportunistic override, not a stable dependency.

---

## Cost model

Everything runs $0 on the current stack:

- **Vercel Hobby** — static site + the agent as a second project. Cron limited
  to daily on Hobby, which is the chosen cadence anyway.
- **AI Gateway** — $5/mo free credit (refreshes) *or* a free MiniMax model =
  effectively $0 at one small daily run.
- **GitHub Actions** — private repo on Pro = 3,000 min/mo (plenty).
- **ntfy** — free hosted, no account needed for basic use.
- **Edge Config** (if Phase 3) — 100k reads + 100 writes/mo free on Hobby.

Constraints: Vercel Hobby is non-commercial (fine — no ads, `robots.txt`
disallows crawling). Any future monetisation ⇒ Vercel Pro ($20/mo).

---

## Outstanding manual steps

These need the user's own accounts and cannot be done from this session:

1. **Decide whether to merge `eve-provider-agent`** into `main` (adds `eve-agent/`).
2. **Create a GitHub token** — fine-grained PAT, `CatastrophistUser/Streamera`
   only, `Contents: read & write`.
3. **Pick an ntfy topic** — something unguessable, e.g. `streamera-prov-9f3a2c`.
   Subscribe to it in the ntfy app.
4. **Deploy the agent** — from `eve-agent/`, with Node 24 on PATH:
   `npx eve link` then `npx eve deploy` (creates a second Vercel project).
5. **Set env vars** on that Vercel project:
   - `GITHUB_TOKEN` (required)
   - `NTFY_TOPIC` (required)
   - `STREAMERA_REPO` (optional, defaults to `CatastrophistUser/Streamera`)
   - `NTFY_SERVER` / `NTFY_TOKEN` (optional, only for a private/self-hosted ntfy)
6. **After deploy: re-verify the candidate list** in
   `agent/skills/provider-candidates.md` from Vercel's network (the vantage
   point that actually matters), or via the dev dispatch route.

---

## Working on the Eve agent locally

```sh
# Node 24 is required. If not on PATH:
export PATH="<scratchpad>/node24/bin:$PATH"

cd eve-agent
yarn install
npx tsc --noEmit          # typecheck
npx eve build             # compile + discovery manifest
npx eve dev --no-ui       # HTTP API on :2000; schedules do NOT fire on cron here
# trigger the schedule once, out of band:
curl -X POST http://localhost:2000/eve/v1/dev/schedules/daily-provider-check
```

`eve dev` never runs schedules on their cron cadence — use the dispatch route.
Production (`eve start` / Vercel) does.
