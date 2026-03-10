"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Percent, Lock, Check, ShieldCheck, Clock, Users, TrendingUp } from "lucide-react";
import GlassCard from "./GlassCard";

interface YieldOpportunity {
  id: string;
  name: string;
  protocol: string;
  apy: string;
  apyValue: number;
  risk: string;
  tvl: string;
  maxAllocation: number;
  lockup: string;
  minStake: string;
  participants: string;
  chain: string;
  auditor: string;
  utilization: number;
  weeklyChange: string;
  weeklyUp: boolean;
}

const OPPORTUNITIES: YieldOpportunity[] = [
  {
    id: "xrp-stake",
    name: "Stake XRP",
    protocol: "XRPL Native",
    apy: "4.2% APY",
    apyValue: 4.2,
    risk: "Low",
    tvl: "$842M",
    maxAllocation: 500_000,
    lockup: "28 days",
    minStake: "$10,000",
    participants: "12,450",
    chain: "XRPL",
    auditor: "Halborn",
    utilization: 78,
    weeklyChange: "+0.3%",
    weeklyUp: true,
  },
  {
    id: "rlusd-lp",
    name: "RLUSD Liquidity",
    protocol: "Ripple AMM",
    apy: "5.5% APY",
    apyValue: 5.5,
    risk: "Medium",
    tvl: "$324M",
    maxAllocation: 250_000,
    lockup: "14 days",
    minStake: "$25,000",
    participants: "3,842",
    chain: "XRPL",
    auditor: "Trail of Bits",
    utilization: 92,
    weeklyChange: "+1.2%",
    weeklyUp: true,
  },
  {
    id: "tbills",
    name: "Treasury Bills",
    protocol: "Ondo Finance",
    apy: "4.8% APY",
    apyValue: 4.8,
    risk: "Very Low",
    tvl: "$1.2B",
    maxAllocation: 1_000_000,
    lockup: "90 days",
    minStake: "$100,000",
    participants: "842",
    chain: "Ethereum",
    auditor: "OpenZeppelin",
    utilization: 65,
    weeklyChange: "-0.1%",
    weeklyUp: false,
  },
  {
    id: "eth-lsd",
    name: "ETH Liquid Staking",
    protocol: "Lido",
    apy: "3.8% APY",
    apyValue: 3.8,
    risk: "Low",
    tvl: "$14.2B",
    maxAllocation: 750_000,
    lockup: "Flexible",
    minStake: "$1,000",
    participants: "284,000",
    chain: "Ethereum",
    auditor: "Sigma Prime",
    utilization: 88,
    weeklyChange: "+0.1%",
    weeklyUp: true,
  },
  {
    id: "sol-stake",
    name: "SOL Validator",
    protocol: "Marinade",
    apy: "6.8% APY",
    apyValue: 6.8,
    risk: "Medium",
    tvl: "$1.8B",
    maxAllocation: 400_000,
    lockup: "Epoch (~2d)",
    minStake: "$5,000",
    participants: "45,200",
    chain: "Solana",
    auditor: "Neodyme",
    utilization: 95,
    weeklyChange: "+0.8%",
    weeklyUp: true,
  },
];

function riskColor(risk: string) {
  switch (risk) {
    case "Very Low": return "text-[#0060F0]";
    case "Low": return "text-emerald-400";
    case "Medium": return "text-amber-400";
    default: return "text-white/50";
  }
}

function utilizationColor(pct: number) {
  if (pct >= 90) return "bg-amber-400";
  if (pct >= 70) return "bg-emerald-400";
  return "bg-[#0060F0]";
}

export default function YieldMarketplace() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  function handleToggle(id: string) { setExpandedId(expandedId === id ? null : id); }
  function getAllocation(id: string, max: number) { return allocations[id] ?? Math.round(max * 0.3); }
  function handleApprove(id: string) {
    setApproved((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => { setApproved((prev) => ({ ...prev, [id]: false })); setExpandedId(null); }, 2000);
  }

  const totalTvl = "$18.4B";
  const avgApy = (OPPORTUNITIES.reduce((s, o) => s + o.apyValue, 0) / OPPORTUNITIES.length).toFixed(1);

  return (
    <GlassCard className="col-span-2 row-span-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0060F0]/15 flex items-center justify-center">
            <Percent size={18} className="text-[#0060F0]" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Yield Marketplace</h2>
            <p className="text-[10px] text-white/25">Staking, Liquidity & Fixed Income</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[9px] text-white/20 uppercase">Total TVL</p>
            <p className="text-xs text-white/60 font-semibold">{totalTvl}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/20 uppercase">Avg APY</p>
            <p className="text-xs text-emerald-400 font-semibold">{avgApy}%</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/20 uppercase">Products</p>
            <p className="text-xs text-white/60 font-semibold">{OPPORTUNITIES.length}</p>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-8 gap-2 mb-1 px-4">
        <span className="text-[9px] text-white/20 uppercase col-span-2">Product</span>
        <span className="text-[9px] text-white/20 uppercase text-right">APY</span>
        <span className="text-[9px] text-white/20 uppercase text-right">TVL</span>
        <span className="text-[9px] text-white/20 uppercase text-center">Risk</span>
        <span className="text-[9px] text-white/20 uppercase text-center">Lockup</span>
        <span className="text-[9px] text-white/20 uppercase text-center">Util.</span>
        <span className="text-[9px] text-white/20 uppercase text-center">Action</span>
      </div>

      {/* Opportunity List */}
      <div className="space-y-1 flex-1">
        {OPPORTUNITIES.map((opp) => {
          const isExpanded = expandedId === opp.id;
          const isApproved = approved[opp.id] ?? false;
          const allocation = getAllocation(opp.id, opp.maxAllocation);
          const projectedYield = (allocation * opp.apyValue) / 100;

          return (
            <div key={opp.id} className="rounded-lg border border-white/[0.04] bg-white/[0.01] overflow-hidden">
              {/* Row */}
              <div className="grid grid-cols-8 gap-2 items-center px-4 py-2">
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                    <Lock size={12} className="text-white/25" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{opp.name}</p>
                    <p className="text-[9px] text-white/25">{opp.protocol} | {opp.chain}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-400 font-semibold">{opp.apy}</span>
                  <p className={`text-[9px] ${opp.weeklyUp ? "text-emerald-400/50" : "text-rose-400/50"}`}>{opp.weeklyChange}</p>
                </div>
                <span className="text-[11px] text-white/50 text-right tabular-nums">{opp.tvl}</span>
                <span className={`text-[10px] text-center ${riskColor(opp.risk)}`}>{opp.risk}</span>
                <span className="text-[10px] text-white/40 text-center">{opp.lockup}</span>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${utilizationColor(opp.utilization)}`} style={{ width: `${opp.utilization}%` }} />
                  </div>
                  <span className="text-[9px] text-white/30 tabular-nums">{opp.utilization}%</span>
                </div>
                <div className="flex justify-center">
                  <motion.button
                    onClick={() => handleToggle(opp.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      isExpanded ? "bg-white/10 text-white/60" : "bg-[#0060F0]/15 text-[#0060F0] hover:bg-[#0060F0]/25"
                    }`}
                  >
                    {isExpanded ? "Close" : "Stake"}
                  </motion.button>
                </div>
              </div>

              {/* Expanded Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-2 border-t border-white/5">
                      {/* Details Grid */}
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                          <p className="text-[8px] text-white/20 uppercase">Min Stake</p>
                          <p className="text-[11px] text-white/60 font-medium">{opp.minStake}</p>
                        </div>
                        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                          <p className="text-[8px] text-white/20 uppercase">Participants</p>
                          <p className="text-[11px] text-white/60 font-medium">{opp.participants}</p>
                        </div>
                        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                          <p className="text-[8px] text-white/20 uppercase">Auditor</p>
                          <p className="text-[11px] text-white/60 font-medium">{opp.auditor}</p>
                        </div>
                        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                          <p className="text-[8px] text-white/20 uppercase">Chain</p>
                          <p className="text-[11px] text-white/60 font-medium">{opp.chain}</p>
                        </div>
                        <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.03]">
                          <p className="text-[8px] text-white/20 uppercase">Protocol</p>
                          <p className="text-[11px] text-white/60 font-medium">{opp.protocol}</p>
                        </div>
                      </div>

                      {/* Allocation Slider */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[9px] text-white/25 uppercase tracking-wider">Allocation</label>
                          <span className="text-sm text-white font-medium tabular-nums">${allocation.toLocaleString("en-US")}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={opp.maxAllocation}
                          step={1000}
                          value={allocation}
                          onChange={(e) => setAllocations((prev) => ({ ...prev, [opp.id]: Number(e.target.value) }))}
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#0060F0]"
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[8px] text-white/15">$0</span>
                          <span className="text-[8px] text-white/15">${(opp.maxAllocation / 1000).toFixed(0)}k max</span>
                        </div>
                      </div>

                      {/* Projected Yield + Button */}
                      <div className="flex gap-3 items-stretch">
                        <div className="flex-1 flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-[9px] text-white/25 uppercase">Annual Yield</span>
                          <span className="text-sm text-emerald-400 font-bold tabular-nums">+${projectedYield.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                        </div>
                        <motion.button
                          onClick={() => handleApprove(opp.id)}
                          disabled={isApproved}
                          whileHover={!isApproved ? { scale: 1.01 } : {}}
                          whileTap={!isApproved ? { scale: 0.98 } : {}}
                          className={`px-6 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                            isApproved
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                              : "bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                          }`}
                        >
                          {isApproved ? <><Check size={14} strokeWidth={3} /> Approved</> : <><ShieldCheck size={14} /> Approve</>}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
