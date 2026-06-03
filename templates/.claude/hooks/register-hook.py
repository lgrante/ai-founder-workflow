#!/usr/bin/env python3
"""
ai-founder-workflow — helper d'enregistrement de hook

Enregistre idempotemment un hook Claude Code dans un settings.json
(ex. ~/.claude/settings.json pour le mode global, ou .claude/settings.json
pour le per-repo).

Usage :
    register-hook.py <settings.json path> <event> <command path> [timeout]

Exemple :
    register-hook.py ~/.claude/settings.json UserPromptSubmit ~/.claude/hooks/preflight-guard.py 5

Sécurité :
- Backup automatique du settings.json en `.bak` avant modification.
- Idempotent : si la même commande est déjà enregistrée pour cet event,
  no-op et message "OK: déjà enregistré".
- Préserve les autres hooks existants.
- Création du fichier si absent (avec arborescence parente).
"""
from __future__ import annotations

import json
import os
import shutil
import sys


def main() -> int:
    if len(sys.argv) < 4:
        print(
            "Usage : register-hook.py <settings.json> <event> <command> [timeout]",
            file=sys.stderr,
        )
        return 2

    settings_path = os.path.expanduser(sys.argv[1])
    event = sys.argv[2]
    command = sys.argv[3]
    timeout = int(sys.argv[4]) if len(sys.argv) >= 5 else 5

    # Load existing settings or start fresh.
    if os.path.exists(settings_path):
        try:
            with open(settings_path, encoding="utf-8") as f:
                settings = json.load(f)
            if not isinstance(settings, dict):
                print(
                    f"ERREUR : {settings_path} n'est pas un objet JSON, abandon.",
                    file=sys.stderr,
                )
                return 3
        except (json.JSONDecodeError, OSError) as e:
            print(
                f"ERREUR : impossible de lire {settings_path} ({e}).",
                file=sys.stderr,
            )
            return 3
    else:
        settings = {}

    # Ensure the hooks structure exists.
    hooks = settings.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        print(f"ERREUR : `hooks` n'est pas un objet dans {settings_path}.", file=sys.stderr)
        return 4

    event_list = hooks.setdefault(event, [])
    if not isinstance(event_list, list):
        print(
            f"ERREUR : `hooks.{event}` n'est pas une liste dans {settings_path}.",
            file=sys.stderr,
        )
        return 4

    # Idempotency check : look for the same command already registered.
    for entry in event_list:
        if not isinstance(entry, dict):
            continue
        for h in entry.get("hooks", []) or []:
            if isinstance(h, dict) and h.get("command") == command:
                print(f"OK : hook déjà enregistré dans {settings_path} (no-op).")
                return 0

    # Backup before write.
    if os.path.exists(settings_path):
        backup = settings_path + ".bak"
        shutil.copy2(settings_path, backup)
        print(f"Backup : {backup}")

    # Append the new entry.
    event_list.append({
        "hooks": [
            {"type": "command", "command": command, "timeout": timeout}
        ]
    })

    # Write.
    os.makedirs(os.path.dirname(settings_path), exist_ok=True)
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"OK : hook enregistré dans {settings_path} (event={event}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
