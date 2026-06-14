import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ClaudeCliRunner } from "../src/runner/sessionRunner.ts";
import type { RunnerEvent } from "../src/runner/events.ts";

// Prouve le vrai pipeline subprocess (spawn → readline → parse → stream) contre un
// faux binaire `claude` qui émet du stream-json, sans consommer de tokens.

let dir: string;
let fakeBin: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "cockpit-cli-"));
  fakeBin = join(dir, "fakeclaude");
  writeFileSync(
    fakeBin,
    [
      "#!/bin/sh",
      `echo '{"type":"system","subtype":"init","session_id":"xyz"}'`,
      `echo '{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}'`,
      `echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write"}]}}'`,
      `echo '{"type":"result","subtype":"success","session_id":"xyz","total_cost_usd":0.01}'`,
      "",
    ].join("\n"),
  );
  chmodSync(fakeBin, 0o755);
});

after(() => rmSync(dir, { recursive: true, force: true }));

test("ClaudeCliRunner streame les événements parsés du subprocess", async () => {
  const runner = new ClaudeCliRunner(fakeBin);
  const events: RunnerEvent[] = [];
  for await (const ev of runner.start({
    cwd: dir,
    prompt: "/research x",
    sessionId: "xyz",
    permissionMode: "acceptEdits",
    allowedTools: ["Read", "Write"],
  })) {
    events.push(ev);
  }

  assert.deepEqual(events[0], { kind: "system", sessionId: "xyz" });
  assert.deepEqual(events[1], { kind: "assistant", text: "hi" });
  assert.deepEqual(events[2], { kind: "tool_use", tool: "Write" });
  assert.equal(events[3].kind, "result");
  assert.equal((events[3] as { ok: boolean }).ok, true);
});

test("ClaudeCliRunner remonte un code de sortie non nul en error", async () => {
  const bin = join(dir, "failclaude");
  writeFileSync(bin, "#!/bin/sh\necho 'boom' 1>&2\nexit 3\n");
  chmodSync(bin, 0o755);
  const runner = new ClaudeCliRunner(bin);
  const events: RunnerEvent[] = [];
  for await (const ev of runner.start({
    cwd: dir,
    prompt: "/research x",
    sessionId: "z",
    permissionMode: "acceptEdits",
    allowedTools: [],
  })) {
    events.push(ev);
  }
  assert.equal(events.at(-1)?.kind, "error");
});
