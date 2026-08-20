import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { createPrismaClient } from "../src/lib/create-prisma";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const SITEMAP = "https://claude.com/sitemap.xml";
const CUSTOMER_LIMIT = Math.max(1, Number(process.env.CLAUDE_CUSTOMER_LIMIT ?? "48"));
const USECASE_LIMIT = Math.max(1, Number(process.env.CLAUDE_USECASE_LIMIT ?? "40"));

const COWORK_PAGES = [
  "https://claude.com/blog/how-people-are-using-claude-cowork",
  "https://claude.com/blog/the-claude-cowork-product-guide",
  "https://claude.com/blog/how-anthropics-marketing-operations-team-uses-claude-cowork-to-automate-reporting-and-campaign-builds",
  "https://claude.com/blog/how-an-anthropic-sales-leader-uses-claude-cowork-to-run-a-4-000-account-book",
  "https://claude.com/blog/cowork-plugins-across-enterprise",
  "https://claude.com/blog/best-practices-for-getting-started-with-claude-cowork",
  "https://claude.com/blog/cowork-for-enterprise",
  "https://claude.com/blog/cowork-plugins-finance",
];

const PROMPT_PAGES = [
  "https://claude.com/blog/best-practices-for-prompt-engineering",
  "https://claude.com/blog/prompt-generator",
  "https://claude.com/blog/evaluate-prompts",
];

type Example = {
  title: string;
  tagline: string;
  liveUrl: string;
  imageUrl: string;
  description: string;
  problem: string;
  skills: string[];
  category: string;
  constraints: string;
  decision: string;
  tradeoff: string;
};

function decode(html: string) {
  return html
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
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
      .replace(/^-+|-+$/g, "") || "claude-project"
  );
}

function slugFromUrl(liveUrl: string, title: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const base = [host, last].filter(Boolean).join("-").toLowerCase();
    return base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || slugify(title);
  } catch {
    return slugify(title);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
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

function og(html: string, property: string) {
  const patterns = [
    new RegExp(`(?:property|name)="${property}"[^>]*content="([^"]*)"`, "i"),
    new RegExp(`content="([^"]*)"[^>]*(?:property|name)="${property}"`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return "";
}

function heading(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? decode(match[1]) : "";
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match
    ? decode(match[1]).replace(/\s*\|\s*(Claude by Anthropic|Claude|Anthropic).*$/i, "").trim()
    : "";
}

function isGenericImage(url: string) {
  return /og-claude-generic|apple-touch|favicon|open-graph\.jpg|brand-cleanup-twitter|n8n-og-image/i.test(
    url,
  );
}

function claudeInlineImage(html: string) {
  const imgs = [
    ...html.matchAll(
      /src="(https:\/\/cdn\.prod\.website-files\.com\/[^"]+\.(?:png|jpg|jpeg|webp)[^"]*)"/gi,
    ),
  ].map((match) => match[1].replace(/&amp;/g, "&"));
  return (
    imgs.find((url) => {
      const name = url.toLowerCase();
      return !/generic|apple-touch|favicon|icon|logo|avatar|webclip/.test(name);
    }) ?? ""
  );
}

function cleanTitle(html: string) {
  return (
    heading(html) ||
    og(html, "og:title").replace(/\s*\|\s*(Claude by Anthropic|Claude|Anthropic).*$/i, "").trim() ||
    pageTitle(html)
  );
}

async function sitemapUrls() {
  const xml = await fetchText(SITEMAP);
  return [...xml.matchAll(/<loc>(https:\/\/claude\.com\/[^<]+)<\/loc>/g)].map((match) => match[1]);
}

function englishOnly(url: string) {
  return !/\/(ko|ja|de|fr|it)\//.test(url);
}

function kindFromHay(hay: string): {
  category: string;
  skills: string[];
  constraints: string;
  decision: (title: string) => string;
  tradeoff: string;
} {
  if (/\bcowork\b/.test(hay)) {
    return {
      category: "claude-cowork",
      skills: normalizeSkills(["claude-cowork", "claude-api", "prompt-engineering", "workflow-automation"]),
      constraints:
        "Claude Cowork in the desktop app, with local files, connectors, and plugins where the job crosses apps.",
      decision: (title) => `${title} is a Claude Cowork workflow for multi-step knowledge work.`,
      tradeoff:
        "The work stays in Cowork so files and connected apps can move together without a custom agent runtime.",
    };
  }
  if (
    /\bworkflow\b|\bprocess\b|\bautomat|\bbatch\b|\bfolder\b|\bacross your tools\b|\bschedule\b|\breporting\b/.test(
      hay,
    )
  ) {
    return {
      category: "workflow-automation",
      skills: normalizeSkills(["workflow-automation", "claude-api", "prompt-engineering", "api"]),
      constraints:
        "Claude workflows that pull from folders, connected tools, or repeatable process steps instead of a one-off chat.",
      decision: (title) => `${title} is a Claude workflow that turns a repeatable process into a finished handoff.`,
      tradeoff:
        "The process stays in Claude so the prompt and tool connections can change without a custom RPA build.",
    };
  }
  if (/\bprompt\b|\blibrary\b|\bwrite\b|\bdraft\b|\brewrite\b|\badapt\b/.test(hay)) {
    return {
      category: "prompt-engineering",
      skills: normalizeSkills(["prompt-engineering", "claude-api", "ai"]),
      constraints:
        "Structured Claude prompts with roles, examples, and output format so the same job can be rerun.",
      decision: (title) => `${title} is a reusable Claude prompt pattern for a specific knowledge-work job.`,
      tradeoff:
        "The solution stays in a prompt and examples so it can ship without a custom app around the model.",
    };
  }
  return {
    category: "claude-api",
    skills: normalizeSkills(["claude-api", "api", "ai-agents"]),
    constraints:
      "Claude API (often via Amazon Bedrock or the Anthropic API) wired into an existing product or operations stack.",
    decision: (title) => `${title} uses the Claude API in a live product or operations workflow.`,
    tradeoff:
      "The team stays on Claude so reasoning and policy-sensitive work can ship without training a private model.",
  };
}

async function exampleFromPage(pageUrl: string, fallback: Partial<Example> = {}): Promise<Example | null> {
  const html = await fetchText(pageUrl);
  const title = cleanTitle(html);
  const description = og(html, "og:description") || fallback.description || clip(decode(html.slice(0, 8000)), 400);
  const imageUrl = [og(html, "og:image"), claudeInlineImage(html), fallback.imageUrl ?? ""]
    .map((url) => url.replace(/&amp;/g, "&"))
    .find((url) => url && /^https?:\/\//i.test(url) && !isGenericImage(url));
  if (!title || !imageUrl) return null;

  const hay = `${pageUrl} ${title} ${description}`.toLowerCase();
  const kind = /\/customers\//.test(pageUrl)
    ? /\bcowork\b/.test(hay)
      ? kindFromHay(`cowork ${hay}`)
      : kindFromHay("claude api platform case study")
    : /\/resources\/use-cases\//.test(pageUrl)
      ? kindFromHay(/\bcowork\b|\bbatch\b|\bfolder\b|\bacross your tools\b|\bdaily briefing\b|\bprocess flowchart\b/.test(hay) ? hay : `prompt library ${hay}`)
      : kindFromHay(/evaluate-prompts|prompt-generator|prompt-engineering/.test(pageUrl) ? `prompt ${hay}` : hay);
  return {
    title,
    tagline: clip(description, 180),
    liveUrl: pageUrl.replace(/\/+$/, ""),
    imageUrl,
    description,
    problem: description || `${title} needed Claude in a live workflow instead of a one-off chat.`,
    skills: kind.skills,
    category: kind.category,
    constraints: kind.constraints,
    decision: kind.decision(title),
    tradeoff: kind.tradeoff,
  };
}

async function scrapeCustomers(locs: string[]): Promise<Example[]> {
  const urls = unique(
    locs.filter((url) => /^https:\/\/claude\.com\/customers\/[^/]+$/.test(url) && englishOnly(url)),
    (url) => url,
  ).slice(0, CUSTOMER_LIMIT);

  const examples: Example[] = [];
  for (const pageUrl of urls) {
    try {
      const example = await exampleFromPage(pageUrl);
      if (example) examples.push(example);
    } catch {
      // keep going
    }
    await sleep(200);
  }
  return examples;
}

async function scrapeUseCases(locs: string[]): Promise<Example[]> {
  const urls = unique(
    locs.filter(
      (url) =>
        url.startsWith("https://claude.com/resources/use-cases/") &&
        englishOnly(url) &&
        !url.includes("use-cases-category"),
    ),
    (url) => url,
  ).slice(0, USECASE_LIMIT);

  const examples: Example[] = [];
  for (const pageUrl of urls) {
    try {
      const example = await exampleFromPage(pageUrl);
      if (example) examples.push(example);
    } catch {
      // keep going
    }
    await sleep(200);
  }
  return examples;
}

async function scrapePages(urls: string[]): Promise<Example[]> {
  const examples: Example[] = [];
  for (const pageUrl of urls) {
    try {
      const example = await exampleFromPage(pageUrl);
      if (example) examples.push(example);
    } catch {
      // keep going
    }
    await sleep(200);
  }
  return examples;
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
  const existing = await prisma.project.findFirst({ where: { liveUrl: example.liveUrl } });
  if (existing) return "skipped" as const;

  let slug = slugFromUrl(example.liveUrl, example.title);
  let n = 2;
  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${slugFromUrl(example.liveUrl, example.title)}-${n}`;
    n += 1;
  }

  const project = await prisma.project.create({
    data: {
      slug,
      ownerId,
      title: example.title,
      tagline: example.tagline,
      category: example.category,
      status: "published",
      liveUrl: example.liveUrl,
      outcome: "",
      problem: clip(example.problem, 600),
      constraints: example.constraints,
      decision: example.decision,
      tradeoff: example.tradeoff,
      method: "",
      writeup: example.description,
      skills: { create: example.skills.map((skill) => ({ skill })) },
    },
  });

  const saved = await saveBufferUpload(project.id, demo.buffer, demo.ext, demo.kind);
  await prisma.projectMedia.create({
    data: {
      projectId: project.id,
      kind: saved.kind,
      src: saved.src,
      caption: "",
      sortOrder: 0,
    },
  });

  return "created" as const;
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

    const locs = await sitemapUrls();
    const collected = [
      ...(await scrapeCustomers(locs)),
      ...(await scrapeUseCases(locs)),
      ...(await scrapePages(COWORK_PAGES)),
      ...(await scrapePages(PROMPT_PAGES)),
    ];
    const examples = unique(collected, (example) => example.liveUrl);
    if (examples.length === 0) {
      throw new Error("No Claude Cowork, prompt, workflow, or Claude API portfolios were scraped.");
    }

    let created = 0;
    let skipped = 0;
    const counts = new Map<string, number>();

    for (const example of examples) {
      process.stdout.write(`${example.category} · ${example.title}… `);
      const demo = await downloadDemoImage(example.imageUrl);
      if (!demo) {
        console.log("screenshot failed, skipped");
        skipped += 1;
        continue;
      }

      const results: Array<"created" | "skipped"> = [];
      for (const prisma of writers) {
        results.push(await upsertOn(prisma, owners.get(prisma)!, example, demo));
      }
      if (results.every((result) => result === "skipped")) {
        skipped += 1;
        console.log("exists");
      } else {
        created += 1;
        counts.set(example.category, (counts.get(example.category) ?? 0) + 1);
        console.log("ok");
      }
    }

    const summary = [...counts.entries()]
      .sort()
      .map(([category, count]) => `${category}:${count}`)
      .join(", ");
    console.log(
      `Claude / workflow projects: ${created} created, ${skipped} skipped, ${examples.length} scraped${summary ? ` (${summary})` : ""}.`,
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
