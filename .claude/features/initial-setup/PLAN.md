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
- `src/ingest/manifest.ts` + `src/ingest/run.ts` — Manifest ingestion pipeline
  (generalized from the old icon-only script). Pure, unit-tested helpers
  (`indexDefs`, `matchEntity`, `normalizeEntity`, field extractors, `needsIngest`)
  plus a thin DB runner. Downloads `DestinyInventoryItemDefinition`, matches
  catalogued entities by hash/name, and enriches them with real icon/watermark
  art plus backfilled element/rarity/item-type (never overwriting hand-authored
  values). Records an `entity_version` snapshot + checksum per entity and skips
  unchanged Manifest versions (`-- --force` overrides). Run with
  `npm run ingest:manifest` (needs free `BUNGIE_API_KEY`).

### UI (proposal §8, §9)
- Explore home, Mechanics index, the signature **two-column Mechanic Explorer**
  (generate/apply ↔ spend/benefit) with empty/filtered states; Data & Sources.
- **Condensed, DIM-like overview:** each explorer section is a grid of item
  icons (`RelationChip`) carrying a directness corner-dot; hover/focus opens a
  popover with the full detailed `RelationCard` (explanation, relationship path,
  condition, directness/evidence/source). The popover anchors toward the centre
  gutter so it never clips off-screen. Clicking an icon opens the item dossier.
- **Item dossier page** (`/items/[slug]`): art, description, element/rarity/type,
  and every relationship the item participates in, oriented toward the mechanic
  (`ItemRelationRow`) and ranked most-certain-first.
- `EntityIcon` (real bungie.net art + watermark, emoji fallback), `FilterBar`
  (persistent class/subclass, URL state), `RelationCard`, `TopBar`. Condition
  formatting shared via `src/lib/relation-format.ts`.
- Destiny-flavored dark theme with per-element accents.

### Tooling & docs
- `scripts/pg-dev.sh` (rootless local Postgres, auto-detects the PG version),
  `.env.example`, README, `docs/ARCHITECTURE.md`, `docs/PROPOSAL.md`.
- **Vitest** unit tests (`npm run test`) — ingestion helpers and relation
  formatters; specs live beside source as `*.test.ts`.
- **Devcontainer** (`.devcontainer/`): `setup.sh` is the single build entrypoint
  (Claude Code, gh, PostgreSQL, Node deps, and `agent-browser` with an ARM64
  Chromium via Playwright + a registered MCP server for in-container browser
  access — `postCreateCommand` runs it).

### Verification status (honest)
Now developed in an Ubuntu devcontainer (`.devcontainer/`) with local
PostgreSQL 18. Verified this session: `npm run typecheck` passes; `npm run test`
green (31 tests); the live Manifest ingestion ran against `bungie.net` and
enriched all 7 resolvable catalogued entities with real art + `entity_version`
provenance (version-skip and `--force` idempotency confirmed); and the explorer,
hover popovers, and item dossier pages were driven and screenshotted in a real
browser via `agent-browser` — which surfaced (and led to fixing) a popover
edge-clip bug.

---

## 4. Known gaps / risks to watch
- **Ingestion is enrichment-only so far** — it enriches the *curated* catalog by
  hash/name; full-catalog normalization (all items → `entity`, and SandboxPerk /
  PlugSet / Artifact / ItemSet → `socket_option` / `set_bonus`) is still pending
  (§6). Watermark field location can vary across Manifest versions; pin exact
  hashes in `dataset.ts` on any "not matched" items.
- **Schema drift after a pull** — `drizzle-kit push` can fail on incremental
  primary-key diffs; for the dev DB, `DROP SCHEMA public CASCADE; CREATE SCHEMA
  public;` then `db:push` + `db:seed` (data is reproducible from the seed).
- **Single mechanic populated** — only Ionic Trace has a full graph; other
  mechanics are header-only until curated.
- **Relationship accuracy** — post-Monument-of-Triumph values are labelled
  conservatively (`community_tested` / `editorial`); revisit against Clarity.

---

## 5. Planned next steps

### Near-term (next few sessions)
1. ✅ **Local compile + run gate** — done; typecheck + tests are green in the
   devcontainer and the app renders real icons and filters.
2. **Full Manifest ingestion (§6)** — *foundation done* (`ingest/manifest.ts` +
   `run.ts`: version-aware download, hash/name matching, catalog enrichment,
   `entity_version` provenance). *Remaining:* normalize the **whole**
   `DestinyInventoryItemDefinition` (+ SandboxPerk, PlugSet, Artifact, ItemSet)
   into `entity` / `socket_option` / `set_bonus`, and reconcile curated
   `relation` rows onto ingested entities by hash.
3. **Expand the mechanic ontology** — curate graphs for Jolt, Armor Charge, Orbs
   of Power, Scorch, Stasis Crystals (target ~25–40 mechanics per §10). Gives the
   class/subclass filters more to work with.
4. ✅ **Item dossier page** — shipped as a page (`/items/[slug]`) rather than a
   drawer. A richer §8.6 drawer with Overview / Community Insight / Relationships
   / History tabs could layer on later if needed.

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
The compile gate, ingestion foundation, condensed explorer, and item dossier are
now shipped. Pick one to start the next session:
- **(A)** Full-catalog Manifest ingestion — extend the pipeline from
  enrichment-only to normalizing the whole item table (+ sockets/sets) into
  `entity` / `socket_option` / `set_bonus`. Unlocks the weapon explorers.
- **(B)** Expand the mechanic graph (Jolt / Armor Charge / Orbs of Power) so the
  condensed explorer and filters have real depth across more mechanics.

Recommended: **(B)** for immediate, visible payoff now that the explorer is more
scannable — then **(A)** as the foundation the weapon explorer + search depend on.
