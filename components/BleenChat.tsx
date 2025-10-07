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
        "Hello 🧑‍🌾, Enchanté ! Je me présente, je suis ton coach jardin et je vais t’accompagner tout au long de la saison. Comment puis-je t’aider ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    isClient: null,
    city: "",
    askedProfile: false,
  });

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
        if (prof && typeof prof === "object")
          setProfile({
            isClient: prof.isClient ?? null,
            city: prof.city ?? "",
            askedProfile: !!prof.askedProfile,
          });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // ——— Heuristiques (statut client + ville) ———
  function updateProfileFromText(text: string) {
    const t = text.toLowerCase();
    let updated = false;

    if (/\b(client(e)?|déjà client(e)?|oui je suis client)\b/.test(t) && profile.isClient !== true) {
      setProfile((p) => ({ ...p, isClient: true }));
      updated = true;
    } else if (/\b(pas client|non je ne suis pas|pas encore)\b/.test(t) && profile.isClient !== false) {
      setProfile((p) => ({ ...p, isClient: false }));
      updated = true;
    }

    const m = text.match(/\b(?:à|sur)\s+([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÿ\-']{1,})/);
    if (m?.[1] && !profile.city) {
      setProfile((p) => ({ ...p, city: m[1] }));
      updated = true;
    }

    // 🔕 Dès qu’on récupère au moins UNE info, on empêche toute relance auto
    if (updated && !profile.askedProfile) {
      setProfile((p) => ({ ...p, askedProfile: true }));
    }
  }

  // ——— Anti-doublon “client+ville” ———
  function hasRecentlyAskedClientVille(msgs: Msg[], maxBack = 6) {
    const recent = msgs.slice(-maxBack).filter((m) => m.role === "assistant");
    const reClient = /client\s+bleen/i;
    const reVille = /(ville|région)/i;
    return recent.some((m) => reClient.test(m.content) && reVille.test(m.content));
  }

  // Ne pose la question qu’une seule fois max, seulement si info manquante
  function maybeAskProfile(assistantContent?: string) {
    if (profile.askedProfile) return;                           // déjà posée une fois → stop
    if (profile.isClient !== null || profile.city) return;      // on a déjà une info → stop

    const justAskedByAI =
      !!assistantContent &&
      /client\s+bleen/i.test(assistantContent) &&
      /(ville|région)/i.test(assistantContent);
    if (justAskedByAI) {
      setProfile((p) => ({ ...p, askedProfile: true }));
      return;
    }

    if (hasRecentlyAskedClientVille(messages, 6)) {
      setProfile((p) => ({ ...p, askedProfile: true }));
      return;
    }

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

  // ——— Nurture pelouse/gazon selon statut ———
  function hasRecentNurture(msgs: Msg[], maxBack = 6) {
    const recent = msgs.slice(-maxBack).filter((m) => m.role === "assistant");
    return recent.some(
      (m) =>
        /diagnostic personnalisé/i.test(m.content) ||
        /qu'as-tu fait.*cette saison/i.test(m.content) ||
        /quels produits.*reste/i.test(m.content)
    );
  }

  function maybeNurtureForLawn(userText: string) {
    const talksLawn = /(pelouse|gazon)/i.test(userText);
    if (!talksLawn) return;
    if (hasRecentNurture(messages, 6)) return;

    if (profile.isClient === false) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Tu peux faire ton **diagnostic personnalisé** en 2 minutes ici 👉 [mybleen.com/pages/mon-gazon](https://mybleen.com/pages/mon-gazon). Ça me donnera tes conditions exactes et je pourrai te guider avec des doses précises.",
        },
      ]);
    } else if (profile.isClient === true) {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Top 👌 Comme tu es déjà client, dis-moi **ce que tu as fait depuis le début de la saison** (scarification, engrais, semis, arrosage…) et **quels produits il te reste en stock**. Je t’organise les prochaines étapes.",
        },
      ]);
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

      // 1) Relance client+ville (si jamais posée et info manquante)
      setTimeout(() => maybeAskProfile(assistantMsg.content), 30);
      // 2) Relance “diagnostic/stock” si pelouse/gazon détecté
      setTimeout(() => maybeNurtureForLawn(userText), 60);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: `❌ Erreur réseau : ${e?.message || e}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full shadow px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Docteur Gazon
        </button>
      ) : (
        <div className="w-96 h-[640px] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xl rounded-2xl flex flex-col border border-neutral-200 dark:border-neutral-700">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3 bg-[var(--bleen-50)] dark:bg-emerald-900/20">
            <img
              src="/docteur-gazon.png"
              alt="Docteur Gazon"
              className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700"
            />
            <div className="font-semibold">Docteur Gazon</div>
            <button onClick={() => setOpen(false)} className="ml-auto opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
                {m.role === "user" ? (
                  <div className="inline-block px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap bg-gray-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100">
                    {m.content}
                  </div>
                ) : (
                  <div className="inline-block px-3 py-2 rounded-xl max-w-[85%] bg-emerald-50 dark:bg-emerald-900/30 text-neutral-900 dark:text-neutral-100">
                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-sm opacity-70">Docteur Gazon écrit…</div>}
          </div>

          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décris ton souci (ville, surface, animaux…)"
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="flex-1 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
            <button
              onClick={send}
              className="text-white rounded-lg px-3 py-2 bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:focus:ring-emerald-300 transition"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
