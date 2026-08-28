import { useId } from "react";
import { site } from "@/data/site";

export function SiteMark({
  className = "site-mark",
}: {
  className?: string;
}) {
  const id = `folio-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="6" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#97c4ae" />
          <stop offset="1" stopColor="#6e9d88" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <rect x="6" y="6" width="20" height="20" rx="5" fill="#fffcf6" />
      <rect x="8.2" y="8.2" width="7.2" height="7.2" rx="2" fill="#8fbcfa" />
      <rect x="16.6" y="8.2" width="7.2" height="7.2" rx="2" fill="#f49eff" />
      <rect x="8.2" y="16.6" width="7.2" height="7.2" rx="2" fill="#ffc753" />
      <rect x="16.6" y="16.6" width="7.2" height="7.2" rx="2" fill="#79deeb" />
    </svg>
  );
}

export function SiteLogo({
  subtitle,
  large = false,
  light = false,
}: {
  subtitle?: string;
  large?: boolean;
  light?: boolean;
}) {
  return (
    <span className={`inline-flex items-center ${large ? "flex-col gap-4" : "gap-2.5"}`}>
      <SiteMark className={large ? "site-mark site-mark-lg" : "site-mark"} />
      <span className={large ? "text-center" : "min-w-0"}>
        <span
          className={`block text-[16px] font-semibold tracking-tight ${light ? "text-white" : ""}`}
        >
          {site.name}
        </span>
        {subtitle ? (
          <span className={`mt-0.5 block text-[12px] ${light ? "text-white/75" : "text-mist"}`}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
