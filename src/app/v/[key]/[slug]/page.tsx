import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientHeader } from "@/components/client-header";
import { ProjectCaseStudy } from "@/components/project-case-study";
import { getProjectBySlug } from "@/lib/projects";
import { getShareLink, projectsForShare } from "@/lib/share";

type PageProps = {
  params: Promise<{ key: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { key, slug } = await params;
  const share = await getShareLink(key);
  if (!share) return { title: "Portfolio" };
  const listed = await projectsForShare(share);
  if (!listed.some((item) => item.slug === slug)) return { title: "Portfolio" };
  const project = await getProjectBySlug(slug);
  if (!project) return { title: "Portfolio" };
  return { title: project.title, description: project.tagline };
}

export default async function ClientProjectPage({ params }: PageProps) {
  const { key, slug } = await params;
  const share = await getShareLink(key);
  if (!share) notFound();

  const listed = await projectsForShare(share);
  if (!listed.some((item) => item.slug === slug)) notFound();
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const others = listed.filter((item) => item.slug !== project.slug);

  return (
    <>
      <ClientHeader shareKey={key} />
      <main className="project-shell page-focus mx-auto flex-1 px-6 py-6">
        <ProjectCaseStudy
          project={project}
          others={others}
          moreHref={(itemSlug) => `/v/${key}/${itemSlug}`}
        />
      </main>
    </>
  );
}
