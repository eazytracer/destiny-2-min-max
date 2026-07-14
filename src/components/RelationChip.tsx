import Link from "next/link";
import type { RelationView } from "@/lib/queries";
import type { Mechanic } from "@/db/schema";
import { EntityIcon } from "@/components/EntityIcon";
import { RelationCard } from "@/components/RelationCard";
import { DIRECTNESS_LABEL, type Element, type ExplorerColumn } from "@/lib/types";

/**
 * Compact, DIM-like representation of one relationship: just the item's icon,
 * with a corner dot encoding directness (so the "never equally certain"
 * principle survives the condensed view). Hover or focus reveals the full
 * detailed card; the icon links through to the item's dossier page.
 */
export function RelationChip({
  rel,
  mechanic,
  column,
}: {
  rel: RelationView;
  mechanic: Mechanic;
  column: ExplorerColumn;
}) {
  const el = (rel.subject.damageElement ?? "none") as Element;

  return (
    <div className="rel-chip" data-el={el} data-col={column}>
      <Link
        href={`/items/${rel.subject.slug}`}
        className="rel-chip-btn"
        aria-label={`${rel.subject.name} — ${DIRECTNESS_LABEL[rel.directness]}`}
      >
        <EntityIcon
          iconPath={rel.subject.iconPath}
          iconWatermark={rel.subject.iconWatermark}
          glyph={rel.subject.icon}
          alt={rel.subject.name}
          size={52}
        />
        <span className={`rel-chip-dot ${rel.directness}`} aria-hidden="true" />
      </Link>
      <div className="rel-popover" role="tooltip">
        <RelationCard rel={rel} mechanic={mechanic} column={column} />
      </div>
    </div>
  );
}
