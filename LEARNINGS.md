# Learnings

> **Note for collaborators/AI:** The developer on this project is new to Supabase. When explaining Supabase concepts (migrations, RLS, service role, Studio, CLI commands, etc.), provide extra detail and context rather than assuming familiarity.

## 2026-06-17 — Price level display + admin ambient clue preview

### What was accomplished
- Changed price level display from bare peso symbols (`₱₱`) to `₱₱ · ₱300–800/person` across all three `PRICE_LABELS` lookup tables (`src/lib/puzzle.ts`, `place-card/route.ts`, `admin/place-details/route.ts`). Ranges are approximate estimates, not from the Google API — Google only exposes a 5-level categorical enum, not actual price numbers.
- Added an "Ambient clues (live from Google)" panel to the `RestaurantRow` edit form in the admin, showing the four ambient clue values (rating, review count bracket, price level, neighborhood) with a "Re-fetch" button.

---

### What worked well

**Reusing `parseAmbientClues` in the admin endpoint**
The game already had `parseAmbientClues(place)` in `src/lib/puzzle.ts` that derives all four ambient clue fields from a Places API response. Importing it in `/api/admin/place-details` let us return the exact same computed values the game uses — no duplicated logic, guaranteed consistency.

**`AmbientCluesPreview` component used in both Add and Edit flows**
Creating a small `AmbientCluesPreview` component that takes an `AmbientClues` object and renders the four rows meant it slotted into both the Add Restaurant preview card and the Edit panel re-fetch section with a single extraction.

**`cache: 'no-store'` on the admin Places API call**
The game's `fetchPlaceAmbient` uses `{ next: { revalidate: 3600 } }` — stale data is fine for players. The admin endpoint uses `{ cache: 'no-store' }` so re-fetch always returns current Google data. One-line divergence for meaningfully different semantics.

---

### Approaches that failed / required iteration

**Initial re-fetch button targeted photos only**
The first pass added a "Re-fetch photos" button to the edit panel (for refreshing the photo picker). The user's intent was actually to preview and re-fetch ambient clue data. The button was repurposed and the photos just re-fetch as a side effect of the same API call.

---

### Architectural decisions

- **`/api/admin/place-details` now returns `ambient_clues` object, not flat `rating`/`price_level`** — aligns the admin API response with what the game actually uses, and bundles all four derived fields under one key.
- **`PlacePreview` type lost flat `rating`/`price_level` fields** — they moved into `ambient_clues: AmbientClues`. All display code references `preview.ambient_clues.*`.
- **Google price level is categorical, not numeric** — `PRICE_LEVEL_MODERATE` → `₱₱`. The peso ranges shown in the game UI are manually defined estimates. The "₱500–3,000 per person" text visible in Google Maps is not exposed in the Places API.

---

### Library / tool quirks

**`userRatingCount` and `addressComponents` are needed for the full ambient clue set**
`rating` and `priceLevel` alone are not enough. `review_count_bracket` requires `userRatingCount`; `neighborhood` requires `addressComponents`. The admin place-details endpoint was originally only fetching the first two — it had to add the other two to the `X-Goog-FieldMask` header.

---

### Recurring errors and fixes

*(None new this session.)*

---

## 2026-06-17 — "Show next clue" skip mechanic

### What was accomplished
Added a "Show next clue" button that lets players reveal the next clue without guessing. Skipping costs a guess slot (same as a wrong guess), capping total play at 6 actions regardless of skip/guess mix. Skips appear as 🟧 in `GuessHistory` and the shareable emoji grid. Fixed a pre-existing `MAX_GUESSES = 5` bug in `ResultScreen` that had been silently truncating the emoji grid.

---

### What worked well

**Treating skips as wrong guesses — zero new state machinery**
A skip is stored as `{ name: 'Skipped', correct: false, skipped: true }`. Because `wrongGuesses = guesses.filter(g => !g.correct).length` already drives both the clue reveal threshold and the loss condition, skips naturally unlock the next clue and count toward the 6-guess limit. No new counters, no new state fields.

**Client-only skip — no API round-trip**
The `/api/puzzle/guess` route exists only to validate a place ID server-side. A skip has nothing to validate, so `handleSkip` just mutates local state and saves to localStorage. Keeps the skip instant and offline-capable.

---

### Approaches that failed

*(No failed approaches this session.)*

---

### Architectural decisions

- **"Show next clue" button hidden at `wrongGuesses >= 5`** — all 5 clues are already revealed at that point, and one more action loses the game. Players must commit a real guess when fully informed.
- **`skipped?: boolean` is optional on `Guess`** — backward-compatible with existing localStorage saves that predate the flag. `undefined` is falsy, so old entries render correctly as wrong guesses.
- **`ResultScreen` now receives `guesses: Guess[]` instead of `guessCount: number`** — richer data needed to distinguish 🟧/🟥/🟩 per slot. Prior approach (integer count) was lossy.

---

### Library / tool quirks

*(None new this session.)*

---

### Recurring errors and fixes

**`ResultScreen.MAX_GUESSES = 5` truncated the 6th entry**
`ResultScreen.tsx` had its own `const MAX_GUESSES = 5` while `page.tsx` allows 6 total guesses. With the old integer-based `buildEmojiGrid`, this was masked — the function used `Math.min(guessCount, MAX_GUESSES)` and always forced the final action into the last slot. After switching to per-entry mapping, the 6th guess was silently sliced off. Fix: change `MAX_GUESSES` in `ResultScreen` to 6.

---

## 2026-06-17 — Blind guess slot: 6-guess mode

### What was accomplished
Added a "blind guess" slot before any numbered clue is shown, increasing total guesses from 5 to 6. Players can now guess purely from ambient clues (rating, price, neighborhood, reviews) before any establishment type, menu, or photo is revealed.

---

### What worked well

**Clue threshold shift was a clean +1 across the board**
All clue thresholds in `ClueReveal.tsx` were contiguous integers (1, 2, 3, 4). Adding the blind slot meant incrementing every threshold by 1 — no edge cases, no branching logic. The counter in `page.tsx` and the `isLastGuess` check in the guess API route each needed a single constant change (`MAX_GUESSES`, `>= 5` → `>= 6`).

---

### Approaches that failed

*(No failed approaches this session.)*

---

### Architectural decisions

- **Clue order (revised again):** blind guess (ambient only) → Clue 1 type/cuisine (after miss 1) → Clue 2 menu photo (miss 2) → Clue 2+ name/desc/price (miss 3) → Clue 4 second menu item (miss 4) → Clue 5 exterior (miss 5). 6 total guesses.
- **Blind slot uses an italic nudge** ("No clues yet — guess blind!") rather than leaving the clue box empty, so players understand it's intentional and not a loading failure.

---

### Library / tool quirks

*(None new this session.)*

---

### Recurring errors and fixes

*(None new this session.)*

---

## 2026-06-17 — UI polish: clue labels, ambient disclaimer, autocomplete width fix

### What was accomplished
- Added "from Google Maps data" disclaimer below the ambient clues row in `AmbientClues.tsx`.
- Labeled each clue in `ClueReveal.tsx`: Clue 1 "Type and Cuisine", Clue 2 "Menu Picture #1" (label upgrades to "Menu Picture #1 + Description" when the description is revealed), Clue 4 "Menu Picture #2 + Description", Clue 5 "Exterior".
- Consolidated the old separate Clue 2 (photo) and Clue 3 (description) sections into a single block — the photo stays mounted, only the label and description visibility change.
- Fixed layout-width jitter caused by `PlaceAutocompleteElement` changing its intrinsic width as suggestions appear.

---

### What worked well

**Single-block clue 2/3 with conditional label**
The old code rendered the item1 photo and the item1 description as two separate sibling blocks inside the clue container. Collapsing them into one block with `{guessCount >= 2 ? 'Menu Picture #1 + Description' : 'Menu Picture #1'}` as the label is cleaner — the photo never re-mounts, there's no duplicate border, and the label update is a natural consequence of guessCount changing.

---

### Approaches that failed

*(No failed approaches this session.)*

---

### Architectural decisions

- **Clue labels are display-only** — they're derived from `guessCount` at render time, not stored anywhere. The label "Clue 3" never appears as a heading; Clue 3 is expressed as a label change on the Clue 2 block.

---

### Library / tool quirks

**`PlaceAutocompleteElement` causes full-page width jitter when `<main>` lacks `w-full`**
The `<body>` in this app is `flex flex-col`. Inside a flex container, block children don't automatically stretch to the full parent width — they size to their content. Without `w-full` on `<main>`, the main container's width is determined by its widest child. As `PlaceAutocompleteElement` (a web component with shadow DOM) resizes itself while showing or hiding suggestions, the `<main>` width changes with it. Fix: add `w-full` to `<main>` so the container is always pinned to the full available width (capped by `max-w-lg`), regardless of any child's intrinsic size.

---

### Recurring errors and fixes

*(None new this session.)*

---

## 2026-06-17 — Clue redesign + exterior photo curation

### What was accomplished
- Rewrote the clue progression in `ClueReveal.tsx` so establishment type + cuisine shows from the start (no longer buried at clue 3), and exterior photo moved to clue 4 (was clue 5 and unreachable).
- Added `exterior_photo_ref` column to the `restaurants` table and wired it end-to-end: migration → types → POST/PATCH API → `today` route → admin Add form → admin Edit form.

---

### What worked well

**Spotting the dead clue via the component + game logic together**
`ClueReveal.tsx` had `guessCount >= 5` for the exterior photo, but `page.tsx` sets `lost = true` at 5 wrong guesses and swaps in `ResultScreen`. The clue was valid JSX but structurally unreachable. Cross-reading the component and the game state logic at the same time caught it immediately.

**Skip the Google API call when the stored value is set**
In `today/route.ts`, the `fetchPlacePhotos` call was made unconditionally just to take `photos.at(-1)`. Once `exterior_photo_ref` is stored on the restaurant row, that live call is only needed as a fallback. Skipping it when the stored value is present saves a round-trip on every puzzle load:
```ts
const [ambient, fallbackPhotos] = await Promise.all([
  fetchPlaceAmbient(restaurant.place_id),
  restaurant.exterior_photo_ref ? Promise.resolve([]) : fetchPlacePhotos(restaurant.place_id),
])
```

**Fetching place photos lazily in the edit flow**
The edit form doesn't have a `PlacePreview` in scope (unlike the Add form, where photos come back from the initial place lookup). Triggering a `fetch('/api/admin/place-details?place_id=...')` inside a `useEffect` that runs when `editing` becomes true gives the same photo picker without restructuring the component.

---

### Approaches that failed

*(No failed approaches this session.)*

---

### Architectural decisions

- **Clue order (revised):** cuisine/type always visible → menu item 1 photo (after wrong guess 1) → item 1 name/desc/price (guess 2) → item 2 with photo (guess 3) → exterior photo (guess 4). This makes the first guess informed and makes exterior photo reachable.
- **`exterior_photo_ref` stored on the restaurant row** — admin curates it explicitly, the same way they curate `menu_items[].photo_reference`. The live `fetchPlacePhotos` heuristic (`photos.at(-1)`) is kept only as a backward-compat fallback for restaurants that predate the column.
- **Edit mode photo picker loads on demand** — photos are not stored on the `RestaurantFull` type; they're fetched from `/api/admin/place-details` when the edit panel opens. Keeps the restaurants list endpoint cheap.

---

### Library / tool quirks

**`supabase db push` vs `supabase migration up`**
`supabase db push` requires a linked remote project (`supabase link`) — it's for deploying to Supabase cloud. For local development against `supabase start`, the correct command is `supabase migration up`, which applies pending migrations to the local Postgres instance.

---

### Recurring errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `Cannot find project ref. Have you run supabase link?` | Ran `supabase db push` against a local-only project | Use `supabase migration up` for local dev |

---

## 2026-06-17 — Game page autocomplete: guess never fired on selection

### What was accomplished
Fixed `GuessInput.tsx` (game page) so that selecting a restaurant from the autocomplete dropdown actually fires a guess. Before the fix, selecting a suggestion appeared to do nothing.

### Root cause
`GuessInput.tsx` was scaffolded before the admin dashboard work and still used the old Google Maps Places API event contract:
- Listening for `gmp-placeselect` (silently never fires — event was renamed `gmp-select`)
- Reading `event.place` directly (returns `undefined` — event now carries `placePrediction`, not a `Place`)

Both bugs were already documented in the 2026-06-17 admin dashboard entry below. The admin page had the correct pattern; the game page didn't.

### Fix
In `src/components/game/GuessInput.tsx`:
1. `element.addEventListener('gmp-placeselect', ...)` → `element.addEventListener('gmp-select', ...)`
2. `const { place } = event` → `const { placePrediction } = event; const place = placePrediction.toPlace()`

### Lesson
When scaffolding new components that use `PlaceAutocompleteElement`, copy the event-handling pattern from `admin/page.tsx` — not from the initial scaffold or the 2026-06-16 era code.

---

## 2026-06-17 — Puzzle queue debugging: today's puzzle not loading

### What was accomplished
Diagnosed and fixed three layered bugs that prevented a queued puzzle from appearing on the main page. All three bugs were silent failures — the UI just showed "no puzzle today" with no actionable error.

---

### What worked well

**Reading the RLS policies to find the real culprit**
The main page was silently returning 404/500 because the `puzzle/today` API route used the anon Supabase client, which is blocked from reading unapproved restaurants. The fix was to use `getSupabaseAdmin()` in server-side route handlers that need full data access regardless of approval state. Rule: use the anon client only for client-browser trust boundaries; use the admin client in all Next.js API routes.

**Tracing the bug through the queue → route → RLS chain**
The three bugs had to be fixed in the right order. The queue date offset was the first blocker, the anon client was the second, and the `c.types` crash was the third. Each fix exposed the next layer.

---

### Approaches that failed

*(No new failed approaches this session — all three fixes were correct on first attempt.)*

---

### Architectural decisions

- **Queue starts from today (index 0 = today)** — previously the queue started from tomorrow. Changed so index 0 is today's active puzzle and saving the queue immediately changes what appears on the main page. Puzzle rotation at midnight is automatic because the date advances.
- **`puzzle/today` uses `getSupabaseAdmin()`** — server-side API routes that need to serve queued puzzles must bypass RLS. The `approved` flag controls public discoverability (search, browsing), not whether a queued restaurant can be played.

---

### Library / tool quirks

**Supabase join + RLS silently nulls related row**
When using `.select('restaurants(...)') ` with the anon client, if the joined row is blocked by RLS (e.g. `approved = false`), Supabase returns `restaurants: null` rather than an error. The parent row (puzzle_queue) is still returned. Code that doesn't check for null on the join result will crash silently or return wrong data.

---

### Recurring errors and fixes

| Error | Cause | Fix |
|---|---|---|
| Main page shows "no puzzle today" despite queue entry existing | Queue `phtDate` offset was `i+1` (tomorrow) instead of `i` (today) | Change PUT to delete from today, insert with `phtDate(i)` |
| Main page shows "no puzzle today" despite correct queue date | `puzzle/today` used anon client; restaurant had `approved=false`; join returned null | Switch to `getSupabaseAdmin()` in `puzzle/today` route |
| `TypeError: Cannot read properties of undefined (reading 'includes')` at `c.types.includes(...)` | Google Places API returned an address component with no `types` field | Use optional chaining: `c.types?.includes(...)` |
| `<gmp-place-autocomplete>: Encountered a network request error: Could not load "log"` | Google Maps SDK telemetry blocked by ad blocker / browser privacy settings | Harmless — ignore. Autocomplete still functions. |

---

## 2026-06-17 — Admin dashboard: end-to-end wiring + queue UI

### What was accomplished
Got the admin dashboard fully functional: Place autocomplete → form fields → Supabase insert. Fixed several silent failures along the way. Built a drag-and-drop queue manager and a full CRUD Restaurants tab.

---

### What worked well

**Exposing errors instead of swallowing them**
Adding visible error states to `PlaceLookup` (instead of silent no-ops on failed `fetch`) immediately surfaced what was broken at each layer. Pattern: always show the raw error string from the server in the UI during admin/dev flows.

**Native HTML5 drag-and-drop for simple admin lists**
No library needed for a two-list DnD admin tool. `draggable`, `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop` on elements + `stopPropagation` on nested drop zones is sufficient. Key pattern: explicit `DropZone` divs between items (rather than trying to detect top/bottom halves of cards) give reliable insert-position targeting.

**PHT date helper for queue scheduling**
```ts
function phtDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}
```
`en-CA` locale reliably produces `YYYY-MM-DD` (Postgres `date`-compatible) in any timezone.

**`supabase migration new <name>` for correct filename format**
CLI generates the exact 14-digit timestamp prefix it expects. Never hand-craft migration filenames — just run `supabase migration new`, paste SQL in, then `supabase db reset`.

---

### Approaches that failed

**`gmp-placeselect` event on `PlaceAutocompleteElement`**
The event was renamed to `gmp-select` in a newer API version. The old name registers silently with no error — the handler just never fires. Confirmed via the `@vis.gl/react-google-maps` type declarations which document the emitted events.

**`event.place` on the `gmp-select` event**
The `gmp-select` event no longer carries a `Place` directly. It carries a `PlacePrediction`. Must call `event.placePrediction.toPlace()` first, then `place.fetchFields(...)`. The old destructuring `const { place } = event` returns `undefined` silently.

**`?fields=` query param on Places API (New)**
The v1 Places API endpoint (`https://places.googleapis.com/v1/places/{id}`) ignores `?fields=` as a query parameter. Fields must be specified via the `X-Goog-FieldMask` request header. Passing it as a query param returns 200 with no fields populated (or a 4xx depending on the request).

**API key with HTTP referrer restrictions for server-side fetch**
Restricting a key to HTTP referrers (browser-only) blocks Node.js `fetch` calls from Next.js API routes — those don't send a `Referer` header. Use IP restrictions or no restriction for keys used server-side. For production: separate browser key (referrer-restricted) and server key (IP-restricted).

**Hand-crafted migration filename**
`20260617000000_initial_schema.sql` was skipped by the CLI with `file name must match pattern`. Even though the format looks correct, use `supabase migration new` to guarantee acceptance.

---

### Architectural decisions

- **Queue managed by ordered restaurant IDs, not stored dates** — the PUT `/api/admin/queue` endpoint deletes all future entries and re-inserts with consecutive dates from tomorrow. The order is canonical; dates are derived from position.
- **Admin has three tabs**: "Add restaurant" (create + curate), "Queue" (schedule), "Restaurants" (CRUD on existing records). Scheduling is decoupled from creation.
- **Photo reference in edit form is read-only** — changing a dish photo requires deleting and re-adding the restaurant. Acceptable for v1.
- **`ON DELETE CASCADE` on `puzzle_queue.restaurant_id`** — deleting a restaurant automatically removes its queue entries. No manual cleanup needed.

---

### Library / tool quirks

**`npm run dev` vs Docker for local development**
The production Dockerfile runs `npm run build` + `node server.js` — no file watching, no hot reload. For local dev, run `npm run dev` directly on the host. Docker is for production builds only.

**Supabase service role still needs table-level `GRANT`**
The service role key bypasses RLS *policies*, but it still needs explicit SQL `GRANT ALL ON table TO service_role` to access tables created via raw migrations. The Supabase dashboard auto-grants these; raw migration files do not. Add grants explicitly at the end of each migration.

**`supabase db reset` re-runs all migrations from scratch**
It drops the entire database and replays `supabase/migrations/` in filename order. Safe to run repeatedly in dev since there's no production data yet. Required after any migration file change.

**`NOTICE (42710): extension already exists`**
`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` on a fresh Supabase local instance prints this notice because Supabase pre-installs it. It is not an error — `IF NOT EXISTS` handles it correctly.

---

### Recurring errors and fixes

| Error | Cause | Fix |
|---|---|---|
| Form fields never appear after autocomplete select | `gmp-placeselect` event no longer fires | Listen for `gmp-select` instead |
| `Cannot read properties of undefined (reading 'fetchFields')` | `event.place` is undefined on `gmp-select` | Use `event.placePrediction.toPlace()` |
| `Places API 502` | `?fields=` query param ignored by Places API v1 | Use `X-Goog-FieldMask` request header |
| `TypeError: fetch failed` on restaurant save | Supabase unreachable (wrong URL or not running) | Run `supabase status` to confirm URL; use `npm run dev` not Docker |
| `Could not find the table 'public.restaurants'` | Migrations never applied | Run `supabase migration new` + `supabase db reset` |
| `permission denied for table restaurants` (42501) | Raw migrations don't auto-grant table access to service_role | Add `GRANT ALL ON table TO service_role` in migration |
| Migration file skipped with pattern error | Hand-crafted filename rejected by CLI | Use `supabase migration new <name>` to generate correctly |

---

## 2026-06-16 — Initial scaffold + infrastructure setup

### What was accomplished
Designed and scaffolded the full v1 prototype: game UI, admin UI, API routes, DB schema, Dockerfile, and docker-compose. Resolved several infrastructure issues getting it running locally.

---

### What worked well

**Place ID as data anchor**
Storing only the Google Place ID and fetching ambient clues (rating, reviews, price, neighborhood) live at game time cleanly sidesteps Google Places ToS restrictions on caching. Server-side data never persists; client always gets fresh values.

**Lazy Supabase client initialization**
Initializing the Supabase client inside a getter function (`getSupabase()`) rather than at module level prevents `supabaseUrl is required` crashes during Next.js build-time static analysis, when env vars aren't present.

**Session tokens for Places Autocomplete billing**
Using session tokens with `PlaceAutocompleteElement` bundles all keystrokes + the final Place Details lookup into a single billable event. Significantly cheaper than per-keystroke billing at any meaningful user volume.

**`unknown as` cast for Supabase join queries**
Hand-written `Database` types don't infer join query shapes (`.select('restaurants(...)')`). Casting via `data as unknown as MyType` at the call site is the pragmatic v1 workaround until proper types are generated from the Supabase CLI.

---

### Approaches that failed

**`google.maps.places.Autocomplete`**
Deprecated as of March 2025 — not available to new API key holders. Replaced with `PlaceAutocompleteElement` (web component approach). The new API fires `gmp-placeselect` events instead of `place_changed`, and returns a `Place` object requiring `fetchFields()` rather than an inline `PlaceResult`.

**`locationRestriction: { rectangle: {...} }` on `PlaceAutocompleteElement`**
TypeScript error — the correct shape is a flat `LatLngBoundsLiteral` (`{ south, west, north, east }`) passed directly to `locationRestriction`, not wrapped in a `rectangle` key.

**`node:22-alpine` base image**
Causes `npm error Exit handler never called!` during `npm ci` due to musl libc incompatibility. Fixed by switching all three Dockerfile stages to `node:22-slim` (Debian-based).

---

### Architectural decisions

- **Clue progression**: photo → dish details → cuisine/type → second dish → exterior photo. Ambient clues (rating, reviews, price, neighborhood) always visible.
- **Neighborhood appears as ambient clue only** — originally also planned as clue #5, which was redundant. Clue #5 is now a restaurant exterior photo fetched live from Places API.
- **Photo references stored as-is** in the DB (known v1 risk: they expire). Re-hosting to Supabase Storage is a v2 task.
- **Admin auth** uses a server-side `ADMIN_SECRET` env var checked in an `/api/admin/auth` route + `x-admin-secret` header on subsequent requests. Never exposed client-side.
- **Puzzle reset** at PHT midnight (UTC+8) using `Intl.DateTimeFormat` with `timeZone: 'Asia/Manila'`.
- **Streak tracking** in `localStorage` only for v1 — no server-side accounts.
- **Guess validation** server-side only: answer Place ID never sent to the client.

---

### Library / tool quirks

**`NEXT_PUBLIC_*` vars in Docker**
These are baked into the JS bundle at `npm run build` (build time), not injected at runtime. `env_file` in docker-compose only applies at container start (runtime) — too late. Must be passed as `ARG` in the Dockerfile builder stage and as `args` in docker-compose `build:` config. Non-public server vars (`ADMIN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) work fine with `env_file` alone.

**Supabase CLI key naming**
Recent CLI versions renamed the keys in `supabase start` output:
- `Publishable` = anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `Secret` = service role key → `SUPABASE_SERVICE_ROLE_KEY`

**`PlaceAutocompleteElement` renders its own input**
It's a web component with shadow DOM — you can't style its inner input with regular CSS classes. Use `[&>*]:w-full` on the wrapper div to at least control width. Fine-grained styling requires CSS custom properties or `::part()` selectors.

**`host.docker.internal` on Linux**
Works automatically on Mac/Windows but requires `extra_hosts: - "host.docker.internal:host-gateway"` in docker-compose on Linux to resolve correctly from inside a container.

---

### Recurring errors and fixes

| Error | Cause | Fix |
|---|---|---|
| `supabaseUrl is required` at build | Supabase client initialized at module level | Use lazy getter functions |
| `npm error Exit handler never called` | Alpine + musl libc npm incompatibility | Switch to `node:22-slim` |
| `Method doesn't allow unregistered callers` | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` empty in bundle | Pass as Docker build arg |
| TS error on Supabase join results | Hand-written types don't cover join shapes | Cast via `as unknown as MyType` |
| TS error `rectangle` on `locationRestriction` | Wrong shape for `PlaceAutocompleteElement` | Use flat `LatLngBoundsLiteral` |
