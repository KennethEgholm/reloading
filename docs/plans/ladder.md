# Plan: Load Development Ladder

Status: IMPLEMENTED (2026-08-31) — plus Start-ladder prefill from an existing recipe (`?recipeId=`)
Owner: Reloading Tool (reloading)

## Goal

Support the user's traditional "ladder load" workflow: create N recipes that share all
components (projectile, propellant, primer, cartridge, rifle, COAL, notes) but differ only
in powder charge, then compare their accuracy groups / velocity data side by side and mark
a winner.

**Core decision:** members are *ordinary recipes*. All existing machinery (load logs,
range sessions, snapshots, chrono import, MOA groups, AI safety check, inventory) works
unchanged. The Ladder entity is a thin grouping + comparison layer on top.

## Data model

```prisma
model Ladder {
  id              String   @id @default(cuid())
  name            String
  notes           String?
  winningRecipeId String? // plain id, validated at write time, no FK
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  recipes         Recipe[]
}

// on Recipe:
ladderId          String? // FK onDelete: SetNull + @@index([ladderId]) + back-relation
ladderChargeIndex Int?    // 1..N ordering within the ladder
```

- `deleteLadder` explicitly nulls `ladderId` **and** `ladderChargeIndex` on members before
  deleting (SetNull only clears the FK).
- `winningRecipeId` has no FK to avoid a circular relation; the action validates that the
  recipe is a member before writing.

## Pure lib (`lib/ladder.ts`) — unit-tested

- `generateCharges(start, step, count)` → `{ index, charge, label }[]`.
  Guards: count 2–20, step ≠ 0, charges > 0. Round to 2 dp to kill float junk
  (e.g. `40.0 + 0.3×3` must be `40.9`, not `40.89999…`).
- `aggregateLadderStats(memberStats)` → per-charge rows for the comparison page:
  - **avg MOA** = mean of member's group MOAs
  - **best MOA** = min group MOA
  - **avg velocity** = mean of linked sessions' `velocityAvg`
  - **ES** = max `velocityMax` − min `velocityMin` across sessions
  - **SD** = mean of session `stdDev`
  - **sessions** = count of linked range sessions with data
- Zod `ladderFormSchema` in `lib/schemas.ts` with `t`-translator messages.

## Server actions (`app/recipes/ladders/actions.ts`)

- `createLadder(formData)` — resolve caliber, then one **transaction** creating the
  Ladder + N recipes. Name pattern: editable prefix + `— {charge}gr`
  (default prefix `Ladder: {caliber}`).
- `updateLadder(id, formData)` — name/notes only.
- `setLadderWinner(ladderId, recipeId)` — validates recipe is a member.
- `deleteLadder(id)` — nulls member fields (recipes survive), deletes ladder.
- Toasts via Sonner; `revalidatePath('/recipes')` + ladder page.

## Routes / UI

- **`/recipes/ladders/new`** (`max-w-3xl` create shell): `LadderForm` client component —
  shared components picked once (caliber via `CaliberField`, projectile, propellant,
  primer, cartridge, rifle, COAL, notes), start/step/count with **live preview of all N
  generated names**, editable prefix. Entry: "New Ladder" button in the recipes page
  header beside "New Recipe".
- **`/recipes/ladders/[id]`** (`max-w-5xl` detail shell): comparison table —
  Charge | Avg MOA | Best MOA | Avg vel | ES | SD | Sessions — best-MOA row highlighted,
  winner row badged; "Mark as winner" per row; name/notes edit; delete ladder button
  (`text-red-600` pattern); links to each member's detail page.
- **`RecipesTable.tsx`**: ladder badge on member rows (list query gains
  `include: { ladder: { select: { name } } } }`).
- Members are edited/used like any recipe (range sessions, logs, AI check per member).

## i18n

New `ladders` namespace in **both** `messages/en.json` + `messages/da.json` — all form
labels, preview strings, table headers, toasts, errors. Parity test enforces sync.

## Export/import (`app/settings/dataActions.ts`)

- `exportRecipes` adds `ladderName` + `ladderChargeIndex` per recipe.
- `executeRecipesImport` re-links by ladder name; creates a stub Ladder row if missing
  (mirrors the stub-inventory pattern). No new export section; "Everything" bundle
  unchanged in shape.

## Docs (same change, per AGENTS.md rules)

- README feature section; `docs/architecture.md` (model diagram + route map);
  AGENTS.md architecture bullet + namespace count 17→18.

## Verification

1. `pnpm typecheck` → 2. `pnpm test` (new ladder lib tests + i18n parity) →
3. `pnpm build`.
4. In the **Desktop** container: `pnpm prisma migrate dev --name add_ladder`,
   restart app container (never Colima).
5. Exercise: create a 5-step ladder → verify 5 recipes with badge → log a range session
   w/ groups on two members → comparison page aggregates → mark winner → delete ladder →
   recipes survive unlinked.

## Out of scope (later)

Charts, per-member AI-check batching, COAL ladder variant (seated-depth ladder),
auto-promote winner to a "final" recipe.

## Side note: RCBS ChargeMaster Link BLE (researched 2026-08-31)

The ChargeMaster Link uses BLE, but the GATT protocol is **proprietary and undocumented**;
no public API and no known open-source reverse-engineering exists (GitHub
"chargemaster-protocol" repos are unrelated SkyRC battery chargers). The official manual
only documents a `bLE` setup menu with a settable Bluetooth link password.

If integration is attempted later:
1. **Sniff first**: Android HCI snoop log while using the RCBS app, or explore with
   nRF Connect (service/characteristic UUIDs + command frames).
2. **Client shape if protocol known**: Web Bluetooth in Chrome/Edge (needs HTTPS —
   Cloudflare Tunnel already provides it; Safari/iOS cannot do Web Bluetooth).
   Read-only first (live weight stream → auto-verify thrown charge vs recipe charge),
   dispensing commands later if the protocol allows.
3. **Cheap alternative** ("Bench mode" page): big-type charge/COAL card for the selected
   recipe or ladder step, one tap to log the load. No hardware risk, works on any device.