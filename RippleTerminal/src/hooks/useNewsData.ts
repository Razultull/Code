"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MNIArticle } from "@/types/news";

export function useNewsData() {
  const [articles, setArticles] = useState<MNIArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const sseRef = useRef<EventSource | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Full refresh via REST (used for manual refresh + SSE fallback)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/mni", { cache: "no-store" });
      if (res.ok) {
        const data: MNIArticle[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const currentIds = new Set(data.map((a) => a.id));
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
          setArticles(data);
        }
      }
    } catch {
      // MNI feed unavailable — keep existing articles
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  // Store fetchData in a ref so the effect doesn't re-run when it changes
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    mountedRef.current = true;

    function startFallbackPolling() {
      if (fallbackRef.current) return;
      fallbackRef.current = setInterval(() => fetchDataRef.current(), 10_000);
    }

    function stopFallbackPolling() {
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    }

    function connectSSE() {
      const es = new EventSource("/api/mni/stream");
      sseRef.current = es;

      es.addEventListener("init", (e) => {
        if (!mountedRef.current) return;
        try {
          const data: MNIArticle[] = JSON.parse(e.data);
          if (Array.isArray(data) && data.length > 0) {
            prevIdsRef.current = new Set(data.map((a) => a.id));
            setArticles(data);
            setLastRefreshed(new Date());
          }
        } catch { /* parse error */ }
        setLoading(false);
        stopFallbackPolling();
      });

      es.addEventListener("article", (e) => {
        if (!mountedRef.current) return;
        try {
          const article: MNIArticle = JSON.parse(e.data);
          setArticles((prev) => {
            if (prev.some((a) => a.id === article.id)) return prev;
            return [article, ...prev];
          });
          setNewIds((prev) => new Set([...prev, article.id]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(article.id);
              return next;
            });
          }, 5000);
          prevIdsRef.current.add(article.id);
          setLastRefreshed(new Date());
        } catch { /* parse error */ }
      });

      es.addEventListener("heartbeat", () => {
        // Connection is alive — nothing to update
      });

      es.onerror = () => {
        if (!mountedRef.current) return;
        es.close();
        sseRef.current = null;
        // Fall back to REST polling
        startFallbackPolling();
        // Try to reconnect SSE after 5 seconds
        setTimeout(() => {
          if (mountedRef.current && !sseRef.current) {
            stopFallbackPolling();
            connectSSE();
          }
        }, 5000);
      };
    }

    connectSSE();

    return () => {
      mountedRef.current = false;
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      stopFallbackPolling();
    };
  }, []); // stable — no deps needed, uses refs

  return { articles, loading, newIds, lastRefreshed, refresh: fetchData };
}
