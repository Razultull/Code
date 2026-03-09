"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CalendarEvent } from "@/types/calendar";
import { mockCalendarEvents } from "@/data/mock-data";

export function useCalendarData() {
  const [events, setEvents] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data?file=calendar-events", {
        cache: "no-store",
      });
      if (res.ok) {
        const data: CalendarEvent[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentIds = new Set(data.map((e) => e.id));
          if (prevIdsRef.current.size > 0) {
            const fresh = new Set<string>();
            for (const id of currentIds) {
              if (!prevIdsRef.current.has(id)) fresh.add(id);
            }
            if (fresh.size > 0) {
              setNewIds(fresh);
              setTimeout(() => setNewIds(new Set()), 5000);
            }
          }
          prevIdsRef.current = currentIds;
          setEvents(data);
        } else {
          setEvents(mockCalendarEvents);
        }
      }
    } catch {
      setEvents(mockCalendarEvents);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 300_000); // 5 minutes
    return () => clearInterval(id);
  }, [fetchData]);

  return { events, loading, newIds, lastRefreshed, refresh: fetchData };
}
