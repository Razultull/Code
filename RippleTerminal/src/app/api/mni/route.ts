import { NextResponse } from "next/server";
import { mniClient } from "@/lib/mni-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await mniClient.ensureInitialized();
    // Return articles newest-first
    const articles = [...mniClient.articles].reverse();
    return NextResponse.json(articles);
  } catch (e) {
    console.error("[API/MNI] Error:", (e as Error).message);
    return NextResponse.json(
      { error: "MNI feed unavailable", message: (e as Error).message },
      { status: 503 }
    );
  }
}
