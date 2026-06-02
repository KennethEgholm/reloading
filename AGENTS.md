# AGENTS.md – Reloading Tool

Instructions for AI agents / future sessions working on this codebase.

## Primary Rule
**Always keep README.md updated.** When you add, change, or remove a significant feature, page, setup step, or architectural detail, edit the README so it accurately reflects the current state of the app. The user explicitly requested this.

## Project Goals & Non-Negotiables
- Full production-usable reloading manager (inventory + recipes + load logs + range sessions).
- **Data integrity first**: Load logs and range sessions must survive recipe/component changes. Use snapshots + transactions for inventory adjustments.
- **Sustainable Docker dev loop**: Named volumes only (never rely on anonymous or host node_modules for DB). Container start script must run `pnpm install --ignore-scripts`, `pnpm prisma generate`, and rebuilds. Do **not** suggest `docker compose down -v`.
- Consistent, opinionated UX (see below). User gives very precise feedback ("you removed the wrong one", "same photos shows twice?", "Recipe and Location is not persisted").

## Current Architecture (keep in sync with reality)
- Next.js 16 App Router. Server Components for data + forms (via Server Actions). Client Components **only** for interactivity, local state (editing, file previews, keyboards), and table wrappers that own one controlled form instance.
- Prisma 7 + Postgres adapter. No `datasource` url in schema.prisma. Adapter passed at PrismaClient construction.
- All lists use row-click to open edit (or view for range detail). Creation only from header or dedicated routes.
- Range log uses a single `RangeLogForm` for create / edit / readonly (readonly disables inputs + hides upload controls, shows "Edit this session" link). After successful edit save: `router.push(\`/range/${id}\`)` to land on readonly detail.
- Photos (range only): unlimited, each with its own description. Client state split into `existingImages` (with `markedForDelete`) vs new `images[]`. Always append from state in `handleSubmit`; the dynamic `<input type="file">` elements must **not** have a `name` attribute (prevents double FormData entries on edit).
- Load logs: full denormalized snapshots on the log row + component IDs. Delete uses a transaction that restores using the snapshot values.
- "Possible" loads calculation lives in `RecipesTable.tsx` (client, uses grain-to-gram conversion).
- Propellant weights shown with 1 decimal place.
- Keyboard: document `keydown` listener (Enter save / Esc close). Exception for `<textarea>`. Auto-focus name/brand field on open.
- Toasts via Sonner on every mutation path.
- Overview (`app/page.tsx`) structure (per user spec): summary cards + sections ordered Range Sessions first, then Load Logs, then Recipes, then materials (primers/projectiles/propellants). Uses recent previews (5) + aggregates for Range/Load; reuses RangeLogRow + new LoadLogRow. All activity mutations revalidate '/'.

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
