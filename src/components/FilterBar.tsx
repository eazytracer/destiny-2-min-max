"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  GUARDIAN_CLASSES,
  SUBCLASS_ELEMENTS,
  CLASS_LABEL,
  ELEMENT_LABEL,
  filtersToQuery,
  type Filters,
} from "@/lib/types";

const CLASS_GLYPH: Record<string, string> = {
  titan: "🛡️",
  hunter: "🗡️",
  warlock: "🔮",
};

/**
 * Persistent class + subclass filter controls. State lives entirely in the URL
 * (?class=&subclass=) so any filtered view is shareable (§9). The component is
 * given the current filters as props and only needs the router to write new
 * ones — no useSearchParams, so no Suspense boundary is required.
 */
export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(next: Filters) {
    const qs = new URLSearchParams(filtersToQuery(next)).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const toggleClass = (c: (typeof GUARDIAN_CLASSES)[number]) =>
    apply({ ...filters, class: filters.class === c ? undefined : c });
  const toggleSubclass = (s: (typeof SUBCLASS_ELEMENTS)[number]) =>
    apply({ ...filters, subclass: filters.subclass === s ? undefined : s });

  const hasAny = filters.class || filters.subclass;

  return (
    <div className="filterbar">
      <div className="filter-group">
        <span className="filter-label">Class</span>
        {GUARDIAN_CLASSES.map((c) => (
          <button
            key={c}
            type="button"
            className={`filter-chip ${filters.class === c ? "on" : ""}`}
            aria-pressed={filters.class === c}
            onClick={() => toggleClass(c)}
          >
            <span className="glyph">{CLASS_GLYPH[c]}</span>
            {CLASS_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="filter-group">
        <span className="filter-label">Subclass</span>
        {SUBCLASS_ELEMENTS.map((s) => (
          <button
            key={s}
            type="button"
            data-el={s}
            className={`filter-chip el ${filters.subclass === s ? "on" : ""}`}
            aria-pressed={filters.subclass === s}
            onClick={() => toggleSubclass(s)}
          >
            {ELEMENT_LABEL[s]}
          </button>
        ))}
      </div>

      {hasAny && (
        <button type="button" className="filter-clear" onClick={() => apply({})}>
          Clear
        </button>
      )}
    </div>
  );
}
