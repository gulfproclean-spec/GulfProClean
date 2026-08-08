"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ role, redirectTo, demoHint }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm rounded-2xl border border-mist bg-sandCard p-7">
      <p className="font-display text-xl font-bold text-ink">{role === "ADMIN" ? "Admin login" : "Cleaner login"}</p>
      {demoHint && <p className="mt-1 text-xs text-inkSoft">{demoHint}</p>}

      <label className="mt-5 block text-sm font-medium text-ink">Email</label>
      <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

      <label className="mt-4 block text-sm font-medium text-ink">Password</label>
      <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-tide px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-tideLight disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
