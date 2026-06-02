#!/usr/bin/env bash
# OPTIONNEL — hook SessionStart. NON activé par défaut (voir docs/WORKFLOW.md § Optionnel).
#
# Rôle : à la reprise d'une session (après /compact ou un resume), réinjecter un RAPPEL
# pointant vers les artefacts durables, pour que Claude reparte du bon état.
# C'est le pendant « restore » de context-handoff.sh (PreCompact).
#
# Pour l'activer, ajoute à .claude/settings.json :
#   "SessionStart": [
#     { "matcher": "compact", "hooks": [ { "type": "command", "command": ".claude/hooks/context-restore.sh" } ] },
#     { "matcher": "resume",  "hooks": [ { "type": "command", "command": ".claude/hooks/context-restore.sh" } ] }
#   ]
# (matchers SessionStart : startup | resume | clear | compact.)
#
# La réinjection se fait via la sortie JSON hookSpecificOutput.additionalContext
# (ce texte est ajouté au contexte de la session). Vérifie code.claude.com/docs pour ta version.

input="$(cat)"   # contient notamment .source (startup|resume|clear|compact)

msg="Reprise de session. Relis les artefacts durables avant de continuer : PLAN.md (cases cochées = statut), SPEC.md (critères d'acceptation), .cc-scratch/test-gate.last.txt (dernier run de tests)."
if [ -f ".cc-scratch/handoff.md" ]; then
  msg="$msg Un repère a été écrit dans .cc-scratch/handoff.md."
fi

# Émet le JSON d'injection. jq si dispo (échappement propre), sinon repli manuel.
if command -v jq >/dev/null 2>&1; then
  jq -n --arg c "$msg" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $c}}'
else
  esc="$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
fi

exit 0
