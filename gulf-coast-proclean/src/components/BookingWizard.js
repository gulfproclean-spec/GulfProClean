"use client";

import { useEffect, useMemo, useState } from "react";
import CorridorMap from "./CorridorMap";
import MatchResult from "./MatchResult";
import {
  SERVICES,
  SUBSCRIPTION_TIERS,
  SERVICE_AREA,
  TIME_WINDOWS,
  findServiceMeta,
  estimatePrice,
} from "@/lib/services";

const FREQUENCIES = ["One-time", "Weekly", "Biweekly", "Monthly"];

const SEARCH_MESSAGES = [
  "Checking availability in your neighborhood…",
  "Matching you with a nearby ProClean pro…",
  "Confirming your appointment window…",
];

const emptyForm = {
  serviceType: "",
  city: "",
  zip: "",
  address: "",
  requestedDate: "",
  timeWindow: TIME_WINDOWS[TIME_WINDOWS.length - 1],
  frequency: "One-time",
  name: "",
  email: "",
  phone: "",
  notes: "",
};

export default function BookingWizard({ initialService }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    ...emptyForm,
    serviceType: initialService || "",
  });
  const [matching, setMatching] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!matching) return;
    const id = setInterval(() => {
      setMessageIndex((i) => Math.min(i + 1, SEARCH_MESSAGES.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, [matching]);

  const selectedTier = SUBSCRIPTION_TIERS.find((t) => t.id === form.serviceType);
  const cityOptions = SERVICE_AREA;
  const zipOptions = useMemo(() => {
    const found = SERVICE_AREA.find((c) => c.city === form.city);
    return found ? found.zips : [];
  }, [form.city]);

  const today = new Date().toISOString().split("T")[0];
  const price = form.serviceType ? estimatePrice(form.serviceType) : 0;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectService(id, tier) {
    update("serviceType", id);
    if (tier) update("frequency", tier.frequency);
  }

  function canContinue() {
    if (step === 0) return !!form.serviceType;
    if (step === 1) return form.city && form.zip && form.address.trim().length > 3;
    if (step === 2) return form.requestedDate && form.timeWindow;
    if (step === 3) return form.name.trim() && /\S+@\S+\.\S+/.test(form.email);
    return true;
  }

  async function submitBooking() {
    setSubmitting(true);
    setError("");
    setMatching(true);
    setMessageIndex(0);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (typeof window !== "undefined") {
        window.localStorage.setItem("gcp_customer_email", form.email);
      }

      // Keep the searching animation on screen briefly — this mirrors a
      // rideshare app's "finding your driver" moment even though our match
      // already resolved server-side.
      const minDisplayMs = 2400;
      await new Promise((r) => setTimeout(r, minDisplayMs));
      setResult({ ...data.booking, eta: data.eta });
    } catch (e) {
      setError(e.message);
      setMatching(false);
    } finally {
      setSubmitting(false);
    }
  }

  const activeIndex = result ? 4 : matching ? 3 : step;

  return (
    <div className="mx-auto max-w-2xl">
      <CorridorMap variant="progress" activeIndex={activeIndex} className="mx-auto mb-10 h-14 w-full max-w-lg" />

      {result ? (
        <MatchResult booking={result} eta={result.eta || 30} />
      ) : matching ? (
        <SearchingPanel message={SEARCH_MESSAGES[messageIndex]} />
      ) : (
        <div className="rounded-2xl border border-mist bg-sandCard p-6 sm:p-8">
          {step === 0 && (
            <Step title="What do you need cleaned?" subtitle="Choose a subscription or a one-time service.">
              <div className="grid gap-3 sm:grid-cols-2">
                {SUBSCRIPTION_TIERS.map((t) => (
                  <SelectTile
                    key={t.id}
                    active={form.serviceType === t.id}
                    onClick={() => selectService(t.id, t)}
                    title={`${t.name} Subscription`}
                    subtitle={`$${t.price}/mo · ${t.frequency}`}
                  />
                ))}
                {SERVICES.map((s) => (
                  <SelectTile
                    key={s.id}
                    active={form.serviceType === s.id}
                    onClick={() => selectService(s.id, null)}
                    title={s.name}
                    subtitle={s.priceLabel}
                  />
                ))}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step title="Where should we clean?" subtitle="We currently route crews across the Panhandle corridor.">
              <label className="block text-sm font-medium text-ink">City</label>
              <select
                className="input mt-1"
                value={form.city}
                onChange={(e) => {
                  update("city", e.target.value);
                  update("zip", "");
                }}
              >
                <option value="">Select a city…</option>
                {cityOptions.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-sm font-medium text-ink">Zip code</label>
              <select className="input mt-1" value={form.zip} onChange={(e) => update("zip", e.target.value)} disabled={!form.city}>
                <option value="">{form.city ? "Select a zip…" : "Choose a city first"}</option>
                {zipOptions.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-sm font-medium text-ink">Street address</label>
              <input
                className="input mt-1"
                placeholder="123 Emerald Coast Pkwy"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Step>
          )}

          {step === 2 && (
            <Step title="When works best?" subtitle="Pick a date and a preferred arrival window.">
              <label className="block text-sm font-medium text-ink">Date</label>
              <input
                type="date"
                min={today}
                className="input mt-1"
                value={form.requestedDate}
                onChange={(e) => update("requestedDate", e.target.value)}
              />

              <label className="mt-4 block text-sm font-medium text-ink">Arrival window</label>
              <select className="input mt-1" value={form.timeWindow} onChange={(e) => update("timeWindow", e.target.value)}>
                {TIME_WINDOWS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              {!selectedTier && (
                <>
                  <label className="mt-4 block text-sm font-medium text-ink">Frequency</label>
                  <select className="input mt-1" value={form.frequency} onChange={(e) => update("frequency", e.target.value)}>
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </Step>
          )}

          {step === 3 && (
            <Step title="Who should we confirm with?" subtitle="We'll text and email your confirmation.">
              <label className="block text-sm font-medium text-ink">Full name</label>
              <input className="input mt-1" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jamie Coastal" />

              <label className="mt-4 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                className="input mt-1"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
              />

              <label className="mt-4 block text-sm font-medium text-ink">Phone (optional)</label>
              <input className="input mt-1" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="850-555-0100" />

              <label className="mt-4 block text-sm font-medium text-ink">Notes for your cleaner (optional)</label>
              <textarea
                className="input mt-1 h-20"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Gate code, pets, areas to focus on…"
              />
            </Step>
          )}

          {step === 4 && (
            <Step title="Review your request" subtitle="We'll match you with an available pro right after you submit.">
              <ReviewRow label="Service" value={findServiceMeta(form.serviceType).name} />
              <ReviewRow label="Address" value={`${form.address}, ${form.city} ${form.zip}`} />
              <ReviewRow label="Date & window" value={`${form.requestedDate} · ${form.timeWindow}`} />
              <ReviewRow label="Frequency" value={form.frequency} />
              <ReviewRow label="Contact" value={`${form.name} · ${form.email}${form.phone ? " · " + form.phone : ""}`} />
              <div className="mt-4 flex items-center justify-between rounded-xl bg-sand p-4">
                <span className="font-mono text-xs uppercase tracking-wide text-inkSoft">Estimated price</span>
                <span className="font-display text-xl font-bold text-shallow">
                  ${price}
                  {selectedTier ? "/mo" : ""}
                </span>
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </Step>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={"font-mono text-xs uppercase tracking-wide text-inkSoft hover:text-ink " + (step === 0 ? "invisible" : "")}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-tide px-6 py-2.5 font-display text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-tideLight"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submitBooking}
                className="rounded-full bg-coral px-6 py-2.5 font-display text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-coralDark"
              >
                Request cleaning →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ title, subtitle, children }) {
  return (
    <div className="animate-fadeUp">
      <p className="font-display text-xl font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-inkSoft">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SelectTile({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl border p-4 text-left transition " +
        (active ? "border-shallow bg-shallow/5 ring-1 ring-shallow" : "border-mist hover:border-shallow/50")
      }
    >
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 font-mono text-xs text-inkSoft">{subtitle}</p>
    </button>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-mist py-3 text-sm">
      <span className="text-inkSoft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function SearchingPanel({ message }) {
  return (
    <div className="animate-fadeUp rounded-2xl border border-mist bg-sandCard p-10 text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <span className="absolute h-24 w-24 rounded-full bg-shallow/20 animate-radar" />
        <span className="absolute h-16 w-16 rounded-full bg-shallow/30 animate-radar" style={{ animationDelay: "0.4s" }} />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-tide font-display text-sm font-bold text-shallowLight">
          GC
        </span>
      </div>
      <p className="mt-6 font-display text-lg font-bold text-ink">Finding your ProClean pro…</p>
      <p className="mt-2 font-mono text-sm text-inkSoft">{message}</p>
    </div>
  );
}
