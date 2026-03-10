"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, ArrowRightLeft, Building2, TrendingUp, Wallet } from "lucide-react";
import GlassCard from "./GlassCard";

const ACCOUNTS = [
  { name: "J.P. Morgan", balance: 12_450_000, currency: "USD", type: "Nostro", bic: "CHASGB2L", status: "Active", limit: 50_000_000 },
  { name: "Standard Chartered", balance: 8_720_000, currency: "USD", type: "Nostro", bic: "SCBLHKHH", status: "Active", limit: 25_000_000 },
  { name: "Ripple Custody", balance: 34_180_000, currency: "Multi", type: "Omnibus", bic: "—", status: "Active", limit: 100_000_000 },
  { name: "DBS Bank", balance: 5_340_000, currency: "SGD", type: "Vostro", bic: "DBSSSGSG", status: "Active", limit: 15_000_000 },
  { name: "MUFG Tokyo", balance: 3_890_000, currency: "JPY", type: "Nostro", bic: "BOTKJPJT", status: "Active", limit: 20_000_000 },
];

const RECENT_TRANSFERS = [
  { from: "J.P. Morgan", to: "Ripple Custody", amount: "$2,500,000", time: "2m ago", status: "Settled" },
  { from: "Standard Chartered", to: "DBS Bank", amount: "$1,200,000", time: "8m ago", status: "Settled" },
  { from: "Ripple Custody", to: "MUFG Tokyo", amount: "¥450,000,000", time: "14m ago", status: "Pending" },
  { from: "J.P. Morgan", to: "Standard Chartered", amount: "$5,800,000", time: "22m ago", status: "Settled" },
];

export default function TreasuryHub() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [memo, setMemo] = useState("");
  const [transferState, setTransferState] = useState<"idle" | "success">("idle");

  const selected = ACCOUNTS[selectedIdx];
  const totalBalance = ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);

  function handleExecute() {
    if (!amount || !destination || transferState === "success") return;
    setTransferState("success");
    setTimeout(() => {
      setTransferState("idle");
      setAmount("");
      setDestination("");
      setMemo("");
    }, 2000);
  }

  return (
    <GlassCard className="col-span-2 row-span-2 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0060F0]/15 flex items-center justify-center">
            <Building2 size={18} className="text-[#0060F0]" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">
              Treasury Hub
            </h2>
            <p className="text-[10px] text-white/25">Global Cash Management</p>
          </div>
        </div>

        {/* Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            {selected.name}
            <ChevronDown
              size={14}
              className={`text-white/40 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#141926] border border-white/10 shadow-xl shadow-black/40 overflow-hidden z-50"
              >
                {ACCOUNTS.map((account, i) => (
                  <button
                    key={account.name}
                    onClick={() => { setSelectedIdx(i); setDropdownOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      i === selectedIdx ? "bg-[#0060F0]/10 text-[#0060F0]" : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <span className="block">{account.name}</span>
                      <span className="text-[10px] text-white/25">{account.type} | {account.bic}</span>
                    </div>
                    <span className="text-xs text-white/30 tabular-nums">${(account.balance / 1_000_000).toFixed(1)}M</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Total Balance + Account Balance Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-1">
          <p className="text-[9px] text-white/25 uppercase mb-1">Total Balance (All)</p>
          <p className="text-2xl font-bold text-white tracking-tight tabular-nums">
            ${(totalBalance / 1_000_000).toFixed(1)}M
          </p>
        </div>
        <div className="col-span-1">
          <p className="text-[9px] text-white/25 uppercase mb-1">{selected.name}</p>
          <p className="text-2xl font-semibold text-white/80 tabular-nums">
            ${(selected.balance / 1_000_000).toFixed(2)}M
          </p>
        </div>
        <div className="col-span-1">
          <p className="text-[9px] text-white/25 uppercase mb-1">Available Limit</p>
          <p className="text-2xl font-semibold text-[#0060F0] tabular-nums">
            ${((selected.limit - selected.balance) / 1_000_000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.03]">
        <div className="grid grid-cols-6 gap-2 mb-1.5 px-1">
          <span className="text-[9px] text-white/20 uppercase">Account</span>
          <span className="text-[9px] text-white/20 uppercase text-right">Balance</span>
          <span className="text-[9px] text-white/20 uppercase text-center">Currency</span>
          <span className="text-[9px] text-white/20 uppercase text-center">Type</span>
          <span className="text-[9px] text-white/20 uppercase text-center">BIC</span>
          <span className="text-[9px] text-white/20 uppercase text-center">Status</span>
        </div>
        {ACCOUNTS.map((acct, i) => (
          <div key={acct.name} className={`grid grid-cols-6 gap-2 py-1.5 px-1 border-t border-white/[0.03] ${i === selectedIdx ? "bg-[#0060F0]/5" : "hover:bg-white/[0.02]"} transition-colors`}>
            <span className="text-[11px] text-white/60 truncate">{acct.name}</span>
            <span className="text-[11px] text-white/70 tabular-nums text-right font-medium">${(acct.balance / 1_000_000).toFixed(2)}M</span>
            <span className="text-[11px] text-white/40 text-center">{acct.currency}</span>
            <span className="text-[11px] text-white/40 text-center">{acct.type}</span>
            <span className="text-[10px] text-white/25 text-center font-mono">{acct.bic}</span>
            <span className="text-[10px] text-emerald-400/70 text-center">{acct.status}</span>
          </div>
        ))}
      </div>

      {/* Recent Transfers */}
      <div className="mb-4">
        <p className="text-[9px] text-white/20 uppercase tracking-wider mb-2">Recent Transfers</p>
        <div className="space-y-1">
          {RECENT_TRANSFERS.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-white/[0.02] last:border-0">
              <span className="text-white/40">{t.from} → {t.to}</span>
              <div className="flex items-center gap-3">
                <span className="text-white/60 tabular-nums font-medium">{t.amount}</span>
                <span className={`text-[9px] ${t.status === "Settled" ? "text-emerald-400/60" : "text-amber-400/60"}`}>{t.status}</span>
                <span className="text-white/20">{t.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Transfer */}
      <div className="flex-1 flex flex-col border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRightLeft size={12} className="text-white/30" />
          <h3 className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Quick Transfer</h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-wider">Amount (USD)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0060F0]/50 focus:ring-1 focus:ring-[#0060F0]/25 transition-colors tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-wider">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Account or address"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0060F0]/50 focus:ring-1 focus:ring-[#0060F0]/25 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-wider">Reference / Memo</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0060F0]/50 focus:ring-1 focus:ring-[#0060F0]/25 transition-colors"
            />
          </div>
        </div>

        <motion.button
          onClick={handleExecute}
          disabled={transferState === "success"}
          layout
          className={`relative w-full py-2.5 rounded-xl font-medium text-sm text-white overflow-hidden transition-shadow ${
            transferState === "success"
              ? "bg-emerald-500 shadow-lg shadow-emerald-500/25"
              : "bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          }`}
          whileHover={transferState === "idle" ? { scale: 1.01 } : {}}
          whileTap={transferState === "idle" ? { scale: 0.98 } : {}}
        >
          <AnimatePresence mode="wait">
            {transferState === "idle" ? (
              <motion.span key="execute" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex items-center justify-center gap-2">
                Execute Transfer
              </motion.span>
            ) : (
              <motion.span key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="flex items-center justify-center gap-2">
                <Check size={18} strokeWidth={3} />
                Transfer Sent
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </GlassCard>
  );
}
