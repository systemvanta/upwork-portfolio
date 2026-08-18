import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { site } from "@/data/site";

export function ClientHeader({ shareKey }: { shareKey: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center px-6 py-3">
        <Link href={`/v/${shareKey}`} className="inline-flex items-center gap-3">
          <SiteLogo size={36} />
          <span className="text-[17px] font-semibold tracking-tight text-ink">
            {site.name}
          </span>
        </Link>
      </div>
    </header>
  );
}