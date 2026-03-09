import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/**
 * OAuth2 callback handler.
 * Visit /api/gmail/auth to start the flow, then Google redirects here with
 * an authorization code. This exchanges it for tokens and displays the
 * refresh_token so you can add it to .env.local.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code parameter" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3001/api/gmail/callback"
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Show the refresh token so the user can save it
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Gmail OAuth Success</title></head>
        <body style="font-family: monospace; padding: 2rem; background: #111; color: #0f0;">
          <h2>Gmail OAuth2 — Token Retrieved</h2>
          <p>Add this to your <code>.env.local</code>:</p>
          <pre style="background: #222; padding: 1rem; border-radius: 8px; word-break: break-all;">GOOGLE_REFRESH_TOKEN=${tokens.refresh_token ?? "(no refresh token — re-auth with prompt=consent)"}</pre>
          <p>Then restart the dev server.</p>
          <p style="color: #888; margin-top: 2rem;">Access token (temporary): ${tokens.access_token?.slice(0, 20)}...</p>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Token exchange failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
