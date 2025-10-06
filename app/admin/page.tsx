"use client";
import { useEffect, useState } from "react";

type Entry = { ts: string; userText: string; assistantText: string; messages: any[] };

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [critique, setCritique] = useState("");

  // 🧩 Récupère automatiquement le token de l’URL
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
  }, []);

  async function load() {
    const r = await fetch(`/api/admin/feedback?token=${encodeURIComponent(token)}`);
    if (!r.ok) {
      alert("Accès refusé (token ?)");
      return;
    }
    setEntries(await r.json());
  }

  async function improve(e: Entry) {
    if (!critique.trim()) {
      alert("Écris une critique (ce que tu veux corriger)");
      return;
    }

    const r = await fetch(`/api/admin/improve?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: e.messages, critique }),
    });

    const data = await r.json();
    if (!r.ok) {
      alert(data?.error || "Erreur");
      return;
    }

    alert("Réponse améliorée :\n\n" + data.reply);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Console interne – Docteur Gazon</h1>
      <div className="flex gap-2 items-center mb-4">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={load}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: "var(--bleen)" }}
        >
          Charger
        </button>
      </div>

      <div className="mb-3">
        <textarea
          value={critique}
          onChange={(e) => setCritique(e.target.value)}
          placeholder="Ta critique / consigne d'amélioration (ex: Ajoute doses exactes g/m², sécurité enfants/animaux, étapes numérotées…)"
          className="w-full border rounded p-2"
          rows={3}
        />
      </div>

      {entries.map((e, i) => (
        <div key={i} className="border rounded p-3 mb-4 bg-white">
          <div className="text-xs opacity-60">{e.ts}</div>
          <div className="mt-2 font-semibold">Question (user) :</div>
          <pre className="bg-gray-50 p-2 whitespace-pre-wrap">{e.userText || "(n/a)"}</pre>
          <div className="mt-2 font-semibold">Réponse (assistant) :</div>
          <pre className="bg-green-50 p-2 whitespace-pre-wrap">{e.assistantText}</pre>
          <button
            onClick={() => improve(e)}
            className="mt-2 px-3 py-1 rounded text-white"
            style={{ backgroundColor: "var(--bleen)" }}
          >
            Améliorer cette réponse (privé)
          </button>
        </div>
      ))}
    </main>
  );
}
