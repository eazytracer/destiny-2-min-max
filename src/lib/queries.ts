/**
 * Data-access layer for the Mechanic Explorer.
 *
 * Kept behind this module so the UI never touches Drizzle directly and so the
 * section classification (proposal §8.4) lives in one place.
 */
import "server-only";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  entity,
  mechanic,
  relation,
  sourceAttribution,
  type Entity,
  type Mechanic,
  type SourceAttribution,
} from "@/db/schema";
import {
  classifySection,
  EXPLORER_SECTIONS,
  type ExplorerColumn,
  type ExplorerSection,
  type RelationCondition,
  type Predicate,
  type Directness,
  type Evidence,
  type GameMode,
  type Filters,
  type Element,
} from "@/lib/types";

/** A relationship as the UI consumes it: the subject entity plus edge data. */
export interface RelationView {
  id: number;
  subject: Entity;
  predicate: Predicate;
  directness: Directness;
  evidence: Evidence;
  mode: GameMode;
  explanation: string;
  condition: RelationCondition | null;
  source: SourceAttribution | null;
}

export interface ExplorerSectionData extends ExplorerSection {
  relations: RelationView[];
}

export interface MechanicExplorerData {
  mechanic: Mechanic;
  columns: Record<ExplorerColumn, ExplorerSectionData[]>;
  /** Relationships shown after filtering. */
  total: number;
  /** Relationships hidden by the active filters (for an honest empty state). */
  filteredOut: number;
}

/** One of an item's relationships, oriented toward the mechanic it touches. */
export interface EntityRelationView {
  id: number;
  predicate: Predicate;
  directness: Directness;
  evidence: Evidence;
  mode: GameMode;
  explanation: string;
  condition: RelationCondition | null;
  source: SourceAttribution | null;
  mechanic: Mechanic;
}

export async function listMechanics(): Promise<Mechanic[]> {
  return db.select().from(mechanic).orderBy(asc(mechanic.name));
}

export async function getEntityBySlug(slug: string): Promise<Entity | null> {
  const rows = await db
    .select()
    .from(entity)
    .where(eq(entity.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Every published relationship this entity participates in, each paired with
 * the mechanic on the other end, ranked most-certain first.
 */
export async function getEntityRelations(
  entityId: number,
): Promise<EntityRelationView[]> {
  const rows = await db
    .select({ rel: relation, mechanic, source: sourceAttribution })
    .from(relation)
    .innerJoin(mechanic, eq(relation.objectId, mechanic.id))
    .leftJoin(sourceAttribution, eq(relation.sourceId, sourceAttribution.id))
    .where(
      and(
        eq(relation.subjectSide, "entity"),
        eq(relation.subjectId, entityId),
        eq(relation.objectSide, "mechanic"),
        eq(relation.editorialStatus, "published"),
      ),
    );

  return rows
    .map((row) => ({
      id: row.rel.id,
      predicate: row.rel.predicate,
      directness: row.rel.directness,
      evidence: row.rel.evidence,
      mode: row.rel.mode,
      explanation: row.rel.explanation,
      condition: row.rel.condition,
      source: row.source ?? null,
      mechanic: row.mechanic,
    }))
    .sort(
      (a, b) =>
        DIRECTNESS_RANK[a.directness] - DIRECTNESS_RANK[b.directness] ||
        EVIDENCE_RANK[a.evidence] - EVIDENCE_RANK[b.evidence],
    );
}

export async function listSources(): Promise<SourceAttribution[]> {
  return db.select().from(sourceAttribution).orderBy(asc(sourceAttribution.id));
}

export async function getMechanicBySlug(
  slug: string,
): Promise<Mechanic | null> {
  const rows = await db
    .select()
    .from(mechanic)
    .where(eq(mechanic.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Load everything the Mechanic Explorer needs for one mechanic: the mechanic
 * itself plus every published relationship pointing at it, fanned out into the
 * two-column section layout.
 */
/**
 * Decide whether a relationship survives the active class / subclass filters.
 *
 * Class: hide relations that are restricted to a *different* class, whether the
 * restriction sits on the entity or in the relationship's condition.
 * Subclass: keep element-agnostic subjects (mods, kinetic, none); otherwise the
 * subject's element or a condition's required element/subclass must match.
 */
export function matchesFilters(rel: RelationView, filters: Filters): boolean {
  if (filters.class) {
    const entClass = rel.subject.classRestriction ?? "any";
    if (entClass !== "any" && entClass !== filters.class) return false;
    const condClass = rel.condition?.requiredClass ?? "any";
    if (condClass !== "any" && condClass !== filters.class) return false;
  }

  if (filters.subclass) {
    const el = (rel.subject.damageElement ?? "none") as Element;
    const agnostic = el === "none" || el === "kinetic";
    const condEl = rel.condition?.requiredElement;
    const condSub = rel.condition?.requiredSubclass;
    const matches =
      agnostic ||
      el === filters.subclass ||
      condEl === filters.subclass ||
      condSub === filters.subclass;
    if (!matches) return false;
  }

  return true;
}

export async function getMechanicExplorer(
  slug: string,
  filters: Filters = {},
): Promise<MechanicExplorerData | null> {
  const m = await getMechanicBySlug(slug);
  if (!m) return null;

  const rows = await db
    .select({
      rel: relation,
      subject: entity,
      source: sourceAttribution,
    })
    .from(relation)
    .innerJoin(entity, eq(relation.subjectId, entity.id))
    .leftJoin(sourceAttribution, eq(relation.sourceId, sourceAttribution.id))
    .where(
      and(
        eq(relation.objectSide, "mechanic"),
        eq(relation.objectId, m.id),
        eq(relation.subjectSide, "entity"),
        eq(relation.editorialStatus, "published"),
      ),
    );

  // Seed the section map so section order is stable and deterministic.
  const bySectionKey = new Map<string, ExplorerSectionData>();
  for (const s of EXPLORER_SECTIONS) {
    bySectionKey.set(s.key, { ...s, relations: [] });
  }

  let filteredOut = 0;
  for (const row of rows) {
    const view: RelationView = {
      id: row.rel.id,
      subject: row.subject,
      predicate: row.rel.predicate,
      directness: row.rel.directness,
      evidence: row.rel.evidence,
      mode: row.rel.mode,
      explanation: row.rel.explanation,
      condition: row.rel.condition,
      source: row.source ?? null,
    };
    if (!matchesFilters(view, filters)) {
      filteredOut++;
      continue;
    }
    const section = classifySection(
      row.rel.predicate,
      row.rel.directness,
      row.subject.entityType,
    );
    bySectionKey.get(section.key)!.relations.push(view);
  }

  // Rank within each section by directness then evidence (proposal §11).
  for (const section of bySectionKey.values()) {
    section.relations.sort(rankRelations);
  }

  const columns: Record<ExplorerColumn, ExplorerSectionData[]> = {
    generate: [],
    benefit: [],
  };
  for (const s of EXPLORER_SECTIONS) {
    const data = bySectionKey.get(s.key)!;
    if (data.relations.length === 0) continue; // hide empty sections
    columns[s.column].push(data);
  }

  return { mechanic: m, columns, total: rows.length - filteredOut, filteredOut };
}

const DIRECTNESS_RANK: Record<Directness, number> = {
  direct: 0,
  conditional: 1,
  indirect: 2,
  inferred: 3,
};

const EVIDENCE_RANK: Record<Evidence, number> = {
  official: 0,
  community_tested: 1,
  derived: 2,
  editorial: 3,
  unverified: 4,
};

function rankRelations(a: RelationView, b: RelationView): number {
  const d = DIRECTNESS_RANK[a.directness] - DIRECTNESS_RANK[b.directness];
  if (d !== 0) return d;
  return EVIDENCE_RANK[a.evidence] - EVIDENCE_RANK[b.evidence];
}
