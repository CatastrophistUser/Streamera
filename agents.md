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
- `getEmbedUrl`

## Types
[src/types/tmdb.ts](src/types/tmdb.ts) defines the shared media shapes.

- `Movie`
- `TVShow`
- `Media` union
- `TMDBResponse<T>`

The app frequently uses runtime field checks such as `title in item` because TMDB search results are mixed media.

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

## Configuration
- [vite.config.ts](vite.config.ts) sets:
  - `base: './'`
  - the `@` alias to `src`
  - the TMDB dev proxy
- [tsconfig.app.json](tsconfig.app.json) also maps `@/*` to `./src/*`.
- [eslint.config.js](eslint.config.js) uses the flat config with React hooks and React refresh rules.
- [vercel.json](vercel.json) rewrites `/tmdb/:path*` to TMDB and routes all other paths to `index.html`.
- [public/robots.txt](public/robots.txt) disallows crawling.

## Commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Environment
Required client env var:

- `VITE_TMDB_ACCESS_TOKEN`

## Implementation Notes
- The app uses `HashRouter`, so route changes are hash-based even though the Vercel config includes an SPA fallback.
- There is no persistent theme preference yet.
- Several page and service responses use `any` in localized places, especially in the watch/search flow where TMDB response shapes vary.
- Search and watch flows assume poster/backdrop paths may be missing, so image helpers often return `null` and callers fall back to empty strings.
- The current design relies on dark glassmorphism styling with a light-mode override layer in global CSS.

## Suggested Working Order For Future Changes
1. Check the route and page that own the behavior.
2. Follow the page into the TMDB service helper if the issue is data-related.
3. Update shared theme or layout components only if the behavior is cross-cutting.
4. Run `npm run build` or `npm run lint` after changes that touch routing, hooks, or the service layer.