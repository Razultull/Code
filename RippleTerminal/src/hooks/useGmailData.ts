"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { GmailMessage } from "@/types/gmail";
import { mockGmailMessages } from "@/data/mock-data";

export function useGmailData() {
  const [messages, setMessages] = useState<GmailMessage[]>(mockGmailMessages);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gmail", {
        cache: "no-store",
      });
      if (res.ok) {
        const data: GmailMessage[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentIds = new Set(data.map((m) => m.id));
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
          setMessages(data);
        } else {
          setMessages(mockGmailMessages);
        }
      }
    } catch {
      setMessages(mockGmailMessages);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000); // 60 seconds
    return () => clearInterval(id);
  }, [fetchData]);

  return { messages, loading, newIds, lastRefreshed, refresh: fetchData };
}
