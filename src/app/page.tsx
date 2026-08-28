import { Footer } from "@/components/footer";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteLogo } from "@/components/site-logo";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/projects");

  return (
    <>
      <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center px-6 py-16">
        <section className="card w-full max-w-[400px] px-10 py-12">
          <div className="rise flex justify-center">
            <SiteLogo large />
          </div>
          <h1 className="rise-2 mt-8 text-center text-[27px] font-bold tracking-tight">
            Welcome
          </h1>
          <p className="rise-3 mt-2 text-center text-[15px] leading-6 text-ink-dim">
            A private catalog of published portfolios. Clients see only what you
            send them.
          </p>
          <Link href="/login" className="btn btn-primary rise-4 mt-8 w-full">
            Sign in
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
