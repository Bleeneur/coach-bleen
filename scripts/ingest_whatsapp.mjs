import fs from "node:fs";
import path from "node:path";

// USAGE: node scripts/ingest_whatsapp.mjs data/raw/whatsapp.csv
// CSV attendu: timestamp,author,role,message  (role = user|assistant)
const src = process.argv[2];
if (!src) { console.error("Usage: node scripts/ingest_whatsapp.mjs <csv>"); process.exit(1); }

const csv = fs.readFileSync(src, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const header = lines.shift().split(",");
const idx = (k)=> header.indexOf(k);

const rows = lines.map(l=>{
  const cols = l.split(",");
  return {
    timestamp: cols[idx("timestamp")] || "",
    author: cols[idx("author")] || "",
    role: (cols[idx("role")]||"").toLowerCase(),
    message: cols.slice(3).join(",").replaceAll("\\n","\n")
  };
});

// on regroupe par conversation (naïf: par “pause longue” ou par jour)
let convs = [];
let current = [];
let lastTs = null;

for (const r of rows) {
  if (!lastTs) { current.push(r); lastTs = r.timestamp; continue; }
  const same = r.timestamp.slice(0,10) === String(lastTs).slice(0,10);
  if (!same && current.length) { convs.push(current); current = [r]; }
  else current.push(r);
  lastTs = r.timestamp;
}
if (current.length) convs.push(current);

// rend en Q/R
const outDir = "data/corpus/whatsapp";
fs.mkdirSync(outDir, { recursive: true });

convs.forEach((conv, i)=>{
  const blocks = [];
  for (let k=0; k<conv.length; k++) {
    const r = conv[k];
    if (r.role==="user") {
      const q = r.message.trim();
      // cherche la 1ère réponse “assistant” qui suit
      const a = (conv.slice(k+1).find(x=>x.role==="assistant")||{}).message || "";
      if (q && a) {
        blocks.push(`### Q\n${q}\n\n### A\n${a}\n`);
      }
    }
  }
  if (blocks.length) {
    const md = `# WhatsApp Conversation ${i+1}\n\n${blocks.join("\n")}`;
    fs.writeFileSync(path.join(outDir, `conv_${i+1}.md`), md, "utf8");
  }
});
console.log(`OK: ${convs.length} conversations traitées -> ${outDir}`);
