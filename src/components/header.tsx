import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { site } from "@/data/site";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

export async function Header({ count }: { count?: number }) {
  const session = await getSession();
  const home = session?.user ? "/projects" : "/";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href={home} className="group flex items-center gap-3">
          <SiteLogo size={36} />
          <span>
            <span className="block text-[17px] font-semibold tracking-tight text-ink">
              {site.name}
            </span>
            {count !== undefined ? (
              <span className="mt-0.5 block text-[12px] text-mist">
                {count} {count === 1 ? "project" : "projects"}
              </span>
            ) : null}
          </span>
        </Link>
        {session?.user ? (
          <nav className="flex items-center gap-4 text-[15px]">
            <Link href="/projects" className="text-ink-dim hover:text-ink">
              Registry
            </Link>
            <Link href="/s" className="text-ink-dim hover:text-ink">
              Generate
            </Link>
            <Link href="/account" className="text-ink-dim hover:text-ink">
              Account
            </Link>
            <Link href="/projects/new" className="btn btn-primary !px-3.5 !py-2 !text-[13px]">
              Register
            </Link>
            <LogoutButton />
          </nav>
        ) : null}
      </div>
    </header>
  );
}
