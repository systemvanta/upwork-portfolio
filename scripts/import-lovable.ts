import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { createPrismaClient } from "../src/lib/create-prisma";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const SITEMAP = "https://madewithlovable.com/sitemap_projects.xml";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const LIMIT = Math.max(1, Number(process.env.LOVABLE_LIMIT ?? "48"));

type Example = {
  title: string;
  tagline: string;
  liveUrl: string;
  imageUrl: string;
  description: string;
  problem: string;
  stack: string[];
  skills: string[];
  pageUrl: string;
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
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
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
      .replace(/^-+|-+$/g, "") || "lovable-app"
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xml" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }
  return response.text();
}

async function projectUrls() {
  const xml = await fetchText(SITEMAP);
  const urls = [...xml.matchAll(/<loc>(https:\/\/madewithlovable\.com\/projects\/[^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  return [...new Set(urls)].slice(0, LIMIT);
}

function jsonLdBlocks(html: string) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => match[1].trim(),
  );
}

type JsonLd = Record<string, unknown>;

function findCreativeWork(html: string): JsonLd | null {
  for (const raw of jsonLdBlocks(html)) {
    try {
      const data = JSON.parse(raw) as JsonLd;
      const graph = data["@graph"];
      const nodes = Array.isArray(graph) ? (graph as JsonLd[]) : [data];
      const work = nodes.find((node) => node["@type"] === "CreativeWork");
      if (work) return work;
    } catch {
      continue;
    }
  }
  return null;
}

function jsonText(work: JsonLd | null, key: string) {
  const value = work?.[key];
  return typeof value === "string" ? value : "";
}

function og(html: string, property: string) {
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, "i"),
  );
  return match?.[1] ? decode(match[1]) : "";
}

function plainText(html: string) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
}

function sectionAfter(text: string, heading: string) {
  const start = text.toLowerCase().indexOf(heading.toLowerCase());
  if (start < 0) return "";
  const rest = text.slice(start + heading.length).trim();
  const stop = rest.search(
    /\b(Problem solved|Key features|Stack detected|Reproducible playbook|Target audience|Similar projects|Recently added)\b/i,
  );
  return (stop >= 0 ? rest.slice(0, stop) : rest.slice(0, 400)).trim();
}

function stackFrom(text: string) {
  const chunk = sectionAfter(text, "Stack detected");
  const known = [
    "Lovable",
    "Supabase",
    "Tailwind CSS",
    "React",
    "TypeScript",
    "Stripe",
    "OpenAI",
    "Firebase",
  ];
  return known.filter((name) => new RegExp(`\\b${name}\\b`, "i").test(chunk || text));
}

function skillsFrom(example: {
  description: string;
  stack: string[];
  keywords?: string;
}) {
  const hay = `${example.description} ${example.stack.join(" ")} ${example.keywords ?? ""}`.toLowerCase();
  const extras = ["lovable", "react", "typescript", "api"];
  if (/\bsupabase\b/.test(hay)) extras.push("supabase");
  if (/\bnext\.?js\b/.test(hay)) extras.push("nextjs");
  if (/\bstripe\b/.test(hay)) extras.push("stripe");
  if (/\bopenai|chatgpt|gpt\b/.test(hay)) extras.push("openai");
  if (/\btailwind\b/.test(hay)) extras.push("tailwind");
  if (/\bdashboard|saas|app\b/.test(hay)) extras.push("product-design");
  return normalizeSkills(extras);
}

function parseProject(html: string, pageUrl: string): Example | null {
  const work = findCreativeWork(html);
  const title = String(jsonText(work, "name") || og(html, "og:title")).replace(/\s*\|\s*Made with Lovable$/i, "").trim();
  let liveUrl = jsonText(work, "url").trim();
  if (liveUrl.startsWith("http://")) liveUrl = `https://${liveUrl.slice("http://".length)}`;
  const imageUrl = String(jsonText(work, "image") || og(html, "og:image")).trim();
  const description = decode(
    jsonText(work, "description") || jsonText(work, "abstract") || og(html, "og:description"),
  );
  const tagline = clip(decode(jsonText(work, "abstract") || description), 180);
  if (!title || !liveUrl || !/^https?:\/\//i.test(liveUrl) || !imageUrl) return null;
  if (/madewithlovable\.com/i.test(liveUrl)) return null;

  const text = plainText(html);
  const problem =
    sectionAfter(text, "Problem solved") ||
    description ||
    `${title} needed a working product surface without a long custom frontend build.`;
  const stack = stackFrom(text);
  const keywords = jsonText(work, "keywords");

  return {
    title,
    tagline: tagline || clip(description, 180) || title,
    liveUrl,
    imageUrl,
    description,
    problem: clip(problem, 600),
    stack,
    skills: skillsFrom({ description: `${description} ${keywords}`, stack }),
    pageUrl,
  };
}

function clients() {
  const localUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const local = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: localUrl }),
  });
  const turso = process.env.TURSO_DATABASE_URL
    ? createPrismaClient({ turso: true })
    : null;
  return { local, turso, writers: turso ? [local, turso] : [local] };
}

async function ownerFor(prisma: PrismaClient) {
  const email = process.env.ADMIN_EMAIL;
  return (
    (email ? await prisma.user.findUnique({ where: { email } }) : null) ??
    (await prisma.user.findFirst())
  );
}

async function upsertOn(
  prisma: PrismaClient,
  ownerId: string,
  example: Example,
  demo: NonNullable<Awaited<ReturnType<typeof downloadDemoImage>>>,
) {
  const existing =
    (await prisma.project.findFirst({ where: { liveUrl: example.liveUrl } })) ??
    (await prisma.project.findFirst({
      where: { title: example.title, category: "lovable" },
    }));

  let slug = slugFromUrl(example.liveUrl, example.title);
  if (!existing) {
    let n = 2;
    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${slugFromUrl(example.liveUrl, example.title)}-${n}`;
      n += 1;
    }
  }

  const payload = {
    title: example.title,
    tagline: example.tagline,
    category: "lovable",
    status: "published" as const,
    liveUrl: example.liveUrl,
    outcome: "",
    problem: example.problem,
    constraints:
      "React and TypeScript on Lovable, with hosted APIs for data, auth, or payments where the product needs them.",
    decision:
      example.description ||
      `${example.title} is a shipped web app built with Lovable.`,
    tradeoff:
      "The product stays on a Lovable React app instead of a custom Next.js rewrite, so the UI and API can ship together.",
    method: "",
    writeup: example.description,
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
          ownerId,
          ...payload,
          skills: { create: example.skills.map((skill) => ({ skill })) },
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

  return Boolean(existing);
}

async function main() {
  const { local, turso, writers } = clients();

  try {
    const owners = new Map<PrismaClient, string>();
    for (const prisma of writers) {
      const owner = await ownerFor(prisma);
      if (!owner) {
        throw new Error("No user in the database. Run prisma db seed first.");
      }
      owners.set(prisma, owner.id);
    }

    const urls = await projectUrls();
    if (urls.length === 0) {
      throw new Error("Made with Lovable sitemap had no project URLs.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const pageUrl of urls) {
      let html: string;
      try {
        html = await fetchText(pageUrl);
      } catch (error) {
        console.log(`${pageUrl}… fetch failed, skipped`);
        skipped += 1;
        continue;
      }

      const example = parseProject(html, pageUrl);
      if (!example) {
        console.log(`${pageUrl}… missing live URL or screenshot, skipped`);
        skipped += 1;
        continue;
      }

      process.stdout.write(`${example.title}… `);
      const demo = await downloadDemoImage(example.imageUrl);
      if (!demo) {
        console.log("screenshot failed, skipped");
        skipped += 1;
        continue;
      }

      let wasExisting = false;
      for (const prisma of writers) {
        const existing = await upsertOn(prisma, owners.get(prisma)!, example, demo);
        wasExisting = wasExisting || existing;
      }

      if (wasExisting) updated += 1;
      else created += 1;
      console.log(wasExisting ? "updated" : "ok");
      await sleep(250);
    }

    console.log(
      `Lovable projects: ${created} created, ${updated} updated, ${skipped} skipped, ${urls.length} from sitemap.`,
    );
  } finally {
    await local.$disconnect();
    if (turso) await turso.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
