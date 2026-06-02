#!/usr/bin/env bash
set -euo pipefail

# Déploie le workflow (templates/ + scaffold/) dans le repo COURANT.
# Voie "simple". Pour un repo déjà bien rempli, préfère la voie assistée : DEPLOY.md.

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$(pwd)"

if [ "$KIT_DIR" = "$TARGET" ]; then
  echo "Lance ce script depuis ton repo cible, pas depuis le kit."
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
  echo "  ouvre une session Claude Code et donne-lui DEPLOY.md (migration tracée, rien d'écrasé)."
  read -r -p "Copier quand même les fichiers MANQUANTS (sans rien écraser) ? [y/N] " ans
  case "$ans" in y|Y) ;; *) echo "Annulé."; exit 0 ;; esac
fi

cp -rn "$KIT_DIR/templates/." "$TARGET/" 2>/dev/null || cp -r "$KIT_DIR/templates/." "$TARGET/"
cp -rn "$KIT_DIR/scaffold/." "$TARGET/" 2>/dev/null || cp -r "$KIT_DIR/scaffold/." "$TARGET/"

touch "$TARGET/.gitignore"
grep -qxF '.cc-scratch/' "$TARGET/.gitignore" || echo '.cc-scratch/' >> "$TARGET/.gitignore"
grep -qxF 'CLAUDE.local.md' "$TARGET/.gitignore" || echo 'CLAUDE.local.md' >> "$TARGET/.gitignore"

chmod +x "$TARGET/.claude/hooks/test-gate.sh" 2>/dev/null || true

echo
echo "✓ Fichiers en place. Étapes suivantes :"
echo "  1. Renseigne les placeholders dans CLAUDE.md (commandes build/test, conventions)."
echo "  2. Mets ta commande de tests rapides dans .claude/hooks/test-gate.sh (TEST_CMD)."
echo "  3. Vérifie : /hooks  ·  /spec  /code  /test  /research  /feedback"
