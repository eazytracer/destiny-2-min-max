import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntityBySlug, getEntityRelations } from "@/lib/queries";
import { EntityIcon } from "@/components/EntityIcon";
import { ItemRelationRow } from "@/components/ItemRelationRow";
import {
  CLASS_LABEL,
  ELEMENT_LABEL,
  ENTITY_TYPE_LABEL,
  type Element,
  type EntityType,
  type GuardianClass,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getEntityBySlug(slug);
  return {
    title: item ? `${item.name} · Synergy Explorer` : "Item · Synergy Explorer",
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getEntityBySlug(slug);
  if (!item) notFound();

  const relations = await getEntityRelations(item.id);
  const el = (item.damageElement ?? "none") as Element;
  const cls = (item.classRestriction ?? "any") as GuardianClass;

  return (
    <div data-el={el}>
      <p className="eyebrow">
        <Link href="/mechanics">Mechanics</Link> / {item.name}
      </p>

      <header className="mech-header">
        <EntityIcon
          iconPath={item.iconPath}
          iconWatermark={item.iconWatermark}
          glyph={item.icon}
          alt={item.name}
          size={64}
        />
        <div>
          <h1>{item.name}</h1>
          <div className="meta-row">
            <span className="tag">{ENTITY_TYPE_LABEL[item.entityType as EntityType]}</span>
            {el !== "none" && <span className="el-pill">{ELEMENT_LABEL[el]}</span>}
            {item.rarity && <span className="tag">{item.rarity}</span>}
            {item.itemType && <span className="tag">{item.itemType}</span>}
            {cls !== "any" && <span className="tag">{CLASS_LABEL[cls]}</span>}
          </div>
          {item.officialDescription && (
            <div className="desc-block">
              <div className="desc">
                <div className="label">Official</div>
                <p>{item.officialDescription}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="section" style={{ marginTop: 24 }}>
        <div className="column-head generate">
          <span>Relationships</span>
          <span className="count">{relations.length}</span>
        </div>
        {relations.length === 0 ? (
          <div className="notice">
            No published relationships are catalogued for{" "}
            <strong>{item.name}</strong> yet.
          </div>
        ) : (
          relations.map((rel) => <ItemRelationRow key={rel.id} rel={rel} />)
        )}
      </div>
    </div>
  );
}
