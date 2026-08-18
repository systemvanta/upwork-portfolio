import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import { SiteLogo } from "@/components/site-logo";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/projects");

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center px-6 py-20">
        <section className="card px-6 py-8 sm:px-8">
          <SiteLogo size={56} />
          <p className="kicker mt-5">Sign in</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-ink">
            Portfolio Hub
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-ink-dim">
            Provisioned accounts only. There is no signup.
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
