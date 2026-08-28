"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="login-form space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
          const { error: result } = await authClient.signIn.email({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          });
          if (result) {
            const detail = [result.status, result.message || result.statusText]
              .filter(Boolean)
              .join(" ");
            setError(detail || "Could not log in");
            return;
          }
          router.push("/projects");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not log in");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block">
        <span className="text-[14px] font-medium text-ink-dim">Email address</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
        />
      </label>
      <label className="block">
        <span className="text-[14px] font-medium text-ink-dim">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </label>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`btn btn-primary w-full${pending ? " is-busy" : ""}`}>
        {pending ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}
