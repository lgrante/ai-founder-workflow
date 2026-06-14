// Git/Worktree Manager — applique l'étiquette git du kit (cf. ARCHITECTURE.md §8).
// J2 : résolution + création de branche, refus si working tree sale, stage par chemin
// explicite (jamais `-A`). Les worktrees concurrents arrivent à J4 (couture prévue).

import { execFileSync } from "node:child_process";

export type BranchAction = "already-on" | "checked-out" | "created";

export class DirtyWorktreeError extends Error {
  readonly repo: string;
  constructor(repo: string) {
    super(`working tree non propre dans ${repo} — commit/stash requis avant d'ouvrir une session`);
    this.name = "DirtyWorktreeError";
    this.repo = repo;
  }
}

function git(repo: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

export function isClean(repo: string): boolean {
  return git(repo, ["status", "--porcelain"]) === "";
}

export function currentBranch(repo: string): string {
  return git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function localBranchExists(repo: string, branch: string): boolean {
  try {
    git(repo, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

function remoteBranchExists(repo: string, branch: string): boolean {
  try {
    git(repo, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Garantit que `branch` est checkout dans le repo. Refuse si le working tree est sale.
 * - déjà dessus → `already-on` (reprise normale, ex. spec→code→test partagent feat/<f>)
 * - existe (local/remote) → `checked-out`
 * - sinon → `created` (depuis HEAD courant)
 */
export function ensureBranch(repo: string, branch: string): BranchAction {
  if (currentBranch(repo) === branch) return "already-on";
  if (!isClean(repo)) throw new DirtyWorktreeError(repo);

  if (localBranchExists(repo, branch)) {
    git(repo, ["checkout", branch]);
    return "checked-out";
  }
  if (remoteBranchExists(repo, branch)) {
    git(repo, ["checkout", "-b", branch, "--track", `origin/${branch}`]);
    return "checked-out";
  }
  git(repo, ["checkout", "-b", branch]);
  return "created";
}

/**
 * Répertoire de travail d'une session. J2 : la racine du repo (mono-branche active).
 * J4 remplacera ceci par un `git worktree add` dédié pour la concurrence.
 */
export function resolveSessionWorkdir(repo: string): string {
  return repo;
}
