"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function fail(kind: "email" | "password", message: string): never {
  redirect(`/account?${kind}Error=${encodeURIComponent(message)}`);
}

async function requireAccount() {
  const session = await getSession();
  if (!session?.user) redirect("/");

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential" },
  });
  if (!account || !account.password) {
    fail("email", "This account cannot change email or password here.");
  }

  return { session, account, passwordHash: account.password };
}

async function checkCurrentPassword(
  hash: string,
  password: string,
  kind: "email" | "password",
) {
  const ok = await verifyPassword({ hash, password });
  if (!ok) fail(kind, "Current password is wrong.");
}

export async function changeAccountEmail(formData: FormData) {
  const { session, passwordHash } = await requireAccount();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email.includes("@")) fail("email", "Enter a valid email.");
  await checkCurrentPassword(passwordHash, currentPassword, "email");

  if (email === session.user.email) {
    revalidatePath("/account");
    redirect("/account?email=same");
  }

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== session.user.id) {
    fail("email", "That email is already in use.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, updatedAt: new Date() },
  });

  revalidatePath("/account");
  redirect("/account?email=ok");
}

export async function changeAccountPassword(formData: FormData) {
  const { account, passwordHash } = await requireAccount();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    fail("password", "New password must be at least 8 characters.");
  }
  if (newPassword !== confirmPassword) {
    fail("password", "New passwords do not match.");
  }

  await checkCurrentPassword(passwordHash, currentPassword, "password");

  await prisma.account.update({
    where: { id: account.id },
    data: {
      password: await hashPassword(newPassword),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/account");
  redirect("/account?password=ok");
}
