# Architecture — how the slice maps onto the proposal

This document connects what exists in the repository today to the full proposal
in [`PROPOSAL.md`](./PROPOSAL.md). Section numbers below refer to that document.

## Layering (proposal §2)

The app is designed around the recommended source hierarchy, with clean seams
so later phases slot in without rework:

1. **Bungie Manifest** — canonical identities → `entity`, `mechanic`,
   `socket_option`, `set_bonus`. *(Slice: hand-seeded; ingestion job is next.)*
2. **DIM open-source projects** — transformation/typing reference. *(Not a
   runtime dependency; `bungie-api-ts` types can be adopted at ingestion.)*
3. **Community research (Clarity, etc.)** — stored separately, labelled
   Community Insight → `mechanic.community_description`, `relation.evidence`,
   `source_attribution`.
4. **Curated relationship graph** — the proprietary asset → `relation` +
   `relation_condition` (JSONB `condition`).
5. **Bungie OAuth** — Phase 2, isolated behind a future adapter.
6. **DIM Sync** — Phase 3 metadata only.

## Data model (proposal §4–§5)

- `src/lib/types.ts` is the single source of truth for the vocabulary:
  `Predicate`, `Directness`, `Evidence`, `GameMode`, `RelationCondition`, and
  the entity/element enums. It also owns `classifySection()`, which maps a
  `(predicate, directness, entityType)` triple to an explorer column + section.
  Keeping classification here (not in SQL, not in the component) means the UI
  and the query layer agree by construction.
- `src/db/schema.ts` implements the section-5 tables in Drizzle. Variable,
  per-relationship qualifiers live in a JSONB `condition` column typed as
  `RelationCondition`; canonical identity lives in typed columns. This is the
  proposal's "normalized edge table with JSONB conditions" (§5) — a relational
  design chosen over a graph DB because the relationships are shallow and
  heavily filtered.
- A `relation` edge references either side as an `entity` or a `mechanic`
  (`subjectSide`/`objectSide`), so entity↔entity relationships (e.g. weapon →
  armor set bonus) are expressible without a schema change; the slice only
  exercises entity → mechanic.

## The Mechanic Explorer (proposal §8.4)

`getMechanicExplorer(slug)` (`src/lib/queries.ts`):

1. loads the mechanic,
2. joins every published `relation` pointing at it to its subject `entity` and
   optional `source_attribution`,
3. classifies each into a section via `classifySection()`,
4. ranks within a section by directness then evidence (proposal §11's ranking
   intent), and
5. drops empty sections so the UI stays honest about gaps.

`RelationCard` renders the directness badge, the trigger/requirement derived
from the structured `condition`, mode and evidence badges, the attribution, and
the readable relationship path (`Entity → trigger → Mechanic` or the reverse
for the benefit column).

### Worked example — the Riskrunner case (proposal §4)

Riskrunner is seeded as `ENABLES_PRODUCTION`, not `PRODUCES`, so it renders
under **Production enablers**, never under generators. Its explanation states it
only enables production when a separate generation rule (e.g. Spark of
Discharge) is also equipped. This is the concrete payoff of typed directness:
the app refuses to imply "Arc weapon = Ionic Trace source."

## Provenance & versioning (proposal §5.2, §3.7)

Every relationship carries an `evidence` level and an optional
`source_attribution`. The `entity_version` table (present, unused by the slice)
is where raw Manifest/provider snapshots and checksums will land so definition
changes can be audited. Seeded records are stamped with a `manifest_version`.

## Deliberate deferrals

| Proposal area | Status |
| --- | --- |
| Manifest ingestion pipeline (§6) | Schema ready; job not built |
| Weapon / family explorers (§8.2–8.3) | Not built |
| Build Workspace (§8.5) | Not built (Phase 2) |
| Bungie OAuth / owned-only (§3.2, Phase 2) | Not built |
| Full-text search (§13) | Not built; Postgres FTS planned |
| Editorial review console (§6) | Not built; `editorial_status` field exists |
| Entity detail drawer (§8.6) | Not built; cards are static for now |

## Verification notes

Because this environment's egress policy blocks the npm registry, dependencies
could not be installed here, so `next build` / `tsc` were not run in-session.
Two dependency-free checks were run and pass:

- **Section classification** — `classifySection()` executed against a table of
  representative `(predicate, directness, entityType)` inputs (Node 22
  `--experimental-strip-types`); all cases mapped to the expected sections.
- **Schema + explorer query** — the section-5 DDL and the exact explorer join +
  classification were run against a real local PostgreSQL 16 with the Ionic
  Trace seed, producing the correct two-column, multi-section, ranked result
  (Riskrunner under Production enablers).

Run `npm run typecheck` and `npm run dev` in an environment with npm access to
exercise the full app.
