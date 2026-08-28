import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";
import { getPublishedCount } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Register project" };

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session?.user) redirect("/");
  const count = await getPublishedCount();

  return (
    <>
      <Header count={count} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">
        <div className="card px-8 py-10">
        <p className="kicker rise">Register</p>
        <h1 className="display rise-2 mt-3 text-[36px] sm:text-[44px]">
          Register a project
        </h1>
        <p className="rise-3 mt-4 max-w-xl text-ink-dim leading-7">
          Add a portfolio to the hub with screenshots or a video demo.
          Published projects appear in the registry and in generated skill
          links.
        </p>
        <div className="rise-4 mt-10">
          <ProjectForm action={createProject} />
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
