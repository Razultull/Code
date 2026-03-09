"use client";

import { useNewsData } from "@/hooks/useNewsData";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { MNIArticle } from "@/types/news";

const sentimentConfig = {
  bullish: { icon: "\u25B2", color: "text-[#22C55E]", bg: "bg-[#22C55E]/10" },
  bearish: { icon: "\u25BC", color: "text-[#EF4444]", bg: "bg-[#EF4444]/10" },
  neutral: { icon: "\u2500", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10" },
};

const assetColors: Record<string, string> = {
  FX: "ring-cyan-500/40 text-cyan-400",
  Rates: "ring-purple-500/40 text-purple-400",
  Equities: "ring-emerald-500/40 text-emerald-400",
  Commodities: "ring-amber-500/40 text-amber-400",
  Credit: "ring-rose-500/40 text-rose-400",
  EM: "ring-orange-500/40 text-orange-400",
};

const regionColors: Record<string, string> = {
  US: "text-[#0060F0]",
  Europe: "text-purple-400",
  Asia: "text-amber-400",
  UK: "text-emerald-400",
  Canada: "text-rose-400",
  EM: "text-orange-400",
};

const sectionConfig: Record<string, { label: string; color: string }> = {
  FX: { label: "FX", color: "bg-cyan-500/15 text-cyan-400" },
  Rates: { label: "FI", color: "bg-purple-500/15 text-purple-400" },
};

function latencyColor(ms: number | null): string {
  if (ms === null) return "text-[#4A4E5F]";
  if (ms < 5000) return "text-[#22C55E]";
  if (ms < 30000) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ─── Body Text Popup ────────────────────────────────────────────────────── */

function BodyPopup({
  article,
  x,
  y,
  onMouseEnterPopup,
  onMouseLeavePopup,
}: {
  article: MNIArticle;
  x: number;
  y: number;
  onMouseEnterPopup: () => void;
  onMouseLeavePopup: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x + 14, top: y + 14 });

  useEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 16;
    let left = x + 14;
    let top = y + 14;
    if (left + rect.width + pad > vw) left = Math.max(pad, x - rect.width - 14);
    if (top + rect.height + pad > vh) top = Math.max(pad, vh - rect.height - pad);
    setPos({ left, top });
  }, [x, y]);

  const metaParts: string[] = [];
  if (article.ts) metaParts.push(new Date(article.ts).toLocaleString());
  if (article.byline) metaParts.push(article.byline);
  if (article.section) metaParts.push(article.section === "FX" ? "FX Bullets" : article.section === "Rates" ? "FI Bullets" : article.section);
  if (article.bulletCode) metaParts.push(article.bulletCode);

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] max-w-[560px] min-w-[320px] max-h-[420px] rounded-[10px] overflow-hidden"
      style={{
        left: pos.left,
        top: pos.top,
        background: "linear-gradient(165deg, #1a2236 0%, #141c2e 100%)",
        border: "1px solid rgba(59,130,246,0.3)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(59,130,246,0.4)",
        animation: "popupFadeIn 0.2s ease",
        pointerEvents: "auto",
      }}
      onMouseEnter={onMouseEnterPopup}
      onMouseLeave={onMouseLeavePopup}
    >
      {/* Header */}
      <div className="px-[18px] pt-[14px] pb-[10px] border-b border-white/[0.06] bg-white/[0.02]">
        <div className="text-[13px] font-bold text-[#e2e8f0] leading-[1.45] mb-1.5">
          {article.headline}
        </div>
        <div className="flex gap-3 text-[10px] text-[#4A4E5F] uppercase tracking-[0.5px]">
          {metaParts.join("  \u00B7  ")}
        </div>
      </div>
      {/* Body — scrollable */}
      <div
        className="body-popup-content px-[18px] py-[14px] overflow-y-auto max-h-[310px] text-[13.5px] leading-[1.7] text-[#c8d0dc] whitespace-pre-wrap break-words"
        style={{ fontFamily: '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        {article.body && article.body.trim() ? (
          article.body
        ) : (
          <span className="text-[#4A4E5F] italic text-[12px]">No body text available</span>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Main Widget ────────────────────────────────────────────────────────── */

export default function NewsWidget() {
  const { articles, newIds } = useNewsData();
  const [hoveredArticle, setHoveredArticle] = useState<MNIArticle | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverPopupRef = useRef(false);

  const handleMouseEnter = useCallback((article: MNIArticle, e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredArticle(article);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Delay hiding to allow mouse to move from feed item to the popup
    setTimeout(() => {
      if (!isOverPopupRef.current) {
        setHoveredArticle(null);
      }
    }, 100);
  }, []);

  const handlePopupMouseEnter = useCallback(() => {
    isOverPopupRef.current = true;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  const handlePopupMouseLeave = useCallback(() => {
    isOverPopupRef.current = false;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredArticle(null);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#4A4E5F] text-[11px]">
        <div className="text-center">
          <div className="text-lg mb-1">Connecting to MNI...</div>
          <div className="text-[9px]">Authenticating and loading live market news feed</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-px">
        {articles.map((item) => {
          const ageMs = Date.now() - new Date(item.ts).getTime();
          const ageMin = ageMs / 60_000;
          const isLive = ageMin < 15;
          const isVeryNew = ageMin < 5;
          const isNew = newIds.has(item.id);
          const sent = sentimentConfig[item.sentiment];
          const sec = sectionConfig[item.section];

          return (
            <div
              key={item.id}
              className={`flex gap-1.5 p-1.5 rounded transition-colors widget-accent-hover border-l-2 border-r-2 ${
                item.sentiment === "bullish"
                  ? "border-l-[#22C55E] border-r-[#22C55E]/30"
                  : item.sentiment === "bearish"
                  ? "border-l-[#EF4444] border-r-[#EF4444]/30"
                  : "border-l-[#F59E0B]/50 border-r-[#F59E0B]/15"
              } ${isNew || isVeryNew ? "shimmer-border border" : ""}`}
              onMouseEnter={(e) => handleMouseEnter(item, e)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Sentiment + live indicator column */}
              <div className="shrink-0 w-5 flex flex-col items-center gap-1 pt-0.5">
                <span className={`text-[10px] font-bold ${sent.color}`}>
                  {sent.icon}
                </span>
                {isLive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] red-pulse shadow-[0_0_3px_#EF4444]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Headline */}
                <p className="text-[11px] font-medium text-[#F1F3F5] leading-snug line-clamp-2">
                  {item.headline}
                </p>

                {/* Body snippet */}
                {item.body && (
                  <p className="text-[9px] text-[#4A4E5F] line-clamp-1 mt-0.5">
                    {item.body}
                  </p>
                )}

                {/* Meta row: section, time, byline, latency */}
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {sec && (
                    <span className={`text-[7px] font-bold uppercase tracking-wider px-1 py-px rounded ${sec.color}`}>
                      {sec.label}
                    </span>
                  )}
                  {item.bulletCode && (
                    <span className="text-[7px] font-mono px-1 py-px rounded bg-[#F59E0B]/10 text-[#F59E0B] uppercase">
                      {item.bulletCode}
                    </span>
                  )}
                  <span className="text-[9px] font-mono tabular-nums text-[#4A4E5F]">
                    {formatDistanceToNow(new Date(item.ts), { addSuffix: true })}
                  </span>
                  {item.byline && (
                    <span className="text-[8px] text-[#4A4E5F] truncate max-w-[80px]">
                      {item.byline}
                    </span>
                  )}
                  {item.latencyMs !== null && (
                    <span className={`text-[8px] font-mono ${latencyColor(item.latencyMs)}`}>
                      {formatLatency(item.latencyMs)}
                    </span>
                  )}
                </div>

                {/* Tags row: assets + regions */}
                {(item.assets.length > 0 || item.regions.length > 0) && (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {item.assets.map((a) => (
                      <span
                        key={a}
                        className={`text-[7px] font-semibold uppercase tracking-wider px-1 py-px rounded ring-1 ${
                          assetColors[a] || "ring-[#4A4E5F]/40 text-[#8B8FA3]"
                        }`}
                      >
                        {a}
                      </span>
                    ))}
                    {item.regions.map((r) => (
                      <span
                        key={r}
                        className={`text-[7px] font-mono ${regionColors[r] || "text-[#4A4E5F]"}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sentiment score */}
              <div className="shrink-0 flex flex-col items-end pt-0.5">
                <span className={`text-[9px] font-mono tabular-nums font-bold ${sent.color}`}>
                  {item.score > 0 ? "+" : ""}{item.score.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover popup (rendered via portal to escape scroll containers) */}
      {hoveredArticle && (
        <BodyPopup
          article={hoveredArticle}
          x={mousePos.x}
          y={mousePos.y}
          onMouseEnterPopup={handlePopupMouseEnter}
          onMouseLeavePopup={handlePopupMouseLeave}
        />
      )}
    </>
  );
}
