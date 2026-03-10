"use client";

import { motion } from "framer-motion";
import { Radio } from "lucide-react";

const HEADLINES = [
  { tag: "REGULATORY", text: "Ripple secures Money Transmitter License in all 50 U.S. states, expanding domestic payment operations" },
  { tag: "RLUSD", text: "RLUSD stablecoin surpasses $4.2B in total value locked as institutional adoption accelerates — 340+ enterprise integrations" },
  { tag: "SEC", text: "SEC finalizes framework for digital asset custody, clearing path for bank-held crypto assets under qualified custodian rules" },
  { tag: "ODL", text: "J.P. Morgan integrates Ripple's ODL corridor for real-time USD/EUR settlement — $2.1B processed in first week" },
  { tag: "FED", text: "Federal Reserve signals openness to tokenized T-bills on distributed ledger platforms — pilot program Q3 2026" },
  { tag: "MARKETS", text: "XRP daily volume surges past $1.8B as Ripple Prime onboards 12 new institutional market makers" },
  { tag: "CBDC", text: "Bank of England selects Ripple technology for digital pound pilot — cross-border settlement trials begin April 2026" },
  { tag: "DEFI", text: "Ripple-backed AMM on XRPL surpasses $890M TVL — institutional DeFi adoption reaches new milestone" },
  { tag: "CUSTODY", text: "Standard Chartered and Ripple Custody announce joint venture for Asian digital asset prime brokerage services" },
  { tag: "COMPLIANCE", text: "FATF releases updated Travel Rule guidance — Ripple's compliance suite achieves full VASP certification across 45 jurisdictions" },
  { tag: "PAYMENTS", text: "MoneyGram reports 340% YoY increase in ODL-powered corridors — Latin America and Southeast Asia lead growth" },
  { tag: "IPO", text: "Ripple files preliminary S-1 with SEC — valuation targets $15B based on payment network revenue and XRP treasury holdings" },
];

function tagColor(tag: string): string {
  switch (tag) {
    case "REGULATORY": return "text-amber-400";
    case "RLUSD": return "text-[#0060F0]";
    case "SEC": return "text-rose-400";
    case "ODL": return "text-emerald-400";
    case "FED": return "text-violet-400";
    case "MARKETS": return "text-cyan-400";
    case "CBDC": return "text-orange-400";
    case "DEFI": return "text-pink-400";
    case "CUSTODY": return "text-teal-400";
    case "COMPLIANCE": return "text-yellow-400";
    case "PAYMENTS": return "text-lime-400";
    case "IPO": return "text-red-400";
    default: return "text-white/50";
  }
}

function TickerContent() {
  return (
    <>
      {HEADLINES.map((headline, i) => (
        <span key={i} className="inline-flex items-center gap-3 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0060F0] shrink-0" />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${tagColor(headline.tag)}`}>
            {headline.tag}
          </span>
          <span className="text-xs text-white/50">{headline.text}</span>
          <span className="text-white/10 mx-4">|</span>
        </span>
      ))}
    </>
  );
}

export default function NewsTicker() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative w-full overflow-hidden py-2.5 mb-5 rounded-xl bg-white/[0.03] border border-white/5"
    >
      {/* Label */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-1.5 pl-3 pr-6 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19] to-transparent">
        <Radio size={12} className="text-[#0060F0] animate-pulse" />
        <span className="text-[10px] font-medium text-[#0060F0] uppercase tracking-wider">
          Live
        </span>
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-[#0B0F19] to-transparent" />

      {/* Scrolling track */}
      <div className="flex animate-marquee pl-20">
        <div className="flex shrink-0">
          <TickerContent />
        </div>
        <div className="flex shrink-0">
          <TickerContent />
        </div>
      </div>
    </motion.div>
  );
}
