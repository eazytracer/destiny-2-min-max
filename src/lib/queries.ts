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
  total: number;
}

export async function listMechanics(): Promise<Mechanic[]> {
  return db.select().from(mechanic).orderBy(asc(mechanic.name));
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
export async function getMechanicExplorer(
  slug: string,
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

  return { mechanic: m, columns, total: rows.length };
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
