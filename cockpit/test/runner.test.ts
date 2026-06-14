import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStreamJsonLine } from "../src/runner/events.ts";

test("ligne system → event system avec session_id", () => {
  const ev = parseStreamJsonLine(JSON.stringify({ type: "system", subtype: "init", session_id: "abc" }));
  assert.deepEqual(ev, { kind: "system", sessionId: "abc" });
});

test("message assistant texte → event assistant", () => {
  const line = JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "salut" }] } });
  assert.deepEqual(parseStreamJsonLine(line), { kind: "assistant", text: "salut" });
});

test("message assistant avec tool_use → event tool_use", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Write", input: {} }] },
  });
  assert.deepEqual(parseStreamJsonLine(line), { kind: "tool_use", tool: "Write" });
});

test("result success → event result ok avec coût", () => {
  const line = JSON.stringify({ type: "result", subtype: "success", session_id: "abc", total_cost_usd: 0.02 });
  assert.deepEqual(parseStreamJsonLine(line), { kind: "result", sessionId: "abc", ok: true, costUsd: 0.02 });
});

test("ligne vide ou JSON invalide → null", () => {
  assert.equal(parseStreamJsonLine(""), null);
  assert.equal(parseStreamJsonLine("   "), null);
  assert.equal(parseStreamJsonLine("{pas du json"), null);
  assert.equal(parseStreamJsonLine(JSON.stringify({ type: "unknown" })), null);
});
