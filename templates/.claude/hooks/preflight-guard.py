#!/usr/bin/env python3
"""
ai-founder-workflow — Pre-flight guard hook (UserPromptSubmit)

Deterministic guard: blocks the kit's slash commands when the workflow
isn't installed on the current repo. `/setup` is intentionally exempt
(it IS the installer).

Detection signal: presence of `docs/WORKFLOW.md` at the git repo root
(or cwd if not in a git repo).

Install as a UserPromptSubmit hook. Output JSON to stdout with
`{"decision": "block", "reason": "..."}` to block, or exit 0 silently
to allow.

Doctrine: cf. `docs/WORKFLOW.md` § Pre-flight.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys

# Skill commands guarded by this hook. `/setup` is intentionally excluded.
GUARDED_SKILLS = frozenset({
    "/spec",
    "/code",
    "/test",
    "/research",
    "/feedback",
    "/support",
    "/backlog",
    "/post",
    "/article",
    "/newsletter",
    "/report",
    "/status",
    "/update",
})

# Detection signal — the canonical file installed by /setup Phase 2.
WORKFLOW_MARKER = os.path.join("docs", "WORKFLOW.md")


def find_repo_root(start: str) -> str:
    """Return git repo root from `start`, falling back to `start` itself.

    Defensive: if git is missing, fails, or times out, returns `start`.
    The caller then checks WORKFLOW_MARKER relative to that path — which
    is still a sane fallback for repos not yet under git.
    """
    if not shutil.which("git"):
        return start
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            cwd=start,
            check=False,
            timeout=2,
        )
    except (subprocess.TimeoutExpired, OSError):
        return start
    if result.returncode != 0:
        return start
    root = result.stdout.strip()
    return root or start


def workflow_installed(root: str) -> bool:
    """True iff the canonical workflow marker file exists at `root`."""
    return os.path.isfile(os.path.join(root, WORKFLOW_MARKER))


def extract_command(prompt: str) -> str | None:
    """Return the leading slash command token, or None if not a slash command."""
    stripped = prompt.lstrip()
    if not stripped.startswith("/"):
        return None
    return stripped.split(None, 1)[0]


def main() -> int:
    # Read the JSON payload Claude Code sends to UserPromptSubmit hooks.
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        # Don't interfere if we can't parse — exit clean.
        return 0

    prompt = payload.get("prompt") or ""
    if not isinstance(prompt, str) or not prompt.strip():
        return 0

    command = extract_command(prompt)
    if command is None:
        # Free-form prompt — not our concern.
        return 0

    # `/setup` is always allowed (it IS the installer).
    if command == "/setup":
        return 0

    # Only guard the kit's own skills. Other slash commands pass through.
    if command not in GUARDED_SKILLS:
        return 0

    root = find_repo_root(os.getcwd())
    if workflow_installed(root):
        return 0

    # Block with a clear, actionable message.
    reason = (
        "⛔ ai-founder-workflow — pre-flight guard\n\n"
        f"Le workflow ai-founder-workflow n'est pas installé sur ce repo "
        f"(pas de `docs/WORKFLOW.md` à `{root}`).\n\n"
        f"Lance d'abord `/setup` pour déployer le workflow, "
        f"puis ré-essaye `{command}`.\n\n"
        "Doctrine : `docs/WORKFLOW.md` § Pre-flight."
    )
    json.dump({"decision": "block", "reason": reason}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
