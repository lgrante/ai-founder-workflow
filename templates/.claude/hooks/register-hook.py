#!/usr/bin/env python3
"""
ai-founder-workflow — helper de configuration de settings.json

Deux usages, tous deux idempotents et avec backup `.bak` automatique :

1) Enregistrer un hook Claude Code :
       register-hook.py <settings.json path> <event> <command path> [timeout] [matcher]
   Exemples :
       register-hook.py ~/.claude/settings.json UserPromptSubmit ~/.claude/hooks/preflight-guard.py 5
       register-hook.py ~/.claude/settings.json PostToolUse ~/.claude/hooks/md-to-html.py 15 "Write|Edit"

2) Poser une clé top-level (set-if-absent — ne JAMAIS écraser un choix utilisateur) :
       register-hook.py --ensure-setting <settings.json path> <clé> <valeur>
   Exemple :
       register-hook.py --ensure-setting .claude/settings.json outputStyle founder

Sécurité :
- Backup automatique du settings.json en `.bak` avant toute modification.
- Idempotent : hook déjà enregistré → no-op ; clé déjà présente → no-op (préserve la valeur existante).
- Préserve les autres hooks / clés existants.
- Création du fichier si absent (avec arborescence parente).
"""
from __future__ import annotations

import json
import os
import shutil
import sys


def load_settings(settings_path: str):
    """Charge le settings.json (dict) ou en démarre un vide. Retourne (settings, err_code).

    err_code est None si OK, sinon un code de sortie (>0) à propager.
    """
    if not os.path.exists(settings_path):
        return {}, None
    try:
        with open(settings_path, encoding="utf-8") as f:
            settings = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"ERREUR : impossible de lire {settings_path} ({e}).", file=sys.stderr)
        return None, 3
    if not isinstance(settings, dict):
        print(f"ERREUR : {settings_path} n'est pas un objet JSON, abandon.", file=sys.stderr)
        return None, 3
    return settings, None


def backup_and_write(settings_path: str, settings: dict) -> None:
    """Backup `.bak` (si le fichier existe) puis écrit le settings.json formaté."""
    if os.path.exists(settings_path):
        backup = settings_path + ".bak"
        shutil.copy2(settings_path, backup)
        print(f"Backup : {backup}")
    parent = os.path.dirname(settings_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
        f.write("\n")


def ensure_setting(settings_path: str, key: str, value: str) -> int:
    """Pose une clé top-level si absente (set-if-absent). No-op si déjà présente."""
    settings, err = load_settings(settings_path)
    if err is not None:
        return err

    if key in settings:
        print(f"OK : `{key}` déjà présent dans {settings_path} (no-op, valeur préservée).")
        return 0

    settings[key] = value
    backup_and_write(settings_path, settings)
    print(f"OK : `{key}` = {value!r} posé dans {settings_path}.")
    return 0


def register_hook(settings_path, event, command, timeout, matcher) -> int:
    """Enregistre idempotemment un hook (event → command) dans settings.json."""
    settings, err = load_settings(settings_path)
    if err is not None:
        return err

    hooks = settings.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        print(f"ERREUR : `hooks` n'est pas un objet dans {settings_path}.", file=sys.stderr)
        return 4

    event_list = hooks.setdefault(event, [])
    if not isinstance(event_list, list):
        print(f"ERREUR : `hooks.{event}` n'est pas une liste dans {settings_path}.", file=sys.stderr)
        return 4

    # Idempotency check : same command already registered for this event.
    for entry in event_list:
        if not isinstance(entry, dict):
            continue
        for h in entry.get("hooks", []) or []:
            if isinstance(h, dict) and h.get("command") == command:
                print(f"OK : hook déjà enregistré dans {settings_path} (no-op).")
                return 0

    entry = {"hooks": [{"type": "command", "command": command, "timeout": timeout}]}
    if matcher:
        entry = {"matcher": matcher, **entry}
    event_list.append(entry)

    backup_and_write(settings_path, settings)
    print(f"OK : hook enregistré dans {settings_path} (event={event}).")
    return 0


def main() -> int:
    args = sys.argv[1:]

    # Mode 2 : --ensure-setting <settings.json> <clé> <valeur>
    if args and args[0] == "--ensure-setting":
        if len(args) != 4:
            print(
                "Usage : register-hook.py --ensure-setting <settings.json> <clé> <valeur>",
                file=sys.stderr,
            )
            return 2
        return ensure_setting(os.path.expanduser(args[1]), args[2], args[3])

    # Mode 1 : <settings.json> <event> <command> [timeout] [matcher]
    if len(args) < 3:
        print(
            "Usage : register-hook.py <settings.json> <event> <command> [timeout] [matcher]\n"
            "   ou : register-hook.py --ensure-setting <settings.json> <clé> <valeur>",
            file=sys.stderr,
        )
        return 2

    settings_path = os.path.expanduser(args[0])
    event = args[1]
    command = args[2]
    timeout = int(args[3]) if len(args) >= 4 else 5
    matcher = args[4] if len(args) >= 5 else None
    return register_hook(settings_path, event, command, timeout, matcher)


if __name__ == "__main__":
    sys.exit(main())
