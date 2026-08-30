import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { updateProject } from "@/app/actions/projects";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectForm } from "@/components/project-form";
import { getProjectBySlug, getPublishedCount } from "@/lib/projects";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project || project.ownerId !== session.user.id) notFound();

  const count = await getPublishedCount();
  const action = updateProject.bind(null, project.id);

  return (
    <>
      <Header count={count} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <div className="card px-8 py-10">
        <p className="kicker rise">Edit</p>
        <h1 className="display rise-2 mt-3 text-[32px]">{project.title}</h1>
        <div className="rise-3 mt-10">
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
            }}
          />
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
