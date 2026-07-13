"use client";

import { useState } from "react";

const BUNGIE = "https://www.bungie.net";

function toUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BUNGIE}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Renders an item's real Bungie CDN icon (with the season/rarity watermark
 * overlaid, DIM-style) and falls back to the emoji glyph when there is no
 * ingested art or the image fails to load.
 */
export function EntityIcon({
  iconPath,
  iconWatermark,
  glyph,
  alt,
  size = 40,
}: {
  iconPath?: string | null;
  iconWatermark?: string | null;
  glyph?: string | null;
  alt: string;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = iconPath && !errored;

  return (
    <span
      className="entity-icon-box"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      aria-label={alt}
    >
      {showImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={toUrl(iconPath)}
            alt={alt}
            width={size}
            height={size}
            loading="lazy"
            onError={() => setErrored(true)}
          />
          {iconWatermark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="watermark"
              src={toUrl(iconWatermark)}
              alt=""
              aria-hidden="true"
              width={size}
              height={size}
              loading="lazy"
            />
          )}
        </>
      ) : (
        <span className="glyph-fallback">{glyph ?? "◆"}</span>
      )}
    </span>
  );
}
