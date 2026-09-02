# Streamera Agent Context

## Overview
Streamera is a React 19 + TypeScript + Vite movie and TV browsing app with a TMDB-backed discovery/search experience and an embedded watch page. It uses Tailwind CSS v4 for styling, React Router for navigation, and a small set of custom hooks, layout components, and TMDB service helpers to keep the app cohesive.

## Tech Stack
- React 19
- TypeScript
- Vite
- React Router DOM 7
- Tailwind CSS 4 via `@tailwindcss/vite`
- Axios for TMDB requests
- Lucide React icons
- `clsx` + `tailwind-merge` via the `cn` helper

## Entry Points
- App bootstraps from [src/main.tsx](src/main.tsx), which loads global styles and renders `<App />` inside `StrictMode`.
- [src/App.tsx](src/App.tsx) wires the app shell:
  - `ThemeProvider`
  - global loading overlay
  - `HashRouter`
  - nested routes under `Layout`

## Routing
The app uses hash routing, which is important for static hosting and the Vercel rewrite setup.

- `/` -> `HomePage`
- `/movies` -> `HomePage` with movie discovery
- `/tv` -> `HomePage` with TV discovery
- `/search` -> `SearchPage`
- `/watch/:type/:id` -> `WatchPage`

## Layout and Shell
- [src/components/layout/Layout.tsx](src/components/layout/Layout.tsx) renders the shared shell.
- [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx) provides:
  - floating centered nav with Movies, TV, and Search actions
  - `Ctrl/Cmd + K` shortcut to open spotlight search
  - scroll-aware logo visibility
  - back-to-top button
  - theme toggle
- [src/components/layout/LoadingScreen.tsx](src/components/layout/LoadingScreen.tsx) shows an initial splash overlay and temporarily disables scrolling.
- [src/components/layout/Logo.tsx](src/components/layout/Logo.tsx) adapts logo display to theme and simple fade/slide transitions.
- [src/components/layout/SpotlightSearch.tsx](src/components/layout/SpotlightSearch.tsx) is the global search modal.

## Pages

### Home Page
[src/pages/HomePage.tsx](src/pages/HomePage.tsx) powers the home, movies, and TV landing views.

- Determines media type from the current pathname.
- Loads an initial batch from TMDB using either trending or discover endpoints.
- Uses a random starting page for variety.
- Shuffles the initial response before rendering.
- Renders a full-screen hero carousel for the featured item.
- Uses infinite scrolling to append more cards.
- Preloads the next hero backdrop for smoother transitions.

### Search Page
[src/pages/SearchPage.tsx](src/pages/SearchPage.tsx) supports three entry modes:

- free-text search via `q`
- genre browsing via `gid`, `gn`, and `type`
- cast/actor browsing via `sid` and `sn`

Behavior:
- debounces query input before fetching
- supports infinite scroll for search and genre results
- loads actor credits in one shot and disables pagination for that mode

### Watch Page
[src/pages/WatchPage.tsx](src/pages/WatchPage.tsx) is the player/detail experience.

- Loads TMDB details, similar titles, and credits for the selected media item.
- For TV shows, also loads season data and supports season/episode switching.
- Renders an embedded iframe player using a selectable set of third-party source hosts.
- The source list is **not hardcoded**: it is fetched at mount from `public/providers.json` via `loadProviders()`. See "Playback Providers" below.
- Includes genre navigation and cast navigation back into search.

Important note:
- The iframe sources are external providers. Treat them as untrusted runtime dependencies when modifying the page.

## Data Layer
[src/services/tmdb.ts](src/services/tmdb.ts) contains the TMDB client and helpers.

- Uses Axios with `BASE_URL = '/tmdb'`.
- In local development, Vite proxies `/tmdb` to `https://api.themoviedb.org/3`.
- In deployment, Vercel rewrites `/tmdb/:path*` to the TMDB API.
- Reads the access token from `import.meta.env.VITE_TMDB_ACCESS_TOKEN`.

Exported helpers:
- `getTrending`
- `getDiscover`
- `getByGenre`
- `searchMedia`
- `getMediaDetails`
- `getSeasonDetails`
- `getSimilar`
- `getCredits`
- `getPersonCredits`
- `getImageUrl`

Note: embed-URL construction is **not** part of the TMDB layer. It lives in the provider layer below.

## Playback Providers
The playback source list is decoupled from the app bundle so it can change without a code edit.

- [public/providers.json](public/providers.json) is the source of truth. It ships as a static asset, so it is fetched at runtime rather than inlined at build time.
- [schema/providers.schema.json](schema/providers.schema.json) is the JSON Schema for that file.
- [scripts/validate-providers.mjs](scripts/validate-providers.mjs) enforces it plus the rules the schema cannot express. Run `yarn validate:providers` before committing a provider change; CI runs it on every PR.
- [src/services/providers.ts](src/services/providers.ts) is the reader:
  - `loadProviders()` fetches `providers.json`, checks `version`, drops malformed entries, and caches the promise for the page session so repeated `WatchPage` mounts share one request.
  - On **any** failure (network, bad status, wrong version, empty list) it logs a warning and resolves to `FALLBACK_PROVIDERS` so the player still renders.
  - `FALLBACK_PROVIDERS` is a hardcoded mirror of `providers.json` (currently an exact copy). Keep it in sync when entries change.
  - `buildEmbedUrl(provider, type, id, season, episode)` fills the provider's URL template.
- [src/types/providers.ts](src/types/providers.ts) defines `Provider` and `ProvidersConfig`.

### Provider entry shape
Each entry carries its own URL templates, so **adding a host requires no code change** — only a `providers.json` edit:

```json
{
  "id": "server-vip",
  "label": "Server VIP",
  "host": "vidlink.pro",
  "movie": "https://{host}/movie/{id}",
  "tv": "https://{host}/tv/{id}/{season}/{episode}"
}
```

Supported placeholders: `{host}`, `{id}`, `{season}`, `{episode}`. Templates must be `https://` and must contain `{id}`.

### Notes
- `id` is the selection key. Changing an existing `id` resets that source's selection for users; prefer editing `label`/`host`/templates in place.
- The schema cannot express uniqueness or cross-file rules; `yarn validate:providers` covers those (duplicate ids/labels, unknown placeholders, templates that leave the declared host, non-https URLs, tv templates ignoring season/episode, and `FALLBACK_PROVIDERS` drifting out of sync with `providers.json`).
- One entry per host. An earlier hardcoded list had eight entries covering the same three hosts under different labels, so several buttons produced identical URLs; those duplicates were removed.

## Types
[src/types/tmdb.ts](src/types/tmdb.ts) defines the shared media shapes.

- `Movie`
- `TVShow`
- `Media` union
- `TMDBResponse<T>`

The app frequently uses runtime field checks such as `title in item` because TMDB search results are mixed media.

[src/types/providers.ts](src/types/providers.ts) defines the playback provider shapes: `Provider` and `ProvidersConfig`.

## Hooks
- [src/hooks/useTheme.ts](src/hooks/useTheme.ts) is a thin context accessor and throws if used outside `ThemeProvider`.
- [src/hooks/useDebounce.ts](src/hooks/useDebounce.ts) debounces search input and other query state.
- [src/hooks/useTrending.ts](src/hooks/useTrending.ts) fetches trending media, though the main home page currently fetches directly from the service layer.

## Theme System
[src/context/ThemeContext.tsx](src/context/ThemeContext.tsx) controls dark/light mode.

- Default state is dark mode.
- Toggling adds or removes `light` and `dark` classes on `document.documentElement`.
- The theme is controlled entirely on the client; there is no persistence layer yet.

## Styling System
- [src/index.css](src/index.css) is the global styling entry.
- Tailwind utilities are the main styling mechanism.
- There are theme tokens for brand colors and light mode values.
- Global CSS includes:
  - scrollbar hiding helpers
  - light-mode overrides for common white/black utility classes
  - animation keyframes for fade, zoom, grow, and stroke effects

## Shared Utilities
- [src/utils/cn.ts](src/utils/cn.ts) merges class names with `clsx` and `tailwind-merge`.

## Continuous Integration
[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every pull request and on pushes to `main`:
install (frozen lockfile) -> assert `yarn.lock` was not rewritten by the install -> `yarn validate:providers` -> `yarn lint` -> `yarn build` -> assert `dist/providers.json` shipped.

The lockfile assertion exists because yarn 1 can prune optional native binaries for
platforms other than the runner's, which still builds on Linux but breaks a clean
install on macOS/Windows.

`yarn lint` is a required check, so the lint baseline must stay at zero errors.

## Configuration
- [vite.config.ts](vite.config.ts) sets:
  - `base: './'`
  - the `@` alias to `src`
  - the TMDB dev proxy
- [tsconfig.app.json](tsconfig.app.json) also maps `@/*` to `./src/*`.
- [eslint.config.js](eslint.config.js) uses the flat config with React hooks and React refresh rules.
- [vercel.json](vercel.json) rewrites `/tmdb/:path*` to TMDB and routes all other paths to `index.html`.
- [public/robots.txt](public/robots.txt) disallows crawling.
- [public/providers.json](public/providers.json) is runtime config, not build config — see "Playback Providers".
- [eve-automation-plan.md](eve-automation-plan.md) is the roadmap for automating provider updates; [context.md](context.md) is the working log of that effort (phase status, branches, decisions, outstanding manual steps). The provider decoupling above is Phase 0 of that plan and is on `main`.

## Provider Automation (Eve agent)
The goal is a bot that checks the playback providers daily and swaps out dead ones by committing to `public/providers.json` directly — no PR, no auto-merge (the repo is private with one committer). Status:

- **Phase 0 — decouple providers** (this section's `providers.json` layer): ✅ on `main`.
- **Phase 1 — CI gate**: ✅ on `main` (PR #1). [.github/workflows/ci.yml](.github/workflows/ci.yml) + `scripts/validate-providers.mjs` (`yarn validate:providers`) run on every PR and push. Branch protection is **not enforced** (private repo on a personal account), so CI reports but does not block.
- **Phase 2 — the Eve agent**: 🔶 branch `eve-provider-agent` (not merged). Adds `eve-agent/`, a standalone [Eve](https://vercel.com/eve) project (Node 24, its own `package.json`/`tsconfig`, excluded from this repo's eslint). Tools: `read_providers`, `check_provider` (returns evidence, not a verdict), `update_providers` (re-validates, refuses no-ops and empty lists, commits to `main`), `notify` (ntfy). Daily schedule `0 6 * * *` UTC. Model: a free `minimax/*` AI Gateway model.
- Deploying the agent needs the user to supply a GitHub token + ntfy topic and run `eve deploy`. See [context.md](context.md) → "Outstanding manual steps".

## Commands
This project uses **yarn**. `yarn.lock` is the only lockfile that should be committed;
`package-lock.json` and `pnpm-lock.yaml` are gitignored.

- `yarn install`
- `yarn dev`
- `yarn build`
- `yarn lint`
- `yarn preview`
- `yarn validate:providers`

## Environment
Required client env var:

- `VITE_TMDB_ACCESS_TOKEN`

## Implementation Notes
- The app uses `HashRouter`, so route changes are hash-based even though the Vercel config includes an SPA fallback.
- There is no persistent theme preference yet.
- The lint baseline is **0 errors** and CI runs `yarn lint` — keep it there. TMDB response shapes are typed in [src/types/tmdb.ts](src/types/tmdb.ts) (`MediaDetails`, `SeasonDetails`, `Credits`, etc.); async page state is derived rather than set inside effects.
- Search and watch flows assume poster/backdrop paths may be missing, so image helpers often return `null` and callers fall back to empty strings.
- `WatchPage` renders `FALLBACK_PROVIDERS` on first paint and swaps in the fetched list when it arrives, so the source buttons are never empty. If the fetched list no longer contains the selected `id`, the selection resets to the first entry.
- The current design relies on dark glassmorphism styling with a light-mode override layer in global CSS.

## Suggested Working Order For Future Changes
1. Check the route and page that own the behavior.
2. Follow the page into the TMDB service helper if the issue is data-related.
3. Update shared theme or layout components only if the behavior is cross-cutting.
4. Run `yarn build` and `yarn lint` after changes that touch routing, hooks, or the service layer. If you touched `public/providers.json` or its schema, also run `yarn validate:providers`.