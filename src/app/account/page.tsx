import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountForms } from "@/components/account-form";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getPublishedCount } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    password?: string;
    emailError?: string;
    passwordError?: string;
  }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");

  const count = await getPublishedCount();
  const params = await searchParams;
  const notice =
    params.email === "ok"
      ? "Email updated."
      : params.email === "same"
        ? "That is already your email."
        : params.password === "ok"
          ? "Password updated."
          : undefined;

  return (
    <>
      <Header count={count} />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <p className="kicker">Account</p>
        <h1 className="mt-2 text-[40px] font-semibold tracking-tight">
          Email and password
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-ink-dim">
          Signed in as {session.user.email}. Changes apply to this login only.
        </p>
        <div className="mt-10">
          <AccountForms
            email={session.user.email}
            notice={notice}
            emailError={params.emailError}
            passwordError={params.passwordError}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
