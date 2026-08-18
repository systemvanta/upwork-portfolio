import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createProject } from "@/app/actions/projects";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";
import { getPublishedProjects } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Register project" };

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const published = await getPublishedProjects();

  return (
    <>
      <Header count={published.length} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="kicker">Register</p>
        <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-tight sm:text-[48px]">
          Register a project
        </h1>
        <p className="mt-4 max-w-xl text-ink-dim leading-7">
          Add a portfolio to the hub with screenshots or a video demo.
          Published projects appear in the registry and in generated skill
          links.
        </p>
        <div className="mt-10">
          <ProjectForm action={createProject} />
        </div>
      </main>
      <Footer />
    </>
  );
}
