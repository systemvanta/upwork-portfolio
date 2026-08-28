"use client";

import { useEffect, useRef } from "react";

export function ParallaxFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onScroll() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const view = window.innerHeight;
      if (rect.bottom < 0 || rect.top > view) return;
      const progress = (view - rect.top) / (view + rect.height);
      const offset = (progress - 0.5) * 14;
      node.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
