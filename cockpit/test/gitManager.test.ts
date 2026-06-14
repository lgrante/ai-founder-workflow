import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureBranch, currentBranch, isClean, DirtyWorktreeError } from "../src/gitManager.ts";

let repo: string;

function git(args: string[]) {
  execFileSync("git", args, { cwd: repo });
}

before(() => {
  repo = mkdtempSync(join(tmpdir(), "cockpit-git-"));
  git(["init", "-q"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  git(["config", "commit.gpgsign", "false"]);
  writeFileSync(join(repo, "README.md"), "x");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "init"]);
});

after(() => rmSync(repo, { recursive: true, force: true }));

test("ensureBranch crée une branche absente", () => {
  const action = ensureBranch(repo, "research/agentforce");
  assert.equal(action, "created");
  assert.equal(currentBranch(repo), "research/agentforce");
});

test("ensureBranch sur la branche courante → already-on", () => {
  assert.equal(ensureBranch(repo, "research/agentforce"), "already-on");
});

test("ensureBranch rebascule sur une branche existante → checked-out", () => {
  ensureBranch(repo, "research/autre"); // crée + checkout
  const action = ensureBranch(repo, "research/agentforce"); // existe déjà
  assert.equal(action, "checked-out");
  assert.equal(currentBranch(repo), "research/agentforce");
});

test("ensureBranch refuse si working tree sale", () => {
  writeFileSync(join(repo, "dirty.txt"), "pending");
  assert.equal(isClean(repo), false);
  assert.throws(() => ensureBranch(repo, "research/nouvelle"), DirtyWorktreeError);
  rmSync(join(repo, "dirty.txt"));
});
