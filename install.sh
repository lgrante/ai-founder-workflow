#!/usr/bin/env bash
set -euo pipefail

# Deux modes :
#   ./install.sh             → installe dans le repo COURANT (templates/ + scaffold/)
#   ./install.sh --global    → installe juste les skills dans ~/.claude/skills/
#                              (dispo dans toutes tes sessions Claude Code, sur tout repo)
#
# Options :
#   --force, -f              → ne demande pas confirmation pour écraser les versions précédentes
#                              (utile pour les mises à jour automatiques)
#
# Pour un repo déjà bien rempli, préfère la voie assistée : /setup (skill) — voir README.md §7.

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="repo"
FORCE=false
for arg in "$@"; do
  case "$arg" in
    --global|-g) MODE="global" ;;
    --force|-f) FORCE=true ;;
    --help|-h)
      grep -E '^#( |$)' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Argument inconnu : $arg" >&2
      exit 2
      ;;
  esac
done

# ─────────────────────────────────────────────────────────────────────────
# Mode GLOBAL — installe les skills dans ~/.claude/skills/
# ─────────────────────────────────────────────────────────────────────────
if [ "$MODE" = "global" ]; then
  TARGET_SKILLS="$HOME/.claude/skills"
  echo "→ Installation GLOBALE des skills dans : $TARGET_SKILLS"

  mkdir -p "$TARGET_SKILLS"

  # Liste dynamique des skills présents dans le kit (gère l'évolution sans toucher au script)
  KIT_SKILLS=$(ls "$KIT_DIR/templates/.claude/skills/" 2>/dev/null)
  if [ -z "$KIT_SKILLS" ]; then
    echo "Aucun skill trouvé dans $KIT_DIR/templates/.claude/skills/" >&2
    exit 1
  fi

  conflict=0
  for s in $KIT_SKILLS; do
    if [ -e "$TARGET_SKILLS/$s" ]; then echo "  ⚠ existe déjà : ~/.claude/skills/$s"; conflict=1; fi
  done

  if [ "$conflict" = 1 ]; then
    if [ "$FORCE" = true ]; then
      echo "  → --force : suppression des anciennes versions sans confirmation."
    else
      read -r -p "Mettre à jour (supprimer puis ré-installer les skills présents dans le kit) ? [y/N] " ans
      case "$ans" in y|Y) ;; *) echo "Annulé."; exit 0 ;; esac
    fi
    # Supprime UNIQUEMENT les skills présents dans le kit — laisse les autres skills tiers tranquilles
    for s in $KIT_SKILLS; do
      rm -rf "$TARGET_SKILLS/$s"
    done
  fi

  cp -r "$KIT_DIR/templates/.claude/skills/." "$TARGET_SKILLS/"

  echo
  echo "✓ Skills installés globalement :"
  ls "$TARGET_SKILLS/"

  # ── Pre-flight guard hook (déterministe, bloque les skills sur repos non-setup) ──
  TARGET_HOOKS="$HOME/.claude/hooks"
  TARGET_SETTINGS="$HOME/.claude/settings.json"
  mkdir -p "$TARGET_HOOKS"
  cp "$KIT_DIR/templates/.claude/hooks/preflight-guard.py" "$TARGET_HOOKS/preflight-guard.py"
  chmod +x "$TARGET_HOOKS/preflight-guard.py"
  echo
  echo "→ Installation du garde-fou pre-flight (script déterministe)…"
  echo "  ✓ Hook copié : $TARGET_HOOKS/preflight-guard.py"

  if command -v python3 >/dev/null 2>&1; then
    python3 "$KIT_DIR/templates/.claude/hooks/register-hook.py" \
      "$TARGET_SETTINGS" \
      "UserPromptSubmit" \
      "$TARGET_HOOKS/preflight-guard.py" \
      5
  else
    echo "  ⚠ python3 absent — ajoute manuellement cette entrée à $TARGET_SETTINGS :"
    cat <<EOF
  {
    "hooks": {
      "UserPromptSubmit": [
        { "hooks": [
            { "type": "command", "command": "$TARGET_HOOKS/preflight-guard.py", "timeout": 5 }
        ]}
      ]
    }
  }
EOF
  fi

  echo
  echo "Étapes suivantes :"
  echo "  1. Ouvre une session Claude Code dans n'importe quel repo et tape /setup."
  echo "  2. Le skill /setup pose le workflow complet (CLAUDE.md, docs/WORKFLOW.md,"
  echo "     hooks per-repo dont test-gate.sh et preflight-guard.py local)."
  echo
  echo "Garde-fou actif : si tu tapes /spec /code … sur un repo sans docs/WORKFLOW.md,"
  echo "le hook global bloque et te demande de lancer /setup d'abord."
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────
# Mode REPO (par défaut) — installe templates/ + scaffold/ dans le repo courant
# ─────────────────────────────────────────────────────────────────────────
TARGET="$(pwd)"

if [ "$KIT_DIR" = "$TARGET" ]; then
  echo "Lance ce script depuis ton repo cible (ou utilise --global pour ~/.claude/skills/)." >&2
  exit 1
fi

echo "→ Déploiement du workflow dans : $TARGET"

conflict=0
for p in CLAUDE.md .claude docs/WORKFLOW.md knowledge features; do
  if [ -e "$TARGET/$p" ]; then echo "  ⚠ existe déjà : $p"; conflict=1; fi
done

if [ "$conflict" = 1 ]; then
  echo
  echo "Des éléments existent déjà. Pour un repo non vierge, préfère la voie ASSISTÉE :"
  echo "  ouvre une session Claude Code et tape /setup (le skill pilote la migration)."
  if [ "$FORCE" = false ]; then
    read -r -p "Copier quand même les fichiers MANQUANTS (sans rien écraser) ? [y/N] " ans
    case "$ans" in y|Y) ;; *) echo "Annulé."; exit 0 ;; esac
  fi
fi

cp -rn "$KIT_DIR/templates/." "$TARGET/" 2>/dev/null || cp -r "$KIT_DIR/templates/." "$TARGET/"
cp -rn "$KIT_DIR/scaffold/." "$TARGET/" 2>/dev/null || cp -r "$KIT_DIR/scaffold/." "$TARGET/"

touch "$TARGET/.gitignore"
grep -qxF '.cc-scratch/' "$TARGET/.gitignore" || echo '.cc-scratch/' >> "$TARGET/.gitignore"
grep -qxF 'CLAUDE.local.md' "$TARGET/.gitignore" || echo 'CLAUDE.local.md' >> "$TARGET/.gitignore"

chmod +x "$TARGET/.claude/hooks/"*.sh "$TARGET/.claude/statusline.sh" 2>/dev/null || true

echo
echo "✓ Fichiers en place. Étapes suivantes :"
echo "  1. Renseigne les placeholders dans CLAUDE.md (commandes build/test, conventions)."
echo "  2. Mets ta commande de tests rapides dans .claude/hooks/test-gate.sh (TEST_CMD)."
echo "  3. Vérifie : /hooks  ·  /setup /spec /code /test /research /feedback /support /post /article /newsletter"
