"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";
import { findServiceMeta } from "@/lib/services";

export default function CleanerDashboard({ cleaner, jobs }) {
  const router = useRouter();
  const [available, setAvailable] = useState(cleaner.available);
  const [jobList, setJobList] = useState(jobs);
  const [busyId, setBusyId] = useState(null);

  async function toggleAvailability() {
    const next = !available;
    setAvailable(next);
    await fetch("/api/cleaner/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
  }

  async function updateJob(id, status) {
    setBusyId(id);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setJobList((list) =>
        status === "COMPLETED" ? list.filter((j) => j.id !== id) : list.map((j) => (j.id === id ? data.booking : j))
      );
    }
    setBusyId(null);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/cleaner/login");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mist bg-sandCard p-6">
        <div>
          <p className="font-display text-lg font-bold text-ink">{cleaner.user.name}</p>
          <p className="text-sm text-inkSoft">
            ★ {cleaner.rating.toFixed(1)} · {cleaner.yearsExperience} yrs · covers zips {cleaner.zipsServed}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAvailability}
            className={
              "rounded-full px-5 py-2.5 font-display text-sm font-semibold transition " +
              (available ? "bg-shallow text-white hover:bg-shallow/90" : "bg-mist text-inkSoft hover:bg-mist/70")
            }
          >
            {available ? "● Available for jobs" : "○ Offline"}
          </button>
          <button type="button" onClick={logout} className="font-mono text-xs uppercase tracking-wide text-inkSoft hover:text-ink">
            Log out
          </button>
        </div>
      </div>

      <p className="mt-8 font-mono text-xs uppercase tracking-wide text-inkSoft">Your job queue ({jobList.length})</p>
      <div className="mt-3 space-y-4">
        {jobList.length === 0 && (
          <p className="rounded-2xl border border-dashed border-mist p-8 text-center text-sm text-inkSoft">
            No jobs assigned right now. New matches will appear here automatically.
          </p>
        )}
        {jobList.map((job) => {
          const meta = findServiceMeta(job.serviceType);
          return (
            <div key={job.id} className="rounded-2xl border border-mist bg-sandCard p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold text-ink">{meta.name}</p>
                  <p className="text-sm text-inkSoft">
                    {job.address}, {job.city} {job.zip}
                  </p>
                  <p className="mt-1 text-sm text-inkSoft">
                    {new Date(job.requestedDate).toLocaleDateString()} · {job.timeWindow}
                  </p>
                  {job.notes && <p className="mt-2 text-sm italic text-inkSoft">"{job.notes}"</p>}
                </div>
                <StatusBadge status={job.status} />
              </div>
              <div className="mt-4 flex gap-2">
                {job.status === "MATCHED" && (
                  <button
                    disabled={busyId === job.id}
                    onClick={() => updateJob(job.id, "IN_PROGRESS")}
                    className="rounded-full bg-tide px-4 py-2 font-mono text-xs uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    Start job
                  </button>
                )}
                {job.status === "IN_PROGRESS" && (
                  <button
                    disabled={busyId === job.id}
                    onClick={() => updateJob(job.id, "COMPLETED")}
                    className="rounded-full bg-shallow px-4 py-2 font-mono text-xs uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    Mark complete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
