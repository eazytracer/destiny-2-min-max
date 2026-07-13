# Initial Setup — Plan & Roadmap

Destiny 2 Build Synergy Explorer. This document captures what has been built,
the decisions behind it, and the planned next steps. It is the working plan for
the `initial-setup` feature; the full product vision lives in
[`docs/PROPOSAL.md`](../../../docs/PROPOSAL.md) and the design-to-code mapping in
[`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md).

---

## 1. Product in one line

A searchable map of Destiny 2 weapons, subclass abilities, permanent artifacts,
armor bonuses, and sandbox mechanics. Start with an **item** to discover
everything that enhances it, or start with a **mechanic** to see what generates
it and what benefits from it. Every recommendation explains its **trigger,
restrictions, relationship type, and source** — the proprietary asset is the
curated, versioned graph of *typed relationships*, not a copied item catalog.

---

## 2. Decisions made so far

| Decision | Choice | Rationale |
| --- | --- | --- |
| First milestone | Full-stack vertical slice: Mechanic Explorer for Ionic Traces | Proves the end-to-end value (source → condition → mechanic → payoff) fastest |
| Stack | Next.js 15 (App Router) + TypeScript + PostgreSQL + Drizzle ORM | Single-language, matches proposal §13; JSONB for variable conditions |
| Data model | Normalized edge table (`relation`) with JSONB `condition` | Relationships are shallow + heavily filtered → relational beats a graph DB (§5) |
| Icons | Targeted Manifest ingestion (our catalog only, by hash/name) | Real DIM-style art without importing the whole Manifest yet |
| Navigation | Persistent class + subclass filters (URL-carried), no stepper | Shareable filtered views (§9); simpler than a guided wizard |
| Auth | Deferred to Phase 2 | MVP is a public explorer; no login needed |

---

## 3. What is built and shipped (branch `claude/destiny-build-synergy-explorer-rssece`)

### Data model & domain vocabulary
- `src/lib/types.ts` — predicates, directness, evidence, game mode, structured
  `RelationCondition`; `classifySection()` (single source of truth mapping
  `(predicate, directness, entityType)` → explorer column + section); `Filters`,
  `parseFilters`, `filtersToQuery`, class/subclass constants.
- `src/db/schema.ts` — proposal §5 tables in Drizzle: `entity` (incl.
  `icon_path`, `icon_watermark`), `entity_alias`, `entity_version`, `mechanic`,
  `relation`, `relation_condition` (as JSONB on `relation`), `set_bonus`,
  `socket_option`, `source_attribution`.

### Curated content
- `src/data/seed/dataset.ts` — hand-authored **Ionic Trace** relationship graph
  with honest evidence labels and provenance. Encodes the **Riskrunner
  cautionary case** as `ENABLES_PRODUCTION` (an enabler, never a direct
  generator) — the concrete demonstration of typed directness.
- `src/db/seed.ts` — idempotent seed runner (slug refs → ids).

### Ingestion
- `src/ingest/icons.ts` — targeted icon ingestion: downloads only
  `DestinyInventoryItemDefinition`, indexes by hash/name, fills real
  icon/watermark paths for catalogued items. Needs free `BUNGIE_API_KEY`.

### UI (proposal §8, §9)
- Explore home, Mechanics index, the signature **two-column Mechanic Explorer**
  (generate/apply ↔ spend/benefit) with directness/evidence badges, condition
  detail, relationship path, and empty/filtered states; Data & Sources page.
- `EntityIcon` (real bungie.net art + watermark, emoji fallback), `FilterBar`
  (persistent class/subclass, URL state), `RelationCard`, `TopBar`.
- Destiny-flavored dark theme with per-element accents.

### Tooling & docs
- `scripts/pg-dev.sh` (rootless local Postgres, no Docker), `.env.example`,
  README, `docs/ARCHITECTURE.md`, `docs/PROPOSAL.md`.

### Verification status (honest)
Because the cloud sandbox blocks the npm registry and `bungie.net`, `next build`
/ `tsc` and the live Manifest fetch **could not be run here**. Verified
dependency-free and passing: `classifySection()` and filter parse/serialize over
representative cases (Node strip-types); the §5 DDL + the exact explorer
join/classification query against local PostgreSQL 16 (Riskrunner correctly under
Production enablers). React rendering and `ingest:icons` are exercised on a local
`npm run dev` — treat the first local `npm run typecheck` as the final gate.

---

## 4. Known gaps / risks to watch
- **Icon ingestion unrun here** — Manifest watermark field location varies across
  versions; verify `ingest:icons` output locally and pin exact hashes on any
  "not matched" items.
- **No compile gate in-session** — run `npm run typecheck` locally after pulling.
- **Single mechanic populated** — only Ionic Trace has a full graph; other
  mechanics are header-only until curated.
- **Relationship accuracy** — post-Monument-of-Triumph values are labelled
  conservatively (`community_tested` / `editorial`); revisit against Clarity.

---

## 5. Planned next steps

### Near-term (next few sessions)
1. **Local compile + run gate** — `npm run typecheck`, fix anything the compiler
   surfaces, confirm `dev` renders icons and filters. *(Blocking any further UI.)*
2. **Full Manifest ingestion (§6)** — generalize `ingest/icons.ts` into a real
   pipeline: poll `GetDestinyManifest`, diff versions, download + normalize
   `DestinyInventoryItemDefinition` (+ SandboxPerk, PlugSet, Artifact, ItemSet)
   into `entity` / `socket_option` / `set_bonus`, stamping `entity_version`.
   Reconcile the curated `relation` rows onto ingested entities by hash.
3. **Expand the mechanic ontology** — curate graphs for Jolt, Armor Charge, Orbs
   of Power, Scorch, Stasis Crystals (target ~25–40 mechanics per §10). Gives the
   class/subclass filters more to work with.
4. **Entity detail drawer (§8.6)** — click a card → drawer with Overview /
   Community Insight / Relationships / History & sources tabs.

### Mid-term (Phase 1 completion, §10)
5. **Weapon & Weapon-family explorers (§8.2–8.3)** — the "start with an item"
   direction, reusing the relation graph and filters.
6. **Global search (§8.1)** — Postgres full-text over entities + mechanics,
   natural phrases ("Make Ionic Traces", "Arc Auto Rifle damage"), grouped by
   entity type.
7. **Clarity enrichment (§3.4)** — establish attribution/partnership, merge
   Community Insight by hash, label distinctly, store version + retrieval date.
8. **Editorial review console (§6)** — inferred relationships become *candidates*
   (`editorial_status`) with approve/edit/reject/merge; never auto-publish.
9. **Materialized relationship views + caching (§13)** for public query speed.

### Phase 2 — player ownership (auth)
10. **Bungie OAuth** behind an adapter (`BUNGIE_CLIENT_ID` / secret / auth URL).
    Character + inventory import; "owned-only" filters; current-roll inspection.
11. **Build Workspace (§8.5)** — slots, live generates/consumes summary,
    missing-requirement and conflict detection, saved builds.
12. **Stat & cooldown integration (§3.5)** — Character Stats data for ability-loop
    estimates.

### Phase 3 — interoperability
13. DIM Sync metadata, imported loadout references, build comparison, patch-history
    diffs, community corrections + moderation queue, multilingual Manifest.

---

## 6. Immediate next action
Pick one to start the next session:
- **(A)** Full Manifest ingestion (unlocks all icons + the item explorers), or
- **(B)** Expand the mechanic graph (Jolt / Armor Charge) so filters + explorer
  have more depth, or
- **(C)** Entity detail drawer for richer per-item context.

Recommended: **(A)** — it is the highest-leverage foundation and everything
downstream (weapon explorer, search, ownership) depends on real ingested
entities.
