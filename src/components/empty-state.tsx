import Link from "next/link";

export function EmptyState({
  signedIn,
  title = "Nothing in the registry yet",
  body = "Published project portfolios will list here.",
}: {
  signedIn: boolean;
  title?: string;
  body?: string;
}) {
  return (
    <section className="rise mt-12 border-t border-line pt-10">
      <div className="empty-live" aria-hidden>
        <span className="empty-ring" />
        <span className="empty-ring empty-ring-2" />
        <span className="empty-core" />
      </div>
      <p className="kicker">
        <span className="live-dot" />
        Empty
      </p>
      <h2 className="display mt-3 max-w-[16ch] text-[32px] sm:text-[40px]">
        {title}
      </h2>
      <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink-dim">{body}</p>
      {signedIn ? (
        <div className="mt-8">
          <Link href="/projects/new" className="btn btn-primary">
            Register project
          </Link>
        </div>
      ) : null}
    </section>
  );
}
