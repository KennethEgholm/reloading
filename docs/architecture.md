# Architecture

Diagrams describing the architecture of the reloading project.

## High-level architecture

```mermaid
graph TB
    subgraph Browser["Browser (Client)"]
        UI["Client Components<br/>(Tables, Forms, ThemeToggle)<br/>local state · Sonner toasts"]
        LS[("localStorage<br/>theme pref")]
    end

    subgraph Next["Next.js 16 App Router (app container)"]
        direction TB
        MW["middleware.ts<br/>locale: cookie → Accept-Language → default"]
         I18N["i18n/request.ts · messages/{en,da}.json<br/>18 namespaces · t() / getTranslations()"]
         SC["Server Components<br/>(pages: /, /recipes, /recipes/.../print, /range,<br/>/factory-ammo, /rifles, /logs, inventory, /settings)"]
        SA["Server Actions<br/>(actions.ts per domain)<br/>Zod validate · revalidatePath"]

        subgraph Lib["lib/"]
            PRISMA["prisma.ts<br/>PrismaClient + pg adapter"]
            AI["ai.ts<br/>chatCompletion · visionCompletion<br/>parseJsonFromModel · AiError · DEFAULT_BASE_URLS"]
            FMT["format.ts (Intl.DateTimeFormat, locale-aware)"]
            TYP["types.ts (DeleteResult)"]
        end
    end

    subgraph Storage["Persistence"]
        PG[("Postgres 16<br/>postgres_data volume")]
        FILES[("public/uploads/range-logs/<br/>public/uploads/factory-ammo/<br/>UUID filenames")]
    end

    EXT["External AI provider<br/>(OpenAI-compatible /chat/completions)<br/>xAI Grok etc."]

    REQ["HTTP request"] --> MW
    MW -- "x-next-intl-locale header" --> I18N
    I18N -- "messages + locale" --> SC
    I18N -- "messages + locale" --> SA
    UI -- "FormData submit" --> SA
    SC -- "render HTML (t() strings)" --> UI
    UI <--> LS
    SC -- "queries" --> PRISMA
    SA -- "mutations + transactions" --> PRISMA
    SA -- "image read/write/unlink" --> FILES
    SA -- "AI safety check" --> AI
    SA -- "QL screenshot extract" --> AI
    AI -- "HTTPS + bearer token" --> EXT
    PRISMA -- "SQL (pool)" --> PG

    classDef store fill:#1f2937,stroke:#9ca3af,color:#fff;
    class PG,FILES,LS store;
```

## Data model (Prisma schema)

```mermaid
erDiagram
    AiSettings {
        string id PK "singleton"
        string provider
        string model
        string apiKey
        string baseUrl
    }

    Primer ||--o{ Recipe : "primerId (optional)"
    Projectile ||--o{ Recipe : "projectileId"
    Propellant ||--o{ Recipe : "propellantId"
    Cartridge ||--o{ Recipe : "cartridgeId (optional)"
    Rifle ||--o{ Recipe : "rifleId (optional, SetNull)"
    Rifle ||--o{ RangeLog : "rifleId (optional, SetNull)"
    Ladder ||--o{ Recipe : "ladderId (optional, SetNull)"

    Recipe ||--o{ LoadLog : "recipeId (nullable)"
    Recipe ||--o{ RangeLog : "recipeId (required)"
    RangeLog ||--o{ RangeLogImage : "images"
    RangeLog |o--o| RangeLogImage : "mainImage"
    RangeLog ||--o{ RangeLogShot : "shots (cascade)"
    RangeLog ||--o{ RangeGroup : "groups (cascade)"

    Caliber ||--o{ FactoryAmmo : "caliberId"
    Caliber ||--o{ Rifle : "caliberId"
    FactoryAmmo ||--o{ FactoryAmmoSession : "sessions (cascade)"
    FactoryAmmoSession ||--o{ FactoryAmmoShot : "shots (cascade)"
    FactoryAmmoSession ||--o{ FactoryAmmoGroup : "groups (cascade)"

    Projectile {
        string id PK
        string brand
        string type
        float weightGr
        float bcG1 "optional G1 BC"
        float bcG7 "optional G7 BC"
        float preferredTwistIn "optional, inches/rev"
        string caliber
        int amount
    }

    Recipe {
        string id PK
        float chargeGr
        float coal
        float calculatedV0
        float measuredV0
        string aiVerdict "advisory only"
        string aiSummary
        string aiConcerns
        string ladderId FK "optional ladder membership"
        int ladderChargeIndex "1..N within ladder"
    }

    Ladder {
        string id PK
        string name
        string notes
        string winningRecipeId "plain id, validated at write"
    }

    LoadLog {
        string id PK
        string recipeName "denormalized snapshot"
        float chargeGr
        string projectileBrand
        string propellantBrand
        string primerBrand
        string projectileId "for inventory restore"
        string propellantId
        string primerId
    }

    RangeLog {
        string id PK
        datetime date
        string location
        int roundsFired
        float velocityAvg
        float extremeSpread
        float stdDev
        string rifleName "snapshot"
        float rifleTwistIn "snapshot"
    }

    RangeLogImage {
        string id PK
        string path
        string description
    }

    RangeLogShot {
        string id PK
        string rangeLogId FK
        int shotIndex "1-based from CSV"
        float velocity "m/s"
    }

    RangeGroup {
        string id PK
        string rangeLogId FK
        float distanceM "meters, user-entered"
        int shotCount "shots in group"
        float groupSizeMm "extreme spread, mm"
        float moa "server-computed"
        string notes
    }

    FactoryAmmo {
        string id PK
        string brand
        string model
        string caliberId FK
        int amount "hand-edited rounds on hand"
        string boxImageFilename "optional photo"
        string roundImageFilename "optional photo"
    }

    FactoryAmmoSession {
        string id PK
        string factoryAmmoId FK
        datetime date
        string location
        int roundsFired
        float velocityAvg
        float extremeSpread
        float stdDev
    }

    FactoryAmmoShot {
        string id PK
        string sessionId FK
        int shotIndex
        float velocity "m/s"
    }

    FactoryAmmoGroup {
        string id PK
        string sessionId FK
        float distanceM
        int shotCount
        float groupSizeMm
        float moa "server-computed"
    }

    Rifle {
        string id PK
        string name
        string caliberId FK
        float barrelLengthMm
        float twistIn "inches per revolution"
        float sightHeightCm
        float zeroDistanceM "metres"
        float clickCmAt100m "cm per click at 100 m"
    }
}
```

## Key flows

```mermaid
sequenceDiagram
    participant U as Client Form
    participant A as Server Action
    participant DB as Postgres
    participant FS as uploads/
    participant AI as AI Provider

    rect rgb(30,41,59)
    note over U,DB: LoadLog create — snapshot + transaction
    U->>A: FormData (recipe, qty)
    A->>DB: fetch recipe + components
    A->>DB: TX: insert denormalized snapshot<br/>+ deduct inventory (grain→gram)
    A-->>U: revalidate + toast
    end

    rect rgb(30,41,59)
    note over U,FS: RangeLog edit — photos
    U->>A: FormData (files + descriptions,<br/>existing markedForDelete)
    A->>FS: write UUID files / unlink deleted
    A->>DB: upsert RangeLog + images
    A-->>U: redirect to readonly detail
    end

    rect rgb(30,41,59)
    note over U,A: Chronograph CSV import (Xero C1)
    U->>U: select CSV → parseChronographCsv (client)
    U->>U: preview shots + auto-fill velocity fields
    U->>A: FormData (shots JSON + replaceShots)
    A->>A: shotsSchema.safeParse + recompute aggregates
    A->>DB: TX: upsert RangeLog + deleteMany/insertMany RangeLogShot
    A-->>U: revalidate + redirect to detail
    end

    rect rgb(30,41,59)
    note over U,AI: QuickLOAD import (.dat + screenshot)
    U->>U: select .dat → parseQuickLoadDat (client)
    U->>U: editable preview; match projectile/propellant<br/>by brand+type+weight+caliber else offer create
    U->>A: importRecipeFromQuickLoad (plain object)
    A->>DB: resolveCaliberId + create stub inventory rows (if requested)
    A->>DB: insert Recipe (no inventory adjustments)
    U->>A: screenshot → extractQuickLoadFromImage (FormData)
    A->>AI: visionCompletion (image in-memory, never stored)
    AI-->>A: JSON values (defensive parse)
    A-->>U: ParsedQuickLoad preview (nothing persisted until save)
    end

    rect rgb(30,41,59)
    note over U,DB: Ladder create — N recipes in one transaction
    U->>U: pick shared components + start/step/count<br/>(live preview via generateCharges, client)
    U->>A: FormData
    A->>A: createLadderSchema.safeParse + resolveCaliberId
    A->>DB: TX: insert Ladder + createMany N Recipes<br/>(ladderId + ladderChargeIndex, charge varies)
    A-->>U: redirect to /recipes/ladders/[id]
    end

    rect rgb(30,41,59)
    note over U,AI: Recipe AI safety check
    U->>A: runRecipeAiCheckOnInput / byId
    A->>DB: read AiSettings (singleton) + recipe
    A->>AI: chatCompletion (non-null fields only)
    AI-->>A: JSON verdict (defensive parse)
    A->>DB: persist aiVerdict/Summary/Concerns
    end

    rect rgb(30,41,59)
    note over U,FS: FactoryAmmo create — box + round photos
    U->>A: FormData (brand/model/caliber/amount + boxImage + roundImage)
    A->>A: createFactoryAmmoSchema.safeParse + resolveCaliberId
    A->>FS: write UUID files to uploads/factory-ammo/
    A->>DB: insert FactoryAmmo (filename columns only)
    A-->>U: redirect to /factory-ammo/[id]
    end

    rect rgb(30,41,59)
    note over U,DB: FactoryAmmoSession — chrono import + groups
    U->>U: select CSV → ChronographImport (namespace=factoryAmmo)
    U->>A: FormData (shots JSON + groups JSON + replaceShots/replaceGroups)
    A->>A: shotsSchema + groupsSchema.safeParse; recompute aggregates + MOA
    A->>DB: TX: upsert FactoryAmmoSession + deleteMany/insertMany shots + groups
     A-->>U: redirect to session detail
     end
```

## Production deployment

Dev (`docker-compose.yml`) stays on Docker Desktop. Production is a separate compose project (`reloading-prod` / `docker-compose.prod.yml`) on a dedicated Proxmox LXC.

```mermaid
flowchart LR
  subgraph internet [Internet]
    Browser
  end
  subgraph cf [Cloudflare]
    Edge["HTTPS edge"]
    Access["Zero Trust Access"]
    Tunnel["Tunnel"]
  end
  subgraph lxc ["Proxmox LXC (unprivileged, nesting=1)"]
    cloudflared
    app["app :3000  next start"]
    db["db  Postgres 16"]
    runner["github-runner"]
    uploads["volume: uploads"]
    pgdata["volume: postgres_data"]
  end
  GH["GitHub Actions\nubuntu-latest test"]

  Browser --> Edge --> Access --> Tunnel --> cloudflared --> app
  app --> db
  app --> uploads
  db --> pgdata
  GH -->|"main green"| runner
  runner -->|"docker.sock"| app
```

- `Dockerfile.prod` multi-stage: pnpm install → `prisma generate` → `next build` → runtime image. Entrypoint: `prisma migrate deploy` then `pnpm start`.
- Photos persist on the `uploads` named volume mounted at `/app/public/uploads`. Without it, range/factory-ammo images vanish on every container recreate.
- Deploy replaces **only** `reloading-app`. `db`, `cloudflared`, and `github-runner` stay up. `docker system prune -a -f` after each deploy to keep the LXC disk alive.
- No inbound ports on the LXC. TLS terminates at Cloudflare. Access is the login gate; the Next.js app has no authentication of its own.
