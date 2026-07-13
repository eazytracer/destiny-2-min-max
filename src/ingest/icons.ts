/**
 * Targeted icon ingestion.
 *
 * Fills real Bungie CDN art (icon + season/rarity watermark) for the entities
 * already in our curated catalog, without importing the entire Manifest. It
 * downloads only DestinyInventoryItemDefinition, indexes it, and resolves each
 * catalogued entity by Bungie hash (if known) or by exact name.
 *
 * Requires a free Bungie API key:
 *   BUNGIE_API_KEY=xxxx npm run ingest:icons
 *
 * The image URLs it stores are hotlinked from https://www.bungie.net (the same
 * public CDN DIM and light.gg use); no key is needed to *display* them, only to
 * discover the paths here.
 */
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { entity } from "../db/schema";

const BUNGIE = "https://www.bungie.net";
const API_KEY = process.env.BUNGIE_API_KEY;

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

interface ManifestItemDef {
  hash: number;
  redacted?: boolean;
  displayProperties?: { name?: string; description?: string; icon?: string };
  iconWatermark?: string;
  itemTypeDisplayName?: string;
  inventory?: { tierType?: number };
  quality?: {
    currentVersion?: number;
    displayVersionWatermarkIcons?: string[];
  };
}

async function bungieFetch(path: string): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${BUNGIE}${path}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY! },
  });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function watermarkOf(def: ManifestItemDef): string | null {
  if (def.iconWatermark) return def.iconWatermark;
  const icons = def.quality?.displayVersionWatermarkIcons;
  if (icons && icons.length) {
    const idx = def.quality?.currentVersion ?? icons.length - 1;
    return icons[idx] ?? icons[icons.length - 1] ?? null;
  }
  return null;
}

async function main() {
  if (!API_KEY) {
    console.error(
      "✗ BUNGIE_API_KEY is not set. Get a free key at https://www.bungie.net/en/Application and re-run with BUNGIE_API_KEY=xxxx npm run ingest:icons",
    );
    process.exit(1);
  }

  console.log("→ Fetching manifest index…");
  const manifest = (await bungieFetch("/Platform/Destiny2/Manifest/")) as {
    Response?: {
      version?: string;
      jsonWorldComponentContentPaths?: Record<
        string,
        Record<string, string>
      >;
    };
  };
  const version = manifest.Response?.version ?? "unknown";
  const itemPath =
    manifest.Response?.jsonWorldComponentContentPaths?.en
      ?.DestinyInventoryItemDefinition;
  if (!itemPath) throw new Error("Manifest did not return an item table path");
  console.log(`  manifest version ${version}`);

  console.log("→ Downloading DestinyInventoryItemDefinition (large)…");
  const defs = (await bungieFetch(itemPath)) as Record<string, ManifestItemDef>;
  const byHash = new Map<number, ManifestItemDef>();
  const byName = new Map<string, ManifestItemDef[]>();
  for (const key of Object.keys(defs)) {
    const def = defs[key];
    if (def.redacted) continue;
    byHash.set(def.hash, def);
    const name = def.displayProperties?.name?.toLowerCase().trim();
    if (!name) continue;
    (byName.get(name) ?? byName.set(name, []).get(name)!).push(def);
  }
  console.log(`  indexed ${byHash.size} items`);

  const rows = await db.select().from(entity);
  let matched = 0;
  const misses: string[] = [];

  for (const row of rows) {
    if (!RESOLVABLE.has(row.entityType)) continue;

    let def: ManifestItemDef | undefined;
    if (row.hash != null) def = byHash.get(row.hash);
    if (!def) {
      const candidates = byName.get(row.name.toLowerCase().trim()) ?? [];
      // Prefer a candidate that actually has an icon; then higher tier
      // (exotic > legendary) so exotics resolve to their real art.
      def = candidates
        .filter((c) => c.displayProperties?.icon)
        .sort(
          (a, b) => (b.inventory?.tierType ?? 0) - (a.inventory?.tierType ?? 0),
        )[0];
    }

    if (!def || !def.displayProperties?.icon) {
      misses.push(`${row.name} (${row.entityType})`);
      continue;
    }

    await db
      .update(entity)
      .set({
        hash: row.hash ?? def.hash,
        iconPath: def.displayProperties.icon ?? null,
        iconWatermark: watermarkOf(def),
        officialDescription:
          row.officialDescription ??
          def.displayProperties.description ??
          null,
      })
      .where(eq(entity.id, row.id));
    matched++;
    console.log(`  ✓ ${row.name} -> ${def.displayProperties.icon}`);
  }

  console.log(`\n✓ Icon ingestion complete: ${matched} matched.`);
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
    console.error("✗ Icon ingestion failed:", err);
    process.exit(1);
  });
