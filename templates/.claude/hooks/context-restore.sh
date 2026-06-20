#!/usr/bin/env bash
# ACTIVÉ PAR DÉFAUT — hook SessionStart (cf. docs/WORKFLOW.md § Format de réponse & bandeau de reprise).
#
# Rôle : à chaque démarrage/reprise de session, injecter un BANDEAU « où on en est » —
# branche courante, type de session, artefacts durables présents, et la dernière note d'état
# écrite par la session précédente (footer du contrat de réponse). C'est le pendant « restore »
# de context-handoff.sh (PreCompact) et le complément de l'output style « founder ».
#
# Enregistré dans .claude/settings.json (via register-hook.py / kit-manifest.json) :
#   "SessionStart": [
#     { "matcher": "startup", "hooks": [ { "type": "command", "command": ".claude/hooks/context-restore.sh", "timeout": 5 } ] },
#     { "matcher": "resume",  "hooks": [ ... ] },
#     { "matcher": "compact", "hooks": [ ... ] }
#   ]
# (matchers SessionStart : startup | resume | clear | compact.)
#
# La réinjection se fait via la sortie JSON hookSpecificOutput.additionalContext
# (ce texte est ajouté au contexte de la session). Vérifie code.claude.com/docs pour ta version.

input="$(cat)"   # contient notamment .source (startup|resume|clear|compact)

# --- Branche courante (défensif : hors git, on ne plante pas) ----------------------------------
branch=""
if command -v git >/dev/null 2>&1; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
fi

# --- Type de session déduit du préfixe de branche ----------------------------------------------
type_label=""
case "$branch" in
  feat/*)                      type_label="Build (feature)";;
  fix/*)                       type_label="Build (bug)";;
  research/*)                  type_label="Découverte — marché";;
  feedback/*)                  type_label="Découverte — feedback utilisateur";;
  support/*)                   type_label="Découverte — support client";;
  backlog)                     type_label="Backlog (pont Découverte→Build)";;
  post/*|article/*|newsletter/*|report/*) type_label="Audience";;
  status/*|update)             type_label="Transverse";;
  setup-workflow)              type_label="Installation du workflow";;
  "")                          type_label="";;
  *)                           type_label="hors convention";;
esac

# --- Artefacts durables pertinents (selon l'axe) -----------------------------------------------
artifacts=""
add_art() { [ -f "$1" ] && artifacts="${artifacts:+$artifacts, }$1"; }
case "$branch" in
  feat/*) f="${branch#feat/}"; add_art "features/$f/SPEC.md"; add_art "features/$f/PLAN.md";;
  fix/*)  b="${branch#fix/}";  add_art "bugs/$b/TICKET.md";   add_art "bugs/$b/PLAN.md";;
esac
# Replis génériques (anciens emplacements / racine).
add_art "SPEC.md"; add_art "PLAN.md"

# --- Dernière note d'état écrite par la session précédente --------------------------------------
last_note=""
if [ -n "$branch" ]; then
  slug="$(printf '%s' "$branch" | sed 's#/#--#g')"
  state_file=".cc-scratch/state/$slug.md"
  if [ -f "$state_file" ]; then
    last_note="$(grep -v '^[[:space:]]*$' "$state_file" 2>/dev/null | tail -n 1)"
  fi
fi

# --- Composition du bandeau ---------------------------------------------------------------------
if [ -n "$branch" ]; then
  msg="🔄 Reprise de session — branche \`$branch\`"
  [ -n "$type_label" ] && msg="$msg ($type_label)"
  msg="$msg."
  [ -n "$artifacts" ] && msg="$msg Artefacts présents : $artifacts."
  if [ -n "$last_note" ]; then
    msg="$msg Dernière note : ${last_note#- }"
  else
    msg="$msg Dernière note : aucune (première session sur cette branche)."
  fi
else
  msg="🔄 Reprise de session."
fi
msg="$msg L'output style « founder » est actif : structure tes réponses et clôture les tâches par le footer 🎯 Tâche / ✅ Fait / ➡️ Prochaine (et persiste l'état dans .cc-scratch/state/). La mémoire vit dans les fichiers (SPEC.md, PLAN.md, commits), pas dans la conversation."

# --- Émission du JSON d'injection (jq si dispo, sinon repli manuel) -----------------------------
if command -v jq >/dev/null 2>&1; then
  jq -n --arg c "$msg" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $c}}'
else
  esc="$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$esc"
fi

exit 0
