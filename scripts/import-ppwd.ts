import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SOURCE = "https://www.proproductswebdevelopment.com/portfolio.htm";
const BASE = "https://www.proproductswebdevelopment.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type ListingItem = {
  title: string;
  href: string;
  tileUrl: string;
  ecommerce: boolean;
  marketing: boolean;
  blurb: string;
};

type CaseStudy = ListingItem & {
  liveUrl: string | null;
  imageUrl: string;
  scenario: string;
  result: string;
  detail: string;
  category: string;
};

function decode(html: string) {
  return html
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function abs(src: string) {
  return new URL(src, BASE).toString();
}

function slugFromUrl(liveUrl: string | null, title: string) {
  if (liveUrl) {
    try {
      const url = new URL(liveUrl);
      const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
      return host.toLowerCase() || slugify(title);
    } catch {
      return slugify(title);
    }
  }
  return slugify(title);
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ppwd-project"
  );
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }
  return response.text();
}

function parseListing(html: string): ListingItem[] {
  const parts = html.split(/<div class="item item-sizer/).slice(1);
  const items: ListingItem[] = [];
  for (const part of parts) {
    const filters = part.match(/^([^"]*)"/)?.[1] ?? "";
    const href = part.match(/<a href="([^"]+)"/)?.[1];
    const tile = part.match(/background: url\('([^']+)'\)/)?.[1];
    const titleRaw = part.match(/<h2>([\s\S]*?)<\/h2>/)?.[1];
    const blurbRaw = part.match(
      /<div class="client-blurb[^"]*">([\s\S]*?)<\/div>/,
    )?.[1];
    if (!href || !tile || !titleRaw) continue;
    const title = decode(titleRaw).replace(/\b1 st\b/i, "1st");
    if (!title) continue;
    items.push({
      title,
      href: abs(href),
      tileUrl: abs(tile),
      ecommerce: filters.includes("filterA"),
      marketing: filters.includes("filterB"),
      blurb: decode(blurbRaw ?? "").replace(/Read Full Case Study/gi, "").trim(),
    });
  }
  return items;
}

function liveUrlFrom(html: string) {
  const meta = html.match(/name="ppwd-client-url" content="([^"]+)"/i)?.[1];
  if (meta && /^https?:\/\//i.test(meta)) return meta;

  const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/gi)].map(
    (match) => match[1],
  );
  return (
    hrefs.find(
      (href) =>
        !/proproductswebdevelopment|proproductswebdesign|billpay|fontawesome|linearicons|facebook|linkedin|twitter|instagram|google|cdn\.|gmpg|schema\.org/i.test(
          href,
        ),
    ) ?? null
  );
}

function sectionText(html: string, label: string) {
  const match = html.match(
    new RegExp(
      `${label}</span></p><p>([\\s\\S]*?)</p>`,
      "i",
    ),
  );
  return match ? decode(match[1]) : "";
}

function categorize(text: string, item: ListingItem) {
  const hay = text.toLowerCase();
  if (/adobe commerce|\bmagento\b/.test(hay)) return "magento";
  if (/shopify plus|\bshopify\b/.test(hay)) return "shopify";
  if (/woocommerce/.test(hay)) return "woocommerce";
  if (/bigcommerce/.test(hay)) return "bigcommerce";
  if (/wordpress/.test(hay)) return "wordpress";
  if (/laravel/.test(hay)) return "laravel";
  if (item.ecommerce) return "magento";
  return "web-design";
}

function skillsFor(example: CaseStudy) {
  const extras = [example.category];
  if (example.ecommerce) extras.push("ecommerce");
  if (example.marketing) extras.push("seo", "digital-marketing");
  if (example.category === "magento") extras.push("adobe-commerce");
  return normalizeSkills(extras);
}

async function loadCase(item: ListingItem): Promise<CaseStudy | null> {
  let html = "";
  try {
    html = await fetchHtml(item.href);
  } catch {
    html = "";
  }

  const detail =
    html.match(
      /name="ppwd-detailed-description" content="([^"]*)"/i,
    )?.[1] ?? "";
  const scenario = html ? sectionText(html, "Project Scenario") : "";
  const result = html ? sectionText(html, "The Result") : "";
  const body = [detail, scenario, result, item.blurb].filter(Boolean).join(" ");
  const exampleImg = html.match(
    /src="(\/images\/portfolio\/examples\/[^"]+)"/i,
  )?.[1];
  const imageUrl = exampleImg ? abs(exampleImg) : item.tileUrl;
  if (!imageUrl) return null;

  return {
    ...item,
    liveUrl: html ? liveUrlFrom(html) : null,
    imageUrl,
    scenario,
    result,
    detail: decode(detail) || item.blurb,
    category: categorize(body, item),
  };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const email = process.env.ADMIN_EMAIL;
    const owner =
      (email
        ? await prisma.user.findUnique({ where: { email } })
        : null) ?? (await prisma.user.findFirst());
    if (!owner) {
      throw new Error("No user in the database. Run prisma db seed first.");
    }

    const listing = parseListing(await fetchHtml(SOURCE));
    if (listing.length === 0) {
      throw new Error("PPWD portfolio page had no projects.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const categories = new Map<string, number>();

    for (const item of listing) {
      process.stdout.write(`${item.title}… `);
      const example = await loadCase(item);
      if (!example) {
        console.log("could not parse, skipped");
        skipped += 1;
        continue;
      }

      const demo = await downloadDemoImage(example.imageUrl);
      if (!demo) {
        console.log("screenshot failed, skipped");
        skipped += 1;
        continue;
      }

      const slug = slugFromUrl(example.liveUrl, example.title);
      const existing =
        (await prisma.project.findUnique({ where: { slug } })) ??
        (await prisma.project.findFirst({ where: { title: example.title } }));

      const payload = {
        title: example.title,
        tagline: clip(example.detail || example.blurb, 180),
        category: example.category,
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: example.result || "",
        problem:
          example.scenario ||
          "The client needed a stronger ecommerce or marketing site that could support catalog, content, and conversion work.",
        constraints:
          example.ecommerce
            ? "Ecommerce catalog, platform migration or rebuild, and a conversion-focused storefront."
            : "Marketing site, content, and search visibility for a service business.",
        decision: example.detail || `${example.title} is a web project.`,
        tradeoff:
          "The work stays on a proven commerce or CMS stack rather than a custom headless rebuild.",
        method: "",
        writeup: [example.detail, example.scenario, example.result]
          .filter(Boolean)
          .join("\n\n"),
      };

      const project = existing
        ? await prisma.project.update({
            where: { id: existing.id },
            data: {
              ...payload,
              skills: {
                deleteMany: {},
                create: skillsFor(example).map((skill) => ({ skill })),
              },
            },
          })
        : await prisma.project.create({
            data: {
              slug,
              ownerId: owner.id,
              ...payload,
              skills: { create: skillsFor(example).map((skill) => ({ skill })) },
            },
          });

      const mediaCount = await prisma.projectMedia.count({
        where: { projectId: project.id },
      });
      if (mediaCount === 0) {
        const saved = await saveBufferUpload(
          project.id,
          demo.buffer,
          demo.ext,
          demo.kind,
        );
        await prisma.projectMedia.create({
          data: {
            projectId: project.id,
            kind: saved.kind,
            src: saved.src,
            caption: "",
            sortOrder: 0,
          },
        });
      }

      categories.set(
        example.category,
        (categories.get(example.category) ?? 0) + 1,
      );
      if (existing) updated += 1;
      else created += 1;
      console.log(existing ? "updated" : `ok (${example.category})`);
    }

    console.log(
      `PPWD projects: ${created} created, ${updated} updated, ${skipped} skipped, ${listing.length} on the portfolio page.`,
    );
    for (const [label, count] of [...categories.entries()].sort()) {
      console.log(`  ${label}: ${count}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
