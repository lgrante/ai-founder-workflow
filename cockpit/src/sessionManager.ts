// Session Manager — orchestre git → runner → store → bus (cf. ARCHITECTURE.md §4).
// L'humain reste dans la boucle : une session ne démarre que sur appel explicite
// (clic UI). Aucune auto-orchestration.

import { randomUUID } from "node:crypto";
import type { SessionRunner } from "./runner/sessionRunner.ts";
import type { RunnerEvent } from "./runner/events.ts";
import { Store, type SessionRow } from "./store.ts";
import { ensureBranch, resolveSessionWorkdir } from "./gitManager.ts";
import { sessionTypeByName, resolveBranch, type PermissionMode } from "./domain/sessionTypes.ts";

export interface LaunchRequest {
  repoPath: string;
  type: string;
  slug: string;
}

type Listener = (ev: RunnerEvent) => void;

export class SessionManager {
  private listeners = new Map<string, Set<Listener>>();
  private readonly store: Store;
  private readonly runner: SessionRunner;

  constructor(store: Store, runner: SessionRunner) {
    this.store = store;
    this.runner = runner;
  }

  /** S'abonne au flux d'événements d'une session (pour SSE). Renvoie le désabonnement. */
  subscribe(sessionId: string, fn: Listener): () => void {
    let set = this.listeners.get(sessionId);
    if (!set) this.listeners.set(sessionId, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  private emit(sessionId: string, ev: RunnerEvent): void {
    this.listeners.get(sessionId)?.forEach((fn) => fn(ev));
  }

  /**
   * Lance une session : résout/crée la branche, persiste, puis consomme le stream
   * du runner en tâche de fond. Renvoie la ligne créée + une promesse de fin (utile
   * aux tests ; le serveur, lui, streame via subscribe()).
   */
  launch(req: LaunchRequest): { session: SessionRow; finished: Promise<void> } {
    const def = sessionTypeByName(req.type);
    if (!def) throw new Error(`type de session inconnu : ${req.type}`);

    const branch = resolveBranch(def, req.slug);
    const action = ensureBranch(req.repoPath, branch); // peut lever DirtyWorktreeError
    const workdir = resolveSessionWorkdir(req.repoPath);
    const sdkSessionId = randomUUID();
    const prompt = `${def.skill} ${req.slug}`.trim();

    const session = this.store.createSession({
      id: randomUUID(),
      repo_path: req.repoPath,
      type: req.type,
      slug: req.slug,
      branch,
      workdir,
      sdk_session_id: sdkSessionId,
      runtime_state: "running",
      prompt,
    });
    this.record(session.id, { kind: "system" }, `branche ${branch} (${action})`, "lifecycle");

    const finished = this.consume(session, def.permissionMode, def.allowedTools, prompt, workdir, sdkSessionId);
    return { session, finished };
  }

  private async consume(
    session: SessionRow,
    permissionMode: PermissionMode,
    allowedTools: readonly string[],
    prompt: string,
    cwd: string,
    sdkSessionId: string,
  ): Promise<void> {
    try {
      for await (const ev of this.runner.start({ cwd, prompt, sessionId: sdkSessionId, permissionMode, allowedTools })) {
        this.handle(session.id, ev);
      }
      // pas de `result` explicite → on clôt proprement
      if (this.store.getSession(session.id)?.runtime_state === "running") {
        this.store.setState(session.id, "done");
        this.emit(session.id, { kind: "result", ok: true });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.store.appendEvent(session.id, "error", message);
      this.store.setState(session.id, "error");
      this.emit(session.id, { kind: "error", message });
    }
  }

  private handle(id: string, ev: RunnerEvent): void {
    switch (ev.kind) {
      case "system":
        if (ev.sessionId) this.store.setSdkSessionId(id, ev.sessionId);
        this.store.appendEvent(id, "system");
        break;
      case "assistant":
        this.store.appendEvent(id, "assistant", ev.text);
        break;
      case "tool_use":
        this.store.appendEvent(id, "tool_use", ev.tool);
        break;
      case "result":
        this.store.setState(id, ev.ok ? "done" : "error");
        this.store.appendEvent(id, "result", ev.costUsd != null ? `$${ev.costUsd}` : "");
        break;
      case "error":
        this.store.setState(id, "error");
        this.store.appendEvent(id, "error", ev.message);
        break;
    }
    this.emit(id, ev);
  }

  private record(id: string, ev: RunnerEvent, text: string, kind: string): void {
    this.store.appendEvent(id, kind, text);
    this.emit(id, ev);
  }
}
