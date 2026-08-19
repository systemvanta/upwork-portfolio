import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { createPrismaClient } from "../src/lib/create-prisma";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const ZAPIER_LIMIT = Math.max(1, Number(process.env.ZAPIER_LIMIT ?? "40"));

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
      .replace(/^-+|-+$/g, "") || "ai-project"
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

function looksHashed(value: string) {
  return /^[a-f0-9]{40,}$/i.test(value.trim());
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xml,application/json" },
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

function plainText(html: string) {
  return decode(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
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

function absolute(href: string, origin: string) {
  try {
    const url = new URL(href, origin);
    url.hash = "";
    const normalized = url.toString().replace(/\/+$/, "");
    return normalized;
  } catch {
    return "";
  }
}

async function pageMeta(pageUrl: string) {
  const html = await fetchText(pageUrl);
  const titleRaw = heading(html) || og(html, "og:title");
  const title = titleRaw.replace(/\s*\|\s*(Voiceflow|Landbot|Botpress|Zapier).*$/i, "").trim();
  const description = og(html, "og:description") || clip(plainText(html), 400);
  const imageUrl = og(html, "og:image");
  return { html, title, description, imageUrl };
}

function botSkills(extra: string[]) {
  return normalizeSkills(["chatbot", "ai-agents", ...extra]);
}

function apiSkills(extra: string[]) {
  return normalizeSkills(["api", "api-integration", ...extra]);
}

async function scrapeVoiceflow(): Promise<Example[]> {
  const listing = "https://www.voiceflow.com/customer-stories";
  const html = await fetchText(listing);
  const hrefs = [
    ...html.matchAll(/href="((?:https:\/\/www\.voiceflow\.com)?\/stories\/[^"]+)"/g),
  ].map((match) => absolute(match[1], "https://www.voiceflow.com"));
  const urls = unique(
    hrefs.filter((url) => url.includes("/stories/") && !/g2-2026|award/i.test(url)),
    (url) => url.replace(/\/+$/, ""),
  );

  const examples: Example[] = [];
  for (const pageUrl of urls) {
    const meta = await pageMeta(pageUrl);
    await sleep(200);
    if (!meta.title || looksHashed(meta.title) || !meta.imageUrl) continue;
    examples.push({
      title: meta.title,
      tagline: clip(meta.description, 180),
      liveUrl: pageUrl,
      imageUrl: meta.imageUrl,
      description: meta.description,
      problem:
        meta.description ||
        `${meta.title} needed an AI support agent that could answer customers without a long custom bot rewrite.`,
      skills: botSkills(["voiceflow", "openai"]),
      category: "chatbot",
      constraints:
        "Voiceflow conversational flows with knowledge, channels, and handoff into the existing support stack.",
      decision: `${meta.title} is a shipped Voiceflow AI chatbot for customer conversations.`,
      tradeoff:
        "The agent stays on Voiceflow so support flows and copy can change without rebuilding a custom chat runtime.",
    });
  }
  return examples;
}

async function scrapeBotpress(): Promise<Example[]> {
  const listing = "https://botpress.com/customers";
  const html = await fetchText(listing);
  const cards = [
    ...html.matchAll(
      /href="(\/customers\/[a-z0-9-]+)" class="cs_card[^"]*"[\s\S]{0,2500}?<img[^>]+src="(https:\/\/cdn\.prod\.website-files\.com\/[^"]+)"[\s\S]{0,2500}?<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    ),
  ];

  const examples: Example[] = [];
  for (const match of cards) {
    const pageUrl = absolute(match[1], "https://botpress.com");
    if (!pageUrl || /\/customers\/botpress$/i.test(pageUrl)) continue;
    const imageUrl = match[2];
    const cardTitle = decode(match[3]);
    if (!imageUrl || /open-graph\.jpg/i.test(imageUrl)) continue;

    let meta: Awaited<ReturnType<typeof pageMeta>>;
    try {
      meta = await pageMeta(pageUrl);
    } catch {
      await sleep(200);
      continue;
    }
    await sleep(200);

    const title = [cardTitle, meta.title]
      .find((value) => value && !looksHashed(value) && !/^customers$/i.test(value))
      ?.trim();
    if (!title) continue;

    const description =
      (!looksHashed(meta.description) && meta.description) ||
      `${title} automated customer conversations with a Botpress AI agent.`;
    examples.push({
      title,
      tagline: clip(description, 180),
      liveUrl: pageUrl,
      imageUrl,
      description,
      problem: description,
      skills: botSkills(["api"]),
      category: "chatbot",
      constraints:
        "Botpress AI agent with knowledge, channels, and API hooks into the tools the team already used.",
      decision: `${title} is a live Botpress chatbot handling customer questions and handoff.`,
      tradeoff:
        "The bot stays on Botpress so flows and integrations can ship without a custom agent framework.",
    });
  }
  return examples;
}

async function scrapeLandbot(): Promise<Example[]> {
  const listing = "https://landbot.io/case-studies";
  const html = await fetchText(listing);
  const hrefs = [
    ...html.matchAll(/href="((?:https:\/\/landbot\.io)?\/case-studies\/[a-z0-9-]+)"/g),
  ].map((match) => absolute(match[1], "https://landbot.io"));
  const skip = new Set(["conversational-design", "all", "emma"]);
  const urls = unique(
    hrefs.filter((url) => {
      const slug = url.split("/").filter(Boolean).pop() ?? "";
      return !skip.has(slug);
    }),
    (url) => url.replace(/\/+$/, ""),
  );

  const examples: Example[] = [];
  for (const pageUrl of urls) {
    const meta = await pageMeta(pageUrl);
    await sleep(200);
    const canonical = og(meta.html, "og:url");
    if (/\/case-studies\/?$/i.test(canonical || "")) continue;
    if (!meta.title || looksHashed(meta.title) || !meta.imageUrl) continue;
    if (/case studies & success stories/i.test(meta.title)) continue;
    examples.push({
      title: meta.title,
      tagline: clip(meta.description, 180),
      liveUrl: pageUrl,
      imageUrl: meta.imageUrl,
      description: meta.description,
      problem:
        meta.description ||
        `${meta.title} needed a chatbot that could qualify and support people on web and WhatsApp.`,
      skills: botSkills(["api", "webhook"]),
      category: "chatbot",
      constraints:
        "Landbot conversational flows with WhatsApp or web chat and API hooks into CRM or support tools.",
      decision: `${meta.title} is a shipped Landbot chatbot used in a live customer operation.`,
      tradeoff:
        "The conversation stays in Landbot so non-technical teams can edit flows without a custom messenger app.",
    });
  }
  return examples;
}

function zapierCategory(slug: string, title: string, description: string, listing: "chatbot" | "api") {
  const hay = `${slug} ${title} ${description}`.toLowerCase();
  const isBot =
    listing === "chatbot" ||
    /\bchatbot\b|\bchat bot\b|\bai chat\b|\bfaq\b|\bhelpdesk\b|\bassistant bot\b/.test(hay);
  if (isBot) {
    return {
      category: "chatbot",
      skills: botSkills(["zapier", "api", /\bopenai|gpt|gemini|claude\b/.test(hay) ? "openai" : ""]),
    };
  }
  return {
    category: "api-integration",
    skills: apiSkills(["zapier", /\bwebhook|http\b/.test(hay) ? "webhook" : ""]),
  };
}

async function scrapeZapierListing(
  listingUrl: string,
  listing: "chatbot" | "api",
): Promise<Example[]> {
  const html = await fetchText(listingUrl);
  const slugs = unique(
    [...html.matchAll(/\/templates\/details\/([a-z0-9-]+)/g)].map((match) => match[1]),
    (slug) => slug,
  ).slice(0, ZAPIER_LIMIT);

  const examples: Example[] = [];
  for (const slug of slugs) {
    const pageUrl = `https://zapier.com/templates/details/${slug}`;
    let meta: Awaited<ReturnType<typeof pageMeta>>;
    try {
      meta = await pageMeta(pageUrl);
    } catch {
      await sleep(200);
      continue;
    }
    await sleep(200);
    if (!meta.title || !meta.imageUrl) continue;
    if (/n8n-og-image|zapier-og|default[-_]og/i.test(meta.imageUrl)) continue;

    const kind = zapierCategory(slug, meta.title, meta.description, listing);
    examples.push({
      title: meta.title.replace(/\s*template$/i, "").trim() || meta.title,
      tagline: clip(meta.description, 180),
      liveUrl: pageUrl,
      imageUrl: meta.imageUrl,
      description: meta.description,
      problem:
        meta.description ||
        `${meta.title} connects apps so a repetitive chat or API job does not stay manual.`,
      skills: kind.skills,
      category: kind.category,
      constraints:
        listing === "chatbot"
          ? "Zapier chatbot and app steps, with API or table storage where the conversation needs memory."
          : "Zapier app connectors, webhooks, and API steps across the tools already in the stack.",
      decision: `${meta.title} is a working Zapier ${listing === "chatbot" ? "chatbot" : "API"} workflow.`,
      tradeoff:
        "The workflow stays in Zapier so connectors can change without a custom integration service.",
    });
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

    const collected = [
      ...(await scrapeVoiceflow()),
      ...(await scrapeBotpress()),
      ...(await scrapeLandbot()),
      ...(await scrapeZapierListing("https://zapier.com/templates/chatbot", "chatbot")),
      ...(await scrapeZapierListing("https://zapier.com/templates/ai-workflows", "api")),
    ];
    const examples = unique(collected, (example) => example.liveUrl);
    if (examples.length === 0) {
      throw new Error("No AI bot or API integration portfolios were scraped.");
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
      `AI bot / API projects: ${created} created, ${skipped} skipped, ${examples.length} scraped${summary ? ` (${summary})` : ""}.`,
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
