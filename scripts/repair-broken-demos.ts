import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { removeStoredUpload, saveBufferUpload } from "../src/lib/media-store";
import { screenshotPage } from "./chrome-screenshot";

function hostKey(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function cdxSearch(url: string) {
  const cdx = new URL("https://web.archive.org/cdx/search/cdx");
  cdx.searchParams.set("url", url);
  cdx.searchParams.append("filter", "statuscode:200");
  cdx.searchParams.append("filter", "mimetype:text/html");
  cdx.searchParams.set("fl", "timestamp,original");
  cdx.searchParams.set("output", "json");
  cdx.searchParams.set("limit", "20");
  cdx.searchParams.set("from", "2010");
  cdx.searchParams.set("to", "2020");

  const response = await fetch(cdx, {
    headers: { "user-agent": "Mozilla/5.0 PortfolioHubBot/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as Array<string[]>;
  return rows
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => ({ timestamp: row[0], original: row[1] }));
}

function closestSnapshot(
  captures: { timestamp: string; original: string }[],
) {
  const target = 20150615000000;
  return [...captures].sort(
    (a, b) =>
      Math.abs(Number(a.timestamp) - target) -
      Math.abs(Number(b.timestamp) - target),
  )[0];
}

async function waybackSnapshot(liveUrl: string) {
  const host = hostKey(liveUrl);
  if (!host) return null;
  const queries = [`${host}/`, `www.${host}/`, host];
  for (const query of queries) {
    const captures = await cdxSearch(query);
    if (captures.length === 0) continue;
    const best = closestSnapshot(captures);
    if (!best) continue;
    return `https://web.archive.org/web/${best.timestamp}if_/${best.original}`;
  }
  return null;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const projects = await prisma.project.findMany({
      include: { media: true },
      orderBy: { title: "asc" },
    });

    const broken = projects.filter((project) => {
      if (!project.liveUrl) return false;
      if (project.media.length === 0) return true;
      return project.media.every((item) => item.caption === "Live site demo");
    });

    let replaced = 0;
    let removed = 0;
    let failed = 0;

    for (const project of broken) {
      process.stdout.write(`${project.title}… `);
      const snapshot = await waybackSnapshot(project.liveUrl!);
      const demo = snapshot ? await screenshotPage(snapshot) : null;

      if (!demo) {
        for (const item of project.media) {
          await removeStoredUpload(item.src);
        }
        if (project.media.length > 0) {
          await prisma.projectMedia.deleteMany({
            where: { projectId: project.id },
          });
          removed += 1;
        }
        console.log(snapshot ? "screenshot failed" : "no archive");
        failed += 1;
        continue;
      }

      for (const item of project.media) {
        await removeStoredUpload(item.src);
      }
      if (project.media.length > 0) {
        await prisma.projectMedia.deleteMany({
          where: { projectId: project.id },
        });
      }
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
          caption: `Archived storefront — ${project.title}`,
          sortOrder: 0,
        },
      });
      console.log("replaced");
      replaced += 1;
    }

    console.log(
      `Repaired demos: ${replaced} archived storefronts, ${removed} error shots removed, ${failed} still missing, ${broken.length} broken previews found.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
