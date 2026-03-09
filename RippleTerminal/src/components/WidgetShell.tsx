"use client";

import { type ReactNode, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { GripHorizontal, RefreshCw, type LucideIcon } from "lucide-react";

function formatElapsed(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface WidgetShellProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  index?: number;
  count?: number;
  accent?: string;
  accentRgb?: string;
  bgOverride?: string;
  headerExtra?: ReactNode;
  lastRefreshed?: Date | null;
  onRefresh?: () => void;
}

export default function WidgetShell({
  title,
  icon: Icon,
  children,
  index = 0,
  count,
  accent,
  accentRgb,
  bgOverride,
  headerExtra,
  lastRefreshed,
  onRefresh,
}: WidgetShellProps) {
  const accentColor = accent || "#0060F0";
  const accentRgbVal = accentRgb || "0,96,240";
  const [elapsed, setElapsed] = useState("");
  const [spinning, setSpinning] = useState(false);

  // Update the elapsed time display every second
  useEffect(() => {
    setElapsed(formatElapsed(lastRefreshed ?? null));
    const timer = setInterval(() => {
      setElapsed(formatElapsed(lastRefreshed ?? null));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshed]);

  const handleRefresh = useCallback(() => {
    if (!onRefresh) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 600);
  }, [onRefresh]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
      className="flex flex-col h-full border border-[#252833] rounded-lg overflow-hidden relative"
      style={{
        "--widget-accent": accentColor,
        "--widget-accent-rgb": accentRgbVal,
        backgroundColor: bgOverride || "#181B25",
      } as React.CSSProperties}
    >
      {/* Top accent glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}40, ${accentColor}80, ${accentColor}40, transparent)`,
        }}
      />

      {/* Subtle background radial tint */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          background: `radial-gradient(ellipse at top right, ${accentColor}, transparent 70%)`,
        }}
      />

      {/* Header / drag handle */}
      <div className="widget-drag-handle relative flex items-center justify-between px-2.5 h-7 border-b border-[#252833] cursor-grab active:cursor-grabbing select-none shrink-0">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color: accentColor }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B8FA3]">
            {title}
          </span>
          {count !== undefined && (
            <span className="text-[9px] font-mono px-1 py-px rounded bg-[#252833] text-[#4A4E5F]">
              {count}
            </span>
          )}
          {headerExtra}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Last refreshed timestamp */}
          {elapsed && (
            <span className="text-[8px] font-mono text-[#4A4E5F] tabular-nums">
              {elapsed}
            </span>
          )}
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="p-0.5 rounded transition-colors hover:bg-[#252833] cursor-pointer"
              title="Refresh"
            >
              <RefreshCw
                className={`w-2.5 h-2.5 text-[#4A4E5F] hover:text-[#8B8FA3] transition-colors ${
                  spinning ? "animate-spin" : ""
                }`}
                style={spinning ? { color: accentColor } : undefined}
              />
            </button>
          )}
          <GripHorizontal className="w-3 h-3 text-[#4A4E5F]" />
        </div>
        {/* Activity bar */}
        <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
          <div
            className="h-full w-1/3 activity-bar"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${accentColor}66, transparent)`,
            }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {children}
      </div>
    </motion.div>
  );
}
