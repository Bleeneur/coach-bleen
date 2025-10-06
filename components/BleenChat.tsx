"use client";
import { useEffect, useState } from "react";
type Msg = { id:string; role:"user"|"assistant"; content:string };

const STORAGE_KEY = "dg-chat-v1";

export default function DocteurGazonChat() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([
    { id: crypto.randomUUID(), role:"assistant", content:
      "Salut, je suis **Docteur Gazon** 🌿\nDis-moi ta ville et ce que tu veux améliorer (pelouse jaunie, mousse, regarnissage, arrosage…). Je te donne un plan d’action clair, doses incluses." }
  ]);
  const [input, setInput] = useState(""); 
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ try{localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));}catch{} },[messages]);
  useEffect(()=>{ try{const raw=localStorage.getItem(STORAGE_KEY); if(raw){const p=JSON.parse(raw); if(Array.isArray(p)) setMessages(p);} }catch{} },[]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role:"user", content: input.trim() };
    setMessages(m=>[...m, userMsg]); setInput(""); setLoading(true);
    try {
      const r = await fetch("/api/coach", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ messages: [...messages, userMsg] }) });
      const data = await r.json();
      const assistantMsg: Msg = { id: crypto.randomUUID(), role:"assistant", content: r.ok ? (data.reply ?? "Désolé, je n’ai pas pu répondre.") : `❌ ${data?.error||"Erreur inconnue"}` };
      setMessages(m=>[...m, assistantMsg]);
    } catch(e:any){
      setMessages(m=>[...m, { id: crypto.randomUUID(), role:"assistant", content:`❌ Erreur réseau : ${e?.message||e}` }]);
    } finally { setLoading(false); }
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
        <button onClick={()=>setOpen(true)} className="rounded-full shadow px-4 py-2 text-white" style={{ backgroundColor:"var(--bleen)" }}>
          Docteur Gazon
        </button>
      ) : (
        <div className="w-96 h-[640px] bg-white shadow-2xl rounded-2xl flex flex-col border">
          <div className="p-4 border-b flex items-center gap-3" style={{ backgroundColor:"var(--bleen-50)" }}>
            <img src="/docteur-gazon.png" alt="Docteur Gazon" className="w-10 h-10 rounded-full border" />
            <div className="font-semibold">Docteur Gazon</div>
            <button onClick={()=>setOpen(false)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m)=>(
              <div key={m.id} className={m.role==="user"?"text-right":""}>
                <div className={`inline-block px-3 py-2 rounded-xl max-w-[85%] whitespace-pre-wrap ${m.role==="user"?"bg-gray-200":"bg-green-50"}`}
                  style={m.role==="assistant"?{ backgroundColor:"var(--bleen-50)"}:undefined}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-sm opacity-70">Docteur Gazon écrit…</div>}
          </div>

          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quick.map((q)=>(
              <button key={q} onClick={()=>{ setInput(q); setTimeout(send, 10)}}
                className="text-sm px-3 py-1 rounded-full border"
                style={{ borderColor:"var(--bleen)", color:"var(--bleen)" }}>
                {q}
              </button>
            ))}
          </div>

          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)}
              placeholder="Décris ton souci (ville, surface, animaux…)"
              onKeyDown={e=> e.key==="Enter" && send()}
              className="flex-1 border rounded-lg px-3 py-2" />
            <button onClick={send} className="text-white rounded-lg px-3 py-2" style={{ backgroundColor:"var(--bleen)" }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
