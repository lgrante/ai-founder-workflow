#!/usr/bin/env python3
"""
ai-founder-workflow — validateur déterministe des items de backlog.

Hook PostToolUse (matcher Write|Edit) : chaque fois qu'une session écrit un
item `backlog/<slug>.md`, on valide son frontmatter (statut/priorité/source
dans leur énumération, champs requis présents, dates ISO, cohérence
`specced`↔`feature`). En cas de problème, on renvoie un feedback actionnable
à Claude (`decision: block`) pour qu'il corrige — sans jamais perdre le
fichier (il est déjà écrit ; on ne fait que signaler quoi rectifier).

Doctrine du kit : garde-fou DÉTERMINISTE (cf. preflight-guard.py,
test-gate.sh, md-to-html.py) — pas une consigne « pense à vérifier »
dépendante du LLM. Fiable, 0 token, jamais oublié, schéma garanti.

Contrat hook : lit le JSON PostToolUse sur stdin (`tool_input.file_path`).
Ne casse JAMAIS le flux sur une erreur interne (exit 0). Zéro dépendance
externe (stdlib). Périmètre : SEULEMENT les fichiers dont le dossier parent
est exactement `backlog/` (hors `_template.md` et hors `.claude/`, etc.).

Cf. `docs/WORKFLOW.md` § Convention backlog.
"""
from __future__ import annotations

import json
import os
import re
import sys

# ── Schéma attendu du frontmatter d'un item ────────────────────────────────
STATUTS = {"idea", "triaged", "specced", "dropped"}
PRIORITES = {"P0", "P1", "P2"}
SOURCES = {"insights", "support", "feedback", "research", "manuel"}
REQUIRED = ("titre", "statut", "priorité", "source", "créé", "maj")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Dossiers où l'on ne valide jamais (le skill, le scaffold du kit, etc.).
DENY_DIR_SEGMENTS = {".claude", ".git", "node_modules", "vendor", "__pycache__"}


def in_scope(path: str) -> bool:
    """True ssi `path` est un item backlog (dossier parent == `backlog`)."""
    norm = path.replace("\\", "/")
    base = os.path.basename(norm)
    if not base.endswith(".md") or base == "_template.md":
        return False
    parts = norm.split("/")
    if len(parts) < 2 or parts[-2].lower() != "backlog":
        return False
    return not ({p.lower() for p in parts[:-1]} & DENY_DIR_SEGMENTS)


def parse_frontmatter(text: str) -> dict[str, str] | None:
    """Extrait un frontmatter YAML plat (clé: valeur). None si absent."""
    text = text.replace("\r\n", "\n").lstrip("﻿")
    if not text.startswith("---\n"):
        return None
    end = re.search(r"\n---\s*\n", text[3:])
    if not end:
        return None
    block = text[4:3 + end.start() + 1]
    pairs: dict[str, str] = {}
    for ln in block.split("\n"):
        if ln.lstrip().startswith("#"):  # commentaire YAML (ex. `# feature:`)
            continue
        m = re.match(r"^([A-Za-zÀ-ÿ0-9_.\- ]+):\s*(.*)$", ln)
        if m:
            pairs[m.group(1).strip()] = m.group(2).strip().strip("\"'")
    return pairs


def validate(fm: dict[str, str] | None) -> list[str]:
    """Retourne la liste des problèmes (vide = item valide)."""
    if fm is None:
        return ["frontmatter YAML absent (un item commence par un bloc `---`)."]
    errs: list[str] = []
    for key in REQUIRED:
        if not fm.get(key):
            errs.append(f"champ requis manquant ou vide : `{key}`.")
    statut = fm.get("statut", "")
    if statut and statut not in STATUTS:
        errs.append(f"`statut: {statut}` invalide (attendu : {' | '.join(sorted(STATUTS))}).")
    prio = fm.get("priorité", "")
    if prio and prio not in PRIORITES:
        errs.append(f"`priorité: {prio}` invalide (attendu : {' | '.join(sorted(PRIORITES))}).")
    src = fm.get("source", "")
    if src and src not in SOURCES:
        errs.append(f"`source: {src}` invalide (attendu : {' | '.join(sorted(SOURCES))}).")
    for key in ("créé", "maj"):
        val = fm.get(key, "")
        if val and not DATE_RE.match(val):
            errs.append(f"`{key}: {val}` n'est pas une date ISO `YYYY-MM-DD`.")
    if statut == "specced" and not fm.get("feature"):
        errs.append("`statut: specced` mais `feature:` absent — renseigne le slug de la feature dans `features/`.")
    return errs


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    tool_input = payload.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("path") or ""
    if not path or not in_scope(path) or not os.path.isfile(path):
        return 0

    try:
        with open(path, encoding="utf-8") as f:
            errs = validate(parse_frontmatter(f.read()))
    except (OSError, UnicodeDecodeError):
        return 0  # un lint raté ne doit jamais casser le flux

    if not errs:
        return 0

    bullets = "\n".join(f"  • {e}" for e in errs)
    reason = (
        f"⚠ Item backlog invalide — {os.path.basename(path)} :\n{bullets}\n\n"
        "Corrige le frontmatter du `.md` (cf. `docs/WORKFLOW.md` § Convention backlog ; "
        "gabarit : `backlog/_template.md`)."
    )
    json.dump({"decision": "block", "reason": reason}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
