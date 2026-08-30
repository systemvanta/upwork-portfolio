import Link from "next/link";
import { DemoThumb } from "@/components/demo-gallery";
import { categoryLabel } from "@/data/categories";
import { demosForProject } from "@/lib/media";
import type { ProjectCardData } from "@/lib/projects";

export function ProjectCard({
  project,
  href,
  delay = 0,
}: {
  project: ProjectCardData;
  href?: string;
  delay?: number;
}) {
  const media = demosForProject(project);
  const to = href ?? `/projects/${project.slug}`;

  return (
    <li className="rise" style={{ animationDelay: `${delay}ms` }}>
      <Link href={to} className="project-link portfolio-card group block">
        <DemoThumb media={media} title={project.title} size="large" />
        <div className={media.length > 0 ? "mt-4" : undefined}>
          <p className="portfolio-card-eyebrow">{categoryLabel(project.category)}</p>
          <h3 className="portfolio-card-title">{project.title}</h3>
          <p className="portfolio-card-tagline">{project.tagline}</p>
          <ul className="portfolio-card-skills">
            {project.skills.slice(0, 4).map((row) => (
              <li key={row.id}>{row.skill}</li>
            ))}
            {project.skills.length > 4 ? (
              <li className="portfolio-card-more">+{project.skills.length - 4}</li>
            ) : null}
          </ul>
        </div>
      </Link>
    </li>
  );
}
