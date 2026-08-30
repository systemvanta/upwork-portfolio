import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PortfolioIntro } from "@/components/portfolio-intro";
import { ProjectGrid } from "@/components/project-grid";
import { site } from "@/data/site";
import { isCategorySlug } from "@/data/categories";
import { getPublishedCount, listPublishedProjects } from "@/lib/projects";
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

  let count = 0;
  let projects: Awaited<ReturnType<typeof listPublishedProjects>>["projects"] = [];
  let nextCursor: string | null = null;
  try {
    const [total, page] = await Promise.all([
      getPublishedCount(),
      listPublishedProjects({ category }),
    ]);
    count = total;
    projects = page.projects;
    nextCursor = page.nextCursor;
  } catch {
    count = 0;
  }

  return (
    <>
      <Header count={count} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <div className="card px-6 py-10 sm:px-10">
        <PortfolioIntro
          eyebrow="Registry"
          title="Works"
          description={site.tagline}
          live
        />
        <div className="portfolio-filters rise-4">
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
          <ProjectGrid
            key={category ?? "all"}
            initial={projects}
            nextCursor={nextCursor}
            category={category}
          />
        )}
        </div>
      </main>
      <Footer />
    </>
  );
}
