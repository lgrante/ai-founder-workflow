// CLI de vérification du J1 — imprime le board d'un repo cible sans navigateur.
// Usage : npm run board -- <chemin-du-repo>

import { readBoard } from "./stateReader.ts";

const repoPath = process.argv[2] ?? process.cwd();
const board = readBoard(repoPath);

if (!board.pilotable) {
  console.log(`✗ ${board.repoPath}\n  non pilotable : ${board.reason}`);
  process.exit(0);
}

console.log(`✓ Board — ${board.repoPath}\n`);

console.log("BUILD (par feature)");
if (board.features.length === 0) console.log("  (aucune feature)");
for (const f of board.features) {
  const { done, total } = f.steps;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const flags = [f.hasSpec ? "spec" : null, f.hasPlan ? "plan" : null].filter(Boolean).join("+");
  console.log(`  • ${f.slug} — ${done}/${total} étapes (${pct}%) [${flags || "vide"}]`);
  for (const m of f.milestones) {
    console.log(`      ${m.title} : ${m.steps.done}/${m.steps.total}`);
  }
}

console.log("\nBACKLOG");
if (board.backlog.length === 0) console.log("  (vide)");
for (const b of board.backlog) {
  console.log(`  • [${b.priorite}] ${b.titre} — ${b.statut} (source: ${b.source})`);
}

console.log("\nCONTENT (par sujet)");
if (board.content.length === 0) console.log("  (aucun channel)");
for (const c of board.content) {
  const parts = Object.entries(c.counts).map(([s, n]) => `${s}:${n}`);
  console.log(`  • ${c.channel} — ${parts.join(" ") || "vide"}`);
}

const d = board.discovery;
console.log("\nDISCOVERY");
console.log(
  `  market:${d.hasMarket ? "oui" : "non"} insights:${d.hasInsights ? "oui" : "non"} ` +
    `support-clients:${d.supportClients.length} feedback-contacts:${d.feedbackContacts}`,
);
