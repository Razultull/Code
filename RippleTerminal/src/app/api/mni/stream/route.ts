import { mniClient } from "@/lib/mni-client";

export const dynamic = "force-dynamic";

/**
 * Encode a JSON-serialisable value as a properly-framed SSE `data:` field.
 * SSE spec requires each newline inside the payload to start a new `data:` line.
 * The browser's EventSource auto-joins them back with "\n".
 */
function sseData(event: string, payload: unknown): string {
  const json = JSON.stringify(payload);
  const lines = json.split("\n").map((l) => `data: ${l}`).join("\n");
  return `event: ${event}\n${lines}\n\n`;
}

export async function GET() {
  try {
    await mniClient.ensureInitialized();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "MNI feed unavailable", message: (e as Error).message }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial article history (newest first)
      controller.enqueue(encoder.encode(sseData("init", [...mniClient.articles].reverse())));

      // Subscribe to new articles from the STOMP feed
      unsubscribe = mniClient.onArticle((article) => {
        try {
          controller.enqueue(encoder.encode(sseData("article", article)));
        } catch {
          // Stream may have closed
        }
      });

      // Periodic heartbeat to keep connection alive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(sseData("heartbeat", {
            time: new Date().toISOString(),
            totalArticles: mniClient.articles.length,
          })));
        } catch {
          // Stream may have closed
        }
      }, 15_000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });
}
