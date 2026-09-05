"use client";

import { useEffect, useState } from "react";

const DEFAULT_LOGO = "/images/brand-mark.png";
let cachedLogo: string | null = null;

function FallbackGlassesIcon({ className = "" }: { className?: string }) {
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br from-[#1d1d24] to-[#0d0d12] text-[#4da3ff] ${className}`}
      aria-label="SHADESH.OPTICS"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[58%] h-[58%]"
      >
        <circle cx="6" cy="12" r="4" />
        <circle cx="18" cy="12" r="4" />
        <path d="M10 12h4" />
        <path d="M6 8l3-3" strokeOpacity="0.4" />
        <path d="M18 8l-3-3" strokeOpacity="0.4" />
      </svg>
    </div>
  );
}

/**
 * Renders the store logo from admin settings (uploaded data-URL or pasted URL),
 * falling back to the bundled brand mark, and if image fails to load, renders
 * a crisp SVG spectacles icon so alt text never overflows.
 */
export function BrandMark({
  className = "",
  alt = "SHADESH.OPTICS.Dhaka",
}: {
  className?: string;
  alt?: string;
}) {
  const [src, setSrc] = useState<string>(cachedLogo || DEFAULT_LOGO);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const url: unknown = d?.settings?.branding?.logoUrl;
        if (typeof url === "string" && url && alive) {
          cachedLogo = url;
          setSrc(url);
          setFailed(false);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (failed || !src) {
    return <FallbackGlassesIcon className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
