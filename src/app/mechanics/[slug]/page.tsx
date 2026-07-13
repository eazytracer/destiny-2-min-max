import Link from "next/link";
import { notFound } from "next/navigation";
import { getMechanicExplorer, listMechanics } from "@/lib/queries";
import { RelationCard } from "@/components/RelationCard";
import { ELEMENT_LABEL, type Element } from "@/lib/types";

export async function generateStaticParams() {
  const mechanics = await listMechanics();
  return mechanics.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getMechanicExplorer(slug);
  return {
    title: data
      ? `${data.mechanic.name} · Synergy Explorer`
      : "Mechanic · Synergy Explorer",
  };
}

export default async function MechanicExplorerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getMechanicExplorer(slug);
  if (!data) notFound();

  const { mechanic: m, columns, total } = data;
  const el = (m.element ?? "none") as Element;

  const generateCount = columns.generate.reduce(
    (n, s) => n + s.relations.length,
    0,
  );
  const benefitCount = columns.benefit.reduce(
    (n, s) => n + s.relations.length,
    0,
  );

  return (
    <div data-el={el}>
      <p className="eyebrow">
        <Link href="/mechanics">Mechanics</Link> / {m.name}
      </p>

      {/* Header (proposal §8.4) */}
      <header className="mech-header">
        <div className="mech-glyph">{m.icon ?? "◆"}</div>
        <div>
          <h1>{m.name}</h1>
          <div className="meta-row">
            <span className="el-pill">
              {ELEMENT_LABEL[el]} · {m.category}
            </span>
            {m.stackBehavior && (
              <span className="tag">Stacking: see below</span>
            )}
            {m.defaultDurationSeconds != null && (
              <span className="tag">~{m.defaultDurationSeconds}s</span>
            )}
          </div>
          {m.baselineEffect && (
            <p style={{ margin: "6px 0 0", fontSize: 15 }}>{m.baselineEffect}</p>
          )}
          <div className="desc-block">
            {m.officialDescription && (
              <div className="desc">
                <div className="label">Official</div>
                <p>{m.officialDescription}</p>
              </div>
            )}
            {m.communityDescription && (
              <div className="desc community">
                <div className="label">Community insight</div>
                <p>{m.communityDescription}</p>
              </div>
            )}
            {m.stackBehavior && (
              <div className="desc">
                <div className="label">Stack behaviour</div>
                <p>{m.stackBehavior}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="notice" style={{ marginTop: 24 }}>
          Relationships for <strong>{m.name}</strong> are still being
          catalogued. This mechanic exists in the ontology, but its typed
          generators and consumers haven&rsquo;t been reviewed and published
          yet. The{" "}
          <Link href="/mechanics/ionic-trace" style={{ color: "var(--arc)" }}>
            Ionic Trace explorer
          </Link>{" "}
          shows the fully populated view.
        </div>
      ) : (
        <div className="explorer">
          {/* LEFT — generate / apply */}
          <div>
            <div className="column-head generate">
              <span>◤ Generate or apply</span>
              <span className="count">{generateCount}</span>
            </div>
            {columns.generate.length === 0 ? (
              <p className="rel-type">No catalogued generators yet.</p>
            ) : (
              columns.generate.map((section) => (
                <div className="section" key={section.key}>
                  <h3 className="section-title">{section.title}</h3>
                  {section.relations.map((rel) => (
                    <RelationCard
                      key={rel.id}
                      rel={rel}
                      mechanic={m}
                      column="generate"
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* RIGHT — spend / benefit */}
          <div>
            <div className="column-head benefit">
              <span>Spend or benefit ◥</span>
              <span className="count">{benefitCount}</span>
            </div>
            {columns.benefit.length === 0 ? (
              <p className="rel-type">No catalogued consumers yet.</p>
            ) : (
              columns.benefit.map((section) => (
                <div className="section" key={section.key}>
                  <h3 className="section-title">{section.title}</h3>
                  {section.relations.map((rel) => (
                    <RelationCard
                      key={rel.id}
                      rel={rel}
                      mechanic={m}
                      column="benefit"
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
