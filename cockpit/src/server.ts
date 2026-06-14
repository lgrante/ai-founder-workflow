// Daemon local J1 (lecture seule). Sert l'UI statique + une API board.
// Aucune session n'est lancée à ce stade (cf. ARCHITECTURE.md §10, jalon J1).
//
// API :
//   GET /api/board?repo=<chemin>   → BoardModel JSON
//   GET /                          → UI (cockpit/ui/index.html)
//
// Le(s) repo(s) cible(s) sont passés via la variable d'env COCKPIT_REPOS
// (liste séparée par ':') ou en query. Mono-utilisateur, bind localhost only.

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readBoard } from "./stateReader.ts";
import { inspectRepo } from "./repoRegistry.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(__dirname, "..", "ui");
const PORT = Number(process.env.COCKPIT_PORT ?? 4317);

function configuredRepos(): string[] {
  return (process.env.COCKPIT_REPOS ?? "")
    .split(":")
    .map((s) => s.trim())
    .filter(Boolean);
}

function json(res: import("node:http").ServerResponse, code: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/api/repos") {
    const repos = configuredRepos().map((p) => inspectRepo(p));
    return json(res, 200, { repos });
  }

  if (url.pathname === "/api/board") {
    const repo = url.searchParams.get("repo") ?? configuredRepos()[0];
    if (!repo) return json(res, 400, { error: "aucun repo (query ?repo= ou env COCKPIT_REPOS)" });
    return json(res, 200, readBoard(repo));
  }

  // UI statique (index seulement en J1)
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const file = join(UI_DIR, "index.html");
    if (existsSync(file)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(readFileSync(file));
    }
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  const repos = configuredRepos();
  console.log(`cockpit J1 (lecture seule) → http://127.0.0.1:${PORT}`);
  console.log(repos.length ? `repos : ${repos.join(", ")}` : "repos : (aucun — COCKPIT_REPOS vide)");
});
