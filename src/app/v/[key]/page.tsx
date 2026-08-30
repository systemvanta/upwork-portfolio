import { notFound } from "next/navigation";
import { ClientHeader } from "@/components/client-header";
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

  return (
    <>
      <ClientHeader shareKey={key} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="card px-6 py-10 sm:px-10">
        {projects.length === 0 ? (
          <p className="text-ink-dim">No portfolios match this skill set.</p>
        ) : (
          <ol className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                href={`/v/${key}/${project.slug}`}
                delay={80 + index * 60}
              />
            ))}
          </ol>
        )}
        </div>
      </main>
    </>
  );
}