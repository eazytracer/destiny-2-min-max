import { describe, expect, it } from "vitest";
import {
  elementOf,
  indexDefs,
  matchEntity,
  needsIngest,
  normalizeEntity,
  rarityOf,
  watermarkOf,
  type EnrichableEntity,
  type ManifestItemDef,
} from "./manifest";

/** A minimal well-formed definition; override fields per test. */
function def(overrides: Partial<ManifestItemDef> = {}): ManifestItemDef {
  return {
    hash: 1,
    displayProperties: { name: "Thing", icon: "/icon.jpg" },
    ...overrides,
  };
}

/** A curated row with everything empty (worst case for backfill). */
function row(overrides: Partial<EnrichableEntity> = {}): EnrichableEntity {
  return {
    hash: null,
    name: "Thing",
    officialDescription: null,
    damageElement: null,
    rarity: null,
    itemType: null,
    ...overrides,
  };
}

describe("watermarkOf", () => {
  it("prefers the top-level iconWatermark", () => {
    expect(watermarkOf(def({ iconWatermark: "/wm.png" }))).toBe("/wm.png");
  });

  it("falls back to the current version's quality watermark", () => {
    const d = def({
      quality: { currentVersion: 1, displayVersionWatermarkIcons: ["/a", "/b"] },
    });
    expect(watermarkOf(d)).toBe("/b");
  });

  it("returns null when no watermark is present", () => {
    expect(watermarkOf(def())).toBeNull();
  });
});

describe("elementOf", () => {
  it("maps known Bungie damage types", () => {
    expect(elementOf(def({ defaultDamageType: 2 }))).toBe("arc");
    expect(elementOf(def({ defaultDamageType: 3 }))).toBe("solar");
    expect(elementOf(def({ defaultDamageType: 6 }))).toBe("stasis");
  });

  it("returns 'none' for missing or unknown types", () => {
    expect(elementOf(def())).toBe("none");
    expect(elementOf(def({ defaultDamageType: 5 }))).toBe("none"); // Raid
  });
});

describe("rarityOf", () => {
  it("reads the tier type name", () => {
    expect(rarityOf(def({ inventory: { tierTypeName: "Exotic" } }))).toBe(
      "Exotic",
    );
  });

  it("returns null when absent", () => {
    expect(rarityOf(def())).toBeNull();
  });
});

describe("indexDefs", () => {
  it("indexes by hash and lowercased name, skipping redacted", () => {
    const index = indexDefs({
      "1": def({ hash: 1, displayProperties: { name: "Riskrunner" } }),
      "2": def({ hash: 2, redacted: true, displayProperties: { name: "Hidden" } }),
    });
    expect(index.byHash.has(1)).toBe(true);
    expect(index.byHash.has(2)).toBe(false);
    expect(index.byName.get("riskrunner")?.[0].hash).toBe(1);
  });

  it("groups same-named definitions into one bucket", () => {
    const index = indexDefs({
      "1": def({ hash: 1, displayProperties: { name: "Dupe" } }),
      "2": def({ hash: 2, displayProperties: { name: "Dupe" } }),
    });
    expect(index.byName.get("dupe")).toHaveLength(2);
  });
});

describe("matchEntity", () => {
  it("resolves by hash first, ignoring the name index", () => {
    const target = def({ hash: 42, displayProperties: { name: "Renamed" } });
    const index = indexDefs({ "42": target });
    expect(matchEntity(row({ hash: 42, name: "Anything" }), index)).toBe(target);
  });

  it("falls back to an exact name match", () => {
    const index = indexDefs({ "1": def({ hash: 1, displayProperties: { name: "Centrifuse", icon: "/c.jpg" } }) });
    expect(matchEntity(row({ name: "Centrifuse" }), index)?.hash).toBe(1);
  });

  it("prefers an icon-bearing, higher-tier candidate when names collide", () => {
    const index = indexDefs({
      "1": def({ hash: 1, displayProperties: { name: "Dupe" } }), // no icon
      "2": def({ hash: 2, displayProperties: { name: "Dupe", icon: "/legendary.jpg" }, inventory: { tierType: 5 } }),
      "3": def({ hash: 3, displayProperties: { name: "Dupe", icon: "/exotic.jpg" }, inventory: { tierType: 6 } }),
    });
    expect(matchEntity(row({ name: "Dupe" }), index)?.hash).toBe(3);
  });

  it("returns undefined when nothing matches", () => {
    const index = indexDefs({ "1": def({ displayProperties: { name: "Other" } }) });
    expect(matchEntity(row({ name: "Missing" }), index)).toBeUndefined();
  });
});

describe("normalizeEntity", () => {
  it("always applies hash, icon, and watermark", () => {
    const patch = normalizeEntity(
      row(),
      def({ hash: 7, iconWatermark: "/wm.png", displayProperties: { icon: "/i.jpg" } }),
    );
    expect(patch).toMatchObject({ hash: 7, iconPath: "/i.jpg", iconWatermark: "/wm.png" });
  });

  it("backfills empty metadata from the manifest", () => {
    const patch = normalizeEntity(
      row(),
      def({
        defaultDamageType: 2,
        itemTypeDisplayName: "Auto Rifle",
        inventory: { tierTypeName: "Exotic" },
        displayProperties: { name: "Thing", icon: "/i.jpg", description: "Boom." },
      }),
    );
    expect(patch).toMatchObject({
      damageElement: "arc",
      rarity: "Exotic",
      itemType: "Auto Rifle",
      officialDescription: "Boom.",
    });
  });

  it("never overwrites curator-authored metadata", () => {
    const patch = normalizeEntity(
      row({ officialDescription: "Curated.", damageElement: "arc", rarity: "Exotic", itemType: "SMG" }),
      def({
        defaultDamageType: 3,
        itemTypeDisplayName: "Auto Rifle",
        inventory: { tierTypeName: "Legendary" },
        displayProperties: { name: "Thing", icon: "/i.jpg", description: "Manifest." },
      }),
    );
    expect(patch?.officialDescription).toBeUndefined();
    expect(patch?.damageElement).toBeUndefined();
    expect(patch?.rarity).toBeUndefined();
    expect(patch?.itemType).toBeUndefined();
  });

  it("keeps the curated hash when the row already has one", () => {
    const patch = normalizeEntity(row({ hash: 99 }), def({ hash: 1 }));
    expect(patch?.hash).toBe(99);
  });

  it("returns null when the definition has no icon", () => {
    expect(normalizeEntity(row(), def({ displayProperties: { name: "Thing" } }))).toBeNull();
  });
});

describe("needsIngest", () => {
  it("always runs when forced", () => {
    expect(needsIngest("v2", "v2", true)).toBe(true);
  });

  it("skips when the version is unchanged", () => {
    expect(needsIngest("v2", "v2", false)).toBe(false);
  });

  it("runs on a new version or a first-ever ingest", () => {
    expect(needsIngest("v2", "v1", false)).toBe(true);
    expect(needsIngest("v2", null, false)).toBe(true);
  });
});
