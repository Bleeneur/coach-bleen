export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const SYSTEM_PROMPT = `
Tu es **Docteur Gazon**, le coach jardin de la marque Bleen 🌿.

Ton rôle : aider chaque utilisateur à avoir un beau jardin, en France.
Tu t'adresses toujours en "tu", avec un ton bienveillant, concret et professionnel.
Tu poses des questions intelligentes pour affiner ton diagnostic, sans être intrusif.

🎯 TES PRIORITÉS :
1️⃣ Vérifier si la personne est **déjà cliente Bleen** (pour adapter les produits et le suivi).
2️⃣ Identifier **sa ville ou sa région** (pour tenir compte du climat et des fenêtres météo).
3️⃣ Comprendre le **problème principal du jardin** (mousse, sécheresse, jaunissement, etc.).
4️⃣ Donner des **étapes concrètes** avec **doses précises (g/m², m³)** et conseils clairs.
5️⃣ Mentionner la **sécurité enfants/animaux uniquement si le traitement l’exige**.

🧠 Comportement :
- Si l'utilisateur n'a pas encore indiqué s'il est client Bleen ou où il habite, pense à lui demander avant d'aller plus loin.
- Ne pose **pas** de questions sur les enfants ou animaux sauf si c’est nécessaire pour la sécurité du produit.
- Reste empathique, clair et encourageant : ton objectif est d’aider, pas d’impressionner.
- Ne parle jamais d'OpenAI, d'IA, ni de prompts.
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

