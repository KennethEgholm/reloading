# Reloading Tool

A web application for managing reloading components, recipes, load logs, and range sessions.

Track your inventory of primers, projectiles, and propellants. Define recipes, log the components you use when making ammunition (with automatic inventory deduction and full historical snapshots), and record range sessions including chronograph data and photos.

![Reloading Tool](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

## Features

- **Inventory Management**
  - Primers: brand, type (Small Rifle / Large Rifle / Small Pistol / Large Pistol), magnum flag, amount, description.
  - Projectiles: brand, type (e.g. "Sierra Game King"), weight (gr), caliber, amount, description.
  - Propellants: brand, type, amount (grams, displayed to 1 decimal), description.
  - Cartridges: brand/name, caliber, optional water capacity (grains of water), amount (cases on hand), description. Selectable on recipes (optional) and included in the AI safety check.
  - Full CRUD. Overview dashboard with totals + recent activity (Range Sessions and Load Logs first, then Recipes, then inventory tables). Low-stock awareness via recipe "Possible" calculations. Range and load log previews use the same row components as their dedicated pages.

- **Recipes**
  - Link one projectile + propellant + primer.
  - Charge weight (grains), COAL, calculated/measured V0, fill rate, notes.
  - "Possible" loads column: how many cartridges you can currently make based on on-hand inventory (min of projectile count, primer count, and propellant grains ÷ charge).
  - Quick links from recipes to "Log load" or "Log range" (prefills the recipe).
  - **AI Safety Check**: a button sends the recipe's data to the AI model configured in `/settings` and asks for an advisory assessment. Returns a structured verdict (`OK` / `CAUTION` / `STOP` / `UNKNOWN`) with a summary and specific concerns, rendered as a colored banner. A persistent disclaimer makes clear this is **advisory only** — always cross-check against published manufacturer load data; never rely on it for safety.
    - From the **recipe detail view**: assesses the saved recipe and saves the result (shown until re-run).
    - From the **edit form** (create or edit modal): assesses the values currently entered, including unsaved changes, so you can tweak a charge and re-check before saving. The result shows in the modal and is only saved onto the recipe when the form matches the already-saved data (otherwise it stays modal-only, to avoid a stored verdict that describes unsaved values).

- **Load Logs** (`/logs`)
  - Record a batch you loaded using a recipe (rounds + optional notes).
  - **Atomic inventory deduction** via Prisma transaction.
  - **Historical snapshots**: the log stores a complete copy of the recipe + component details at the time it was made — including charge, **COAL**, projectile/propellant/primer, and the linked **cartridge** (brand, caliber, water capacity) — so future recipe edits or component deletions don't corrupt history.
  - Detail view shows the exact snapshot + summary of components consumed.
  - Delete a log (with confirmation) and the components are restored to inventory (again via transaction using the snapshots).
  - Recent load logs are shown on the Overview (after Range Sessions).

- **Range Sessions** (`/range` – bullseye icon)
  - Full session logging: date, location, linked recipe, rounds fired, weather/conditions, notes.
  - **Historical snapshots**: each session freezes a copy of the linked recipe at creation (name, caliber, charge, COAL, projectile/propellant/primer, linked **cartridge** (brand, caliber, water capacity), calculated/measured V0, fill rate), so later recipe edits or deletion never change or erase the session's record. The detail view shows the snapshot; switching the session's recipe re-snapshots, while editing other fields preserves the frozen values.
  - Complete chronograph data: Min/Max/Avg velocity (m/s), Extreme Spread (ES), Standard Deviation (SD).
  - **Unlimited photos** with individual descriptions per photo. Photos stored locally (`public/uploads/range-logs`).
  - **Chronograph CSV import**: upload a Xero C1 export (`.csv`) from inside the range session form. The app parses per-shot velocities in the browser, shows a preview with computed stats (min/max/avg/ES/SD), auto-fills the velocity fields, and — on save — stores both the individual shots (new `RangeLogShot` model) and the recomputed aggregates. The detail page shows a shot-by-shot table.
  - **Accuracy groups (MOA)**: record one or more target groups per session — distance (m), shot count, and extreme spread (mm). MOA is computed automatically by the server (`lib/moa.ts`) and stored on a `RangeGroup` child row. The session detail shows a groups table with a session average; the recipe detail shows an aggregate accuracy card (average MOA across all groups for that recipe + a recent-groups table). Groups are replaced wholesale on edit (touch to save) and are included in range-log export/import.
  - List view with photo count badges, velocity summaries, etc. Recent sessions are shown first on the Overview dashboard (before Load Logs).
  - Unified experience:
    - `/range/new` – create (optionally prefilled from a recipe link)
    - `/range/[id]` – readonly detail view (same form, disabled controls)
    - `/range/[id]/edit` – edit (same form)
  - After saving an edit you are returned to the readonly detail page.
  - Edit descriptions or mark photos for deletion when editing a session.


- **Settings** (`/settings` – gear icon)
  - **Appearance**: Light / Dark / System theme switch, plus an **Accent** picker (Copper / Brass / Field) for the highlight color used by links and key numbers. Both choices are saved per-device in `localStorage` and applied before first paint (no flash); "System" follows the OS preference and updates live when it changes. The two axes are independent — any accent works in both light and dark mode.
  - **AI configuration**
  - Configure the AI model the app uses. Single switchable config (provider dropdown + fields), designed to alternate between providers; **Grok (xAI)** is the first supported provider.
  - Fields: provider, model (free text), API key, base URL (defaults to `https://api.x.ai/v1`), optional temperature and max tokens.
  - **Test connection** button validates the key against the provider (xAI is OpenAI-compatible: `GET /models` with a bearer token) and reports success/failure via a toast.
  - Settings (including the API key) are stored in Postgres as a singleton row. The key is write-only in the UI: it is never sent back to the browser, only a masked `••••last4` placeholder; leave the field blank to keep the existing key. Note: the app has no authentication, so anyone who can reach it can change these.
  - **Data**: Export inventory, recipes, load logs, or range sessions as JSON (separately or as a combined "everything" file). Import a previously exported file — the file type is detected automatically and a preview (how many will be created vs updated) is shown before merging. Inventory matches by brand+type (or brand+caliber); recipes by name+caliber (component refs resolved by natural key, with stub inventory rows created if missing); load logs by date+recipeName+quantity; range logs by date+location+recipeName. Range log photos are not exported (sessions import imageless). Load/range logs preserve their frozen recipe snapshots; recipe re-linking is informational only (no inventory adjustments on import). Non-destructive: records not in the file are left untouched.

- **Consistent UX across the app**
  - Click any row to edit (or view for range sessions).
  - Create only from header buttons or dedicated pages – no stray "+ Add" buttons below lists.
  - Keyboard support: `Enter` to save (except in textareas), `Escape` to close. Auto-focus on first field.
  - Sonner toasts for all success/error feedback.
  - Server Components + Server Actions for data and mutations. React Hook Form + Zod on complex forms.
  - Responsive, dark-mode friendly, clean zinc-based design.

- **Internationalization (bilingual EN/DA)**
  - The app is fully localized for English and Danish via [next-intl](https://next-intl.dev). All user-facing strings — navigation, page headings, table columns, form labels, toasts, AI verdict copy, Zod validation messages — flow through `t()` / `getTranslations()` from message dictionaries in `messages/en.json` and `messages/da.json` (14 namespaces: `nav`, `overview`, `primers`, `projectiles`, `propellants`, `cartridges`, `recipes`, `logs`, `range`, `settings`, `common`, `errors`, `metadata`, `localeSwitcher`).
  - URLs are clean — `localePrefix: 'never'`. The active locale lives in a `NEXT_LOCALE` cookie, detected from the cookie first, then `Accept-Language`, then the default (`en`). `middleware.ts` reads it and sets `x-next-intl-locale` so server components resolve the right dictionary.
  - Switch locale from **Settings** (`LocaleSwitcher`): a `<select>` that writes the cookie and reloads the current path. Dates format via `Intl.DateTimeFormat` (`lib/format.ts`) and respect the active locale to avoid hydration mismatch.
  - **When adding/changing a user-facing string, update BOTH `messages/en.json` and `messages/da.json`** — there is no automated drift check; a missing key in one locale renders the key path verbatim.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Sonner (toasts), React Hook Form + Zod, **next-intl** (i18n, EN/DA)
- **Backend / Data**: Prisma 7 (client engine) + PostgreSQL via `@prisma/adapter-pg` + `pg` Pool
- **Dev / Ops**: Docker Compose (Postgres with named volume for true persistence), pnpm 11.5, corepack
- **Other**: local filesystem photo storage, automatic revalidation, migrations for every schema change

## Getting Started (Recommended: Docker)

The project is designed to be run with Docker Compose so the database is persisted correctly and Prisma Client is always generated in a clean Linux environment.

```bash
# Start everything (db + app)
docker compose up

# App will be available at http://localhost:3000
```

On first start (and after schema changes) the container runs:
- `pnpm install --ignore-scripts --prefer-offline`
- `pnpm prisma generate`
- native rebuilds for sharp / prisma
- `pnpm dev`

The compose file uses named volumes for `node_modules` and `.next` (in addition to the Postgres data volume) so you get Linux-native modules even if you have a macOS `node_modules` on the host.

### Without Docker (advanced)

You will need a running Postgres and `DATABASE_URL` set. Then:

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
pnpm dev
```

**Warning**: the sustainable Docker path is strongly preferred.

## Project Structure (key parts)

- `app/` – Next.js App Router
  - `page.tsx` – Overview dashboard (Range Sessions + Load Logs first in cards + sections, then Recipes, then inventory tables; reuses *Row components for previews)
  - `primers/`, `projectiles/`, `propellants/`, `cartridges/` – inventory sections (table + form + actions)
  - `recipes/` – recipes + "Possible" calc + quick links to logs/range
  - `logs/` – load logs + snapshots + restore-on-delete (plus `LoadLogRow` for lists/previews)
  - `range/` – range sessions (list, new, [id], [id]/edit) + shared `RangeLogForm` + image handling (plus `RangeLogRow`)
  - `settings/` – AI model configuration (singleton `AiSettings` row) + `SettingsForm` + `Test connection`
- `lib/ai.ts` – shared OpenAI-compatible model-call helpers (`chatCompletion`, `parseJsonFromModel`, provider base URLs) reused by the settings test and the recipe AI safety check
- `i18n/routing.ts` + `i18n/request.ts` – next-intl routing (`locales: ['en','da']`, `localePrefix: 'never'`) and request config (loads `messages/<locale>.json`, `timeZone: 'Europe/Copenhagen'`)
- `middleware.ts` – locale detection (cookie → `Accept-Language` → default `en`), sets `x-next-intl-locale` header
- `messages/en.json` + `messages/da.json` – the bilingual message dictionaries (14 namespaces)
- `prisma/schema.prisma` + `migrations/`
- `public/images/` – nav icons (primer, projectile, etc.) + logo
- `public/uploads/range-logs/` – user-uploaded range photos (created at runtime)
- `docker-compose.yml` / `Dockerfile` – the canonical dev environment

## Development Notes

- All mutations go through Server Actions that receive `FormData`.
- Range photos use a combination of client state (`existingImages` with `markedForDelete`, `images` for new File objects) + explicit `formData.append` for new files + metadata for existing ones. Never give the dynamic photo inputs a `name` attribute (prevents double submission).
- Server Actions are the trust boundary: they re-validate every `FormData` payload with shared Zod schemas in `lib/schemas.ts` (forms validating client-side is not enough). Add new entity validation there rather than hand-parsing in the action.
- After any schema change, run the migration inside the container and restart the app service.
- Always run `pnpm exec tsc --noEmit` (or the equivalent inside Docker) before declaring something "done".

### Testing

- Unit tests run with [Vitest](https://vitest.dev): `pnpm test` (single run) or `pnpm test:watch`.
- Test files live next to the code they cover as `*.test.ts` (config: `vitest.config.ts`, node environment, `@/` path alias).
- Coverage:
  - `lib/inventory.ts` – the "Possible loads" calculation.
  - `lib/schemas.ts` – the Server Action validation schemas.
  - `app/logs/actions.ts` – the transactional load-log create/delete, run against a **mocked Prisma client** (no database needed). `vi.mock('@/lib/prisma')` supplies a fake client whose `$transaction(fn)` runs the callback with the mock as `tx`; tests assert the inventory deduction/restoration math, that everything happens inside one transaction, the stock guards, and that a mid-transaction failure propagates. Use this pattern (mock `@/lib/prisma`, `next/cache`, `next-intl/server`) for other Server Action tests.
- Add tests here when changing inventory math, validation rules, or inventory-mutating actions.
- **End-to-end verification** (needs the dev DB up): `scripts/verify-*.e2e.test.ts` drive the *real* Server Actions against the live Postgres (range-session and load-log snapshot flows), mocking only `next/cache` / `next-intl/server` / `next/navigation` / `fs/promises` — **not** `@/lib/prisma` — so they exercise the actual transactional/snapshot behavior. They live under `scripts/` with their own config (`vitest.verify.config.ts`) so the DB-less CI suite never picks them up. Run them explicitly:
  ```bash
  DATABASE_URL=postgresql://reloading:reloading@localhost:5432/reloading \
    pnpm vitest run --config vitest.verify.config.ts
  ```
  Reuse this pattern to verify snapshot/transactional behavior end-to-end after schema changes. `dotenv` is a devDependency so `prisma generate` / `prisma migrate` resolve reliably both on the host and inside the container.

### Continuous Integration

- `.github/workflows/ci.yml` runs on every push to `main` and on pull requests: install → `prisma generate` → lint → test → build.
- No database is required in CI — every route is dynamic and tests mock Prisma, so a dummy `DATABASE_URL` is set in the workflow.

## License

Personal project.

---

Built with lots of iterative feedback. The app is intentionally simple, local-first, and focused on data integrity for historical reloading records.
