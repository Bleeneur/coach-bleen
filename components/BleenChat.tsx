"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type Profile = { isClient: boolean | null; city: string; askedProfile: boolean };

const STORAGE_KEY = "dg-chat-v1";
const PROFILE_KEY = "dg-profile-v1";

export default function DocteurGazonChat() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        'Hello 🧑‍🌾, Enchanté ! Je me présente, je suis ton coach jardin et je vais t’accompagner tout au long de la saison. Comment puis-je t’aider ?',
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({ isClient: null, city: "", askedProfile: false });

  // ——— Persistance messages + profil ———
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p)) setMessages(p);
      }
      const rawProf = localStorage.getItem(PROFILE_KEY);
      if (rawProf) {
        const prof = JSON.parse(rawProf) as Profile;
        if (prof && typeof prof === "object") setProfile({ isClient: prof.isClient ?? null, city: prof.city ?? "", askedProfile: !!prof.askedProfile });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // ——— Petites heuristiques ultra-simples pour déduire ville/statut client depuis le texte saisi ———
  function updateProfileFromText(text: string) {
    const t = text.toLowerCase();

    // client ?
    if (/\b(client(e)?|déjà client(e)?|oui je suis client)\b/.test(t)) {
      setProfile((p) => ({ ...p, isClient: true }));
    } else if (/\b(pas client|non je ne suis pas|pas encore)\b/.test(t)) {
      setProfile((p) => ({ ...p, isClient: false }));
    }

    // ville (capture naïve après "à " ou "sur ")
    const m = text.match(/\b(?:à|sur)\s+([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÿ\-']{1,})/);
    if (m?.[1] && !profile.city) {
      setProfile((p) => ({ ...p, city: m[1] }));
    }
  }

  // ——— Pose les 2 questions si on ne sait toujours pas ———
  function maybeAskProfile() {
    if (!profile.askedProfile && (profile.isClient === null || !profile.city)) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Petite question pour affiner 👇\n\n1) Es-tu **déjà client Bleen** ?\n2) Tu es **dans quelle ville** ?\n\nÇa m’aide à ajuster les doses, le timing et les conseils météo.",
        },
      ]);
      setProfile((p) => ({ ...p, askedProfile: true }));
    }
  }

  // ——— Envoi ———
  async function send() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: userText };
    setMessages((m) => [...m, userMsg]);
    updateProfileFromText(userText);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await r.json();

      const assistantMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: r.ok ? data.reply ?? "Désolé, je n’ai pas pu répondre." : `❌ ${data?.error || "Erreur inconnue"}`,
      };
      setMessages((m) => [...m, assistantMsg]);

      // Après la 1re interaction utilisateur, si on ne sait pas encore -> poser les 2 questions
      setTimeout(maybeAskProfile, 50);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `❌ Erreur réseau : ${e?.message || e}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quick = [
    "Ma pelouse jaunit après la chaleur",
    "Programme annuel engrais + semences",
    "Comment éliminer la mousse ?",
    "Arrosage intelligent (ville + surface)",
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-full shadow px-4 py-2 text-white" style={{ backgroundColor: "var(--bleen)" }}>
          Docteur Gazon
        </button>
      ) : (
        <div className="w-96 h-[640px] bg-white shadow-2xl rounded-2xl flex flex-col border">
          <div className="p-4 border-b flex items-center gap-3" style={{ backgroundColor: "var(--bleen-50)" }}>
            <img src="/docteur-gazon.png" alt="Docteur Gazon" className="w-10 h-10 rounded-full border" />
            <div className="font-semibold">Docteur Gazon</div>
            <button onClick={() => setOpen(false)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block px-3 py-2 rounded-xl max-w-[85%] ${
                    m.role === "user" ? "bg-gray-200 whitespace-pre-wrap" : "bg-green-50"
                  }`}
                  style={m.role === "assistant" ? { backgroundColor: "var(--bleen-50)" } : undefined}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm opacity-70">Docteur Gazon écrit…</div>}
          </div>

          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                  setTimeout(send, 10);
                }}
                className="text-sm px-3 py-1 rounded-full border"
                style={{ borderColor: "var(--bleen)", color: "var(--bleen)" }}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décris ton souci (ville, surface, animaux…)"
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button onClick={send} className="text-white rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bleen)" }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
