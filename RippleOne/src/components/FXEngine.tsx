"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, Zap, DollarSign, Shield, ChevronDown, Landmark } from "lucide-react";
import GlassCard from "./GlassCard";
import type { MarketTicker } from "@/hooks/useMockMarketData";

const SEND_CURRENCIES = ["USD", "GBP", "JPY", "SGD", "AUD", "CHF", "CAD", "HKD"];
const RECEIVE_CURRENCIES = ["EUR", "MXN", "PHP", "BRL", "INR", "THB", "KRW", "ZAR"];

const SOURCE_ACCOUNTS = [
  { name: "J.P. Morgan (Nostro)", bal: "$12.45M" },
  { name: "Standard Chartered", bal: "$8.72M" },
  { name: "Ripple Custody", bal: "$34.18M" },
  { name: "DBS Bank (SGD)", bal: "$5.34M" },
];

type RouteMode = "odl" | "rlusd" | "swift";

const CORRIDORS = [
  { route: "RLUSD → EUR", vol24h: "$2.8B", avg: "0.9s", asset: "RLUSD", yield: "+0.014%" },
  { route: "RLUSD → MXN", vol24h: "$1.4B", avg: "0.6s", asset: "RLUSD", yield: "+0.018%" },
  { route: "RLUSD → PHP", vol24h: "$920M", avg: "1.1s", asset: "RLUSD", yield: "+0.021%" },
  { route: "RLUSD → BRL", vol24h: "$680M", avg: "1.3s", asset: "RLUSD", yield: "+0.016%" },
  { route: "RLUSD → INR", vol24h: "$540M", avg: "1.5s", asset: "RLUSD", yield: "+0.012%" },
  { route: "USD → EUR (ODL)", vol24h: "$4.2B", avg: "1.2s", asset: "XRP", yield: "—" },
  { route: "USD → MXN (ODL)", vol24h: "$1.8B", avg: "0.8s", asset: "XRP", yield: "—" },
  { route: "GBP → INR (ODL)", vol24h: "$620M", avg: "2.1s", asset: "XRP", yield: "—" },
];

const FWD_TENORS = ["1W", "2W", "1M", "2M", "3M", "6M", "1Y"];

interface FXEngineProps {
  tickers: MarketTicker[];
}

export default function FXEngine({ tickers }: FXEngineProps) {
  const [sendCurrency, setSendCurrency] = useState("USD");
  const [receiveCurrency, setReceiveCurrency] = useState("EUR");
  const [sendAmount, setSendAmount] = useState("100000");
  const [routeMode, setRouteMode] = useState<RouteMode>("rlusd");
  const [sourceAccount, setSourceAccount] = useState(SOURCE_ACCOUNTS[0].name);
  const [hedgeTenor, setHedgeTenor] = useState("1M");
  const [hedgeAmount, setHedgeAmount] = useState("50");

  const eurUsdTicker = tickers.find((t) => t.symbol === "EUR/USD");
  const rate = eurUsdTicker?.price ?? 1.0847;
  const rateUp = eurUsdTicker?.isTrendingUp ?? true;

  const receiveAmount = useMemo(() => {
    const parsed = parseFloat(sendAmount.replace(/,/g, "")) || 0;
    return (parsed / rate).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [sendAmount, rate]);

  const parsed = parseFloat(sendAmount.replace(/,/g, "")) || 0;
  const feeRate = routeMode === "swift" ? 0.00045 : routeMode === "odl" ? 0.00012 : 0.00008;
  const fee = parsed * feeRate;
  const rlusdYield = routeMode === "rlusd" ? parsed * 0.00014 : 0;

  const filteredCorridors = CORRIDORS.filter((c) =>
    routeMode === "rlusd" ? c.asset === "RLUSD" : c.asset === "XRP"
  );

  // Forward points simulation
  const fwdPoints: Record<string, number> = {
    "1W": -2.1, "2W": -4.3, "1M": -8.8, "2M": -17.2, "3M": -25.5, "6M": -48.1, "1Y": -92.4,
  };
  const fwdRate = rate + (fwdPoints[hedgeTenor] ?? 0) / 10000;
  const hedgePct = parseInt(hedgeAmount) || 0;
  const hedgeNotional = parsed * (hedgePct / 100);

  return (
    <GlassCard className="col-span-1 row-span-2 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0060F0]/15 flex items-center justify-center">
            <ArrowDownUp size={14} className="text-[#0060F0]" />
          </div>
          <div>
            <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider">FX Engine</h2>
            <p className="text-[9px] text-white/25">Cross-Border Payments</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-white/20 uppercase">24H Vol</p>
          <p className="text-[10px] text-white/50 font-medium tabular-nums">$12.4B</p>
        </div>
      </div>

      {/* Source Account */}
      <div className="mb-2">
        <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Source Account</label>
        <select
          value={sourceAccount}
          onChange={(e) => setSourceAccount(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70 appearance-none focus:outline-none focus:border-[#0060F0]/50 cursor-pointer"
        >
          {SOURCE_ACCOUNTS.map((a) => (
            <option key={a.name} value={a.name} className="bg-[#141926] text-white">
              {a.name} — {a.bal}
            </option>
          ))}
        </select>
      </div>

      {/* You Send */}
      <div className="mb-1">
        <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">You Send</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs tabular-nums placeholder:text-white/20 focus:outline-none focus:border-[#0060F0]/50 transition-colors"
          />
          <select
            value={sendCurrency}
            onChange={(e) => setSendCurrency(e.target.value)}
            className="w-16 px-1.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs appearance-none text-center focus:outline-none cursor-pointer"
          >
            {SEND_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-[#141926] text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Rate Pill */}
      <div className="flex items-center justify-center gap-2 py-1.5">
        <div className="h-px flex-1 bg-white/5" />
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-[8px] text-white/25">MID</span>
          <span className={`text-[11px] font-semibold tabular-nums transition-colors duration-300 ${rateUp ? "text-emerald-400" : "text-rose-400"}`}>
            {rate.toFixed(4)}
          </span>
          <span className="text-[8px] text-white/10">|</span>
          <span className="text-[8px] text-emerald-400/40 tabular-nums">{eurUsdTicker?.bid.toFixed(4)}</span>
          <span className="text-[8px] text-rose-400/40 tabular-nums">{eurUsdTicker?.ask.toFixed(4)}</span>
        </div>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Recipient Gets */}
      <div className="mb-2">
        <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Recipient Gets</label>
        <div className="flex gap-1.5">
          <div className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-white/80 text-xs tabular-nums">
            {receiveAmount}
          </div>
          <select
            value={receiveCurrency}
            onChange={(e) => setReceiveCurrency(e.target.value)}
            className="w-16 px-1.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs appearance-none text-center focus:outline-none cursor-pointer"
          >
            {RECEIVE_CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-[#141926] text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Route Selector */}
      <div className="mb-2">
        <label className="block text-[9px] text-white/25 uppercase tracking-wider mb-1">Payment Route</label>
        <div className="grid grid-cols-3 gap-1">
          {([
            { mode: "rlusd" as RouteMode, label: "RLUSD", sub: "Yield-generating" },
            { mode: "odl" as RouteMode, label: "ODL (XRP)", sub: "Fastest" },
            { mode: "swift" as RouteMode, label: "SWIFT", sub: "Traditional" },
          ]).map((r) => (
            <button
              key={r.mode}
              onClick={() => setRouteMode(r.mode)}
              className={`px-2 py-1.5 rounded-lg text-center transition-all border ${
                routeMode === r.mode
                  ? "bg-[#0060F0]/15 border-[#0060F0]/30 text-[#0060F0]"
                  : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-[10px] font-medium">{r.label}</p>
              <p className="text-[7px] text-white/20">{r.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* RLUSD Yield Info */}
      {routeMode === "rlusd" && (
        <div className="mb-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign size={10} className="text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-medium uppercase">RLUSD Yield Advantage</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[8px] text-white/20">In-flight Yield</p>
              <p className="text-[10px] text-emerald-400 font-semibold tabular-nums">+${rlusdYield.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[8px] text-white/20">Annualized</p>
              <p className="text-[10px] text-emerald-400 font-semibold tabular-nums">+5.12% APY</p>
            </div>
            <div>
              <p className="text-[8px] text-white/20">RLUSD Peg</p>
              <p className="text-[10px] text-white/50 tabular-nums">$1.0001</p>
            </div>
            <div>
              <p className="text-[8px] text-white/20">Backing</p>
              <p className="text-[10px] text-white/50">T-Bills + Cash</p>
            </div>
          </div>
          <p className="text-[8px] text-white/20 mt-1.5 leading-relaxed">
            RLUSD earns yield while in transit. Funds convert USD → RLUSD at origin, settle cross-border, then convert to local currency at destination. Net yield accrues to sender.
          </p>
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="space-y-1 mb-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Fee ({(feeRate * 100).toFixed(3)}%)</span>
          <span className="text-white/50 tabular-nums">${fee.toFixed(2)}</span>
        </div>
        {routeMode === "rlusd" && (
          <div className="flex justify-between text-[9px]">
            <span className="text-emerald-400/40">RLUSD Yield Offset</span>
            <span className="text-emerald-400/70 tabular-nums">-${rlusdYield.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Net Cost</span>
          <span className="text-white/70 font-medium tabular-nums">
            ${Math.max(0, fee - rlusdYield).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Settlement</span>
          <span className={`font-medium ${routeMode !== "swift" ? "text-emerald-400" : "text-white/50"}`}>
            {routeMode === "rlusd" ? "~2 seconds" : routeMode === "odl" ? "~3 seconds" : "1-2 business days"}
          </span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Corridor</span>
          <span className="text-white/50">{sendCurrency} → {routeMode === "rlusd" ? "RLUSD →" : routeMode === "odl" ? "XRP →" : ""} {receiveCurrency}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Cut-off</span>
          <span className="text-white/40">{routeMode !== "swift" ? "24/7/365" : "17:00 EST"}</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-white/25">Value Date</span>
          <span className="text-white/40">{routeMode !== "swift" ? "T+0 (Same day)" : "T+2"}</span>
        </div>
      </div>

      {/* Corridors */}
      <div className="mb-2">
        <p className="text-[8px] text-white/20 uppercase tracking-wider mb-1">
          {routeMode === "rlusd" ? "RLUSD Corridors (24H)" : "ODL Corridors (24H)"}
        </p>
        <div className="space-y-0.5">
          {filteredCorridors.map((c) => (
            <div key={c.route} className="flex items-center justify-between text-[9px]">
              <span className="text-white/40">{c.route}</span>
              <div className="flex gap-2">
                {c.yield !== "—" && <span className="text-emerald-400/50 tabular-nums">{c.yield}</span>}
                <span className="text-white/20 tabular-nums">{c.vol24h}</span>
                <span className="text-emerald-400/40 tabular-nums w-7 text-right">{c.avg}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FX Hedge Sub-Widget */}
      <div className="mb-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.03]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Shield size={10} className="text-amber-400/60" />
          <span className="text-[9px] text-white/35 font-medium uppercase tracking-wider">OTC FX Forward Hedge</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <div>
            <label className="block text-[8px] text-white/20 mb-0.5">Tenor</label>
            <select
              value={hedgeTenor}
              onChange={(e) => setHedgeTenor(e.target.value)}
              className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/60 appearance-none focus:outline-none cursor-pointer"
            >
              {FWD_TENORS.map((t) => (
                <option key={t} value={t} className="bg-[#141926] text-white">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[8px] text-white/20 mb-0.5">Hedge %</label>
            <select
              value={hedgeAmount}
              onChange={(e) => setHedgeAmount(e.target.value)}
              className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/60 appearance-none focus:outline-none cursor-pointer"
            >
              {["0", "25", "50", "75", "100"].map((p) => (
                <option key={p} value={p} className="bg-[#141926] text-white">{p}%</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">Forward Rate ({hedgeTenor})</span>
            <span className="text-white/50 tabular-nums">{fwdRate.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">Fwd Points</span>
            <span className={`tabular-nums ${(fwdPoints[hedgeTenor] ?? 0) < 0 ? "text-rose-400/50" : "text-emerald-400/50"}`}>
              {fwdPoints[hedgeTenor]}
            </span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">Hedge Notional</span>
            <span className="text-white/50 tabular-nums">
              ${hedgeNotional.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">Locked Recv Amt</span>
            <span className="text-white/60 font-medium tabular-nums">
              {receiveCurrency} {(hedgeNotional / fwdRate).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">Counterparty</span>
            <span className="text-white/40">Ripple OTC Desk</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-white/20">ISDA</span>
            <span className="text-emerald-400/50">Active</span>
          </div>
        </div>
      </div>

      {/* Send Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white text-xs font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow mt-auto"
      >
        Send {routeMode === "rlusd" ? "via RLUSD" : routeMode === "odl" ? "via ODL" : "via SWIFT"} {hedgePct > 0 ? `+ ${hedgePct}% Hedge` : ""}
      </motion.button>
    </GlassCard>
  );
}
