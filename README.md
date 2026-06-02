# Reloading Tool

A web application for managing reloading components, recipes, load logs, and range sessions.

Track your inventory of primers, projectiles, and propellants. Define recipes, log the components you use when making ammunition (with automatic inventory deduction and full historical snapshots), and record range sessions including chronograph data and photos.

![Reloading Tool](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

## Features

- **Inventory Management**
  - Primers: brand, type (Small Rifle / Large Rifle / Small Pistol / Large Pistol), magnum flag, amount, description.
  - Projectiles: brand, type (e.g. "Sierra Game King"), weight (gr), caliber, amount, description.
  - Propellants: brand, type, amount (grams, displayed to 1 decimal), description.
  - Full CRUD. Overview dashboard with totals + recent activity (Range Sessions and Load Logs first, then Recipes, then materials/inventory tables). Low-stock awareness via recipe "Possible" calculations. Range and load log previews use the same row components as their dedicated pages.

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
  - **Historical snapshots**: the log stores a complete copy of the recipe + component details at the time it was made (so future recipe edits or component deletions don't corrupt history).
  - Detail view shows the exact snapshot + summary of components consumed.
  - Delete a log (with confirmation) and the components are restored to inventory (again via transaction using the snapshots).
  - Recent load logs are shown on the Overview (after Range Sessions).

- **Range Sessions** (`/range` – bullseye icon)
  - Full session logging: date, location, linked recipe, rounds fired, weather/conditions, notes.
  - Complete chronograph data: Min/Max/Avg velocity (m/s), Extreme Spread (ES), Standard Deviation (SD).
  - **Unlimited photos** with individual descriptions per photo. Photos stored locally (`public/uploads/range-logs`).
  - List view with photo count badges, velocity summaries, etc. Recent sessions are shown first on the Overview dashboard (before Load Logs).
  - Unified experience:
    - `/range/new` – create (optionally prefilled from a recipe link)
    - `/range/[id]` – readonly detail view (same form, disabled controls)
    - `/range/[id]/edit` – edit (same form)
  - After saving an edit you are returned to the readonly detail page.
  - Edit descriptions or mark photos for deletion when editing a session.


- **Settings** (`/settings` – gear icon)
  - **Appearance**: Light / Dark / System theme switch. The choice is saved per-device in `localStorage` and applied before first paint (no flash); "System" follows the OS preference and updates live when it changes.
  - **AI configuration**
  - Configure the AI model the app uses. Single switchable config (provider dropdown + fields), designed to alternate between providers; **Grok (xAI)** is the first supported provider.
  - Fields: provider, model (free text), API key, base URL (defaults to `https://api.x.ai/v1`), optional temperature and max tokens.
  - **Test connection** button validates the key against the provider (xAI is OpenAI-compatible: `GET /models` with a bearer token) and reports success/failure via a toast.
  - Settings (including the API key) are stored in Postgres as a singleton row. The key is write-only in the UI: it is never sent back to the browser, only a masked `••••last4` placeholder; leave the field blank to keep the existing key. Note: the app has no authentication, so anyone who can reach it can change these.

- **Consistent UX across the app**
  - Click any row to edit (or view for range sessions).
  - Create only from header buttons or dedicated pages – no stray "+ Add" buttons below lists.
  - Keyboard support: `Enter` to save (except in textareas), `Escape` to close. Auto-focus on first field.
  - Sonner toasts for all success/error feedback.
  - Server Components + Server Actions for data and mutations. React Hook Form + Zod on complex forms.
  - Responsive, dark-mode friendly, clean zinc-based design.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Sonner (toasts), React Hook Form + Zod
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
  - `page.tsx` – Overview dashboard (Range Sessions + Load Logs first in cards + sections, then Recipes, then materials inventory tables; reuses *Row components for previews)
  - `primers/`, `projectiles/`, `propellants/` – inventory sections (table + form + actions)
  - `recipes/` – recipes + "Possible" calc + quick links to logs/range
  - `logs/` – load logs + snapshots + restore-on-delete (plus `LoadLogRow` for lists/previews)
  - `range/` – range sessions (list, new, [id], [id]/edit) + shared `RangeLogForm` + image handling (plus `RangeLogRow`)
  - `settings/` – AI model configuration (singleton `AiSettings` row) + `SettingsForm` + `Test connection`
- `lib/ai.ts` – shared OpenAI-compatible model-call helpers (`chatCompletion`, `parseJsonFromModel`, provider base URLs) reused by the settings test and the recipe AI safety check
- `prisma/schema.prisma` + `migrations/`
- `public/images/` – nav icons (primer, projectile, etc.) + logo
- `public/uploads/range-logs/` – user-uploaded range photos (created at runtime)
- `docker-compose.yml` / `Dockerfile` – the canonical dev environment

## Development Notes

- All mutations go through Server Actions that receive `FormData`.
- Range photos use a combination of client state (`existingImages` with `markedForDelete`, `images` for new File objects) + explicit `formData.append` for new files + metadata for existing ones. Never give the dynamic photo inputs a `name` attribute (prevents double submission).
- After any schema change, run the migration inside the container and restart the app service.
- Always run `pnpm exec tsc --noEmit` (or the equivalent inside Docker) before declaring something "done".
- The detailed conversation history, architectural decisions, and bug fixes are also captured in the project's Grok memory (`~/.grok/memory/reloading-bc8d498c/MEMORY.md`) so context survives across sessions.

## License

Personal project.

---

Built with lots of iterative feedback. The app is intentionally simple, local-first, and focused on data integrity for historical reloading records.
