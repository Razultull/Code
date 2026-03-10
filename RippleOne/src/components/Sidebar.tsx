"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Landmark,
  Diamond,
  TrendingUp,
  Settings,
} from "lucide-react";
import { RippleOneFull } from "./RippleOneLogo";

const navItems = [
  { icon: Home, label: "Home" },
  { icon: Landmark, label: "Treasury" },
  { icon: Diamond, label: "Prime" },
  { icon: TrendingUp, label: "Yield" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const [active, setActive] = useState("Home");

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 flex flex-col items-center py-5 bg-white/5 backdrop-blur-xl border-r border-white/10 z-50">
      {/* Logo */}
      <div className="mb-7">
        <RippleOneFull />
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map(({ icon: Icon, label }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => setActive(label)}
              className="relative group flex flex-col items-center gap-1 p-3 rounded-xl transition-colors duration-200"
            >
              {/* Active background glow */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-[#0060F0]/15"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <Icon
                size={22}
                className={`relative z-10 transition-colors duration-200 ${
                  isActive
                    ? "text-[#0060F0] drop-shadow-[0_0_8px_rgba(0,96,240,0.6)]"
                    : "text-white/40 group-hover:text-white/70"
                }`}
              />
              <span
                className={`text-[10px] relative z-10 transition-colors duration-200 ${
                  isActive
                    ? "text-[#0060F0]"
                    : "text-white/30 group-hover:text-white/50"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom - Version */}
      <div className="mt-auto pt-4 border-t border-white/5 w-full flex flex-col items-center">
        <span className="text-[8px] text-white/15 uppercase tracking-wider">v2.4.1</span>
      </div>
    </aside>
  );
}
