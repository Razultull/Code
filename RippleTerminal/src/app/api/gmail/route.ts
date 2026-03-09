import { NextResponse } from "next/server";
import { fetchGmailMessages, isGmailConfigured } from "@/lib/gmail-service";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  // If Gmail OAuth is configured, fetch real data
  if (isGmailConfigured()) {
    try {
      const messages = await fetchGmailMessages(30);
      return NextResponse.json(messages);
    } catch (e) {
      console.error("[Gmail API] Error fetching messages:", (e as Error).message);
      // Fall through to static data
    }
  }

  // Fallback: serve static JSON data
  try {
    const filePath = join(process.cwd(), "src", "data", "gmail-messages.json");
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json([]);
  }
}
