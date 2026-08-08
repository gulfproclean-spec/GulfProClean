import Link from "next/link";
import CorridorMap from "./CorridorMap";

export default function Footer() {
  return (
    <footer className="border-t border-mist bg-tide text-sand">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8 opacity-70">
          <CorridorMap variant="compact" className="h-10 w-full max-w-md" />
        </div>
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-lg font-bold">
              Gulf Coast <span className="text-shallowLight">ProClean</span>
            </p>
            <p className="mt-3 max-w-sm text-sm text-mist">
              Professional residential &amp; commercial cleaning from Pensacola
              to Panama City Beach. Licensed, insured, and matched to your
              neighborhood in minutes.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-shallowLight">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-shallowLight">About &amp; Founders</Link></li>
              <li><Link href="/services" className="hover:text-shallowLight">Services</Link></li>
              <li><Link href="/pricing" className="hover:text-shallowLight">Subscriptions</Link></li>
              <li><Link href="/contact" className="hover:text-shallowLight">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-shallowLight">Portals</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/book" className="hover:text-shallowLight">Book a Cleaning</Link></li>
              <li><Link href="/dashboard" className="hover:text-shallowLight">Customer Dashboard</Link></li>
              <li><Link href="/cleaner/login" className="hover:text-shallowLight">Cleaner Portal</Link></li>
              <li><Link href="/admin/login" className="hover:text-shallowLight">Admin Login</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-mist/70">
          © {new Date().getFullYear()} Gulf Coast ProClean LLC · Fort Walton
          Beach, FL · Demo application generated from the company business
          plan.
        </p>
      </div>
    </footer>
  );
}
