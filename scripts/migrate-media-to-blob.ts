import "dotenv/config";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { isLocalUpload } from "../src/lib/media";
import {
  removeStoredUpload,
  saveBufferUpload,
  usesBlobStorage,
} from "../src/lib/media-store";

async function main() {
  if (!usesBlobStorage()) {
    throw new Error(
      "Set BLOB_READ_WRITE_TOKEN (Vercel Blob) then run this again.",
    );
  }

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    const media = await prisma.projectMedia.findMany();
    let moved = 0;
    let skipped = 0;

    for (const item of media) {
      if (!isLocalUpload(item.src)) {
        skipped += 1;
        continue;
      }

      const filePath = path.join(
        process.cwd(),
        "public",
        item.src.replace(/^\//, ""),
      );
      process.stdout.write(`${item.src}… `);
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).replace(".", "") || "webp";
      const kind = item.kind === "video" ? "video" : "image";
      const saved = await saveBufferUpload(item.projectId, buffer, ext, kind);

      await prisma.projectMedia.update({
        where: { id: item.id },
        data: { src: saved.src },
      });
      await removeStoredUpload(item.src);
      console.log("ok");
      moved += 1;
    }

    console.log(`Moved ${moved} local files to Vercel Blob (${skipped} already remote).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
