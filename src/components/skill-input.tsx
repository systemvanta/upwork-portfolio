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

const SKILL_DELIMITER = /[,;|，、·•\n\r\t]+/;

function uniqueSkills(next: string[]) {
  return [...new Set(next.map((skill) => skill.trim()).filter(Boolean))];
}

function normalizeSkillToken(skill: string) {
  return skill
    .replace(/^[\s•·▪‣\-–—*]+/, "")
    .replace(/^\d+[\.)]\s*/, "")
    .trim();
}

export function splitSkillText(value: string) {
  return value
    .split(SKILL_DELIMITER)
    .map(normalizeSkillToken)
    .filter(Boolean);
}

function shouldSplitSkillText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (SKILL_DELIMITER.test(trimmed)) return true;
  return trimmed.includes("\n") || trimmed.includes("\r");
}

function appendSkillText(current: string[], text: string) {
  if (!text.trim()) return current;
  return uniqueSkills([...current, ...splitSkillText(text)]);
}

export const SkillInput = forwardRef<SkillInputHandle, SkillInputProps>(
  function SkillInput(
    {
      name = "skills",
      defaultValue = [],
      onChange,
      placeholder = "Add skills separated by commas, or paste a list",
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
      const next = appendSkillText(skills, draft);
      setDraft("");
      return commit(next);
    }

    function ingestDraft(value: string) {
      if (!shouldSplitSkillText(value)) {
        setDraft(value);
        return;
      }
      commit(appendSkillText(skills, value));
      setDraft("");
    }

    function ingestPastedText(pasted: string) {
      const combined = `${draft}${pasted}`;
      if (!shouldSplitSkillText(combined)) {
        setDraft(combined);
        return;
      }
      commit(appendSkillText(skills, combined));
      setDraft("");
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
            onChange={(event) => ingestDraft(event.target.value)}
            onPaste={(event) => {
              const pasted =
                event.clipboardData.getData("text/plain") ||
                event.clipboardData.getData("text");
              if (!pasted) return;
              event.preventDefault();
              ingestPastedText(pasted);
            }}
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
