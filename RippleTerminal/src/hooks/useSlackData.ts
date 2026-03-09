"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SlackMessage, SlackThread } from "@/types/slack";
import { mockSlackMessages, mockSlackThreads } from "@/data/mock-data";

export function useSlackData() {
  const [messages, setMessages] = useState<SlackMessage[]>(mockSlackMessages);
  const [threads, setThreads] = useState<SlackThread[]>(mockSlackThreads);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [msgRes, threadRes] = await Promise.all([
        fetch("/api/data?file=slack-messages", { cache: "no-store" }),
        fetch("/api/data?file=slack-threads", { cache: "no-store" }),
      ]);

      if (msgRes.ok) {
        const data: SlackMessage[] = await msgRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentIds = new Set(data.map((m) => `${m.channel}-${m.timestamp}`));
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
          setMessages(mockSlackMessages);
        }
      }

      if (threadRes.ok) {
        const threadData: SlackThread[] = await threadRes.json();
        if (Array.isArray(threadData) && threadData.length > 0) {
          setThreads(threadData);
        } else {
          setThreads(mockSlackThreads);
        }
      }
    } catch {
      setMessages(mockSlackMessages);
      setThreads(mockSlackThreads);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5_000); // 5 seconds
    return () => clearInterval(id);
  }, [fetchData]);

  return { messages, threads, loading, newIds, lastRefreshed, refresh: fetchData };
}
