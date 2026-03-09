"use client";

import { useSlackData } from "@/hooks/useSlackData";
import { formatDistanceToNow, parseISO } from "date-fns";
import { User, Star, MessageSquare } from "lucide-react";
import { renderEmoji } from "@/lib/emoji";
import type { SlackMessage, SlackThread } from "@/types/slack";

function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function userInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const channelColors: Record<string, string> = {
  ai: "text-purple-400",
  "ext-immix-tech": "text-sky-400",
  "ripple-hiddenroad": "text-orange-400",
  "ripple-markets": "text-[#4D94FF]",
  "ripple-markets-middleoffice": "text-teal-400",
  "ripple-markets-risk": "text-red-400",
  rtm_risk_reporting: "text-amber-400",
  rtm_trading: "text-emerald-400",
  "rtm-basis-trade-alerts": "text-cyan-400",
};

function getChannelTextColor(name: string): string {
  const key = name.replace("#", "").toLowerCase();
  return channelColors[key] || "text-[#8B8FA3]";
}

/* ─── DM Column ──────────────────────────────────────────────────────────── */

function DMColumn({ messages, newIds }: { messages: SlackMessage[]; newIds: Set<string> }) {
  // Get latest message per conversation partner
  const latestPerPartner = new Map<string, SlackMessage>();
  for (const msg of messages) {
    const existing = latestPerPartner.get(msg.channelName);
    if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
      latestPerPartner.set(msg.channelName, msg);
    }
  }

  const sorted = [...latestPerPartner.entries()].sort(
    ([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <User className="w-3 h-3 text-[#4D94FF]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#4D94FF]">
          Direct Messages
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-px min-h-0">
        {sorted.map(([partner, msg]) => {
          const hue = avatarHue(partner);
          const isMe = msg.userName === "Rahul Chatterjee";
          const isVeryRecent = Date.now() - new Date(msg.timestamp).getTime() < 300_000;
          const msgId = `${msg.channel}-${msg.timestamp}`;
          const isNew = newIds.has(msgId);

          return (
            <a
              key={partner}
              href={`https://ripple-enterprise.slack.com/archives/${msg.channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-1 py-1 rounded widget-accent-hover transition-colors ${
                isNew || isVeryRecent ? "shimmer-border border" : ""
              }`}
            >
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `hsl(${hue}, 40%, 25%)` }}
              >
                <span className="text-[7px] font-bold" style={{ color: `hsl(${hue}, 60%, 70%)` }}>
                  {userInitials(partner)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-[#E8EAED] truncate">
                    {partner}
                  </span>
                  <span className="text-[8px] font-mono tabular-nums text-[#5A5E6F] shrink-0">
                    {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: false })}
                  </span>
                </div>
                <p className="text-[9px] text-[#8B8FA3] truncate">
                  {isMe ? <span className="text-[#4D94FF]">You: </span> : null}
                  {renderEmoji(msg.text)}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Channels Column ────────────────────────────────────────────────────── */

function ChannelsColumn({ messages, newIds }: { messages: SlackMessage[]; newIds: Set<string> }) {
  // Get latest message per channel
  const latestPerChannel = new Map<string, SlackMessage>();
  for (const msg of messages) {
    const existing = latestPerChannel.get(msg.channelName);
    if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
      latestPerChannel.set(msg.channelName, msg);
    }
  }

  const sorted = [...latestPerChannel.entries()].sort(
    ([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Star className="w-3 h-3 text-[#8B5CF6]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#8B5CF6]">
          Starred
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-px min-h-0">
        {sorted.map(([channelName, msg]) => {
          const hue = avatarHue(msg.userName);
          const channelColor = getChannelTextColor(channelName);
          const isVeryRecent = Date.now() - new Date(msg.timestamp).getTime() < 300_000;
          const msgId = `${msg.channel}-${msg.timestamp}`;
          const isNew = newIds.has(msgId);

          return (
            <a
              key={channelName}
              href={`https://ripple-enterprise.slack.com/archives/${msg.channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`block px-1 py-1 rounded widget-accent-hover transition-colors ${
                isNew || isVeryRecent ? "shimmer-border border" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className={`text-[9px] font-bold ${channelColor}`}>
                  {channelName.replace("#", "")}
                </span>
                <span className="text-[8px] font-mono tabular-nums text-[#5A5E6F] shrink-0">
                  {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: false })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${hue}, 40%, 25%)` }}
                >
                  <span className="text-[6px] font-bold" style={{ color: `hsl(${hue}, 60%, 70%)` }}>
                    {userInitials(msg.userName)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-medium text-[#C4C7CF]">
                    {msg.userName.split(" ")[0]}
                  </span>
                  <p className="text-[9px] text-[#8B8FA3] truncate">
                    {renderEmoji(msg.text)}
                  </p>
                </div>
              </div>
              {msg.threadReplyCount && (
                <span className="text-[8px] text-[#5A5E6F] ml-5">
                  {msg.threadReplyCount} {msg.threadReplyCount === 1 ? "reply" : "replies"}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Threads Column ─────────────────────────────────────────────────────── */

function ThreadsColumn({ threads }: { threads: SlackThread[] }) {
  const sorted = [...threads].sort(
    (a, b) => new Date(b.latestReplyTs).getTime() - new Date(a.latestReplyTs).getTime()
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <MessageSquare className="w-3 h-3 text-[#10B981]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#10B981]">
          Threads
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {sorted.map((thread) => {
          const parentHue = avatarHue(thread.parentUserName);
          const replyHue = avatarHue(thread.latestReplyUserName);
          const channelColor = getChannelTextColor(thread.channelName);

          return (
            <a
              key={thread.id}
              href={thread.permalink || `https://ripple-enterprise.slack.com/archives/${thread.channel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-1 py-1 rounded widget-accent-hover transition-colors"
            >
              {/* Channel + reply count */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className={`text-[8px] font-bold ${channelColor}`}>
                  {thread.channelName.replace("#", "")}
                </span>
                <span className="flex items-center gap-0.5 text-[7px] text-[#5A5E6F]">
                  <MessageSquare className="w-2 h-2" />
                  {thread.replyCount}
                </span>
              </div>

              {/* Parent message */}
              <div className="flex items-start gap-1 mb-0.5">
                <div
                  className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `hsl(${parentHue}, 40%, 25%)` }}
                >
                  <span className="text-[5px] font-bold" style={{ color: `hsl(${parentHue}, 60%, 70%)` }}>
                    {userInitials(thread.parentUserName)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-medium text-[#8B8FA3]">
                    {thread.parentUserName.split(" ")[0]}
                  </span>
                  <p className="text-[9px] text-[#C4C7CF] truncate">
                    {renderEmoji(thread.parentText)}
                  </p>
                </div>
              </div>

              {/* Latest reply — indented */}
              <div className="flex items-start gap-1 ml-2.5 pl-2 border-l border-[#252833]">
                <div
                  className="shrink-0 w-3 h-3 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `hsl(${replyHue}, 40%, 25%)` }}
                >
                  <span className="text-[5px] font-bold" style={{ color: `hsl(${replyHue}, 60%, 70%)` }}>
                    {userInitials(thread.latestReplyUserName)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] font-medium text-[#E8EAED]">
                      {thread.latestReplyUserName.split(" ")[0]}
                    </span>
                    <span className="text-[7px] font-mono tabular-nums text-[#5A5E6F] shrink-0">
                      {formatDistanceToNow(parseISO(thread.latestReplyTs), { addSuffix: false })}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#C4C7CF] line-clamp-2">
                    {renderEmoji(thread.latestReplyText)}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Starred channels ────────────────────────────────────────────────────── */

const STARRED_CHANNEL_IDS = new Set([
  "C0KQNLPND",   // #ai
  "C0517H97V9D", // #ext-immix-tech
  "C05Q5TY4TRD", // #ripple-hiddenroad
  "C03U5CXJ95K", // #ripple-markets
  "C04L4MMMU3G", // #ripple-markets-middleoffice
  "C049UB1Q2RZ", // #ripple-markets-risk
  "C059TH1R38D", // #rtm_risk_reporting
  "C05C7L4FG3D", // #rtm_trading
  "C07EP6RSKFS", // #rtm-basis-trade-alerts
]);

/* ─── Main Widget ────────────────────────────────────────────────────────── */

export default function SlackWidget() {
  const { messages, threads, newIds } = useSlackData();

  const dms = messages.filter((m) => m.type === "dm");
  const channelMsgs = messages.filter(
    (m) => m.type === "channel" && STARRED_CHANNEL_IDS.has(m.channel)
  );

  return (
    <div className="grid grid-cols-3 gap-2 h-full min-h-0">
      {/* Column 1: DMs */}
      <div className="min-w-0 min-h-0 overflow-hidden border-r border-[#252833] pr-2">
        <DMColumn messages={dms} newIds={newIds} />
      </div>

      {/* Column 2: Channels (latest per channel) */}
      <div className="min-w-0 min-h-0 overflow-hidden border-r border-[#252833] pr-2">
        <ChannelsColumn messages={channelMsgs} newIds={newIds} />
      </div>

      {/* Column 3: Threads */}
      <div className="min-w-0 min-h-0 overflow-hidden">
        <ThreadsColumn threads={threads} />
      </div>
    </div>
  );
}
