"use client";

import { useState, useCallback, useEffect } from "react";
import { Responsive, WidthProvider, type Layouts } from "react-grid-layout";
import { format } from "date-fns";
import {
  Calendar,
  MessageCircle,
  Mail,
  Newspaper,
  CheckSquare,
} from "lucide-react";
import WidgetShell from "./WidgetShell";
import CalendarWidget from "./widgets/CalendarWidget";
import SlackWidget from "./widgets/SlackWidget";
import GmailWidget from "./widgets/GmailWidget";
import NewsWidget from "./widgets/NewsWidget";
import TodoWidget from "./widgets/TodoWidget";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useSlackData } from "@/hooks/useSlackData";
import { useGmailData } from "@/hooks/useGmailData";
import { useNewsData } from "@/hooks/useNewsData";
import { useTodoData } from "@/hooks/useTodoData";
import {
  defaultLayouts,
  GRID_BREAKPOINTS,
  GRID_COLS,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  GRID_CONTAINER_PADDING,
  GRID_DRAGGABLE_HANDLE,
  LAYOUT_STORAGE_KEY,
  WIDGET_ACCENTS,
  type WidgetId,
} from "@/lib/grid-config";

const ResponsiveGridLayout = WidthProvider(Responsive);

function loadLayouts(): Layouts {
  if (typeof window === "undefined") return defaultLayouts;
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultLayouts;
}

export default function DashboardGrid() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [mounted, setMounted] = useState(false);

  const { events, lastRefreshed: calendarRefreshed, refresh: refreshCalendar } = useCalendarData();
  const { messages: slackMessages, lastRefreshed: slackRefreshed, refresh: refreshSlack } = useSlackData();
  const { messages: gmailMessages, lastRefreshed: gmailRefreshed, refresh: refreshGmail } = useGmailData();
  const { articles: newsArticles, lastRefreshed: newsRefreshed, refresh: refreshNews } = useNewsData();
  const { todos } = useTodoData();

  useEffect(() => {
    setLayouts(loadLayouts());
    setMounted(true);
  }, []);

  const onLayoutChange = useCallback((_: unknown, allLayouts: Layouts) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
    } catch {}
  }, []);

  if (!mounted) return null;

  function renderHeaderExtra(id: WidgetId): React.ReactNode {
    const a = WIDGET_ACCENTS[id];
    switch (id) {
      case "calendar": {
        const dayAbbr = format(new Date(), "EEE").toUpperCase();
        const dayNum = format(new Date(), "d");
        return (
          <span
            className="text-[8px] font-mono font-bold px-1 py-px rounded"
            style={{ backgroundColor: `${a.accent}20`, color: a.accent }}
          >
            {dayAbbr} {dayNum}
          </span>
        );
      }
      case "slack":
        return (
          <span
            className="flex items-center gap-1 text-[8px] font-mono px-1 py-px rounded"
            style={{ backgroundColor: `${a.accent}15`, color: a.accent }}
          >
            <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ backgroundColor: "#22C55E" }} />
            LIVE
          </span>
        );
      case "gmail": {
        const unreadCount = gmailMessages.filter((m) => m.isUnread).length;
        if (unreadCount === 0) return null;
        return (
          <span
            className="text-[8px] font-mono font-bold px-1 py-px rounded-full min-w-[14px] text-center"
            style={{ backgroundColor: `${a.accent}20`, color: a.accent }}
          >
            {unreadCount}
          </span>
        );
      }
      case "news":
        return (
          <span
            className="flex items-center gap-1 text-[8px] font-mono px-1 py-px rounded"
            style={{ backgroundColor: `${a.accent}15`, color: a.accent }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.accent }} />
            FEED
          </span>
        );
      case "todo": {
        const remaining = todos.filter((t) => !t.completed).length;
        if (remaining === 0) return null;
        return (
          <span
            className="text-[8px] font-mono font-bold px-1 py-px rounded-full min-w-[14px] text-center"
            style={{ backgroundColor: `${a.accent}20`, color: a.accent }}
          >
            {remaining}
          </span>
        );
      }
      default:
        return null;
    }
  }

  const widgets = [
    { id: "calendar" as WidgetId, title: "Calendar", icon: Calendar, Component: CalendarWidget, count: events.length, lastRefreshed: calendarRefreshed, onRefresh: refreshCalendar },
    { id: "slack" as WidgetId, title: "Slack", icon: MessageCircle, Component: SlackWidget, count: slackMessages.length, lastRefreshed: slackRefreshed, onRefresh: refreshSlack },
    { id: "gmail" as WidgetId, title: "Gmail", icon: Mail, Component: GmailWidget, count: gmailMessages.length, lastRefreshed: gmailRefreshed, onRefresh: refreshGmail },
    { id: "news" as WidgetId, title: "MNI Live", icon: Newspaper, Component: NewsWidget, count: newsArticles.length, lastRefreshed: newsRefreshed, onRefresh: refreshNews },
    { id: "todo" as WidgetId, title: "Tasks", icon: CheckSquare, Component: TodoWidget, count: todos.length },
  ];

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={GRID_BREAKPOINTS}
      cols={GRID_COLS}
      rowHeight={GRID_ROW_HEIGHT}
      margin={GRID_MARGIN}
      containerPadding={GRID_CONTAINER_PADDING}
      draggableHandle={GRID_DRAGGABLE_HANDLE}
      onLayoutChange={onLayoutChange}
      isResizable
      isDraggable
      useCSSTransforms
    >
      {widgets.map((w, i) => {
        const ac = WIDGET_ACCENTS[w.id];
        return (
          <div key={w.id}>
            <WidgetShell
              title={w.title}
              icon={w.icon}
              index={i}
              count={w.count}
              accent={ac.accent}
              accentRgb={ac.accentRgb}
              bgOverride={ac.bgTint}
              headerExtra={renderHeaderExtra(w.id)}
              lastRefreshed={w.lastRefreshed}
              onRefresh={w.onRefresh}
            >
              <w.Component />
            </WidgetShell>
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
