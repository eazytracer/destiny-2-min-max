import Link from "next/link";
import { listMechanics } from "@/lib/queries";
import { ELEMENT_LABEL, type Element } from "@/lib/types";

export const metadata = {
  title: "Mechanics · Synergy Explorer",
};

export default async function MechanicsIndex() {
  const mechanics = await listMechanics();

  return (
    <div>
      <p className="eyebrow">Mechanics</p>
      <h1>Sandbox mechanics</h1>
      <p className="lede">
        Resources, pickups, buffs, debuffs, and constructs. Open one to see
        everything that generates it and everything that benefits from it.
      </p>

      <div className="chips" style={{ marginTop: 24 }}>
        {mechanics.map((m) => {
          const el = (m.element ?? "none") as Element;
          return (
            <Link
              key={m.slug}
              href={`/mechanics/${m.slug}`}
              className="chip"
              data-el={el}
            >
              <span className="glyph">{m.icon ?? "◆"}</span>
              {m.name}
              <span style={{ color: "var(--text-faint)", fontSize: 11 }}>
                {m.category}
                {el !== "none" ? ` · ${ELEMENT_LABEL[el]}` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
