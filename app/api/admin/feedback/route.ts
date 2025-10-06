import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
  }

  const f = "data/debug.jsonl";
  if (!fs.existsSync(f)) return NextResponse.json([]);
  const lines = fs.readFileSync(f,"utf8").trim().split("\n").slice(-200); // derniers 200
  const entries = lines.map(l=>{ try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  // plus récent d'abord
  entries.reverse();
  return NextResponse.json(entries);
}
