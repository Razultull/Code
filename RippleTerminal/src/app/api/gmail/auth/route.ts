import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * Redirects the user to Google's OAuth2 consent screen.
 * After granting permission, Google redirects to /api/gmail/callback
 * which displays the refresh_token.
 *
 * Usage: visit http://localhost:3001/api/gmail/auth in the browser.
 */
export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error: "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local",
        setup: [
          "1. Go to https://console.cloud.google.com/apis/credentials",
          "2. Create OAuth 2.0 Client ID (Web application)",
          "3. Add http://localhost:3001/api/gmail/callback as Authorized redirect URI",
          "4. Copy Client ID and Client Secret to .env.local",
          "5. Enable the Gmail API at https://console.cloud.google.com/apis/library/gmail.googleapis.com",
        ],
      },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3001/api/gmail/callback"
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return NextResponse.redirect(url);
}
