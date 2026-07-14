import Link from "next/link";
import type { EntityRelationView } from "@/lib/queries";
import { conditionRows } from "@/lib/relation-format";
import {
  DIRECTNESS_LABEL,
  ELEMENT_LABEL,
  EVIDENCE_LABEL,
  PREDICATE_LABEL,
  type Element,
} from "@/lib/types";

/**
 * One relationship on an item's dossier, oriented toward the mechanic it
 * touches (the mirror of RelationCard, which is oriented toward the item).
 */
export function ItemRelationRow({ rel }: { rel: EntityRelationView }) {
  const el = (rel.mechanic.element ?? "none") as Element;
  const rows = rel.condition ? conditionRows(rel.condition) : [];

  return (
    <article className="rel-card" data-el={el}>
      <div className="rel-top">
        <span className="mech-mini-glyph">{rel.mechanic.icon ?? "◆"}</span>
        <div>
          <Link
            href={`/mechanics/${rel.mechanic.slug}`}
            className="rel-name link"
          >
            {PREDICATE_LABEL[rel.predicate]} {rel.mechanic.name}
          </Link>
          <div className="rel-type">
            {ELEMENT_LABEL[el] !== "—" ? `${ELEMENT_LABEL[el]} · ` : ""}
            {rel.mechanic.category}
          </div>
        </div>
        <div className="rel-badges">
          <span className={`badge ${rel.directness}`}>
            {DIRECTNESS_LABEL[rel.directness]}
          </span>
        </div>
      </div>

      <p className="rel-explain">{rel.explanation}</p>

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
        <span className="badge mode">
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
