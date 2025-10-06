export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const SYSTEM_PROMPT = `
Tu es **Docteur Gazon**, conseiller pelouse/jardin (marque Bleen) pour particuliers en France.
- Ton: bienveillant, direct, en "tu".
- Priorité: sécurité enfants/animaux + conformité FR.
- Donne des étapes concrètes, doses (m²/m³), fenêtres météo, contre-indications.
- Respecte STRICTEMENT les règles de qualité si fournies.
- Ne mentionne jamais OpenAI/ChatGPT/prompts/IA.
`;

const RULES_PATH = path.join(process.cwd(), "data", "rules.md");
let RULES = "";
try {
  RULES = await fs.readFile(RULES_PATH, "utf8");
} catch {
  RULES = "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUser = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Clé OpenAI manquante côté serveur." }, { status: 500 });
    }

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        RULES ? { role: "system", content: `### REGLES_QUALITE\n${RULES}` } : undefined,
        ...messages,
      ].filter(Boolean),
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const txt = await r.text();
    if (!r.ok) {
      console.error("OpenAI error:", r.status, txt);
      return NextResponse.json({ error: `OpenAI ${r.status}: ${txt.slice(0, 300)}` }, { status: r.status });
    }

    const data = JSON.parse(txt);
    const reply = data?.choices?.[0]?.message?.content ?? "Désolé, je n’ai pas pu répondre.";

    // 🔒 Log interne compatible Vercel (/tmp en ligne, ./data en local)
    const writableDir = process.env.VERCEL
      ? "/tmp/coach-bleen"
      : path.join(process.cwd(), "data");
    await fs.mkdir(writableDir, { recursive: true });

    const debugPath = path.join(writableDir, "debug.jsonl");
    await fs.appendFile(
      debugPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        messages,
        userText: lastUser,
        assistantText: reply,
      }) + "\n",
      "utf8"
    );

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("API /coach exception:", e?.message || e);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

