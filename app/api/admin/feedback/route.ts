import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // 🔐 Auth: ?token=...
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const ADMIN = process.env.ADMIN_TOKEN || "";
  if (!ADMIN || token !== ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 📁 Emplacements possibles des logs (prod Vercel vs local)
  const dirProd = "/tmp/coach-bleen";
  const dirLocal = path.join(process.cwd(), "data");
  const fileProd = path.join(dirProd, "debug.jsonl");
  const fileLocal = path.join(dirLocal, "debug.jsonl");

  // Choisir le premier fichier existant
  let fileToRead = fileLocal;
  try {
    await fs.access(fileProd);
    fileToRead = fileProd; // en prod Vercel, c'est ici
  } catch {
    try {
      await fs.access(fileLocal);
      fileToRead = fileLocal; // en local
    } catch {
      // aucun fichier -> pas encore de conversations
      return NextResponse.json([]);
    }
  }

  try {
    const raw = await fs.readFile(fileToRead, "utf8");
    const lines = raw.split("\n").filter(Boolean);

    // JSONL -> tableau d’entrées
    const entries = lines
      .map((line) => {
        try {
          const j = JSON.parse(line);
          return {
            ts: j.ts ?? j.timestamp ?? new Date().toISOString(),
            userText: j.userText ?? "",
            assistantText: j.assistantText ?? "",
            messages: Array.isArray(j.messages) ? j.messages : [],
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Array<{ ts: string; userText: string; assistantText: string; messages: any[] }>;

    // Les plus récentes d’abord, limite raisonnable
    entries.sort((a, b) => (a.ts > b.ts ? -1 : 1));
    return NextResponse.json(entries.slice(0, 200));
  } catch (e: any) {
    console.error("feedback read error:", e?.message || e);
    return NextResponse.json({ error: "Read error" }, { status: 500 });
  }
}
