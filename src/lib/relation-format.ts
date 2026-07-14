/**
 * Presentation helpers for a relationship's condition — shared by the compact
 * card/popover and the item dossier page so the two never drift.
 */
import { ELEMENT_LABEL, type RelationCondition } from "@/lib/types";

/** Short, human phrase for the condition that gates a relationship. */
export function triggerPhrase(cond: RelationCondition | null): string | null {
  if (!cond) return null;
  if (cond.triggerType) return cond.triggerType;
  if (cond.targetDebuff) return `defeat ${cond.targetDebuff} target`;
  if (cond.requiredBuff) return `with ${cond.requiredBuff}`;
  if (cond.finalBlow && cond.requiredElement) {
    return `${ELEMENT_LABEL[cond.requiredElement]} weapon final blow`;
  }
  if (cond.finalBlow) return "final blow";
  return null;
}

/** Flatten a condition into labelled rows for display. */
export function conditionRows(
  cond: RelationCondition,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (cond.requiredClass && cond.requiredClass !== "any")
    rows.push({ label: "Class", value: cap(cond.requiredClass) });
  if (cond.requiredSubclass)
    rows.push({ label: "Subclass", value: ELEMENT_LABEL[cond.requiredSubclass] });
  if (cond.requiredElement)
    rows.push({ label: "Weapon element", value: ELEMENT_LABEL[cond.requiredElement] });
  if (cond.requiredWeaponFamily)
    rows.push({ label: "Weapon family", value: cond.requiredWeaponFamily });
  if (cond.targetDebuff)
    rows.push({ label: "Target", value: `${cond.targetDebuff}` });
  if (cond.requiredBuff)
    rows.push({ label: "Requires", value: cond.requiredBuff });
  if (cond.chancePercent !== undefined)
    rows.push({ label: "Chance", value: `${cond.chancePercent}%` });
  if (cond.cooldownSeconds !== undefined)
    rows.push({ label: "Cooldown", value: `${cond.cooldownSeconds}s` });
  if (cond.durationSeconds !== undefined)
    rows.push({ label: "Duration", value: `${cond.durationSeconds}s` });
  if (cond.stackCap !== undefined)
    rows.push({ label: "Stack cap", value: `${cond.stackCap}` });
  if (cond.activityRestriction)
    rows.push({ label: "Activity", value: cond.activityRestriction });
  return rows;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
