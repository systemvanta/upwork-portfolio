"use client";

import type { ReactNode } from "react";
import { categoryGroups } from "@/data/categories";
import { DemoMediaFields } from "@/components/demo-media-fields";
import { SkillInput } from "@/components/skill-input";
import { deleteProject } from "@/app/actions/projects";
import type { DemoMedia } from "@/lib/media";

type ProjectFormValues = {
  id?: string;
  title?: string;
  tagline?: string;
  category?: string;
  skills?: string[];
  liveUrl?: string | null;
  media?: DemoMedia[];
  outcome?: string;
  problem?: string;
  constraints?: string;
  decision?: string;
  tradeoff?: string;
  method?: string;
  writeup?: string;
};

export function ProjectForm({
  action,
  project,
}: {
  action: (formData: FormData) => Promise<void>;
  project?: ProjectFormValues;
}) {
  return (
    <form action={action} className="form-stagger space-y-6">
      <FormSection
        title="Overview"
        lead="Basics that appear on registry cards and the case-study hero."
      >
        <Field label="Title" name="title" required defaultValue={project?.title} />
        <Field
          label="Tagline"
          name="tagline"
          required
          defaultValue={project?.tagline}
        />
        <label className="block">
          <span className="kicker">Category</span>
          <select
            name="category"
            required
            defaultValue={project?.category ?? "shopify"}
            className="field"
          >
            {categoryGroups().map(({ group, items }) => (
              <optgroup key={group} label={group}>
                {items.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="kicker">Skills</span>
          <div className="mt-2">
            <SkillInput defaultValue={project?.skills ?? []} />
          </div>
        </label>
        <Field label="Live URL" name="liveUrl" defaultValue={project?.liveUrl ?? ""} />
      </FormSection>

      <FormSection
        title="Demos"
        lead="Screenshots or a video shown in the gallery and on cards."
      >
        <DemoMediaFields existing={project?.media ?? []} />
      </FormSection>

      <FormSection
        title="Case study"
        lead="Editorial sections on the project detail page."
      >
        <Field label="Outcome" name="outcome" defaultValue={project?.outcome} />
        <Area label="Problem" name="problem" required defaultValue={project?.problem} />
        <Area
          label="Constraints"
          name="constraints"
          required
          defaultValue={project?.constraints}
        />
        <Area label="Decision" name="decision" required defaultValue={project?.decision} />
        <Area label="Tradeoff" name="tradeoff" required defaultValue={project?.tradeoff} />
        <Area
          label="How it was measured"
          name="method"
          defaultValue={project?.method}
        />
        <Area label="Write-up" name="writeup" defaultValue={project?.writeup} rows={6} />
      </FormSection>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary">
          {project?.id ? "Save project" : "Register project"}
        </button>
        {project?.id ? (
          <button
            type="submit"
            formNoValidate
            formAction={deleteProject.bind(null, project.id)}
            className="btn btn-danger"
            onClick={(event) => {
              if (!confirm("Delete this project? This cannot be undone.")) {
                event.preventDefault();
              }
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function FormSection({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="form-section space-y-6">
      <div>
        <h2 className="form-section-title">{title}</h2>
        {lead ? <p className="form-section-lead">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="field"
      />
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  required,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        className="field resize-y"
      />
    </label>
  );
}
