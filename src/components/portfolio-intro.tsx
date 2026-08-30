export function PortfolioIntro({
  eyebrow,
  title,
  description,
  skills,
  live = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  skills?: string[];
  live?: boolean;
}) {
  return (
    <header className="portfolio-intro">
      <p className="portfolio-eyebrow">
        {live ? <span className="live-dot" aria-hidden /> : null}
        {eyebrow}
      </p>
      <h1 className="portfolio-title">{title}</h1>
      {description ? <p className="portfolio-lead">{description}</p> : null}
      {skills && skills.length > 0 ? (
        <ul className="portfolio-skill-tags" aria-label="Matched skills">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
