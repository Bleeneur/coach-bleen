import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rec = {
      ts: new Date().toISOString(),
      ...body,                                    // {msgId, rating, tags, comment, userText, assistantText}
      ua: req.headers.get("user-agent") || "",
    };
    fs.mkdirSync("data", { recursive: true });
    fs.appendFileSync("data/feedback.jsonl", JSON.stringify(rec) + "\n", "utf8");
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    console.error("feedback error", e?.message||e);
    return NextResponse.json({ ok:false }, { status:500 });
  }
}
