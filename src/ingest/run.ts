/**
 * Manifest ingestion runner.
 *
 * Enriches the curated catalog with real Bungie data: it downloads
 * DestinyInventoryItemDefinition, matches each catalogued entity by hash or
 * name, and fills icon art, watermark, element, rarity, item type, and any
 * missing official description. Every enriched entity gets an `entity_version`
 * snapshot for provenance, and the run is skipped when the live manifest
 * version matches the last one ingested.
 *
 *   BUNGIE_API_KEY=xxxx npm run ingest:manifest          # skip if unchanged
 *   BUNGIE_API_KEY=xxxx npm run ingest:manifest -- --force
 *
 * Get a free key at https://www.bungie.net/en/Application.
 */
import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { entity, entityVersion } from "@/db/schema";
import {
  fetchItemDefinitions,
  fetchManifestIndex,
  indexDefs,
  matchEntity,
  needsIngest,
  normalizeEntity,
  type ManifestItemDef,
} from "./manifest";

const PROVIDER = "Bungie Destiny Manifest";

/** Entity types that correspond to real DestinyInventoryItemDefinition items. */
const RESOLVABLE = new Set([
  "weapon",
  "exotic_armor",
  "legendary_armor",
  "armor_mod",
  "fragment",
  "aspect",
  "catalyst",
  "artifact_perk",
  "super",
  "grenade",
  "melee",
  "class_ability",
  "origin_trait",
  "weapon_perk",
  "enhanced_perk",
]);

/** The most recent manifest version we have ingested, or null. */
async function lastIngestedVersion(): Promise<string | null> {
  const rows = await db
    .select({ version: entityVersion.sourceVersion })
    .from(entityVersion)
    .where(eq(entityVersion.provider, PROVIDER))
    .orderBy(desc(entityVersion.id))
    .limit(1);
  return rows[0]?.version ?? null;
}

/** Record a raw definition snapshot, replacing any prior one for this version. */
async function recordVersion(
  entityId: number,
  version: string,
  def: ManifestItemDef,
): Promise<void> {
  const raw = JSON.stringify(def);
  const checksum = createHash("sha1").update(raw).digest("hex");
  await db
    .delete(entityVersion)
    .where(
      and(
        eq(entityVersion.entityId, entityId),
        eq(entityVersion.provider, PROVIDER),
        eq(entityVersion.sourceVersion, version),
      ),
    );
  await db.insert(entityVersion).values({
    entityId,
    provider: PROVIDER,
    sourceVersion: version,
    raw: def,
    checksum,
  });
}

async function main() {
  const apiKey = process.env.BUNGIE_API_KEY;
  if (!apiKey) {
    console.error(
      "✗ BUNGIE_API_KEY is not set. Get a free key at https://www.bungie.net/en/Application and re-run with BUNGIE_API_KEY=xxxx npm run ingest:manifest",
    );
    process.exit(1);
  }
  const force = process.argv.includes("--force");

  console.log("→ Fetching manifest index…");
  const { version, itemDefPath } = await fetchManifestIndex(apiKey);
  console.log(`  manifest version ${version}`);

  const stored = await lastIngestedVersion();
  if (!needsIngest(version, stored, force)) {
    console.log(
      `✓ Already ingested ${version} — nothing to do (use --force to re-run).`,
    );
    return;
  }

  console.log("→ Downloading DestinyInventoryItemDefinition (large)…");
  const defs = await fetchItemDefinitions(itemDefPath, apiKey);
  const index = indexDefs(defs);
  console.log(`  indexed ${index.byHash.size} items`);

  const rows = await db.select().from(entity);
  let matched = 0;
  const misses: string[] = [];

  for (const row of rows) {
    if (!RESOLVABLE.has(row.entityType)) continue;

    const def = matchEntity(row, index);
    const patch = def ? normalizeEntity(row, def) : null;
    if (!def || !patch) {
      misses.push(`${row.name} (${row.entityType})`);
      continue;
    }

    await db.update(entity).set(patch).where(eq(entity.id, row.id));
    await recordVersion(row.id, version, def);
    matched++;
    console.log(`  ✓ ${row.name} -> ${patch.iconPath}`);
  }

  console.log(`\n✓ Ingestion complete: ${matched} enriched (version ${version}).`);
  if (misses.length) {
    console.log(
      `  ${misses.length} not matched (kept emoji fallback): ${misses.join(", ")}`,
    );
    console.log(
      "  Tip: set an exact Bungie hash on these in src/data/seed/dataset.ts for a precise match.",
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Ingestion failed:", err);
    process.exit(1);
  });
