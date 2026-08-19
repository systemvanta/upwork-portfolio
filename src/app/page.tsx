import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLogo } from "@/components/site-logo";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/projects");

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-6 py-20 text-center">
        <SiteLogo size={64} />
        <h1 className="mt-6 text-[34px] font-semibold leading-none tracking-tight text-ink">
          Selected work
        </h1>
        <p className="mt-4 text-[15px] leading-6 text-ink-dim">
          Portfolios are shared privately, by invitation.
        </p>
      </main>
      <Footer />
    </>
  );
}
