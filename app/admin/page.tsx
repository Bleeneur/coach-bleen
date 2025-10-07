"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Entry = { ts: string; userText: string; assistantText: string; messages: any[] };

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [critique, setCritique] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [note, setNote] = useState("");

  // Récupère automatiquement le token depuis l'URL
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

  // Bouton "Améliorer la réponse" (IA)
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
    alert("Réponse améliorée (IA):\n\n" + data.reply);
  }

  // Passe une carte en mode édition
  function startEdit(e: Entry) {
    setEditingId(e.ts);
    setEditedText(e.assistantText || "");
    setNote("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditedText("");
    setNote("");
  }

  // Enregistre la version éditée (manuel) via /api/admin/edit
  async function saveEdit(e: Entry) {
    if (!editedText.trim()) {
      alert("Le texte édité est vide");
      return;
    }
    const r = await fetch(`/api/admin/edit?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: e.ts,
        original: e.assistantText,
        edited: editedText,
        messages: e.messages,
        note,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      alert(data?.error || "Erreur");
      return;
    }
    // Mets à jour l’affichage localement
    setEntries((prev) =>
      prev.map((x) => (x.ts === e.ts ? { ...x, assistantText: editedText } : x))
    );
    cancelEdit();
    alert("✅ Réponse éditée enregistrée");
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
          placeholder="Ta critique / consigne d'amélioration (ex: Ajoute doses exactes g/m², étapes numérotées…)"
          className="w-full border rounded p-2"
          rows={3}
        />
      </div>

      {entries.map((e) => {
        const isEditing = editingId === e.ts;
        return (
          <div key={e.ts} className="border rounded p-3 mb-4 bg-white">
            <div className="text-xs opacity-60">{e.ts}</div>

            <div className="mt-2 font-semibold">Question (user) :</div>
            <pre className="bg-gray-50 p-2 whitespace-pre-wrap">{e.userText || "(n/a)"}</pre>

            <div className="mt-2 font-semibold">Réponse (assistant) :</div>

            {!isEditing ? (
              <>
                <div className="bg-green-50 p-2 whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {e.assistantText || ""}
                  </ReactMarkdown>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => improve(e)}
                    className="px-3 py-1 rounded text-white"
                    style={{ backgroundColor: "var(--bleen)" }}
                  >
                    Améliorer (IA)
                  </button>
                  <button
                    onClick={() => startEdit(e)}
                    className="px-3 py-1 rounded border"
                    style={{ borderColor: "var(--bleen)", color: "var(--bleen)" }}
                  >
                    Éditer manuellement
                  </button>
                </div>
              </>
            ) : (
              <>
                <textarea
                  value={editedText}
                  onChange={(ev) => setEditedText(ev.target.value)}
                  className="w-full border rounded p-2"
                  rows={6}
                />
                <input
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  placeholder="Note interne (optionnelle)"
                  className="mt-2 w-full border rounded px-2 py-1"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => saveEdit(e)}
                    className="px-3 py-1 rounded text-white"
                    style={{ backgroundColor: "var(--bleen)" }}
                  >
                    Enregistrer l’édition
                  </button>
                  <button onClick={cancelEdit} className="px-3 py-1 rounded border">
                    Annuler
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </main>
  );
}
