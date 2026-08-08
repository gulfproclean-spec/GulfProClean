"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";
import { findServiceMeta } from "@/lib/services";

export default function AdminDashboard({ initial }) {
  const router = useRouter();
  const [bookings] = useState(initial.bookings);
  const [cleaners, setCleaners] = useState(initial.cleaners);
  const [leads] = useState(initial.leads);
  const [tab, setTab] = useState("bookings");
  const [showAdd, setShowAdd] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const stats = initial.stats;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl font-bold text-ink">Operations overview</p>
        <button onClick={logout} className="font-mono text-xs uppercase tracking-wide text-inkSoft hover:text-ink">
          Log out
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Total bookings" value={stats.totalBookings} />
        <Kpi label="Active subscribers" value={stats.activeSubscribers} />
        <Kpi label="Pipeline value (est.)" value={`$${stats.pipelineValue.toLocaleString()}`} />
        <Kpi label="Available crew" value={`${stats.availableCleaners}/${cleaners.length}`} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-mist">
        {["bookings", "cleaners", "leads"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-2 font-mono text-xs uppercase tracking-wide " +
              (tab === t ? "border-b-2 border-coral text-ink" : "text-inkSoft hover:text-ink")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "bookings" && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-mist bg-sandCard">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs uppercase tracking-wide text-inkSoft">
                <th className="p-4">Customer</th>
                <th className="p-4">Service</th>
                <th className="p-4">Location</th>
                <th className="p-4">Date</th>
                <th className="p-4">Cleaner</th>
                <th className="p-4">Status</th>
                <th className="p-4">Est. price</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-mist last:border-0">
                  <td className="p-4">
                    <p className="font-medium text-ink">{b.customer.name}</p>
                    <p className="text-xs text-inkSoft">{b.customer.email}</p>
                  </td>
                  <td className="p-4">{findServiceMeta(b.serviceType).name}</td>
                  <td className="p-4">
                    {b.city} {b.zip}
                  </td>
                  <td className="p-4">{new Date(b.requestedDate).toLocaleDateString()}</td>
                  <td className="p-4">{b.cleaner ? b.cleaner.user.name : "—"}</td>
                  <td className="p-4">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="p-4 font-mono">${b.estimatedPrice}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-inkSoft">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "cleaners" && (
        <div className="mt-5">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="rounded-full bg-tide px-4 py-2 font-mono text-xs uppercase tracking-wide text-white"
            >
              {showAdd ? "Cancel" : "+ Add cleaner"}
            </button>
          </div>
          {showAdd && <AddCleanerForm onCreated={(c) => { setCleaners((list) => [...list, c]); setShowAdd(false); }} />}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cleaners.map((c) => (
              <div key={c.id} className="rounded-2xl border border-mist bg-sandCard p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-ink">{c.user.name}</p>
                  <span className={"h-2.5 w-2.5 rounded-full " + (c.available ? "bg-shallow" : "bg-mist")} />
                </div>
                <p className="mt-1 text-sm text-inkSoft">★ {c.rating.toFixed(1)} · {c.yearsExperience} yrs</p>
                <p className="mt-2 font-mono text-xs text-inkSoft">Zips: {c.zipsServed}</p>
                <p className="mt-1 text-xs text-inkSoft">{c.jobs ? c.jobs.length : 0} active job(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "leads" && (
        <div className="mt-5 space-y-4">
          {leads.map((l) => (
            <div key={l.id} className="rounded-2xl border border-mist bg-sandCard p-5">
              <p className="font-display font-bold text-ink">{l.name}</p>
              <p className="text-sm text-inkSoft">{l.email} {l.phone ? "· " + l.phone : ""}</p>
              <p className="mt-2 text-sm text-ink">{l.message}</p>
            </div>
          ))}
          {leads.length === 0 && <p className="text-inkSoft">No leads yet.</p>}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-mist bg-sandCard p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-inkSoft">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-tide">{value}</p>
    </div>
  );
}

function AddCleanerForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", zipsServed: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add cleaner");
      onCreated(data.cleaner);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-mist bg-sandCard p-5 sm:grid-cols-2">
      <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input className="input" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <input
        className="input"
        placeholder="Zips served, comma-separated"
        value={form.zipsServed}
        onChange={(e) => setForm({ ...form, zipsServed: e.target.value })}
        required
      />
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="sm:col-span-2 rounded-full bg-coral px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50">
        {loading ? "Adding…" : "Add to roster"}
      </button>
    </form>
  );
}
