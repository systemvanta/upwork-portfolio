"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectCard } from "@/components/project-card";
import type { ProjectCardData } from "@/lib/projects";

export function ProjectGrid({
  initial,
  nextCursor: initialCursor,
  category,
}: {
  initial: ProjectCardData[];
  nextCursor: string | null;
  category?: string;
}) {
  const [projects, setProjects] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(initialCursor);
  const loadingRef = useRef(false);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, category]);

  async function loadMore() {
    const next = cursorRef.current;
    if (!next || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ cursor: next });
      if (category) query.set("category", category);
      const response = await fetch(`/api/projects?${query}`);
      if (!response.ok) throw new Error("Could not load more projects");
      const data = (await response.json()) as {
        projects: ProjectCardData[];
        nextCursor: string | null;
      };
      setProjects((current) => [...current, ...data.projects]);
      cursorRef.current = data.nextCursor;
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more projects");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <ol className="mt-8 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {projects.map((project, index) => (
          <ProjectCard key={project.id} project={project} delay={80 + index * 60} />
        ))}
      </ol>
      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      {cursor ? <div ref={sentinelRef} className="h-10" aria-hidden /> : null}
      {loading ? (
        <p className="mt-6 text-center text-sm text-mist">
          <span className="live-dot" />
          Loading…
        </p>
      ) : null}
    </>
  );
}
