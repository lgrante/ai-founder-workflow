// Store — le SEUL état que le cockpit possède (cf. ARCHITECTURE.md §5) : runtime des
// sessions + log de stream. JAMAIS l'avancement métier (ça vit dans les fichiers du
// repo cible). SQLite natif de Node (`node:sqlite`, zéro dépendance).

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type RuntimeState = "running" | "waiting-gate" | "done" | "error" | "killed";

export interface SessionRow {
  id: string;
  repo_path: string;
  type: string;
  slug: string;
  branch: string;
  workdir: string;
  sdk_session_id: string | null;
  runtime_state: RuntimeState;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: number;
  session_id: string;
  ts: string;
  kind: string;
  text: string;
}

export class Store {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        repo_path TEXT NOT NULL,
        type TEXT NOT NULL,
        slug TEXT NOT NULL,
        branch TEXT NOT NULL,
        workdir TEXT NOT NULL,
        sdk_session_id TEXT,
        runtime_state TEXT NOT NULL,
        prompt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        ts TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT ''
      );
    `);
  }

  createSession(s: Omit<SessionRow, "created_at" | "updated_at">): SessionRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO session (id, repo_path, type, slug, branch, workdir, sdk_session_id, runtime_state, prompt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(s.id, s.repo_path, s.type, s.slug, s.branch, s.workdir, s.sdk_session_id, s.runtime_state, s.prompt, now, now);
    return { ...s, created_at: now, updated_at: now };
  }

  setState(id: string, state: RuntimeState): void {
    this.db
      .prepare(`UPDATE session SET runtime_state = ?, updated_at = ? WHERE id = ?`)
      .run(state, new Date().toISOString(), id);
  }

  setSdkSessionId(id: string, sdkId: string): void {
    this.db
      .prepare(`UPDATE session SET sdk_session_id = ?, updated_at = ? WHERE id = ?`)
      .run(sdkId, new Date().toISOString(), id);
  }

  appendEvent(sessionId: string, kind: string, text = ""): void {
    this.db
      .prepare(`INSERT INTO event_log (session_id, ts, kind, text) VALUES (?, ?, ?, ?)`)
      .run(sessionId, new Date().toISOString(), kind, text);
  }

  getSession(id: string): SessionRow | undefined {
    return this.db.prepare(`SELECT * FROM session WHERE id = ?`).get(id) as SessionRow | undefined;
  }

  listSessions(repoPath?: string): SessionRow[] {
    const rows = repoPath
      ? this.db.prepare(`SELECT * FROM session WHERE repo_path = ? ORDER BY created_at DESC`).all(repoPath)
      : this.db.prepare(`SELECT * FROM session ORDER BY created_at DESC`).all();
    return rows as SessionRow[];
  }

  getEvents(sessionId: string): EventRow[] {
    return this.db
      .prepare(`SELECT * FROM event_log WHERE session_id = ? ORDER BY id ASC`)
      .all(sessionId) as EventRow[];
  }

  close(): void {
    this.db.close();
  }
}
