// gulfproclean-shared.jsx
// ---------------------------------------------------------------------------
// Components shared by every marketing page. Loaded the same way as
// tweaks-panel.jsx: fetched as text, Babel-transformed, then run through an
// indirect eval. All modules for a page are concatenated into ONE eval, so
// their top-level `const` declarations can see each other.
//
// Anything that differs between the residential and commercial sides lives in
// residential-sections.jsx / commercial-sections.jsx instead — this file must
// stay side-agnostic.
// ---------------------------------------------------------------------------

const CREAM = "#f5f2ec";
const NAVY = "#153238";
const GOLD = "#b68235";
const GOLD_DARK = "#8a6221";
const RULE = "#d8d3c8";

// The section pages each own one section of what used to be a single long
// page. SECTION_PAGES drives the nav, the section index cards on
// residential.html / commercial.html, and the prev/next pager at the foot of
// every section page — so adding a section means editing this one list.
const SECTION_PAGES = {
  residential: [
    { slug: "residential.html",          nav: "Overview",      title: "Residential cleaning",  blurb: "Who we are, what we clean, and how to reach the rest of it." },
    { slug: "residential-tiers.html",    nav: "Service Tiers", title: "Choose how deep we go", blurb: "Essential, Preferred and Premium compared line by line." },
    { slug: "residential-plans.html",    nav: "Plans",         title: "One-time or on repeat", blurb: "A single visit, or standing coverage billed monthly. No contracts." },
    { slug: "residential-addons.html",   nav: "Add-Ons",       title: "Add-on services",       blurb: "Ovens, windows, baseboards, carpets — added to any visit." },
    { slug: "residential-quote.html",    nav: "Get a Quote",   title: "Estimate your price",   blurb: "Your exact price from square footage, tier and frequency." },
    { slug: "residential-home-os.html",  nav: "Home Care",     title: "Home Operating System", blurb: "What we watch between visits, and how cleaning becomes home care." },
  ],
  commercial: [
    { slug: "commercial.html",        nav: "Overview",      title: "Commercial cleaning",   blurb: "Who we are, what we clean, and how to reach the rest of it." },
    { slug: "commercial-tiers.html",  nav: "Service Tiers", title: "Choose how deep we go", blurb: "Essential, Preferred and Premium compared line by line." },
    { slug: "commercial-plans.html",  nav: "Plans",         title: "One-time or on repeat", blurb: "A single service, or a standing schedule billed monthly." },
    { slug: "commercial-addons.html", nav: "Add-Ons",       title: "Add-on services",       blurb: "Post-construction, pressure washing, carpet extraction and more." },
    { slug: "commercial-quote.html",  nav: "Get a Quote",   title: "Estimate your price",   blurb: "Your exact price from square footage, restrooms and frequency." },
  ],
};

function Nav({ navy = NAVY, gold = GOLD, side = "residential", active = "" }) {
  const other = side === "residential" ? ["Commercial →", "commercial.html"] : ["Residential →", "residential.html"];
  const sectionLinks = SECTION_PAGES[side].map(s => [s.nav, s.slug]);
  const links = [["Home", "index.html"], ...sectionLinks, ["Careers", "careers.html"], ["Vendors", "vendors.html"], ["Contact Us", "contact.html"], ["My Account", "account.html"], other];
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 22, padding: "18px clamp(20px,5vw,56px)", color: navy, fontSize: 14, background: CREAM, borderBottom: "1px solid #e3ded2", flexWrap: "wrap", rowGap: 8 }}>
      <a href="index.html" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15, letterSpacing: "0.06em", marginRight: "auto", color: navy }}>
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <circle cx="14" cy="14" r="12.5" stroke={gold} strokeWidth="1.3" />
          <circle cx="14" cy="7.4" r="1.7" stroke={gold} strokeWidth="1.4" />
          <path d="M14 9.1V20.5" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9.4 11.6h9.2" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.8 15.2c0 3.9 3.2 6.5 7.2 6.5s7.2-2.6 7.2-6.5" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        GULF PROCLEAN
      </a>
      {links.map(([label, href]) => {
        const isActive = href === active;
        return (
          <a key={label + href} href={href} style={{ color: "inherit", opacity: isActive ? 1 : 0.92, fontWeight: isActive ? 600 : 400, borderBottom: isActive ? `2px solid ${gold}` : "2px solid transparent", paddingBottom: 2 }}>{label}</a>
        );
      })}
    </nav>
  );
}

function Hero({ navy = NAVY, gold = GOLD, heroPhoto = true, hero, image = "assets/residential-hero.jpg", quoteHref = "residential-quote.html", tiersHref = "residential-tiers.html" }) {
  const headline = (
    <h1 style={{ fontFamily: "'Libre Franklin', sans-serif", fontWeight: 300, fontSize: "clamp(40px, 6vw, 74px)", lineHeight: 1.08, letterSpacing: "-0.01em", margin: 0, color: heroPhoto ? "#fff" : navy, maxWidth: 780 }}>
      {hero.headline}
    </h1>
  );
  const subhead = (
    <p style={{ display: "block", color: heroPhoto ? "#fff" : navy, fontWeight: 500, fontSize: 17, lineHeight: 1.5, marginTop: 28, maxWidth: 620, textShadow: heroPhoto ? "0 1px 3px rgba(0,0,0,0.35)" : "none" }}>
      {hero.subhead}
    </p>
  );
  const bookNow = (
    <a href={quoteHref} style={{ display: "inline-block", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 600, padding: "14px 30px", borderRadius: 3, marginTop: 28, background: gold, color: navy }}>{hero.ctaLabel}</a>
  );
  const ctaRow = (
    <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 22, flexWrap: "wrap" }}>
      <a href={quoteHref} style={{ background: gold, color: navy, fontWeight: 600, fontSize: 16, padding: "14px 24px", borderRadius: 3, display: "inline-flex", alignItems: "center", gap: 8 }}>Get a quote →</a>
      <a href={tiersHref} style={{ color: heroPhoto ? "#fff" : navy, fontWeight: 500, fontSize: 16, textDecoration: "underline" }}>Explore service tiers</a>
    </div>
  );
  if (!heroPhoto) {
    return (
      <header style={{ background: CREAM, padding: "0 clamp(20px,5vw,56px) 64px" }}>
        <div style={{ paddingTop: 48 }}>{headline}{subhead}<div>{bookNow}</div>{ctaRow}</div>
      </header>
    );
  }
  return (
    <header style={{ position: "relative", minHeight: "min(960px, 100vh)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <img src={image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,32,0.55) 0%, rgba(20,30,32,0.15) 40%, rgba(20,30,32,0.6) 100%)" }} />
      <div style={{ position: "relative", zIndex: 5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "40px clamp(20px,5vw,56px) 56px" }}>
        {headline}{subhead}<div>{bookNow}</div>{ctaRow}
      </div>
    </header>
  );
}

function Kicker({ children, gold }) {
  return <span style={{ display: "block", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: gold, marginBottom: 14 }}>{children}</span>;
}

function Services({ navy, items }) {
  return (
    <section id="services" style={{ padding: "56px clamp(20px,5vw,56px)", maxWidth: 1200, margin: "0 auto" }}>
      <Kicker gold="#8a6221">What we clean</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40, marginTop: 8 }}>
        {items.map(({ title, body }) => (
          <div key={title} style={{ borderTop: `2px solid ${navy}`, paddingTop: 18 }}>
            <h3 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 22, color: navy, margin: 0 }}>{title}</h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#3d4a4d", marginTop: 12 }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanList({ items, gold }) {
  return (
    <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, fontSize: 14, color: "#3d4a4d" }}>
      {items.map(i => (<li key={i} style={{ padding: "4px 0", display: "flex", gap: 8 }}><span style={{ color: gold }}>—</span>{i}</li>))}
    </ul>
  );
}

function Quote({ navy, text, caption }) {
  return (
    <section style={{ background: navy, color: "#fff", padding: "56px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <blockquote style={{ fontFamily: "inherit", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(24px,2.6vw,34px)", lineHeight: 1.4, maxWidth: "34ch", margin: 0 }}>
          "{text}"
        </blockquote>
        <figcaption style={{ fontSize: 14.5, opacity: 0.75, marginTop: 24 }}>{caption}</figcaption>
      </div>
    </section>
  );
}

function Reveal({ children, delay = 0, order }) {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(18px)", transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`, order, display: "flex", flexDirection: "column", height: "100%" }}>
      {children}
    </div>
  );
}

// -- Default page copy ------------------------------------------------------
// Fallbacks for useSiteContent — what renders before (or instead of) the copy
// stored in the site_content table and edited from admin.html.

const DEFAULT_CONTENT_RESIDENTIAL = {
  hero: {
    headline: "Spotless, on your terms. Every home, every time.",
    subhead: "Gulf ProClean cleans houses, condos and vacation rentals from Pensacola to Panama City Beach — recurring or on-demand, booked to fit how you actually use the property.",
    ctaLabel: "Book Now"
  },
  services: [
    { title: "Standard & deep cleans", body: "Houses and condos along the coast, top to bottom, with the same crew returning so nothing gets relearned every visit." },
    { title: "Vacation rentals", body: "Guest turnovers between check-out and check-in, photo-documented, so the listing looks exactly like its photos every time." },
    { title: "Move-in / move-out", body: "A single deep clean for the property's next chapter — empty rooms, every surface, ready for the walkthrough." }
  ],
  quote: {
    text: "They've turned our rental over between every single guest for two years — never once a cleanliness complaint. That's the whole business, honestly.",
    caption: "— placeholder quote, swap for a real client"
  },
  contact: { note: "Properties over 5,001 sq ft:" }
};

const DEFAULT_CONTENT_COMMERCIAL = {
  hero: {
    headline: "Spotless, on your terms. Built for how you operate.",
    subhead: "Gulf ProClean cleans offices, restaurants and commercial portfolios from Pensacola to Panama City Beach — recurring or on-demand, booked around your hours.",
    ctaLabel: "Book Now"
  },
  services: [
    { title: "Offices", body: "Cleaned on a schedule that matches your hours, with a point of contact who answers the phone." },
    { title: "Retail & restaurants", body: "Front-of-house and back-of-house cleaned around service hours, so the doors open spotless." },
    { title: "Property portfolios", body: "HOAs and multi-site managers get one crew and one written scope across every building." }
  ],
  quote: {
    text: "One crew, one scope, one invoice across four locations. That's the whole reason we switched.",
    caption: "— placeholder quote, swap for a real client"
  },
  contact: { note: "Large or non-standard facilities:" }
};

// -- Data hooks -------------------------------------------------------------
// Both hooks degrade to their built-in defaults when the /api routes aren't
// reachable (e.g. `node serve.js` locally), so every page renders standalone.

function useSiteContent(page, fallback) {
  const [content, setContent] = React.useState(fallback);
  React.useEffect(() => {
    fetch('/api/content/' + page)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setContent(data); })
      .catch(() => {});
  }, [page]);
  return content;
}

function usePricing(page, fallback) {
  const [pricing, setPricing] = React.useState(fallback);
  React.useEffect(() => {
    fetch('/api/pricing/' + page)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data && Array.isArray(data.rows) && data.rows.length) setPricing(data.rows); })
      .catch(() => {});
  }, [page]);
  return pricing;
}

// -- Anchor scrolling -------------------------------------------------------
// Kept for the few in-page anchors that survive the split (e.g.
// #recurring-plans inside residential-plans.html).

function scrollToId(id, behavior = 'auto') {
  const el = document.getElementById(id);
  if (!el) return;
  const navEl = document.querySelector('nav');
  const offset = (navEl ? navEl.offsetHeight : 0) + 12;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior });
}

function useScrollToHash() {
  React.useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timers = [50, 300, 800].map(ms => setTimeout(() => scrollToId(id), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
}

// -- Plan preset across pages ----------------------------------------------
// When tiers and plans lived on the same page as the calculator, choosing a
// plan set React state the calculator read directly. Now that each section is
// its own page, the selection travels in the query string instead.

function quoteLinkFor(side, { tier, frequency }) {
  const q = new URLSearchParams({ tier, frequency });
  return `${side}-quote.html?${q.toString()}`;
}

function usePlanPreset() {
  return React.useMemo(() => {
    const q = new URLSearchParams(location.search);
    const tier = q.get('tier');
    const frequency = q.get('frequency');
    return tier && frequency ? { tier, frequency } : null;
  }, []);
}

// -- Legacy anchor redirects ------------------------------------------------
// Before the split, every section was an anchor on one long page, so links
// like residential.html#calculator exist in bookmarks, in emails we have
// already sent, in search results and elsewhere in this app. The overview
// pages keep honouring them by forwarding to the section page that now owns
// that content. location.replace, not assign, so the redirect does not sit in
// the visitor's back button.
const LEGACY_ANCHORS = {
  tiers: 'tiers',
  plans: 'plans',
  'recurring-plans': 'plans',
  addons: 'addons',
  calculator: 'quote',
};

function useLegacyAnchorRedirect(side) {
  React.useEffect(() => {
    const id = location.hash.slice(1);
    const target = LEGACY_ANCHORS[id];
    if (!target) return;
    const keepHash = id === 'recurring-plans' ? '#recurring-plans' : '';
    location.replace(`${side}-${target}.html${keepHash}`);
  }, []);
}

// -- Chrome -----------------------------------------------------------------

function PromoBanner({ navy = NAVY, gold = GOLD }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${gold}, #d9a94a)`, color: navy, textAlign: "center", padding: "13px 20px", fontWeight: 700, fontSize: 14.5, letterSpacing: "0.02em" }}>✦ No contracts. Cancel anytime. ✦</div>
  );
}

function SiteFooter({ side = "residential" }) {
  const who = side === "commercial" ? "businesses" : "homes and vacation rentals";
  return (
    <footer style={{ padding: "48px clamp(20px,5vw,56px) 40px", maxWidth: 1200, margin: "40px auto 0", fontSize: 13, color: "#7a746a", borderTop: `1px solid ${RULE}` }}>
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 14 }}>
        <a href="index.html" style={{ color: GOLD_DARK }}>Home</a>
        <a href="residential.html" style={{ color: GOLD_DARK }}>Residential</a>
        <a href="commercial.html" style={{ color: GOLD_DARK }}>Commercial</a>
        <a href="careers.html" style={{ color: GOLD_DARK }}>Careers</a>
        <a href="vendors.html" style={{ color: GOLD_DARK }}>Vendors &amp; Subcontractors</a>
        <a href="contact.html" style={{ color: GOLD_DARK }}>Contact</a>
        <a href="account.html" style={{ color: GOLD_DARK }}>My Account</a>
      </div>
      Gulf ProClean — a veteran-owned, family-operated business serving {who} from Pensacola to Panama City Beach.
      <div style={{ marginTop: 10 }}>Gulf ProClean is an equal opportunity employer. <a href="careers-process.html" style={{ color: GOLD_DARK }}>Hiring process &amp; applicant notices →</a></div>
    </footer>
  );
}

// Prev/next between the section pages of one side, so a visitor can still read
// straight through the way they could when it was all one scroll.
function SectionPager({ side, current, navy = NAVY, gold = GOLD }) {
  const pages = SECTION_PAGES[side];
  const i = pages.findIndex(p => p.slug === current);
  const prev = i > 0 ? pages[i - 1] : null;
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : null;
  const box = { flex: "1 1 240px", border: `1px solid ${RULE}`, borderRadius: 6, padding: "18px 22px", background: "#fff", color: navy };
  return (
    <nav aria-label="Section navigation" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px clamp(20px,5vw,56px) 0", display: "flex", gap: 18, flexWrap: "wrap" }}>
      {prev && (
        <a href={prev.slug} style={box}>
          <span style={{ fontSize: 12, color: "#7a746a" }}>← Previous</span>
          <p style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 500 }}>{prev.nav}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#3d4a4d" }}>{prev.title}</p>
        </a>
      )}
      {next && (
        <a href={next.slug} style={{ ...box, textAlign: "right", borderColor: gold }}>
          <span style={{ fontSize: 12, color: GOLD_DARK }}>Next →</span>
          <p style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 500 }}>{next.nav}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#3d4a4d" }}>{next.title}</p>
        </a>
      )}
    </nav>
  );
}

// Index of every section page for one side — the "table of contents" that
// replaces scrolling, shown on residential.html and commercial.html.
function SectionIndex({ side, navy = NAVY, gold = GOLD }) {
  const pages = SECTION_PAGES[side].slice(1);
  return (
    <section style={{ padding: "56px clamp(20px,5vw,56px)", maxWidth: 1200, margin: "0 auto" }}>
      <Kicker gold={GOLD_DARK}>Explore</Kicker>
      <h2 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, color: navy, margin: "0 0 8px", maxWidth: 640 }}>Everything on this side of the business</h2>
      <p style={{ fontSize: 14.5, color: "#7a746a", margin: 0, maxWidth: "60ch" }}>Each part now lives on its own page — pick what you need instead of scrolling past the rest.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 32 }}>
        {pages.map(p => (
          <a key={p.slug} href={p.slug} style={{ border: `1px solid ${RULE}`, borderRadius: 8, padding: "24px 26px", background: "#fff", color: navy, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD_DARK }}>{p.nav}</span>
            <h3 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 21, margin: "10px 0 0" }}>{p.title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3d4a4d", margin: "10px 0 18px" }}>{p.blurb}</p>
            <span style={{ marginTop: "auto", color: GOLD_DARK, fontWeight: 600, fontSize: 14 }}>Open {p.nav} →</span>
          </a>
        ))}
      </div>
    </section>
  );
}

// The wrapper every section page renders: nav, promo bar, a breadcrumb, the
// section itself (which carries its own <h1>), then the pager and footer.
function SectionPage({ side, current, children }) {
  useScrollToHash();
  const here = SECTION_PAGES[side].find(p => p.slug === current);
  return (
    <div style={{ background: CREAM, minHeight: "100vh" }}>
      <Nav side={side} active={current} />
      <PromoBanner />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px clamp(20px,5vw,56px) 0", fontSize: 13, color: "#7a746a" }}>
        <a href="index.html" style={{ color: GOLD_DARK }}>Home</a>
        <span style={{ margin: "0 8px" }}>/</span>
        <a href={SECTION_PAGES[side][0].slug} style={{ color: GOLD_DARK }}>{side === "commercial" ? "Commercial" : "Residential"}</a>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>{here ? here.nav : ""}</span>
      </div>
      {children}
      <SectionPager side={side} current={current} />
      <SiteFooter side={side} />
    </div>
  );
}
