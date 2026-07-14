/**
 * Bungie Manifest client and enrichment helpers.
 *
 * The pure functions here (indexDefs, matchEntity, normalizeEntity, and the
 * small field extractors) hold all the ingestion logic and are unit-tested in
 * manifest.test.ts. The `fetch*` functions are the thin network shell used by
 * the runner (run.ts); they are the only part that touches bungie.net.
 *
 * A free Bungie API key is required only to *discover* the CDN paths here; the
 * icon/watermark URLs we store are public and need no key to display.
 */
import type { Element } from "@/lib/types";

const BUNGIE = "https://www.bungie.net";

/** The slice of DestinyInventoryItemDefinition we read. */
export interface ManifestItemDef {
  hash: number;
  redacted?: boolean;
  displayProperties?: { name?: string; description?: string; icon?: string };
  iconWatermark?: string;
  itemTypeDisplayName?: string;
  defaultDamageType?: number;
  inventory?: { tierType?: number; tierTypeName?: string };
  quality?: {
    currentVersion?: number;
    displayVersionWatermarkIcons?: string[];
  };
}

/** An index of the manifest item table for fast hash/name lookup. */
export interface ManifestIndex {
  byHash: Map<number, ManifestItemDef>;
  byName: Map<string, ManifestItemDef[]>;
}

/** The curated-entity fields ingestion reads to match and enrich. */
export interface EnrichableEntity {
  hash: number | null;
  name: string;
  officialDescription: string | null;
  damageElement: Element | null;
  rarity: string | null;
  itemType: string | null;
}

/** The subset of entity columns an ingest run may update. */
export interface EntityPatch {
  hash: number;
  iconPath: string;
  iconWatermark: string | null;
  officialDescription?: string;
  damageElement?: Element;
  rarity?: string;
  itemType?: string;
}

/** Bungie DamageType enum → our Element vocabulary. */
const DAMAGE_TYPE_TO_ELEMENT: Record<number, Element> = {
  1: "kinetic",
  2: "arc",
  3: "solar",
  4: "void",
  6: "stasis",
  7: "strand",
};

// --- Pure field extractors ------------------------------------------------

/** Current-season / rarity watermark overlay path, or null. */
export function watermarkOf(def: ManifestItemDef): string | null {
  if (def.iconWatermark) return def.iconWatermark;
  const icons = def.quality?.displayVersionWatermarkIcons;
  if (icons && icons.length) {
    const idx = def.quality?.currentVersion ?? icons.length - 1;
    return icons[idx] ?? icons[icons.length - 1] ?? null;
  }
  return null;
}

/** Damage element from the item's default damage type, or "none". */
export function elementOf(def: ManifestItemDef): Element {
  return DAMAGE_TYPE_TO_ELEMENT[def.defaultDamageType ?? 0] ?? "none";
}

/** Human rarity label ("Exotic", "Legendary", …), or null. */
export function rarityOf(def: ManifestItemDef): string | null {
  return def.inventory?.tierTypeName ?? null;
}

/** Item type label ("Auto Rifle", "Helmet", …), or null. */
export function itemTypeOf(def: ManifestItemDef): string | null {
  return def.itemTypeDisplayName ?? null;
}

// --- Indexing & matching --------------------------------------------------

/**
 * Index the manifest item table by hash and by lowercased name. Redacted
 * definitions are dropped — they carry no usable display data.
 */
export function indexDefs(
  defs: Record<string, ManifestItemDef>,
): ManifestIndex {
  const byHash = new Map<number, ManifestItemDef>();
  const byName = new Map<string, ManifestItemDef[]>();
  for (const def of Object.values(defs)) {
    if (def.redacted) continue;
    byHash.set(def.hash, def);
    const name = def.displayProperties?.name?.toLowerCase().trim();
    if (!name) continue;
    const bucket = byName.get(name);
    if (bucket) bucket.push(def);
    else byName.set(name, [def]);
  }
  return { byHash, byName };
}

/**
 * Resolve a curated entity to a manifest definition. A known Bungie hash wins
 * outright; otherwise fall back to an exact name match, preferring a candidate
 * that actually has an icon and, among those, the highest rarity tier (so an
 * exotic resolves to its real art rather than a same-named blue).
 */
export function matchEntity(
  row: EnrichableEntity,
  index: ManifestIndex,
): ManifestItemDef | undefined {
  if (row.hash != null) {
    const byHash = index.byHash.get(row.hash);
    if (byHash) return byHash;
  }
  const candidates = index.byName.get(row.name.toLowerCase().trim()) ?? [];
  return candidates
    .filter((c) => c.displayProperties?.icon)
    .sort((a, b) => (b.inventory?.tierType ?? 0) - (a.inventory?.tierType ?? 0))[0];
}

/**
 * Build the update patch for a matched entity. Manifest art (icon + watermark)
 * and the resolved hash are always applied; official metadata is only
 * backfilled where the curator left it empty, so hand-authored values win.
 * Returns null when the def has no icon (nothing worth writing).
 */
export function normalizeEntity(
  row: EnrichableEntity,
  def: ManifestItemDef,
): EntityPatch | null {
  const icon = def.displayProperties?.icon;
  if (!icon) return null;

  const patch: EntityPatch = {
    hash: row.hash ?? def.hash,
    iconPath: icon,
    iconWatermark: watermarkOf(def),
  };

  if (!row.officialDescription && def.displayProperties?.description) {
    patch.officialDescription = def.displayProperties.description;
  }
  if (!row.damageElement || row.damageElement === "none") {
    const el = elementOf(def);
    if (el !== "none") patch.damageElement = el;
  }
  if (!row.rarity) {
    const rarity = rarityOf(def);
    if (rarity) patch.rarity = rarity;
  }
  if (!row.itemType) {
    const itemType = itemTypeOf(def);
    if (itemType) patch.itemType = itemType;
  }
  return patch;
}

/**
 * Whether an ingest run should proceed. Skips when the live manifest version
 * matches the last one we ingested, unless the caller forces a re-run.
 */
export function needsIngest(
  fetchedVersion: string,
  storedVersion: string | null,
  force: boolean,
): boolean {
  if (force) return true;
  return fetchedVersion !== storedVersion;
}

// --- Network shell (the only bungie.net I/O) ------------------------------

async function bungieFetch(path: string, apiKey: string): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${BUNGIE}${path}`;
  const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Fetch the manifest index: its version and the item-table content path. */
export async function fetchManifestIndex(
  apiKey: string,
): Promise<{ version: string; itemDefPath: string }> {
  const manifest = (await bungieFetch(
    "/Platform/Destiny2/Manifest/",
    apiKey,
  )) as {
    Response?: {
      version?: string;
      jsonWorldComponentContentPaths?: Record<string, Record<string, string>>;
    };
  };
  const version = manifest.Response?.version;
  const itemDefPath =
    manifest.Response?.jsonWorldComponentContentPaths?.en
      ?.DestinyInventoryItemDefinition;
  if (!version || !itemDefPath) {
    throw new Error("Manifest index missing version or item-table path");
  }
  return { version, itemDefPath };
}

/** Download the (large) DestinyInventoryItemDefinition table. */
export async function fetchItemDefinitions(
  itemDefPath: string,
  apiKey: string,
): Promise<Record<string, ManifestItemDef>> {
  return (await bungieFetch(itemDefPath, apiKey)) as Record<
    string,
    ManifestItemDef
  >;
}
