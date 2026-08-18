"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="kicker">Error</p>
      <h1 className="mt-2 text-[34px] font-semibold tracking-tight text-ink">
        The hub could not load
      </h1>
      <p className="mt-4 text-[15px] text-ink-dim">
        Try again, or go back to the registry.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
