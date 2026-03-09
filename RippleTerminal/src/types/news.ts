export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  url: string;
  pubDate: string;
  summary?: string;
  category?: string;
}

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
