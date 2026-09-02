# Streamera: Eve Provider-Automation Plan

Status: draft / for discussion
Last updated: 2026-09-02

---

## 0. Goal

Remove the manual bottleneck around playback providers: today every provider
change is a hand-edit to app source, a commit, and a full Vercel redeploy, with
**you** acting as the failover mechanism whenever a host rotates its domain or
goes dark. Replace that with:

1. **Config decoupled from the build** — the provider list lives in data, not code.
2. **CI gating** — automated checks decide whether a change is safe to ship.
3. **An Eve agent** — on a daily schedule (or on demand), proposes provider
   changes and opens PRs, with ntfy notifications for logging.

Secondary goal: learn automation / agent tooling (Eve) in the process.

### Decisions locked so far

| Question | Decision |
|---|---|
| Change safety | Auto-merge PR **if CI checks pass** |
| Provider config location | TBD — `public/providers.json` now recommended, Edge Config later |
| Schedule | **Daily** is enough (providers only need swapping when all current ones are down) → native Vercel Cron, no workaround |
| Automated health-checking | **Deferred** — not in the first build; revisit later (see §3, §8) |
| Notifications | **ntfy** for logging: alert when providers look down and when a push/PR is made (see §6) |
| LLM model | Use **whatever free model is live on AI Gateway** (currently `minimax/minimax-m3-free`). If no free ID is available at the time, fall back to a cheap model within the $5/mo AI Gateway credit (Haiku / Flash class). One-line change in `agent.ts` either way (see §7) |
| Plan tier | Vercel **Hobby** — personal, no ads, `robots.txt` disallows crawling → within Hobby's non-commercial terms |

---

## 1. What "Eve" is

**Eve** is Vercel's open-source agent framework (launched June 2026). Relevant
properties for this plan:

- An agent is a **directory of files**: Markdown for instructions/skills,
  TypeScript for tools.
- Runs as a **durable workflow** (checkpointed, can pause/resume/survive crashes)
  on Vercel's Workflow SDK.
- Supports **cron schedules**, **channels** (Slack, Discord, Teams, web, API,
  CLI), **subagents**, and **human-in-the-loop approval gates**.
- **GitHub integration** via Vercel Connect for "software factory" workflows:
  plan features, open PRs, review code.
- Runs locally, on Vercel, or on any long-running Node host. Model is configured
  in `agent/agent.ts` and resolves through Vercel **AI Gateway** or a direct
  AI SDK provider package (see §7).

Sources: <https://vercel.com/eve>, <https://vercel.com/docs/eve/concepts>,
<https://github.com/vercel/eve>,
<https://thenewstack.io/vercel-launches-eve-an-open-source-framework-that-treats-agents-as-directories/>

---

## 2. The bottleneck, precisely

1. `SOURCES` is hardcoded in `src/pages/WatchPage.tsx:13-22`, and the per-host URL
   shapes are branched in `getEmbedUrl` in `src/services/tmdb.ts:82-104`.
   Any provider change = code change = `tsc -b && vite build` + Vercel redeploy,
   and needs you at a keyboard.
2. The embed hosts (`vidlink.pro`, `vidsrcme.ru`, `vidsrc.pm`) rotate domains and
   go offline. You are the failover.
3. Minor: the 8-entry "server" dropdown is really 3 hosts relabeled, with no
   automatic client-side failover when an iframe is dead.

---

## 3. Health checks — DEFERRED

Per current decision, automated health-checking is **out of scope for the first
build**. Notes kept here for when we pick it back up:

- These hosts cannot be cleanly health-checked. They block bot user-agents and
  datacenter IP ranges (GitHub Actions and Vercel both run from datacenter IPs),
  so checks see more failures than a real home browser would.
- HTTP `200` frequently means a parked/placeholder page, not a playable video.
- Reliable validation needs a headless browser (Playwright) that loads the embed
  and waits for a `<video>` element or a media segment request — heavy and still
  flaky.
- When built, it should require **multiple consecutive failing runs** before any
  automated action, and only auto-act on **removals**, never additions.

**Until this exists**, the trigger for a provider refresh is manual /
notification-driven: you notice playback is broken (or ntfy tells you), then you
ask the agent — or edit `providers.json` yourself — and CI + auto-merge handle
the rest. A very light single-GET liveness ping (just "does the domain respond")
is optional and cheap, but is not the real health check.

---

## 4. Phased plan

### Phase 0 — Decouple providers from the build — ✅ DONE

Removes most of the pain on its own; no automation risk; $0.

Shipped: `public/providers.json` + `schema/providers.schema.json` +
`src/types/providers.ts` + `src/services/providers.ts` (`loadProviders`,
`FALLBACK_PROVIDERS`, `buildEmbedUrl`); `WatchPage` fetches the list instead of
using a hardcoded `SOURCES` const; `getEmbedUrl` removed from `tmdb.ts`.
Verified behavior-preserving: 24/24 URL comparisons against the old
`getEmbedUrl` matched, button order/labels/hosts identical, build + lint clean
(lint error count unchanged from baseline at 22 pre-existing).
Not yet done: the optional iframe `onError` auto-advance.

- Add `public/providers.json` as the source of truth:

  ```json
  {
    "version": 1,
    "providers": [
      {
        "id": "vidlink",
        "label": "Server VIP",
        "host": "vidlink.pro",
        "movie": "https://{host}/movie/{id}",
        "tv": "https://{host}/tv/{id}/{season}/{episode}"
      },
      {
        "id": "vidsrc-pm",
        "label": "Multi",
        "host": "vidsrc.pm",
        "movie": "https://{host}/embed/movie/{id}",
        "tv": "https://{host}/embed/tv/{id}/{season}/{episode}"
      }
    ]
  }
  ```

- Add a JSON Schema (`schema/providers.schema.json`): required fields, `host`
  matches a hostname pattern, URL templates are `https://` and contain `{id}`,
  no duplicate `id`s.
- `WatchPage` fetches `providers.json` at mount (cache in memory), replacing the
  `SOURCES` constant. Keep a small hardcoded fallback array so the page still
  works if the fetch fails.
- Collapse `getEmbedUrl` to a single template fill driven by the JSON — new hosts
  then need **zero code**.
- Optional resilience: iframe `onError` + a load timeout → auto-advance to the
  next provider.

### Phase 1 — CI gate for auto-merge

GitHub Actions workflow on any PR touching `providers.json`:

1. Validate against the schema.
2. `npm run build` + `npm run lint` — a bad config cannot ship.

(No independent health-check re-run for now — deferred with §3.)

Then: branch protection on `main` requires these checks; enable "Allow
auto-merge"; agent PRs turn on auto-merge, so a green PR merges itself and Vercel
redeploys. Matches the locked policy: **auto-merge if checks pass**.

### Phase 2 — The Eve agent

`agents/provider-sentinel/` (scaffold with `npx eve@latest init`):

- **agent/agent.ts** — model config (see §7).
- **instructions.md** — "You maintain Streamera's playback provider list. When
  asked (or on the daily run), review `providers.json`, propose the minimal
  change, open a PR titled `chore(providers): …`, and send an ntfy notification.
  Never add a host that is not on the approved list without approval."
- **skills/** — `evaluating-a-provider.md`, `pr-conventions.md`,
  `candidate-discovery.md` (see §5), `ntfy-notifications.md`.
- **tools/** (TypeScript):
  - `readProviders.ts` / `writeProviders.ts` — edit `providers.json`.
  - `openPullRequest.ts` — GitHub API (Vercel Connect handles auth) or `gh`.
  - `notify.ts` — POST to ntfy (see §6).
  - `checkProvider.ts` — **deferred** (§3); optional thin liveness GET only.
- **schedule** — native Vercel Cron, **once per day**. Enough per the locked
  decision; no external-scheduler workaround needed.
- **channel** — Slack or Discord for the approval conversation. ntfy is
  fire-and-forget logging, not a control channel.
- **approval gate** — additions / unknown hosts require your 👍 in the channel;
  removals of a provider you have confirmed dead proceed to PR automatically.
- Token scope: one repo, `contents:write`, `pull_requests:write`.

### Phase 3 — Optional

- **Vercel Edge Config**: on merge, sync `providers.json` → Edge Config; client
  reads it via one cached edge function. Changes then go live with **no
  redeploy**. `providers.json` stays the source of truth for git-history audit.
  (Free on Hobby within limits — see §8.)
- Client-side automatic failover polish.
- Automated health checks (§3).

---

## 5. Can the bot *find* providers itself, or is discovery a manual bottleneck?

**Partially automatable. Discovery + a first-pass smoke test can be automated; the
final "add to production" stays a manual approve/reject.**

Automatable:

- **Candidate harvesting** — scrape a known set of aggregator lists (piracy-tool
  wikis, "vidsrc alternatives" pages, subreddit megathreads); extract candidate
  domains. Rules live in a `candidate-discovery.md` skill.
- **Pattern inference + smoke test** — try common embed URL shapes
  (`/embed/movie/{id}`, `/movie/{id}`, `/e/{id}`, …) against a known TMDB id;
  check it returns HTML and does **not** set anti-embedding headers
  (`X-Frame-Options: DENY`, restrictive `frame-ancestors`).
- **Proposal** — open a PR / post to the channel: "candidate `example.tv` is
  iframe-able, pattern `…`. Approve to add?"

Stays manual (by design):

- **Security** — adding an unknown host to an `<iframe>` on your site is an
  XSS / malvertising surface. Judgment call, not a mechanical check.
- **Quality** — ad load, popunders, stream quality vary enormously and score
  poorly by automation.

Net effect: today it's *find → test → hand-edit code → commit → redeploy* (all
you). After: agent does *find → test → propose*; you do one **approve/reject** and
merge+deploy are automatic. **Removal** of a provider you've confirmed dead can be
fully hands-off.

---

## 6. ntfy for notifications / logging

**Yes, this fits cleanly and is free.** [ntfy](https://ntfy.sh) is an
open-source pub/sub-over-HTTP notification service. Publish is a single HTTP
request; subscribe from the phone app, desktop, or a browser. The hosted
`ntfy.sh` needs no account for basic use (soft rate limits apply); it is also
self-hostable if you ever want to.

### How it plugs in

An Eve tool `tools/notify.ts` (also callable from a plain `fetch` in a Vercel
function or a GitHub Action):

```ts
export async function notify(opts: {
  title: string;
  message: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];          // emoji shortcodes, e.g. ['warning'], ['white_check_mark']
  click?: string;           // URL opened when the notification is tapped
}) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: {
      Title: opts.title,
      Priority: opts.priority ?? 'default',
      Tags: (opts.tags ?? []).join(','),
      ...(opts.click ? { Click: opts.click } : {}),
    },
    body: opts.message,
  });
}
```

### Events to log

| Event | Priority | Example |
|---|---|---|
| One or more providers look down | `high`, tag `warning` | "2/3 providers unreachable: vidsrcme.ru, vidsrc.pm" |
| Agent opened a PR | `default`, tag `robot` | "PR #42: swap vidsrcme.ru → newmirror.example — auto-merge armed" |
| PR auto-merged / deploy done | `default`, tag `white_check_mark` | "PR #42 merged, Vercel deploy live" |
| Approval needed (new host) | `high`, tag `question` | "Candidate cool-embed.tv passed smoke test — approve in Slack" |

### Notes

- Use an **unguessable topic name** (e.g. `streamera-prov-9f3a2c`) — anyone who
  knows a `ntfy.sh` topic can read and post to it. For write protection, either
  self-host with access tokens or send an `Authorization` header to a protected
  topic.
- Keep `NTFY_TOPIC` (and any token) in Vercel env vars / GitHub Actions secrets.
- ntfy is **one-way logging**, not the approval channel — approvals happen in
  Slack/Discord where the agent can read your reply.

Docs: <https://docs.ntfy.sh/publish/>

---

## 7. What model does Eve call? Can it be a free one?

**Not locked to a paid proprietary model.** Eve sets the model in
`agent/agent.ts`:

```ts
import { defineAgent } from 'eve';
export default defineAgent({
  // Use a free model when one is live; swap this one string when the promo rotates.
  model: 'minimax/minimax-m3-free',       // free on AI Gateway as of 2026-09-02
  // fallback when no -free ID is available: 'anthropic/claude-haiku-4.5' (uses $5 credit)
});
```

or with a direct AI SDK provider package (bypassing AI Gateway):

```ts
import { google } from '@ai-sdk/google';
export default defineAgent({ model: google('gemini-2.5-flash') });
```

### Free / near-free options, in order of least hassle

1. **AI Gateway `$5/month` free credit on a cheap model** — *recommended /
   primary.* Credit refreshes every 30 days, zero per-token markup, works with
   hundreds of models. Pair with Claude Haiku, Gemini Flash, DeepSeek, or a
   GPT-mini-class model. One daily run over a small prompt (a provider list + a
   short instruction) will not come close to $5 → effectively $0, and it does not
   depend on any promo.
2. **A currently-promoted free MiniMax model** — *opportunistic override.*
   Vercel rotates a time-limited free MiniMax model on AI Gateway via `-free`
   model IDs (served by GMI Cloud). History: **M2** was free until 2025-11-07 (now
   ended); as of 2026-09-02 **M3 / M2.7** are free through ~2026-09-06 as
   `minimax/minimax-m3-free` / `minimax/minimax-m2.7-free`. Capable enough for
   "pick the minimal edit to a JSON list and write a PR body." Because the model
   and window keep changing, treat this as a one-line override in `agent.ts` when
   a free ID is live — not the baseline.
3. **BYOK against a provider free tier** — bring your own key for Google Gemini's
   free tier or Groq's free tier; AI Gateway adds no markup, so you only pay if
   you exceed that provider's own free allowance (you won't, at this volume).
4. **Local model** — if you run the agent on a long-running Node host instead of
   Vercel, point it at Ollama (`llama`, `qwen`, etc.). $0, no external calls,
   slower and lower quality.

### Cost-control levers regardless of model

- Only invoke the LLM when there is a decision to make (a provider changed state
  or you explicitly asked) — the deterministic CI path needs no model.
- Small model, tight system prompt, no chat history beyond the current run.
- Cap spend in the AI Gateway dashboard so it can never silently overrun.

**Bottom line:** the Eve agent can run at $0 on whichever `minimax/*-free` model
is currently live, or within the $5/month credit on a cheap model when none is.
Phases 0–1 use **no LLM at all**.

Sources: <https://vercel.com/docs/eve/concepts>,
<https://vercel.com/docs/ai-gateway/pricing>,
<https://vercel.com/ai-gateway/models>,
<https://vercel.com/docs/plans/hobby>

---

## 8. Hosting cost on the current stack (GitHub + Vercel Hobby)

**Yes — this runs at $0 on the existing stack.**

| Piece | Plan | Free allowance | Enough here? |
|---|---|---|---|
| Static site hosting + redeploys | Vercel Hobby | Free forever (personal / non-commercial) | Yes — no ads, `robots.txt` disallows crawling |
| Cron jobs | Vercel Hobby | Up to 100 per project; **daily** minimum interval | Yes — daily is the chosen cadence |
| Agent compute (HTTP + PR, daily) | Vercel Hobby | Included Hobby function/workflow usage | Yes |
| CI (schema + build + lint) | GitHub Actions | Public repo: unlimited. Private repo: 2,000 Linux min/month (Free plan) | Yes — a few short runs |
| LLM calls | AI Gateway on Hobby | $5 credit/month **or** free models (MiniMax M2) **or** BYOK free tier | Yes — see §7 |
| ntfy notifications | ntfy.sh hosted | Free, no account for basic use | Yes |
| Edge Config (Phase 3, optional) | Vercel Hobby | 100k reads + 100 writes / month free | Yes if reads are cached behind one edge function (not per page view) |

Notes:

- The old "Hobby cron only fires once per day" limitation is **not a problem
  here** — daily is exactly the cadence we want, so native Vercel Cron is used
  with no external-scheduler workaround.
- Hobby's non-commercial clause is fine for this project as-is; monetizing later
  (ads, paid tiers) would require Vercel Pro ($20/user/month).
- Any Playwright deep-check, if added later, should run in GitHub Actions
  (Chromium preinstalled), not in a Vercel Hobby function.

Sources: <https://vercel.com/docs/cron-jobs/usage-and-pricing>,
<https://vercel.com/docs/limits>,
<https://vercel.com/docs/edge-config/edge-config-limits>,
<https://vercel.com/docs/plans/hobby>,
<https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions>

---

## 9. Recommended build order

1. **Phase 0** — config decouple (`providers.json` + schema + client fetch +
   templated `getEmbedUrl`). Standalone value, zero automation risk, $0, no LLM.
2. **Phase 1** — GitHub Actions: schema validation + build/lint; branch
   protection + auto-merge. Still $0, still no LLM.
3. **Phase 2** — Eve agent: scaffold, `readProviders`/`writeProviders`/
   `openPullRequest`/`notify` tools, daily Vercel Cron, Slack/Discord approval
   channel, ntfy logging, approval gate for additions. Model: MiniMax M2 (free)
   or a cheap model within the $5 credit.
4. **Phase 3** (optional) — Edge Config for zero-redeploy; client failover;
   automated health checks (§3).

---

## 10. Risks / open items

- **Eve is ~3 months old** — expect API churn. Phase 1 (plain Actions) is the
  deterministic backstop; if Eve breaks, manual edits + auto-merge still work.
- **No automated health check yet (§3)** — provider breakage is caught by you or
  by a thin liveness ping + ntfy, not by real validation. Accepted for now.
- **Auto-merging provider changes** is an automated trust decision — that is why
  additions stay behind a manual approval gate.
- **ntfy topic is a shared secret** — use an unguessable name; add auth if
  self-hosting.
- **LLM spend** — capped in the AI Gateway dashboard; gate LLM calls behind
  "there is actually a decision to make".
- **Repo visibility** — if `Streamera` is private, Actions minutes are capped at
  2,000/month on the Free plan (still plenty here).
- **Hobby non-commercial clause** — any future monetization forces Vercel Pro.
- **Secrets hygiene** — GitHub token scoped to one repo, `contents:write` +
  `pull_requests:write` only; `NTFY_TOPIC` and model keys in env/secrets.
- **Open decision** — source-of-truth location: `providers.json` now vs Edge
  Config later vs both. Current recommendation: `providers.json` now.
