/**
 * MNI Market News — Server-side singleton client
 * Authenticates, fetches historical articles via REST, connects STOMP for live push.
 * Articles are stored in memory and served to the frontend via /api/mni.
 */

import { Client as StompClient } from "@stomp/stompjs";
import WebSocket from "ws";

// Polyfill WebSocket for STOMP in Node.js
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const API_BASE = "https://apis.marketnews.com";
const AUTH_ENDPOINT = `${API_BASE}/api/auth/client/token`;
const ARTICLES_ENDPOINT = `${API_BASE}/api/v1/news/articles`;
const WSS_URI = "wss://apis.marketnews.com/wss";

const USERNAME = "ripplemarkets01";
const PASSWORD = "8TYwWewl6P1Heun";

const PAGE_SIZE = 50;
const TOKEN_REFRESH_BUFFER_MS = 300_000;
const MAX_HISTORY = 300;
const MONITORED_SECTIONS = ["fx-bullets", "fi-bullets"];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MNIArticle {
  id: string;
  headline: string;
  body: string;
  score: number;
  sentiment: "bullish" | "bearish" | "neutral";
  assets: string[];
  regions: string[];
  ts: string;
  byline: string;
  latencyMs: number | null;
  section: string;
  bulletCode: string;
  articleType: string;
  isNew: boolean;
  receivedAt: number;
}

// ─── Sentiment Lexicon ──────────────────────────────────────────────────────

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

// ─── Asset & Region Keyword Maps ────────────────────────────────────────────

const ASSET_KEYWORDS: Record<string, string[]> = {
  "FX": ["forex","currency","currencies","eur/usd","gbp/usd","usd/jpy",
    "aud/usd","usd/cad","nzd/usd","eur/gbp","dollar","euro","yen",
    "sterling","pound","franc","loonie","aussie","kiwi","dxy"],
  "Rates": ["treasury","treasuries","bund","bunds","gilt","gilts",
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

const REGION_KEYWORDS: Record<string, string[]> = {
  "US": ["us ","u.s.","united states","american","fed ","fomc","treasury","dollar"],
  "Europe": ["europe","european","ecb","eurozone","bund","gilt","boe","euro ","dax","ftse","cac"],
  "Asia": ["asia","japan","china","chinese","boj","rba","nikkei","hang seng","yuan","yen ","jpy"],
  "UK": ["uk ","u.k.","britain","british","sterling","gilt","boe","ftse","pound"],
  "Canada": ["canada","canadian","cad","loonie","boc"],
  "EM": ["emerging","brazil","mexico","india","turkey","south africa","indonesia","latam"],
};

// ─── Classification Helpers ─────────────────────────────────────────────────

function classifyText(text: string, keywordMap: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const [category, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) { hits.push(category); break; }
    }
  }
  return hits;
}

function computeSentiment(text: string): number {
  const words = new Set((text.toLowerCase().match(/\b\w+\b/g) || []));
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg;
  return total === 0 ? 0 : (pos - neg) / total;
}

function sentimentLabel(score: number): "bullish" | "bearish" | "neutral" {
  if (score >= 0.15) return "bullish";
  if (score <= -0.15) return "bearish";
  return "neutral";
}

// ─── MNI Client Singleton ───────────────────────────────────────────────────

type ArticleListener = (article: MNIArticle) => void;

class MNIClientSingleton {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private stompClient: StompClient | null = null;
  private seenUris = new Set<string>();
  private _articles: MNIArticle[] = [];
  private _initialized = false;
  private _initializing: Promise<void> | null = null;
  private _articleCounter = 0;
  private _listeners: Set<ArticleListener> = new Set();

  get articles(): MNIArticle[] {
    return this._articles;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  /** Subscribe to new article events. Returns an unsubscribe function. */
  onArticle(listener: ArticleListener): () => void {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  private _notifyListeners(article: MNIArticle): void {
    for (const listener of this._listeners) {
      try { listener(article); } catch { /* ignore listener errors */ }
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this._initialized) return;
    if (this._initializing) return this._initializing;
    this._initializing = this._init();
    return this._initializing;
  }

  private async _init(): Promise<void> {
    try {
      console.log("[MNI] Authenticating...");
      await this.authenticate();
      console.log("[MNI] Authenticated. Fetching historical articles...");

      const fetchTime = Date.now();
      for (const section of MONITORED_SECTIONS) {
        try {
          const data = await this.getArticles(section, PAGE_SIZE);
          const content = data.content || [];
          for (const article of content) {
            article._fetchedSection = section;
            const processed = this.processArticle(article, fetchTime, false);
            if (processed) {
              processed.isNew = false;
              this._articles.push(processed);
            }
          }
        } catch (e) {
          console.error(`[MNI] Error fetching ${section}:`, (e as Error).message);
        }
      }

      this._articles.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
      while (this._articles.length > MAX_HISTORY) this._articles.shift();
      console.log(`[MNI] Loaded ${this._articles.length} historical articles`);

      // Connect STOMP for real-time push
      console.log("[MNI] Connecting STOMP WebSocket...");
      await this.connectStomp();
      console.log("[MNI] STOMP connected. Live push active.");

      this._initialized = true;
    } catch (e) {
      console.error("[MNI] Initialization failed:", (e as Error).message);
      this._initializing = null;
      throw e;
    }
  }

  private async authenticate(): Promise<void> {
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
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry - TOKEN_REFRESH_BUFFER_MS) {
      await this.authenticate();
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getArticles(section: string, size: number = PAGE_SIZE): Promise<any> {
    await this.ensureToken();
    const params = new URLSearchParams({ size: String(size) });
    if (section) params.set("section", section);
    const resp = await fetch(`${ARTICLES_ENDPOINT}?${params}`, { headers: this.headers() });
    if (!resp.ok) throw new Error(`Articles failed: ${resp.status}`);
    return resp.json();
  }

  private connectStomp(): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      this.stompClient = new StompClient({
        brokerURL: `${WSS_URI}?token=${this.accessToken}`,
        connectHeaders: {
          Authorization: `Bearer ${this.accessToken}`,
          login: USERNAME,
          passcode: this.accessToken!,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log("[MNI] STOMP connected");
          this.stompClient!.subscribe("/topic/news/articles", (message) => {
            try {
              const article = JSON.parse(message.body);
              const receiveTime = Date.now();
              const processed = this.processArticle(article, receiveTime, true);
              if (processed) {
                processed.isNew = true;
                this._articles.push(processed);
                while (this._articles.length > MAX_HISTORY) this._articles.shift();
                this._notifyListeners(processed);
              }
            } catch (e) {
              console.error("[MNI] STOMP message parse error:", (e as Error).message);
            }
          });
          if (!resolved) { resolved = true; resolve(); }
        },

        onStompError: (frame) => {
          console.error("[MNI] STOMP error:", frame.headers?.message || "Unknown");
          if (!resolved) { resolved = true; reject(new Error(frame.headers?.message || "STOMP error")); }
        },

        onWebSocketClose: () => {
          console.log("[MNI] STOMP WebSocket closed. Auto-reconnecting...");
        },

        onWebSocketError: () => {
          console.error("[MNI] STOMP WebSocket error");
        },
      });

      this.stompClient.activate();
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processArticle(article: any, receiveTime: number, trackLatency: boolean): MNIArticle | null {
    const uri = article.uri || "";
    if (uri && this.seenUris.has(uri)) return null;
    if (uri) this.seenUris.add(uri);

    const headline = article.headline || "";
    const body = article.body_text || "";
    const fullText = `${headline} ${body}`;

    const assets = classifyText(fullText, ASSET_KEYWORDS);
    const regions = classifyText(fullText, REGION_KEYWORDS);
    const score = computeSentiment(fullText);

    let latencyMs: number | null = null;
    if (trackLatency) {
      const createdStr = article.versioncreated || article.firstcreated;
      if (createdStr) {
        const createdTime = new Date(createdStr).getTime();
        if (!isNaN(createdTime)) {
          latencyMs = receiveTime - createdTime;
          if (latencyMs < 0) latencyMs = null;
        }
      }
    }

    // Extract MNI metadata from genre arrays
    const mnicodeGenre = (article.genre || []).find((g: { scheme: string }) => g.scheme === "mnicode");
    const bulletCode = mnicodeGenre ? mnicodeGenre.name : "";
    const typeGenre = (article.genre || []).find((g: { scheme: string }) => g.scheme === "mnitype");
    const articleType = typeGenre ? typeGenre.name : "";
    const sectionGenres = (article.genre || []).filter((g: { scheme: string }) => g.scheme === "mni-section");
    const sectionCodes = sectionGenres.map((g: { code: string }) => g.code);
    const section = sectionCodes.includes("480257789") ? "FX"
                  : sectionCodes.includes("480257788") ? "Rates"
                  : article._fetchedSection === "fx-bullets" ? "FX"
                  : article._fetchedSection === "fi-bullets" ? "Rates"
                  : "";

    this._articleCounter++;

    return {
      id: uri || `mni-${this._articleCounter}`,
      headline,
      body,
      score,
      sentiment: sentimentLabel(score),
      assets,
      regions,
      ts: article.versioncreated || article.firstcreated || new Date().toISOString(),
      byline: article.byline || "",
      latencyMs,
      section,
      bulletCode,
      articleType,
      isNew: false,
      receivedAt: receiveTime,
    };
  }
}

// ─── Global Singleton ───────────────────────────────────────────────────────

const globalForMNI = globalThis as typeof globalThis & { __mniClient?: MNIClientSingleton };

if (!globalForMNI.__mniClient) {
  globalForMNI.__mniClient = new MNIClientSingleton();
}

export const mniClient = globalForMNI.__mniClient;
