import { NextResponse } from "next/server";
import Parser from "rss-parser";
import type { NewsHeadline } from "@/types/news";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "RippleTerminal/1.0",
  },
});

const FEEDS = [
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    source: "Reuters",
  },
  {
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147",
    source: "CNBC",
  },
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories",
    source: "MarketWatch",
  },
];

export async function GET() {
  const results: NewsHeadline[] = [];

  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).map((item, idx) => ({
          id: `${feed.source}-${idx}-${item.guid || item.link || idx}`,
          title: item.title || "Untitled",
          source: feed.source,
          url: item.link || "",
          pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
          summary: item.contentSnippet?.slice(0, 200),
          category: item.categories?.[0],
        }));
      } catch {
        return [];
      }
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  // Sort by date descending, take top 15
  results.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  return NextResponse.json(results.slice(0, 15), {
    headers: { "Cache-Control": "public, max-age=120" },
  });
}
