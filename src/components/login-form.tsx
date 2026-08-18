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
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const { error: result } = await authClient.signIn.email({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });
        setPending(false);
        if (result) {
          setError(result.message ?? "Could not log in");
          return;
        }
        router.push("/projects");
        router.refresh();
      }}
    >
      <label className="block">
        <span className="kicker">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
        />
      </label>
      <label className="block">
        <span className="kicker">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </label>
      {error ? (
        <p className="text-sm text-brass" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
