/**
 * PostgreSQL schema for the Build Synergy Explorer (proposal §5).
 *
 * The relationships are graph-like but shallow and heavily filtered, so a
 * normalized edge table (`relation`) with JSONB conditions is used rather than
 * introducing a graph database. Variable, per-relationship qualifiers live in
 * JSONB; canonical identities live in typed columns.
 */
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  EntityType,
  Element,
  GuardianClass,
  Predicate,
  Directness,
  Evidence,
  GameMode,
  EditorialStatus,
  RelationSide,
  RelationCondition,
} from "@/lib/types";

/**
 * `entity` — the normalized identity shared by every searchable object
 * (weapons, perks, fragments, aspects, artifacts, armor sets, mods, …).
 */
export const entity = pgTable(
  "entity",
  {
    id: serial("id").primaryKey(),
    /** Bungie manifest hash (nullable for editorial-only concepts). */
    hash: bigint("hash", { mode: "number" }),
    entityType: text("entity_type").$type<EntityType>().notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Official Bungie description text (kept separate from community text). */
    officialDescription: text("official_description"),
    icon: text("icon"),
    classRestriction: text("class_restriction").$type<GuardianClass>().default("any"),
    damageElement: text("damage_element").$type<Element>().default("none"),
    rarity: text("rarity"),
    itemType: text("item_type"),
    itemSubtype: text("item_subtype"),
    weaponFamily: text("weapon_family"),
    /** "current" | "retired" — whether the entity is presently obtainable. */
    status: text("status").default("current"),
    locale: text("locale").default("en"),
    manifestVersion: text("manifest_version"),
  },
  (t) => ({
    slugIdx: uniqueIndex("entity_slug_idx").on(t.slug),
    typeIdx: index("entity_type_idx").on(t.entityType),
    hashIdx: index("entity_hash_idx").on(t.hash),
  }),
);

/**
 * `entity_alias` — groups multiple hashes or historical forms that represent
 * the same player-facing concept (reissued weapons, adept/enhanced variants,
 * historical artifact forms, localized search aliases).
 */
export const entityAlias = pgTable(
  "entity_alias",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    aliasHash: bigint("alias_hash", { mode: "number" }),
    reason: text("reason"),
  },
  (t) => ({
    entityIdx: index("entity_alias_entity_idx").on(t.entityId),
  }),
);

/**
 * `entity_version` — source snapshots so definition changes can be audited
 * (proposal §5.2). Raw provider JSON is retained with a checksum.
 */
export const entityVersion = pgTable(
  "entity_version",
  {
    id: serial("id").primaryKey(),
    entityId: integer("entity_id")
      .notNull()
      .references(() => entity.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    sourceVersion: text("source_version"),
    validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    raw: jsonb("raw"),
    checksum: text("checksum"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    entityIdx: index("entity_version_entity_idx").on(t.entityId),
  }),
);

/**
 * `mechanic` — the resources, pickups, buffs, debuffs, and constructs that
 * appear in the Mechanic Explorer (Ionic Trace, Armor Charge, Scorch, …).
 */
export const mechanic = pgTable(
  "mechanic",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** resource | pickup | buff | debuff | construct | keyword | champion */
    category: text("category").notNull(),
    element: text("element").$type<Element>().default("none"),
    baselineEffect: text("baseline_effect"),
    officialDescription: text("official_description"),
    communityDescription: text("community_description"),
    icon: text("icon"),
    stackBehavior: text("stack_behavior"),
    defaultDurationSeconds: integer("default_duration_seconds"),
  },
  (t) => ({
    slugIdx: uniqueIndex("mechanic_slug_idx").on(t.slug),
  }),
);

/**
 * `relation` — the edge between two entities, or between an entity and a
 * mechanic. Direction reads subject → predicate → object.
 */
export const relation = pgTable(
  "relation",
  {
    id: serial("id").primaryKey(),
    subjectSide: text("subject_side").$type<RelationSide>().notNull(),
    subjectId: integer("subject_id").notNull(),
    predicate: text("predicate").$type<Predicate>().notNull(),
    objectSide: text("object_side").$type<RelationSide>().notNull(),
    objectId: integer("object_id").notNull(),
    directness: text("directness").$type<Directness>().notNull(),
    evidence: text("evidence").$type<Evidence>().notNull(),
    mode: text("mode").$type<GameMode>().notNull().default("both"),
    /** One-sentence explanation of *why* the relationship matters. */
    explanation: text("explanation").notNull(),
    editorialStatus: text("editorial_status")
      .$type<EditorialStatus>()
      .notNull()
      .default("published"),
    /** Structured, per-relationship qualifiers (see RelationCondition). */
    condition: jsonb("condition").$type<RelationCondition>(),
    sourceId: integer("source_id").references(() => sourceAttribution.id),
  },
  (t) => ({
    subjectIdx: index("relation_subject_idx").on(t.subjectSide, t.subjectId),
    objectIdx: index("relation_object_idx").on(t.objectSide, t.objectId),
    predicateIdx: index("relation_predicate_idx").on(t.predicate),
  }),
);

/**
 * `set_bonus` — armor set perks keyed to a required piece count (2-pc / 4-pc),
 * modeled separately from individual armor pieces (proposal §5.2, Armor 3.0).
 */
export const setBonus = pgTable("set_bonus", {
  id: serial("id").primaryKey(),
  armorSetId: integer("armor_set_id")
    .notNull()
    .references(() => entity.id, { onDelete: "cascade" }),
  requiredPieces: integer("required_pieces").notNull(),
  perkEntityId: integer("perk_entity_id").references(() => entity.id),
  classRestriction: text("class_restriction").$type<GuardianClass>().default("any"),
  description: text("description"),
});

/**
 * `socket_option` — normalizes selectable plugs on an item (proposal §5.2).
 */
export const socketOption = pgTable("socket_option", {
  id: serial("id").primaryKey(),
  parentEntityId: integer("parent_entity_id")
    .notNull()
    .references(() => entity.id, { onDelete: "cascade" }),
  socketIndex: integer("socket_index").notNull(),
  plugEntityId: integer("plug_entity_id")
    .notNull()
    .references(() => entity.id),
  isDefault: boolean("is_default").default(false),
  selectable: boolean("selectable").default(true),
  plugSetSource: text("plug_set_source"),
});

/**
 * `source_attribution` — provenance for every enriched record (proposal §5.2).
 * The UI uses this to label official vs. community information and to satisfy
 * attribution requirements (e.g. Clarity).
 */
export const sourceAttribution = pgTable("source_attribution", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  sourceType: text("source_type"),
  version: text("version"),
  evidence: text("evidence").$type<Evidence>().notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow(),
  applicablePatch: text("applicable_patch"),
  locator: text("locator"),
  license: text("license"),
});

// --- Inferred row types (handy across the app) ---------------------------
export type Entity = typeof entity.$inferSelect;
export type NewEntity = typeof entity.$inferInsert;
export type Mechanic = typeof mechanic.$inferSelect;
export type NewMechanic = typeof mechanic.$inferInsert;
export type Relation = typeof relation.$inferSelect;
export type NewRelation = typeof relation.$inferInsert;
export type SourceAttribution = typeof sourceAttribution.$inferSelect;
export type NewSourceAttribution = typeof sourceAttribution.$inferInsert;
