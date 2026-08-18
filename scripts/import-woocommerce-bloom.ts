import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { captureSiteDemo } from "./capture-site-demo";

const SOURCE =
  "https://bloomagency.in/ecommerce-website-examples-woocommerce/";
const ARCHIVE =
  "https://web.archive.org/web/2024/https://bloomagency.in/ecommerce-website-examples-woocommerce/";

const FALLBACK_URLS: Record<string, string> = {
  "cultivated wit": "https://cultivatedwit.com/",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type WooExample = {
  title: string;
  liveUrl: string | null;
  imageUrl: string | null;
  description: string;
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

function slugFromUrl(liveUrl: string, title: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    const path = url.pathname
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return [host, path].filter(Boolean).join("-").toLowerCase() || slugify(title);
  } catch {
    return slugify(title);
  }
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "woocommerce-site"
  );
}

function hostKey(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function extraSkills(text: string) {
  const hay = text.toLowerCase();
  const skills: string[] = [];
  if (/sustainab|eco-friendly|earth-friendly|reusable|ethical/.test(hay)) {
    skills.push("sustainability");
  }
  if (/fashion|clothing|apparel|swimwear|footwear/.test(hay)) {
    skills.push("fashion");
  }
  if (/sunglass|eyewear/.test(hay)) skills.push("eyewear");
  if (/skincare|first-aid/.test(hay)) skills.push("health");
  if (/coffee/.test(hay)) skills.push("food-beverage");
  return skills;
}

function isUsableImage(src: string) {
  if (!src.startsWith("http")) return false;
  if (
    /inboxflows|email|gravatar|emoji|logo|avatar|sprite|favicon/i.test(src)
  ) {
    return false;
  }
  return (
    /\.(jpe?g|png|webp|avif)(\?|$)/i.test(src) ||
    src.includes("/wp-content/uploads/") ||
    src.includes("cdn.")
  );
}

function preferFullImage(src: string) {
  return src.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|avif))/i, "$1");
}

function parseBloomArticle(html: string): WooExample[] {
  const parts = html.split(/<h2>/).slice(1);
  const items: WooExample[] = [];

  for (const part of parts) {
    const headingEnd = part.indexOf("</h2>");
    if (headingEnd < 0) continue;
    const heading = part.slice(0, headingEnd);
    const headingText = decode(heading);
    if (!/^\d+\.\s/.test(headingText)) continue;

    const title = headingText.replace(/^\d+\.\s*/, "").trim();
    const body = part.slice(headingEnd + 5);
    const chunk = heading + body;

    let liveUrl: string | null = null;
    for (const match of chunk.matchAll(/<a [^>]*href="([^"]+)"/g)) {
      const href = match[1];
      if (!href.startsWith("http")) continue;
      if (/bloomagency\.in|facebook\.com|twitter\.com|linkedin\.com|instagram\.com|pinterest\.com/i.test(href)) {
        continue;
      }
      liveUrl = href;
      break;
    }
    if (!liveUrl) {
      liveUrl = FALLBACK_URLS[title.toLowerCase()] ?? null;
    }

    let imageUrl: string | null = null;
    for (const match of chunk.matchAll(/<img [^>]*src="([^"]+)"/g)) {
      const src = preferFullImage(match[1]);
      if (!isUsableImage(src)) continue;
      imageUrl = src;
      if (src.includes("bloomagency.in/wp-content/uploads/")) break;
    }

    let description = "";
    for (const paragraph of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
      const text = decode(paragraph[1]);
      if (text.length > 40) {
        description = text;
        break;
      }
    }

    items.push({ title, liveUrl, imageUrl, description });
  }

  return items;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!response.ok) return null;
  return response.text();
}

function extFromType(type: string, url: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (url.includes(".webp")) return "webp";
  if (url.includes(".png")) return "png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  if (url.includes(".avif")) return "avif";
  return null;
}

async function downloadImage(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        "user-agent": UA,
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        referer: SOURCE,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    const ext = extFromType(type, imageUrl);
    if (!ext) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 4000) return null;
    return { buffer, ext, kind: "image" as const };
  } catch {
    return null;
  }
}

async function loadDemo(imageUrl: string | null, liveUrl: string) {
  if (imageUrl) {
    const fromPage = await downloadImage(imageUrl);
    if (fromPage) return fromPage;
  }
  return captureSiteDemo(liveUrl);
}

async function ensureDemo(
  prisma: PrismaClient,
  projectId: string,
  imageUrl: string | null,
  liveUrl: string,
  caption: string,
) {
  const count = await prisma.projectMedia.count({ where: { projectId } });
  if (count > 0) return true;
  const demo = await loadDemo(imageUrl, liveUrl);
  if (!demo) return false;
  const saved = await saveBufferUpload(projectId, demo.buffer, demo.ext, demo.kind);
  await prisma.projectMedia.create({
    data: {
      projectId,
      kind: saved.kind,
      src: saved.src,
      caption,
      sortOrder: 0,
    },
  });
  return true;
}

async function findExisting(
  prisma: PrismaClient,
  slug: string,
  liveUrl: string,
) {
  const bySlug = await prisma.project.findUnique({ where: { slug } });
  if (bySlug) return bySlug;

  const host = hostKey(liveUrl);
  if (!host) return null;
  const projects = await prisma.project.findMany({
    where: { liveUrl: { not: null } },
    select: {
      id: true,
      slug: true,
      category: true,
      liveUrl: true,
      title: true,
    },
  });
  return (
    projects.find((project) => project.liveUrl && hostKey(project.liveUrl) === host) ??
    null
  );
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required");

  const html = (await fetchHtml(SOURCE)) ?? (await fetchHtml(ARCHIVE));
  if (!html) {
    throw new Error("Could not load Bloom WooCommerce examples page or archive.");
  }

  const examples = parseBloomArticle(html);
  if (examples.length === 0) {
    throw new Error("No WooCommerce examples found on the Bloom page.");
  }

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const owner = await prisma.user.findUnique({ where: { email } });
    if (!owner) {
      throw new Error(`No user for ${email}. Run prisma db seed first.`);
    }

    let created = 0;
    let updated = 0;
    let demos = 0;
    let skipped = 0;

    for (const example of examples) {
      if (!example.liveUrl) {
        console.warn(`${example.title}… no live URL, skipped`);
        skipped += 1;
        continue;
      }

      const skills = normalizeSkills([
        "woocommerce",
        "wordpress",
        "ecommerce",
        ...extraSkills(`${example.title} ${example.description}`),
      ]);
      const slug = slugFromUrl(example.liveUrl, example.title);
      const payload = {
        title: example.title,
        tagline: clip(
          example.description || `${example.title} WooCommerce store.`,
          180,
        ),
        category: "woocommerce" as const,
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "A store needed a WordPress shop that could sell without looking like a default WooCommerce theme.",
        constraints:
          "WooCommerce on WordPress, product photography, and a custom storefront layout.",
        decision:
          example.description || `${example.title} is a WooCommerce storefront.`,
        tradeoff:
          "The store leans on theme, photography, and WooCommerce checkout rather than a custom headless stack.",
        method: "",
        writeup: example.description,
      };

      process.stdout.write(`${example.title}… `);

      const existing = await findExisting(prisma, slug, example.liveUrl);
      if (existing && existing.category !== "woocommerce") {
        console.log(
          `skipped (already ${existing.category} as ${existing.slug})`,
        );
        skipped += 1;
        continue;
      }

      const project = existing
        ? existing
        : await prisma.project.create({
            data: {
              slug,
              ownerId: owner.id,
              ...payload,
              skills: { create: skills.map((skill) => ({ skill })) },
            },
          });

      if (existing) updated += 1;
      else created += 1;

      const attached = await ensureDemo(
        prisma,
        project.id,
        example.imageUrl,
        example.liveUrl,
        "",
      );
      if (attached) demos += 1;
      console.log(attached ? "ok" : "saved without screenshot");
    }

    console.log(
      `WooCommerce examples: ${created} created, ${updated} updated, ${demos} demos, ${skipped} skipped, ${examples.length} parsed from Bloom.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
