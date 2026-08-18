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
    <section className="card mt-12 px-7 py-12 sm:px-12">
      <p className="kicker">Empty registry</p>
      <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
        {title}
      </h2>
      <p className="mt-3 max-w-lg text-[16px] leading-7 text-ink-dim">{body}</p>
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
