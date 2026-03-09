"use client";

import { useGmailData } from "@/hooks/useGmailData";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Paperclip } from "lucide-react";

const labelColors: Record<string, string> = {
  IMPORTANT: "border-l-amber-500",
  CATEGORY_UPDATES: "border-l-[#0060F0]",
  CATEGORY_FORUMS: "border-l-emerald-500",
  CATEGORY_PERSONAL: "border-l-purple-500",
  CATEGORY_PROMOTIONS: "border-l-pink-500",
  CATEGORY_SOCIAL: "border-l-cyan-500",
};

function getLabelBorder(labels: string[]): string {
  for (const label of labels) {
    if (labelColors[label]) return labelColors[label];
  }
  return "border-l-[#4A4E5F]";
}

function senderName(from: string): string {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1] : from.split("@")[0];
}

function senderEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}

function isExternal(from: string): boolean {
  const email = senderEmail(from);
  return !email.endsWith("@ripple.com");
}

function senderInitials(from: string): string {
  const name = senderName(from);
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function gmailLink(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
}

export default function GmailWidget() {
  const { messages, newIds } = useGmailData();

  return (
    <div className="divide-y divide-dashed divide-[#252833]/40">
      {messages.map((msg) => {
        const name = senderName(msg.from);
        const hue = avatarHue(name);
        const isNew = newIds.has(msg.id);
        const hasImportant = msg.labels.includes("IMPORTANT");

        return (
          <a
            key={msg.id}
            href={gmailLink(msg.threadId)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex gap-2 p-1.5 rounded transition-colors widget-accent-hover cursor-pointer border-l-2 ${
              getLabelBorder(msg.labels)
            } ${msg.isUnread ? "" : "opacity-55"} ${
              isNew && msg.isUnread ? "shimmer-border border" : ""
            }`}
          >
            {/* Sender avatar */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `hsl(${hue}, 35%, 25%)` }}
              >
                <span
                  className="text-[8px] font-bold"
                  style={{ color: `hsl(${hue}, 55%, 70%)` }}
                >
                  {senderInitials(msg.from)}
                </span>
              </div>
              {msg.isUnread && (
                <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor: "#F43F5E" }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-[11px] truncate ${
                      msg.isUnread
                        ? "font-semibold text-[#F1F3F5]"
                        : "text-[#8B8FA3]"
                    }`}
                  >
                    {name}
                  </span>
                  {isExternal(msg.from) && (
                    <span className="shrink-0 text-[7px] font-mono px-1 py-px rounded bg-amber-500/15 text-amber-400 uppercase tracking-wider">
                      Ext
                    </span>
                  )}
                  {hasImportant && (
                    <span className="shrink-0 text-[7px] font-mono px-1 py-px rounded bg-red-500/15 text-red-400">
                      !
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {msg.hasAttachment && (
                    <Paperclip className="w-2.5 h-2.5 text-[#4A4E5F]" />
                  )}
                  <span className="text-[9px] font-mono tabular-nums text-[#4A4E5F]">
                    {formatDistanceToNow(parseISO(msg.date), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
              </div>
              <div
                className={`text-[10px] truncate ${
                  msg.isUnread ? "font-medium text-[#F1F3F5]" : "text-[#8B8FA3]"
                }`}
              >
                {msg.subject}
              </div>
              <p className="text-[9px] text-[#4A4E5F] line-clamp-1">
                {msg.snippet}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
