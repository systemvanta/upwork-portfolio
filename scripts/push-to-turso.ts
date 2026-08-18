import "dotenv/config";
import { createClient } from "@libsql/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { createPrismaClient } from "../src/lib/create-prisma";

async function applySchema(url: string, authToken: string) {
  const local = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const sqlite = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: local }),
  });
  const rows = await sqlite.$queryRawUnsafe<{ sql: string }[]>(
    `SELECT sql FROM sqlite_master
     WHERE type IN ('table', 'index')
       AND name NOT LIKE 'sqlite_%'
       AND sql IS NOT NULL
     ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`,
  );
  await sqlite.$disconnect();

  const remote = createClient({ url, authToken });
  for (const row of rows) {
    try {
      await remote.execute(row.sql);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already exists/i.test(message)) throw error;
    }
  }
}

async function copyMany<T extends object>(
  label: string,
  rows: T[],
  write: (batch: T[]) => Promise<unknown>,
) {
  if (rows.length === 0) {
    console.log(label, 0);
    return;
  }
  const size = 50;
  for (let i = 0; i < rows.length; i += size) {
    await write(rows.slice(i, i + size));
  }
  console.log(label, rows.length);
}

async function copyAll() {
  const localUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const local = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: localUrl }),
  });
  const remote = createPrismaClient({ turso: true });

  try {
    const users = await local.user.findMany();
    await copyMany("users", users, (data) => remote.user.createMany({ data }));
    const accounts = await local.account.findMany();
    await copyMany("accounts", accounts, (data) => remote.account.createMany({ data }));
    const sessions = await local.session.findMany();
    await copyMany("sessions", sessions, (data) => remote.session.createMany({ data }));
    const verifications = await local.verification.findMany();
    await copyMany("verifications", verifications, (data) =>
      remote.verification.createMany({ data }),
    );
    const projects = await local.project.findMany();
    await copyMany("projects", projects, (data) => remote.project.createMany({ data }));
    const skills = await local.projectSkill.findMany();
    await copyMany("skills", skills, (data) => remote.projectSkill.createMany({ data }));
    const media = await local.projectMedia.findMany();
    await copyMany("media", media, (data) => remote.projectMedia.createMany({ data }));
    const cache = await local.matchCache.findMany();
    await copyMany("matchCache", cache, (data) => remote.matchCache.createMany({ data }));
    const shares = await local.shareLink.findMany();
    await copyMany("shareLinks", shares, (data) => remote.shareLink.createMany({ data }));
  } finally {
    await local.$disconnect();
    await remote.$disconnect();
  }
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required in .env");
  }
  await applySchema(url, authToken);
  await copyAll();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
