# Destiny 2 Build Synergy Explorer

## Research, Data Architecture, and UI Scoping Proposal

> This is the founding product proposal. The repository currently implements an
> early Phase 1 vertical slice of it — see [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> for what maps to what.

### 1. Product vision

Create a web application that lets players explore Destiny 2 build interactions
from either direction:

1. **Start with an item**
   * Select a specific weapon, weapon family, archetype, exotic, subclass, or
     armor set.
   * See every artifact perk, fragment, aspect, exotic armor piece, armor set
     bonus, catalyst, origin trait, and other mechanic that can enhance it.

2. **Start with a mechanic**
   * Select Ionic Traces, Armor Charge, Stasis Crystals, Scorch, Jolt, Orbs of
     Power, Firesprites, Void Breaches, Tangles, or another resource, buff,
     debuff, or construct.
   * See a two-sided view:
     * Everything that can **generate, apply, or enable** the mechanic.
     * Everything that can **consume, extend, convert, or benefit from** it.

The application's core value is not simply listing perk descriptions. It should
explain the relationship:

> **Source → condition → mechanic → payoff**

For example:

> Arc ability final blow → creates Ionic Trace → grants ability energy →
> supports ability-looping effects.

This is especially valuable in the current version of Destiny 2, where permanent
artifacts, large fragment selections, Armor 3.0 set bonuses, catalysts, subclass
verbs, and weapon interactions create far more combinations than a player can
reasonably remember. Bungie's final live-service content update, Monument of
Triumph, launched June 9, 2026 and included significant artifact, armor,
catalyst, and buildcrafting changes. Bungie subsequently issued balance and
bug-fix updates, so the application should still treat game data as versioned
rather than permanently frozen.

---

## 2. Important architectural finding: DIM is not the canonical content API

The application should not be designed around a presumed "DIM database API."

DIM itself primarily consumes Bungie's services and supplements them with
open-source transformation projects and community-maintained data. The DIM Sync
service only stores DIM-specific user information such as tags and notes, saved
DIM loadouts, tracked triumphs, saved searches, and hashtags/preferences.

DIM Sync does not provide the authoritative weapon, perk, subclass, artifact, or
inventory catalog. It also cannot directly retrieve a player's inventory, move
items, or apply a DIM loadout by itself.

The recommended architecture is:

1. **Bungie Manifest:** canonical identities, definitions, icons, hashes,
   sockets, plugs, perks, artifacts, and sets.
2. **DIM open-source projects:** transformation logic, TypeScript bindings, and
   supplemental metadata.
3. **Community research:** hidden values, cooldowns, interaction details, and
   clearer descriptions.
4. **Curated relationship graph:** the application's proprietary interpretation
   of how those entities interact.
5. **Optional Bungie OAuth:** player inventory, ownership, equipped subclass,
   and personalized filtering.
6. **Optional DIM Sync integration:** saved annotations or loadout metadata, not
   core game definitions.

---

## 3. Recommended information sources

### 3.1 Bungie Destiny Manifest — primary canonical source

Workflow: call `GetDestinyManifest`, detect the current version, download the
localized SQLite/JSON definitions, and resolve hashes from profile/inventory
responses against those definitions.

Relevant definition types include `DestinyInventoryItemDefinition`,
`DestinySandboxPerkDefinition`, `DestinyArtifactDefinition`,
`DestinyPlugSetDefinition`, `DestinyTalentGridDefinition`,
`DestinyEquipableItemSetDefinition`, `DestinyItemSetPerkDefinition`,
`DestinyItemCategoryDefinition`, and `DestinyBreakerTypeDefinition`.

Inventory item definitions represent far more than conventional inventory
objects: subclass nodes, abilities, plugs, perks, fragments, aspects, mods,
catalysts, and many other concepts are represented through interconnected item
and socket definitions. Artifact information is represented through artifact
definitions, inventory items, plugs, and live character artifact state. The
permanent Artifact 2.0 system uses multiple perk buckets and supports saved
loadout configurations, while seven previous artifacts were reworked to coexist
within the permanent buildcrafting system.

**Best uses:** names/descriptions, icons, hashes, categories and weapon
families, damage types, class restrictions, sockets/plugs, perk and catalyst
associations, artifact structure, subclass nodes, armor sets and set-perk
thresholds, localization, and retired/collectible status.

**Limitations:** Manifest descriptions often omit exact percentages, cooldowns,
internal timers, stack behavior, whether effects stack, PvE vs PvP differences,
indirect relationships, and complex conditional interactions. The Manifest
should provide canonical identities, not the entire relationship model.

### 3.2 Bungie authenticated APIs — optional personalization

Bungie OAuth and profile APIs can add the player's characters, owned/equipped
items, subclasses, item instances and rolls, and inventory/vault contents. A
registered application and API key are required; private data requires OAuth.
Isolate integrations behind an adapter layer. Authentication is not necessary
for the first public MVP but enables filters such as "show only items I own,"
"recommendations for my current character," "hide options unavailable to my
class," and "use the roll I actually own."

### 3.3 DIM open-source projects

**`bungie-api-ts`** — generated TypeScript types and wrappers around Bungie's
API (MIT). Use for client types, endpoint wrappers, Manifest typing, and
type-safe profile integration.

**`d2-additional-info`** — processes the Manifest and generates supplemental
metadata (catalysts, season/source info, breaker workarounds, special
classifications; MIT). Study its extraction/normalization logic, consume
compatible generated datasets where appropriate, and reuse concepts for a custom
build pipeline — without tying the app to DIM's internal frontend data model.

### 3.4 Clarity — detailed community research

Clarity maintains community-researched descriptions for weapon perks, exotic
armor, mods, fragments, aspects/class abilities, hidden numerical behavior, and
cooldowns/activation conditions. Its policy requires appropriate attribution,
visible differentiation between official and community information, current
data, and a feedback path; projects expecting more than ~150 users should
establish a partnership. Recommended: contact Clarity early, store Clarity text
separately, label it **Community Insight**, keep source version + retrieval
date, and provide an issue-reporting link on every enriched record.

### 3.5 Character Stats database

Versioned information about stat effects and ability cooldowns, already consumed
by DIM and D2ArmorPicker. Useful for cooldown displays, stat-tier effects, build
calculations, and ability-loop estimates — more important in a later
build-planning phase than the initial explorer.

### 3.6 Destiny Data Compendium and Destiny Science

Extensive community-maintained details about abilities, fragments, perks, mods,
and subclass behavior; a directory of community testing/data resources. Use for
relationship discovery, manual verification, gap analysis, and QA — initially as
research/verification sources rather than auto-imported canonical databases.
Sites such as light.gg can help manual comparison but should not become
production dependencies without explicit permission and a documented method.

### 3.7 Official patch notes

Store patch notes as provenance records to identify description changes,
reworked perks, catalyst additions, fragment behavior changes, removed
restrictions, PvE/PvP splits, and corrected interactions. Even with live-service
development ended, a June 23, 2026 hotfix corrected artifact and perk problems
after Monument of Triumph.

---

## 4. The core data concept: typed relationships

A simple keyword search produces misleading results. Every synergy should be
stored as a typed relationship with conditions and provenance.

**Example.** Subject: Spark of Discharge · Relationship: `PRODUCES` · Object:
Ionic Trace · Condition: Arc weapon final blows have a chance to generate the
trace · Directness: Conditional · Source: Bungie definition plus community
research · Mode: PvE and PvP, with mode-specific behavior where applicable.

This lets the UI explain that Arc weapons do not inherently create Ionic Traces;
this fragment allows Arc weapon final blows to become a conditional source. That
distinction also addresses Riskrunner: its catalyst adds Chain Reaction, and it
can serve as an Arc-weapon condition enabler, but it should not be classified as
a direct Ionic Trace generator unless another equipped effect supplies that
generation rule.

**Recommended predicates:** `PRODUCES`, `ENABLES_PRODUCTION`, `APPLIES`,
`CONSUMES`, `BENEFITS_FROM`, `ENHANCES`, `EXTENDS`, `CONVERTS_TO`, `REQUIRES`,
`COUNTERS`, `INCOMPATIBLE_WITH`, `TRIGGERS`, `REFUNDS`, `REDUCES_COST`,
`INCREASES_UPTIME`.

**Directness:** Direct, Conditional, Indirect, Inferred.

**Evidence:** Official, Community tested, Derived from official definitions,
Editorial interpretation, Unverified candidate. The UI should never present all
five as equally certain.

---

## 5. Recommended database design

A relational PostgreSQL database is sufficient for the first several versions.
The relationships are graph-like but shallow and heavily filtered; a normalized
edge table with JSONB conditions is easier to operate than Neo4j.

### 5.1 Main entity types

**Equipment:** Weapon, Weapon family, Weapon archetype/frame, Weapon perk,
Enhanced perk, Origin trait, Catalyst, Exotic armor, Legendary armor piece,
Armor set, Armor set bonus, Armor mod.

**Build configuration:** Artifact, Artifact perk, Subclass, Super, Aspect,
Fragment, Grenade, Melee, Class ability.

**Mechanics:** Resource, Pickup, Buff, Debuff, Elemental construct, Damage
keyword, Defensive keyword, Champion interaction, Armor Charge effect. Examples:
Ionic Trace, Firesprite, Void Breach, Stasis Shard, Stasis Crystal, Tangle,
Threadling, Orb of Power, Armor Charge, Amplified, Radiant, Restoration, Devour,
Overshield, Scorch, Ignite, Jolt, Blind, Volatile, Weaken, Suppression, Slow,
Freeze, Shatter, Suspend, Sever, Unravel.

### 5.2 Suggested tables

- **`entity`** — normalized identity: internal ID, Bungie hash, entity type,
  name, official description, icon, class restriction, damage element, rarity,
  item type/subtype, weapon family, current/retired status, locale, manifest
  version.
- **`entity_alias`** — groups hashes/historical forms for one player-facing
  concept (reissues, adept/enhanced variants, multiple fragment hashes,
  historical artifact forms, localized aliases).
- **`entity_version`** — source snapshots for audit: entity ID, provider, source
  version, valid-from/valid-to, raw source JSON, checksum, retrieval time.
- **`mechanic`** — slug, name, category, element, baseline effect, official
  description, community description, icon, stack behavior, default duration.
- **`relation`** — edge between two entities or entity↔mechanic: subject,
  predicate, object, directness, evidence, PvE/PvP applicability, explanation,
  editorial status, source attribution.
- **`relation_condition`** — qualifiers: required element/weapon family/class or
  subclass/buff, trigger type, final-blow, precision, target-debuff, cooldown,
  duration, stack cap, chance-based activation, activity restriction, free-form
  structured qualifiers.
- **`set_bonus`** — armor set, required piece count, associated perk, 2-pc/4-pc
  threshold, class restrictions.
- **`socket_option`** — parent entity, socket index, plug entity, default
  selection, selectability, plug-set source.
- **`source_attribution`** — provider, source type, version, evidence level,
  retrieved date, applicable patch, internal source locator, license/attribution
  requirement.
- **Optional user tables:** `user_inventory_item`, `user_character`,
  `user_favorite`, `user_hidden_entity`, `user_build_draft`, `user_saved_query`,
  `user_owned_filter`.

---

## 6. Data ingestion and maintenance pipeline

**Automated:** poll `GetDestinyManifest`; compare versions; download English
SQLite Manifest; extract relevant tables; normalize hashes into entities;
resolve sockets/plugs/perks/artifacts/talent grids/item sets; run supplemental
transformations inspired by `d2-additional-info`; merge approved Clarity data by
hash; reapply curated relationships; flag relationships whose source
descriptions changed; rebuild search indexes and materialized views; publish a
versioned dataset.

**Editorial:** some relationships can be inferred from text ("Creates an Ionic
Trace", "While you have Armor Charge", "Consumes all stacks", "Defeating a
Scorched target", "Stasis weapon final blows", "Picking up an Orb of Power"), but
automated text processing should only create **review candidates**, never
auto-publish. A lightweight admin review screen shows previous vs new
description, suggested relationship, source, confidence, and approve/edit/reject/
merge actions — avoiding false positives such as treating a condition-enabler as
a direct generator.

---

## 7. Proposed information architecture

Primary navigation: **Explore**, **Mechanics**, **Build Workspace**,
**My Guardian**, **Data & Sources**. "My Guardian" stays hidden/secondary until
authenticated inventory features exist.

---

## 8. Screen proposals

### 8.1 Home / Explore

Headline: **What do you want to build around?** Two entry cards ("Build around
an item" / "Build around a mechanic"), quick-access mechanic chips (Ionic
Traces, Armor Charge, Orbs of Power, Scorch, Jolt, Stasis Crystals, Tangles,
Volatile, Radiant, Devour), and a global search supporting natural phrases
("Auto Rifle damage", "Make Ionic Traces", "Use Armor Charge", "Solar reload",
"Stasis crystal weapons", "Fragments for bows", "Two-piece armor bonuses",
"Effects triggered by Jolt"). Results grouped by entity type.

### 8.2 Weapon Explorer

Selection header (icon/name, family/frame, element, intrinsic Champion
capability, equipped/selectable perks, catalyst, ownership when authenticated;
anti-Champion capabilities modeled as enduring frame relationships).
Recommendation groups: artifact perks; fragments/aspects; exotic armor; armor
set bonuses; catalysts; weapon perks/origin traits; armor mods; mechanics
generated by the weapon; mechanics that enhance the weapon. Each recommendation
card: icon/name, category, one-sentence relationship explanation, Direct/
Conditional/Indirect badge, trigger/requirement, class/element restrictions,
PvE/PvP, source confidence, add-to-workspace. The card explains *why* it appeared
for the selected weapon.

### 8.3 Weapon-family Explorer

Shows relationships applying to a whole family, a particular element/frame,
exotics only, or matching-perk/named weapons. Filters: element, class, PvE/PvP,
directness, owned items, artifact, exotic vs legendary, current vs historical.

### 8.4 Mechanic Explorer (signature screen)

Header: name/icon, category, element, baseline behavior, stack/duration,
official and community descriptions. Two-column layout — **Left: Generate or
apply** (direct generators, conditional generators, production enablers, weapons
that satisfy conditions, conversion sources); **Right: Spend or benefit** (direct
consumers, effects activated by pickup, effects enhanced, duration extenders,
ability-loop payoffs, conversion destinations). Optional middle connector shows
the relationship centrally. Every result exposes a readable path, e.g.
`Weapon → Arc final blow → Spark of Discharge → Ionic Trace → ability energy`.

### 8.5 Build Workspace

A lightweight composition/validation tool (not a DIM replacement): build slots,
a live summary of what the build **generates** and **consumes/benefits from**,
**missing requirements**, and **conflicts/redundancies** — emphasizing
explanations over a single opaque score.

### 8.6 Entity detail drawer

Clicking a card opens a drawer with tabs: Overview, Community Insight,
Relationships, and History & sources.

---

## 9. Visual and interaction guidance

Reference Destiny's visual vocabulary (sharp geometry, dark surfaces, luminous
elemental accents, icon-forward) without cloning the game. Semantic treatment
for Arc/Solar/Void/Stasis/Strand/Kinetic/Prismatic, but color is never the only
identifier — include icons and text labels. Relationship badges: Direct,
Conditional, Indirect, Consumes, Requires, Conflicts, Community tested. Desktop:
three panes (filters, main list/two-column view, detail drawer). Mobile: stacked
tabs (Sources, Benefits, Relationship path, Details) with a persistent selection
header. Shareable state: stable URLs containing selected entity, filters, class,
subclass, activity mode, and owned-only status.

---

## 10. MVP scope

**Phase 1 — Public relationship explorer (no auth):** Manifest ingestion;
normalized weapons/artifacts/fragments/aspects/exotics/perks/armor sets; Clarity
partnership and enrichment; ~25–40 major mechanics; weapon and family search;
mechanic two-column explorer; direct/conditional/indirect classifications; source
attribution; shareable URLs; basic editorial review tool.

**Phase 2 — Build workspace and player ownership:** Bungie sign-in; inventory
import; owned-only filters; current-roll inspection; build workspace;
missing-requirement detection; saved builds; class filtering; stat/cooldown
integration.

**Phase 3 — Advanced interoperability:** optional DIM Sync metadata; imported
loadout references; build comparison; patch-history diffs; community
corrections; moderation queue; multilingual Manifest; advanced stacking/cooldown
calculations.

---

## 11. Main product risks

- **Incomplete semantic data** → combine canonical definitions, Clarity
  enrichment, structured editorial relationships, and visible evidence labels.
- **False relationships** → require typed directness and human approval before
  publication.
- **Duplicate/historical hashes** → canonical entities with aliases and
  versioned Manifest records.
- **Data changes after the final update** → keep polling the Manifest and track
  patch-level provenance.
- **Licensing/attribution** → secure Clarity partnership, preserve attribution,
  separate official and community text, document imported datasets.
- **Too many weak recommendations** → rank by directness, constraint match,
  class, equipped subclass, ownership, current artifact selection, and evidence
  quality; default to clear, actionable relationships.

---

## 12. Recommended product statement

> Destiny 2 Build Synergy Explorer is a searchable map of weapons, subclass
> abilities, permanent artifacts, armor bonuses, and sandbox mechanics. Players
> can start with an item to discover everything that enhances it, or start with a
> mechanic to see what generates it and what benefits from it. Every
> recommendation explains its trigger, restrictions, relationship type, and
> source.

---

## 13. Recommended technical direction

- **Frontend:** React or Next.js with a component library suited to dense search.
- **Backend:** TypeScript or Python API service.
- **Database:** PostgreSQL with JSONB for variable conditions.
- **Search:** PostgreSQL full-text search initially; a dedicated search service
  only when scale requires it.
- **Jobs:** scheduled Manifest and community-data ingestion.
- **Caching:** materialized relationship views and CDN-cached public queries.
- **Authentication:** Bungie OAuth in Phase 2.
- **Administration:** a small editorial console for reviewing inferred
  relationships and source changes.

The most important proprietary asset is not the copied item catalog — it is the
curated, versioned set of typed relationships connecting items, conditions,
mechanics, and outcomes.
