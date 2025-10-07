import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: Request) {
  // 🔐 Auth admin via token en query ou header
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("token") || "";
  const tokenFromHeader = req.headers.get("x-admin-token") || "";
  const ADMIN = process.env.ADMIN_TOKEN || "";
  const ok = ADMIN && (tokenFromQuery === ADMIN || tokenFromHeader === ADMIN);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 📨 Données attendues
  const body = await req.json();
  const {
    entryId,            // string (id ou timestamp de l’échange côté admin)
    original,           // string (texte assistant avant)
    edited,             // string (nouveau texte édité)
    messages = [],      // array (contexte conversation)
    note = "",          // string (optionnel: pourquoi cette édition)
  } = body || {};

  if (!edited || typeof edited !== "string") {
    return NextResponse.json({ error: "Texte édité manquant" }, { status: 400 });
  }

  // 📄 On journalise l’édition (append-only)
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      action: "edit_assistant_reply",
      entryId: entryId ?? null,
      original: original ?? null,
      edited,
      note,
      messages,
    }) + "\n";

  // 🖴 Chemin d’écriture (Vercel: /tmp ; Local: ./data)
  const dir = process.env.VERCEL ? "/tmp/coach-bleen" : path.join(process.cwd(), "data");
  const file = path.join(dir, "corrections.jsonl");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, line, "utf8");

  // ✅ Réponse
  return NextResponse.json({ ok: true });
}
