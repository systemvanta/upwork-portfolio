import "dotenv/config";
import { rm } from "fs/promises";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { removeStoredUpload } from "../src/lib/media-store";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const broken = await prisma.projectMedia.findMany({
      where: { caption: "Live site demo" },
    });

    for (const item of broken) {
      await removeStoredUpload(item.src);
    }
    if (broken.length > 0) {
      await prisma.projectMedia.deleteMany({
        where: { id: { in: broken.map((item) => item.id) } },
      });
    }

    const withoutPreview = await prisma.project.findMany({
      where: { media: { none: {} } },
      select: { id: true, title: true },
    });
    const ids = withoutPreview.map((project) => project.id);
    if (ids.length > 0) {
      await prisma.project.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.matchCache.deleteMany();

    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    await Promise.all(
      ids.map((id) => rm(path.join(uploadsRoot, id), { recursive: true, force: true })),
    );

    console.log(
      `Removed ${broken.length} broken live-site previews and deleted ${withoutPreview.length} portfolios with no screenshot.`,
    );
    for (const project of withoutPreview) {
      console.log(`- ${project.title}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
