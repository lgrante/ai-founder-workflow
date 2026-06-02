#!/usr/bin/env bash
# OPTIONNEL — hook PreCompact. NON activé par défaut (voir docs/WORKFLOW.md § Optionnel).
#
# IMPORTANT : PreCompact est NOTIFICATION-ONLY. Il NE PEUT PAS préserver ni réinjecter
# le contexte. Son seul rôle utile : écrire un FILET sur disque avant la compaction
# (un repère + une sauvegarde du transcript). Le vrai relais reste PLAN.md / SPEC / code commité.
# La réinjection au redémarrage, elle, se fait dans context-restore.sh (SessionStart).
#
# Pour l'activer, ajoute à .claude/settings.json :
#   "PreCompact": [
#     { "matcher": "auto", "hooks": [ { "type": "command", "command": ".claude/hooks/context-handoff.sh" } ] },
#     { "matcher": "manual", "hooks": [ { "type": "command", "command": ".claude/hooks/context-handoff.sh" } ] }
#   ]
# (matchers PreCompact : "auto" = compaction automatique, "manual" = /compact.)
#
# Champs reçus sur stdin (selon la version de Claude Code) : session_id, transcript_path,
# hook_event_name, cwd, et le déclencheur (manual/auto). Vérifie code.claude.com/docs.

SCRATCH_DIR=".cc-scratch"
HANDOFF="$SCRATCH_DIR/handoff.md"

input="$(cat)"
mkdir -p "$SCRATCH_DIR"

# Extrait transcript_path sans dépendre de jq (repli grep/sed).
transcript=""
if command -v jq >/dev/null 2>&1; then
  transcript="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"
fi
if [ -z "$transcript" ]; then
  transcript="$(printf '%s' "$input" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[[:space:]]*"//; s/"$//')"
fi

# Sauvegarde du transcript (filet brut) si on a pu le localiser.
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  cp "$transcript" "$SCRATCH_DIR/transcript.backup.jsonl" 2>/dev/null || true
fi

# Repère lisible. PreCompact ne peut pas résumer la conversation : on pointe vers les artefacts durables.
{
  printf '# Handoff (filet de contexte)\n\n'
  printf '> Écrit automatiquement avant une compaction. PreCompact ne préserve PAS le contexte ;\n'
  printf '> ce fichier ne fait que rappeler où est le vrai état.\n\n'
  printf -- '- Plan en cours : `PLAN.md` (cases cochées = statut)\n'
  printf -- '- Intention : `SPEC.md` (critères d'\''acceptation)\n'
  printf -- '- Dernier run de tests : `.cc-scratch/test-gate.last.txt`\n'
  printf -- '- Sauvegarde transcript : `.cc-scratch/transcript.backup.jsonl`\n'
} > "$HANDOFF"

exit 0
