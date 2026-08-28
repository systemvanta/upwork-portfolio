import Link from "next/link";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { SiteLogo } from "@/components/site-logo";

export async function Header({
  count,
  showSignIn = true,
}: {
  count?: number;
  showSignIn?: boolean;
}) {
  const session = await getSession();
  const home = session?.user ? "/projects" : "/";

  return (
    <header className="sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="header-shell flex items-center justify-between gap-4 rounded-full bg-white/85 px-5 py-3 shadow-[0_8px_30px_rgba(31,30,30,0.06)] backdrop-blur-md">
          <Link href={home} className="min-w-0">
            <SiteLogo
              subtitle={
                count !== undefined
                  ? `${count} ${count === 1 ? "project" : "projects"}`
                  : undefined
              }
            />
          </Link>
          {session?.user ? (
            <nav className="flex items-center gap-4 text-[14px]">
              <Link href="/projects" className="nav-link text-ink-dim transition-colors duration-200 hover:text-ink">
                Registry
              </Link>
              <Link href="/s" className="nav-link text-ink-dim transition-colors duration-200 hover:text-ink">
                Generate
              </Link>
              <Link href="/account" className="nav-link hidden text-ink-dim transition-colors duration-200 hover:text-ink sm:inline">
                Account
              </Link>
              <Link href="/projects/new" className="btn btn-primary !h-10 !px-4 !text-[14px]">
                Register
              </Link>
              <LogoutButton />
            </nav>
          ) : showSignIn ? (
            <Link href="/login" className="btn btn-primary !h-10 !px-4 !text-[14px]">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
