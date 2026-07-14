import Link from "next/link";
import type { RelationView } from "@/lib/queries";
import type { Mechanic } from "@/db/schema";
import { EntityIcon } from "@/components/EntityIcon";
import { conditionRows, triggerPhrase } from "@/lib/relation-format";
import {
  DIRECTNESS_LABEL,
  ENTITY_TYPE_LABEL,
  EVIDENCE_LABEL,
  ELEMENT_LABEL,
  type ExplorerColumn,
  type Element,
} from "@/lib/types";

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
        <EntityIcon
          iconPath={rel.subject.iconPath}
          iconWatermark={rel.subject.iconWatermark}
          glyph={rel.subject.icon}
          alt={rel.subject.name}
          size={40}
        />
        <div>
          <Link href={`/items/${rel.subject.slug}`} className="rel-name link">
            {rel.subject.name}
          </Link>
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
