import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SOURCE = "https://www.dotcomweavers.com/portfolio/";
const SITEMAP = "https://www.dotcomweavers.com/portfolio-sitemap.xml";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type CaseStudy = {
  title: string;
  tagline: string;
  liveUrl: string | null;
  imageUrl: string | null;
  challenge: string;
  solution: string;
  result: string;
  category: string;
  skills: string[];
  pageUrl: string;
  slug: string;
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

function preferFullImage(src: string) {
  return src.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|avif))/i, "$1");
}

function pageSlug(pageUrl: string) {
  const parts = new URL(pageUrl).pathname.split("/").filter(Boolean);
  return parts.at(-1) || "dotcomweavers-project";
}

async function fetchHtml(url: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xml" },
      redirect: "follow",
    });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 4000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) {
      throw new Error(`Could not load ${url} (${response.status})`);
    }
    return response.text();
  }
  throw new Error(`Could not load ${url} (429)`);
}

async function sitemapUrls() {
  const xml = await fetchHtml(SITEMAP);
  return [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]))];
}

function categorize(text: string) {
  const hay = text.toLowerCase();
  if (/to shopify/.test(hay)) return "shopify";
  if (/to magento|to adobe commerce/.test(hay)) return "magento";
  if (/adobe commerce|\bmagento\b|\bhyvä\b|\bhyva\b/.test(hay)) return "magento";
  if (/bigcommerce/.test(hay)) return "bigcommerce";
  if (/\bshopify\b/.test(hay)) return "shopify";
  if (/woocommerce/.test(hay)) return "woocommerce";
  if (/wordpress/.test(hay)) return "wordpress";
  return "web-design";
}

function cleanTitle(raw: string) {
  let title = decode(raw)
    .replace(/\s*[-|–—]\s*DotcomWeavers.*$/i, "")
    .replace(/\s*\|\s*DotcomWeavers.*$/i, "")
    .trim();
  title = title.replace(
    /\s*[-–—]\s*(Adobe Sensei|Adobe Commerce|BigCommerce|Magento|Shopify|Craft CMS|Infor)\b.*$/i,
    "",
  );
  title = title.replace(
    /\s*\|\s*(Adobe Commerce|BigCommerce|Magento|Shopify|Craft CMS|Replatforming|Magento eCommerce).*$/i,
    "",
  );
  title = title
    .replace(/^Replatforming\s+/i, "")
    .replace(/^Migration from Magento 1 to 2 of\s+/i, "")
    .replace(/\s+Migration from Magento 1 to 2$/i, "")
    .replace(/\s+Adobe Commerce & Custom ERP Integration$/i, "")
    .replace(/\s+Migration to Bigcommerce B2B$/i, "")
    .replace(/^Learn How DotcomWeavers Joined Multiple Magnets site 1 Magento$/i, "Magnets")
    .replace(/\s+from WordPress to Magento$/i, "")
    .replace(/\s+from BigCommerce to Magento$/i, "")
    .replace(/\s+from Magento to Shopify$/i, "")
    .replace(/^Adobe Commerce[-–]\s*.*\|\s*/i, "")
    .trim();
  return title;
}

function skillsFrom(text: string, category: string) {
  const hay = text.toLowerCase();
  const extras = [category, "ecommerce"];
  if (/netsuite/.test(hay)) extras.push("netsuite");
  if (/akeneo/.test(hay)) extras.push("akeneo");
  if (/epicor/.test(hay)) extras.push("epicor");
  if (/\berp\b/.test(hay)) extras.push("erp");
  if (/\bpim\b/.test(hay)) extras.push("pim");
  if (/hyvä|hyva/.test(hay)) extras.push("hyva");
  if (/adobe commerce/.test(hay)) extras.push("adobe-commerce");
  if (/acumatica/.test(hay)) extras.push("acumatica");
  return normalizeSkills(extras);
}

function sectionAfter(html: string, heading: RegExp) {
  const match = html.match(
    new RegExp(
      `<h[1-3][^>]*>[\\s\\S]*?${heading.source}[\\s\\S]*?<\\/h[1-3]>([\\s\\S]*?)(?=<h[1-3][\\s>]|$)`,
      "i",
    ),
  );
  return match ? clip(decode(match[1]), 900) : "";
}

function parseCase(html: string, pageUrl: string): CaseStudy | null {
  const ogTitle =
    html.match(/property="og:title" content="([^"]+)"/i)?.[1] ?? "";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const title = cleanTitle(ogTitle) || cleanTitle(h1);
  if (!title) return null;

  const tagline =
    html.match(/property="og:description" content="([^"]+)"/i)?.[1] ??
    html.match(/name="description" content="([^"]+)"/i)?.[1] ??
    "";
  const imageUrl = preferFullImage(
    html.match(/property="og:image"[^>]*content="([^"]+)"/i)?.[1] ??
      html.match(/content="([^"]+)"[^>]*property="og:image"/i)?.[1] ??
      "",
  );

  const hay = `${ogTitle} ${tagline}`;
  const category = categorize(hay);

  return {
    title,
    tagline: decode(tagline),
    liveUrl: null,
    imageUrl: imageUrl || null,
    challenge: sectionAfter(html, /Challenges/),
    solution: sectionAfter(html, /Solution/),
    result: sectionAfter(html, /Results?/),
    category,
    skills: skillsFrom(hay, category),
    pageUrl,
    slug: pageSlug(pageUrl),
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

    const pages = await sitemapUrls();
    if (pages.length === 0) {
      throw new Error("Dotcomweavers sitemap had no portfolio items.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const categories = new Map<string, number>();

    for (const pageUrl of pages) {
      const html = await fetchHtml(pageUrl);
      const example = parseCase(html, pageUrl);
      if (!example) {
        console.log(`${pageUrl}… could not parse, skipped`);
        skipped += 1;
        continue;
      }

      process.stdout.write(`${example.title}… `);
      const existing =
        (await prisma.project.findUnique({ where: { slug: example.slug } })) ??
        (await prisma.project.findFirst({ where: { title: example.title } }));

      let demo: Awaited<ReturnType<typeof downloadDemoImage>> = null;
      const mediaCount = existing
        ? await prisma.projectMedia.count({ where: { projectId: existing.id } })
        : 0;
      if (mediaCount === 0) {
        if (!example.imageUrl) {
          console.log("no screenshot, skipped");
          skipped += 1;
          continue;
        }
        demo = await downloadDemoImage(example.imageUrl);
        if (!demo) {
          console.log("screenshot failed, skipped");
          skipped += 1;
          continue;
        }
      }

      const payload = {
        title: example.title,
        tagline: clip(example.tagline || example.title, 180),
        category: example.category,
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: example.result || "",
        problem:
          example.challenge ||
          "The client needed a B2B or B2C commerce platform connected to ERP, catalog, and fulfillment workflows.",
        constraints:
          "Adobe Commerce or BigCommerce storefront, ERP/PIM integrations, and industrial or wholesale catalogs.",
        decision:
          example.solution ||
          example.tagline ||
          `${example.title} is an ecommerce project.`,
        tradeoff:
          "The build stays on a commerce platform with ERP integrations rather than a custom headless stack.",
        method: "",
        writeup: [example.tagline, example.challenge, example.solution, example.result]
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
                create: example.skills.map((skill) => ({ skill })),
              },
            },
          })
        : await prisma.project.create({
            data: {
              slug: example.slug,
              ownerId: owner.id,
              ...payload,
              skills: { create: example.skills.map((skill) => ({ skill })) },
            },
          });

      if (demo) {
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
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    console.log(
      `DotcomWeavers projects: ${created} created, ${updated} updated, ${skipped} skipped, ${pages.length} in the sitemap.`,
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
