import Link from "next/link";
import { listMechanics } from "@/lib/queries";
import { ELEMENT_LABEL, type Element } from "@/lib/types";

export default async function HomePage() {
  const mechanics = await listMechanics();

  return (
    <div>
      <p className="eyebrow">Destiny 2 · Build Synergy Explorer</p>
      <h1>What do you want to build around?</h1>
      <p className="lede">
        Start with an item to discover everything that enhances it, or start
        with a mechanic to see what generates it and what benefits from it.
        Every recommendation explains its trigger, restrictions, relationship
        type, and source.
      </p>

      <div className="entry-grid">
        {/* Build around an item — scaffolded; first live slice is the mechanic side. */}
        <section className="entry-card">
          <div className="entry-icon">🔫</div>
          <h3>Build around an item</h3>
          <p>
            Select a weapon, weapon family, archetype, exotic, subclass,
            artifact, or perk to see every effect that enhances it.
          </p>
          <div className="tags">
            {["Weapon", "Weapon family", "Exotic armor", "Armor set", "Subclass", "Perk"].map(
              (t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ),
            )}
          </div>
          <p style={{ marginTop: 14, color: "var(--text-faint)", fontSize: 13 }}>
            Weapon Explorer arrives next in Phase 1 — this build ships the
            mechanic side end-to-end.
          </p>
        </section>

        {/* Build around a mechanic — live. */}
        <section className="entry-card" data-el="arc" style={{ borderColor: "var(--border-strong)" }}>
          <div className="entry-icon">⚡</div>
          <h3>Build around a mechanic</h3>
          <p>
            Select a resource, buff, debuff, or construct to see a two-sided
            view: everything that generates or applies it, and everything that
            consumes, extends, or benefits from it.
          </p>
          <div className="chips">
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
                  {el !== "none" && (
                    <span style={{ color: "var(--text-faint)", fontSize: 11 }}>
                      {ELEMENT_LABEL[el]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
        Tip: the{" "}
        <Link href="/mechanics/ionic-trace" style={{ color: "var(--arc)" }}>
          Ionic Trace explorer
        </Link>{" "}
        is the fully catalogued example.
      </p>
    </div>
  );
}
