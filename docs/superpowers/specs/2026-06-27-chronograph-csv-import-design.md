# Chronograph CSV Import — Design

Date: 2026-06-27
Feature: Import per-shot velocity data from a chronograph CSV (Xero C1 format) into a range session.

## Goal

Let the user upload a Xero C1 chronograph CSV export from inside the range session form (`/range/new`, `/range/[id]/edit`). The app parses the per-shot velocities, shows a preview, auto-fills the existing velocity stats fields, and — on save — persists both the individual shot velocities and the aggregate stats on the `RangeLog`.

## Non-goals

- No server-side CSV parsing. Parsing happens in the browser; the server only ever receives a validated JSON `shots` array.
- No archival of the raw CSV file on disk. The user's machine remains the source of truth for the raw export.
- No per-shot columns beyond velocity (KE, power factor, Δ-AVG, time, clean/cold-bore, shot notes) are stored. Those are derivable from velocity + the linked recipe's projectile weight, or remain in the raw CSV.
- The CSV's `DATE` and `SESSION NOTES` rows are ignored — the user sets the session date and notes themselves.
- No new route or standalone import page. The import lives inside the existing `RangeLogForm`.

## Data model

New `RangeLogShot` model in `prisma/schema.prisma`:

```prisma
model RangeLogShot {
  id         String   @id @default(cuid())
  rangeLogId String
  shotIndex  Int      // 1-based, from CSV "# Shot" column
  velocity   Float    // m/s, from "Speed (mps)" column
  rangeLog   RangeLog @relation(fields: [rangeLogId], references: [id], onDelete: Cascade)

  @@index([rangeLogId])
}
```

- `onDelete: Cascade` — deleting a range session removes its shots (consistent with `RangeLogImage`).
- Only `shotIndex` + `velocity`.
- `RangeLog` keeps its existing aggregate fields (`velocityMin/Max/Avg/extremeSpread/stdDev`). The import fills both the per-shot rows and the aggregate fields, so existing list/detail UI works unchanged.
- No `createdAt`/`updatedAt` — shots are write-once with the session.
- Migration name: `add_range_log_shot`.

`RangeLog` gains a new relation field: `shots: RangeLogShot[]`.

## CSV parsing (client)

New pure module `lib/parseChronographCsv.ts` (no `'use server'`, no DOM — unit-testable):

```ts
export interface ParsedShot { shotIndex: number; velocity: number }
export interface ParsedChronograph {
  shots: ParsedShot[]          // 1-based index + m/s velocity, in CSV order
  velocityMin: number
  velocityMax: number
  velocityAvg: number          // mean of shots
  extremeSpread: number        // max - min
  stdDev: number               // population stddev (matches Xero's "STD DEV" row)
  roundsFired: number          // shots.length
}

export class ChronoCsvError extends Error {
  readonly kind: 'header' | 'noShots' | 'parse'
}

export function parseChronographCsv(text: string): ParsedChronograph
```

### Parsing rules (Xero C1 format, defensive)

1. Split lines on `\r?\n`. Trim each line.
2. Recognize the header row by the literal `# Shot,Speed (mps),` prefix; throw `ChronoCsvError` with `kind: 'header'` if not found.
3. Shot rows match `/^\d+,[-\d.]+,/` — the `# Shot` column is a positive integer and the `Speed (mps)` column is a number. Skip blank lines. Skip the trailing aggregate rows (`AVERAGE SPEED`, `STD DEV`, `SPREAD`, `AVERAGE POWER FACTOR`, `PROJECTILE WEIGHT`, `SESSION NOTES`, `DATE`, `All shots included...`) — i.e. stop at the first row after the shots whose first cell isn't an integer.
4. A shot row whose velocity cell is non-numeric → `ChronoCsvError` with `kind: 'parse'`.
5. Require ≥ 2 shots; otherwise throw `ChronoCsvError` with `kind: 'noShots'` (cannot compute ES/SD meaningfully).
6. Compute aggregates from the parsed shot velocities — do not trust the CSV's summary rows. This keeps the stored values internally consistent.
7. `stdDev`: population standard deviation `sqrt(mean((v - mean)²))`. The Xero sample shows `STD DEV 3.1` for 15 shots; population stddev of those 15 values is `3.07` → rounds to `3.1`. Matches Xero's convention.

### Expected values from the sample CSV

Using `/Users/dkKenEgh/Downloads/xero_c1_sample_export.csv` (15 shots):
- min: 946.8
- max: 958.2
- avg: 953.9 (mean of the 15 velocities)
- extremeSpread: 11.4 (958.2 − 946.8)
- stdDev: ~3.1 (population stddev)
- roundsFired: 15

## Form UX & client wiring

New client component `app/range/ChronographImport.tsx`, rendered inside `RangeLogForm` above the velocity fields, near the photos section.

### UI flow

1. A control labelled "Import from chronograph" with `<input type="file" accept=".csv,text/csv">`. The input has **no `name` attribute** (files aren't submitted; mirrors the photo-input pattern — prevents double FormData entries).
2. On file select: read with `file.text()`, call `parseChronographCsv()`.
3. On success: show a preview block with:
   - A compact `# | Velocity (m/s)` table for each shot. Scrollable, `max-height: 240px`, so 15+ shots don't blow up the form.
   - Computed stats row: min / max / avg / ES / SD / rounds fired.
   - A "Remove import" button to clear the import.
4. On error: a Sonner toast with a specific message based on `ChronoCsvError.kind`, plus a red inline hint under the file input. No preview shown.

### Wiring to the form

The parent `RangeLogForm` holds lifted state `shots: ParsedShot[] | null`. When `ChronographImport` parses successfully, it calls `onParsed(shots, aggregates)`:

- Sets `shots` state (used in `handleSubmit` to append JSON to FormData).
- Auto-fills the five velocity `<input>`s and `roundsFired` via the existing `useEffect(() => { if (initialData) reset... })` pattern (native `defaultValue` inputs, re-keyed or ref-set to force the new values to render).
- The user can still edit the auto-filled fields manually after import (they are not disabled). The per-shot rows save as-is; manual edits to the aggregate fields are cosmetic overrides.

### On submit (`handleSubmit`)

- `formData.append('shots', JSON.stringify(shots))` if `shots` is non-null.
- `formData.append('replaceShots', 'true')` when an import happened on edit (so the action knows to delete+insert rather than no-op).
- The five velocity fields + `roundsFired` already submit via their `name` attributes as today.

### Edit semantics

- If the user imports a new CSV on an existing session, the action **replaces** all shots for that session (delete existing + insert new, in the transaction).
- If no CSV is imported on edit, shots are left untouched.

### Detail view (`/range/[id]`)

- New section under the existing velocity summary: "Shot-by-shot" table listing `# | Velocity (m/s)`. Read-only (the detail form is already readonly).
- The detail query adds `include: { shots: { orderBy: { shotIndex: 'asc' } } }`.

## Server action & validation

### Zod schema (`lib/schemas.ts`, new)

```ts
export const shotsSchema = z.array(
  z.object({
    shotIndex: z.number().int().min(1),
    velocity: z.number().finite().positive(),
  })
).min(2)
```

- ≥2 shots (matches the parser rule).
- `velocity` must be finite + positive (rejects NaN, 0, negatives).
- No `t` translator needed — structural check. Errors surface as a generic "invalid shot data" toast.

### `createRangeLog` action changes (`app/range/actions.ts`)

1. Read `formData.get('shots')`. If absent/null → no shots, behave exactly as today.
2. If present → `JSON.parse` → `shotsSchema.safeParse`. On failure, return `{ ok: false, error: t('errors.csvShotsInvalid') }`.
3. **Recompute aggregates** from the validated shots (min/max/avg/ES/SD). Cross-check against the submitted velocity fields: if they disagree beyond a 0.1 m/s epsilon, prefer the recomputed values (the shots are the source of truth). Log the discrepancy.
4. Inside the existing `$transaction`: after `prisma.rangeLog.create(...)`, `prisma.rangeLogShot.createMany({ data: shots.map(s => ({ ...s, rangeLogId: log.id })) })`.
5. No disk I/O for shots — pure DB writes. Cleanup-on-failure unchanged (only images need unlinking).

### `updateRangeLog` action changes

1. Read `formData.get('shots')` AND `formData.get('replaceShots')`.
2. If `shots` present and `replaceShots === 'true'`: inside the transaction, `prisma.rangeLogShot.deleteMany({ where: { rangeLogId: id } })` then `createMany` the new shots. Recompute aggregates and overwrite the velocity fields on the `rangeLog.update`.
3. If `shots` absent: leave existing shots untouched (preserve them from the original session).
4. Snapshot re-snapshot rule unchanged — recipe snapshot logic is independent of shots.

### Queries

- `app/range/[id]/page.tsx` query adds `include: { shots: { orderBy: { shotIndex: 'asc' } } }`.
- List query (`app/range/page.tsx`, overview) does **not** include shots — only the aggregate fields, which already exist. No N+1 risk.

## i18n

New keys under `range.form.*` and `range.errors.*` in **both** `messages/en.json` and `messages/da.json`:

- `range.form.importCsv` — "Import from chronograph" / DA: "Importér fra kronograf"
- `range.form.csvFile` — "CSV file" / DA: "CSV-fil"
- `range.form.csvParsed` — "{count} shots parsed" / DA: "{count} skud analyseret"
- `range.form.removeCsv` — "Remove import" / DA: "Fjern import"
- `range.form.shotTable.title` — "Shot-by-shot" / DA: "Skud-for-skud"
- `range.form.shotTable.header` — "#" / DA: "#"
- `range.form.shotTable.velocity` — "Velocity (m/s)" / DA: "Hastighed (m/s)"
- `range.errors.csvHeader` — "Not a recognized chronograph export (missing expected header)." / DA: "Ikke en genkendt kronograf-eksport (mangler forventet header)."
- `range.errors.csvNoShots` — "No shots found in the CSV." / DA: "Ingen skud fundet i CSV-filen."
- `range.errors.csvParse` — "Could not parse the CSV." / DA: "Kunne ikke analysere CSV-filen."
- `range.errors.csvShotsInvalid` — "Invalid shot data." / DA: "Ugyldige skuddata."

(Danish drafts are placeholders for the user to review during spec review.)

## Tests

### `lib/parseChronographCsv.test.ts` (new, unit)

- Parses the sample Xero export (15 shots). Asserts aggregates: min 946.8, max 958.2, avg ~953.9, ES 11.4, SD ~3.1, roundsFired 15.
- Rejects a non-chronograph CSV (missing header) → `kind: 'header'`.
- Rejects a CSV with 0 shots → `kind: 'noShots'`.
- Rejects a CSV with 1 shot → `kind: 'noShots'`.
- Ignores the trailing aggregate rows (`AVERAGE SPEED`, etc.) — only shot rows counted.
- Handles `\r\n` and `\n` line endings.
- Handles a shot row with a non-numeric velocity → `kind: 'parse'`.

### `lib/schemas.test.ts` (extend)

- `shotsSchema` accepts 2+ valid shots.
- Rejects <2 shots.
- Rejects non-positive velocity.
- Rejects NaN velocity.

### `app/range/actions.test.ts` (extend)

- `createRangeLog` with `shots` in FormData → creates shot rows in the transaction, aggregates recomputed.
- `createRangeLog` with invalid `shots` JSON → returns `{ ok: false }`, no DB writes.
- `updateRangeLog` with `replaceShots: 'true'` → deletes existing shots, inserts new ones.
- `updateRangeLog` without `shots` → existing shots untouched.

## Documentation updates (before commit)

- `README.md` — bullet under Range Sessions: "Import shot data from a chronograph CSV (Xero C1 format) — parses per-shot velocities, computes stats, and stores both the individual shots and aggregates."
- `docs/architecture.md` — add `RangeLogShot` to the ER diagram; note the import flow in Key flows.
- `AGENTS.md` — note the new `RangeLogShot` model and the chronograph import in the range section.

## Out of scope / future

- Per-shot charts or trend analysis across sessions.
- Storing the raw CSV file on disk for archival.
- Supporting other chronograph formats beyond Xero C1 (the parser is defensive but header-specific).
- Auto-deriving KE / power factor from the linked projectile weight (could be a follow-up).