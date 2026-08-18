import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { categories } from "../src/data/categories";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { captureSiteDemo } from "./capture-site-demo";
import { normalizeKey } from "./createtoday-demos";

const SOURCE = "https://www.commercegurus.com/woocommerce-examples/";
const WAYBACK =
  "https://web.archive.org/web/2024/https://www.commercegurus.com/woocommerce-examples/";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const SKILLS = normalizeSkills(["woocommerce", "wordpress", "ecommerce"]);

const PROTECTED_CATEGORIES = new Set([
  "shopify",
  ...categories.filter((category) => category.group === "Portfolio").map((c) => c.slug),
]);

type Example = {
  title: string;
  liveUrl: string;
  origin: string;
  description: string;
  takeaway: string;
  imageUrl: string | null;
};

type DemoFile = { buffer: Buffer; ext: string; kind: "image" };

function slugFromUrl(liveUrl: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    const path = url.pathname
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    return [host, path].filter(Boolean).join("-").toLowerCase() || "woocommerce";
  } catch {
    return "woocommerce";
  }
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function decodeHtml(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    );
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function upgradeHttps(raw: string) {
  const url = new URL(raw);
  if (url.protocol === "http:") url.protocol = "https:";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function urlKey(value: string | null | undefined) {
  if (!value) return "";
  try {
    return normalizeKey(upgradeHttps(value));
  } catch {
    return normalizeKey(value);
  }
}

function originalImageUrl(value: string) {
  const match = value.match(
    /https:\/\/cgcommedia\.commercegurus\.com\/uploads\/[^"'?\s>]+\.(?:jpg|jpeg|png|webp)/i,
  );
  return match?.[0] ?? value;
}

async function fetchGalleryHtml() {
  const errors: string[] = [];
  for (const url of [SOURCE, WAYBACK]) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        errors.push(`${url} (${response.status})`);
        continue;
      }
      const html = await response.text();
      if (html.includes('id="protest"') && html.includes("WooCommerce Examples")) {
        return html;
      }
      errors.push(`${url} (no example markup)`);
    } catch (error) {
      errors.push(`${url} (${error instanceof Error ? error.message : "fetch failed"})`);
    }
  }
  throw new Error(`Could not load CommerceGurus gallery: ${errors.join("; ")}`);
}

function parseExamples(html: string): Example[] {
  const headers = [...html.matchAll(/<h4([^>]*)>([\s\S]*?)<\/h4>/gi)];
  const examples: Example[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < headers.length; index += 1) {
    const match = headers[index];
    if (!/\bid="/i.test(match[1] ?? "")) continue;
    const link = match[2]?.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;

    let href: string;
    try {
      href = upgradeHttps(decodeHtml(link[1]));
    } catch {
      continue;
    }
    if (/commercegurus\.com/i.test(href)) continue;

    const title = stripTags(link[2]);
    if (!title) continue;
    const key = urlKey(href);
    if (seen.has(key)) continue;
    seen.add(key);

    const start = (match.index ?? 0) + match[0].length;
    const next = headers[index + 1];
    let end = next?.index ?? html.length;
    const slice = html.slice(start, end);
    const h2 = slice.search(/<h2\b/i);
    const body = h2 >= 0 ? slice.slice(0, h2) : slice;

    const originMatch = body.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
    const origin = originMatch ? stripTags(originMatch[1]) : "";

    const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((item) => stripTags(item[1]))
      .filter(Boolean);

    const takeaway =
      paragraphs.find((text) => /^key takeaway:/i.test(text))?.replace(/^key takeaway:\s*/i, "") ??
      "";
    const description = paragraphs
      .filter((text) => !/^key takeaway:/i.test(text) && !/^actionable tip:/i.test(text))
      .slice(0, 2)
      .join(" ");

    const imageUrls = [
      ...body.matchAll(
        /https:\/\/cgcommedia\.commercegurus\.com\/uploads\/2019\/07\/[^"'?\s>]+\.(?:jpg|jpeg|png|webp)/gi,
      ),
    ].map((item) => originalImageUrl(item[0]));
    const imageUrl =
      imageUrls.find(
        (url) => !/woocommerce-examples|shoptimizer-vertical/i.test(url),
      ) ?? null;

    examples.push({
      title,
      liveUrl: href,
      origin,
      description,
      takeaway,
      imageUrl,
    });
  }

  return examples;
}

async function downloadImage(imageUrl: string, referer: string): Promise<DemoFile | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        referer,
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
    return { buffer, ext, kind: "image" };
  } catch {
    return null;
  }
}

function extFromType(type: string, url: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (url.includes(".webp")) return "webp";
  if (url.includes(".png")) return "png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  return null;
}

async function loadDemo(example: Example): Promise<DemoFile | null> {
  if (example.imageUrl) {
    const fromGallery = await downloadImage(example.imageUrl, SOURCE);
    if (fromGallery) return fromGallery;
  }
  return captureSiteDemo(example.liveUrl);
}

async function ensureDemo(
  prisma: PrismaClient,
  projectId: string,
  example: Example,
) {
  const count = await prisma.projectMedia.count({ where: { projectId } });
  if (count > 0) return true;
  const demo = await loadDemo(example);
  if (!demo) return false;
  const saved = await saveBufferUpload(projectId, demo.buffer, demo.ext, demo.kind);
  await prisma.projectMedia.create({
    data: {
      projectId,
      kind: saved.kind,
      src: saved.src,
      caption: "",
      sortOrder: 0,
    },
  });
  return true;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required");

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const owner = await prisma.user.findUnique({ where: { email } });
    if (!owner) {
      throw new Error(`No user for ${email}. Run prisma db seed first.`);
    }

    const html = await fetchGalleryHtml();
    const examples = parseExamples(html);
    if (examples.length === 0) {
      throw new Error("CommerceGurus page had no WooCommerce examples.");
    }

    const existing = await prisma.project.findMany({
      select: { id: true, slug: true, category: true, liveUrl: true },
    });
    const byUrl = new Map(
      existing
        .filter((project) => urlKey(project.liveUrl))
        .map((project) => [urlKey(project.liveUrl), project]),
    );
    const bySlug = new Map(existing.map((project) => [project.slug, project]));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let demos = 0;

    for (const example of examples) {
      const slug = slugFromUrl(example.liveUrl);
      const matched = byUrl.get(urlKey(example.liveUrl)) ?? bySlug.get(slug);
      if (matched && (PROTECTED_CATEGORIES.has(matched.category) || matched.category !== "woocommerce")) {
        console.log(`${example.title} → skipped (${matched.category} ${matched.slug})`);
        skipped += 1;
        continue;
      }

      const taglineSource = example.origin
        ? `${example.origin}. ${example.description}`
        : example.description;
      const payload = {
        title: example.title,
        tagline: clip(taglineSource, 180),
        category: "woocommerce",
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "A brand needed a WooCommerce store that could sell on sight without looking like a generic theme.",
        constraints:
          "WooCommerce and WordPress architecture, product photography, and conversion patterns common to ecommerce storefronts.",
        decision: example.description,
        tradeoff:
          "Design leans on photography, type, and conversion details rather than a stock WooCommerce layout.",
        method: "",
        writeup: [
          example.description,
          example.takeaway ? `Key takeaway: ${example.takeaway}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      };

      process.stdout.write(`${example.title} → woocommerce… `);

      const project = matched
        ? await prisma.project.update({
            where: { id: matched.id },
            data: {
              ...payload,
              skills: {
                deleteMany: {},
                create: SKILLS.map((skill) => ({ skill })),
              },
            },
          })
        : await prisma.project.create({
            data: {
              slug,
              ownerId: owner.id,
              ...payload,
              skills: { create: SKILLS.map((skill) => ({ skill })) },
            },
          });

      if (matched) updated += 1;
      else {
        created += 1;
        bySlug.set(slug, {
          id: project.id,
          slug,
          category: "woocommerce",
          liveUrl: example.liveUrl,
        });
        byUrl.set(urlKey(example.liveUrl), {
          id: project.id,
          slug,
          category: "woocommerce",
          liveUrl: example.liveUrl,
        });
      }

      const attached = await ensureDemo(prisma, project.id, example);
      if (attached) demos += 1;
      console.log(attached ? "ok" : "saved without screenshot");
    }

    console.log(
      `CommerceGurus WooCommerce examples: ${created} created, ${updated} updated, ${demos} demos, ${skipped} skipped, ${examples.length} on the gallery page.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
