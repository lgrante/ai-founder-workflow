#!/usr/bin/env bash
# OPTIONNEL — statusline « % de contexte ». NON activée par défaut (voir docs/WORKFLOW.md § Optionnel).
#
# Affiche le modèle, le dossier courant et le % de contexte utilisé — un repère visuel
# pour décider quand /compact ou /clear (le MOMENT reste un geste humain).
#
# Pour l'activer, ajoute à .claude/settings.json (clé de premier niveau, pas dans "hooks") :
#   "statusLine": { "type": "command", "command": ".claude/statusline.sh", "padding": 2 }
#
# Claude Code passe un JSON sur stdin. Les noms de champs varient selon la version : ce script
# lit .context_window.used_percentage si présent, sinon le recalcule depuis les tokens, sinon
# n'affiche pas le %. Vérifie / adapte contre code.claude.com/docs pour ta version.

input="$(cat)"

read_json() {  # $1 = chemin pointé (ex : context_window.used_percentage). jq, repli python3, sinon vide.
  local path="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r ".$path // empty" 2>/dev/null
  elif command -v python3 >/dev/null 2>&1; then
    printf '%s' "$input" | PATH_ARG="$path" python3 -c '
import sys, json, os
d = json.load(sys.stdin)
for k in os.environ["PATH_ARG"].split("."):
    d = d.get(k) if isinstance(d, dict) else None
    if d is None:
        break
print("" if d is None else d)
' 2>/dev/null
  fi
}

model="$(read_json 'model.display_name')"
[ -z "$model" ] && model="$(read_json 'model.id')"
[ -z "$model" ] && model="claude"

dir="$(read_json 'cwd')"
[ -n "$dir" ] && dir="$(basename "$dir")"

pct="$(read_json 'context_window.used_percentage')"

# Repli : recalcul depuis tokens / taille de fenêtre si used_percentage absent.
if [ -z "$pct" ]; then
  used="$(read_json 'context_window.total_input_tokens')"
  size="$(read_json 'context_window.context_window_size')"
  if [ -n "$used" ] && [ -n "$size" ] && [ "$size" -gt 0 ] 2>/dev/null; then
    pct=$(( used * 100 / size ))
  fi
fi

line="⚙ $model"
[ -n "$dir" ] && line="$line · 📁 $dir"
[ -n "$pct" ] && line="$line · 🧠 ${pct}% ctx"
printf '%s\n' "$line"
