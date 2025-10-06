import fs from "node:fs";
const f = "data/feedback.jsonl";
if (!fs.existsSync(f)) { console.log("Aucun feedback pour l’instant."); process.exit(0); }
const lines = fs.readFileSync(f,"utf8").trim().split("\n").map(l=>JSON.parse(l));
const total = lines.length;
const up = lines.filter(x=>x.rating==="up").length;
const down = total - up;
const tagCount = {};
for (const l of lines) for (const t of (l.tags||[])) tagCount[t]=(tagCount[t]||0)+1;
const topTags = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
const md = `# Rapport Feedback
Total: ${total} | 👍 ${up} | 👎 ${down}

## Tags les plus fréquents
${topTags.map(([t,n])=>`- ${t}: ${n}`).join("\n")}

## Exemples récents (5)
${lines.slice(-5).map(l=>`- ${l.ts} — ${l.rating} — ${ (l.tags||[]).join(", ") }
  - Commentaire: ${l.comment||"-"}
  - Extrait (assistant): ${ (l.assistantText||"").slice(0,140) }…`).join("\n")}
`;
fs.writeFileSync("data/feedback_report.md", md, "utf8");
console.log("OK: data/feedback_report.md");
