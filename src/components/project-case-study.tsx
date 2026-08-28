import type { CSSProperties } from "react";
import Link from "next/link";
import { DemoGallery } from "@/components/demo-gallery";
import { Reveal } from "@/components/reveal";
import { categoryLabel } from "@/data/categories";
import { demosForProject } from "@/lib/media";
import { themeForProject } from "@/lib/project-theme";
import { displayOutcome, stripSourceCopy } from "@/lib/source-copy";
import type { ProjectWithSkills } from "@/lib/projects";

export function ProjectCaseStudy({
  project,
  others,
  moreHref,
  editHref,
}: {
  project: ProjectWithSkills;
  others: { id: string; slug: string; title: string }[];
  moreHref: (slug: string) => string;
  editHref?: string;
}) {
  const theme = themeForProject(project.title, project.slug);
  const outcome = displayOutcome(project.outcome);
  const method = stripSourceCopy(project.method);
  const writeup = stripSourceCopy(project.writeup);
  const media = demosForProject(project);

  const chapters = [
    { title: "Problem", body: project.problem },
    { title: "Constraints", body: project.constraints },
    { title: "Decision", body: project.decision },
    { title: "Tradeoff", body: project.tradeoff },
  ].filter((chapter) => chapter.body.trim());
  const measureIndex = String(chapters.length + 1).padStart(2, "0");

  return (
    <article
      className="card case-study"
      style={
        {
          "--accent": theme.accent,
          "--accent-soft": theme.accentSoft,
        } as CSSProperties
      }
    >
      <div className="case-lead">
        <header className="case-hero">
          <p className="case-kicker rise">{categoryLabel(project.category)}</p>
          <h1 className="case-title rise-2">{project.title}</h1>
          <p className="case-tagline rise-3">{project.tagline}</p>
          {outcome ? <p className="case-summary rise-4">{outcome}</p> : null}
          {project.skills.length > 0 ? (
            <ul className="case-skills rise-4">
              {project.skills.map((row) => (
                <li key={row.id}>{row.skill}</li>
              ))}
            </ul>
          ) : null}
          {project.liveUrl || editHref ? (
            <div className="case-actions rise-4">
              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="case-live"
                >
                  Open live site
                  <span aria-hidden className="case-live-arrow">
                    →
                  </span>
                </a>
              ) : null}
              {editHref ? (
                <Link href={editHref} className="case-edit">
                  Edit project
                </Link>
              ) : null}
            </div>
          ) : null}
        </header>

        {media.length > 0 ? (
          <Reveal>
            <DemoGallery media={media} variant="case" />
          </Reveal>
        ) : null}
      </div>

      {chapters.length > 0 ? (
        <section className="case-grid" aria-label="Project chapters">
          {chapters.map((chapter, index) => (
            <Reveal key={chapter.title} delay={index * 60}>
              <div className="case-chapter">
                <p className="case-num">{String(index + 1).padStart(2, "0")}</p>
                <h2>{chapter.title}</h2>
                <p>{chapter.body}</p>
              </div>
            </Reveal>
          ))}
        </section>
      ) : null}

      {method ? (
        <Reveal>
          <section className="case-measure">
            <p className="case-num">{measureIndex}</p>
            <h2>How it was measured</h2>
            <p>{method}</p>
          </section>
        </Reveal>
      ) : null}

      {writeup ? (
        <Reveal>
          <section className="case-writeup">
            <p className="case-kicker">Write-up</p>
            {writeup.split(/\n\n+/).map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </section>
        </Reveal>
      ) : null}

      {others.length > 0 ? (
        <Reveal>
          <aside className="case-more">
            <p className="case-kicker">More projects</p>
            <ul>
              {others.map((item) => (
                <li key={item.id}>
                  <Link href={moreHref(item.slug)}>{item.title}</Link>
                </li>
              ))}
            </ul>
          </aside>
        </Reveal>
      ) : null}
    </article>
  );
}
