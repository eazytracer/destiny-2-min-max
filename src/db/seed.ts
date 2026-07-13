/**
 * Seed runner for the vertical slice.
 *
 * Idempotent: clears the curated tables and re-inserts the dataset, resolving
 * slug references (entities, mechanics, sources) into database ids. Run with:
 *
 *   npm run db:seed
 */
import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  entity,
  mechanic,
  relation,
  sourceAttribution,
} from "./schema";
import {
  SOURCES,
  ENTITIES,
  MECHANICS,
  RELATIONS,
} from "../data/seed/dataset";

const MANIFEST_VERSION = "monument-of-triumph+hotfix-2026-06-23";

async function seed() {
  console.log("→ Clearing curated tables…");
  // Order matters: relation references entity/mechanic/source.
  await db.execute(
    sql`TRUNCATE TABLE ${relation}, ${entity}, ${mechanic}, ${sourceAttribution} RESTART IDENTITY CASCADE`,
  );

  console.log(`→ Inserting ${SOURCES.length} source attributions…`);
  const insertedSources = await db
    .insert(sourceAttribution)
    .values(
      SOURCES.map((s) => ({
        provider: s.provider,
        sourceType: s.sourceType,
        version: s.version,
        evidence: s.evidence,
        applicablePatch: s.applicablePatch,
        locator: s.locator,
        license: s.license,
      })),
    )
    .returning({ id: sourceAttribution.id });
  const sourceIdByKey = new Map<string, number>();
  SOURCES.forEach((s, i) => sourceIdByKey.set(s.key, insertedSources[i].id));

  console.log(`→ Inserting ${ENTITIES.length} entities…`);
  const insertedEntities = await db
    .insert(entity)
    .values(
      ENTITIES.map((e) => ({
        hash: e.hash ?? null,
        entityType: e.entityType,
        slug: e.slug,
        name: e.name,
        officialDescription: e.officialDescription ?? null,
        icon: e.icon ?? null,
        classRestriction: e.classRestriction ?? "any",
        damageElement: e.damageElement ?? "none",
        rarity: e.rarity ?? null,
        itemType: e.itemType ?? null,
        weaponFamily: e.weaponFamily ?? null,
        status: e.status ?? "current",
        locale: "en",
        manifestVersion: MANIFEST_VERSION,
      })),
    )
    .returning({ id: entity.id, slug: entity.slug });
  const entityIdBySlug = new Map<string, number>();
  insertedEntities.forEach((e) => entityIdBySlug.set(e.slug, e.id));

  console.log(`→ Inserting ${MECHANICS.length} mechanics…`);
  const insertedMechanics = await db
    .insert(mechanic)
    .values(
      MECHANICS.map((m) => ({
        slug: m.slug,
        name: m.name,
        category: m.category,
        element: m.element ?? "none",
        baselineEffect: m.baselineEffect ?? null,
        officialDescription: m.officialDescription ?? null,
        communityDescription: m.communityDescription ?? null,
        icon: m.icon ?? null,
        stackBehavior: m.stackBehavior ?? null,
        defaultDurationSeconds: m.defaultDurationSeconds ?? null,
      })),
    )
    .returning({ id: mechanic.id, slug: mechanic.slug });
  const mechanicIdBySlug = new Map<string, number>();
  insertedMechanics.forEach((m) => mechanicIdBySlug.set(m.slug, m.id));

  console.log(`→ Inserting ${RELATIONS.length} relations…`);
  const relationRows = RELATIONS.map((r) => {
    const subjectId = entityIdBySlug.get(r.subject);
    const objectId = mechanicIdBySlug.get(r.object);
    if (subjectId === undefined) {
      throw new Error(`Relation subject entity not found: ${r.subject}`);
    }
    if (objectId === undefined) {
      throw new Error(`Relation object mechanic not found: ${r.object}`);
    }
    return {
      subjectSide: "entity" as const,
      subjectId,
      predicate: r.predicate,
      objectSide: "mechanic" as const,
      objectId,
      directness: r.directness,
      evidence: r.evidence,
      mode: r.mode,
      explanation: r.explanation,
      editorialStatus: "published" as const,
      condition: r.condition ?? null,
      sourceId: r.sourceKey ? sourceIdByKey.get(r.sourceKey) ?? null : null,
    };
  });
  await db.insert(relation).values(relationRows);

  console.log("✓ Seed complete.");
  console.log(
    `  ${insertedSources.length} sources, ${insertedEntities.length} entities, ${insertedMechanics.length} mechanics, ${relationRows.length} relations.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  });
