"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

type SkillInputProps = {
  name?: string;
  defaultValue?: string[];
  onChange?: (skills: string[]) => void;
  placeholder?: string;
  className?: string;
};

export type SkillInputHandle = {
  flush: () => string[];
};

function uniqueSkills(next: string[]) {
  return [...new Set(next.map((skill) => skill.trim()).filter(Boolean))];
}

export const SkillInput = forwardRef<SkillInputHandle, SkillInputProps>(
  function SkillInput(
    {
      name = "skills",
      defaultValue = [],
      onChange,
      placeholder = "Add a skill and press Enter",
      className = "",
    },
    ref,
  ) {
    const [skills, setSkills] = useState(defaultValue);
    const [draft, setDraft] = useState("");

    function commit(next: string[]) {
      const unique = uniqueSkills(next);
      setSkills(unique);
      onChange?.(unique);
      return unique;
    }

    function addDraft() {
      if (!draft.trim()) return skills;
      const next = commit([...skills, ...draft.split(",")]);
      setDraft("");
      return next;
    }

    useImperativeHandle(ref, () => ({
      flush: addDraft,
    }));

    return (
      <div>
        <input type="hidden" name={name} value={skills.join(",")} />
        <div
          className={`field skill-input !mt-0 flex min-h-[52px] flex-wrap items-center gap-2 !rounded-[22px] !py-2 ${className}`.trim()}
        >
          {skills.map((skill) => (
            <button
              key={skill}
              type="button"
              className="chip chip-pop shrink-0 hover:bg-ink hover:text-white"
              onClick={() => commit(skills.filter((item) => item !== skill))}
            >
              {skill} ×
            </button>
          ))}
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addDraft();
              }
              if (event.key === "Backspace" && !draft) {
                commit(skills.slice(0, -1));
              }
            }}
            onBlur={addDraft}
            placeholder={skills.length ? "" : placeholder}
            className="min-h-[28px] min-w-[8rem] flex-[1_1_8rem] bg-transparent py-1 text-sm leading-normal outline-none"
          />
        </div>
      </div>
    );
  },
);
