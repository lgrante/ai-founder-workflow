import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { SessionManager } from "../src/sessionManager.ts";
import { FakeRunner, happyScript } from "../src/runner/fakeRunner.ts";
import type { RunnerEvent } from "../src/runner/events.ts";

let repo: string;
function git(args: string[]) {
  execFileSync("git", args, { cwd: repo });
}

before(() => {
  repo = mkdtempSync(join(tmpdir(), "cockpit-sm-"));
  git(["init", "-q"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
  writeFileSync(join(repo, "README.md"), "x");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "init"]);
});

after(() => rmSync(repo, { recursive: true, force: true }));

test("launch: crée la branche, streame, persiste et clôt en done", async () => {
  const store = new Store(":memory:");
  const runner = new FakeRunner(happyScript);
  const manager = new SessionManager(store, runner);

  const received: RunnerEvent[] = [];
  // on lance et on s'abonne immédiatement (avant que le stream asynchrone ne démarre)
  const { session, finished } = manager.launch({ repoPath: repo, type: "market-research", slug: "agentforce" });
  manager.subscribe(session.id, (ev) => received.push(ev));
  await finished;

  // branche résolue + créée
  assert.equal(session.branch, "research/agentforce");
  const head = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(head, "research/agentforce");

  // permissions/prompt transmis au runner
  assert.equal(runner.lastOpts?.prompt, "/research agentforce");
  assert.equal(runner.lastOpts?.permissionMode, "acceptEdits");

  // état final persisté
  const finalRow = store.getSession(session.id);
  assert.equal(finalRow?.runtime_state, "done");
  assert.equal(finalRow?.sdk_session_id, session.sdk_session_id); // confirmé par l'event system

  // événements persistés (assistant + tool_use + result)
  const kinds = store.getEvents(session.id).map((e) => e.kind);
  assert.ok(kinds.includes("assistant"));
  assert.ok(kinds.includes("tool_use"));
  assert.ok(kinds.includes("result"));

  // le bus a bien émis un result
  assert.ok(received.some((e) => e.kind === "result"));
  store.close();
});

test("launch: un runner qui jette → état error", async () => {
  const store = new Store(":memory:");
  const runner = new FakeRunner(() => {
    throw new Error("boom");
  });
  const manager = new SessionManager(store, runner);
  const { session, finished } = manager.launch({ repoPath: repo, type: "market-research", slug: "agentforce" });
  await finished;
  assert.equal(store.getSession(session.id)?.runtime_state, "error");
  store.close();
});

test("launch: type inconnu → throw", () => {
  const store = new Store(":memory:");
  const manager = new SessionManager(store, new FakeRunner(happyScript));
  assert.throws(() => manager.launch({ repoPath: repo, type: "nope", slug: "x" }), /type de session inconnu/);
  store.close();
});
