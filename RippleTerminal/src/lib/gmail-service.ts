import { google } from "googleapis";
import type { GmailMessage } from "@/types/gmail";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/api/gmail/callback"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

function decodeHeader(
  headers: { name: string; value: string }[] | undefined,
  name: string
): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function hasAttachmentParts(
  parts: { mimeType?: string; filename?: string; parts?: unknown[] }[] | undefined
): boolean {
  if (!parts) return false;
  for (const part of parts) {
    if (part.filename && part.filename.length > 0) return true;
    if (part.parts && hasAttachmentParts(part.parts as typeof parts)) return true;
  }
  return false;
}

export async function fetchGmailMessages(maxResults = 30): Promise<GmailMessage[]> {
  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "in:inbox",
  });

  const messageIds = listRes.data.messages ?? [];
  if (messageIds.length === 0) return [];

  const messages: GmailMessage[] = [];

  // Fetch message details in parallel (batches of 10)
  for (let i = 0; i < messageIds.length; i += 10) {
    const batch = messageIds.slice(i, i + 10);
    const details = await Promise.all(
      batch.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        })
      )
    );

    for (const detail of details) {
      const msg = detail.data;
      const headers = msg.payload?.headers as
        | { name: string; value: string }[]
        | undefined;

      messages.push({
        id: msg.id ?? "",
        threadId: msg.threadId ?? "",
        from: decodeHeader(headers, "From"),
        subject: decodeHeader(headers, "Subject"),
        snippet: msg.snippet ?? "",
        date: new Date(
          parseInt(msg.internalDate ?? "0", 10)
        ).toISOString(),
        isUnread: msg.labelIds?.includes("UNREAD") ?? false,
        labels: msg.labelIds ?? [],
        hasAttachment: hasAttachmentParts(
          msg.payload?.parts as
            | { mimeType?: string; filename?: string; parts?: unknown[] }[]
            | undefined
        ),
      });
    }
  }

  // Sort newest first
  messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return messages;
}

/** Check if Gmail credentials are configured */
export function isGmailConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}
