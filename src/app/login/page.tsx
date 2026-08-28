import { Footer } from "@/components/footer";
import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteLogo } from "@/components/site-logo";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
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
            Log in to continue to the registry
          </p>
          <div className="rise-4 mt-8">
            <LoginForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
