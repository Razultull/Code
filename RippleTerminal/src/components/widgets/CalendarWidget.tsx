"use client";

import { useCalendarData } from "@/hooks/useCalendarData";
import type { CalendarEvent } from "@/types/calendar";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { MapPin, Users, Video } from "lucide-react";

const responseColors: Record<string, string> = {
  accepted: "bg-[#22C55E]",
  tentative: "bg-[#F59E0B]",
  declined: "bg-[#EF4444]",
  needsAction: "bg-[#4A4E5F]",
};

const statusAccent: Record<string, string> = {
  now: "border-l-[#38BDF8]",
  past: "border-l-[#4A4E5F]",
  upcoming: "border-l-[#22C55E]",
};

/** URL patterns for common video-conferencing providers */
const MEETING_URL_RE =
  /https?:\/\/[^\s,]*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com|chime\.aws)[^\s,]*/i;

/**
 * Extract a meeting/conference link from the event.
 * Priority: explicit conferenceLink > first URL in location that matches a
 * known video-conferencing domain.
 */
function getMeetingLink(ev: CalendarEvent): string | undefined {
  if (ev.conferenceLink) return ev.conferenceLink;
  if (!ev.location) return undefined;
  const match = ev.location.match(MEETING_URL_RE);
  return match ? match[0] : undefined;
}

function initials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function CalendarWidget() {
  const { events, newIds } = useCalendarData();
  const now = new Date();

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.start.dateTime).getTime() -
      new Date(b.start.dateTime).getTime()
  );

  function getStatus(start: string, end: string) {
    const s = parseISO(start);
    const e = parseISO(end);
    if (isBefore(e, now)) return "past";
    if (isAfter(s, now)) return "upcoming";
    return "now";
  }

  // Day progress bar (00:00 to 24:00)
  const dayStart = 0;
  const dayEnd = 24;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const dayProgress = Math.min(
    100,
    Math.max(0, ((currentHour - dayStart) / (dayEnd - dayStart)) * 100)
  );

  return (
    <div className="space-y-0.5">
      {/* Day progress bar */}
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span className="text-[9px] font-mono text-[#4A4E5F]">00:00</span>
        <div className="flex-1 h-1 bg-[#252833] rounded-full relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#38BDF8]/60 to-[#38BDF8] rounded-full transition-all duration-1000"
            style={{ width: `${dayProgress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-[#38BDF8] rounded-full shadow-[0_0_6px_#38BDF8] border border-[#181B25]"
            style={{ left: `${dayProgress}%`, marginLeft: "-4px" }}
          />
        </div>
        <span className="text-[9px] font-mono text-[#4A4E5F]">24:00</span>
      </div>

      {sorted.map((ev) => {
        const status = getStatus(ev.start.dateTime, ev.end.dateTime);
        const isNew = newIds.has(ev.id);
        const meetingLink = getMeetingLink(ev);
        return (
          <a
            key={ev.id}
            href={ev.htmlLink || `https://calendar.google.com/calendar/r/event/${ev.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex gap-2 p-1.5 rounded transition-colors cursor-pointer border-l-2 ${
              statusAccent[status]
            } ${
              status === "now"
                ? "bg-[#38BDF8]/8 hover:bg-[#38BDF8]/12"
                : status === "past"
                ? "opacity-40 hover:opacity-60"
                : "widget-accent-hover"
            } ${isNew ? "shimmer-border border" : ""}`}
          >
            {/* Organizer avatar */}
            <div className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-[#252833] flex items-center justify-center">
                <span className="text-[8px] font-semibold text-[#8B8FA3]">
                  {initials(ev.organizer?.displayName, ev.organizer?.email)}
                </span>
              </div>
            </div>

            {/* Time column */}
            <div className="shrink-0 w-[44px] text-right pt-0.5">
              <div
                className={`text-[11px] font-mono tabular-nums ${
                  status === "now" ? "text-[#38BDF8] font-semibold" : "text-[#8B8FA3]"
                }`}
              >
                {format(parseISO(ev.start.dateTime), "HH:mm")}
              </div>
              <div className="text-[9px] font-mono tabular-nums text-[#4A4E5F]">
                {format(parseISO(ev.end.dateTime), "HH:mm")}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-medium truncate ${
                  status === "now" ? "text-[#F1F3F5]" : "text-[#F1F3F5]"
                }`}>
                  {ev.summary}
                </span>
                {status === "now" && (
                  <span className="shrink-0 text-[8px] font-mono uppercase tracking-wider px-1 py-px rounded bg-[#38BDF8]/20 text-[#38BDF8] pulse-dot">
                    Now
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {ev.location && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[#8B8FA3]">
                    <MapPin className="w-2 h-2" />
                    <span className="truncate max-w-[80px]">{ev.location}</span>
                  </span>
                )}
                {ev.attendees && ev.attendees.length > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-[#8B8FA3]">
                    <Users className="w-2 h-2" />
                    {ev.attendees.length}
                  </span>
                )}
                {/* Attendee response dots */}
                {ev.attendees && ev.attendees.length > 0 && (
                  <div className="flex items-center gap-px">
                    {ev.attendees.slice(0, 8).map((att, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          responseColors[att.responseStatus] || "bg-[#4A4E5F]"
                        }`}
                        title={`${att.displayName || att.email}: ${att.responseStatus}`}
                      />
                    ))}
                    {ev.attendees.length > 8 && (
                      <span className="text-[8px] text-[#4A4E5F] ml-0.5">
                        +{ev.attendees.length - 8}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Join meeting button */}
            {meetingLink && status !== "past" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(meetingLink, "_blank", "noopener,noreferrer");
                }}
                title="Join meeting"
                className="shrink-0 self-center flex items-center gap-1 px-1.5 py-0.5 rounded
                  text-[9px] font-medium transition-colors
                  bg-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/30
                  border border-[#38BDF8]/25 hover:border-[#38BDF8]/50"
              >
                <Video className="w-2.5 h-2.5" />
                <span>Join</span>
              </button>
            )}
          </a>
        );
      })}
    </div>
  );
}
