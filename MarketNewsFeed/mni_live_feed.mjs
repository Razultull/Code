#!/usr/bin/env node
/**
 * MNI Market News Live Feed & Quant Statistics Dashboard
 * ======================================================
 * Scrolling terminal feed that prints new headlines as they arrive,
 * with stats summary reprinted after each poll cycle.
 *
 * Usage:  node mni_live_feed.mjs
 * Stop:   Ctrl+C (displays session summary)
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const API_BASE = "https://apis.marketnews.com";
const AUTH_ENDPOINT = `${API_BASE}/api/auth/client/token`;
const ARTICLES_ENDPOINT = `${API_BASE}/api/v1/news/articles`;
const SECTIONS_ENDPOINT = `${API_BASE}/api/v1/news/sections`;

const USERNAME = "ripplemarkets01";
const PASSWORD = "8TYwWewl6P1Heun";

const POLL_INTERVAL_MS = 15_000;
const PAGE_SIZE = 50;
const TOKEN_REFRESH_BUFFER_MS = 300_000;

const MONITORED_SECTIONS = ["fx-bullets", "fi-bullets"];

// ─── Sentiment Lexicon ───────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  "rally","rallies","bullish","surge","surges","gain","gains","rise","rises",
  "higher","upbeat","optimism","recovery","rebound","boost","strong","strength",
  "outperform","upgrade","upgrades","hawkish","expansion","growth","positive",
  "support","breakout","accelerate","beat","beats","exceed","exceeds","upside",
  "advance","advances","improve","improves","robust","solid","firm","firmer",
]);

const NEGATIVE_WORDS = new Set([
  "sell","selloff","bearish","decline","declines","drop","drops","fall","falls",
  "lower","downbeat","pessimism","recession","slump","weak","weakness",
  "underperform","downgrade","downgrades","dovish","contraction","negative",
  "risk","crash","plunge","plunges","miss","misses","downside","retreat",
  "retreats","deteriorate","sluggish","soft","softer","cut","cuts","warning",
  "concern",
]);

// ─── Asset & Region Keyword Maps ─────────────────────────────────────────────

const ASSET_KEYWORDS = {
  "FX": ["forex","currency","currencies","eur/usd","gbp/usd","usd/jpy",
    "aud/usd","usd/cad","nzd/usd","eur/gbp","dollar","euro","yen",
    "sterling","pound","franc","loonie","aussie","kiwi","dxy"],
  "Rates/FI": ["treasury","treasuries","bund","bunds","gilt","gilts",
    "yield","yields","bond","bonds","rate ","rates","fed ","ecb","boj",
    "boe","rba","fomc","monetary policy","tightening","easing","hike",
    "basis points","bps"],
  "Equities": ["equity","equities","stock","stocks","s&p","nasdaq","dow ",
    "nikkei","dax","ftse","eurostoxx","topix","hang seng","cac","index",
    "indices"],
  "Commodities": ["oil","crude","wti","brent","gold","silver","copper",
    "platinum","palladium","natgas","natural gas","lng","commodity",
    "commodities","opec"],
  "Credit": ["credit","spread ","spreads","cds","high yield",
    "investment grade","issuance","supply pipeline"],
  "EM": ["emerging","em ","latam","ceemea","asia ex-japan","frontier",
    "developing"],
};

const REGION_KEYWORDS = {
  "US": ["us ","u.s.","united states","american","fed ","fomc","treasury","dollar"],
  "Europe": ["europe","european","ecb","eurozone","bund","gilt","boe","euro ","dax","ftse","cac"],
  "Asia": ["asia","japan","china","chinese","boj","rba","nikkei","hang seng","yuan","yen ","jpy"],
  "UK": ["uk ","u.k.","britain","british","sterling","gilt","boe","ftse","pound"],
  "Canada": ["canada","canadian","cad","loonie","boc"],
  "EM": ["emerging","brazil","mexico","india","turkey","south africa","indonesia","latam"],
};

// ─── Terminal Colors ─────────────────────────────────────────────────────────

const C = {
  RESET:   "\x1b[0m",
  BOLD:    "\x1b[1m",
  DIM:     "\x1b[2m",
  RED:     "\x1b[91m",
  GREEN:   "\x1b[92m",
  YELLOW:  "\x1b[93m",
  BLUE:    "\x1b[94m",
  MAGENTA: "\x1b[95m",
  CYAN:    "\x1b[96m",
  WHITE:   "\x1b[97m",
  BG_BLUE: "\x1b[44m",
  BG_RED:  "\x1b[41m",
  BG_GREEN:"\x1b[42m",
  BG_YELLOW:"\x1b[43m",
};

const SEP = `${C.DIM}${"─".repeat(100)}${C.RESET}`;

// ─── API Client ──────────────────────────────────────────────────────────────

class MNIClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    const resp = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    if (!resp.ok) throw new Error(`Auth failed: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return data;
  }

  async ensureToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - TOKEN_REFRESH_BUFFER_MS) {
      await this.authenticate();
    }
  }

  headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  async getSections() {
    await this.ensureToken();
    const resp = await fetch(SECTIONS_ENDPOINT, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Sections failed: ${resp.status}`);
    return resp.json();
  }

  async getArticles(section, size = PAGE_SIZE, updatedAfter = null) {
    await this.ensureToken();
    const params = new URLSearchParams({ size: String(size) });
    if (section) params.set("section", section);
    if (updatedAfter) params.set("updatedAfter", updatedAfter);
    const resp = await fetch(`${ARTICLES_ENDPOINT}?${params}`, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Articles failed: ${resp.status}`);
    return resp.json();
  }
}

// ─── Statistics Engine ───────────────────────────────────────────────────────

class StatsEngine {
  constructor() {
    this.totalArticles = 0;
    this.sessionStart = Date.now();
    this.seenUris = new Set();
    this.velocityWindow = [];
    this.assetClassCounts = {};
    this.regionCounts = {};
    this.keywordCounts = {};
    this.genreCounts = {};
    this.authorCounts = {};
    this.subjectCounts = {};
    this.sentimentScores = [];
    // Latency tracking
    this.allLatencies = [];        // every article (for session summary)
    this.latencies = [];           // polled-only latencies (for rolling stats)
    this.recentLatencies = [];     // last 50 polled for rolling stats
  }

  _classifyText(text, keywordMap) {
    const lower = text.toLowerCase();
    const hits = {};
    for (const [category, keywords] of Object.entries(keywordMap)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) { hits[category] = (hits[category] || 0) + 1; break; }
      }
    }
    return hits;
  }

  _computeSentiment(text) {
    const words = new Set(text.toLowerCase().match(/\b\w+\b/g) || []);
    let pos = 0, neg = 0;
    for (const w of words) {
      if (POSITIVE_WORDS.has(w)) pos++;
      if (NEGATIVE_WORDS.has(w)) neg++;
    }
    const total = pos + neg;
    return total === 0 ? 0 : (pos - neg) / total;
  }

  _extractKeywords(text) {
    return (text.match(/\b[A-Z][A-Z/&\-]{1,}[A-Z0-9]\b/g) || []);
  }

  _inc(map, key, n = 1) { map[key] = (map[key] || 0) + n; }

  processArticle(article, receiveTime = Date.now(), { trackLatency = true } = {}) {
    const uri = article.uri || "";
    if (this.seenUris.has(uri)) return null;
    this.seenUris.add(uri);
    this.totalArticles++;

    const now = Date.now();
    this.velocityWindow.push(now);
    const cutoff = now - 30 * 60 * 1000;
    while (this.velocityWindow.length && this.velocityWindow[0] < cutoff) this.velocityWindow.shift();

    const headline = article.headline || "";
    const body = article.body_text || "";
    const fullText = `${headline} ${body}`;

    for (const g of (article.genre || [])) if (g.name) this._inc(this.genreCounts, g.name);
    for (const s of (article.subject || [])) if (s.name) this._inc(this.subjectCounts, s.name);
    this._inc(this.authorCounts, article.byline || "Unknown");

    const assetHits = this._classifyText(fullText, ASSET_KEYWORDS);
    for (const [k, v] of Object.entries(assetHits)) this._inc(this.assetClassCounts, k, v);
    const regionHits = this._classifyText(fullText, REGION_KEYWORDS);
    for (const [k, v] of Object.entries(regionHits)) this._inc(this.regionCounts, k, v);
    for (const kw of this._extractKeywords(headline)) this._inc(this.keywordCounts, kw);

    const score = this._computeSentiment(fullText);
    this.sentimentScores.push({ headline, score });

    // Latency: only compute for polled articles (not historical)
    let latencyMs = null;
    if (trackLatency) {
      const createdStr = article.versioncreated || article.firstcreated;
      if (createdStr) {
        const createdTime = new Date(createdStr).getTime();
        if (!isNaN(createdTime)) {
          latencyMs = receiveTime - createdTime;
          if (latencyMs >= 0) {
            this.allLatencies.push(latencyMs);
            this.latencies.push(latencyMs);
            this.recentLatencies.push(latencyMs);
            if (this.recentLatencies.length > 50) this.recentLatencies.shift();
          } else {
            latencyMs = null;
          }
        }
      }
    }

    const assets = Object.keys(assetHits);
    const regions = Object.keys(regionHits);
    const section = article.section || article._fetchedSection || "";

    return {
      headline, score, assets, regions,
      ts: article.versioncreated,
      byline: article.byline,
      latencyMs,
      section,
    };
  }

  getVelocity() { return this.velocityWindow.length / 30; }

  getAvgSentiment(n = 20) {
    if (!this.sentimentScores.length) return 0;
    const recent = this.sentimentScores.slice(-n);
    return recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
  }

  getLatencyStats() {
    const arr = this.recentLatencies;
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { avg, min, max, p50, p95, count: arr.length };
  }

  getAllTimeLatencyStats() {
    const arr = this.allLatencies;
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    return { avg, min, max, p50, p95, count: arr.length };
  }

  getSessionDuration() {
    const delta = Math.floor((Date.now() - this.sessionStart) / 1000);
    const h = Math.floor(delta / 3600);
    const m = Math.floor((delta % 3600) / 60);
    const s = delta % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

function sortedEntries(obj, limit = Infinity) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function formatSentiment(score) {
  if (score > 0.15) return `${C.GREEN}+${score.toFixed(2)} BULLISH${C.RESET}`;
  if (score < -0.15) return `${C.RED}${score.toFixed(2)} BEARISH${C.RESET}`;
  return `${C.YELLOW}${score.toFixed(2)} NEUTRAL${C.RESET}`;
}

function formatBar(count, maxCount, width = 20) {
  if (maxCount === 0) return "";
  const filled = Math.round((count / maxCount) * width);
  return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
}

function formatTime(isoStr) {
  try { return new Date(isoStr).toISOString().slice(11, 19); }
  catch { return "??:??:??"; }
}

function formatLatency(ms) {
  if (ms == null) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3600_000).toFixed(1)}h`;
}

function colorLatency(ms) {
  if (ms == null) return "";
  const txt = formatLatency(ms);
  if (ms < 5_000) return `${C.GREEN}${txt}${C.RESET}`;
  if (ms < 30_000) return `${C.YELLOW}${txt}${C.RESET}`;
  return `${C.RED}${txt}${C.RESET}`;
}

// ─── Print a single headline ─────────────────────────────────────────────────

function printHeadline(info, isNew = true) {
  const ts = formatTime(info.ts);
  const sentIcon = info.score > 0.15 ? `${C.GREEN}\u25B2${C.RESET}` :
                   info.score < -0.15 ? `${C.RED}\u25BC${C.RESET}` :
                   `${C.YELLOW}\u2500${C.RESET}`;

  // Social feed gets a magenta tag — only for articles fetched from instant-social
  const isSocial = info.section === "instant-social";
  const socialTag = isSocial ? `${C.MAGENTA}[SOCIAL]${C.RESET} ` : "";

  const tags = [...info.assets, ...info.regions]
    .map(t => `${C.CYAN}[${t}]${C.RESET}`)
    .join("");

  const newTag = isNew ? ` ${C.BG_RED}${C.WHITE} NEW ${C.RESET}` : "";
  const byline = info.byline ? `${C.DIM}(${info.byline})${C.RESET}` : "";

  // Latency tag
  const latTag = info.latencyMs != null ? ` ${C.DIM}lat:${C.RESET}${colorLatency(info.latencyMs)}` : "";

  const maxHL = isSocial ? 55 : 60;
  const hl = info.headline.length > maxHL ? info.headline.slice(0, maxHL) + "..." : info.headline;

  console.log(`  ${C.DIM}${ts}${C.RESET} ${sentIcon} ${socialTag}${hl} ${tags}${latTag}${newTag} ${byline}`);
}

// ─── Print stats summary block ───────────────────────────────────────────────

function printStatsSummary(stats) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const vel = stats.getVelocity();
  const avgSent = stats.getAvgSentiment();
  const velColor = vel > 5 ? C.RED : vel > 2 ? C.YELLOW : C.GREEN;

  console.log();
  console.log(SEP);
  console.log(`${C.BG_BLUE}${C.WHITE}${C.BOLD}  STATS UPDATE  ${C.RESET} ${now}  |  Session: ${stats.getSessionDuration()}  |  Articles: ${stats.totalArticles}`);
  console.log(SEP);

  // Flow + Latency
  const latStats = stats.getLatencyStats();
  let latLine = "";
  if (latStats) {
    latLine = `  |  Latency p50: ${colorLatency(latStats.p50)}  p95: ${colorLatency(latStats.p95)}  avg: ${colorLatency(latStats.avg)}`;
  }
  console.log(`  Velocity: ${velColor}${vel.toFixed(1)} art/min${C.RESET}  |  Sentiment (20): ${formatSentiment(avgSent)}  |  Unique: ${stats.seenUris.size}${latLine}`);

  // Latency detail line
  if (latStats) {
    console.log(`  ${C.BOLD}Latency (last ${latStats.count}):${C.RESET} min=${colorLatency(latStats.min)}  max=${colorLatency(latStats.max)}  p50=${colorLatency(latStats.p50)}  p95=${colorLatency(latStats.p95)}  avg=${colorLatency(latStats.avg)}`);
  }

  // Asset classes
  const acEntries = sortedEntries(stats.assetClassCounts, 6);
  if (acEntries.length) {
    const maxAC = acEntries[0][1];
    const acLine = acEntries.map(([name, count]) => {
      const bar = formatBar(count, maxAC, 10);
      return `${name}:${bar}${count}`;
    }).join("  ");
    console.log(`  ${C.BOLD}Assets:${C.RESET} ${acLine}`);
  }

  // Regions
  const rgEntries = sortedEntries(stats.regionCounts, 6);
  if (rgEntries.length) {
    const rgLine = rgEntries.map(([name, count]) => `${name}(${count})`).join(" | ");
    console.log(`  ${C.BOLD}Regions:${C.RESET} ${rgLine}`);
  }

  // Trending keywords
  const kwEntries = sortedEntries(stats.keywordCounts, 10);
  if (kwEntries.length) {
    const kwLine = kwEntries.map(([kw, cnt]) => `${C.CYAN}${kw}${C.RESET}(${cnt})`).join(" ");
    console.log(`  ${C.BOLD}Trending:${C.RESET} ${kwLine}`);
  }

  // Top authors
  const auEntries = sortedEntries(stats.authorCounts, 4);
  if (auEntries.length) {
    const auLine = auEntries.map(([name, cnt]) => `${name}(${cnt})`).join(" | ");
    console.log(`  ${C.BOLD}Authors:${C.RESET} ${auLine}`);
  }

  console.log(SEP);
  console.log();
}

// ─── Session Summary (on Ctrl+C) ────────────────────────────────────────────

function displaySessionSummary(stats) {
  console.log(`\n${C.BG_BLUE}${C.WHITE}${C.BOLD}  MNI LIVE FEED  |  SESSION SUMMARY  ${C.RESET}\n`);

  console.log(`  Session Duration:    ${stats.getSessionDuration()}`);
  console.log(`  Total Articles:      ${stats.totalArticles}`);
  console.log(`  Unique Stories:      ${stats.seenUris.size}`);
  console.log(`  Avg Story Velocity:  ${stats.getVelocity().toFixed(1)} articles/min`);
  console.log(`  Avg Sentiment:       ${formatSentiment(stats.getAvgSentiment())}`);

  // Latency summary
  const latAll = stats.getAllTimeLatencyStats();
  if (latAll) {
    console.log();
    console.log(`  ${C.BOLD}DELIVERY LATENCY (all ${latAll.count} articles)${C.RESET}`);
    console.log(`    Min:  ${colorLatency(latAll.min)}`);
    console.log(`    Max:  ${colorLatency(latAll.max)}`);
    console.log(`    Avg:  ${colorLatency(latAll.avg)}`);
    console.log(`    p50:  ${colorLatency(latAll.p50)}`);
    console.log(`    p95:  ${colorLatency(latAll.p95)}`);
  }

  console.log();
  console.log(`  ${C.BOLD}ASSET CLASS SUMMARY${C.RESET}`);
  for (const [name, count] of sortedEntries(stats.assetClassCounts)) {
    const pct = ((count / Math.max(stats.totalArticles, 1)) * 100).toFixed(1);
    console.log(`    ${name.padEnd(14)} ${String(count).padStart(4)} mentions (${pct}%)`);
  }

  console.log(`\n  ${C.BOLD}REGIONAL SUMMARY${C.RESET}`);
  for (const [name, count] of sortedEntries(stats.regionCounts)) {
    const pct = ((count / Math.max(stats.totalArticles, 1)) * 100).toFixed(1);
    console.log(`    ${name.padEnd(14)} ${String(count).padStart(4)} mentions (${pct}%)`);
  }

  console.log(`\n  ${C.BOLD}TOP 20 KEYWORDS${C.RESET}`);
  for (const [kw, cnt] of sortedEntries(stats.keywordCounts, 20)) {
    console.log(`    ${kw.padEnd(20)} ${String(cnt).padStart(4)}`);
  }

  console.log(`\n  ${C.BOLD}TOP SUBJECTS${C.RESET}`);
  for (const [name, count] of sortedEntries(stats.subjectCounts, 15)) {
    console.log(`    ${name.padEnd(30)} ${String(count).padStart(4)}`);
  }

  const sorted = [...stats.sentimentScores].sort((a, b) => b.score - a.score);
  console.log(`\n  ${C.BOLD}MOST BULLISH HEADLINES${C.RESET}`);
  for (const { headline, score } of sorted.slice(0, 5)) {
    console.log(`    ${C.GREEN}+${score.toFixed(2)}${C.RESET} ${headline.slice(0, 80)}`);
  }

  console.log(`\n  ${C.BOLD}MOST BEARISH HEADLINES${C.RESET}`);
  for (const { headline, score } of sorted.slice(-5).reverse()) {
    console.log(`    ${C.RED}${score.toFixed(2)}${C.RESET} ${headline.slice(0, 80)}`);
  }

  console.log();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const client = new MNIClient();
  const stats = new StatsEngine();

  // Banner
  console.log();
  console.log(`${C.BG_BLUE}${C.WHITE}${C.BOLD}                                                                              ${C.RESET}`);
  console.log(`${C.BG_BLUE}${C.WHITE}${C.BOLD}   MNI MARKET NEWS  |  LIVE FEED  |  Quant Trading Desk                       ${C.RESET}`);
  console.log(`${C.BG_BLUE}${C.WHITE}${C.BOLD}                                                                              ${C.RESET}`);
  console.log();

  // Authenticate
  console.log(`${C.DIM}Authenticating...${C.RESET}`);
  try {
    const authData = await client.authenticate();
    console.log(`${C.GREEN}\u2713 Authenticated${C.RESET} (token valid for ${Math.floor(authData.expires_in / 60)} min)`);
  } catch (e) {
    console.error(`${C.RED}Authentication failed: ${e.message}${C.RESET}`);
    process.exit(1);
  }

  // Fetch sections
  try {
    const sections = await client.getSections();
    const authorized = sections.filter(s => s.flags?.authorized);
    console.log(`${C.GREEN}\u2713 Authorized sections:${C.RESET} ${authorized.map(s => s.code).join(", ")}`);
  } catch (e) {
    console.log(`${C.YELLOW}Could not fetch sections: ${e.message}${C.RESET}`);
  }

  console.log(`${C.GREEN}\u2713 Monitoring:${C.RESET} ${MONITORED_SECTIONS.join(", ")}`);
  console.log(`${C.GREEN}\u2713 Poll interval:${C.RESET} ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`${C.DIM}Press Ctrl+C to stop and show session summary${C.RESET}`);
  console.log();
  console.log(SEP);
  console.log(`${C.BOLD}  LOADING INITIAL ARTICLES...${C.RESET}`);
  console.log(SEP);
  console.log();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log();
    displaySessionSummary(stats);
    console.log(`${C.DIM}Session ended.${C.RESET}\n`);
    process.exit(0);
  });

  // ── Initial fetch: load recent history (no latency tracking for historical) ──
  const fetchTime = Date.now();
  let initialArticles = [];
  for (const section of MONITORED_SECTIONS) {
    try {
      const data = await client.getArticles(section, PAGE_SIZE);
      for (const article of (data.content || [])) {
        article._fetchedSection = section;
        const info = stats.processArticle(article, fetchTime, { trackLatency: false });
        if (info) initialArticles.push(info);
      }
    } catch (e) {
      console.log(`${C.RED}Error fetching ${section}: ${e.message}${C.RESET}`);
    }
  }

  // Sort initial articles by time and print (oldest first)
  initialArticles.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  for (const info of initialArticles) {
    printHeadline(info, false);
  }

  console.log();
  console.log(`  ${C.DIM}--- ${initialArticles.length} historical articles loaded ---${C.RESET}`);

  // Print initial stats
  printStatsSummary(stats);

  // ── Polling loop ──
  let lastPollTime = new Date().toISOString();

  while (true) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const pollReceiveTime = Date.now();
    let newCount = 0;

    for (const section of MONITORED_SECTIONS) {
      try {
        const data = await client.getArticles(section, PAGE_SIZE, lastPollTime);
        const articles = data.content || [];

        articles.sort((a, b) => new Date(a.versioncreated) - new Date(b.versioncreated));

        for (const article of articles) {
          article._fetchedSection = section;
          const info = stats.processArticle(article, pollReceiveTime);
          if (info) {
            printHeadline(info, true);
            newCount++;
          }
        }
      } catch {}
    }

    lastPollTime = new Date().toISOString();

    // Always reprint stats after each poll cycle
    if (newCount > 0) {
      printStatsSummary(stats);
    } else {
      // Heartbeat so user knows it's alive
      const now = new Date().toISOString().slice(11, 19);
      process.stdout.write(`\r  ${C.DIM}${now} \u2764 listening... (${stats.totalArticles} articles, ${formatLatency(stats.getLatencyStats()?.avg)} avg latency)${C.RESET}     `);
    }
  }
}

main().catch(e => {
  console.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
