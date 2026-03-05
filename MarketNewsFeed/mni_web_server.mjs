#!/usr/bin/env node
/**
 * MNI Market News — Live Feed Web App
 * ====================================
 * Zero-dependency Node.js server with SSE push and inline frontend.
 *
 * Usage:  node mni_web_server.mjs
 * Open:   http://localhost:3000
 */

import { createServer } from "node:http";
import { Client } from "@stomp/stompjs";
import WebSocket from "ws";

// Provide WebSocket to STOMP (Node.js doesn't have a global WebSocket)
Object.assign(global, { WebSocket });

// ─── Configuration ───────────────────────────────────────────────────────────

const API_BASE = "https://apis.marketnews.com";
const AUTH_ENDPOINT = `${API_BASE}/api/auth/client/token`;
const ARTICLES_ENDPOINT = `${API_BASE}/api/v1/news/articles`;
const WSS_URI = "wss://apis.marketnews.com/wss";

const USERNAME = "ripplemarkets01";
const PASSWORD = "8TYwWewl6P1Heun";

const PAGE_SIZE = 50;
const TOKEN_REFRESH_BUFFER_MS = 300_000;
const MAX_HISTORY = 500;
const PORT = 3000;

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

// ─── API Client ──────────────────────────────────────────────────────────────

class MNIClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.stompClient = null;
    this.onArticle = null; // callback for incoming push articles
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

  async getArticles(section, size = PAGE_SIZE, updatedAfter = null) {
    await this.ensureToken();
    const params = new URLSearchParams({ size: String(size) });
    if (section) params.set("section", section);
    if (updatedAfter) params.set("updatedAfter", updatedAfter);
    const resp = await fetch(`${ARTICLES_ENDPOINT}?${params}`, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Articles failed: ${resp.status}`);
    return resp.json();
  }

  // ── STOMP over WebSocket Push Connection ──

  connectStomp() {
    return new Promise((resolve, reject) => {
      console.log(`Connecting STOMP to ${WSS_URI}`);
      let resolved = false;

      this.stompClient = new Client({
        brokerURL: `${WSS_URI}?token=${this.accessToken}`,
        connectHeaders: {
          Authorization: `Bearer ${this.accessToken}`,
          login: USERNAME,
          passcode: this.accessToken,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: (frame) => {
          console.log("STOMP connected:", frame.headers?.server || "OK");

          // Subscribe to the news articles topic (filtered by account permissions)
          this.stompClient.subscribe("/topic/news/articles", (message) => {
            try {
              const article = JSON.parse(message.body);
              if (this.onArticle) this.onArticle(article);
            } catch (e) {
              console.error("STOMP message parse error:", e.message);
            }
          });
          console.log("Subscribed to /topic/news/articles");

          if (!resolved) { resolved = true; resolve(); }
        },

        onStompError: (frame) => {
          console.error("STOMP error:", frame.headers?.message || "Unknown");
          console.error("STOMP error headers:", JSON.stringify(frame.headers));
          console.error("STOMP error body:", frame.body);
          if (!resolved) { resolved = true; reject(new Error(frame.headers?.message || "STOMP error")); }
        },

        onWebSocketClose: (evt) => {
          console.log("STOMP WebSocket closed. Will auto-reconnect...");
        },

        onWebSocketError: (evt) => {
          console.error("STOMP WebSocket error");
        },
      });

      this.stompClient.activate();
    });
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
    this.allLatencies = [];
    this.latencies = [];
    this.recentLatencies = [];
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

    // Extract the MNI bullet code from genre data (e.g. "US", "GBP", "OIL", "STIR")
    const mnicodeGenre = (article.genre || []).find(g => g.scheme === "mnicode");
    const bulletCode = mnicodeGenre ? mnicodeGenre.name : "";

    // Extract the article type from genre data (e.g. "Bullet", "Story")
    const typeGenre = (article.genre || []).find(g => g.scheme === "mnitype");
    const articleType = typeGenre ? typeGenre.name : "";

    // Determine section from genre mni-section entries
    const sectionGenres = (article.genre || []).filter(g => g.scheme === "mni-section");
    const sectionNames = sectionGenres.map(g => g.code);
    const section = sectionNames.includes("480257789") ? "fx-bullets"
                  : sectionNames.includes("480257788") ? "fi-bullets"
                  : article._fetchedSection || "";

    return { headline, body, score, assets, regions, ts: article.versioncreated, byline: article.byline, latencyMs, section, bulletCode, articleType };
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
    return { avg, min: sorted[0], max: sorted[sorted.length - 1], p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)], count: arr.length };
  }

  getAllTimeLatencyStats() {
    const arr = this.allLatencies;
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { avg, min: sorted[0], max: sorted[sorted.length - 1], p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)], count: arr.length };
  }

  getSessionDuration() {
    const delta = Math.floor((Date.now() - this.sessionStart) / 1000);
    const h = Math.floor(delta / 3600);
    const m = Math.floor((delta % 3600) / 60);
    const s = delta % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
}

function sortedEntries(obj, limit = Infinity) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// ─── Server State ────────────────────────────────────────────────────────────

const client = new MNIClient();
const stats = new StatsEngine();
const articleHistory = [];
const sseClients = new Set();

function buildStatsSnapshot() {
  return {
    totalArticles: stats.totalArticles,
    unique: stats.seenUris.size,
    sessionDuration: stats.getSessionDuration(),
    velocity: stats.getVelocity(),
    avgSentiment: stats.getAvgSentiment(),
    assetCounts: { ...stats.assetClassCounts },
    regionCounts: { ...stats.regionCounts },
    keywords: sortedEntries(stats.keywordCounts, 10),
    authors: sortedEntries(stats.authorCounts, 5),
    latency: stats.getLatencyStats(),
    allTimeLatency: stats.getAllTimeLatencyStats(),
  };
}

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of sseClients) {
    try { c.write(msg); } catch {}
  }
}

// ─── HTML Frontend ───────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MNI Market News | Live Feed</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #0a0e17;
    --surface: #111827;
    --border: #1e293b;
    --text: #e2e8f0;
    --dim: #64748b;
    --accent: #3b82f6;
    --green: #22c55e;
    --red: #ef4444;
    --amber: #f59e0b;
    --magenta: #c084fc;
    --cyan: #22d3ee;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: "SF Mono", "Cascadia Code", "JetBrains Mono", "Fira Code", "Consolas", monospace;
    font-size: 13px;
    line-height: 1.5;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #1e3a5f 0%, #1a1a2e 100%);
    border-bottom: 1px solid var(--accent);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .header-title {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #fff;
  }
  .header-title span { color: var(--accent); }
  .header-meta {
    display: flex;
    gap: 24px;
    color: var(--dim);
    font-size: 12px;
  }
  .header-meta .val { color: var(--text); font-weight: 600; }
  .status-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--green);
    margin-right: 6px;
    animation: pulse 2s infinite;
  }
  .status-dot.disconnected { background: var(--red); animation: none; }

  /* ── Notification Toggle ── */
  .notif-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 4px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    color: var(--dim);
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .notif-btn:hover { background: rgba(255,255,255,0.1); color: var(--text); }
  .notif-btn.enabled { border-color: var(--green); color: var(--green); }
  .notif-btn.denied  { border-color: var(--red);   color: var(--red);   cursor: not-allowed; }
  .notif-icon { font-size: 13px; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Stats Panel ── */
  .stats-panel {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 24px;
    flex-shrink: 0;
  }
  .stats-row {
    display: grid;
    gap: 16px;
    margin-bottom: 12px;
  }
  .stats-row.top { grid-template-columns: repeat(4, 1fr); }
  .stats-row.bottom { grid-template-columns: 1fr 1fr 1.5fr; }
  .stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
  }
  .stat-card .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--dim);
    margin-bottom: 4px;
  }
  .stat-card .value {
    font-size: 20px;
    font-weight: 700;
  }
  .stat-card .sub {
    font-size: 11px;
    color: var(--dim);
    margin-top: 2px;
  }
  .green { color: var(--green); }
  .red { color: var(--red); }
  .amber { color: var(--amber); }

  /* Asset bars */
  .bar-row {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
    font-size: 11px;
  }
  .bar-label { width: 70px; color: var(--dim); }
  .bar-track {
    flex: 1;
    height: 14px;
    background: rgba(255,255,255,0.05);
    border-radius: 2px;
    overflow: hidden;
    margin: 0 8px;
  }
  .bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.6s ease;
  }
  .bar-count { width: 30px; text-align: right; color: var(--text); }

  /* Keyword tags */
  .kw-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .kw-tag {
    background: rgba(59,130,246,0.15);
    color: var(--cyan);
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
  }
  .kw-tag .cnt { color: var(--dim); margin-left: 3px; }

  /* Region list */
  .region-list { margin-top: 4px; }
  .region-item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 1px 0;
    color: var(--dim);
  }
  .region-item .rval { color: var(--text); }

  /* ── Feed ── */
  .feed-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .feed-container::-webkit-scrollbar { width: 6px; }
  .feed-container::-webkit-scrollbar-track { background: var(--bg); }
  .feed-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  .feed-item {
    display: flex;
    align-items: flex-start;
    padding: 6px 24px;
    border-left: 3px solid transparent;
    transition: background 0.3s;
  }
  .feed-item:hover { background: rgba(255,255,255,0.02); }
  .feed-item--new {
    animation: slideDown 0.5s ease-out;
    border-left-color: var(--accent);
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0); max-height: 120px; }
  }

  .fi-time {
    color: var(--dim);
    font-size: 11px;
    width: 68px;
    flex-shrink: 0;
    padding-top: 1px;
  }
  .fi-sent {
    width: 18px;
    flex-shrink: 0;
    font-size: 14px;
    text-align: center;
    padding-top: 0;
  }
  .fi-body { flex: 1; min-width: 0; }
  .fi-headline {
    font-size: 13px;
    color: var(--text);
    word-wrap: break-word;
  }
  .fi-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-top: 2px;
    font-size: 11px;
  }
  .tag {
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
  }
  .tag-asset { background: rgba(34,211,238,0.12); color: var(--cyan); }
  .tag-region { background: rgba(59,130,246,0.12); color: var(--accent); }
  .tag-bullet { background: rgba(245,158,11,0.15); color: var(--amber); }
  .tag-section { background: rgba(192,132,252,0.15); color: var(--magenta); }
  .tag-new { background: var(--red); color: #fff; }
  .fi-latency { color: var(--dim); font-size: 11px; }
  .fi-author { color: var(--dim); font-size: 11px; }

  .feed-divider {
    text-align: center;
    color: var(--dim);
    font-size: 11px;
    padding: 8px;
    border-bottom: 1px solid var(--border);
    margin: 4px 24px;
  }

  /* ── Push Status Bar ── */
  .push-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 24px;
    font-size: 10px;
    color: var(--dim);
    background: rgba(255,255,255,0.02);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .push-status .push-label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .push-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    animation: pulse 2s infinite;
  }
  .push-dot.disconnected { background: var(--red); animation: none; }

  /* ── Article Body Popup ── */
  .body-popup {
    position: fixed;
    z-index: 9999;
    max-width: 560px;
    min-width: 320px;
    max-height: 420px;
    background: linear-gradient(165deg, #1a2236 0%, #141c2e 100%);
    border: 1px solid rgba(59,130,246,0.3);
    border-radius: 10px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(59,130,246,0.4);
    padding: 0;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    overflow: hidden;
  }
  .body-popup.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  .body-popup-header {
    padding: 14px 18px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
  }
  .body-popup-headline {
    font-size: 13px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.45;
    margin-bottom: 6px;
  }
  .body-popup-meta {
    display: flex;
    gap: 12px;
    font-size: 10px;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .body-popup-content {
    padding: 14px 18px 16px;
    overflow-y: auto;
    max-height: 310px;
    font-family: "Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13.5px;
    line-height: 1.7;
    color: #c8d0dc;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .body-popup-content::-webkit-scrollbar { width: 5px; }
  .body-popup-content::-webkit-scrollbar-track { background: transparent; }
  .body-popup-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  .body-popup-empty {
    color: var(--dim);
    font-style: italic;
    font-size: 12px;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .stats-row.top { grid-template-columns: repeat(2, 1fr); }
    .stats-row.bottom { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-title"><span>MNI</span> MARKET NEWS <span>|</span> LIVE FEED</div>
  <div class="header-meta">
    <div><span class="status-dot" id="statusDot"></span><span id="statusText">Connecting...</span></div>
    <div>Session: <span class="val" id="hdrSession">--:--:--</span></div>
    <div>Articles: <span class="val" id="hdrArticles">0</span></div>
    <button class="notif-btn" id="notifBtn" title="Toggle desktop notifications">
      <span class="notif-icon">🔔</span><span id="notifLabel">Notifications</span>
    </button>
  </div>
</div>

<div class="stats-panel">
  <div class="stats-row top">
    <div class="stat-card">
      <div class="label">Velocity</div>
      <div class="value" id="stVelocity">--</div>
      <div class="sub">articles / min (30m window)</div>
    </div>
    <div class="stat-card">
      <div class="label">Sentiment (20)</div>
      <div class="value" id="stSentiment">--</div>
      <div class="sub" id="stSentLabel">--</div>
    </div>
    <div class="stat-card">
      <div class="label">Delivery Latency</div>
      <div class="value" id="stLatency">--</div>
      <div class="sub" id="stLatSub">p50 / p95</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Articles</div>
      <div class="value" id="stTotal">0</div>
      <div class="sub" id="stUnique">0 unique</div>
    </div>
  </div>
  <div class="stats-row bottom">
    <div class="stat-card">
      <div class="label">Asset Classes</div>
      <div id="stAssets"></div>
    </div>
    <div class="stat-card">
      <div class="label">Regions</div>
      <div id="stRegions" class="region-list"></div>
    </div>
    <div class="stat-card">
      <div class="label">Trending Keywords</div>
      <div id="stKeywords" class="kw-tags"></div>
    </div>
  </div>
</div>

<div class="push-status">
  <div class="push-label">
    <div class="push-dot" id="pushDot"></div>
    <span id="pushLabel">Connecting to push feed...</span>
  </div>
  <span id="pushInfo">WSS</span>
</div>

<div class="feed-container" id="feed"></div>

<script>
window.onerror = function(msg, src, line) {
  var el = document.getElementById("statusText");
  if (el) el.textContent = "JS Error (line " + line + "): " + msg;
  return false;
};
window.onunhandledrejection = function(e) {
  var el = document.getElementById("statusText");
  if (el) el.textContent = "Promise Error: " + (e.reason && e.reason.message || e.reason);
};
document.getElementById("statusText").textContent = "JS OK - waiting for SSE...";
</script>

<script>
const feed = document.getElementById("feed");
let autoScroll = true;

feed.addEventListener("scroll", () => {
  autoScroll = feed.scrollTop < 80;
});

function scrollToTop() {
  if (autoScroll) feed.scrollTop = 0;
}

// ── Push Status ──
const pushDot = document.getElementById("pushDot");
const pushLabel = document.getElementById("pushLabel");
const pushInfo = document.getElementById("pushInfo");
let lastArticleTime = null;

function showPushActive() {
  pushDot.className = "push-dot";
  pushLabel.textContent = "Push feed active";
}

function showPushArticle() {
  lastArticleTime = Date.now();
  pushLabel.textContent = "Article received just now";
  // Reset to idle after a few seconds
  setTimeout(() => {
    if (Date.now() - lastArticleTime >= 2500) {
      pushLabel.textContent = "Push feed active — listening";
    }
  }, 3000);
}

function fmtLatency(ms) {
  if (ms == null) return "--";
  if (ms < 1000) return Math.round(ms) + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  if (ms < 3600000) return (ms / 60000).toFixed(1) + "m";
  return (ms / 3600000).toFixed(1) + "h";
}

function latencyClass(ms) {
  if (ms == null) return "";
  if (ms < 5000) return "green";
  if (ms < 30000) return "amber";
  return "red";
}

function sentimentArrow(score) {
  if (score > 0.15) return '<span class="green">&#9650;</span>';
  if (score < -0.15) return '<span class="red">&#9660;</span>';
  return '<span class="amber">&#9472;</span>';
}

function sentimentColor(score) {
  if (score > 0.15) return "green";
  if (score < -0.15) return "red";
  return "amber";
}

function renderArticle(a, isNew, insertAt) {
  const div = document.createElement("div");
  div.className = "feed-item" + (isNew ? " feed-item--new" : "");

  const ts = a.ts ? new Date(a.ts).toISOString().slice(11, 19) : "??:??:??";

  // Section tag (FX / FI)
  const sectionTag = a.section === "fx-bullets" ? '<span class="tag tag-section">FX</span>'
                   : a.section === "fi-bullets" ? '<span class="tag tag-section">FI</span>'
                   : "";

  // Bullet code tag from MNI genre data (e.g. "US", "GBP", "OIL")
  const bulletTag = a.bulletCode ? '<span class="tag tag-bullet">' + esc(a.bulletCode) + '</span>' : "";

  const tags = [
    sectionTag,
    bulletTag,
    ...(a.assets || []).map(t => '<span class="tag tag-asset">' + esc(t) + '</span>'),
    ...(a.regions || []).map(t => '<span class="tag tag-region">' + esc(t) + '</span>'),
    ...(isNew ? ['<span class="tag tag-new">NEW</span>'] : []),
  ].join("");

  const lat = a.latencyMs != null
    ? '<span class="fi-latency ' + latencyClass(a.latencyMs) + '">lat:' + fmtLatency(a.latencyMs) + '</span>'
    : "";
  const author = a.byline ? '<span class="fi-author">' + esc(a.byline) + '</span>' : "";

  div.innerHTML =
    '<div class="fi-time">' + ts + '</div>' +
    '<div class="fi-sent">' + sentimentArrow(a.score) + '</div>' +
    '<div class="fi-body">' +
      '<div class="fi-headline">' + esc(a.headline) + '</div>' +
      '<div class="fi-meta">' + tags + lat + author + '</div>' +
    '</div>';

  div._articleData = a;

  // Insert at top (newest first) or at a specific position
  if (insertAt === "bottom") {
    feed.appendChild(div);
  } else {
    feed.insertBefore(div, feed.firstChild);
    scrollToTop();
  }
}

function esc(s) {
  if (!s) return "";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function updateStats(s) {
  // Header
  document.getElementById("hdrSession").textContent = s.sessionDuration || "--:--:--";
  document.getElementById("hdrArticles").textContent = s.totalArticles;

  // Velocity
  const vel = s.velocity != null ? s.velocity.toFixed(1) : "--";
  const velEl = document.getElementById("stVelocity");
  velEl.textContent = vel + "/min";
  velEl.className = "value " + (s.velocity > 5 ? "red" : s.velocity > 2 ? "amber" : "green");

  // Sentiment
  const sent = s.avgSentiment != null ? s.avgSentiment : 0;
  const sentEl = document.getElementById("stSentiment");
  sentEl.textContent = (sent >= 0 ? "+" : "") + sent.toFixed(3);
  sentEl.className = "value " + sentimentColor(sent);
  const sentLabel = sent > 0.15 ? "BULLISH" : sent < -0.15 ? "BEARISH" : "NEUTRAL";
  document.getElementById("stSentLabel").textContent = sentLabel;

  // Latency — only show polled delivery latency, not historical article age
  const lat = s.latency;
  const latEl = document.getElementById("stLatency");
  if (lat && lat.count > 0) {
    latEl.textContent = fmtLatency(lat.avg);
    latEl.className = "value " + latencyClass(lat.avg);
    document.getElementById("stLatSub").textContent =
      "p50: " + fmtLatency(lat.p50) + "  p95: " + fmtLatency(lat.p95) + "  n=" + lat.count;
  } else {
    latEl.textContent = "--";
    latEl.className = "value";
    document.getElementById("stLatSub").textContent = "waiting for polled data";
  }

  // Total
  document.getElementById("stTotal").textContent = s.totalArticles;
  document.getElementById("stUnique").textContent = s.unique + " unique";

  // Assets
  const assetsEl = document.getElementById("stAssets");
  const ac = Object.entries(s.assetCounts || {}).sort((a,b) => b[1] - a[1]).slice(0, 6);
  const maxAC = ac.length ? ac[0][1] : 1;
  assetsEl.innerHTML = ac.map(([name, cnt]) =>
    '<div class="bar-row">' +
      '<span class="bar-label">' + esc(name) + '</span>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + (cnt/maxAC*100).toFixed(0) + '%"></div></div>' +
      '<span class="bar-count">' + cnt + '</span>' +
    '</div>'
  ).join("");

  // Regions
  const regEl = document.getElementById("stRegions");
  const rg = Object.entries(s.regionCounts || {}).sort((a,b) => b[1] - a[1]).slice(0, 6);
  regEl.innerHTML = rg.map(([name, cnt]) =>
    '<div class="region-item"><span>' + esc(name) + '</span><span class="rval">' + cnt + '</span></div>'
  ).join("");

  // Keywords
  const kwEl = document.getElementById("stKeywords");
  const kw = s.keywords || [];
  kwEl.innerHTML = kw.map(([word, cnt]) =>
    '<span class="kw-tag">' + esc(word) + '<span class="cnt">' + cnt + '</span></span>'
  ).join("");
}

// ── Desktop Notifications ──

const notifBtn   = document.getElementById("notifBtn");
const notifLabel = document.getElementById("notifLabel");
let notifsEnabled = false;
const notifSupported = (typeof Notification !== "undefined") && notifBtn && notifLabel;

function updateNotifBtn() {
  if (!notifSupported) return;
  try {
    const perm = Notification.permission;
    if (perm === "denied") {
      notifBtn.className = "notif-btn denied";
      notifLabel.textContent = "Blocked";
      notifBtn.title = "Notifications blocked in browser site settings";
      notifsEnabled = false;
    } else if (notifsEnabled && perm === "granted") {
      notifBtn.className = "notif-btn enabled";
      notifLabel.textContent = "Notifs ON";
    } else {
      notifBtn.className = "notif-btn";
      notifLabel.textContent = "Notifications";
    }
  } catch (e) {}
}

if (notifSupported) {
  notifBtn.addEventListener("click", async () => {
    try {
      if (Notification.permission === "denied") return;
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result !== "granted") { updateNotifBtn(); return; }
      }
      notifsEnabled = !notifsEnabled;
      updateNotifBtn();
      if (notifsEnabled) {
        new Notification("MNI Live Feed", {
          body: "Desktop notifications enabled. You will be alerted as new headlines arrive.",
          silent: true,
        });
      }
    } catch (e) {}
  });
} else if (notifBtn) {
  notifBtn.style.display = "none";
}

function sentimentLabel(score) {
  if (score > 0.15) return "Bullish";
  if (score < -0.15) return "Bearish";
  return "Neutral";
}

function fireNotification(a) {
  if (!notifSupported || !notifsEnabled) return;
  try {
    if (Notification.permission !== "granted") return;
    const section = a.section === "fx-bullets" ? "[FX]" : a.section === "fi-bullets" ? "[FI]" : "";
    const bullet  = a.bulletCode ? "[" + a.bulletCode + "]" : "";
    const tag     = [section, bullet].filter(Boolean).join(" ");
    const title   = tag ? "MNI " + tag : "MNI Market News";
    const lat     = a.latencyMs != null ? "  lat: " + fmtLatency(a.latencyMs) : "";
    const body    = a.headline + "\\n" + sentimentLabel(a.score) + lat;
    const n = new Notification(title, { body, tag: a.ts || String(Date.now()), silent: false });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) {}
}

// Init button state on load
updateNotifBtn();

// ── SSE Connection ──

let es;
function connect() {
  es = new EventSource("/events");
  const dot = document.getElementById("statusDot");
  const txt = document.getElementById("statusText");

  es.addEventListener("init", (e) => {
    const { articles, stats: s } = JSON.parse(e.data);
    feed.innerHTML = "";

    // Server sends articles oldest-first; we want newest at top
    const newestFirst = [...articles].reverse();
    newestFirst.forEach(a => renderArticle(a, false, "bottom"));

    if (newestFirst.length) {
      const divider = document.createElement("div");
      divider.className = "feed-divider";
      divider.textContent = newestFirst.length + " historical articles loaded";
      feed.appendChild(divider);
    }

    feed.scrollTop = 0;
    updateStats(s);
    dot.className = "status-dot";
    txt.textContent = "Live";
    showPushActive();
  });

  es.addEventListener("article", (e) => {
    const a = JSON.parse(e.data);
    renderArticle(a, true);
    fireNotification(a);
    showPushArticle();
  });

  es.addEventListener("stats", (e) => {
    updateStats(JSON.parse(e.data));
  });

  es.addEventListener("heartbeat", (e) => {
    const hb = JSON.parse(e.data);
    document.getElementById("hdrSession").textContent = hb.sessionDuration || "--";
    document.getElementById("hdrArticles").textContent = hb.totalArticles;
  });

  es.onerror = () => {
    dot.className = "status-dot disconnected";
    txt.textContent = "Reconnecting...";
  };

  es.onopen = () => {
    dot.className = "status-dot";
    txt.textContent = "Live";
  };
}

connect();

// ── Body Text Popup on Hover ──

const popup = document.createElement("div");
popup.className = "body-popup";
popup.innerHTML = '<div class="body-popup-header"><div class="body-popup-headline" id="popupHL"></div><div class="body-popup-meta" id="popupMeta"></div></div><div class="body-popup-content" id="popupBody"></div>';
document.body.appendChild(popup);

let hoverTimer = null;
let activeItem = null;

function positionPopup(e) {
  const pad = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = e.clientX + 14;
  let y = e.clientY + 14;
  // Measure after making visible off-screen
  popup.style.left = "-9999px";
  popup.style.top = "0";
  popup.classList.add("visible");
  const rect = popup.getBoundingClientRect();
  popup.classList.remove("visible");
  if (x + rect.width + pad > vw) x = Math.max(pad, e.clientX - rect.width - 14);
  if (y + rect.height + pad > vh) y = Math.max(pad, vh - rect.height - pad);
  popup.style.left = x + "px";
  popup.style.top = y + "px";
}

function showPopup(item, e) {
  const data = item._articleData;
  if (!data) return;
  const hl = popup.querySelector("#popupHL");
  const meta = popup.querySelector("#popupMeta");
  const body = popup.querySelector("#popupBody");

  hl.textContent = data.headline || "";
  const parts = [];
  if (data.ts) parts.push(new Date(data.ts).toLocaleString());
  if (data.byline) parts.push(data.byline);
  if (data.section) parts.push(data.section === "fx-bullets" ? "FX Bullets" : data.section === "fi-bullets" ? "FI Bullets" : data.section);
  if (data.bulletCode) parts.push(data.bulletCode);
  meta.textContent = parts.join("  ·  ");

  if (data.body && data.body.trim()) {
    body.className = "body-popup-content";
    body.textContent = data.body;
  } else {
    body.className = "body-popup-content";
    body.innerHTML = '<span class="body-popup-empty">No body text available</span>';
  }

  positionPopup(e);
  popup.classList.add("visible");
  activeItem = item;
}

function hidePopup() {
  popup.classList.remove("visible");
  activeItem = null;
}

feed.addEventListener("mouseover", (e) => {
  const item = e.target.closest(".feed-item");
  if (!item || item === activeItem) return;
  clearTimeout(hoverTimer);
  hidePopup();
  hoverTimer = setTimeout(() => showPopup(item, e), 500);
});

feed.addEventListener("mousemove", (e) => {
  if (activeItem && popup.classList.contains("visible")) {
    // Don't reposition if mouse is over the popup itself
    if (e.target.closest(".body-popup")) return;
  }
});

feed.addEventListener("mouseout", (e) => {
  const item = e.target.closest(".feed-item");
  const related = e.relatedTarget;
  if (item && related && (item.contains(related) || related.closest(".body-popup"))) return;
  clearTimeout(hoverTimer);
  hidePopup();
});

popup.addEventListener("mouseleave", () => {
  clearTimeout(hoverTimer);
  hidePopup();
});
</script>
</body>
</html>`;

// ─── HTTP Server ─────────────────────────────────────────────────────────────

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(HTML);
    return;
  }

  if (url.pathname === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    // Send full state on connect
    const initData = JSON.stringify({ articles: articleHistory, stats: buildStatsSnapshot() });
    res.write(`event: init\ndata: ${initData}\n\n`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  if (url.pathname === "/api/stats" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(buildStatsSnapshot()));
    return;
  }

  if (url.pathname === "/api/articles" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(articleHistory));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
}

// ─── WebSocket Push Feed ─────────────────────────────────────────────────────

async function startFeed() {
  console.log("Authenticating with MNI API...");
  const authData = await client.authenticate();
  console.log(`Authenticated (token valid for ${Math.floor(authData.expires_in / 60)} min)`);

  // Initial fetch via REST to load history
  const fetchTime = Date.now();
  for (const section of MONITORED_SECTIONS) {
    try {
      const data = await client.getArticles(section, PAGE_SIZE);
      for (const article of (data.content || [])) {
        article._fetchedSection = section;
        const info = stats.processArticle(article, fetchTime, { trackLatency: false });
        if (info) {
          info.isNew = false;
          articleHistory.push(info);
        }
      }
    } catch (e) {
      console.error(`Error fetching ${section}:`, e.message);
    }
  }
  articleHistory.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  while (articleHistory.length > MAX_HISTORY) articleHistory.shift();

  console.log(`Loaded ${articleHistory.length} historical articles`);
  console.log(`Connecting to WebSocket push feed...`);

  // Set up article handler for incoming push messages
  client.onArticle = (article) => {
    const receiveTime = Date.now();
    const info = stats.processArticle(article, receiveTime);
    if (info) {
      info.isNew = true;
      articleHistory.push(info);
      while (articleHistory.length > MAX_HISTORY) articleHistory.shift();
      broadcast("article", info);
      broadcast("stats", buildStatsSnapshot());
    }
  };

  // Connect to STOMP push endpoint
  await client.connectStomp();
  console.log(`Live STOMP push feed active on ${WSS_URI}`);

  // Periodic heartbeat for connected SSE clients (every 15s)
  setInterval(() => {
    broadcast("heartbeat", {
      time: new Date().toISOString().slice(11, 19),
      totalArticles: stats.totalArticles,
      sessionDuration: stats.getSessionDuration(),
    });
  }, 15_000);
}

// ─── Start ───────────────────────────────────────────────────────────────────

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\nMNI Live Feed Web App running at http://localhost:${PORT}\n`);
  startFeed().catch(e => {
    console.error("Fatal error:", e.message);
    process.exit(1);
  });
});
