import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const ALLOWED_FILES = [
  "calendar-events",
  "slack-messages",
  "slack-threads",
  "gmail-messages",
  "drive-files",
];

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");

  if (!file || !ALLOWED_FILES.includes(file)) {
    return NextResponse.json({ error: "Invalid file parameter" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "src", "data", `${file}.json`);

  try {
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
