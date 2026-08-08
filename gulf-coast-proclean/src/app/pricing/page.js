import PricingCard from "@/components/PricingCard";
import { SUBSCRIPTION_TIERS } from "@/lib/services";

export const metadata = { title: "Subscriptions | Gulf Coast ProClean" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Subscriptions</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">Recurring cleaning, predictable pricing</h1>
      <p className="mt-4 max-w-2xl text-inkSoft">
        Every plan includes online scheduling, automated reminders, and a
        24-hour re-clean guarantee. Cancel or change your schedule anytime
        from your dashboard.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {SUBSCRIPTION_TIERS.map((t) => (
          <PricingCard key={t.id} tier={t} />
        ))}
      </div>

      <div className="mt-16 grid gap-8 rounded-2xl border border-mist bg-sandCard p-8 sm:grid-cols-2">
        <div>
          <p className="font-display text-lg font-bold text-ink">Loyalty rewards</p>
          <ul className="mt-3 space-y-2 text-sm text-inkSoft">
            <li>• Your 10th clean is free</li>
            <li>• $50 referral credit per friend</li>
            <li>• Quarterly quality check-ins</li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg font-bold text-ink">Our guarantee</p>
          <ul className="mt-3 space-y-2 text-sm text-inkSoft">
            <li>• Free re-clean if you're not satisfied within 24 hours</li>
            <li>• Background-checked, insured cleaners</li>
            <li>• Online portal for billing, scheduling & feedback</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
