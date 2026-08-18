"use client";

import { useRef, useState } from "react";
import { createShareLink } from "@/app/actions/share";
import { SkillInput, type SkillInputHandle } from "@/components/skill-input";

export function GenerateLink({ initialSkills = [] }: { initialSkills?: string[] }) {
  const skillsRef = useRef<SkillInputHandle>(null);
  const [skills, setSkills] = useState(initialSkills);
  const [limit, setLimit] = useState(8);
  const [shareUrl, setShareUrl] = useState("");
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState(false);

  async function generate() {
    const next = skillsRef.current?.flush() ?? skills;
    if (next.length === 0) {
      setHint("Add a skill first.");
      setShareUrl("");
      return;
    }

    setPending(true);
    setHint("");
    try {
      const share = await createShareLink(next, limit);
      setShareUrl(`${window.location.origin}${share.path}`);
    } catch (error) {
      setShareUrl("");
      setHint(error instanceof Error ? error.message : "Could not generate a link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card bg-paper-deep/40 p-6 sm:p-8">
      <p className="kicker">Generate link</p>
      <h2 className="mt-2 text-[28px] font-semibold tracking-tight">
        Show only related portfolios
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
        Enter a skill set and how many portfolios to show. A hashed key appears
        below — send that link to a client.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <p className="kicker mb-1.5">Skills</p>
          <SkillInput
            ref={skillsRef}
            name="link-skills"
            defaultValue={initialSkills}
            onChange={setSkills}
            placeholder="React, Java, AWS"
          />
        </div>
        <label className="block sm:w-[5.75rem]">
          <span className="kicker mb-1.5 block">Count</span>
          <div className="field !mt-0 flex h-12 items-center !py-0">
            <input
              type="number"
              min={1}
              max={48}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value) || 1)}
              className="h-full w-full bg-transparent py-0 text-sm leading-none outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </label>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="btn btn-primary h-12 shrink-0 !py-0 sm:px-5"
        >
          {pending ? "Generating…" : "Generate link"}
        </button>
      </div>
      <p className="mt-2 text-[13px] text-mist">
        Clients see at most this many matching portfolios.
      </p>
      {hint ? <p className="mt-3 text-sm text-mist">{hint}</p> : null}
      {shareUrl ? (
        <p className="mt-4 break-all text-sm">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brass hover:underline"
          >
            {shareUrl}
          </a>
        </p>
      ) : null}
    </section>
  );
}