// Frontière SDK/CLI (Indirection / Protected Variations, ARCHITECTURE.md §11) :
// tout ce qui dépend de Claude Code passe par cette interface, pour qu'un seul
// module soit à adapter si l'API bouge — et pour tester l'orchestration sans LLM.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { RunnerEvent } from "./events.ts";
import { parseStreamJsonLine } from "./events.ts";
import type { PermissionMode } from "../domain/sessionTypes.ts";

export interface StartOpts {
  /** répertoire de travail (worktree du repo cible) */
  cwd: string;
  /** prompt initial, typiquement "<skill> <slug>" (ex. "/research agentforce") */
  prompt: string;
  /** session-id imposé (uuid) pour pouvoir reprendre plus tard (`--resume`) */
  sessionId: string;
  permissionMode: PermissionMode;
  allowedTools: readonly string[];
}

export interface SessionRunner {
  /** lance la session et streame ses événements jusqu'à `result`/`error`. */
  start(opts: StartOpts): AsyncIterable<RunnerEvent>;
}

/** Implémentation réelle : pilote le binaire `claude` en mode headless stream-json. */
export class ClaudeCliRunner implements SessionRunner {
  private readonly bin: string;
  constructor(bin: string = "claude") {
    this.bin = bin;
  }

  async *start(opts: StartOpts): AsyncIterable<RunnerEvent> {
    const args = [
      "-p",
      opts.prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--session-id",
      opts.sessionId,
      "--permission-mode",
      opts.permissionMode,
    ];
    if (opts.allowedTools.length) args.push("--allowedTools", ...opts.allowedTools);

    const child = spawn(this.bin, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });

    const queue: RunnerEvent[] = [];
    let resolveNext: (() => void) | null = null;
    let done = false;
    const push = (e: RunnerEvent) => {
      queue.push(e);
      resolveNext?.();
      resolveNext = null;
    };

    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const ev = parseStreamJsonLine(line);
      if (ev) push(ev);
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      push({ kind: "error", message: err.message });
      done = true;
      resolveNext?.();
    });
    child.on("close", (code) => {
      if (code && code !== 0) push({ kind: "error", message: `claude exit ${code}: ${stderr.slice(-500)}` });
      done = true;
      resolveNext?.();
    });

    while (true) {
      if (queue.length) {
        yield queue.shift()!;
        continue;
      }
      if (done) return;
      await new Promise<void>((r) => (resolveNext = r));
    }
  }
}
