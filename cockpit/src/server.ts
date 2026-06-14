// Daemon local. J1 (lecture seule) + J2 (lancer une session sans porte via le SDK/CLI).
// Mono-utilisateur, bind localhost only. L'humain reste dans la boucle : une session
// ne part que sur POST explicite (clic UI).
//
// API :
//   GET  /api/repos                       → repos configurés + pilotabilité
//   GET  /api/board?repo=<chemin>         → BoardModel JSON (lecture seule)
//   GET  /api/sessions?repo=<chemin>      → sessions connues (runtime)
//   POST /api/sessions {repo,type,slug}   → lance une session, renvoie la ligne créée
//   GET  /api/sessions/:id/events         → SSE : replay + flux live des événements
//   GET  /                                → UI

import { createServer, type ServerResponse, type IncomingMessage } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { readBoard } from "./stateReader.ts";
import { inspectRepo } from "./repoRegistry.ts";
import { SESSION_TYPES } from "./domain/sessionTypes.ts";
import { Store } from "./store.ts";
import { SessionManager } from "./sessionManager.ts";
import { ClaudeCliRunner, type SessionRunner } from "./runner/sessionRunner.ts";
import { FakeRunner, happyScript } from "./runner/fakeRunner.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(__dirname, "..", "ui");
const PORT = Number(process.env.COCKPIT_PORT ?? 4317);
const DB_PATH = process.env.COCKPIT_DB ?? join(homedir(), ".ai-founder-cockpit", "cockpit.db");

const store = new Store(DB_PATH);
// COCKPIT_FAKE=1 → runner factice (dev UI / démo sans tokens) ; sinon vrai binaire claude.
const runner: SessionRunner = process.env.COCKPIT_FAKE ? new FakeRunner(happyScript) : new ClaudeCliRunner();
const manager = new SessionManager(store, runner);

function configuredRepos(): string[] {
  return (process.env.COCKPIT_REPOS ?? "")
    .split(":")
    .map((s) => s.trim())
    .filter(Boolean);
}

function json(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sse(res: ServerResponse, id: string): void {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  // replay de l'historique persisté
  for (const e of store.getEvents(id)) {
    res.write(`data: ${JSON.stringify({ kind: e.kind, text: e.text, ts: e.ts })}\n\n`);
  }
  const session = store.getSession(id);
  if (session && (session.runtime_state === "done" || session.runtime_state === "error")) {
    res.write(`event: end\ndata: ${session.runtime_state}\n\n`);
    return res.end();
  }
  // flux live
  const unsub = manager.subscribe(id, (ev) => {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
    if (ev.kind === "result" || ev.kind === "error") {
      res.write(`event: end\ndata: ${ev.kind}\n\n`);
      res.end();
    }
  });
  res.on("close", unsub);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const method = req.method ?? "GET";

    if (url.pathname === "/api/repos") {
      return json(res, 200, { repos: configuredRepos().map((p) => inspectRepo(p)) });
    }

    if (url.pathname === "/api/types") {
      return json(res, 200, {
        types: SESSION_TYPES.map((t) => ({ type: t.type, skill: t.skill, axe: t.axe })),
      });
    }

    if (url.pathname === "/api/board") {
      const repo = url.searchParams.get("repo") ?? configuredRepos()[0];
      if (!repo) return json(res, 400, { error: "aucun repo (query ?repo= ou env COCKPIT_REPOS)" });
      return json(res, 200, readBoard(repo));
    }

    if (url.pathname === "/api/sessions" && method === "GET") {
      const repo = url.searchParams.get("repo") ?? undefined;
      return json(res, 200, { sessions: store.listSessions(repo) });
    }

    if (url.pathname === "/api/sessions" && method === "POST") {
      const body = await readBody(req);
      const { repo, type, slug } = body ?? {};
      if (!repo || !type || !slug) return json(res, 400, { error: "repo, type, slug requis" });
      const status = inspectRepo(repo);
      if (!status.pilotable) return json(res, 409, { error: status.reason });
      try {
        const { session } = manager.launch({ repoPath: status.path, type, slug });
        return json(res, 201, { session });
      } catch (e) {
        return json(res, 409, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    const evMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/events$/);
    if (evMatch && method === "GET") {
      if (!store.getSession(evMatch[1])) return json(res, 404, { error: "session inconnue" });
      return sse(res, evMatch[1]);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = join(UI_DIR, "index.html");
      if (existsSync(file)) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(readFileSync(file));
      }
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const repos = configuredRepos();
  console.log(`cockpit (J2) → http://127.0.0.1:${PORT}  ·  db: ${DB_PATH}`);
  console.log(repos.length ? `repos : ${repos.join(", ")}` : "repos : (aucun — COCKPIT_REPOS vide)");
});
