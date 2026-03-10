"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Activity, Zap } from "lucide-react";
import GlassCard from "./GlassCard";

const VENUES = ["Aggregated Liquidity", "Binance", "Coinbase", "Internal OTC", "Kraken", "Bitstamp"];

interface OrderLevel {
  price: number;
  size: number;
  total: number;
  orders: number;
}

function generateLevels(basePrice: number, side: "bid" | "ask", count: number): OrderLevel[] {
  const levels: OrderLevel[] = [];
  let cumulative = 0;
  for (let i = 0; i < count; i++) {
    const offset = (i + 1) * (0.0001 + Math.random() * 0.0003);
    const price = side === "bid" ? basePrice - offset : basePrice + offset;
    const size = Math.round(5000 + Math.random() * 95000);
    cumulative += size;
    levels.push({ price, size, total: cumulative, orders: Math.round(2 + Math.random() * 12) });
  }
  return levels;
}

function fluctuateLevels(levels: OrderLevel[]): OrderLevel[] {
  let cumulative = 0;
  return levels.map((level) => {
    const priceDrift = (Math.random() - 0.5) * 0.0002;
    const sizeDrift = Math.round((Math.random() - 0.4) * 5000);
    const newSize = Math.max(1000, level.size + sizeDrift);
    cumulative += newSize;
    return {
      price: level.price + priceDrift,
      size: newSize,
      total: cumulative,
      orders: Math.max(1, level.orders + Math.round((Math.random() - 0.5) * 3)),
    };
  });
}

export default function RipplePrime() {
  const DEPTH = 8;
  const [venue, setVenue] = useState(VENUES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const basePrice = 0.5432;

  const [bids, setBids] = useState<OrderLevel[]>(() => generateLevels(basePrice, "bid", DEPTH));
  const [asks, setAsks] = useState<OrderLevel[]>(() => generateLevels(basePrice, "ask", DEPTH));
  const [tradeCount, setTradeCount] = useState(84_231);

  const tick = useCallback(() => {
    setBids((prev) => fluctuateLevels(prev));
    setAsks((prev) => fluctuateLevels(prev));
    setTradeCount((prev) => prev + Math.round(Math.random() * 5));
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, 350);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    setBids(generateLevels(basePrice, "bid", DEPTH));
    setAsks(generateLevels(basePrice, "ask", DEPTH));
  }, [venue]);

  const maxTotal = Math.max(bids[bids.length - 1]?.total ?? 1, asks[asks.length - 1]?.total ?? 1);
  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : 0;
  const midPrice = bids[0] && asks[0] ? (bids[0].price + asks[0].price) / 2 : basePrice;
  const bidVol = bids.reduce((s, l) => s + l.size, 0);
  const askVol = asks.reduce((s, l) => s + l.size, 0);
  const imbalance = ((bidVol - askVol) / (bidVol + askVol) * 100);

  return (
    <GlassCard className="col-span-1 row-span-2 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0060F0]/15 flex items-center justify-center">
            <Activity size={16} className="text-[#0060F0]" />
          </div>
          <div>
            <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider">Ripple Prime</h2>
            <p className="text-[9px] text-white/25">XRP/USD | Depth of Market</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Zap size={10} className="text-emerald-400" />
          <span className="text-[9px] text-emerald-400/60">Connected</span>
        </div>
      </div>

      {/* Venue Dropdown */}
      <div className="relative mb-3">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors"
        >
          <span>{venue}</span>
          <ChevronDown size={12} className={`text-white/40 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-[#141926] border border-white/10 shadow-xl shadow-black/40 overflow-hidden z-50"
            >
              {VENUES.map((v) => (
                <button
                  key={v}
                  onClick={() => { setVenue(v); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${v === venue ? "bg-[#0060F0]/10 text-[#0060F0]" : "text-white/60 hover:bg-white/5"}`}
                >
                  {v}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mid Price Banner */}
      <div className="flex items-center justify-center gap-3 py-1.5 mb-2 rounded-lg bg-white/[0.03] border border-white/[0.03]">
        <span className="text-[9px] text-white/25 uppercase">Mid</span>
        <span className="text-sm text-white font-bold tabular-nums">{midPrice.toFixed(4)}</span>
        <span className="text-[9px] text-white/15">|</span>
        <span className="text-[9px] text-white/25">Spread</span>
        <span className="text-[10px] text-white/50 tabular-nums">{spread.toFixed(5)}</span>
        <span className="text-[9px] text-white/20">({((spread / basePrice) * 100).toFixed(3)}%)</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-2 gap-2 mb-1">
        <div className="flex justify-between text-[8px] text-white/20 px-1">
          <span>#</span>
          <span>Size</span>
          <span>Bid</span>
        </div>
        <div className="flex justify-between text-[8px] text-white/20 px-1">
          <span>Ask</span>
          <span>Size</span>
          <span>#</span>
        </div>
      </div>

      {/* Order Book */}
      <div className="flex-1 grid grid-cols-2 gap-2 mb-3">
        {/* Bids */}
        <div className="flex flex-col gap-px">
          {bids.map((level, i) => {
            const depthPct = (level.total / maxTotal) * 100;
            return (
              <div key={i} className="relative flex justify-between items-center px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                <div className="absolute inset-0 rounded bg-emerald-500/8" style={{ width: `${depthPct}%` }} />
                <span className="relative text-white/20 w-4">{level.orders}</span>
                <span className="relative text-white/40">{(level.size / 1000).toFixed(1)}k</span>
                <span className="relative text-emerald-400 font-medium">{level.price.toFixed(4)}</span>
              </div>
            );
          })}
        </div>

        {/* Asks */}
        <div className="flex flex-col gap-px">
          {asks.map((level, i) => {
            const depthPct = (level.total / maxTotal) * 100;
            return (
              <div key={i} className="relative flex justify-between items-center px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                <div className="absolute inset-0 rounded bg-rose-500/8 ml-auto" style={{ width: `${depthPct}%` }} />
                <span className="relative text-rose-400 font-medium">{level.price.toFixed(4)}</span>
                <span className="relative text-white/40">{(level.size / 1000).toFixed(1)}k</span>
                <span className="relative text-white/20 w-4 text-right">{level.orders}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-4 gap-1.5 py-2 border-t border-white/5 mb-2">
        <div className="text-center">
          <p className="text-[8px] text-white/20 uppercase">Bid Vol</p>
          <p className="text-[10px] text-emerald-400/80 tabular-nums font-medium">{(bidVol / 1000).toFixed(0)}k</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-white/20 uppercase">Ask Vol</p>
          <p className="text-[10px] text-rose-400/80 tabular-nums font-medium">{(askVol / 1000).toFixed(0)}k</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-white/20 uppercase">Imbalance</p>
          <p className={`text-[10px] tabular-nums font-medium ${imbalance >= 0 ? "text-emerald-400/60" : "text-rose-400/60"}`}>
            {imbalance >= 0 ? "+" : ""}{imbalance.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-white/20 uppercase">Trades</p>
          <p className="text-[10px] text-white/50 tabular-nums font-medium">{tradeCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Market Microstructure */}
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-white/5">
        <div className="text-center">
          <p className="text-[8px] text-white/15 uppercase">VWAP</p>
          <p className="text-[10px] text-white/50 tabular-nums">{(midPrice * (1 + (Math.random() - 0.5) * 0.001)).toFixed(4)}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-white/15 uppercase">TWAP</p>
          <p className="text-[10px] text-white/50 tabular-nums">{(midPrice * (1 + (Math.random() - 0.5) * 0.0005)).toFixed(4)}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-white/15 uppercase">Venues</p>
          <p className="text-[10px] text-[#0060F0] tabular-nums">6 Active</p>
        </div>
      </div>
    </GlassCard>
  );
}
