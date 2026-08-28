"use client";

import { useEffect, useRef } from "react";

const sparks = [
  { top: "12%", left: "18%", delay: "0s", duration: "7s" },
  { top: "22%", left: "72%", delay: "0.6s", duration: "9s" },
  { top: "38%", left: "8%", delay: "1.2s", duration: "8s" },
  { top: "46%", left: "88%", delay: "0.3s", duration: "11s" },
  { top: "58%", left: "32%", delay: "1.8s", duration: "6.5s" },
  { top: "68%", left: "64%", delay: "0.9s", duration: "10s" },
  { top: "78%", left: "14%", delay: "2.1s", duration: "8.5s" },
  { top: "16%", left: "48%", delay: "1.4s", duration: "12s" },
  { top: "84%", left: "42%", delay: "0.4s", duration: "7.5s" },
  { top: "30%", left: "58%", delay: "2.4s", duration: "9.5s" },
];

export function Scene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let lx = gx;
    let ly = gy;
    let frame = 0;

    const onMove = (event: MouseEvent) => {
      lx = event.clientX;
      ly = event.clientY;
      tx = (event.clientX / window.innerWidth - 0.5) * 40;
      ty = (event.clientY / window.innerHeight - 0.5) * 26;
    };

    const tick = () => {
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      gx += (lx - gx) * 0.1;
      gy += (ly - gy) * 0.1;
      el.style.setProperty("--mx", `${mx}px`);
      el.style.setProperty("--my", `${my}px`);
      el.style.setProperty("--cx", `${gx}px`);
      el.style.setProperty("--cy", `${gy}px`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="scene" aria-hidden>
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
      <span className="blob blob-d" />
      <span className="blob blob-e" />
      <span className="cursor-glow" />
      <span className="light-sweep" />
      {sparks.map((spark, index) => (
        <span
          key={index}
          className="spark"
          style={{
            top: spark.top,
            left: spark.left,
            animationDelay: spark.delay,
            animationDuration: spark.duration,
          }}
        />
      ))}
      <span className="grain" />
    </div>
  );
}
