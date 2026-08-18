import { site } from "@/data/site";

export function SiteLogo({
  size = 36,
  withWordmark = false,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className="relative grid shrink-0 place-items-center"
        style={{ width: size, height: size }}
      >
        <span
          aria-hidden
          className="absolute inset-[8%] rounded-[28%] bg-brass/40 blur-md"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.png?v=2"
          alt=""
          width={size}
          height={size}
          className="relative h-full w-full"
        />
      </span>
      {withWordmark ? (
        <span className="block text-[17px] font-semibold tracking-tight text-ink">
          {site.name}
        </span>
      ) : null}
    </span>
  );
}
