import type { RelationView } from "@/lib/queries";
import type { Mechanic } from "@/db/schema";
import {
  DIRECTNESS_LABEL,
  ENTITY_TYPE_LABEL,
  EVIDENCE_LABEL,
  ELEMENT_LABEL,
  type ExplorerColumn,
  type Element,
  type RelationCondition,
} from "@/lib/types";

/** Short, human phrase for the condition that gates a relationship. */
function triggerPhrase(cond: RelationCondition | null): string | null {
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

function conditionRows(cond: RelationCondition): { label: string; value: string }[] {
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

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function RelationCard({
  rel,
  mechanic,
  column,
}: {
  rel: RelationView;
  mechanic: Mechanic;
  column: ExplorerColumn;
}) {
  const el = (rel.subject.damageElement ?? "none") as Element;
  const trigger = triggerPhrase(rel.condition);
  const mechEl = (mechanic.element ?? "none") as Element;

  // Relationship path — reads left→right for generators, and from the mechanic
  // outward for consumers/benefits (proposal §8.4).
  const pathNodes =
    column === "generate"
      ? [
          { text: rel.subject.name, cls: "" },
          ...(trigger ? [{ text: trigger, cls: "" }] : []),
          { text: mechanic.name, cls: "mech" },
        ]
      : [
          { text: mechanic.name, cls: "mech" },
          ...(trigger ? [{ text: trigger, cls: "" }] : []),
          { text: rel.subject.name, cls: "" },
        ];

  const rows = rel.condition ? conditionRows(rel.condition) : [];

  return (
    <article className="rel-card" data-el={el}>
      <div className="rel-top">
        <span className="rel-glyph">{rel.subject.icon ?? "◆"}</span>
        <div>
          <div className="rel-name">{rel.subject.name}</div>
          <div className="rel-type">
            {ENTITY_TYPE_LABEL[rel.subject.entityType]}
            {rel.subject.damageElement && rel.subject.damageElement !== "none"
              ? ` · ${ELEMENT_LABEL[el]}`
              : ""}
          </div>
        </div>
        <div className="rel-badges">
          <span className={`badge ${rel.directness}`}>
            {DIRECTNESS_LABEL[rel.directness]}
          </span>
        </div>
      </div>

      <p className="rel-explain">{rel.explanation}</p>

      <div className="rel-path" data-el={mechEl}>
        {pathNodes.map((n, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 && <span className="arrow">→</span>}
            <span className={`node ${n.cls}`}>{n.text}</span>
          </span>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="cond">
          {rows.map((r, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <b>{r.label}:</b> {r.value}
            </span>
          ))}
          {rel.condition?.notes && (
            <div style={{ marginTop: 4 }}>{rel.condition.notes}</div>
          )}
        </div>
      )}

      <div className="rel-meta">
        <span className={`badge mode`}>
          {rel.mode === "both" ? "PvE · PvP" : rel.mode.toUpperCase()}
        </span>
        <span className={`badge evidence ${rel.evidence}`}>
          {EVIDENCE_LABEL[rel.evidence]}
        </span>
        {rel.source && (
          <span className="badge evidence" title={rel.source.locator ?? ""}>
            {rel.source.provider}
          </span>
        )}
      </div>
    </article>
  );
}
