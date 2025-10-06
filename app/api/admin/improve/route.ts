import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: Request) {
  // 🔐 Vérification du token (query ou header)
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("token") || "";
  const tokenFromHeader = req.headers.get("x-admin-token") || "";
  const ADMIN = process.env.ADMIN_TOKEN || "";

  const ok = ADMIN && (tokenFromQuery === ADMIN || tokenFromHeader === ADMIN);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 📨 Lecture du corps de la requête
  const body = await req.json();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const critique = (body?.critique || "").toString();

  if (!critique)
    return NextResponse.json({ error: "Critique manquante" }, { status: 400 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      { error: "OPENAI_API_KEY manquante" },
      { status: 500 }
    );

  // 🧠 Construction du prompt d’amélioration
  const booster = {
    role: "system",
    content: `Améliore la dernière réponse du conseiller en appliquant STRICTEMENT cette critique:\n${critique}\n
Exige: doses (g/m², m³) si pertinentes, sécurité enfants/animaux, étapes numérotées, fenêtres météo.\n
Si info manquante, poser 1–3 questions maximum.`,
  };

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [booster, ...messages],
  };

  // 🚀 Appel à l’API OpenAI
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const txt = await r.text();
  if (!r.ok)
    return NextResponse.json(
      { error: `OpenAI ${r.status}: ${txt.slice(0, 300)}` },
      { status: r.status }
    );

  const data = JSON.parse(txt);
  const improvedText = data?.choices?.[0]?.message?.content || "";

  // 🧾 Enregistrement local
  try {
    const line =
      JSON.stringify({
        timestamp: new Date().toISOString(),
        action: "improve",
        original: body?.original ?? null,
        prompt: body?.prompt ?? null,
        improved: improvedText,
      }) + "\n";

    const correctionsPath = path.join(
      process.cwd(),
      "data",
      "corrections.jsonl"
    );
    await fs.mkdir(path.dirname(correctionsPath), { recursive: true });
    await fs.appendFile(correctionsPath, line, "utf8");
  } catch (err) {
    console.error("Erreur écriture correction :", err);
  }

  // ✅ Réponse finale
  return NextResponse.json({ reply: improvedText });
}
