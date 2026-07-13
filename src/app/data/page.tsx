import { listSources } from "@/lib/queries";
import { EVIDENCE_LABEL, type Evidence } from "@/lib/types";

export const metadata = {
  title: "Data & Sources · Synergy Explorer",
};

export default async function DataPage() {
  const sources = await listSources();

  return (
    <div>
      <p className="eyebrow">Data &amp; Sources</p>
      <h1>Where this data comes from</h1>
      <p className="lede">
        Canonical identities originate from the Bungie Destiny Manifest.
        Community-researched values are stored separately and labelled as
        Community Insight. Every relationship carries a directness level, an
        evidence level, and an attribution — the app never presents editorial
        interpretation as official fact.
      </p>

      <h2 style={{ margin: "28px 0 12px" }}>Evidence levels</h2>
      <div className="chips">
        {(
          [
            "official",
            "community_tested",
            "derived",
            "editorial",
            "unverified",
          ] as Evidence[]
        ).map((e) => (
          <span className={`badge evidence ${e}`} key={e}>
            {EVIDENCE_LABEL[e]}
          </span>
        ))}
      </div>

      <h2 style={{ margin: "28px 0 12px" }}>Sources in this build</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {sources.map((s) => (
          <div
            key={s.id}
            className="rel-card"
            style={{ borderLeftColor: "var(--border)" }}
          >
            <div className="rel-top">
              <div>
                <div className="rel-name">{s.provider}</div>
                <div className="rel-type">
                  {s.sourceType}
                  {s.version ? ` · ${s.version}` : ""}
                  {s.applicablePatch ? ` · ${s.applicablePatch}` : ""}
                </div>
              </div>
              <div className="rel-badges">
                <span className={`badge evidence ${s.evidence}`}>
                  {EVIDENCE_LABEL[s.evidence]}
                </span>
              </div>
            </div>
            {s.locator && <p className="rel-explain">{s.locator}</p>}
            {s.license && (
              <div className="cond">
                <b>License / attribution:</b> {s.license}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="notice" style={{ marginTop: 28 }}>
        <strong>Versioning.</strong> Bungie&rsquo;s final live-service update
        (Monument of Triumph, June 9 2026) and the June 23 2026 hotfix changed
        artifacts, catalysts, and buildcrafting. Game data is therefore treated
        as versioned rather than frozen: each record tracks the manifest version
        and applicable patch it was captured under.
      </div>
    </div>
  );
}
