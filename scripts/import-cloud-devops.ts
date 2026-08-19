import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeSkills } from "../src/data/skill-aliases";
import { createPrismaClient } from "../src/lib/create-prisma";
import { saveBufferUpload } from "../src/lib/media-store";
import { downloadDemoImage } from "./createtoday-demos";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const AWS_LIMIT = Math.max(1, Number(process.env.CLOUD_AWS_LIMIT ?? "24"));
const GITLAB_LIMIT = Math.max(1, Number(process.env.CLOUD_GITLAB_LIMIT ?? "24"));
const CLOUD_CATEGORIES = new Set(["aws", "azure", "gcp", "devops", "ci-cd"]);

type JsonLd = Record<string, unknown>;

type Example = {
  title: string;
  tagline: string;
  liveUrl: string;
  imageUrl: string;
  description: string;
  problem: string;
  category: string;
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
      .replace(/^-+|-+$/g, "") || "cloud-project"
  );
}

function slugFromUrl(liveUrl: string, title: string) {
  try {
    const url = new URL(liveUrl);
    const host = url.hostname.replace(/^www\./, "").replace(/\./g, "-");
    const leaf = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return (leaf ? `${host}-${leaf}` : host).toLowerCase() || slugify(title);
  } catch {
    return slugify(title);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textField(obj: JsonLd | null, key: string) {
  const value = obj?.[key];
  return typeof value === "string" ? value : "";
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/json" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not load ${url} (${response.status})`);
  }
  return response.text();
}

function categorize(text: string): string {
  const hay = text.toLowerCase();
  const azure = (hay.match(/\bazure\b/g) ?? []).length;
  const aws = (hay.match(/\baws\b|\bamazon web services\b/g) ?? []).length;
  const gcp = (hay.match(/\bgcp\b|\bgoogle cloud\b/g) ?? []).length;
  if (azure > aws && azure > gcp) return "azure";
  if (aws > azure && aws > gcp) return "aws";
  if (gcp > azure && gcp > aws) return "gcp";
  if (/\bci\/?cd\b|\bpipeline|\bgithub actions\b|\bgitlab ci\b|\bjenkins\b/.test(hay)) {
    return "ci-cd";
  }
  return "devops";
}

function skillsFrom(text: string, category: string) {
  const hay = text.toLowerCase();
  const extras = [category, "devops", "ci-cd"];
  if (/\baws\b|\bamazon\b/.test(hay)) extras.push("aws");
  if (/\bazure\b/.test(hay)) extras.push("azure");
  if (/\bgcp\b|\bgoogle cloud\b/.test(hay)) extras.push("gcp");
  if (/\bkubernetes\b|\beks\b|\baks\b|\bgke\b|\bk8s\b/.test(hay)) extras.push("kubernetes");
  if (/\bterraform\b/.test(hay)) extras.push("terraform");
  if (/\bdocker\b/.test(hay)) extras.push("docker");
  if (/\bgithub actions\b/.test(hay)) extras.push("github-actions");
  if (/\bgitlab\b/.test(hay)) extras.push("gitlab");
  if (/\bjenkins\b/.test(hay)) extras.push("jenkins");
  return normalizeSkills(extras);
}

function og(html: string, property: string) {
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, "i"),
  );
  return match?.[1] ? decode(match[1]) : "";
}

async function loadAwsExamples() {
  const examples: Example[] = [];
  for (let page = 0; page < 8 && examples.length < AWS_LIMIT; page += 1) {
    const url =
      "https://aws.amazon.com/api/dirs/items/search?item.directoryId=customer-references" +
      "&item.locale=en_US&size=20&sort_by=item.additionalFields.sortDate&sort_order=desc" +
      `&tags.id=${encodeURIComponent("GLOBAL#methodology#devops")}&page=${page}`;
    const payload = JSON.parse(await fetchText(url)) as { items?: JsonLd[] };
    const rows = payload.items ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
      if (examples.length >= AWS_LIMIT) break;
      const item = (row.item as JsonLd | undefined) ?? {};
      const fields = (item.additionalFields as JsonLd | undefined) ?? {};
      const title = decode(textField(fields, "headline") || textField(fields, "customer-name"));
      const liveUrl = textField(fields, "headlineUrl").split("?")[0];
      const imageUrl = textField(fields, "imageSrcUrl");
      const description = decode(
        textField(fields, "description") || textField(fields, "descriptionSummary"),
      );
      if (!title || !liveUrl || !imageUrl) continue;
      const category = categorize(`${title} ${description}`);
      const resolved = category === "azure" || category === "gcp" || category === "ci-cd" || category === "devops"
        ? category
        : "aws";
      examples.push({
        title,
        tagline: clip(description, 180) || title,
        liveUrl,
        imageUrl,
        description,
        problem:
          description ||
          `${title} needed cloud delivery that could ship without a long manual release cycle.`,
        category: resolved,
        skills: skillsFrom(`${title} ${description} aws devops ci-cd`, resolved),
      });
    }
  }
  return examples;
}

async function gitlabCustomerPaths() {
  const html = await fetchText("https://about.gitlab.com/customers/all/");
  const skip = new Set(["all", "index", "sign", "bab"]);
  const paths = [...html.matchAll(/href="(\/customers\/[a-z0-9-]+\/?)"/g)].map((match) => match[1]);
  return [...new Set(paths)].filter((path) => {
    const slug = path.replace(/\/customers\//, "").replace(/\//g, "");
    return slug && !skip.has(slug);
  });
}

async function loadGitlabExamples() {
  const examples: Example[] = [];
  const paths = (await gitlabCustomerPaths()).slice(0, GITLAB_LIMIT);
  for (const path of paths) {
    const pageUrl = `https://about.gitlab.com${path}`;
    let html: string;
    try {
      html = await fetchText(pageUrl);
    } catch {
      continue;
    }
    const title = og(html, "og:title").replace(/\s*\|\s*GitLab.*$/i, "").trim();
    const description = og(html, "og:description");
    const imageUrl = og(html, "og:image");
    const liveUrl = og(html, "og:url") || pageUrl;
    if (!title || !imageUrl) continue;
    const hay = `${title} ${description}`;
    const category = categorize(hay);
    examples.push({
      title,
      tagline: clip(description, 180) || title,
      liveUrl,
      imageUrl,
      description,
      problem:
        description ||
        `${title} needed a single CI/CD path so teams could ship without stitching together separate tools.`,
      category,
      skills: skillsFrom(`${hay} gitlab ci-cd devops`, category),
    });
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
  const existing =
    (await prisma.project.findFirst({ where: { liveUrl: example.liveUrl } })) ??
    (await prisma.project.findFirst({
      where: { title: example.title, category: example.category },
    }));

  let slug = slugFromUrl(example.liveUrl, example.title);
  if (!existing) {
    let n = 2;
    const base = slug;
    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${base}-${n}`;
      n += 1;
    }
  }

  const payload = {
    title: example.title,
    tagline: example.tagline,
    category: example.category,
    status: "published" as const,
    liveUrl: example.liveUrl,
    outcome: "",
    problem: clip(example.problem, 800),
    constraints:
      "Cloud accounts, CI/CD pipelines, and infrastructure that had to stay reviewable as the product changed.",
    decision:
      example.description ||
      `${example.title} is a cloud and delivery case study.`,
    tradeoff:
      "The work standardizes on managed cloud and CI/CD instead of one-off servers and manual releases.",
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

    const examples = [...(await loadAwsExamples()), ...(await loadGitlabExamples())];
    if (examples.length === 0) {
      throw new Error("No AWS or GitLab cloud/DevOps case studies were found.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const example of examples) {
      if (!CLOUD_CATEGORIES.has(example.category)) {
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
      console.log(`${wasExisting ? "updated" : "ok"} [${example.category}]`);
    }

    console.log(
      `Cloud/DevOps projects: ${created} created, ${updated} updated, ${skipped} skipped, ${examples.length} sourced.`,
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
