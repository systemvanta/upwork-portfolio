import Link from "next/link";
import { categoryGroups } from "@/data/categories";

type CategoryChipsProps = {
  active?: string;
  basePath?: string;
  extraQuery?: Record<string, string>;
};

export function CategoryChips({
  active,
  basePath = "/projects",
  extraQuery = {},
}: CategoryChipsProps) {
  function hrefFor(slug: string) {
    const query = new URLSearchParams(extraQuery);
    if (slug) query.set("category", slug);
    return query.toString() ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="space-y-5">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Chip href={hrefFor("")} label="All" active={!active} />
        </li>
      </ul>
      {categoryGroups().map(({ group, items }) => (
        <div key={group}>
          <p className="mb-2 text-[12px] font-medium text-mist">{group}</p>
          <ul className="flex flex-wrap gap-2">
            {items.map((category) => (
              <li key={category.slug}>
                <Chip
                  href={hrefFor(category.slug)}
                  label={category.label}
                  active={active === category.slug}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
        active
          ? "bg-white text-black"
          : "bg-white/10 text-ink-dim hover:bg-white/16 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
