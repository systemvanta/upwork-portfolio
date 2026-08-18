import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const extraUsers: { name: string; email: string; password: string }[] = [
  // { name: "Teammate", email: "dev@example.com", password: "changeme123" },
];

async function upsertUser(
  prisma: PrismaClient,
  input: { name: string; email: string; password: string },
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  const password = await hashPassword(input.password);

  if (existing) {
    await prisma.account.updateMany({
      where: { userId: existing.id, providerId: "credential" },
      data: { password, updatedAt: new Date() },
    });
    return;
  }

  const userId = randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  }

  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });

  try {
    await upsertUser(prisma, { name: "Admin", email, password });
    for (const user of extraUsers) {
      await upsertUser(prisma, user);
    }
    console.log(`Seeded login user ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
