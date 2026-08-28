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
      <Link href={to} className="project-link group block">
        <DemoThumb media={media} title={project.title} size="large" />
        <div className={media.length > 0 ? "mt-3" : undefined}>
          <p className="kicker">{categoryLabel(project.category)}</p>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-ink">
            {project.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-dim">
            {project.tagline}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.skills.map((row) => (
              <li key={row.id} className="chip">
                {row.skill}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </li>
  );
}
