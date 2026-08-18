import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SOURCE = "https://www.framer.com/community/gallery/";
const API = "https://www.framer.com/creators/api/unified/resources/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const PAGE_SIZE = 120;
const MAX_PAGES = Number(process.env.FRAMER_PAGES ?? "1");

type GalleryCategory = { slug?: string; name?: string };
type GalleryMedia = {
  type?: string;
  url?: string;
  metadata?: { posterUrl?: string };
};
type GallerySite = {
  id?: string;
  title?: string;
  slug?: string;
  introduction?: string | null;
  body?: string | null;
  media?: GalleryMedia[];
  attributes?: { url?: string; categories?: GalleryCategory[] };
};
type GalleryPage = {
  data?: GallerySite[];
  pagination?: { next?: string | null };
};

type Example = {
  title: string;
  tagline: string;
  liveUrl: string;
  imageUrl: string;
  body: string;
  gallerySlug: string;
  pageUrl: string;
  skills: string[];
};

function decode(html: string) {
  return html
    .replace(/&#39;/g, "'")
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

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "framer-site"
  );
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

function hostLabel(liveUrl: string) {
  try {
    return new URL(liveUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function cleanTitle(raw: string, liveUrl: string) {
  let title = decode(raw).replace(/\/+$/, "").trim();
  title = title.replace(/\s*[-–—]?\s*new link below$/i, "").trim();
  if (!title || /^(my portfolio|portfolio|website|new website)$/i.test(title)) {
    return hostLabel(liveUrl) || title || "Framer site";
  }
  return title;
}

function imageUrlFrom(media: GalleryMedia[] | undefined) {
  const image = media?.find((item) => item.type === "image" && item.url);
  if (image?.url) return image.url;
  const poster = media?.find(
    (item) => item.type === "video" && item.metadata?.posterUrl,
  );
  return poster?.metadata?.posterUrl ?? null;
}

function skillsFrom(categories: GalleryCategory[]) {
  const extras = ["framer", "web-design"];
  const slugs = categories.map((category) => category.slug ?? "").filter(Boolean);
  if (slugs.includes("portfolio") || slugs.includes("personal")) {
    extras.push("portfolio");
  }
  if (slugs.includes("ecommerce")) extras.push("ecommerce");
  if (slugs.includes("agency")) extras.push("branding");
  if (slugs.includes("ai") || slugs.includes("saas")) extras.push("product-design");
  return normalizeSkills(extras);
}

async function fetchPage(after?: string): Promise<GalleryPage> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    type: "site",
    sort: "popular",
  });
  if (after) params.set("after", after);
  const response = await fetch(`${API}?${params}`, {
    headers: {
      "user-agent": UA,
      accept: "application/json",
      origin: "https://www.framer.com",
      referer: SOURCE,
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not load Framer gallery (${response.status})`);
  }
  return (await response.json()) as GalleryPage;
}

async function loadGallery() {
  const sites: GallerySite[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  const pages = Math.max(1, Number.isFinite(MAX_PAGES) ? MAX_PAGES : 1);

  for (let page = 0; page < pages; page += 1) {
    const payload = await fetchPage(after);
    const rows = payload.data ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      const key = row.id || row.slug;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      sites.push(row);
    }
    const next = payload.pagination?.next;
    if (!next) break;
    after = next;
  }

  return sites;
}

function toExample(site: GallerySite): Example | null {
  const liveUrl = site.attributes?.url?.trim();
  const imageUrl = imageUrlFrom(site.media);
  if (!liveUrl || !/^https?:\/\//i.test(liveUrl) || !imageUrl) return null;

  const title = cleanTitle(site.title ?? "", liveUrl);
  const introduction = decode(site.introduction ?? "");
  const body = decode(site.body ?? "");
  const tagline =
    introduction ||
    clip(body, 180) ||
    `Website built with Framer${hostLabel(liveUrl) ? ` — ${hostLabel(liveUrl)}` : ""}.`;
  const gallerySlug = site.slug || slugify(title);

  return {
    title,
    tagline: clip(tagline, 180),
    liveUrl,
    imageUrl,
    body: body || introduction,
    gallerySlug,
    pageUrl: `https://www.framer.com/community/gallery/${gallerySlug}/`,
    skills: skillsFrom(site.attributes?.categories ?? []),
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

    const sites = await loadGallery();
    if (sites.length === 0) {
      throw new Error("Framer gallery returned no sites.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const site of sites) {
      const example = toExample(site);
      const label = site.title || site.slug || site.id || "site";
      if (!example) {
        console.log(`${label}… no live URL or screenshot, skipped`);
        skipped += 1;
        continue;
      }

      process.stdout.write(`${example.title}… `);
      const slug = slugFromUrl(example.liveUrl, example.title);
      const existing =
        (await prisma.project.findFirst({
          where: { liveUrl: example.liveUrl },
        })) ??
        (await prisma.project.findUnique({ where: { slug } })) ??
        (await prisma.project.findFirst({ where: { title: example.title } }));

      let demo: Awaited<ReturnType<typeof downloadDemoImage>> = null;
      const mediaCount = existing
        ? await prisma.projectMedia.count({ where: { projectId: existing.id } })
        : 0;
      if (mediaCount === 0) {
        demo = await downloadDemoImage(example.imageUrl);
        if (!demo) {
          console.log("screenshot failed, skipped");
          skipped += 1;
          continue;
        }
      }

      const payload = {
        title: example.title,
        tagline: example.tagline,
        category: "framer",
        status: "published" as const,
        liveUrl: example.liveUrl,
        outcome: "",
        problem:
          "The team needed a marketing or portfolio site that could move like a product, not a static page.",
        constraints:
          "Framer canvas, CMS collections where needed, and a public live URL.",
        decision:
          example.body || `${example.title} is a site built in Framer.`,
        tradeoff:
          "The build stays on Framer instead of a custom frontend stack.",
        method: "",
        writeup: example.body,
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
              slug,
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

      if (existing) updated += 1;
      else created += 1;
      console.log(existing ? "updated" : "ok");
    }

    console.log(
      `Framer projects: ${created} created, ${updated} updated, ${skipped} skipped, ${sites.length} on the gallery page.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
