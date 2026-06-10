# AGENTS.md – Reloading Tool

Instructions for AI agents / future sessions working on this codebase.

## Primary Rule
**Always keep README.md updated.** When you add, change, or remove a significant feature, page, setup step, or architectural detail, edit the README so it accurately reflects the current state of the app. The user explicitly requested this.

**Before any commit, update both the README and the architecture diagrams (`docs/architecture.md`) if the changes affect them.** Whenever a change touches the architecture, data model, routes, key flows, or anything depicted in the Mermaid diagrams, update `docs/architecture.md` to match the current state before committing. The same applies to README — keep it accurate before every commit.

## Project Goals & Non-Negotiables
- Full production-usable reloading manager (inventory + recipes + load logs + range sessions).
- **Data integrity first**: Load logs and range sessions must survive recipe/component changes. Use snapshots + transactions for inventory adjustments.
- **Sustainable Docker dev loop**: Named volumes only (never rely on anonymous or host node_modules for DB). Container start script must run `pnpm install --ignore-scripts`, `pnpm prisma generate`, and rebuilds. Do **not** suggest `docker compose down -v`.
- Consistent, opinionated UX (see below). User gives very precise feedback ("you removed the wrong one", "same photos shows twice?", "Recipe and Location is not persisted").

## Current Architecture (keep in sync with reality)
- Next.js 16 App Router. Server Components for data + forms (via Server Actions). Client Components **only** for interactivity, local state (editing, file previews, keyboards), and table wrappers that own one controlled form instance.
- Prisma 7 + Postgres adapter. No `datasource` url in schema.prisma. Adapter passed at PrismaClient construction.
- Most lists use row-click to open edit (or view for range detail). Creation only from header or dedicated routes. **Exception — recipes**: row-click navigates to the readonly detail (`/recipes/[id]`); editing is via an explicit in-row **Edit** action (opens the `RecipeForm` modal). The recipe row also shows an AI verdict badge (`Check` column) and no longer has "Log load"/"Log range" inline links (those live on the detail page).
- Range log uses a single `RangeLogForm` for create / edit / readonly (readonly disables inputs + hides upload controls, shows "Edit this session" link). After successful edit save: `router.push(\`/range/${id}\`)` to land on readonly detail.
- Photos (range only): unlimited, each with its own description. Client state split into `existingImages` (with `markedForDelete`) vs new `images[]`. Always append from state in `handleSubmit`; the dynamic `<input type="file">` elements must **not** have a `name` attribute (prevents double FormData entries on edit).
- Load logs: full denormalized snapshots on the log row + component IDs. Delete uses a transaction that restores using the snapshot values.
- "Possible" loads calculation lives in `RecipesTable.tsx` (client, uses grain-to-gram conversion).
- Propellant weights shown with 1 decimal place.
- Keyboard: document `keydown` listener (Enter save / Esc close). Exception for `<textarea>`. Auto-focus name/brand field on open.
- Toasts via Sonner on every mutation path.
- Overview (`app/page.tsx`) structure (per user spec): summary cards + sections ordered Range Sessions first, then Load Logs, then Recipes, then materials (primers/projectiles/propellants). Uses recent previews (5) + aggregates for Range/Load; reuses RangeLogRow + new LoadLogRow. All activity mutations revalidate '/'.
- Theming is **class-based** (not `prefers-color-scheme`): `globals.css` defines `@custom-variant dark (&:where(.dark, .dark *))` and the CSS vars follow `.dark` on `<html>`. An inline pre-paint script in `layout.tsx` sets `.dark` from `localStorage.theme` (`light`/`dark`/`system`, default system) to avoid FOUC; `<html>` has `suppressHydrationWarning`. The Light/Dark/System control is `app/settings/ThemeToggle.tsx` (client, localStorage-backed, live-updates on OS change while in system mode). Theme is intentionally a per-device browser pref, NOT in the DB.
- AI model calls go through `lib/ai.ts` (a plain module, NOT `'use server'`, so it can export constants/sync helpers): `chatCompletion` (OpenAI-compatible `/chat/completions`, throws typed `AiError`), `parseJsonFromModel` (defensive JSON extraction), `DEFAULT_BASE_URLS`. Reuse it for any new model call rather than re-implementing fetch.
- Recipe AI Safety Check (`app/recipes/actions.ts`): core is `assessRecipeData(input)` (DB-pure; only fields with data are sent to the model — null/0 omitted so placeholder zeros aren't flagged). Two entry points: `runRecipeAiCheck(recipeId)` assesses the SAVED recipe and persists; `runRecipeAiCheckOnInput(input)` assesses the CURRENT edit-form values (components resolved by id) and persists **only if** the form matches the saved recipe (`recipeMatchesInput`), so a stored verdict never describes unsaved data. Result shape persisted on `Recipe`: `aiVerdict`/`aiSummary`/`aiConcerns` (JSON string)/`aiModel`/`aiCheckedAt`. UI: detail-view card `app/recipes/[id]/RecipeAiCheck.tsx` + edit-form section in `RecipeForm.tsx`; both render via shared `app/recipes/AiVerdictDisplay.tsx` (`AiVerdictDisplay` + `AiDisclaimer`). **Advisory only** — the prompt forbids declaring a load definitively "safe", and the persistent disclaimer is always shown. Parsing is defensive: bad/garbled model output → `UNKNOWN`, never a 500.
- Settings (`app/settings/`): AI model config as a **singleton** `AiSettings` row (`id = "singleton"`, always `upsert`). Single switchable config (provider dropdown + fields), not multiple profiles. Form is rendered **inline on the page** (not a modal — it's one editable record, not a list). API key is write-only across the boundary: `page.tsx` passes only `hasApiKey` + `apiKeyLast4` to the client (never the raw key); a blank key field on save means "keep existing key". `testAiConnection` returns `{ ok, message }` (does not throw) and falls back to the stored key when the field is blank. xAI/Grok is OpenAI-compatible — connection test is `GET {baseUrl}/models` with a bearer token via native `fetch` (no SDK dependency). Server action validates with Zod at the boundary.

- Materials follow a uniform per-domain pattern (`app/<material>/`: `page.tsx` + `Form` + `Table` + `Delete*Button` + `actions.ts`, with a nav link + overview section + summary card). Materials: primers, projectiles, propellants, **cartridges**. To add another, copy an existing one (propellants is the simplest template; projectiles/cartridges add `caliber` + `amount`). Cartridges also have an optional `waterCapacityGr` (grains of water) and link to recipes via optional `Recipe.cartridgeId` (like `primerId`); the cartridge is threaded through `RecipeForm`, the detail view, and the AI prompt (`assessRecipeData` cartridge* fields + `recipeMatchesInput`).

## UI Patterns to Respect
- No "+ Add ..." or "Edit" buttons rendered below any list/table.
- Table wrappers (e.g. `RecipesTable`, `PrimersTable`, `RangeLogRow`) are the only places that hold `editingXxx` state and render the form (outside the `<tbody>`).
- Forms accept `initialData` + `readonly` (for range) or `defaultValues` + controlled vs uncontrolled trigger.
- After any row-click population fix, use `useEffect(() => { if (defaultValues?.id) reset(...) }, [defaultValues?.id, reset])` pattern (or equivalent for native defaultValue).
- Range list query must return full images (or a count) so the photo badge is accurate – never `take: 1` if you show `.length`.

## Dev Workflow
- Make changes on host (bind mount). Test in Docker.
- After schema change: edit `prisma/schema.prisma`, then inside container run `pnpm prisma migrate dev --name descriptive_name`. Restart app (generate happens automatically on start).
- Before saying "Done": run type check (`./node_modules/.bin/tsc --noEmit` on host or equivalent in container) and actually exercise the flow (create/edit/delete/upload) if possible. User has repeatedly said "please make sure that the app compiles before you say 'Done'".
- When user says "Commit and push", do a clean conventional commit + push.
- Use the detailed conversation summary provided at the start of sessions + the persistent Grok memory file (`~/.grok/memory/reloading-bc8d498c/MEMORY.md`) for full history.

## Memory & Documentation
- After any substantial work (especially bug fixes or new major flows), update both:
  1. This `AGENTS.md` (if new conventions appear)
  2. `README.md` (user requirement)
  3. The Grok workspace memory (write structured notes under `~/.grok/memory/reloading-bc8d498c/MEMORY.md` or let `/flush` handle it when memory is active).
- The long context summary injected into every session already contains the full history of user corrections and decisions. Do not lose that context.

## Common Pitfalls (from real history)
- Accidentally leaving stray form / +Add buttons under lists after adding row-click edit.
- Double-appending files in FormData for range photos (native input name + manual append).
- Forgetting to read + persist `recipeId` (or other fields) in the update action even though the form submits it.
- Using `take: 1` on images include when the UI shows a count.
- Breaking Docker persistence or prisma generate on container start.
- Assuming host `node_modules` + tsc is the source of truth (container is).

## When in Doubt
User said: "Please ask questions when in doubt."

Ask before implementing ambiguous requirements (e.g. whether recipe can be changed on an existing range session, exact photo delete UX, whether to support firing data stats, etc.).

Keep the app feeling solid and the data trustworthy for a reloader.

(Last updated together with the major range-log photo duplication + population fixes and the README overhaul. + Range Sessions + Load Logs integrated/reordered first on Overview per spec, with LoadLogRow extraction.)
