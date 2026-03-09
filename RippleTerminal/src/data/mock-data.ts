import type { CalendarEvent } from "@/types/calendar";
import type { SlackMessage, SlackThread } from "@/types/slack";
import type { GmailMessage } from "@/types/gmail";
import type { DriveFile } from "@/types/drive";
import type { NewsHeadline } from "@/types/news";

function todayAt(hours: number, minutes: number = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number, hours: number = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: "cal-1",
    summary: "Engineering Standup",
    start: { dateTime: todayAt(9, 30), timeZone: "Europe/London" },
    end: { dateTime: todayAt(9, 45), timeZone: "Europe/London" },
    location: "https://meet.google.com/abc-defg-hij",
    organizer: {
      email: "jparker@ripple.com",
      displayName: "James Parker",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "accepted",
      },
      {
        email: "jparker@ripple.com",
        displayName: "James Parker",
        responseStatus: "accepted",
      },
      {
        email: "swilliams@ripple.com",
        displayName: "Sarah Williams",
        responseStatus: "accepted",
      },
      {
        email: "mchen@ripple.com",
        displayName: "Michael Chen",
        responseStatus: "tentative",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/1",
  },
  {
    id: "cal-2",
    summary: "1:1 with Sarah Williams",
    start: { dateTime: todayAt(11, 0), timeZone: "Europe/London" },
    end: { dateTime: todayAt(11, 30), timeZone: "Europe/London" },
    organizer: {
      email: "rchatterjee@ripple.com",
      displayName: "Rishi Chatterjee",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "accepted",
      },
      {
        email: "swilliams@ripple.com",
        displayName: "Sarah Williams",
        responseStatus: "accepted",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/2",
  },
  {
    id: "cal-3",
    summary: "XRP Ledger Integration Review",
    start: { dateTime: todayAt(13, 0), timeZone: "Europe/London" },
    end: { dateTime: todayAt(14, 0), timeZone: "Europe/London" },
    location: "Room 4B - London Office",
    organizer: {
      email: "akumar@ripple.com",
      displayName: "Anil Kumar",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "accepted",
      },
      {
        email: "akumar@ripple.com",
        displayName: "Anil Kumar",
        responseStatus: "accepted",
      },
      {
        email: "lzhang@ripple.com",
        displayName: "Lisa Zhang",
        responseStatus: "accepted",
      },
      {
        email: "tmorris@ripple.com",
        displayName: "Tom Morris",
        responseStatus: "declined",
      },
      {
        email: "npatel@ripple.com",
        displayName: "Neha Patel",
        responseStatus: "tentative",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/3",
  },
  {
    id: "cal-4",
    summary: "Payment Corridors Team Sync",
    start: { dateTime: todayAt(15, 0), timeZone: "Europe/London" },
    end: { dateTime: todayAt(15, 30), timeZone: "Europe/London" },
    location: "https://ripple.zoom.us/j/91234567890?pwd=abc123",
    organizer: {
      email: "mchen@ripple.com",
      displayName: "Michael Chen",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "accepted",
      },
      {
        email: "mchen@ripple.com",
        displayName: "Michael Chen",
        responseStatus: "accepted",
      },
      {
        email: "jparker@ripple.com",
        displayName: "James Parker",
        responseStatus: "accepted",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/4",
  },
  {
    id: "cal-5",
    summary: "Q1 OKR Check-in",
    start: { dateTime: todayAt(16, 0), timeZone: "Europe/London" },
    end: { dateTime: todayAt(16, 45), timeZone: "Europe/London" },
    location: "https://meet.google.com/xyz-uvwx-yz1",
    organizer: {
      email: "dwright@ripple.com",
      displayName: "David Wright",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "accepted",
      },
      {
        email: "dwright@ripple.com",
        displayName: "David Wright",
        responseStatus: "accepted",
      },
      {
        email: "swilliams@ripple.com",
        displayName: "Sarah Williams",
        responseStatus: "accepted",
      },
      {
        email: "akumar@ripple.com",
        displayName: "Anil Kumar",
        responseStatus: "accepted",
      },
      {
        email: "mchen@ripple.com",
        displayName: "Michael Chen",
        responseStatus: "tentative",
      },
      {
        email: "npatel@ripple.com",
        displayName: "Neha Patel",
        responseStatus: "accepted",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/5",
  },
  {
    id: "cal-6",
    summary: "Compliance Review - APAC Expansion",
    start: { dateTime: todayAt(17, 30), timeZone: "Europe/London" },
    end: { dateTime: todayAt(18, 0), timeZone: "Europe/London" },
    location: "https://teams.microsoft.com/l/meetup-join/abc123",
    organizer: {
      email: "lzhang@ripple.com",
      displayName: "Lisa Zhang",
    },
    attendees: [
      {
        email: "rchatterjee@ripple.com",
        displayName: "Rishi Chatterjee",
        responseStatus: "tentative",
      },
      {
        email: "lzhang@ripple.com",
        displayName: "Lisa Zhang",
        responseStatus: "accepted",
      },
    ],
    status: "confirmed",
    htmlLink: "https://calendar.google.com/event/6",
  },
];

export const mockSlackMessages: SlackMessage[] = [
  {
    type: "channel",
    channel: "C001",
    channelName: "#general",
    user: "U001",
    userName: "David Wright",
    text: "Reminder: London office all-hands is moved to 4pm this Friday. Updated calendar invites going out shortly.",
    timestamp: minutesAgo(12),
    reactions: [{ name: "thumbsup", count: 8 }],
  },
  {
    type: "channel",
    channel: "C002",
    channelName: "#trading-systems",
    user: "U002",
    userName: "Michael Chen",
    text: "Deployed v2.4.1 to staging — fixes the latency spike in the EUR/USD corridor. Please verify on your end.",
    timestamp: minutesAgo(25),
    threadReplyCount: 3,
  },
  {
    type: "channel",
    channel: "C002",
    channelName: "#trading-systems",
    user: "U003",
    userName: "Neha Patel",
    text: "Seeing improved throughput on the APAC settlement path after the config change. P99 down from 340ms to 180ms.",
    timestamp: minutesAgo(42),
    reactions: [
      { name: "fire", count: 4 },
      { name: "chart_with_upwards_trend", count: 2 },
    ],
  },
  {
    type: "channel",
    channel: "C003",
    channelName: "#eng-london",
    user: "U004",
    userName: "James Parker",
    text: "Who's around for lunch today? Thinking of trying the new place on Shoreditch High Street.",
    timestamp: minutesAgo(55),
    threadReplyCount: 7,
  },
  {
    type: "channel",
    channel: "C003",
    channelName: "#eng-london",
    user: "U005",
    userName: "Sarah Williams",
    text: "PR #1847 is ready for review — adds retry logic to the webhook delivery service. @rchatterjee would appreciate your eyes on it.",
    timestamp: hoursAgo(1.5),
    reactions: [{ name: "eyes", count: 1 }],
  },
  {
    type: "channel",
    channel: "C002",
    channelName: "#trading-systems",
    user: "U006",
    userName: "Anil Kumar",
    text: "XRP Ledger validator node upgrade to v2.3.0 complete across all regions. Zero downtime achieved.",
    timestamp: hoursAgo(2),
    reactions: [
      { name: "tada", count: 6 },
      { name: "rocket", count: 3 },
    ],
  },
  {
    type: "channel",
    channel: "C004",
    channelName: "#random",
    user: "U007",
    userName: "Tom Morris",
    text: "Anyone watching the Champions League tonight? Setting up a stream in the breakout area from 8pm.",
    timestamp: hoursAgo(3),
    threadReplyCount: 12,
  },
  {
    type: "channel",
    channel: "C003",
    channelName: "#eng-london",
    user: "U002",
    userName: "Michael Chen",
    text: "Heads up: CI pipeline will be down for maintenance between 6-7pm GMT today for runner upgrades.",
    timestamp: hoursAgo(4),
    reactions: [{ name: "thumbsup", count: 5 }],
  },
  {
    type: "channel",
    channel: "C001",
    channelName: "#general",
    user: "U008",
    userName: "Lisa Zhang",
    text: "Compliance team has published the updated APAC regulatory framework document. Link in the thread.",
    timestamp: hoursAgo(5),
    threadReplyCount: 2,
  },
  {
    type: "channel",
    channel: "C004",
    channelName: "#random",
    user: "U005",
    userName: "Sarah Williams",
    text: "The new coffee machine on floor 3 is incredible. Highly recommend the flat white setting.",
    timestamp: hoursAgo(6),
    reactions: [
      { name: "coffee", count: 9 },
      { name: "heart", count: 3 },
    ],
  },
];

export const mockSlackThreads: SlackThread[] = [
  {
    id: "thread-1",
    channel: "C001",
    channelName: "#general",
    parentUserName: "Lisa Zhang",
    parentText: "Compliance team has published the updated APAC regulatory framework document.",
    parentTs: hoursAgo(5),
    latestReplyUserName: "David Wright",
    latestReplyText: "Thanks Lisa, forwarding to the Singapore team now.",
    latestReplyTs: hoursAgo(4),
    replyCount: 2,
  },
  {
    id: "thread-2",
    channel: "C002",
    channelName: "#trading-systems",
    parentUserName: "Michael Chen",
    parentText: "Deployed v2.4.1 to staging — fixes the latency spike in the EUR/USD corridor.",
    parentTs: minutesAgo(25),
    latestReplyUserName: "Neha Patel",
    latestReplyText: "Verified on APAC side, P99 looking good at 185ms.",
    latestReplyTs: minutesAgo(15),
    replyCount: 3,
  },
  {
    id: "thread-3",
    channel: "C003",
    channelName: "#eng-london",
    parentUserName: "James Parker",
    parentText: "Who's around for lunch today? Thinking of trying the new place on Shoreditch High Street.",
    parentTs: minutesAgo(55),
    latestReplyUserName: "Sarah Williams",
    latestReplyText: "Count me in! The reviews look great.",
    latestReplyTs: minutesAgo(40),
    replyCount: 7,
  },
];

export const mockGmailMessages: GmailMessage[] = [
  {
    id: "msg-1",
    threadId: "thread-1",
    from: "Sarah Williams <swilliams@ripple.com>",
    subject: "PR #1847: Webhook retry logic — review requested",
    snippet:
      "Hey Rishi, I've pushed the webhook retry implementation we discussed. Could you review when you get a chance? Key changes are in the delivery service module...",
    date: minutesAgo(20),
    isUnread: true,
    labels: ["INBOX", "IMPORTANT"],
    hasAttachment: false,
  },
  {
    id: "msg-2",
    threadId: "thread-2",
    from: "David Wright <dwright@ripple.com>",
    subject: "Q1 OKR Check-in Agenda",
    snippet:
      "Hi team, here's the agenda for today's OKR review. Please come prepared with your progress updates. 1. Engineering velocity metrics 2. Payment corridor expansion...",
    date: hoursAgo(1),
    isUnread: true,
    labels: ["INBOX"],
    hasAttachment: true,
  },
  {
    id: "msg-3",
    threadId: "thread-3",
    from: "Anil Kumar <akumar@ripple.com>",
    subject: "Re: XRP Ledger v2.3.0 Migration Plan",
    snippet:
      "Upgrade completed successfully across all regions. Performance metrics look stable. Attaching the post-migration report for your review...",
    date: hoursAgo(2),
    isUnread: false,
    labels: ["INBOX"],
    hasAttachment: true,
  },
  {
    id: "msg-4",
    threadId: "thread-4",
    from: "Google Calendar <calendar-notification@google.com>",
    subject: "Invitation: Compliance Review - APAC Expansion @ 5:30pm",
    snippet:
      "Lisa Zhang has invited you to an event. Compliance Review - APAC Expansion. When: Today 5:30pm - 6:00pm GMT...",
    date: hoursAgo(3),
    isUnread: true,
    labels: ["INBOX"],
    hasAttachment: false,
  },
  {
    id: "msg-5",
    threadId: "thread-5",
    from: "Neha Patel <npatel@ripple.com>",
    subject: "APAC Settlement Performance Report - March",
    snippet:
      "Hi Rishi, attached is the March performance report for APAC settlement corridors. P99 latency improvements are significant after last week's optimisations...",
    date: hoursAgo(5),
    isUnread: false,
    labels: ["INBOX"],
    hasAttachment: true,
  },
  {
    id: "msg-6",
    threadId: "thread-6",
    from: "Michael Chen <mchen@ripple.com>",
    subject: "Re: Staging deployment v2.4.1",
    snippet:
      "Deployed to staging successfully. All smoke tests passing. EUR/USD corridor latency back to normal levels. Ready for prod sign-off when you are...",
    date: hoursAgo(6),
    isUnread: false,
    labels: ["INBOX"],
    hasAttachment: false,
  },
  {
    id: "msg-7",
    threadId: "thread-7",
    from: "HR Ripple <hr@ripple.com>",
    subject: "Reminder: Annual leave policy update",
    snippet:
      "Dear team, please note the updated annual leave policy effective April 1st. Key changes include increased carry-over allowance and new public holiday...",
    date: daysAgo(1),
    isUnread: false,
    labels: ["INBOX"],
    hasAttachment: true,
  },
  {
    id: "msg-8",
    threadId: "thread-8",
    from: "James Parker <jparker@ripple.com>",
    subject: "London eng team offsite - venue options",
    snippet:
      "Hey all, I've shortlisted three venues for our Q2 offsite. Please vote on your preference by EOD Friday. Option A: The Hoxton...",
    date: daysAgo(1, 14),
    isUnread: false,
    labels: ["INBOX"],
    hasAttachment: false,
  },
];

export const mockDriveFiles: DriveFile[] = [
  {
    id: "drive-1",
    name: "Q1 2026 OKR Tracker",
    mimeType: "application/vnd.google-apps.spreadsheet",
    modifiedTime: hoursAgo(1),
    sharedBy: "David Wright",
    webViewLink: "https://docs.google.com/spreadsheets/d/1",
    iconType: "sheet",
    size: "245 KB",
  },
  {
    id: "drive-2",
    name: "XRP Ledger v2.3.0 Migration Plan",
    mimeType: "application/vnd.google-apps.document",
    modifiedTime: hoursAgo(3),
    sharedBy: "Anil Kumar",
    webViewLink: "https://docs.google.com/document/d/2",
    iconType: "doc",
  },
  {
    id: "drive-3",
    name: "APAC Settlement Performance - March 2026",
    mimeType: "application/vnd.google-apps.spreadsheet",
    modifiedTime: hoursAgo(5),
    sharedBy: "Neha Patel",
    webViewLink: "https://docs.google.com/spreadsheets/d/3",
    iconType: "sheet",
    size: "1.2 MB",
  },
  {
    id: "drive-4",
    name: "Payment Corridors Architecture Deck",
    mimeType: "application/vnd.google-apps.presentation",
    modifiedTime: daysAgo(1),
    sharedBy: "Michael Chen",
    webViewLink: "https://docs.google.com/presentation/d/4",
    iconType: "slide",
  },
  {
    id: "drive-5",
    name: "APAC Regulatory Framework v2",
    mimeType: "application/pdf",
    modifiedTime: daysAgo(1, 15),
    sharedBy: "Lisa Zhang",
    webViewLink: "https://drive.google.com/file/d/5",
    iconType: "pdf",
    size: "3.8 MB",
  },
  {
    id: "drive-6",
    name: "London Eng Team Offsite - Proposals",
    mimeType: "application/vnd.google-apps.document",
    modifiedTime: daysAgo(2),
    sharedBy: "James Parker",
    webViewLink: "https://docs.google.com/document/d/6",
    iconType: "doc",
  },
  {
    id: "drive-7",
    name: "Engineering Assets",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: daysAgo(3),
    sharedBy: "Sarah Williams",
    webViewLink: "https://drive.google.com/drive/folders/7",
    iconType: "folder",
  },
];

export const mockNewsHeadlines: NewsHeadline[] = [
  {
    id: "news-1",
    title: "Federal Reserve Signals Cautious Approach to Rate Cuts Amid Inflation Concerns",
    source: "Reuters",
    url: "https://reuters.com/1",
    pubDate: minutesAgo(15),
    category: "Central Banks",
  },
  {
    id: "news-2",
    title: "Ripple Expands Cross-Border Payment Network to Southeast Asia",
    source: "CNBC",
    url: "https://cnbc.com/2",
    pubDate: minutesAgo(45),
    category: "Crypto",
  },
  {
    id: "news-3",
    title: "European Markets Rally as ECB Holds Rates Steady",
    source: "MarketWatch",
    url: "https://marketwatch.com/3",
    pubDate: hoursAgo(1),
    category: "Markets",
  },
  {
    id: "news-4",
    title: "Global Remittance Flows Reach Record $860B in Q4 2025",
    source: "Reuters",
    url: "https://reuters.com/4",
    pubDate: hoursAgo(2),
    category: "Finance",
  },
  {
    id: "news-5",
    title: "SEC Approves New Framework for Digital Asset Custody",
    source: "CNBC",
    url: "https://cnbc.com/5",
    pubDate: hoursAgo(3),
    category: "Regulation",
  },
  {
    id: "news-6",
    title: "SWIFT Partners with Blockchain Firms for Instant Settlement Pilot",
    source: "MarketWatch",
    url: "https://marketwatch.com/6",
    pubDate: hoursAgo(5),
    category: "Payments",
  },
];
