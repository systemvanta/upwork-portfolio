import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SOURCE = "https://www.younify.eu/projects/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type CaseStudy = {
  title: string;
  tagline: string;
  liveUrl: string | null;
  imageUrl: string | null;
  description: string;
  challenge: string;
  solution: string;
  result: string;
  tags: string[];
  pageUrl: string;
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
      .replace(/^-+|-+$/g, "") || "magento-site"
  );
}

function preferFullImage(src: string) {
  return src.replace(/-\d+x\d+(\.(?:jpe?g|png|webp|avif))/i, "$1");
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

function caseStudyUrls(html: string) {
  const matches = [
    ...html.matchAll(/href="(https:\/\/www\.younify\.eu\/project\/[a-z0-9-]+\/)"/gi),
  ];
  return [...new Set(matches.map((match) => match[1]))];
}

function sectionAfter(html: string, heading: RegExp) {
  const match = html.match(
    new RegExp(
      `<h2[^>]*>[\\s\\S]*?${heading.source}[\\s\\S]*?<\\/h2>([\\s\\S]*?)(?=<h2[\\s>]|$)`,
      "i",
    ),
  );
  if (!match?.[1]) return "";
  const text = decode(match[1]);
  return clip(text, 900);
}

function parseCaseStudy(html: string, pageUrl: string): CaseStudy | null {
  const title = decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  if (!title) return null;

  const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) =>
    decode(match[1]),
  );
  const tagline =
    headings.find(
      (heading) =>
        heading.length > 12 &&
        !/why choose|want to optimize|let’s work|let's work|key activities/i.test(
          heading,
        ),
    ) ?? "";

  const ogImage =
    html.match(/property="og:image"[^>]*content="([^"]+)"/i)?.[1] ??
    html.match(/content="([^"]+)"[^>]*property="og:image"/i)?.[1] ??
    "";
  const imageUrl = ogImage ? preferFullImage(ogImage) : null;

  const liveHref =
    html.match(
      /<a href="(https?:\/\/[^"]+)"[^>]*>\s*View the (?:result live|live result)/i,
    )?.[1] ?? null;
  const liveUrl =
    liveHref && !/younify\.(eu|nl)/i.test(liveHref) ? liveHref : null;

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decode(match[1]))
    .filter(
      (text) =>
        text.length > 80 &&
        !/why choose|contact us|newsletter|technologies used/i.test(text),
    );

  const tags = [...html.matchAll(/<div class="tag">([^<]+)<\/div>/gi)].map((match) =>
    decode(match[1]),
  );

  return {
    title,
    tagline,
    liveUrl,
    imageUrl: imageUrl || null,
    description: paragraphs[0] ?? tagline,
    challenge: sectionAfter(html, /THE CHALLENGE/),
    solution: sectionAfter(html, /THE SOLUTION/),
    result: sectionAfter(html, /THE RESULT|The Result/),
    tags,
    pageUrl,
  };
}

function skillsFor(example: CaseStudy) {
  const extras = example.tags.flatMap((tag) => {
    const lower = tag.toLowerCase();
    if (lower.includes("magento")) return ["magento"];
    if (lower.includes("hyvä") || lower.includes("hyva")) return ["hyva"];
    if (lower.includes("react")) return ["react"];
    if (lower.includes("jquery")) return ["jquery"];
    if (lower.includes("checkout")) return ["checkout"];
    return [lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")];
  });
  return normalizeSkills(["magento", "hyva", "ecommerce", ...extras]);
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

    const listing = await fetchHtml(SOURCE);
    const pages = caseStudyUrls(listing);
    if (pages.length === 0) {
      throw new Error("Younify projects page had no case studies.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const pageUrl of pages) {
      const html = await fetchHtml(pageUrl);
      const example = parseCaseStudy(html, pageUrl);
      if (!example) {
        console.log(`${pageUrl}… could not parse, skipped`);
        skipped += 1;
        continue;
      }

      process.stdout.write(`${example.title}… `);
      if (!example.imageUrl) {
        console.log("no screenshot, skipped");
        skipped += 1;
        continue;
      }

      const demo = await downloadDemoImage(example.imageUrl);
      if (!demo) {
        console.log("screenshot download failed, skipped");
        skipped += 1;
        continue;
      }

      const slug = slugFromUrl(example.liveUrl, example.title);
      const existing =
        (await prisma.project.findUnique({ where: { slug } })) ??
        (await prisma.project.findFirst({
          where: { title: example.title, category: "magento" },
        }));
      const payload = {
        title: example.title,
        tagline: clip(example.tagline || example.description, 180),
        category: "magento",
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: example.result || "",
        problem:
          example.challenge ||
          "The store needed a faster Magento frontend that could keep up with catalog and conversion goals.",
        constraints:
          "Magento 2, Hyvä theme, catalog complexity, and a conversion-focused storefront.",
        decision:
          example.solution ||
          example.description ||
          `${example.title} is a Magento Hyvä project.`,
        tradeoff:
          "The rebuild leans on Hyvä performance and Magento catalog tools rather than a headless stack.",
        method: "",
        writeup: [example.description, example.challenge, example.solution, example.result]
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

      if (existing) updated += 1;
      else created += 1;
      console.log(existing ? "updated" : "ok");
    }

    console.log(
      `Younify projects: ${created} created, ${updated} updated, ${skipped} skipped, ${pages.length} case studies on the listing.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
