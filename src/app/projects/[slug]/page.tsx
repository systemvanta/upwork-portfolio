import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DemoGallery } from "@/components/demo-gallery";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { categoryLabel } from "@/data/categories";
import { demosForProject } from "@/lib/media";
import { getProjectBySlug, getPublishedProjects } from "@/lib/projects";
import { getSession } from "@/lib/session";
import { displayOutcome, stripSourceCopy } from "@/lib/source-copy";

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

  const published = await getPublishedProjects();
  const others = published.filter((item) => item.slug !== project.slug);

  return (
    <>
      <Header count={published.length} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <p className="kicker">
          {categoryLabel(project.category)}
          {project.status === "wip" ? " · WIP" : ""}
        </p>
        <h1 className="mt-2 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[52px]">
          {project.title}
        </h1>
        <p className="mt-5 text-[17px] leading-7 text-ink-dim">{project.tagline}</p>
        {displayOutcome(project.outcome) ? (
          <p className="mt-3 text-sm text-mist">{displayOutcome(project.outcome)}</p>
        ) : null}
        <DemoGallery media={demosForProject(project)} />
        {isOwner ? (
          <p className="mt-6">
            <Link href={`/projects/${project.slug}/edit`} className="text-sm text-brass hover:underline">
              Edit project
            </Link>
          </p>
        ) : null}
        <dl className="mt-12 grid gap-8 border-y border-line py-10 sm:grid-cols-2">
          <Block title="Problem" body={project.problem} />
          <Block title="Constraints" body={project.constraints} />
          <Block title="Decision" body={project.decision} />
          <Block title="Tradeoff" body={project.tradeoff} />
          {stripSourceCopy(project.method) ? (
            <div className="sm:col-span-2">
              <Block title="How it was measured" body={stripSourceCopy(project.method)} />
            </div>
          ) : null}
        </dl>
        {stripSourceCopy(project.writeup) ? (
          <div className="mt-10 space-y-4 text-[17px] leading-7 text-ink-dim">
            {stripSourceCopy(project.writeup)
              .split(/\n\n+/)
              .map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
          </div>
        ) : null}
        <ul className="mt-10 flex flex-wrap gap-2">
          {project.skills.map((row) => (
            <li
              key={row.id}
              className="chip"
            >
              {row.skill}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brass hover:underline"
            >
              Open live site
            </a>
          ) : null}
        </div>
        {others.length > 0 ? (
          <aside className="mt-16 border-t border-line pt-10">
            <h2 className="text-[22px] font-semibold tracking-tight">More projects</h2>
            <ul className="mt-5 space-y-3">
              {others.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/projects/${item.slug}`}
                    className="text-[19px] font-semibold tracking-tight hover:text-brass"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <dt className="kicker">{title}</dt>
      <dd className="mt-3 text-[15px] leading-6 text-ink-dim">{body}</dd>
    </div>
  );
}
