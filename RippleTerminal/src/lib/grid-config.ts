import type { Layouts } from "react-grid-layout";

export const WIDGET_IDS = [
  "calendar",
  "slack",
  "gmail",
  "news",
  "todo",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_ACCENTS: Record<WidgetId, {
  accent: string;
  accentRgb: string;
  bgTint?: string;
}> = {
  calendar: { accent: "#38BDF8", accentRgb: "56,189,248" },
  slack:    { accent: "#8B5CF6", accentRgb: "139,92,246" },
  gmail:    { accent: "#F43F5E", accentRgb: "244,63,94" },
  news:     { accent: "#10B981", accentRgb: "16,185,129", bgTint: "#14161E" },
  todo:     { accent: "#14B8A6", accentRgb: "20,184,166", bgTint: "rgba(20,184,166,0.03)" },
};

export const GRID_BREAKPOINTS = { lg: 1200, md: 768 };
export const GRID_COLS = { lg: 12, md: 12 };
export const GRID_ROW_HEIGHT = 72;
export const GRID_MARGIN: [number, number] = [12, 12];
export const GRID_CONTAINER_PADDING: [number, number] = [16, 16];
export const GRID_DRAGGABLE_HANDLE = ".widget-drag-handle";
export const LAYOUT_STORAGE_KEY = "ripple-terminal-layouts-v5";

export const defaultLayouts: Layouts = {
  lg: [
    { i: "calendar", x: 0, y: 0, w: 3, h: 11, minW: 3, minH: 3 },
    { i: "slack", x: 3, y: 0, w: 6, h: 6, minW: 4, minH: 3 },
    { i: "gmail", x: 9, y: 0, w: 3, h: 6, minW: 3, minH: 3 },
    { i: "news", x: 0, y: 6, w: 9, h: 5, minW: 3, minH: 3 },
    { i: "todo", x: 9, y: 6, w: 3, h: 5, minW: 2, minH: 3 },
  ],
  md: [
    { i: "calendar", x: 0, y: 0, w: 4, h: 11, minW: 4, minH: 3 },
    { i: "slack", x: 4, y: 0, w: 8, h: 6, minW: 6, minH: 3 },
    { i: "gmail", x: 0, y: 6, w: 6, h: 6, minW: 4, minH: 3 },
    { i: "news", x: 6, y: 6, w: 6, h: 5, minW: 4, minH: 3 },
    { i: "todo", x: 0, y: 12, w: 6, h: 5, minW: 3, minH: 3 },
  ],
};
