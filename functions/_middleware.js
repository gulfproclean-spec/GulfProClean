import { neon } from '@neondatabase/serverless';

// Which paths count as a tracked "page view." Deliberately excludes
// admin.html (so admin's own visits don't inflate customer traffic) and
// everything under /api/ (those are data calls, not page views).
const TRACKED_PATHS = {
  '/': 'index',
  '/index.html': 'index',
  '/residential.html': 'residential',
  '/commercial.html': 'commercial',
  '/contact.html': 'contact',
  '/book.html': 'book',
  '/account.html': 'account',
  '/residential-tiers.html': 'residential-tiers',
  '/residential-plans.html': 'residential-plans',
  '/residential-addons.html': 'residential-addons',
  '/residential-quote.html': 'residential-quote',
  '/residential-home-os.html': 'residential-home-os',
  '/commercial-tiers.html': 'commercial-tiers',
  '/commercial-plans.html': 'commercial-plans',
  '/commercial-addons.html': 'commercial-addons',
  '/commercial-quote.html': 'commercial-quote',
  '/careers.html': 'careers',
  '/careers-job.html': 'careers-job',
  '/careers-process.html': 'careers-process',
  '/apply.html': 'apply',
  '/vendors.html': 'vendors',
  '/vendors-bid.html': 'vendors-bid',
  // onboarding.html is deliberately absent: it is reached only from a personal
  // token link, and counting it would put candidate activity in a traffic report.
};

// Search engines and link-preview bots we WANT crawling the site (SEO,
// social share cards). These are never blocked and never logged as a page
// view (they aren't a customer either), regardless of what else matches.
// Checked first, and short-circuits every other check below.
const GOOD_CRAWLER_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|facebookexternalhit|bingpreview|twitterbot|linkedinbot|pinterest|embedly|quora|vkshare|w3c_validator/i;

// Crawlers, monitors and scanners we don't want counted as customer traffic,
// but also don't want to hard-block (uptime monitors are often something the
// business itself runs; blocking those would break their own tooling).
//
// Includes several specific literal signatures, not keywords:
//   - A byte-identical "iPhone; CPU iPhone OS 13_2_3 ... Safari/604.1"
//     string (a 2019 build), confirmed via the as_org diagnostic
//     (2026-09-13) arriving from 6 different IPs across 5 countries within
//     under an hour, all datacenter-adjacent.
//   - "redroid" — an Android emulator built specifically for cloud-scale,
//     rootless device farms with no consumer use; seen 2026-09-14 in a UA
//     alongside "uni-app" (a cross-platform automation framework).
//   - "censysinspect" — Censys, Inc.'s internet-wide scanning tool; UA
//     self-identifies as "CensysInspect/1.1 +https://about.censys.io/".
//     A known research/attack-surface scanning company, not a customer.
//   - "internetmeasurement" — self-identifies as
//     "InternetMeasurement/1.0 +https://internet-measurement.com/"; seen
//     2026-09-19 from 3 different London IPs, all "Driftnet Ltd", same
//     literal string each time. A network-measurement research probe.
//   - "forestengine" — self-identifies as
//     "ForestEngine/1.0 +https://forestengine.net/"; seen 2026-09-20 from a
//     DigitalOcean-hosted Amsterdam IP (see the DigitalOcean spacing note
//     on HOSTING_PROVIDER_PATTERN below — this one would have slipped
//     through that check too, on top of needing its own entry here).
// All are analytics-only exclusions (not a 403) since they're syntactically
// real, if implausible, browser UAs, and the research/scanning tools in
// this list openly identify themselves rather than trying to blend in —
// treating an honestly-labeled scanner the same as a customer would just
// be wrong, not a security question.
const SOFT_BOT_PATTERN = /bot|crawl|spider|monitor|uptime|pingdom|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider|redroid|censysinspect|internetmeasurement|forestengine|iphone os 13_2_3 like mac os x\) applewebkit\/605\.1\.15 \(khtml, like gecko\) version\/13\.0\.3 mobile\/15e148 safari\/604\.1/i;

// Signatures with essentially zero legitimate reason to load a full HTML
// page: raw HTTP clients and scripting/automation libraries. A real
// browser's user-agent — even an obscure or very old one — starts with
// "Mozilla/5.0" for historical compatibility reasons, and search engines
// preserve that too (see GOOD_CRAWLER_PATTERN, checked first). No UA at
// all, or a UA that isn't shaped like a browser's, or an explicit tool
// signature, is about as close to certain as this gets that the request is
// a script, not a person — so these are actively refused with a 403 rather
// than merely excluded from analytics.
const HARD_BLOCK_TOOL_PATTERN = /curl|wget|python-requests|scrapy|node[/-]|^node$|node-fetch|undici|go-http-client|java\/[\d.]|libwww-perl|apache-httpclient|okhttp|phantomjs|puppeteer|playwright|headless|lighthouse|gtmetrix/i;

function isKnownGoodCrawler(userAgent) {
  return !!userAgent && GOOD_CRAWLER_PATTERN.test(userAgent);
}

function isHardBlocked(userAgent) {
  if (isKnownGoodCrawler(userAgent)) return false;
  if (!userAgent) return true;
  if (!userAgent.startsWith('Mozilla/')) return true;
  if (HARD_BLOCK_TOOL_PATTERN.test(userAgent)) return true;
  return false;
}

// A real Chrome/Chromium-family browser (Chrome, Edge, Brave, Opera,
// Samsung Internet, Chromium WebViews) ALWAYS includes "AppleWebKit" in its
// UA string — it's a legacy-compatibility token every Chromium build emits
// unconditionally, alongside "Chrome/<version>". A UA containing "Chrome/"
// without "AppleWebKit" is not a shape any real browser produces; it's a
// hand-built/templated string from a script or proxy tool that didn't
// bother completing it. Found 2026-09-14: 12+ hits within 3 minutes, one
// per Chinese province/ISP, each reading exactly
// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" — missing
// the AppleWebKit/Safari middle and tail every genuine Chrome UA has.
// Catches this from the very first hit, unlike the fan-out check below
// which needs a couple of repeats to trigger.
function isMalformedChromeUA(userAgent) {
  if (!userAgent) return false;
  return /Chrome\//.test(userAgent) && !/AppleWebKit/i.test(userAgent);
}

// A subtler version of the same idea: real Chrome/Chromium always sets the
// trailing "Safari/<version>" token to the EXACT SAME version number as its
// own "AppleWebKit/<version>" token — this has been true since Chrome froze
// both at 537.36 in 2013, and holds for every older paired version before
// that too. Found 2026-09-14: three sightings (Nuremberg, Cheyenne x2, New
// York), hours apart, different orgs, all sharing the byte-identical string
// "...AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.3"
// — AppleWebKit correctly at 537.36, but Safari truncated to 537.3. No
// genuine browser build has ever shipped that mismatch; it's a template
// with a typo. Unlike isUaFanOutDuplicate, this needs no repeat or window
// at all — it's wrong on its own, in a single request.
function hasMismatchedWebKitSafariVersion(userAgent) {
  if (!userAgent) return false;
  const webkit = userAgent.match(/AppleWebKit\/([\d.]+)/);
  const safari = userAgent.match(/Safari\/([\d.]+)/);
  if (!webkit || !safari) return false;
  return webkit[1] !== safari[1];
}

// A FLOOR on Chrome's major version, not a ceiling — this is deliberately
// the opposite shape of the version check that caused a real production
// incident in this file (see the NOTE below), and is safe for a different
// reason than that one was dangerous.
//
// That earlier check asked "is this version too NEW to be real?" — a
// ceiling that goes stale the moment Chrome ships again, since real traffic
// keeps moving forward past any fixed number. This check asks "is this
// version too OLD to be real?" — a floor that does NOT go stale the same
// way, because Chrome auto-updates forward and never backward: real-world
// usage of any given version only shrinks over time as people update, it
// never grows again. A floor picked generously today does not need
// maintenance the way a ceiling did.
//
// Chrome 100 shipped March 2022. Genuine traffic in September 2026 running
// anything below that is vanishingly rare (an unsupported, unpatched,
// years-out-of-date browser). Found 2026-09-14/15: Chrome 44 (2015), 47
// (2015), 48 (2016), and 84 (2020) all appeared within one afternoon, from
// different countries and different (often hosting-flavored) as_org
// values — real people do not disproportionately run half-decade-old
// Chrome; scrapers reusing a stale bundled UA list do. Analytics-only, like
// every other check here — never blocks the response.
function isAncientChromeVersion(userAgent) {
  if (!userAgent) return false;
  const match = userAgent.match(/Chrome\/(\d+)/);
  if (!match) return false;
  return Number(match[1]) < 100;
}

// Analytics-only signal: is the request coming from a datacenter/hosting
// network rather than a residential or mobile ISP? Cloudflare resolves this
// for us in request.cf.asOrganization. Real visitors browse from
// home/office/mobile connections; automated traffic very often runs on
// cloud compute. This will occasionally flag a legitimate visitor on a
// corporate VPN — a deliberate false-positive tradeoff in favor of a
// cleaner traffic count, which is why this stays analytics-only rather
// than a hard block.
//
// RESOLVED (as_org diagnostic, 2026-09-13): asOrganization is NOT empty —
// the earlier hypothesis was wrong. It's populated but doesn't always
// contain the parent company name the way this list assumed:
//   - Tencent's international infrastructure reports its RIR-registered
//     office address instead of a company name, e.g. "6 COLLYER QUAY" /
//     "16 COLLYER QUAY # 18-29 INCOME AT RAFFLES" (Tencent's registered
//     Singapore address across several of their ASNs). A second, different
//     instance of this same shape — an address instead of a name — showed
//     up 2026-09-21 in Singapore too ("80 Robinson Road # 02-00"), over
//     IPv6. Not added as its own keyword since the literal string differs
//     each time; noted here as a recurring category worth watching rather
//     than a one-off.
//   - Alibaba Cloud reports its cloud brand name, "Aliyun Computing
//     Co.LTD" — not "Alibaba".
//   - "code200, UAB" / "Code200 UAB" (inconsistent capitalization from the
//     same entity) — a Lithuania-registered proxy-infrastructure org, added
//     2026-09-13 after 3 identical-UA hits from Warsaw/New York/Dubai in
//     under 3 hours all reported this org.
//   - "powered by ANX" — seen 2026-09-13/14 on an IP inside Contabo's own
//     152.53.0.0/16 range (see KNOWN_BAD_CIDRS below), yet another reseller
//     label instead of "Contabo".
//   - "Aviation RE LLC" — seen 2026-09-14 on the New York sighting of the
//     WebKit/Safari version mismatch above.
//   - "netcup GmbH" (Nuremberg hosting), "Shanghai UCloud Information
//     Technology Company Limited" (UCloud, a real Chinese cloud provider —
//     same shape as the Aliyun/Tencent gap above), and "Datacamp Limited"
//     (a known proxy-as-a-service company, not a hosting brand a casual
//     visitor would ever be behind) — all added 2026-09-15.
//   - Added 2026-09-19, from a multi-day batch: "FranTech Solutions" (aka
//     BuyVM, a well-known budget VPS host — repeat, same Miami IP twice 6
//     minutes apart, identical UA); "DMZHOST" (a Romanian VPS brand — the
//     name says "host" outright); "Subnet Digital LLC" (repeat, two
//     adjacent IPs in the same /24, New York City, identical UA ~35 minutes
//     apart — too spread out for the burst/fan-out windows below to catch
//     on their own); "FBW NETWORKS SAS" (seen once in the ancient-Chrome
//     batch on 2026-09-15 without being added, now a confirmed second
//     sighting); "DEDIK SERVICES LIMITED" ("dedik" is hosting-community
//     shorthand for "dedicated server" — the name is self-describing even
//     on one sighting); "VPN Consumer Brussels, Belgium" (the org string
//     itself says "VPN Consumer", paired with an Avast VPN client tag in
//     the UA).
//   - REGEX GAP found 2026-09-20: the "digitalocean" keyword (one word)
//     never matched "Digital Ocean, Inc." (two words, from a real
//     ForestEngine-scanner sighting — see SOFT_BOT_PATTERN above) because
//     the space defeats a plain substring match. Changed to "digital
//     ?ocean" so both the one-word brand form and the two-word registered
//     legal-entity form match. The other entries in this list may have the
//     same kind of gap for their own two-word forms; this was only caught
//     because this particular sighting also had a self-identifying UA to
//     catch it a different way.
//   - "Web2Objects LLC" (Dallas) — added 2026-09-21, a known low-cost
//     VPS/hosting reseller brand.
// This list will likely need occasional additions the same way — ASN "org
// name" fields are whatever each provider registered with their RIR, not a
// clean, predictable company name. Note it will NEVER catch traffic
// spoofed from ordinary residential/mobile ISPs (see the 2026-09-14 Chinese
// ISP fan-out finding) — those aren't hosting providers at all, which is
// what isUaFanOutDuplicate() below is for.
const HOSTING_PROVIDER_PATTERN = /google|amazon|aws|microsoft azure|digital ?ocean|linode|akamai|ovh|hetzner|oracle cloud|alibaba|aliyun|tencent|collyer quay|code200|netcup|ucloud|datacamp|frantech|buyvm|dmzhost|subnet digital|fbw networks|dedik|vpn consumer|web2objects|vultr|choopa|contabo|scaleway|leaseweb|hostinger|quadranet|psychz|m247|host europe|servint|webair|cogent|as-colo|colo(cation)?|data ?center|hosting|dedicated|vps|server(s)?\b/i;

// A DIFFERENT category from hosting: enterprise security vendors whose own
// infrastructure crawls the web for attack-surface-management / URL
// categorization purposes (feeding their firewall/threat-intel products).
// Not malicious, not a hosting provider — but not a customer either, so it
// still doesn't belong in a traffic count. Kept as its own list rather than
// folded into HOSTING_PROVIDER_PATTERN so the distinction stays honest in
// the code, not just in a comment.
//
// "Palo Alto Networks, Inc" — added 2026-09-17 after 2 hits, 24 minutes
// apart, from adjacent IPs in the same /24 (Saginaw, TX), identical
// Chrome/117 build on both — consistent with an automated scanning crawler
// working through a subnet, not a customer reloading a page.
const SECURITY_SCANNER_ORG_PATTERN = /palo alto networks/i;

// NOTE: an EARLIER browser-version-plausibility check ("is this Chrome
// version too HIGH to be real?") lived here briefly and was removed. It
// caused a real production incident: it silently misclassified genuine,
// up-to-date Chrome browsers as bots the moment real Chrome's version
// number passed the hardcoded ceiling, with no error of any kind —
// analytics just quietly stopped recording real visitors. That specific
// shape of check (a ceiling on how NEW a version can plausibly be) is not
// safe and should not return here. isAncientChromeVersion() above is a
// FLOOR, not a ceiling, and does not share this failure mode — see the
// comment on that function for why the direction of the check changes its
// safety profile entirely.

// IP ranges (or single addresses, via /32) confirmed to have produced
// repeated bot/scraper-shaped traffic against page_views, kept SEPARATE
// from org-name matching (HOSTING_PROVIDER_PATTERN) for cases where the
// evidence is against one specific address rather than the provider behind
// it. Matching by address here rather than by org name matters when the
// org itself looks like an ordinary provider that also has real customers
// — excluding the whole org would risk dropping genuine visitors who
// happen to share it.
//
// 152.53.0.0/16 — Contabo GmbH (Nuremberg, Germany hosting). Seen twice:
// once labeled "Contabo GmbH" directly (2026-09-10, 15 hits/second from
// 152.53.195.17), once labeled "powered by ANX" (2026-09-13/14, from
// 152.53.13.199). A confirmed-offender range, not a preemptive blocklist
// of Contabo's whole hosting footprint.
//
// 45.74.159.42/32 — "Tres Teknoloji A.S." (Istanbul), added 2026-09-22.
// This single IP hit page_views 6 times across 4+ days, always the exact
// byte-identical UA (Chrome/122.0.0.0 on Mac), never drifting even once —
// implausible for a real browser over two weeks, where at least one Chrome
// auto-update would ordinarily show up. Hit timing was scattered through
// the day rather than session-shaped, consistent with a scheduled
// automated check rather than organic repeat browsing. Excluded as a /32
// specifically, not the org name — "Tres Teknoloji A.S." reads like an
// ordinary Turkish ISP that most likely also carries real customers, and
// this evidence is against this one address's behavior, not the provider.
const KNOWN_BAD_CIDRS = ['152.53.0.0/16', '45.74.159.42/32'];

function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

function isInCidr(ip, cidr) {
  const [rangeIp, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(rangeIp);
  if (ipInt === null || rangeInt === null) return false; // not IPv4 (e.g. IPv6) — silently skip rather than error
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isKnownBadIp(ip) {
  if (!ip) return false;
  return KNOWN_BAD_CIDRS.some((cidr) => isInCidr(ip, cidr));
}

function isExcludedFromAnalytics(userAgent, asOrganization, ip) {
  if (isKnownGoodCrawler(userAgent)) return true;
  if (!userAgent) return true;
  if (SOFT_BOT_PATTERN.test(userAgent)) return true;
  if (isHardBlocked(userAgent)) return true;
  if (isMalformedChromeUA(userAgent)) return true;
  if (hasMismatchedWebKitSafariVersion(userAgent)) return true;
  if (isAncientChromeVersion(userAgent)) return true;
  if (asOrganization && HOSTING_PROVIDER_PATTERN.test(asOrganization)) return true;
  if (asOrganization && SECURITY_SCANNER_ORG_PATTERN.test(asOrganization)) return true;
  if (isKnownBadIp(ip)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const page = TRACKED_PATHS[url.pathname];
  const userAgent = request.headers.get('user-agent');

  // Hard-block obvious script/automation traffic on real page routes before
  // it ever reaches the page-rendering code. Scoped to TRACKED_PATHS (not
  // /api/*) so server-to-server callers like the Stripe webhook are
  // unaffected.
  if (request.method === 'GET' && page && isHardBlocked(userAgent)) {
    return new Response('Forbidden', { status: 403 });
  }

  const response = await next();

  if (request.method === 'GET' && response.status === 200) {
    const cf = request.cf || {};
    const ip = request.headers.get('CF-Connecting-IP') || null;
    if (page && !isExcludedFromAnalytics(userAgent, cf.asOrganization, ip)) {
      const geo = {
        ip,
        country: cf.country || null,
        region: cf.region || null,
        city: cf.city || null,
        asOrg: cf.asOrganization || null,
      };
      context.waitUntil(logVisit(env, page, url.pathname, geo, userAgent));
    }
  }

  return response;
}

// Generalizes the Collyer Quay / Aliyun / code200 findings instead of
// requiring a new literal ASN-name or UA entry every time a new proxy
// network shows up: the same exact full user-agent string arriving from a
// different country within a short window is not something a real single
// visitor does, regardless of what org name (if any) is attached to the IP.
//
// Deliberately requires a DIFFERENT COUNTRY, not just a different IP or a
// repeat of the same UA in general — a shared Chrome-on-Windows or
// Chrome-on-Mac user-agent string is extremely common among genuine,
// unrelated visitors in the same country and would trigger constant false
// positives if matched on its own. Cross-country repetition of a
// byte-identical UA within hours is a much stronger, much rarer signal:
// no ordinary visitor browses from Warsaw, then New York, then Dubai in
// one afternoon. The first sighting of any UA is always let through
// untouched (there's nothing to compare it against yet); only a repeat
// from a different country gets suppressed.
async function isCrossCountryUaDuplicate(sql, userAgent, country) {
  if (!userAgent || !country) return false;
  const rows = await sql`
    select 1 from page_views
    where user_agent = ${userAgent}
      and country is not null
      and country != ${country}
      and viewed_at > now() - interval '3 hours'
    limit 1
  `;
  return rows.length > 0;
}

// Covers the gap the cross-country check leaves on purpose: a same-UA
// fan-out CONFINED to one country. Found 2026-09-14 — 12+ hits within 3
// minutes, one per Chinese province, all from residential/mobile ISPs
// (China Unicom/Telecom regional networks, not hosting providers) sharing
// one exact user-agent. Same country throughout, so isCrossCountryUaDuplicate
// never fires; isMalformedChromeUA happened to catch that specific UA's
// missing-AppleWebKit shape, but a well-formed UA reused the same way
// wouldn't be. This checks distinct IP COUNT for the same UA regardless of
// country: 3+ distinct IPs sending the identical UA within 10 minutes is
// not plausible for one visitor or a handful of unrelated ones sharing a
// common browser build — it's a proxy pool. Requires 2 prior distinct IPs
// (so this would be the 3rd+) before suppressing, same "let the first
// couple through, catch the pattern once it repeats" design as the
// cross-country check.
async function isUaFanOutDuplicate(sql, userAgent) {
  if (!userAgent) return false;
  const rows = await sql`
    select count(distinct ip_address) as cnt
    from page_views
    where user_agent = ${userAgent}
      and viewed_at > now() - interval '10 minutes'
  `;
  return rows.length > 0 && Number(rows[0].cnt) >= 2;
}

async function logVisit(env, page, path, geo, userAgent) {
  try {
    const sql = neon(env.DATABASE_URL);
    if (await isCrossCountryUaDuplicate(sql, userAgent, geo.country)) return;
    if (await isUaFanOutDuplicate(sql, userAgent)) return;

    // Same-IP-within-5-seconds dedup used to be a SELECT-then-INSERT check
    // here (isBurstDuplicate). Confirmed racy in production 2026-09-14: two
    // requests from the same IP 116ms apart both landed, because both ran
    // their "any row in the last 5 seconds?" check before either one's
    // insert had committed — a plain check-then-act race under concurrent
    // requests, which this file's traffic patterns hit often enough to
    // matter. Replaced with ip_time_bucket (migration 036): a plain text
    // column set here, not DB-generated (Postgres rejected extract(epoch
    // from timestamptz) as non-immutable for a generated column), computed
    // as `${ip}:${5-second window number}` and enforced via a partial
    // unique index + ON CONFLICT DO NOTHING. That makes the same-IP/5-second
    // dedup atomic at the database level instead of racing two separate
    // queries against each other.
    const ipTimeBucket = geo.ip ? `${geo.ip}:${Math.floor(Date.now() / 5000)}` : null;

    await sql`
      insert into page_views (page, path, ip_address, country, region, city, user_agent, as_org, ip_time_bucket)
      values (${page}, ${path}, ${geo.ip}, ${geo.country}, ${geo.region}, ${geo.city}, ${userAgent}, ${geo.asOrg}, ${ipTimeBucket})
      on conflict (ip_time_bucket) where ip_time_bucket is not null do nothing
    `;
  } catch (e) {
    // Swallow — visit tracking must never surface an error to the visitor.
  }
}
