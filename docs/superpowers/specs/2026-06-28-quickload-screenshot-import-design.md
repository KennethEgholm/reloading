# Import Recipe from QuickLoad Screenshot — Design

**Date:** 2026-06-28
**Status:** Approved

## Goal

Let the user upload a screenshot of a QuickLoad recipe screen, have an
image-capable LLM extract the structured fields, review/edit them in a
preview, and create a new recipe — reusing the existing recipe-creation
server action (`importRecipeFromQuickLoad`).

This is the feature described in `specs/spec.md` → "Import recipes from QL
via screenshot". It coexists with the in-progress `.dat`-file import; it does
not replace it.

## Non-goals

- Replacing or fixing the existing `.dat`-file import (`QuickLoadImport.tsx`,
  `parseQuickLoadDat.ts`). That is a separate, parallel feature. (Note: its
  JSX currently references `editable.calculatedV0`/`fillRate`/`calcV0` fields
  that don't exist in its state — out of scope here.)
- Storing the uploaded screenshot. The image is sent to the LLM in-memory and
  discarded; nothing is written to disk or the database.
- Supporting non-OpenAI-compatible providers (current infra assumes
  OpenAI-compatible; Grok is the configured provider).

## Data flow

```
[QuickLoadImageImport.tsx]  (client)
  pick image → FormData(image) → server action extractQuickLoadFromImage()
                                          │
                                          ▼
                              [lib/ai.ts] visionCompletion()   (new)
                                  base64 data URL + extraction prompt
                                          │ JSON text
                                          ▼
                              parseJsonFromModel → ParsedQuickLoad (shared)
  ◄───────────────────────────────────────┘  (returned, NOT persisted)
  show editable preview → auto-match projectile/propellant
  confirm → importRecipeFromQuickLoad(data)    (existing action, reused)
```

## Components

### 1. Vision helper — `lib/ai.ts` (new function)

`visionCompletion(params)` returns the assistant message text, mirroring
`chatCompletion` but sending one image plus a text prompt using the
OpenAI-compatible multimodal message shape:

```
messages: [
  { role: 'system', content: <extraction system prompt> },
  { role: 'user', content: [
      { type: 'text', text: <instruction> },
      { type: 'image_url', image_url: { url: 'data:<mime>;base64,<data>' } },
  ]},
]
```

- Params: `{ baseUrl, apiKey, model, imageBase64, mimeType, systemPrompt,
  userPrompt, temperature?, maxTokens?, responseFormat? }`.
- Reuses the same fetch + `AiError` mapping (`config` / `auth` / `http` /
  `network` / `empty`) as `chatCompletion`. Factor the shared
  response-handling out only if it stays clean; otherwise duplicate the small
  amount of error mapping.
- Text-only `chatCompletion` stays untouched.

### 2. Schema + settings — `visionModel`

- Prisma: add `visionModel String?` to `AiSettings` (nullable; migration).
- `app/settings/actions.ts`: add `visionModel` to the zod schema (optional),
  read it from the form, persist in `create`/`update` upsert.
- `app/settings/SettingsForm.tsx`: add a "Vision model" text input
  (placeholder e.g. `grok-2-vision-1212`) with a short hint.
- Extraction uses `settings.visionModel ?? settings.model` so an unset vision
  model falls back to the main model.

### 3. Server action — `app/recipes/actions.ts`

`extractQuickLoadFromImage(formData: FormData): Promise<ParsedQuickLoad>`

- Read `image` from FormData.
- Validate: non-empty, `size <= 10MB`, recognized image via magic-byte MIME
  detection (reuse the approach in `app/range/actions.ts` —
  `getImageMimeType`; extract to a shared `lib/` helper or duplicate the small
  function). Throw translated errors otherwise.
- Load `AiSettings`; require `apiKey` and a vision model (`visionModel ??
  model`), else throw `errors.configureAi`-style message.
- Base64-encode the buffer, call `visionCompletion` with `responseFormat:
  'json_object'`.
- `parseJsonFromModel` → map into `ParsedQuickLoad`; coerce numerics safely
  (missing/garbage → 0 or null per field). If parsing yields nothing usable,
  throw a translated "couldn't read the screenshot" error.
- Return the `ParsedQuickLoad`. Does NOT persist — the preview/confirm step
  calls the existing `importRecipeFromQuickLoad`.

Extraction system prompt: instruct the model it's reading a QuickLoad
internal-ballistics screenshot and must return ONLY a JSON object of a fixed
shape (caliber, bullet brand/type/weight/caliber, propellant brand/type,
charge gr, COAL, calculated V0, measured V0 if shown, fill rate %, suggested
name, notes). Tell it to use null/empty when a field isn't visible rather than
inventing values.

### 4. Shared format extension — `lib/parseQuickLoadDat.ts`

`ParsedQuickLoad` gains:

```
calculatedV0: number | null
fillRate: number | null
```

The `.dat` parser sets both to `null` (QuickLoad `.dat` doesn't carry them in
the current parse). The existing `importRecipeFromQuickLoad` /
`QuickLoadImportData` already accept `calculatedV0` and `fillRate`.

### 5. Component — `app/recipes/QuickLoadImageImport.tsx` (new)

Separate modal, styled like `QuickLoadImport.tsx` (focus trap via
`useFocusTrap`, same dialog markup/classes):

- Image file input (`accept="image/*"`).
- On select: client-side size guard, then call `extractQuickLoadFromImage`;
  show a loading/“reading screenshot…” state.
- On success: populate an editable preview with all fields (name, caliber,
  charge, COAL, calculated V0, measured V0, fill rate, notes) plus
  projectile/propellant match-or-create (reuse the matching logic shape from
  `QuickLoadImport.tsx`).
- Confirm → build `QuickLoadImportData`, call `importRecipeFromQuickLoad`,
  toast success, close.
- Added to `app/recipes/page.tsx` beside the existing `<QuickLoadImport>`
  button, receiving the same `projectiles` / `propellants` props.

### 6. Error handling

LLM unreachable / bad key / non-image / oversized / empty-or-unparseable JSON
→ translated toast + inline message; the modal stays open so the user can
retry or fall back to the `.dat` import. New `qlImageImport.*` i18n namespace
in `messages/en.json` and `messages/da.json`.

## Testing (TDD)

- `lib/ai` vision (`lib/ai.test.ts` or new): builds the correct multimodal
  payload (image_url data URL, system+user roles); maps non-ok / auth / empty
  responses to `AiError`. Mock `fetch`.
- `extractQuickLoadFromImage` (`app/recipes/actions.test.ts`): rejects
  oversized and non-image input; maps a well-formed model JSON response to a
  correct `ParsedQuickLoad`; throws a friendly error on unparseable model
  output and on missing AI config. Mock settings + `fetch`/vision.

## Open decisions resolved

- Coexist with `.dat` import: **yes**.
- Fields: **all** (caliber, bullet, powder+charge, COAL+velocities+fill).
- Vision transport: **separate `visionCompletion` helper**.
- Flow: **preview & edit, then save**.
- Reuse: **shared format + `importRecipeFromQuickLoad`, new modal**.
- Vision model config: **separate `visionModel` field, falls back to `model`**.
