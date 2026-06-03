#!/usr/bin/env bash
set -euo pipefail

# Deux modes :
#   ./install.sh             → installe dans le repo COURANT (templates/ + scaffold/)
#   ./install.sh --global    → installe juste les skills dans ~/.claude/skills/
#                              (dispo dans toutes tes sessions Claude Code, sur tout repo)
#
# Pour un repo déjà bien rempli, préfère la voie assistée : /setup (skill) ou DEPLOY.md.

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="repo"
for arg in "$@"; do
  case "$arg" in
    --global|-g) MODE="global" ;;
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

  conflict=0
  for s in setup spec code test research feedback; do
    if [ -e "$TARGET_SKILLS/$s" ]; then echo "  ⚠ existe déjà : ~/.claude/skills/$s"; conflict=1; fi
  done

  if [ "$conflict" = 1 ]; then
    read -r -p "Écraser les skills existants ? [y/N] " ans
    case "$ans" in y|Y) rm -rf "$TARGET_SKILLS"/{setup,spec,code,test,research,feedback} ;; *) echo "Annulé."; exit 0 ;; esac
  fi

  cp -r "$KIT_DIR/templates/.claude/skills/." "$TARGET_SKILLS/"

  echo
  echo "✓ Skills installés globalement :"
  ls "$TARGET_SKILLS/"
  echo
  echo "Étapes suivantes :"
  echo "  1. Ouvre une session Claude Code dans n'importe quel repo et tape /setup."
  echo "  2. Le skill /setup pose le workflow complet (CLAUDE.md, docs/WORKFLOW.md, hooks)."
  echo
  echo "Note : ce mode n'installe PAS les hooks (test-gate.sh) ni settings.json — ces"
  echo "fichiers sont par-repo. Le skill /setup s'en charge dans chaque repo cible."
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
  echo "  ouvre une session Claude Code, tape /setup (ou donne-lui DEPLOY.md)."
  read -r -p "Copier quand même les fichiers MANQUANTS (sans rien écraser) ? [y/N] " ans
  case "$ans" in y|Y) ;; *) echo "Annulé."; exit 0 ;; esac
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
echo "  3. Vérifie : /hooks  ·  /setup /spec /code /test /research /feedback"
