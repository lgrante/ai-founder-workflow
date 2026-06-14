// Runner factice : rejoue une séquence d'événements scriptée. Permet de tester
// toute l'orchestration (git → store → bus → transitions d'état) sans LLM ni réseau.

import type { RunnerEvent } from "./events.ts";
import type { SessionRunner, StartOpts } from "./sessionRunner.ts";

export class FakeRunner implements SessionRunner {
  public lastOpts: StartOpts | undefined;
  private readonly script: (opts: StartOpts) => RunnerEvent[];

  constructor(script: (opts: StartOpts) => RunnerEvent[]) {
    this.script = script;
  }

  async *start(opts: StartOpts): AsyncIterable<RunnerEvent> {
    this.lastOpts = opts;
    for (const ev of this.script(opts)) {
      // micro-yield pour simuler l'asynchronisme du stream
      await Promise.resolve();
      yield ev;
    }
  }
}

/** Script par défaut d'une session sans porte qui réussit. */
export function happyScript(opts: StartOpts): RunnerEvent[] {
  return [
    { kind: "system", sessionId: opts.sessionId },
    { kind: "assistant", text: `Lancement de ${opts.prompt}` },
    { kind: "tool_use", tool: "Write" },
    { kind: "assistant", text: "Artefact écrit." },
    { kind: "result", sessionId: opts.sessionId, ok: true, costUsd: 0.012 },
  ];
}
