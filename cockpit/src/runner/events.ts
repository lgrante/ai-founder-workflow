// Événements normalisés d'une session, indépendants du transport sous-jacent
// (CLI headless aujourd'hui, SDK multi-tours à J3). Le parser de stream-json est
// une fonction pure → testable sans lancer de vraie session (ARCHITECTURE.md §11).

export type RunnerEvent =
  | { kind: "system"; sessionId?: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool_use"; tool: string }
  | { kind: "result"; sessionId?: string; ok: boolean; costUsd?: number }
  | { kind: "error"; message: string };

/**
 * Parse une ligne NDJSON émise par `claude -p --output-format stream-json --verbose`.
 * Tolérant : ligne vide / JSON invalide → null (ignorée). Une ligne = au plus un événement.
 */
export function parseStreamJsonLine(line: string): RunnerEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let msg: any;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return null;
  }

  switch (msg.type) {
    case "system":
      // event d'init : porte le session_id
      return { kind: "system", sessionId: msg.session_id };

    case "assistant": {
      // message assistant : agrège le texte des blocs
      const blocks = msg.message?.content ?? [];
      const text = blocks
        .filter((b: any) => b?.type === "text" && typeof b.text === "string")
        .map((b: any) => b.text)
        .join("");
      // bloc tool_use éventuel
      const tool = blocks.find((b: any) => b?.type === "tool_use");
      if (tool) return { kind: "tool_use", tool: tool.name ?? "tool" };
      return { kind: "assistant", text };
    }

    case "result":
      return {
        kind: "result",
        sessionId: msg.session_id,
        ok: msg.subtype === "success" || msg.is_error === false,
        costUsd: typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : undefined,
      };

    default:
      return null;
  }
}
