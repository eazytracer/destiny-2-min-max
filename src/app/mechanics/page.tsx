import Link from "next/link";
import { listMechanics } from "@/lib/queries";
import { FilterBar } from "@/components/FilterBar";
import {
  ELEMENT_LABEL,
  parseFilters,
  filtersToQuery,
  type Element,
} from "@/lib/types";

export const metadata = {
  title: "Mechanics · Synergy Explorer",
};

export default async function MechanicsIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const mechanics = await listMechanics();
  const filters = parseFilters(await searchParams);
  const qs = new URLSearchParams(filtersToQuery(filters)).toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <div>
      <p className="eyebrow">Mechanics</p>
      <h1>Sandbox mechanics</h1>
      <p className="lede">
        Resources, pickups, buffs, debuffs, and constructs. Open one to see
        everything that generates it and everything that benefits from it.
      </p>

      <FilterBar filters={filters} />

      <div className="chips" style={{ marginTop: 24 }}>
        {mechanics.map((m) => {
          const el = (m.element ?? "none") as Element;
          return (
            <Link
              key={m.slug}
              href={`/mechanics/${m.slug}${suffix}`}
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
