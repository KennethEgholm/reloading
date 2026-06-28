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
- Load logs: full denormalized snapshots on the log row — name/caliber/charge/**COAL**/projectile/propellant/primer/**cartridge** (brand/caliber/water capacity)/V0/fillRate — plus the projectile/propellant/primer IDs for restore-on-delete. Delete uses a transaction that restores using the snapshot values (cartridge is snapshotted but not consumed, so it isn't restored).
- Range logs: same snapshot model, the same set (now including **cartridge** brand/caliber/water capacity — full parity with Load logs) — frozen recipe snapshot on the row (name, caliber, charge, COAL, projectile/propellant/primer, cartridge, V0, fillRate), `recipeId` nullable + `onDelete: SetNull`. Re-snapshot only when the session's `recipeId` changes (preserve the frozen values otherwise, including when the linked recipe was deleted). `deleteRecipe` is therefore unguarded — deleting a recipe nulls the range-log FKs and the snapshot survives.
- **Chronograph CSV import**: range sessions can import a Xero C1 chronograph CSV from inside `RangeLogForm`. Client-side parser `lib/parseChronographCsv.ts` (pure, unit-tested) extracts per-shot velocities and computes aggregates (population stddev). Shots are sent to the server action as JSON in FormData (`shots` + `replaceShots` flags), validated with `shotsSchema` (`lib/schemas.ts`), and persisted in a new `RangeLogShot` child model (`onDelete: Cascade`). The action recomputes aggregates from the validated shots as a cross-check, overwriting any client-submitted velocity values. The detail page renders a shot-by-shot table.
- "Possible" loads calculation lives in `RecipesTable.tsx` (client, uses grain-to-gram conversion).
- Propellant weights shown with 1 decimal place.
- Keyboard: document `keydown` listener (Enter save / Esc close). Exception for `<textarea>`. Auto-focus name/brand field on open.
- Toasts via Sonner on every mutation path.
- Overview (`app/page.tsx`) structure (per user spec): summary cards + sections ordered Range Sessions first, then Load Logs, then Recipes, then inventory (primers/projectiles/propellants/cartridges). Uses recent previews (5) + aggregates for Range/Load; reuses RangeLogRow + new LoadLogRow. All activity mutations revalidate '/'.
- Theming is **class-based** (not `prefers-color-scheme`): `globals.css` defines `@custom-variant dark (&:where(.dark, .dark *))` and the CSS vars follow `.dark` on `<html>`. An inline pre-paint script in `layout.tsx` sets `.dark` from `localStorage.theme` (`light`/`dark`/`system`, default system) to avoid FOUC; `<html>` has `suppressHydrationWarning`. The Light/Dark/System control is `app/settings/ThemeToggle.tsx` (client, localStorage-backed, live-updates on OS change while in system mode). Theme is intentionally a per-device browser pref, NOT in the DB.
- **Accent** is a second, orthogonal axis: a `data-theme` attribute on `<html>` (`copper` default / `brass` / `field`) selects `--accent`/`--accent-hover` CSS vars, exposed to Tailwind as `text-accent`/`bg-accent`/etc. via `@theme inline`. Each theme defines both a light value (`[data-theme=...]`) and a dark value (`.dark[data-theme=...]`, higher specificity). Same plumbing as dark mode: the pre-paint script in `layout.tsx` sets `data-theme` from `localStorage.accent`, `ThemeApplier.tsx` re-applies it (and syncs cross-tab via the `storage` event), and `app/settings/ThemePicker.tsx` is the control (mirrors `ThemeToggle`'s `useSyncExternalStore` pattern). Use `text-accent hover:text-accent-hover` for links — never hard-code a color like `blue-600`.
- **Fonts** (all via `next/font/google` in `layout.tsx`): Geist Sans for body, **Space Grotesk** for headings (`font-display`), **JetBrains Mono** for numeric/ballistics data (`font-mono`, which also carries `font-variant-numeric: tabular-nums` from `globals.css`).
- AI model calls go through `lib/ai.ts` (a plain module, NOT `'use server'`, so it can export constants/sync helpers): `chatCompletion` (OpenAI-compatible `/chat/completions`, throws typed `AiError`), `parseJsonFromModel` (defensive JSON extraction), `DEFAULT_BASE_URLS`. Reuse it for any new model call rather than re-implementing fetch.
- Recipe AI Safety Check (`app/recipes/actions.ts`): core is `assessRecipeData(input)` (DB-pure; only fields with data are sent to the model — null/0 omitted so placeholder zeros aren't flagged). Two entry points: `runRecipeAiCheck(recipeId)` assesses the SAVED recipe and persists; `runRecipeAiCheckOnInput(input)` assesses the CURRENT edit-form values (components resolved by id) and persists **only if** the form matches the saved recipe (`recipeMatchesInput`), so a stored verdict never describes unsaved data. Result shape persisted on `Recipe`: `aiVerdict`/`aiSummary`/`aiConcerns` (JSON string)/`aiModel`/`aiCheckedAt`. UI: detail-view card `app/recipes/[id]/RecipeAiCheck.tsx` + edit-form section in `RecipeForm.tsx`; both render via shared `app/recipes/AiVerdictDisplay.tsx` (`AiVerdictDisplay` + `AiDisclaimer`). **Advisory only** — the prompt forbids declaring a load definitively "safe", and the persistent disclaimer is always shown. Parsing is defensive: bad/garbled model output → `UNKNOWN`, never a 500.
- Settings (`app/settings/`): AI model config as a **singleton** `AiSettings` row (`id = "singleton"`, always `upsert`). Single switchable config (provider dropdown + fields), not multiple profiles. Form is rendered **inline on the page** (not a modal — it's one editable record, not a list). API key is write-only across the boundary: `page.tsx` passes only `hasApiKey` + `apiKeyLast4` to the client (never the raw key); a blank key field on save means "keep existing key". `testAiConnection` returns `{ ok, message }` (does not throw) and falls back to the stored key when the field is blank. xAI/Grok is OpenAI-compatible — connection test is `GET {baseUrl}/models` with a bearer token via native `fetch` (no SDK dependency). Server action validates with Zod at the boundary. The Settings page also has a **Data** card (`app/settings/DataCard.tsx` + `app/settings/dataActions.ts`) for export/import of all user data. **Inventory**: `exportInventory`/`previewInventoryImport`/`executeInventoryImport` — merge by natural key (brand+type for primers/propellants, brand+caliber for projectiles/cartridges), match → update amount/description, no match → create. **Recipes**: `exportRecipes`/`previewRecipesImport`/`executeRecipesImport` — match by name+caliber (case-insensitive); components (primer/projectile/propellant/cartridge) resolved by natural key, **stub inventory rows created if missing** (zero amount, no description); update resets the AI verdict so imported recipes are re-checkable. **Load logs**: `exportLoadLogs`/`previewLoadLogsImport`/`executeLoadLogsImport` — match by date-ms+recipeName+quantity; snapshot fields from the file are authoritative (data-integrity rule), `recipeId` re-linked by name+caliber match if possible else null; **no inventory adjustments** on import (historical records, not fresh loads). **Range logs**: `exportRangeLogs`/`previewRangeLogsImport`/`executeRangeLogsImport` — match by date-ms+location+recipeName; `RangeLogShot` rows included (replaced on update via transaction); **`RangeLogImage` rows are dropped on export** (sessions import imageless); same snapshot-preserve + no-inventory-adjustment rules as load logs. **Everything**: `exportEverything` bundles inventory+recipes+loadLogs+rangeLogs into one JSON. `DataCard` auto-detects the file type from its top-level keys and routes to the right preview/execute pair. Non-destructive: records not in the file are left untouched.

- Inventory items follow a uniform per-domain pattern (`app/<item>/`: `page.tsx` + `Form` + `Table` + `Delete*Button` + `actions.ts`, with a nav link + overview section + summary card). The nav dropdown is `app/InventoryMenu.tsx` (labeled "Personal Inventory"). Inventory: primers, projectiles, propellants, **cartridges**. To add another, copy an existing one (propellants is the simplest template; projectiles/cartridges add `caliber` + `amount`). Cartridges also have an optional `waterCapacityGr` (grains of water) and link to recipes via optional `Recipe.cartridgeId` (like `primerId`); the cartridge is threaded through `RecipeForm`, the detail view, and the AI prompt (`assessRecipeData` cartridge* fields + `recipeMatchesInput`).

## Internationalization (next-intl, EN/DA)
The app is **fully bilingual** (English / Danish). This touches nearly every file and must not be ignored.
- Routing: `i18n/routing.ts` defines `locales: ['en','da']`, `defaultLocale: 'en'`, **`localePrefix: 'never'`** — URLs have no `/en`/`/da` prefix. The active locale lives in a `NEXT_LOCALE` cookie (max-age 1yr). `middleware.ts` detects it cookie → `Accept-Language` → default, sets `x-next-intl-locale` on the response. `i18n/request.ts` loads `messages/<locale>.json` (`timeZone: 'Europe/Copenhagen'`).
- Dictionaries: `messages/en.json` and `messages/da.json`, 14 top-level namespaces (`nav`, `overview`, `primers`, `projectiles`, `propellants`, `cartridges`, `recipes`, `logs`, `range`, `settings`, `common`, `errors`, `metadata`, `localeSwitcher`). **Every** user-facing string — page headings, table headers, form labels, button labels, toasts, AI verdict text, Zod validation messages — flows through `t()` (client, `useTranslations`) or `getTranslations` (server). Never hard-code English in a component/action; add the key to both message files instead. Server actions in `lib/schemas.ts` take a `t` translator for localized validation errors.
- UX: the **Settings** page renders `app/settings/LocaleSwitcher.tsx`, a `<select>` that writes `NEXT_LOCALE` and reloads the current path. Dates use `Intl.DateTimeFormat` via `lib/format.ts` with the active locale (avoids hydration mismatch). `app/layout.tsx` sets `<html lang={locale}>` and wraps the tree in `NextIntlClientProvider`.
- **Drift hazard**: there is no automated check that `en.json` and `da.json` stay in sync. A missing key renders the key path verbatim. When adding/renaming/removing any user-facing string, update BOTH files in the same change. If a string is brand/code/identifier, leave it untranslated (or wrap in `<span translate="no">` if auto-translation could mangle it).

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

## Session Workflow (build → verify → test → report)
When completing a task, run these steps in order before reporting back:
1. **Build** — `pnpm build` (or `./node_modules/.bin/tsc --noEmit` for a fast typecheck)
2. **Verify** — confirm exit 0 and inspect output for errors
3. **Test** — `pnpm test`
4. **Report back** — summarize what changed and the verification results, then **wait for approval** before committing or pushing

### Commit / Push Rules
- Do **not** commit or push until the user explicitly approves
- Do **not** create branches — work on the current branch
- Do **not** create PRs
- Push directly to `main` when approved
- Use clean conventional commit messages

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
