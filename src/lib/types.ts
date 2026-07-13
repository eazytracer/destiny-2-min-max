/**
 * Core domain vocabulary for the Build Synergy Explorer.
 *
 * The application's proprietary asset is not the copied item catalog — it is
 * the curated, versioned set of *typed relationships* connecting items,
 * conditions, mechanics, and outcomes. These enums are the shared language for
 * those relationships (see proposal §4).
 */

/** The kinds of searchable objects the app knows about (proposal §5.1). */
export type EntityType =
  // Equipment
  | "weapon"
  | "weapon_family"
  | "weapon_archetype"
  | "weapon_perk"
  | "enhanced_perk"
  | "origin_trait"
  | "catalyst"
  | "exotic_armor"
  | "legendary_armor"
  | "armor_set"
  | "armor_set_bonus"
  | "armor_mod"
  // Build configuration
  | "artifact"
  | "artifact_perk"
  | "subclass"
  | "super"
  | "aspect"
  | "fragment"
  | "grenade"
  | "melee"
  | "class_ability";

/** Damage / subclass elements. `kinetic` and `prismatic` included per §9. */
export type Element =
  | "arc"
  | "solar"
  | "void"
  | "stasis"
  | "strand"
  | "kinetic"
  | "prismatic"
  | "none";

/** Guardian classes; `null`/`any` means unrestricted. */
export type GuardianClass = "titan" | "hunter" | "warlock" | "any";

/**
 * Typed relationship predicates (proposal §4). The direction always reads
 * subject → predicate → object.
 */
export type Predicate =
  | "PRODUCES"
  | "ENABLES_PRODUCTION"
  | "APPLIES"
  | "CONSUMES"
  | "BENEFITS_FROM"
  | "ENHANCES"
  | "EXTENDS"
  | "CONVERTS_TO"
  | "REQUIRES"
  | "COUNTERS"
  | "INCOMPATIBLE_WITH"
  | "TRIGGERS"
  | "REFUNDS"
  | "REDUCES_COST"
  | "INCREASES_UPTIME";

/**
 * How directly the subject interacts with the object (proposal §4).
 * The UI must never present these as equally certain.
 */
export type Directness = "direct" | "conditional" | "indirect" | "inferred";

/** Provenance strength (proposal §4). Drives the source-confidence badge. */
export type Evidence =
  | "official"
  | "community_tested"
  | "derived"
  | "editorial"
  | "unverified";

/** Where a relationship applies. Many effects differ across PvE and PvP. */
export type GameMode = "pve" | "pvp" | "both";

/** Editorial workflow state for a relationship (proposal §6). */
export type EditorialStatus = "published" | "candidate" | "rejected";

/** Either end of a relationship edge is an entity or a mechanic (proposal §5.2). */
export type RelationSide = "entity" | "mechanic";

/**
 * Structured qualifiers that narrow a relationship (proposal §5.2
 * `relation_condition`). Every field is optional; only the ones that apply are
 * stored so the UI can render an honest "trigger / requirement" line.
 */
export interface RelationCondition {
  requiredElement?: Element;
  requiredWeaponFamily?: string;
  requiredClass?: GuardianClass;
  requiredSubclass?: Element;
  requiredBuff?: string;
  triggerType?: string;
  finalBlow?: boolean;
  precision?: boolean;
  targetDebuff?: string;
  cooldownSeconds?: number;
  durationSeconds?: number;
  stackCap?: number;
  chancePercent?: number;
  activityRestriction?: string;
  /** Free-form structured qualifiers that don't fit a named field. */
  notes?: string;
}

// --- Presentation helpers -------------------------------------------------

export const ELEMENT_LABEL: Record<Element, string> = {
  arc: "Arc",
  solar: "Solar",
  void: "Void",
  stasis: "Stasis",
  strand: "Strand",
  kinetic: "Kinetic",
  prismatic: "Prismatic",
  none: "—",
};

export const PREDICATE_LABEL: Record<Predicate, string> = {
  PRODUCES: "Produces",
  ENABLES_PRODUCTION: "Enables production of",
  APPLIES: "Applies",
  CONSUMES: "Consumes",
  BENEFITS_FROM: "Benefits from",
  ENHANCES: "Enhances",
  EXTENDS: "Extends",
  CONVERTS_TO: "Converts to",
  REQUIRES: "Requires",
  COUNTERS: "Counters",
  INCOMPATIBLE_WITH: "Incompatible with",
  TRIGGERS: "Triggers",
  REFUNDS: "Refunds",
  REDUCES_COST: "Reduces cost of",
  INCREASES_UPTIME: "Increases uptime of",
};

export const DIRECTNESS_LABEL: Record<Directness, string> = {
  direct: "Direct",
  conditional: "Conditional",
  indirect: "Indirect",
  inferred: "Inferred",
};

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  official: "Official",
  community_tested: "Community tested",
  derived: "Derived from definitions",
  editorial: "Editorial",
  unverified: "Unverified candidate",
};

export const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  weapon: "Weapon",
  weapon_family: "Weapon family",
  weapon_archetype: "Archetype",
  weapon_perk: "Weapon perk",
  enhanced_perk: "Enhanced perk",
  origin_trait: "Origin trait",
  catalyst: "Catalyst",
  exotic_armor: "Exotic armor",
  legendary_armor: "Legendary armor",
  armor_set: "Armor set",
  armor_set_bonus: "Set bonus",
  armor_mod: "Armor mod",
  artifact: "Artifact",
  artifact_perk: "Artifact perk",
  subclass: "Subclass",
  super: "Super",
  aspect: "Aspect",
  fragment: "Fragment",
  grenade: "Grenade",
  melee: "Melee",
  class_ability: "Class ability",
};

/**
 * Which side of the Mechanic Explorer a relationship belongs on, and which
 * sub-section header it sits under (proposal §8.4). Derived from the predicate
 * and directness rather than stored, so the classification stays consistent.
 */
export type ExplorerColumn = "generate" | "benefit";

export interface ExplorerSection {
  column: ExplorerColumn;
  key: string;
  title: string;
}

const GENERATE_SECTIONS = {
  directGenerators: { column: "generate", key: "directGenerators", title: "Direct generators" },
  conditionalGenerators: { column: "generate", key: "conditionalGenerators", title: "Conditional generators" },
  productionEnablers: { column: "generate", key: "productionEnablers", title: "Production enablers" },
  weaponConditions: { column: "generate", key: "weaponConditions", title: "Weapons that satisfy generation conditions" },
  conversionSources: { column: "generate", key: "conversionSources", title: "Conversion sources" },
} as const;

const BENEFIT_SECTIONS = {
  directConsumers: { column: "benefit", key: "directConsumers", title: "Direct consumers" },
  pickupEffects: { column: "benefit", key: "pickupEffects", title: "Effects activated by pickup" },
  enhancedBy: { column: "benefit", key: "enhancedBy", title: "Effects enhanced by the mechanic" },
  durationExtenders: { column: "benefit", key: "durationExtenders", title: "Duration extenders" },
  loopPayoffs: { column: "benefit", key: "loopPayoffs", title: "Ability-loop payoffs" },
} as const;

export const EXPLORER_SECTIONS: ExplorerSection[] = [
  ...Object.values(GENERATE_SECTIONS),
  ...Object.values(BENEFIT_SECTIONS),
];

/**
 * Classify a (predicate, directness, entityType) triple into an explorer
 * section. This is the single source of truth for how relationships fan out
 * into the two-column view.
 */
export function classifySection(
  predicate: Predicate,
  directness: Directness,
  entityType: EntityType,
): ExplorerSection {
  switch (predicate) {
    case "PRODUCES":
    case "APPLIES":
      if (entityType === "weapon" && directness === "conditional") {
        return GENERATE_SECTIONS.weaponConditions;
      }
      return directness === "direct"
        ? GENERATE_SECTIONS.directGenerators
        : GENERATE_SECTIONS.conditionalGenerators;
    case "ENABLES_PRODUCTION":
      return GENERATE_SECTIONS.productionEnablers;
    case "CONVERTS_TO":
      return GENERATE_SECTIONS.conversionSources;
    case "CONSUMES":
    case "REDUCES_COST":
    case "REFUNDS":
      return BENEFIT_SECTIONS.directConsumers;
    case "TRIGGERS":
      return BENEFIT_SECTIONS.pickupEffects;
    case "ENHANCES":
      return BENEFIT_SECTIONS.enhancedBy;
    case "EXTENDS":
    case "INCREASES_UPTIME":
      return BENEFIT_SECTIONS.durationExtenders;
    case "BENEFITS_FROM":
    default:
      return BENEFIT_SECTIONS.loopPayoffs;
  }
}
