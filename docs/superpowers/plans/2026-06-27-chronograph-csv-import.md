# Chronograph CSV Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user upload a Xero C1 chronograph CSV export from inside the range session form, parse per-shot velocities client-side with a preview, and persist both the individual shots (new `RangeLogShot` model) and recomputed aggregate stats on the `RangeLog`.

**Architecture:** New pure module `lib/parseChronographCsv.ts` parses CSV text in the browser. New client component `app/range/ChronographImport.tsx` renders a file input + preview inside `RangeLogForm` and lifts parsed `shots` state to the parent. On submit, shots are appended to FormData as JSON; the server action validates with a new `shotsSchema` (Zod), recomputes aggregates from the validated shots as a cross-check, and persists shot rows inside the existing transaction. A new `RangeLogShot` Prisma model stores per-shot velocities with `onDelete: Cascade` from `RangeLog`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + Postgres, Zod 4, React 19, next-intl (EN/DA), Vitest.

## Global Constraints

- **i18n:** Every user-facing string flows through `t()` / `getTranslations()` and must be added to **both** `messages/en.json` and `messages/da.json` in the same change. No hard-coded English. (AGENTS.md)
- **Server Actions are the trust boundary:** Re-validate every FormData payload with Zod in `lib/schemas.ts`. (AGENTS.md)
- **Typecheck before "Done":** Run `./node_modules/.bin/tsc --noEmit` (or `pnpm build`). (AGENTS.md)
- **Tests:** Vitest. New unit tests live next to the code as `*.test.ts`. Mock `@/lib/prisma`, `next/cache`, `next-intl/server`, `next/navigation`, `fs/promises` in action tests. (AGENTS.md + README)
- **Schema changes:** After editing `prisma/schema.prisma`, run `pnpm prisma migrate dev --name <name>` inside the container, then restart the app. (AGENTS.md)
- **Docs:** Update `README.md`, `docs/architecture.md`, and `AGENTS.md` before commit if architecture/data model changes. (AGENTS.md)
- **Commit style:** Clean conventional commit messages. No emojis. Push to `main` only after the user approves.
- **No comments in code** unless asked. (opencode system rule)
- **stdDev:** Population standard deviation `sqrt(mean((v - mean)²))` (matches Xero C1's "STD DEV" row).
- **≥2 shots** required to import (cannot compute ES/SD meaningfully with fewer).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `RangeLogShot` model + `RangeLog.shots` relation. |
| `lib/parseChronographCsv.ts` | Create | Pure CSV parser + aggregates. No DOM, no server. |
| `lib/parseChronographCsv.test.ts` | Create | Unit tests for the parser. |
| `lib/schemas.ts` | Modify | Add `shotsSchema` (Zod). |
| `lib/schemas.test.ts` | Modify | Tests for `shotsSchema`. |
| `app/range/ChronographImport.tsx` | Create | Client component: file input, parse, preview, remove. |
| `app/range/RangeLogForm.tsx` | Modify | Lift `shots` state, render `ChronographImport`, auto-fill velocity fields, append JSON to FormData on submit, render shot table in readonly. |
| `app/range/actions.ts` | Modify | Parse + validate `shots` in `createRangeLog` / `updateRangeLog`, recompute aggregates, persist `RangeLogShot` rows in transaction. |
| `app/range/actions.test.ts` | Modify | Tests for shots handling in both actions. |
| `app/range/[id]/page.tsx` | Modify | Query includes `shots`; detail view renders shot table. |
| `lib/types.ts` | Modify | Extend `RangeLogWithImages` to include `shots`. |
| `messages/en.json` | Modify | New `range.form.*` + `range.errors.*` keys. |
| `messages/da.json` | Modify | Same keys, Danish. |
| `README.md` | Modify | Bullet under Range Sessions. |
| `docs/architecture.md` | Modify | `RangeLogShot` in ER diagram; import flow note. |
| `AGENTS.md` | Modify | Note `RangeLogShot` + chronograph import in range section. |

---

### Task 1: Prisma schema — add `RangeLogShot`

**Files:**
- Modify: `prisma/schema.prisma` (add model after `RangeLogImage` at line 219, add relation on `RangeLog` at line 205)

**Interfaces:**
- Produces: `RangeLogShot` Prisma model with fields `{ id, rangeLogId, shotIndex, velocity }`, cascade delete from `RangeLog`. `RangeLog.shots: RangeLogShot[]` relation.

- [ ] **Step 1: Add the `RangeLogShot` model and the `RangeLog.shots` relation**

Edit `prisma/schema.prisma`. On the `RangeLog` model, add a `shots` relation field after the `mainImage` field (after line 207):

```prisma
  shots         RangeLogShot[]    @relation("RangeLogShots")
```

Then append the new model at the end of the file (after `RangeLogImage`):

```prisma
model RangeLogShot {
  id         String   @id @default(cuid())
  rangeLogId String
  shotIndex  Int
  velocity   Float
  rangeLog   RangeLog @relation("RangeLogShots", fields: [rangeLogId], references: [id], onDelete: Cascade)

  @@index([rangeLogId])
}
```

- [ ] **Step 2: Run the migration inside the container**

Run:
```bash
docker compose exec app pnpm prisma migrate dev --name add_range_log_shot
```
Expected: a new migration file is created under `prisma/migrations/<timestamp>_add_range_log_shot/` and `prisma generate` runs. The app restarts automatically (Turbopack HMR) — if not, `docker compose restart app`.

- [ ] **Step 3: Verify the Prisma client picked up the model**

Run:
```bash
docker compose exec app node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); console.log(Object.keys(p).includes('rangeLogShot'))"
```
Expected: prints `true`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add RangeLogShot model for per-shot chronograph velocities"
```

---

### Task 2: CSV parser — `lib/parseChronographCsv.ts`

**Files:**
- Create: `lib/parseChronographCsv.ts`
- Test: `lib/parseChronographCsv.test.ts`

**Interfaces:**
- Produces: `parseChronographCsv(text: string): ParsedChronograph`, `ChronoCsvError` class with `kind: 'header' | 'noShots' | 'parse'`, `ParsedShot` and `ParsedChronograph` types.
- Consumes: nothing (pure module).

- [ ] **Step 1: Write the failing test file**

Create `lib/parseChronographCsv.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseChronographCsv, ChronoCsvError } from './parseChronographCsv'

const SAMPLE = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,958.2,4.3,1844.5,3.8,12:41:36 PM,Clean Bore,
2,954.1,0.1,1828.6,3.8,12:47:57 PM,,
3,956.1,2.1,1836.1,3.8,12:48:41 PM,,
4,952.1,-1.8,1821.1,3.8,12:51:37 PM,,
5,957.9,3.9,1843.0,3.8,12:52:49 PM,,
6,953.1,-0.8,1824.8,3.8,12:53:32 PM,,
7,953.7,-0.3,1826.9,3.8,12:55:51 PM,,
8,955.8,1.8,1835.0,3.8,12:56:36 PM,,
9,950.4,-3.5,1814.5,3.8,12:57:51 PM,,
10,956.2,2.3,1836.8,3.8,1:00:23 PM,,
11,956.7,2.7,1838.5,3.8,1:06:41 PM,,
12,946.8,-7.1,1800.9,3.8,1:11:40 PM,,
13,954.8,0.8,1831.2,3.8,1:13:21 PM,,
14,953.8,-0.2,1827.3,3.8,1:13:38 PM,,
15,949.6,-4.4,1811.2,3.8,1:13:47 PM,,

AVERAGE SPEED,953.9,,,,,,
STD DEV,3.1,,,,,,
SPREAD,11.4,,,,,,
AVERAGE POWER FACTOR,3.8,,,,,,
PROJECTILE WEIGHT (gr),62.0,,,,,,
SESSION NOTES,,,,,,,
DATE,April 23, 2025 at 12:40 PM,,,,,,
All shots included in the calculations,,,,,,,`

describe('parseChronographCsv', () => {
  it('parses the sample Xero C1 export and computes aggregates', () => {
    const r = parseChronographCsv(SAMPLE)
    expect(r.shots).toHaveLength(15)
    expect(r.shots[0]).toEqual({ shotIndex: 1, velocity: 958.2 })
    expect(r.shots[14]).toEqual({ shotIndex: 15, velocity: 949.6 })
    expect(r.roundsFired).toBe(15)
    expect(r.velocityMin).toBeCloseTo(946.8, 1)
    expect(r.velocityMax).toBeCloseTo(958.2, 1)
    expect(r.velocityAvg).toBeCloseTo(953.9, 1)
    expect(r.extremeSpread).toBeCloseTo(11.4, 1)
    expect(r.stdDev).toBeCloseTo(3.1, 0)
  })

  it('throws ChronoCsvError kind=header when the header row is missing', () => {
    expect(() => parseChronographCsv('foo,bar\n1,2')).toThrow(ChronoCsvError)
    try {
      parseChronographCsv('foo,bar\n1,2')
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('header')
    }
  })

  it('throws ChronoCsvError kind=noShots when there are zero shots', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes

AVERAGE SPEED,0,,,,,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('noShots')
    }
  })

  it('throws ChronoCsvError kind=noShots when there is a single shot', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,950.0,0,0,0,12:00:00 PM,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('noShots')
    }
  })

  it('ignores the trailing aggregate rows', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,950.0,0,0,0,12:00:00 PM,,
2,960.0,10,0,0,12:01:00 PM,,
AVERAGE SPEED,955,,,,,,`
    const r = parseChronographCsv(csv)
    expect(r.shots).toHaveLength(2)
  })

  it('handles CRLF line endings', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes\r\n1,950.0,0,0,0,12:00:00 PM,,\r\n2,960.0,10,0,0,12:01:00 PM,,\r\n`
    const r = parseChronographCsv(csv)
    expect(r.shots).toHaveLength(2)
    expect(r.velocityMin).toBe(950.0)
  })

  it('throws ChronoCsvError kind=parse when a shot velocity is non-numeric', () => {
    const csv = `# Shot,Speed (mps),Δ AVG (mps),KE (J),Power Factor,Time,Clean Bore/Cold Bore,Shot Notes
1,fast,0,0,0,12:00:00 PM,,
2,960.0,10,0,0,12:01:00 PM,,`
    expect(() => parseChronographCsv(csv)).toThrow(ChronoCsvError)
    try {
      parseChronographCsv(csv)
    } catch (e) {
      expect((e as ChronoCsvError).kind).toBe('parse')
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/parseChronographCsv.test.ts`
Expected: FAIL — `parseChronographCsv` is not defined (module does not exist).

- [ ] **Step 3: Implement the parser**

Create `lib/parseChronographCsv.ts`:

```ts
export interface ParsedShot {
  shotIndex: number
  velocity: number
}

export interface ParsedChronograph {
  shots: ParsedShot[]
  velocityMin: number
  velocityMax: number
  velocityAvg: number
  extremeSpread: number
  stdDev: number
  roundsFired: number
}

export class ChronoCsvError extends Error {
  readonly kind: 'header' | 'noShots' | 'parse'
  constructor(kind: ChronoCsvError['kind'], message: string) {
    super(message)
    this.name = 'ChronoCsvError'
    this.kind = kind
  }
}

const HEADER_PREFIX = '# Shot,Speed (mps),'

export function parseChronographCsv(text: string): ParsedChronograph {
  const lines = text.split(/\r?\n/).map((l) => l.trim())

  const headerIdx = lines.findIndex((l) => l.startsWith(HEADER_PREFIX))
  if (headerIdx === -1) {
    throw new ChronoCsvError('header', 'Not a recognized chronograph export (missing expected header).')
  }

  const shots: ParsedShot[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') continue
    const firstCell = line.split(',')[0]
    if (!/^\d+$/.test(firstCell)) break
    const cells = line.split(',')
    const shotIndex = Number.parseInt(firstCell, 10)
    const velocityStr = cells[1]
    const velocity = Number(velocityStr)
    if (!Number.isFinite(velocity)) {
      throw new ChronoCsvError('parse', `Could not parse velocity on shot ${shotIndex}: "${velocityStr}".`)
    }
    shots.push({ shotIndex, velocity })
  }

  if (shots.length < 2) {
    throw new ChronoCsvError('noShots', 'No shots found in the CSV (at least 2 required).')
  }

  const velocities = shots.map((s) => s.velocity)
  const min = Math.min(...velocities)
  const max = Math.max(...velocities)
  const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length
  const extremeSpread = max - min
  const stdDev = Math.sqrt(
    velocities.reduce((sum, v) => sum + (v - avg) ** 2, 0) / velocities.length,
  )

  return {
    shots,
    velocityMin: min,
    velocityMax: max,
    velocityAvg: avg,
    extremeSpread,
    stdDev,
    roundsFired: shots.length,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/parseChronographCsv.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/parseChronographCsv.ts lib/parseChronographCsv.test.ts
git commit -m "feat(range): add Xero C1 chronograph CSV parser"
```

---

### Task 3: Zod `shotsSchema` in `lib/schemas.ts`

**Files:**
- Modify: `lib/schemas.ts` (append at end of file, after line 126)
- Test: `lib/schemas.test.ts` (extend)

**Interfaces:**
- Produces: `shotsSchema` — `z.array(z.object({ shotIndex: z.number().int().min(1), velocity: z.number().finite().positive() })).min(2)`. Exported.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests**

Append to `lib/schemas.test.ts` (add `shotsSchema` to the import on line 2-9, then add a new `describe` block at the end of the file, after line 162):

Update the import block (lines 2-9) to include `shotsSchema`:

```ts
import {
  createCartridgeSchema,
  createProjectileSchema,
  createPrimerSchema,
  createPropellantSchema,
  createLoadLogSchema,
  shotsSchema,
  formatZodError,
} from './schemas'
```

Append at the end of the file:

```ts
describe('shotsSchema', () => {
  it('accepts two or more valid shots', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(true)
  })

  it('rejects fewer than two shots', () => {
    const r = shotsSchema.safeParse([{ shotIndex: 1, velocity: 950.0 }])
    expect(r.success).toBe(false)
  })

  it('rejects a non-positive velocity', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: 0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })

  it('rejects NaN velocity', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1, velocity: NaN },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })

  it('rejects a non-integer shotIndex', () => {
    const r = shotsSchema.safeParse([
      { shotIndex: 1.5, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ])
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test lib/schemas.test.ts`
Expected: FAIL — `shotsSchema` is not exported.

- [ ] **Step 3: Add the schema**

Append to `lib/schemas.ts` (after line 126, the end of `createLoadLogSchema`):

```ts
/**
 * Validates the JSON `shots` array sent from the chronograph CSV importer.
 * Structural check (no translator) — errors surface as a generic toast.
 * Mirrors the parser's ≥2-shots rule and rejects non-finite / non-positive
 * velocities so a garbled client payload can never reach the DB.
 */
export const shotsSchema = z
  .array(
    z.object({
      shotIndex: z.number().int().min(1),
      velocity: z.number().finite().positive(),
    }),
  )
  .min(2)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test lib/schemas.test.ts`
Expected: PASS — all existing + 5 new tests green.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/schemas.ts lib/schemas.test.ts
git commit -m "feat(schemas): add shotsSchema for chronograph shot validation"
```

---

### Task 4: i18n keys (EN + DA)

**Files:**
- Modify: `messages/en.json` (add keys under `range.form` and `range.errors`)
- Modify: `messages/da.json` (same keys, Danish)

**Interfaces:**
- Produces: new translation keys consumed by `ChronographImport.tsx`, `RangeLogForm.tsx`, `app/range/[id]/page.tsx`, and `app/range/actions.ts` (the `errors.csvShotsInvalid` toast key).

- [ ] **Step 1: Add the English keys**

In `messages/en.json`, inside the `range.form` object, add these keys (after `"editSession"` — the last form key):

```json
    "importCsv": "Import from chronograph",
    "csvFile": "CSV file",
    "csvParsed": "{count} shots parsed",
    "removeCsv": "Remove import",
    "shotTable": {
      "title": "Shot-by-shot",
      "header": "#",
      "velocity": "Velocity (m/s)"
    }
```

Inside the `range.errors` object (after `"recipeNotFound"` and before `"validation"`), add:

```json
    "csvHeader": "Not a recognized chronograph export (missing expected header).",
    "csvNoShots": "No shots found in the CSV (at least 2 required).",
    "csvParse": "Could not parse the CSV.",
    "csvShotsInvalid": "Invalid shot data."
```

- [ ] **Step 2: Add the Danish keys**

In `messages/da.json`, mirror the exact same structure and keys with Danish values:

`range.form` (after `"editSession"`):
```json
    "importCsv": "Importér fra kronograf",
    "csvFile": "CSV-fil",
    "csvParsed": "{count} skud analyseret",
    "removeCsv": "Fjern import",
    "shotTable": {
      "title": "Skud-for-skud",
      "header": "#",
      "velocity": "Hastighed (m/s)"
    }
```

`range.errors` (after `"recipeNotFound"`, before `"validation"`):
```json
    "csvHeader": "Ikke en genkendt kronograf-eksport (mangler forventet header).",
    "csvNoShots": "Ingen skud fundet i CSV-filen (kræver mindst 2).",
    "csvParse": "Kunne ikke analysere CSV-filen.",
    "csvShotsInvalid": "Ugyldige skuddata."
```

- [ ] **Step 3: Verify both files are valid JSON**

Run:
```bash
node -e "require('./messages/en.json'); require('./messages/da.json'); console.log('both valid')"
```
Expected: prints `both valid`.

- [ ] **Step 4: Verify key parity**

Run:
```bash
node -e "const en=require('./messages/en.json'), da=require('./messages/da.json'); const k=o=>JSON.stringify(o,(k,v)=>v&&typeof v==='object'?Object.keys(v).sort():v).replace(/\"[^\"]+\"/g,'').replace(/[\[\],:]/g,' '); const a=k(en.range.form).split(' ').filter(Boolean).sort(), b=k(da.range.form).split(' ').filter(Boolean).sort(); console.log('form parity:', JSON.stringify(a)===JSON.stringify(b)); const c=k(en.range.errors).split(' ').filter(Boolean).sort(), d=k(da.range.errors).split(' ').filter(Boolean).sort(); console.log('errors parity:', JSON.stringify(c)===JSON.stringify(d));"
```
Expected: prints `form parity: true` and `errors parity: true`.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/da.json
git commit -m "feat(i18n): add EN/DA keys for chronograph CSV import"
```

---

### Task 5: `ChronographImport.tsx` client component

**Files:**
- Create: `app/range/ChronographImport.tsx`

**Interfaces:**
- Consumes: `parseChronographCsv`, `ChronoCsvError`, `ParsedShot`, `ParsedChronograph` from `lib/parseChronographCsv.ts`; `useTranslations('range')` from `next-intl`; `toast` from `sonner`.
- Produces: `ChronographImport` React component with props `{ onParsed: (shots: ParsedShot[], aggregates: ParsedChronograph) => void, onRemove: () => void, isReadOnly: boolean, existingShots?: ParsedShot[] | null }`. Renders a file input, a preview table, and a remove button.

- [ ] **Step 1: Create the component**

Create `app/range/ChronographImport.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  parseChronographCsv,
  ChronoCsvError,
  type ParsedShot,
  type ParsedChronograph,
} from '@/lib/parseChronographCsv'

interface ChronographImportProps {
  onParsed: (shots: ParsedShot[], aggregates: ParsedChronograph) => void
  onRemove: () => void
  isReadOnly: boolean
  existingShots?: ParsedShot[] | null
}

export function ChronographImport({
  onParsed,
  onRemove,
  isReadOnly,
  existingShots,
}: ChronographImportProps) {
  const t = useTranslations('range')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedChronograph | null>(
    existingShots && existingShots.length >= 2
      ? computeAggregates(existingShots)
      : null,
  )
  const [errorHint, setErrorHint] = useState<string | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setErrorHint(null)
    try {
      const text = await file.text()
      const result = parseChronographCsv(text)
      setParsed(result)
      onParsed(result.shots, result)
    } catch (e) {
      setParsed(null)
      if (e instanceof ChronoCsvError) {
        const key = `errors.${e.kind === 'header' ? 'csvHeader' : e.kind === 'noShots' ? 'csvNoShots' : 'csvParse'}`
        toast.error(t(key))
        setErrorHint(t(key))
      } else {
        toast.error(t('errors.csvParse'))
        setErrorHint(t('errors.csvParse'))
      }
    }
  }

  const handleRemove = () => {
    setParsed(null)
    setErrorHint(null)
    onRemove()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isReadOnly && !parsed) return null

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
      {!isReadOnly && (
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium">{t('form.importCsv')}</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            disabled={isReadOnly}
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-100 dark:file:bg-zinc-800"
          />
        </div>
      )}

      {errorHint && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorHint}</p>
      )}

      {parsed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('form.csvParsed', { count: parsed.roundsFired })}
            </span>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-sm text-red-500 hover:text-red-600"
              >
                {t('form.removeCsv')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 text-xs">
            <Stat label={t('form.velocityMin')} value={parsed.velocityMin.toFixed(1)} />
            <Stat label={t('form.velocityMax')} value={parsed.velocityMax.toFixed(1)} />
            <Stat label={t('form.velocityAvg')} value={parsed.velocityAvg.toFixed(1)} />
            <Stat label={t('form.velocityES')} value={parsed.extremeSpread.toFixed(1)} />
            <Stat label={t('form.velocitySD')} value={parsed.stdDev.toFixed(1)} />
          </div>

          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">{t('form.shotTable.header')}</th>
                    <th className="text-right px-3 py-1.5 font-medium">{t('form.shotTable.velocity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.shots.map((s) => (
                    <tr key={s.shotIndex} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-1.5 font-mono">{s.shotIndex}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{s.velocity.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
      <div className="text-zinc-500 dark:text-zinc-400 text-[10px]">{label}</div>
      <div className="font-mono font-medium mt-0.5">{value}</div>
    </div>
  )
}

function computeAggregates(shots: ParsedShot[]): ParsedChronograph {
  const velocities = shots.map((s) => s.velocity)
  const min = Math.min(...velocities)
  const max = Math.max(...velocities)
  const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length
  return {
    shots,
    velocityMin: min,
    velocityMax: max,
    velocityAvg: avg,
    extremeSpread: max - min,
    stdDev: Math.sqrt(velocities.reduce((sum, v) => sum + (v - avg) ** 2, 0) / velocities.length),
    roundsFired: shots.length,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/range/ChronographImport.tsx
git commit -m "feat(range): add ChronographImport client component with CSV preview"
```

---

### Task 6: Wire `ChronographImport` into `RangeLogForm.tsx`

**Files:**
- Modify: `app/range/RangeLogForm.tsx`

**Interfaces:**
- Consumes: `ChronographImport` from `./ChronographImport`, `ParsedShot` / `ParsedChronograph` from `lib/parseChronographCsv`.
- Produces: `RangeLogForm` lifts `shots` state, renders `ChronographImport` above the velocity fields, auto-fills the velocity inputs on parse, appends `shots` JSON + `replaceShots` to FormData in `handleSubmit`.

- [ ] **Step 1: Add imports and lifted state**

In `app/range/RangeLogForm.tsx`, update the imports (after line 9, the `RangeLogWithImages` import) by adding:

```ts
import { ChronographImport } from './ChronographImport'
import type { ParsedShot, ParsedChronograph } from '@/lib/parseChronographCsv'
```

Inside the component, after the `overlayIndex` state declaration (line 63), add lifted state for shots:

```ts
  const [shots, setShots] = useState<ParsedShot[] | null>(
    initialData?.shots && initialData.shots.length >= 2
      ? initialData.shots.map((s, i) => ({ shotIndex: s.shotIndex, velocity: s.velocity }))
      : null,
  )
  const [replaceShots, setReplaceShots] = useState(false)

  // Refs to the velocity + roundsFired inputs so a CSV parse can auto-fill them.
  const velocityMinRef = useRef<HTMLInputElement>(null)
  const velocityMaxRef = useRef<HTMLInputElement>(null)
  const velocityAvgRef = useRef<HTMLInputElement>(null)
  const extremeSpreadRef = useRef<HTMLInputElement>(null)
  const stdDevRef = useRef<HTMLInputElement>(null)
  const roundsFiredRef = useRef<HTMLInputElement>(null)
```

Also add `useRef` to the React import on line 3:

```ts
import { useState, useEffect, useRef } from 'react'
```

- [ ] **Step 2: Add the parse / remove handlers**

After the `markAsMain` function (after line 98), add:

```ts
  const handleChronoParsed = (_shots: ParsedShot[], aggregates: ParsedChronograph) => {
    setShots(_shots)
    setReplaceShots(true)
    if (velocityMinRef.current) velocityMinRef.current.value = aggregates.velocityMin.toFixed(1)
    if (velocityMaxRef.current) velocityMaxRef.current.value = aggregates.velocityMax.toFixed(1)
    if (velocityAvgRef.current) velocityAvgRef.current.value = aggregates.velocityAvg.toFixed(1)
    if (extremeSpreadRef.current) extremeSpreadRef.current.value = aggregates.extremeSpread.toFixed(1)
    if (stdDevRef.current) stdDevRef.current.value = aggregates.stdDev.toFixed(1)
    if (roundsFiredRef.current) roundsFiredRef.current.value = String(aggregates.roundsFired)
  }

  const handleChronoRemove = () => {
    setShots(null)
    setReplaceShots(true)
  }
```

- [ ] **Step 3: Append shots to FormData in `handleSubmit`**

In `handleSubmit` (inside the `if (isReadOnly) return;` block, after the existing-image appends and before the `try` block at line 180), add:

```ts
    if (shots && shots.length >= 2) {
      formData.append('shots', JSON.stringify(shots))
    }
    if (replaceShots) {
      formData.append('replaceShots', 'true')
    }
```

- [ ] **Step 4: Render `ChronographImport` and attach refs to the velocity inputs**

Insert the `<ChronographImport>` component just before the "Chronograph Data" comment (before line 285, the `{/* Chronograph Data */}` block):

```tsx
      <ChronographImport
        onParsed={handleChronoParsed}
        onRemove={handleChronoRemove}
        isReadOnly={isReadOnly}
        existingShots={shots}
      />
```

Then attach refs to the six inputs. For `velocityMin` (line 289), `velocityMax` (line 293), `velocityAvg` (line 297), `extremeSpread` (line 301), `stdDev` (line 305), and `roundsFired` (line 263), add a `ref={...}` prop. For example, the `velocityMin` input becomes:

```tsx
          <input ref={velocityMinRef} type="number" step="1" name="velocityMin" defaultValue={initialData?.velocityMin ?? ''} disabled={isReadOnly} className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 bg-white dark:bg-zinc-950 disabled:bg-zinc-100 dark:disabled:bg-zinc-800" />
```

Apply the same `ref={velocityMaxRef}`, `ref={velocityAvgRef}`, `ref={extremeSpreadRef}`, `ref={stdDevRef}` additions to the other four velocity inputs, and `ref={roundsFiredRef}` to the `roundsFired` input.

- [ ] **Step 5: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Build to confirm the form compiles under Turbopack**

Run: `pnpm build`
Expected: exit 0, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/range/RangeLogForm.tsx
git commit -m "feat(range): wire ChronographImport into RangeLogForm with auto-fill"
```

---

### Task 7: Server action — parse, validate, persist shots

**Files:**
- Modify: `app/range/actions.ts` (both `createRangeLog` and `updateRangeLog`)
- Test: `app/range/actions.test.ts` (extend)

**Interfaces:**
- Consumes: `shotsSchema` from `lib/schemas.ts`.
- Produces: `createRangeLog` / `updateRangeLog` read `formData.get('shots')`, validate with `shotsSchema`, recompute aggregates, and `createMany` / `deleteMany`+`createMany` `RangeLogShot` rows inside the existing transaction. The prisma mock in the test must add `rangeLogShot: { createMany: vi.fn(), deleteMany: vi.fn() }`.

- [ ] **Step 1: Write the failing tests**

In `app/range/actions.test.ts`, extend the `prismaMock` inside `vi.hoisted` (lines 30-41) by adding `rangeLogShot`:

```ts
const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      recipe: { findUnique: vi.fn() },
      rangeLog: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      rangeLogImage: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      rangeLogShot: { createMany: vi.fn(), deleteMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    },
  }
})
```

Add a new `describe` block at the end of the file (after line 222):

```ts
describe('createRangeLog — chronograph shots', () => {
  it('persists shot rows when a valid shots JSON is in FormData', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))

    await createRangeLog(fd)

    expect(prismaMock.rangeLogShot.createMany).toHaveBeenCalledTimes(1)
    const call = prismaMock.rangeLogShot.createMany.mock.calls[0][0]
    expect(call.data).toHaveLength(2)
    expect(call.data[0]).toMatchObject({ shotIndex: 1, velocity: 950.0, rangeLogId: 'range-1' })
    expect(call.data[1]).toMatchObject({ shotIndex: 2, velocity: 960.0, rangeLogId: 'range-1' })
  })

  it('does not create shots when no shots field is present', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    await createRangeLog(form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLogShot.createMany).not.toHaveBeenCalled()
  })

  it('overwrites the submitted aggregates with recomputed values from shots', async () => {
    prismaMock.recipe.findUnique.mockResolvedValue(makeRecipe())
    prismaMock.rangeLog.create.mockResolvedValue({ id: 'range-1' })

    const fd = form({
      date: '2026-06-17',
      recipeId: 'recipe-1',
      roundsFired: '2',
      velocityMin: '999',
      velocityMax: '999',
      velocityAvg: '999',
      extremeSpread: '999',
      stdDev: '999',
    })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))

    await createRangeLog(fd)

    const data = prismaMock.rangeLog.create.mock.calls[0][0].data
    expect(data.velocityMin).toBeCloseTo(950.0, 1)
    expect(data.velocityMax).toBeCloseTo(960.0, 1)
    expect(data.velocityAvg).toBeCloseTo(955.0, 1)
    expect(data.extremeSpread).toBeCloseTo(10.0, 1)
  })
})

describe('updateRangeLog — chronograph shots', () => {
  it('replaces shots when replaceShots=true and shots are present', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })
    prismaMock.rangeLog.update.mockResolvedValue({ id: 'range-1' })

    const fd = form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '2' })
    fd.set('shots', JSON.stringify([
      { shotIndex: 1, velocity: 950.0 },
      { shotIndex: 2, velocity: 960.0 },
    ]))
    fd.set('replaceShots', 'true')

    await updateRangeLog('range-1', fd)

    expect(prismaMock.rangeLogShot.deleteMany).toHaveBeenCalledWith({ where: { rangeLogId: 'range-1' } })
    expect(prismaMock.rangeLogShot.createMany).toHaveBeenCalledTimes(1)
  })

  it('leaves existing shots untouched when no shots field is submitted', async () => {
    prismaMock.rangeLog.findUnique.mockResolvedValue({ recipeId: 'recipe-1' })
    prismaMock.rangeLog.update.mockResolvedValue({ id: 'range-1' })

    await updateRangeLog('range-1', form({ date: '2026-06-17', recipeId: 'recipe-1', roundsFired: '20' }))

    expect(prismaMock.rangeLogShot.deleteMany).not.toHaveBeenCalled()
    expect(prismaMock.rangeLogShot.createMany).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test app/range/actions.test.ts`
Expected: FAIL — `prismaMock.rangeLogShot` is undefined or `createMany` is not called.

- [ ] **Step 3: Update the import in `app/range/actions.ts`**

On line 10, extend the schema import to include `shotsSchema`:

```ts
import { createRangeLogInputSchema, createRangeLogUpdateInputSchema, shotsSchema } from '@/lib/schemas'
```

- [ ] **Step 4: Add a `recomputeAggregates` helper near the top of `actions.ts`**

After the `recipeSnapshot` function (after line 135), add:

```ts
function recomputeAggregates(shots: { shotIndex: number; velocity: number }[]) {
  const velocities = shots.map((s) => s.velocity)
  const min = Math.min(...velocities)
  const max = Math.max(...velocities)
  const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length
  return {
    velocityMin: min,
    velocityMax: max,
    velocityAvg: avg,
    extremeSpread: max - min,
    stdDev: Math.sqrt(velocities.reduce((sum, v) => sum + (v - avg) ** 2, 0) / velocities.length),
    roundsFired: shots.length,
  }
}
```

- [ ] **Step 5: Update `createRangeLog` to parse + persist shots**

In `createRangeLog`, after the `validated` block and the destructuring of scalar fields (after line 208, the `} = validated.data` line), add the shots parsing:

```ts
  const rawShots = formData.get('shots')
  let validShots: { shotIndex: number; velocity: number }[] | null = null
  if (rawShots && typeof rawShots === 'string') {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawShots)
    } catch {
      throw new Error(t('errors.csvShotsInvalid'))
    }
    const shotResult = shotsSchema.safeParse(parsed)
    if (!shotResult.success) {
      throw new Error(t('errors.csvShotsInvalid'))
    }
    validShots = shotResult.data
  }

  // If shots were supplied, recompute the aggregates from them so the stored
  // values are internally consistent with the per-shot rows (the client preview
  // could be stale or hand-edited).
  const effectiveAggregates = validShots ? recomputeAggregates(validShots) : null
```

Then, inside the `$transaction` callback, replace the `data` object on `tx.rangeLog.create` (lines 243-256) so the velocity fields come from `effectiveAggregates` when shots are present, falling back to the form-submitted values otherwise:

```ts
      const rangeLog = await tx.rangeLog.create({
        data: {
          date,
          location,
          conditions,
          recipeId,
          roundsFired: effectiveAggregates?.roundsFired ?? roundsFired,
          velocityMin: effectiveAggregates?.velocityMin ?? velocityMin,
          velocityMax: effectiveAggregates?.velocityMax ?? velocityMax,
          velocityAvg: effectiveAggregates?.velocityAvg ?? velocityAvg,
          extremeSpread: effectiveAggregates?.extremeSpread ?? extremeSpread,
          stdDev: effectiveAggregates?.stdDev ?? stdDev,
          notes,
          ...recipeSnapshot(recipe),
        },
      })

      rangeLogId = rangeLog.id

      const createdImages = []
      for (const upload of pendingUploads) {
        const created = await tx.rangeLogImage.create({
          data: {
            rangeLogId: rangeLog.id,
            filename: upload.filename,
            description: upload.description,
          },
        })
        createdImages.push(created)
      }

      if (createdImages[0]) {
        await tx.rangeLog.update({
          where: { id: rangeLog.id },
          data: { mainImageId: createdImages[0].id },
        })
      }

      if (validShots) {
        await tx.rangeLogShot.createMany({
          data: validShots.map((s) => ({ ...s, rangeLogId: rangeLog.id })),
        })
      }
```

- [ ] **Step 6: Update `updateRangeLog` to replace shots**

In `updateRangeLog`, after the `validated` block and destructuring (after line 407, the `} = validated.data` line), add the same shots parsing plus the `replaceShots` flag:

```ts
  const rawShots = formData.get('shots')
  const replaceShots = formData.get('replaceShots') === 'true'
  let validShots: { shotIndex: number; velocity: number }[] | null = null
  if (rawShots && typeof rawShots === 'string') {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawShots)
    } catch {
      throw new Error(t('errors.csvShotsInvalid'))
    }
    const shotResult = shotsSchema.safeParse(parsed)
    if (!shotResult.success) {
      throw new Error(t('errors.csvShotsInvalid'))
    }
    validShots = shotResult.data
  }

  const effectiveAggregates = validShots ? recomputeAggregates(validShots) : null
```

Then, inside the `$transaction` callback, update the `tx.rangeLog.update` `data` object (lines 458-474) so velocity fields use `effectiveAggregates` when shots are present:

```ts
      await tx.rangeLog.update({
        where: { id },
        data: {
          date,
          location,
          conditions,
          roundsFired: effectiveAggregates?.roundsFired ?? roundsFired,
          velocityMin: effectiveAggregates?.velocityMin ?? velocityMin,
          velocityMax: effectiveAggregates?.velocityMax ?? velocityMax,
          velocityAvg: effectiveAggregates?.velocityAvg ?? velocityAvg,
          extremeSpread: effectiveAggregates?.extremeSpread ?? extremeSpread,
          stdDev: effectiveAggregates?.stdDev ?? stdDev,
          notes,
          ...(linkedRecipe ? { ...recipeSnapshot(linkedRecipe), recipeId: effectiveRecipeId } : {}),
          mainImageId: mainImageId || null,
        },
      })
```

Then, after the "If no main was sent from existing" block (after line 512, inside the `$transaction`), add the shots replacement:

```ts
      if (validShots && replaceShots) {
        await tx.rangeLogShot.deleteMany({ where: { rangeLogId: id } })
        await tx.rangeLogShot.createMany({
          data: validShots.map((s) => ({ ...s, rangeLogId: id })),
        })
      }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm test app/range/actions.test.ts`
Expected: PASS — all existing + 5 new tests green.

- [ ] **Step 8: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add app/range/actions.ts app/range/actions.test.ts
git commit -m "feat(range): persist + recompute chronograph shots in range actions"
```

---

### Task 8: Detail view — include + render shots

**Files:**
- Modify: `app/range/actions.ts` — `getRangeLogById` query adds `shots`.
- Modify: `lib/types.ts` — `RangeLogWithImages` includes `shots`.
- Modify: `app/range/[id]/page.tsx` — render a "Shot-by-shot" table in the readonly detail.

**Interfaces:**
- Produces: `getRangeLogById` returns `shots: { shotIndex, velocity }[]` ordered by `shotIndex` asc. `RangeLogWithImages` type reflects this. The detail page renders the table.

- [ ] **Step 1: Update `getRangeLogById`**

In `app/range/actions.ts`, update the `getRangeLogById` function (lines 154-167) to include `shots`:

```ts
export async function getRangeLogById(id: string) {
  return prisma.rangeLog.findUnique({
    where: { id },
    include: {
      recipe: {
        select: { id: true, name: true, caliber: true },
      },
      mainImage: {
        select: { id: true, filename: true, description: true },
      },
      images: true,
      shots: { orderBy: { shotIndex: 'asc' } },
    },
  })
}
```

- [ ] **Step 2: Update `RangeLogWithImages` type**

In `lib/types.ts`, update the `RangeLogWithImages` type (lines 46-52) to include `shots`:

```ts
export type RangeLogWithImages = Prisma.RangeLogGetPayload<{
  include: {
    recipe: { select: { id: true; name: true; caliber: true } }
    mainImage: { select: { id: true; filename: true; description: true } }
    images: true
    shots: { orderBy: { shotIndex: 'asc' } }
  }
}>
```

- [ ] **Step 3: Render the shot table in the detail page**

In `app/range/[id]/page.tsx`, inside the readonly form container `<div>` (after the `<RangeLogForm ... />` element, after line 116), add a shot-by-shot table:

```tsx
        {log.shots && log.shots.length >= 2 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">{t('form.shotTable.title')}</h3>
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t('form.shotTable.header')}</th>
                    <th className="text-right px-3 py-2 font-medium">{t('form.shotTable.velocity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {log.shots.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 font-mono">{s.shotIndex}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.velocity.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Typecheck**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/range/actions.ts lib/types.ts app/range/[id]/page.tsx
git commit -m "feat(range): show shot-by-shot table on range session detail"
```

---

### Task 9: End-to-end manual verification in Docker

**Files:** none (verification only)

- [ ] **Step 1: Restart the app container so Prisma Client + migrations are fresh**

Run:
```bash
docker compose restart app
```
Wait ~10s, then:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
```
Expected: `HTTP 200`.

- [ ] **Step 2: Verify the new range form renders with the import control**

Open `http://localhost:3000/range/new` in the browser. Confirm:
- The "Import from chronograph" file input is visible above the velocity fields.
- Selecting `/Users/dkKenEgh/Downloads/xero_c1_sample_export.csv` shows a preview table of 15 shots + stats row (min 946.8, max 958.2, avg 953.9, ES 11.4, SD ~3.1).
- The velocity + roundsFired inputs auto-fill with the parsed values.
- "Remove import" clears the preview.

- [ ] **Step 3: Create a session with an imported CSV and verify it saves**

Pick a recipe, set a date, import the CSV, and submit. Confirm:
- Toast: "Range session logged!"
- You land on `/range`.
- Open the new session's detail page (`/range/<id>`): the "Shot-by-shot" table shows 15 rows, and the velocity stats match.

- [ ] **Step 4: Edit the session, import a different CSV, and verify replacement**

From the detail page, click "Edit". Import a CSV with a different number of shots (or the same one). Save. Re-open the detail page and confirm the shot table reflects the new import (old shots replaced, not duplicated).

- [ ] **Step 5: Verify locale switching still works**

Switch the language to Danish in Settings, return to `/range/new`, and confirm the import control labels are Danish ("Importér fra kronograf", "Fjern import", etc.).

- [ ] **Step 6: Run the full test suite + typecheck one final time**

Run:
```bash
./node_modules/.bin/tsc --noEmit && pnpm test
```
Expected: both exit 0, all tests pass.

---

### Task 10: Documentation — README, architecture, AGENTS

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update README**

In `README.md`, under the "Range Sessions" feature list (after the "Unlimited photos" bullet, around line 39), add a bullet:

```markdown
  - **Chronograph CSV import**: upload a Xero C1 export (`.csv`) from inside the range session form. The app parses per-shot velocities in the browser, shows a preview with computed stats (min/max/avg/ES/SD), auto-fills the velocity fields, and — on save — stores both the individual shots (new `RangeLogShot` model) and the recomputed aggregates. The detail page shows a shot-by-shot table.
```

- [ ] **Step 2: Update the architecture ER diagram**

In `docs/architecture.md`, in the `erDiagram` block (after the `RangeLogImage` block, around line 103), add:

```
    RangeLog ||--o{ RangeLogShot : "shots (cascade)"
```

And add a `RangeLogShot` entity:

```
    RangeLogShot {
        string id PK
        string rangeLogId FK
        int shotIndex "1-based from CSV"
        float velocity "m/s"
    }
```

- [ ] **Step 3: Add a note to the Key flows section**

In `docs/architecture.md`, in the Key flows `sequenceDiagram` block (after the RangeLog edit block, around line 134), add:

```
    rect rgb(30,41,59)
    note over U,A: Chronograph CSV import (Xero C1)
    U->>U: select CSV → parseChronographCsv (client)
    U->>U: preview shots + auto-fill velocity fields
    U->>A: FormData (shots JSON + replaceShots)
    A->>A: shotsSchema.safeParse + recompute aggregates
    A->>DB: TX: upsert RangeLog + deleteMany/insertMany RangeLogShot
    A-->>U: revalidate + redirect to detail
    end
```

- [ ] **Step 4: Update AGENTS.md**

In `AGENTS.md`, in the range-log bullet (the one starting "Range logs: same snapshot model..."), append a sentence noting the new model and import flow:

After the existing range-log description, add:

```
- **Chronograph CSV import**: range sessions can import a Xero C1 chronograph CSV from inside `RangeLogForm`. Client-side parser `lib/parseChronographCsv.ts` (pure, unit-tested) extracts per-shot velocities and computes aggregates (population stddev). Shots are sent to the server action as JSON in FormData (`shots` + `replaceShots` flags), validated with `shotsSchema` (`lib/schemas.ts`), and persisted in a new `RangeLogShot` child model (`onDelete: Cascade`). The action recomputes aggregates from the validated shots as a cross-check, overwriting any client-submitted velocity values. The detail page renders a shot-by-shot table.
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/architecture.md AGENTS.md
git commit -m "docs: document chronograph CSV import + RangeLogShot model"
```

---

## Self-Review Notes

**Spec coverage check** (against `docs/superpowers/specs/2026-06-27-chronograph-csv-import-design.md`):
- Data model (`RangeLogShot`) → Task 1. ✓
- CSV parsing (client, `parseChronographCsv`) → Task 2. ✓
- Form UX & client wiring (`ChronographImport`, lifted state, auto-fill, replace-on-edit) → Tasks 5, 6. ✓
- Server action & validation (`shotsSchema`, recompute, persist, replace) → Tasks 3, 7. ✓
- Detail view shot table → Task 8. ✓
- i18n keys (EN + DA) → Task 4. ✓
- Tests (parser, schema, actions) → Tasks 2, 3, 7. ✓
- Docs (README, architecture, AGENTS) → Task 10. ✓
- E2E manual verification → Task 9. ✓

**Type consistency check:**
- `ParsedShot` / `ParsedChronograph` defined in Task 2, consumed in Tasks 5, 6. ✓
- `shotsSchema` defined in Task 3, consumed in Task 7. ✓
- `ChronographImport` props `{ onParsed, onRemove, isReadOnly, existingShots }` defined in Task 5, used in Task 6. ✓
- `recomputeAggregates` defined in Task 7, used in Task 7. ✓
- `RangeLogWithImages` extended in Task 8, consumed by `RangeLogForm` (Task 6 reads `initialData?.shots`). ✓

**No placeholders** — every step has concrete code or commands.