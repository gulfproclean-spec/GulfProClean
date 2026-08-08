"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Contact</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">Talk to us</h1>
      <p className="mt-4 text-inkSoft">
        Property manager, realtor, or business owner exploring a recurring
        partnership? Send a note and a founder will follow up personally —
        for a specific cleaning date, use{" "}
        <a href="/book" className="text-shallow underline">
          Book a cleaning
        </a>{" "}
        instead for instant matching.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-mist bg-sandCard p-8 text-center">
          <p className="font-display text-lg font-bold text-ink">Thanks — we've got it.</p>
          <p className="mt-2 text-inkSoft">We'll reply within one business day.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-mist bg-sandCard p-7">
          <div>
            <label className="block text-sm font-medium text-ink">Name</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Email</label>
            <input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Phone (optional)</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Message</label>
            <textarea className="input mt-1 h-28" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-full bg-coral px-5 py-3 font-display text-sm font-semibold text-white transition hover:bg-coralDark disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
