/**
 * Curated seed dataset for the vertical slice.
 *
 * This is a *hand-authored* slice of the relationship graph, centred on the
 * Ionic Trace mechanic. It intentionally demonstrates the proposal's core
 * value: typed relationships with directness, evidence, provenance, and
 * conditions — not just perk descriptions.
 *
 * Notably it encodes the Riskrunner cautionary case from proposal §4: an Arc
 * weapon that merely *satisfies* a generation condition is modeled as an
 * ENABLES_PRODUCTION enabler, never as a direct generator.
 *
 * References are by slug; the seed runner resolves them to database ids.
 * Icons are emoji glyphs so the slice needs no external image assets.
 *
 * Evidence labels are deliberately conservative. Where exact percentages or
 * post-Monument-of-Triumph values are not officially documented, the record is
 * marked `community_tested` or `derived` rather than `official`.
 */
import type {
  EntityType,
  Element,
  GuardianClass,
  Predicate,
  Directness,
  Evidence,
  GameMode,
  RelationCondition,
} from "@/lib/types";

export interface SeedSource {
  key: string;
  provider: string;
  sourceType: string;
  version?: string;
  evidence: Evidence;
  applicablePatch?: string;
  locator?: string;
  license?: string;
}

export interface SeedEntity {
  slug: string;
  entityType: EntityType;
  name: string;
  officialDescription?: string;
  icon?: string;
  classRestriction?: GuardianClass;
  damageElement?: Element;
  rarity?: string;
  itemType?: string;
  weaponFamily?: string;
  status?: string;
  hash?: number;
}

export interface SeedMechanic {
  slug: string;
  name: string;
  category: string;
  element?: Element;
  baselineEffect?: string;
  officialDescription?: string;
  communityDescription?: string;
  icon?: string;
  stackBehavior?: string;
  defaultDurationSeconds?: number;
}

export interface SeedRelation {
  /** entity slug */
  subject: string;
  predicate: Predicate;
  /** mechanic slug */
  object: string;
  directness: Directness;
  evidence: Evidence;
  mode: GameMode;
  explanation: string;
  condition?: RelationCondition;
  sourceKey?: string;
}

// --- Provenance records (proposal §5.2 source_attribution) ----------------

export const SOURCES: SeedSource[] = [
  {
    key: "bungie-manifest",
    provider: "Bungie Destiny Manifest",
    sourceType: "official_definition",
    version: "monument-of-triumph",
    evidence: "official",
    applicablePatch: "Hotfix (Jun 23, 2026)",
    locator: "DestinyInventoryItemDefinition / DestinySandboxPerkDefinition",
    license: "Bungie API Terms of Use",
  },
  {
    key: "bungie-arc-doc",
    provider: "Bungie — Arc subclass documentation",
    sourceType: "official_text",
    evidence: "official",
    locator: "Arc keyword reference",
    license: "Bungie",
  },
  {
    key: "clarity",
    provider: "Clarity (community research)",
    sourceType: "community_database",
    evidence: "community_tested",
    locator: "Clarity perk descriptions",
    license: "Attribution required — hobby partnership",
  },
  {
    key: "editorial",
    provider: "Build Synergy Explorer — editorial",
    sourceType: "editorial_interpretation",
    evidence: "editorial",
    locator: "Curated relationship graph",
  },
];

// --- Entities involved in the Ionic Trace graph ---------------------------

export const ENTITIES: SeedEntity[] = [
  {
    slug: "electrostatic-mind",
    entityType: "aspect",
    name: "Electrostatic Mind",
    officialDescription:
      "Defeating targets with Arc abilities or defeating jolted or blinded targets creates an Ionic Trace. While near an Ionic Trace, you become Amplified.",
    icon: "🧠",
    classRestriction: "warlock",
    damageElement: "arc",
    itemType: "Aspect",
  },
  {
    slug: "spark-of-discharge",
    entityType: "fragment",
    name: "Spark of Discharge",
    officialDescription:
      "Arc weapon final blows have a chance to create an Ionic Trace.",
    icon: "⚡",
    damageElement: "arc",
    itemType: "Fragment",
  },
  {
    slug: "spark-of-ions",
    entityType: "fragment",
    name: "Spark of Ions",
    officialDescription: "Defeating a jolted target creates an Ionic Trace.",
    icon: "⚡",
    damageElement: "arc",
    itemType: "Fragment",
  },
  {
    slug: "centrifuse",
    entityType: "weapon",
    name: "Centrifuse",
    officialDescription:
      "Exotic Auto Rifle. Sprinting and dealing damage builds static charge. Defeating a blinded target discharges the built-up charge, blinding nearby combatants and creating an Ionic Trace.",
    icon: "🔫",
    damageElement: "arc",
    rarity: "Exotic",
    itemType: "Auto Rifle",
    weaponFamily: "Auto Rifle",
  },
  {
    slug: "riskrunner",
    entityType: "weapon",
    name: "Riskrunner",
    officialDescription:
      "Exotic Submachine Gun. Taking Arc damage activates Arc Conductor, chaining lightning to nearby targets. Its catalyst adds Chain Reaction.",
    icon: "🔫",
    damageElement: "arc",
    rarity: "Exotic",
    itemType: "Submachine Gun",
    weaponFamily: "Submachine Gun",
  },
  {
    slug: "arc-weapons",
    entityType: "weapon_family",
    name: "Arc weapons (any)",
    officialDescription:
      "Any weapon that deals Arc damage. On its own an Arc weapon deals elemental damage but does not create Ionic Traces.",
    icon: "⚔️",
    damageElement: "arc",
  },
  {
    slug: "fallen-sunstar",
    entityType: "exotic_armor",
    name: "Fallen Sunstar",
    officialDescription:
      "Exotic Warlock helmet. Ionic Traces created by your abilities travel to you faster and grant additional ability energy. Collecting an Ionic Trace also grants nearby allies ability energy.",
    icon: "⛑️",
    classRestriction: "warlock",
    damageElement: "arc",
    rarity: "Exotic",
    itemType: "Helmet",
  },
  {
    slug: "geomag-stabilizers",
    entityType: "exotic_armor",
    name: "Geomag Stabilizers",
    officialDescription:
      "Exotic Warlock leg armor. Collecting an Ionic Trace grants a burst of Super energy.",
    icon: "🦿",
    classRestriction: "warlock",
    damageElement: "arc",
    rarity: "Exotic",
    itemType: "Leg Armor",
  },
];

// --- Mechanics ------------------------------------------------------------
// Ionic Trace is fully populated; the rest exist as headers for the home-page
// chips and the mechanic index, and their graphs are catalogued incrementally.

export const MECHANICS: SeedMechanic[] = [
  {
    slug: "ionic-trace",
    name: "Ionic Trace",
    category: "resource",
    element: "arc",
    baselineEffect:
      "A racing bolt of Arc energy that travels to you. On collection it grants energy to your grenade, melee, and class abilities.",
    officialDescription:
      "Ionic Traces are created by various Arc abilities and effects. When collected, they grant ability energy.",
    communityDescription:
      "Multiple Ionic Traces can exist at once, and each grants a burst of ability energy on pickup rather than acting as a stacking buff. Exotics such as Fallen Sunstar increase how fast traces reach you, how much energy they grant, and whether nearby allies also benefit. Exact energy values differ between PvE and PvP.",
    icon: "⚡",
    stackBehavior:
      "Non-stacking buff — traces are discrete pickups. Any number can be active simultaneously; each is collected independently.",
    defaultDurationSeconds: undefined,
  },
  {
    slug: "jolt",
    name: "Jolt",
    category: "debuff",
    element: "arc",
    baselineEffect:
      "A jolted target periodically chains damaging Arc lightning to nearby targets when hit.",
    officialDescription:
      "Jolted targets are struck by chain lightning when they take further damage.",
    communityDescription:
      "Jolt is an Arc debuff. Defeating a jolted target is itself a condition several Ionic Trace generators depend on.",
    icon: "🔗",
    stackBehavior: "Applied/refreshed as a timed debuff on the target.",
    defaultDurationSeconds: 6,
  },
  {
    slug: "armor-charge",
    name: "Armor Charge",
    category: "resource",
    element: "none",
    baselineEffect:
      "A stacking meter, spent by mods to power weapon, ability, and survivability effects.",
    officialDescription:
      "Armor Charge stacks are gained from Orbs of Power and certain mods, and consumed by mods that read the stack count.",
    icon: "🛡️",
    stackBehavior: "Stacks up to a cap (default 3, extendable by mods).",
  },
  {
    slug: "orb-of-power",
    name: "Orb of Power",
    category: "pickup",
    element: "none",
    baselineEffect:
      "A pickup that grants Super energy and, with mods equipped, Armor Charge.",
    officialDescription:
      "Orbs of Power are created by rapidly defeating targets with masterworked weapons, Supers, and certain effects.",
    icon: "🔆",
    stackBehavior: "Discrete pickup.",
  },
  {
    slug: "scorch",
    name: "Scorch",
    category: "debuff",
    element: "solar",
    baselineEffect:
      "A stacking Solar debuff that deals damage over time and, at 100 stacks, causes an Ignition.",
    officialDescription:
      "Scorch stacks deal Solar damage over time; reaching the threshold triggers an Ignition.",
    icon: "🔥",
    stackBehavior: "Stacks to 100, then consumed by Ignition.",
  },
  {
    slug: "stasis-crystal",
    name: "Stasis Crystal",
    category: "construct",
    element: "stasis",
    baselineEffect:
      "A destructible crystal that can be shattered to deal Stasis damage and slow or freeze nearby targets.",
    officialDescription:
      "Stasis Crystals are constructs created by various Stasis abilities; shattering them releases Stasis damage.",
    icon: "❄️",
    stackBehavior: "Physical construct in the world.",
  },
];

// --- The Ionic Trace relationship graph -----------------------------------

export const RELATIONS: SeedRelation[] = [
  // === GENERATE / APPLY side ===============================================
  {
    subject: "electrostatic-mind",
    predicate: "PRODUCES",
    object: "ionic-trace",
    directness: "direct",
    evidence: "official",
    mode: "both",
    explanation:
      "Defeating a target with an Arc ability directly creates an Ionic Trace — the cornerstone generator of an Arc Warlock ability loop.",
    condition: {
      requiredClass: "warlock",
      requiredSubclass: "arc",
      triggerType: "Arc ability final blow",
      finalBlow: true,
    },
    sourceKey: "bungie-arc-doc",
  },
  {
    subject: "electrostatic-mind",
    predicate: "PRODUCES",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "official",
    mode: "both",
    explanation:
      "Also creates an Ionic Trace when you defeat a jolted or blinded target — so Arc weapons and grenades feed it indirectly through those debuffs.",
    condition: {
      requiredClass: "warlock",
      requiredSubclass: "arc",
      targetDebuff: "jolt or blind",
      finalBlow: true,
    },
    sourceKey: "bungie-arc-doc",
  },
  {
    subject: "spark-of-ions",
    predicate: "PRODUCES",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "official",
    mode: "both",
    explanation:
      "Turns any jolt source in your build into an Ionic Trace generator: defeat a jolted target and a trace spawns.",
    condition: {
      targetDebuff: "jolt",
      finalBlow: true,
    },
    sourceKey: "bungie-manifest",
  },
  {
    subject: "spark-of-discharge",
    predicate: "PRODUCES",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "community_tested",
    mode: "both",
    explanation:
      "Gives Arc weapon final blows a chance to spawn an Ionic Trace — the main way to generate traces from gunplay rather than abilities.",
    condition: {
      requiredElement: "arc",
      finalBlow: true,
      notes:
        "Chance-based on Arc weapon final blows. Historically applied a small weapon-damage penalty in PvP; verify current mode behavior.",
    },
    sourceKey: "clarity",
  },
  {
    subject: "centrifuse",
    predicate: "PRODUCES",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "community_tested",
    mode: "both",
    explanation:
      "This specific exotic creates an Ionic Trace when its built-up static charge discharges on a blinded target — a self-contained generator that needs no fragment.",
    condition: {
      targetDebuff: "blind",
      triggerType: "static charge discharge",
      notes: "Requires built-up static charge from sprinting / dealing damage.",
    },
    sourceKey: "clarity",
  },
  {
    // The proposal §4 cautionary case: an enabler, NOT a direct generator.
    subject: "riskrunner",
    predicate: "ENABLES_PRODUCTION",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "editorial",
    mode: "both",
    explanation:
      "Riskrunner does not create Ionic Traces on its own. As an Arc weapon it can satisfy the conditions of a separate generator (e.g. Spark of Discharge), so it enables production only when such a rule is also equipped.",
    condition: {
      requiredElement: "arc",
      requiredBuff: "an equipped Arc-weapon generation rule (e.g. Spark of Discharge)",
      notes:
        "Classified as an enabler, not a generator, to avoid the false 'Arc weapon = trace source' inference.",
    },
    sourceKey: "editorial",
  },
  {
    subject: "arc-weapons",
    predicate: "ENABLES_PRODUCTION",
    object: "ionic-trace",
    directness: "conditional",
    evidence: "editorial",
    mode: "both",
    explanation:
      "Any Arc weapon can satisfy Arc-weapon-final-blow conditions, but only produces traces when paired with a generation rule such as Spark of Discharge or Electrostatic Mind.",
    condition: {
      requiredElement: "arc",
      requiredBuff: "Spark of Discharge or an ability-based generator",
    },
    sourceKey: "editorial",
  },

  // === SPEND / BENEFIT side ================================================
  {
    subject: "fallen-sunstar",
    predicate: "ENHANCES",
    object: "ionic-trace",
    directness: "direct",
    evidence: "official",
    mode: "both",
    explanation:
      "Makes every Ionic Trace stronger: traces travel to you faster and grant additional ability energy on pickup.",
    condition: {
      requiredClass: "warlock",
      notes: "Effect applies to all traces you create while equipped.",
    },
    sourceKey: "bungie-manifest",
  },
  {
    subject: "fallen-sunstar",
    predicate: "TRIGGERS",
    object: "ionic-trace",
    directness: "direct",
    evidence: "community_tested",
    mode: "both",
    explanation:
      "Collecting an Ionic Trace additionally grants nearby allies ability energy — turning a solo pickup into team support.",
    condition: {
      requiredClass: "warlock",
      triggerType: "Ionic Trace collected",
      notes: "Ally energy share is strongest in PvE fireteam content.",
    },
    sourceKey: "clarity",
  },
  {
    subject: "geomag-stabilizers",
    predicate: "BENEFITS_FROM",
    object: "ionic-trace",
    directness: "direct",
    evidence: "community_tested",
    mode: "both",
    explanation:
      "Redirects the ability-loop payoff toward your Super: collecting a trace grants a burst of Super energy, closing the gap to your next Super.",
    condition: {
      requiredClass: "warlock",
      triggerType: "Ionic Trace collected",
      notes: "Super-energy value per trace differs between PvE and PvP.",
    },
    sourceKey: "clarity",
  },
];
