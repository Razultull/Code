"use client";

import GlassCard from "@/components/GlassCard";
import NewsTicker from "@/components/NewsTicker";
import TreasuryHub from "@/components/TreasuryHub";
import FXEngine from "@/components/FXEngine";
import RipplePrime from "@/components/RipplePrime";
import YieldMarketplace from "@/components/YieldMarketplace";
import { useMockMarketData } from "@/hooks/useMockMarketData";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock, Shield, BarChart3, Globe } from "lucide-react";

const stagger = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

export default function Home() {
  const { tickers, transactions } = useMockMarketData();

  // Derive a portfolio value that gently fluctuates with XRP
  const xrp = tickers[0];
  const portfolioBase = 2_847_392;
  const portfolioDelta = (xrp.price - 0.5432) * 500_000;
  const portfolioValue = portfolioBase + portfolioDelta;
  const portfolioUp = portfolioDelta >= 0;

  return (
    <div>
      {/* News Ticker — full width above the grid */}
      <NewsTicker />

      {/* Dashboard Grid */}
      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]"
      >
        {/* Widget 1: Treasury Overview - spans 2 columns */}
        <GlassCard className="col-span-2 row-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">
              Treasury Overview
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-white/20 uppercase">NAV as of: <span className="text-white/40">LIVE</span></span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Main Balance Row */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-white tabular-nums">
                ${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {portfolioUp ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-rose-400" />}
                <span className={`text-sm font-medium ${portfolioUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {portfolioUp ? "+" : ""}{((portfolioDelta / portfolioBase) * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-white/20">24H</span>
                <span className="text-white/10">|</span>
                <span className="text-xs text-emerald-400/70">+0.42%</span>
                <span className="text-[10px] text-white/20">7D</span>
                <span className="text-white/10">|</span>
                <span className="text-xs text-emerald-400/70">+1.18%</span>
                <span className="text-[10px] text-white/20">30D</span>
                <span className="text-white/10">|</span>
                <span className="text-xs text-emerald-400/70">+4.87%</span>
                <span className="text-[10px] text-white/20">YTD</span>
              </div>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[9px] text-white/25 uppercase">Accrued Interest</p>
                <p className="text-sm text-emerald-400 font-semibold tabular-nums">+$89,241</p>
              </div>
              <div>
                <p className="text-[9px] text-white/25 uppercase">Realized Gains</p>
                <p className="text-sm text-white/70 font-semibold tabular-nums">+$1,204,550</p>
              </div>
              <div>
                <p className="text-[9px] text-white/25 uppercase">WAM (Days)</p>
                <p className="text-sm text-[#0060F0] font-semibold tabular-nums">47.2</p>
              </div>
            </div>
          </div>

          {/* Allocation Strip */}
          <div className="grid grid-cols-8 gap-2 py-2.5 border-t border-b border-white/5 mb-3">
            <div>
              <p className="text-[9px] text-white/25 uppercase">Cash</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$4.2M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">T-Bills</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$18.5M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">Treasuries</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$12.8M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">MMFs</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$22.4M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">Stablecoins</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$8.6M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">Crypto</p>
              <p className="text-[11px] text-white/80 font-medium tabular-nums">$5.2M</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">Duration</p>
              <p className="text-[11px] text-amber-400/80 font-medium tabular-nums">0.38Y</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase">Avg Yield</p>
              <p className="text-[11px] text-emerald-400 font-medium tabular-nums">4.82%</p>
            </div>
          </div>

          {/* Holdings Table */}
          <div>
            <div className="grid grid-cols-9 gap-1.5 mb-1 px-1">
              <span className="text-[9px] text-white/20 uppercase col-span-2">Instrument</span>
              <span className="text-[9px] text-white/20 uppercase text-right">Face Value</span>
              <span className="text-[9px] text-white/20 uppercase text-right">Mkt Value</span>
              <span className="text-[9px] text-white/20 uppercase text-right">Yield</span>
              <span className="text-[9px] text-white/20 uppercase text-center">Maturity</span>
              <span className="text-[9px] text-white/20 uppercase text-center">Custodian</span>
              <span className="text-[9px] text-white/20 uppercase text-center">Withdraw</span>
              <span className="text-[9px] text-white/20 uppercase text-right">Rating</span>
            </div>
            {[
              { name: "30-Day T-Bill", cusip: "912797KR1", face: "$5,000,000", mkt: "$4,982,150", yield: "5.28%", maturity: "Apr 07, 2026", custodian: "J.P. Morgan", withdraw: "T+1", rating: "AAA" },
              { name: "30-Day T-Bill", cusip: "912797KS9", face: "$3,500,000", mkt: "$3,487,420", yield: "5.31%", maturity: "Apr 14, 2026", custodian: "BNY Mellon", withdraw: "T+1", rating: "AAA" },
              { name: "3-Month T-Bill", cusip: "912797LE9", face: "$4,000,000", mkt: "$3,948,200", yield: "5.22%", maturity: "Jun 05, 2026", custodian: "J.P. Morgan", withdraw: "T+1", rating: "AAA" },
              { name: "3-Month T-Bill", cusip: "912797LF6", face: "$6,000,000", mkt: "$5,921,400", yield: "5.19%", maturity: "Jun 12, 2026", custodian: "State Street", withdraw: "T+1", rating: "AAA" },
              { name: "6-Month Treasury", cusip: "912797MG3", face: "$5,000,000", mkt: "$4,872,500", yield: "5.05%", maturity: "Sep 10, 2026", custodian: "BNY Mellon", withdraw: "T+2", rating: "AAA" },
              { name: "1-Year Treasury", cusip: "91282CKP5", face: "$4,000,000", mkt: "$3,842,000", yield: "4.78%", maturity: "Mar 15, 2027", custodian: "J.P. Morgan", withdraw: "T+2", rating: "AAA" },
              { name: "2-Year Treasury", cusip: "91282CKQ3", face: "$3,800,000", mkt: "$3,684,200", yield: "4.52%", maturity: "Mar 08, 2028", custodian: "State Street", withdraw: "2 days", rating: "AAA" },
              { name: "JPM Prime MMF", cusip: "4812C2100", face: "$8,000,000", mkt: "$8,000,000", yield: "5.18%", maturity: "Open", custodian: "J.P. Morgan", withdraw: "1 hour", rating: "AAAm" },
              { name: "Fidelity Govt MMF", cusip: "316175108", face: "$7,200,000", mkt: "$7,200,000", yield: "5.02%", maturity: "Open", custodian: "Fidelity", withdraw: "1 hour", rating: "AAAm" },
              { name: "Vanguard Federal MMF", cusip: "922906300", face: "$7,200,000", mkt: "$7,200,000", yield: "5.28%", maturity: "Open", custodian: "Vanguard", withdraw: "Same day", rating: "AAAm" },
              { name: "RLUSD", cusip: "—", face: "$5,200,000", mkt: "$5,200,520", yield: "—", maturity: "—", custodian: "Ripple Custody", withdraw: "Instant", rating: "—" },
              { name: "USDC", cusip: "—", face: "$3,400,000", mkt: "$3,400,000", yield: "—", maturity: "—", custodian: "Circle / Coinbase", withdraw: "Instant", rating: "—" },
            ].map((h, i) => (
              <div key={i} className="grid grid-cols-9 gap-1.5 py-1 px-1 border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <div className="col-span-2">
                  <span className="text-[11px] text-white/70 font-medium">{h.name}</span>
                  <span className="text-[8px] text-white/15 ml-1.5 font-mono">{h.cusip}</span>
                </div>
                <span className="text-[11px] text-white/50 tabular-nums text-right">{h.face}</span>
                <span className="text-[11px] text-white/70 tabular-nums text-right font-medium">{h.mkt}</span>
                <span className="text-[11px] text-emerald-400/70 tabular-nums text-right">{h.yield}</span>
                <span className="text-[10px] text-white/35 text-center">{h.maturity}</span>
                <span className="text-[10px] text-white/40 text-center">{h.custodian}</span>
                <span className={`text-[10px] text-center font-medium ${
                  h.withdraw === "Instant" ? "text-emerald-400/70" :
                  h.withdraw === "1 hour" || h.withdraw === "Same day" ? "text-[#0060F0]/70" :
                  "text-white/40"
                }`}>{h.withdraw}</span>
                <span className={`text-[10px] text-right font-medium ${h.rating.startsWith("AAA") ? "text-emerald-400/60" : "text-white/30"}`}>{h.rating}</span>
              </div>
            ))}
          </div>

          {/* Live Market Tickers */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[9px] text-white/20 uppercase tracking-wider mb-2">Live Market Data</p>
            <div className="grid grid-cols-8 gap-2 mb-1 px-1">
              <span className="text-[8px] text-white/15 uppercase">Pair</span>
              <span className="text-[8px] text-white/15 uppercase text-right">Price</span>
              <span className="text-[8px] text-white/15 uppercase text-right">24H</span>
              <span className="text-[8px] text-white/15 uppercase text-right">Bid</span>
              <span className="text-[8px] text-white/15 uppercase text-right">Ask</span>
              <span className="text-[8px] text-white/15 uppercase text-right">High</span>
              <span className="text-[8px] text-white/15 uppercase text-right">Low</span>
              <span className="text-[8px] text-white/15 uppercase text-right">Vol</span>
            </div>
            {tickers.map((t) => {
              const dec = t.symbol.includes("BTC") || t.symbol.includes("ETH") || t.symbol.includes("SOL") ? 2 : 4;
              return (
                <div key={t.symbol} className="grid grid-cols-8 gap-2 py-1 px-1 border-t border-white/[0.02] hover:bg-white/[0.015] transition-colors">
                  <span className="text-[10px] text-white/60 font-medium">{t.symbol}</span>
                  <span className={`text-[10px] font-semibold tabular-nums text-right transition-colors duration-300 ${t.isTrendingUp ? "text-emerald-400" : "text-rose-400"}`}>{t.displayPrice}</span>
                  <span className={`text-[10px] tabular-nums text-right ${t.change24h >= 0 ? "text-emerald-400/60" : "text-rose-400/60"}`}>{t.displayChange}</span>
                  <span className="text-[10px] text-emerald-400/40 tabular-nums text-right">{t.bid.toFixed(dec)}</span>
                  <span className="text-[10px] text-rose-400/40 tabular-nums text-right">{t.ask.toFixed(dec)}</span>
                  <span className="text-[10px] text-white/25 tabular-nums text-right">{t.high24h.toFixed(dec)}</span>
                  <span className="text-[10px] text-white/25 tabular-nums text-right">{t.low24h.toFixed(dec)}</span>
                  <span className="text-[10px] text-white/25 tabular-nums text-right">{t.volume24h}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Widget 2: FX Engine - spans 1 column, 2 rows */}
        <FXEngine tickers={tickers} />

        {/* Widget 3: Treasury Hub - spans 2 columns, 2 rows */}
        <TreasuryHub />

        {/* Widget 4: Ripple Prime - spans 1 column, 2 rows */}
        <RipplePrime />

        {/* Widget 5: Yield Marketplace - spans 2 columns */}
        <YieldMarketplace />

        {/* Widget 6: Recent Activity - spans 1 column */}
        <GlassCard className="col-span-1 row-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-white/30" />
            <h2 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
              Live Activity Feed
            </h2>
          </div>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${tx.type === "Buy" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type}
                    </span>
                    <span className="text-xs text-white/70 font-medium">{tx.asset}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                      tx.status === "Settled" ? "bg-emerald-500/10 text-emerald-400" :
                      tx.status === "Pending" ? "bg-amber-500/10 text-amber-400" :
                      "bg-[#0060F0]/10 text-[#0060F0]"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">{tx.counterparty}</span>
                    <span className="text-[9px] text-white/15">{tx.txHash}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[11px] text-white/60 tabular-nums">{tx.value}</p>
                  <p className="text-[9px] text-white/20">{tx.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Widget 7: Risk & Compliance - spans 2 columns */}
        <GlassCard className="col-span-2 row-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#0060F0]" />
              <h2 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                Risk & Compliance Monitor
              </h2>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">All Systems Operational</span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-3">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] text-white/25 uppercase mb-1">VaR (95%)</p>
              <p className="text-lg text-white font-bold tabular-nums">$142,890</p>
              <p className="text-[10px] text-white/25 mt-0.5">1-Day / 95% CI</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] text-white/25 uppercase mb-1">Exposure</p>
              <p className="text-lg text-white font-bold tabular-nums">$4.82M</p>
              <p className="text-[10px] text-white/25 mt-0.5">Net Notional</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] text-white/25 uppercase mb-1">Leverage</p>
              <p className="text-lg text-amber-400 font-bold tabular-nums">1.82x</p>
              <p className="text-[10px] text-white/25 mt-0.5">Gross / NAV</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[9px] text-white/25 uppercase mb-1">Compliance</p>
              <p className="text-lg text-emerald-400 font-bold tabular-nums">98.7%</p>
              <p className="text-[10px] text-white/25 mt-0.5">Rule Adherence</p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 py-2 border-t border-white/5">
            <div>
              <p className="text-[9px] text-white/20 uppercase">Counterparty</p>
              <p className="text-[11px] text-emerald-400/80 font-medium">Low Risk</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Liquidity</p>
              <p className="text-[11px] text-emerald-400/80 font-medium">Adequate</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">AML Score</p>
              <p className="text-[11px] text-emerald-400/80 font-medium tabular-nums">94/100</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Sanctions</p>
              <p className="text-[11px] text-emerald-400/80 font-medium">Clear</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">FATF Status</p>
              <p className="text-[11px] text-[#0060F0] font-medium">Compliant</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Audit</p>
              <p className="text-[11px] text-white/50 font-medium">Feb 2026</p>
            </div>
          </div>
        </GlassCard>

        {/* Widget 8: Network Status - spans 1 column */}
        <GlassCard className="col-span-1 row-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-[#0060F0]" />
            <h2 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
              Network & Infrastructure
            </h2>
          </div>

          <div className="space-y-2">
            {[
              { name: "XRPL Mainnet", latency: "12ms", tps: "1,842", status: "Operational" },
              { name: "Ripple ODL", latency: "3.2s", tps: "342", status: "Operational" },
              { name: "Custody Vault", latency: "45ms", tps: "—", status: "Operational" },
              { name: "FX Gateway", latency: "8ms", tps: "12,450", status: "Operational" },
              { name: "Prime Engine", latency: "<1ms", tps: "84,200", status: "Operational" },
            ].map((node) => (
              <div key={node.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-white/60">{node.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-white/25">{node.tps} TPS</span>
                  <span className="text-[10px] text-emerald-400/60 tabular-nums">{node.latency}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
            <div>
              <p className="text-[9px] text-white/20 uppercase">Uptime</p>
              <p className="text-xs text-emerald-400 font-bold tabular-nums">99.997%</p>
            </div>
            <div>
              <p className="text-[9px] text-white/20 uppercase">Validators</p>
              <p className="text-xs text-white/60 font-bold tabular-nums">150+</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
