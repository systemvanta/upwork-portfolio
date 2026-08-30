import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectCaseStudy } from "@/components/project-case-study";
import { getProjectBySlug, getPublishedCount, getRelatedProjectTitles } from "@/lib/projects";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Project" };
  return { title: project.title, description: project.tagline };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  const session = await getSession();
  if (!session?.user) redirect("/");
  const isOwner = session.user.id === project?.ownerId;

  if (!project) notFound();
  if (project.status !== "published" && !isOwner) notFound();

  const [count, others] = await Promise.all([
    getPublishedCount(),
    getRelatedProjectTitles(project.slug),
  ]);

  return (
    <>
      <Header count={count} />
      <main className="project-shell mx-auto flex-1 px-6 py-6">
        <ProjectCaseStudy
          project={project}
          others={others}
          moreHref={(itemSlug) => `/projects/${itemSlug}`}
          editHref={isOwner ? `/projects/${project.slug}/edit` : undefined}
        />
      </main>
      <Footer />
    </>
  );
}
