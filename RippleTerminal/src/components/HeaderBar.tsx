"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Terminal } from "lucide-react";

export default function HeaderBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now ? format(now, "HH") : "--";
  const mm = now ? format(now, "mm") : "--";
  const ss = now ? format(now, "ss") : "--";

  return (
    <header className="flex items-center justify-between px-4 h-10 border-b border-[#252833] bg-[#181B25] shrink-0">
      <div className="flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-[#0060F0]" />
        <span className="text-xs font-semibold tracking-wide text-[#F1F3F5]">
          RippleTerminal
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] live-pulse" />
          Live
        </span>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-[#8B8FA3]">
        <span className="hidden sm:inline font-medium">rchatterjee@ripple.com</span>
        <span className="font-mono tabular-nums text-[#F1F3F5]">
          {hh}<span className="blink-colon">:</span>{mm}<span className="blink-colon">:</span>{ss}
        </span>
        <span className="hidden sm:inline font-mono text-[#4A4E5F]">{now ? format(now, "EEE d MMM yyyy") : ""}</span>
      </div>
    </header>
  );
}
