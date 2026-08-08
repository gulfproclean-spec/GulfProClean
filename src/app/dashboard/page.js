"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { findServiceMeta } from "@/lib/services";

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("gcp_customer_email") : "";
    if (saved) {
      setEmail(saved);
      lookup(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(e) {
    const useEmail = typeof e === "string" ? e : email;
    if (!useEmail) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings?email=${encodeURIComponent(useEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load bookings");
      setBookings(data.bookings);
      if (typeof window !== "undefined") window.localStorage.setItem("gcp_customer_email", useEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Your dashboard</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">Your bookings</h1>
      <p className="mt-3 text-inkSoft">Enter the email you used when booking to view your appointments.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <input
          type="email"
          required
          className="input max-w-xs"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="rounded-full bg-tide px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-tideLight">
          {loading ? "Loading…" : "View bookings"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {bookings && (
        <div className="mt-10 space-y-4">
          {bookings.length === 0 && (
            <p className="rounded-2xl border border-dashed border-mist p-8 text-center text-inkSoft">
              No bookings found for that email yet.{" "}
              <a href="/book" className="text-shallow underline">
                Book your first cleaning →
              </a>
            </p>
          )}
          {bookings.map((b) => {
            const meta = findServiceMeta(b.serviceType);
            return (
              <div key={b.id} className="rounded-2xl border border-mist bg-sandCard p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-ink">{meta.name}</p>
                    <p className="text-sm text-inkSoft">
                      {b.address}, {b.city} {b.zip}
                    </p>
                    <p className="mt-1 text-sm text-inkSoft">
                      {new Date(b.requestedDate).toLocaleDateString()} · {b.timeWindow}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-mist pt-4 text-sm">
                  <span className="text-inkSoft">
                    Cleaner:{" "}
                    <span className="font-medium text-ink">{b.cleaner ? b.cleaner.user.name : "Not yet matched"}</span>
                  </span>
                  <span className="font-mono font-semibold text-shallow">${b.estimatedPrice}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
