import type { CSSProperties } from "react";
import Link from "next/link";
import { DemoGallery } from "@/components/demo-gallery";
import { Reveal } from "@/components/reveal";
import { categoryLabel } from "@/data/categories";
import { splitItems, splitTradeoff } from "@/lib/case-study-text";
import { demosForProject } from "@/lib/media";
import { themeForProject } from "@/lib/project-theme";
import { displayOutcome, stripSourceCopy } from "@/lib/source-copy";
import type { ProjectWithSkills } from "@/lib/projects";

function SectionHead({
  index,
  label,
  title,
}: {
  index: string;
  label: string;
  title: string;
}) {
  return (
    <header className="case-section-head">
      <p className="case-num">{index}</p>
      <p className="case-kicker">{label}</p>
      <h2 className="case-section-title">{title}</h2>
    </header>
  );
}

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

  const problem = project.problem.trim();
  const constraints = project.constraints.trim();
  const decision = project.decision.trim();
  const tradeoff = project.tradeoff.trim();

  const constraintItems = constraints ? splitItems(constraints) : [];
  const decisionItems = decision ? splitItems(decision) : [];
  const tradeoffPair = tradeoff ? splitTradeoff(tradeoff) : null;
  const metricItems = method ? splitItems(method) : [];

  let section = 0;
  const nextIndex = () => String(++section).padStart(2, "0");

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
      <header className="case-hero">
        <p className="case-kicker rise">{categoryLabel(project.category)}</p>
        <h1 className="case-title rise-2">{project.title}</h1>
        <p className="case-tagline rise-3">{project.tagline}</p>
        {project.skills.length > 0 ? (
          <ul className="case-skills rise-4">
            {project.skills.map((row) => (
              <li key={row.id}>{row.skill}</li>
            ))}
          </ul>
        ) : null}
        {project.liveUrl || editHref ? (
          <div className="case-actions rise-5">
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
        <Reveal className="case-showcase-wrap">
          <DemoGallery media={media} variant="case" />
        </Reveal>
      ) : null}

      {problem ? (
        <Reveal>
          <section className="case-section case-statement" aria-labelledby="case-problem">
            <SectionHead index={nextIndex()} label="Context" title="Problem" />
            <p id="case-problem" className="case-statement-copy">
              {problem}
            </p>
          </section>
        </Reveal>
      ) : null}

      {constraintItems.length > 0 ? (
        <Reveal>
          <section className="case-section case-constraints" aria-labelledby="case-constraints">
            <SectionHead index={nextIndex()} label="Scope" title="Constraints" />
            <ul id="case-constraints" className="case-constraint-list">
              {constraintItems.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          </section>
        </Reveal>
      ) : null}

      {decisionItems.length > 0 ? (
        <Reveal>
          <section className="case-section case-decisions" aria-labelledby="case-decisions">
            <SectionHead index={nextIndex()} label="Approach" title="Decisions" />
            <ol id="case-decisions" className="case-decision-list">
              {decisionItems.map((item, index) => (
                <li key={item.slice(0, 48)}>
                  <span className="case-decision-index">{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      ) : null}

      {tradeoff ? (
        <Reveal>
          <section className="case-section case-tradeoff" aria-labelledby="case-tradeoff">
            <SectionHead index={nextIndex()} label="Balance" title="Tradeoffs" />
            {tradeoffPair ? (
              <div id="case-tradeoff" className="case-compare">
                <div className="case-compare-col">
                  <p>{tradeoffPair[0]}</p>
                </div>
                <div className="case-compare-col">
                  <p>{tradeoffPair[1]}</p>
                </div>
              </div>
            ) : (
              <p id="case-tradeoff" className="case-tradeoff-copy">
                {tradeoff}
              </p>
            )}
          </section>
        </Reveal>
      ) : null}

      {outcome ? (
        <Reveal>
          <section className="case-section case-outcome" aria-labelledby="case-outcome">
            <SectionHead index={nextIndex()} label="Result" title="Outcome" />
            <blockquote id="case-outcome" className="case-outcome-copy">
              {outcome}
            </blockquote>
          </section>
        </Reveal>
      ) : null}

      {metricItems.length > 0 || writeup ? (
        <Reveal>
          <div className="case-closing-row">
            {metricItems.length > 0 ? (
              <section className="case-section case-measure" aria-labelledby="case-measure">
                <SectionHead index={nextIndex()} label="Evidence" title="How it was measured" />
                <ul id="case-measure" className="case-metric-list">
                  {metricItems.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {writeup ? (
              <section className="case-section case-writeup" aria-labelledby="case-writeup">
                <SectionHead index={nextIndex()} label="Notes" title="Write-up" />
                <div id="case-writeup" className="case-writeup-body">
                  {writeup.split(/\n\n+/).map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
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
