import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { updateProject } from "@/app/actions/projects";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";
import { getProjectBySlug, getPublishedProjects } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project || project.ownerId !== session.user.id) notFound();

  const published = await getPublishedProjects();
  const action = updateProject.bind(null, project.id);

  return (
    <>
      <Header count={published.length} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="kicker">Edit</p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-tight">{project.title}</h1>
        <div className="mt-10">
          <ProjectForm
            action={action}
            project={{
              id: project.id,
              title: project.title,
              tagline: project.tagline,
              category: project.category,
              skills: project.skills.map((row) => row.skill),
              liveUrl: project.liveUrl,
              media: project.media,
              outcome: project.outcome,
              problem: project.problem,
              constraints: project.constraints,
              decision: project.decision,
              tradeoff: project.tradeoff,
              method: project.method,
              writeup: project.writeup,
              status: project.status,
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
