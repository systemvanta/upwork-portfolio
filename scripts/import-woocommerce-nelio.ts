import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SOURCE = "https://neliosoftware.com/blog/50-great-woocommerce-websites/";
const ARCHIVE =
  "https://web.archive.org/web/20240615071238/https://neliosoftware.com/blog/50-great-woocommerce-websites/";
const ARCHIVE_PREFIX = "https://web.archive.org/web/20240615071238im_/";

type WooExample = {
  title: string;
  liveUrl: string | null;
  imageUrl: string | null;
  description: string;
};

function unwrapArchive(url: string) {
  const match = url.match(
    /https?:\/\/web\.archive\.org\/web\/\d+(?:im_)?\/(https?:\/\/.*)/,
  );
  return match?.[1] ?? url;
}

function archiveImage(url: string) {
  if (url.includes("web.archive.org")) return url;
  return `${ARCHIVE_PREFIX}${url}`;
}

function decode(html: string) {
  return html
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
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
    return host.toLowerCase() || slugify(title);
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

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function httpsUrl(url: string) {
  return url.replace(/^http:\/\//i, "https://");
}

function parseNelioArticle(html: string): WooExample[] {
  const parts = html.split(/<h2 class="wp-block-heading">/).slice(1);
  const skip = /nelio a\/b|responses to|leave a reply|wait! before you go/i;
  const items: WooExample[] = [];

  for (const part of parts) {
    const headingEnd = part.indexOf("</h2>");
    if (headingEnd < 0) continue;
    const heading = part.slice(0, headingEnd);
    const body = part.slice(headingEnd + 5, headingEnd + 5000);
    const headingText = decode(heading);
    if (!headingText || skip.test(headingText)) continue;

    const title = headingText.replace(/^\d+\.\s*/, "").trim();
    const headingHref = heading.match(/href="([^"]+)"/)?.[1];
    const figureHref = body.match(/<figure[\s\S]*?<a [^>]*href="([^"]+)"/)?.[1];
    const rawLive = headingHref ?? figureHref ?? null;
    const liveUrl = rawLive ? httpsUrl(unwrapArchive(rawLive)) : null;

    const imageMatch =
      body.match(/data-src="(https:[^"]+\.(?:png|jpe?g|webp)[^"]*)"/i) ??
      body.match(
        /<noscript>[\s\S]*?src="(https:[^"]+\.(?:png|jpe?g|webp)[^"]*)"/i,
      );
    const imageUrl = imageMatch ? archiveImage(unwrapArchive(imageMatch[1])) : null;

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

async function ensureDemo(
  prisma: PrismaClient,
  projectId: string,
  imageUrl: string,
  caption: string,
) {
  const count = await prisma.projectMedia.count({ where: { projectId } });
  if (count > 0) return true;
  const demo = await downloadDemoImage(imageUrl);
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

async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error("ADMIN_EMAIL is required");

  const htmlRes = await fetch(ARCHIVE, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      accept: "text/html",
    },
    redirect: "follow",
  });
  if (!htmlRes.ok) {
    throw new Error(`Could not load archived Nelio article (${htmlRes.status})`);
  }

  const examples = parseNelioArticle(await htmlRes.text());
  if (examples.length === 0) {
    throw new Error("No WooCommerce examples found in the Nelio article.");
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

    const skills = normalizeSkills(["woocommerce", "wordpress", "ecommerce"]);
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

      const slug = slugFromUrl(example.liveUrl, example.title);
      const payload = {
        title: example.title,
        tagline: clip(example.description || `${example.title} WooCommerce store.`, 180),
        category: "woocommerce",
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "A store needed a WordPress shop that could sell without looking like a default WooCommerce theme.",
        constraints:
          "WooCommerce on WordPress, product photography, and a custom or commercial theme.",
        decision: example.description || `${example.title} is a WooCommerce storefront.`,
        tradeoff:
          "The store leans on theme and photography rather than a custom headless stack.",
        method: "",
        writeup: example.description,
      };

      process.stdout.write(`${example.title}… `);

      const existing = await prisma.project.findUnique({ where: { slug } });
      const project = existing
        ? await prisma.project.update({
            where: { id: existing.id },
            data: {
              ...payload,
              skills: {
                deleteMany: {},
                create: skills.map((skill) => ({ skill })),
              },
            },
          })
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

      if (example.imageUrl) {
        const attached = await ensureDemo(
          prisma,
          project.id,
          example.imageUrl,
          "",
        );
        if (attached) demos += 1;
        console.log(attached ? "ok" : "saved without screenshot");
      } else {
        console.log("saved without screenshot");
      }
    }

    console.log(
      `WooCommerce examples: ${created} created, ${updated} updated, ${demos} demos, ${skipped} skipped, ${examples.length} parsed from Nelio.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
