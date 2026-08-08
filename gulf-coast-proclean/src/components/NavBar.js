import Link from "next/link";

const LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Subscriptions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-mist bg-sand/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tide text-sm font-display font-bold text-shallowLight">
            GC
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink">
            Gulf Coast <span className="text-shallow">ProClean</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[13px] uppercase tracking-wide text-inkSoft transition hover:text-tide"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/book"
          className="rounded-full bg-coral px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-coralDark"
        >
          Get Matched
        </Link>
      </div>
    </header>
  );
}
