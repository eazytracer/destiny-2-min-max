# Destiny 2 Build Synergy Explorer

A searchable map of Destiny 2 weapons, subclass abilities, permanent artifacts,
armor bonuses, and sandbox mechanics. Start with an **item** to discover
everything that enhances it, or start with a **mechanic** to see what generates
it and what benefits from it. Every recommendation explains its trigger,
restrictions, relationship type, and source.

> Fan-made buildcrafting tool. Not affiliated with or endorsed by Bungie. Item
> identities come from the Bungie Destiny Manifest; community-researched values
> are labelled separately.

---

## Current state — Phase 1 vertical slice

This repository is an early vertical slice, not the full product. What ships
here, end to end:

- **Next.js 15 (App Router) + TypeScript + PostgreSQL + Drizzle ORM.**
- The **typed-relationship data model** (proposal §4): predicates, directness,
  evidence levels, game modes, and structured conditions — the app's core
  proprietary asset.
- The core **section-5 database schema** (`entity`, `entity_alias`,
  `entity_version`, `mechanic`, `relation`, `set_bonus`, `socket_option`,
  `source_attribution`).
- A **curated Ionic Trace relationship graph** seeded by hand, with honest
  provenance and evidence labels — including the proposal's Riskrunner
  cautionary case (an *enabler*, never a direct generator).
- The signature **two-column Mechanic Explorer** (generate/apply ↔ spend/benefit)
  with per-relationship cards, directness/evidence badges, condition detail,
  and a readable relationship path.
- An **Explore** home page, a **Mechanics** index, and a **Data & Sources**
  page that surfaces attribution and versioning.

Everything runs from the curated seed — **no Bungie API key is required** for
the slice. Manifest ingestion, authenticated inventory, and the Build Workspace
are later phases (see `docs/PROPOSAL.md`).

### What is deliberately *not* here yet

- Live Bungie Manifest ingestion (§6). The schema and provenance tables are
  ready for it; the fetch/normalize job is Phase 1's next step.
- The Weapon / Weapon-family explorers (§8.2–8.3).
- Bungie OAuth, owned-only filters, the Build Workspace (Phase 2).
- Full-text search and the editorial review console.

---

## Getting started

Requirements: **Node 20+** and **PostgreSQL 14+**.

```bash
# 1. Install dependencies
npm install

# 2. Start a local Postgres (no Docker needed — uses your local pg binaries)
npm run pg:up            # creates ./.pgdata and a "synergy" database

# 3. Point the app at it
cp .env.example .env     # default DATABASE_URL already matches pg:up

# 4. Create the schema and load the curated seed
npm run db:push          # drizzle-kit push — creates tables from src/db/schema.ts
npm run db:seed          # loads the Ionic Trace graph

# 5. (Optional) Load real item icons from the Bungie Manifest
#    Get a free key at https://www.bungie.net/en/Application and put it in .env
#    (BUNGIE_API_KEY=...), then:
npm run ingest:icons     # fills real icons/watermarks for the catalogued items

# 6. Run it
npm run dev              # http://localhost:3000
```

Then open **http://localhost:3000/mechanics/ionic-trace** for the fully
populated explorer.

> **Icons.** Without `ingest:icons` the app shows emoji glyphs. After it runs,
> relationship cards show each item's real Bungie icon with its season/rarity
> watermark (DIM-style), hotlinked from the public `bungie.net` CDN. If you
> re-pull the schema, run `npm run db:push` again first — it adds the
> `icon_path` / `icon_watermark` columns.

> **Filters.** Every page has a persistent **class + subclass** filter bar. The
> selection lives in the URL (`?class=warlock&subclass=arc`), so any filtered
> view is a shareable link. Filters hide relationships restricted to a different
> class, and narrow to a subclass element (element-agnostic items like mods
> always stay visible).

> The local Postgres helper (`scripts/pg-dev.sh`) runs the server as your
> current user with a socket inside `./.pgdata`, so it needs no root and no
> `/var/run/postgresql`. Use `npm run pg:down` to stop it. If you already have
> a Postgres you'd rather use, just set `DATABASE_URL` and skip `pg:up`.

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push `src/db/schema.ts` to the database |
| `npm run db:generate` | Generate SQL migrations from the schema |
| `npm run db:seed` | Load the curated seed dataset |
| `npm run ingest:icons` | Fetch real item icons from the Manifest (needs `BUNGIE_API_KEY`) |
| `npm run pg:up` / `pg:down` | Start / stop the local dev Postgres cluster |

---

## Project layout

```
src/
  app/                      Next.js App Router
    page.tsx                Explore (home)
    mechanics/page.tsx      Mechanics index
    mechanics/[slug]/       Mechanic Explorer (the signature screen)
    data/page.tsx           Data & Sources
  components/               TopBar, RelationCard, EntityIcon, FilterBar
  db/
    schema.ts               Drizzle schema — proposal §5 tables
    index.ts                Postgres client
    seed.ts                 Seed runner (resolves slug refs -> ids)
  ingest/icons.ts           Targeted Manifest icon ingestion (Bungie CDN art)
  data/seed/dataset.ts      The curated Ionic Trace graph (hand-authored)
  lib/
    types.ts                Domain vocabulary + section classification (§4, §8.4)
    queries.ts              Data-access layer for the explorer
scripts/pg-dev.sh           Local Postgres helper
docs/PROPOSAL.md            Full research & scoping proposal
docs/ARCHITECTURE.md        How this slice maps onto the proposal
```

## The core idea: typed relationships

A keyword search over perk text produces misleading results. Instead every
synergy is stored as a typed edge with conditions and provenance:

```
subject  →  predicate  →  object          (directness, evidence, mode, condition)

Spark of Discharge  →  PRODUCES  →  Ionic Trace
  directness: conditional · evidence: community_tested
  condition: { requiredElement: arc, finalBlow: true, notes: "chance-based…" }
```

The Mechanic Explorer fans these edges into two columns and sub-sections purely
from `(predicate, directness, entityType)` via `classifySection()` in
`src/lib/types.ts` — one source of truth shared by UI and queries.

See `docs/ARCHITECTURE.md` for how the slice maps onto the full proposal, and
`docs/PROPOSAL.md` for the complete product vision.
