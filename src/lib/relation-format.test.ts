import { describe, expect, it } from "vitest";
import { cap, conditionRows, triggerPhrase } from "./relation-format";
import type { RelationCondition } from "@/lib/types";

describe("triggerPhrase", () => {
  it("returns null without a condition", () => {
    expect(triggerPhrase(null)).toBeNull();
  });

  it("prefers an explicit trigger type", () => {
    expect(triggerPhrase({ triggerType: "static charge discharge" })).toBe(
      "static charge discharge",
    );
  });

  it("describes a target debuff", () => {
    expect(triggerPhrase({ targetDebuff: "jolt" })).toBe("defeat jolt target");
  });

  it("combines an elemental final blow", () => {
    expect(triggerPhrase({ finalBlow: true, requiredElement: "arc" })).toBe(
      "Arc weapon final blow",
    );
  });

  it("falls back to a bare final blow", () => {
    expect(triggerPhrase({ finalBlow: true })).toBe("final blow");
  });

  it("returns null when nothing maps", () => {
    expect(triggerPhrase({ requiredClass: "warlock" })).toBeNull();
  });
});

describe("conditionRows", () => {
  it("drops the 'any' class sentinel", () => {
    expect(conditionRows({ requiredClass: "any" })).toEqual([]);
  });

  it("labels and orders the fields it recognises", () => {
    const cond: RelationCondition = {
      requiredClass: "warlock",
      requiredSubclass: "arc",
      chancePercent: 30,
      durationSeconds: 6,
    };
    expect(conditionRows(cond)).toEqual([
      { label: "Class", value: "Warlock" },
      { label: "Subclass", value: "Arc" },
      { label: "Chance", value: "30%" },
      { label: "Duration", value: "6s" },
    ]);
  });

  it("ignores free-form notes (rendered separately)", () => {
    expect(conditionRows({ notes: "chance-based" })).toEqual([]);
  });
});

describe("cap", () => {
  it("capitalises the first letter only", () => {
    expect(cap("warlock")).toBe("Warlock");
    expect(cap("")).toBe("");
  });
});
