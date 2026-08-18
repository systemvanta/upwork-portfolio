import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

function parseLibsqlUrl(raw: string) {
  const parsed = new URL(raw);
  const authToken =
    parsed.searchParams.get("authToken") ?? process.env.TURSO_AUTH_TOKEN ?? undefined;
  parsed.searchParams.delete("authToken");
  return { url: parsed.toString(), authToken };
}

export function resolveTurso(force = false) {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.startsWith("libsql:") || databaseUrl.startsWith("https://")) {
    return parseLibsqlUrl(databaseUrl);
  }
  if (
    process.env.TURSO_DATABASE_URL &&
    (force || process.env.NODE_ENV === "production" || process.env.USE_TURSO === "1")
  ) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  return null;
}

export function createPrismaClient(options?: { turso?: boolean }) {
  const turso = resolveTurso(options?.turso);
  if (turso) {
    return new PrismaClient({ adapter: new PrismaLibSql(turso) });
  }
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}
