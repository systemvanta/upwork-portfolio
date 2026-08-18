import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProjectCard } from "@/components/project-card";
import { site } from "@/data/site";
import { isCategorySlug } from "@/data/categories";
import { filterByCategory, getPublishedProjects } from "@/lib/projects";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const session = await getSession();
  if (!session?.user) redirect("/");
  const category = rawCategory && isCategorySlug(rawCategory) ? rawCategory : undefined;
  let published: Awaited<ReturnType<typeof getPublishedProjects>> = [];
  try {
    published = await getPublishedProjects();
  } catch {
    published = [];
  }
  const projects = filterByCategory(published, category);

  return (
    <>
      <Header count={published.length} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <p className="kicker">Registry</p>
        <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-tight text-ink sm:text-[56px]">
          {site.name}
        </h1>
        <p className="mt-4 max-w-xl text-[17px] leading-7 text-ink-dim">{site.tagline}</p>
        <div className="mt-10">
          <CategoryChips active={category} basePath="/projects" />
        </div>
        {projects.length === 0 ? (
          <EmptyState
            signedIn={Boolean(session?.user)}
            title={
              category
                ? "No portfolios in this category"
                : "Nothing in the registry yet"
            }
            body={
              category
                ? "No published projects match this category. Try All."
                : "Published project portfolios will list here."
            }
          />
        ) : (
          <ol className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ol>
        )}
      </main>
      <Footer />
    </>
  );
}
