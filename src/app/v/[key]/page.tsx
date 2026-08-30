import { notFound } from "next/navigation";
import { ClientHeader } from "@/components/client-header";
import { PortfolioIntro } from "@/components/portfolio-intro";
import { ProjectCard } from "@/components/project-card";
import { getShareLink, projectsForShare } from "@/lib/share";

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const share = await getShareLink(key);
  if (!share) notFound();

  const projects = await projectsForShare(share);
  const countLabel = `${projects.length} portfolio${projects.length === 1 ? "" : "s"}`;

  return (
    <>
      <ClientHeader shareKey={key} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="card px-6 py-10 sm:px-10">
          <PortfolioIntro
            eyebrow="Curated selection"
            title="Selected work"
            description={
              projects.length > 0
                ? `${countLabel} matched to your brief. Open any project for the full case study.`
                : "No portfolios match this skill set yet."
            }
            skills={share.skills}
          />
          {projects.length > 0 ? (
            <ol className="portfolio-grid">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  href={`/v/${key}/${project.slug}`}
                  delay={80 + index * 60}
                />
              ))}
            </ol>
          ) : null}
        </div>
      </main>
    </>
  );
}
