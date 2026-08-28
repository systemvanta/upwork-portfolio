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
      <ul className="chip-row flex flex-wrap gap-2">
        <li>
          <Chip href={hrefFor("")} label="All" active={!active} />
        </li>
      </ul>
      {categoryGroups().map(({ group, items }, groupIndex) => (
        <div key={group} className="rise" style={{ animationDelay: `${120 + groupIndex * 50}ms` }}>
          <p className="mb-2 text-[13px] font-medium text-mist">{group}</p>
          <ul className="chip-row flex flex-wrap gap-2">
            {items.map((category, index) => (
              <li key={category.slug} style={{ animationDelay: `${160 + groupIndex * 50 + index * 18}ms` }}>
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
      className={`chip-link ${
        active
          ? "bg-ink text-white shadow-[0_8px_18px_rgba(31,30,30,0.16)] chip-link-active"
          : "bg-fill text-ink-dim hover:bg-ink/10 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
