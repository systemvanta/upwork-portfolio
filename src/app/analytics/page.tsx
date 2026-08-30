import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPublishedCountsByCategory } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

function CountBar({ count, max }: { count: number; max: number }) {
  const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 6 : 0) : 0;
  return (
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill"
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-brass transition-[width] duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function CategoryRow({
  slug,
  label,
  count,
  max,
  linkable = true,
}: {
  slug: string;
  label: string;
  count: number;
  max: number;
  linkable?: boolean;
}) {
  return (
    <li className="analytics-row">
      <div className="flex items-baseline justify-between gap-4">
        {linkable ? (
          <Link href={`/projects?category=${slug}`} className="analytics-label">
            {label}
          </Link>
        ) : (
          <span className="analytics-label !no-underline">{label}</span>
        )}
        <span className="analytics-count">{count}</span>
      </div>
      <CountBar count={count} max={max} />
    </li>
  );
}

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/");

  let analytics: Awaited<ReturnType<typeof getPublishedCountsByCategory>> = {
    total: 0,
    groups: [],
    unknown: [],
  };
  try {
    analytics = await getPublishedCountsByCategory();
  } catch {
    analytics = { total: 0, groups: [], unknown: [] };
  }

  const { total, groups, unknown } = analytics;
  const activeCategories = groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.count > 0).length,
    0,
  );
  const topCategory = [...groups.flatMap((group) => group.items), ...unknown].sort(
    (a, b) => b.count - a.count,
  )[0];
  const maxCount = topCategory?.count ?? 0;

  return (
    <>
      <Header count={total} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="card px-6 py-10 sm:px-10">
          <p className="kicker rise">
            <span className="live-dot" />
            Admin
          </p>
          <h1 className="display rise-2 mt-3 text-[36px] sm:text-[44px]">Analytics</h1>
          <p className="rise-3 mt-5 max-w-2xl text-[17px] leading-7 text-ink-dim">
            Published portfolio counts by category. Open any row to view matching
            work in the registry.
          </p>

          <dl className="rise-4 mt-10 grid gap-4 sm:grid-cols-3">
            <div className="analytics-stat">
              <dt>Total portfolios</dt>
              <dd>{total}</dd>
            </div>
            <div className="analytics-stat">
              <dt>Categories in use</dt>
              <dd>{activeCategories}</dd>
            </div>
            <div className="analytics-stat">
              <dt>Top category</dt>
              <dd className="text-[1.35rem] leading-tight sm:text-[1.75rem]">
                {topCategory && topCategory.count > 0 ? (
                  <>
                    {topCategory.label}
                    <span className="mt-1 block text-[14px] font-medium text-mist">
                      {topCategory.count} portfolio{topCategory.count === 1 ? "" : "s"}
                    </span>
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          <div className="rise-5 mt-12 space-y-10">
            {groups.map((group) => (
              <section key={group.group}>
                <header className="analytics-group-head">
                  <h2>{group.group}</h2>
                  <span>{group.total}</span>
                </header>
                <ul className="analytics-list">
                  {group.items.map((item) => (
                    <CategoryRow
                      key={item.slug}
                      slug={item.slug}
                      label={item.label}
                      count={item.count}
                      max={maxCount}
                    />
                  ))}
                </ul>
              </section>
            ))}

            {unknown.length > 0 ? (
              <section>
                <header className="analytics-group-head">
                  <h2>Other</h2>
                  <span>{unknown.reduce((sum, item) => sum + item.count, 0)}</span>
                </header>
                <ul className="analytics-list">
                  {unknown.map((item) => (
                    <CategoryRow
                      key={item.slug}
                      slug={item.slug}
                      label={item.label}
                      count={item.count}
                      max={maxCount}
                      linkable={false}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
