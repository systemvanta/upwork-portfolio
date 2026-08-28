"use client";

import { useFormStatus } from "react-dom";
import {
  changeAccountEmail,
  changeAccountPassword,
} from "@/app/actions/account";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-primary${pending ? " is-busy" : ""}`}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function AccountForms({
  email,
  notice,
  emailError,
  passwordError,
}: {
  email: string;
  notice?: string;
  emailError?: string;
  passwordError?: string;
}) {
  return (
    <div className="space-y-10">
      {notice ? (
        <p className="pop-in rounded-2xl border border-line bg-fill px-4 py-3 text-[14px] text-ink">
          {notice}
        </p>
      ) : null}

      <section className="panel-in rounded-[28px] bg-fill px-6 py-7 sm:px-8">
        <p className="kicker">Email</p>
        <h2 className="display mt-3 text-[28px]">
          Change email
        </h2>
        <form action={changeAccountEmail} className="mt-6 space-y-5">
          <label className="block">
            <span className="kicker">New email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              autoComplete="email"
              className="field"
            />
          </label>
          <label className="block">
            <span className="kicker">Current password</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="field"
            />
          </label>
          {emailError ? (
            <p className="text-sm text-danger" role="alert">
              {emailError}
            </p>
          ) : null}
          <SubmitButton label="Save email" />
        </form>
      </section>

      <section className="panel-in rounded-[28px] bg-fill px-6 py-7 sm:px-8">
        <p className="kicker">Password</p>
        <h2 className="display mt-3 text-[28px]">
          Change password
        </h2>
        <form action={changeAccountPassword} className="mt-6 space-y-5">
          <label className="block">
            <span className="kicker">Current password</span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="field"
            />
          </label>
          <label className="block">
            <span className="kicker">New password</span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>
          <label className="block">
            <span className="kicker">Confirm new password</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>
          {passwordError ? (
            <p className="text-sm text-danger" role="alert">
              {passwordError}
            </p>
          ) : null}
          <SubmitButton label="Save password" />
        </form>
      </section>
    </div>
  );
}
