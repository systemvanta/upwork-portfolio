import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";

export function ClientHeader({ shareKey }: { shareKey: string }) {
  return (
    <header className="sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="header-shell rounded-full bg-white/85 px-5 py-3 shadow-[0_8px_30px_rgba(31,30,30,0.06)] backdrop-blur-md">
          <Link href={`/v/${shareKey}`}>
            <SiteLogo />
          </Link>
        </div>
      </div>
    </header>
  );
}
