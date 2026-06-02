#!/usr/bin/env bash
# Stop hook — "filet rapide".
# Lance les tests RAPIDES (unitaires + intégration rapide) et empêche code-x de
# terminer un tour tant que ce n'est pas vert. Voir docs/WORKFLOW.md (§ Vérification).

# >>> À CONFIGURER : la commande qui lance tes tests RAPIDES (doit matcher CLAUDE.md).
TEST_CMD="npm test"          # ex : "pytest -q"  ·  "npm run test:unit"  ·  "go test ./..."

SCRATCH_DIR=".cc-scratch"
RESULT_FILE="$SCRATCH_DIR/test-gate.last.txt"

input="$(cat)"

# Anti-boucle OBLIGATOIRE : si Claude relance déjà à cause de ce hook, on le laisse finir.
# (Le Stop hook s'auto-désactive aussi après ~8 blocages consécutifs.)
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

mkdir -p "$SCRATCH_DIR"
if eval "$TEST_CMD" > "$RESULT_FILE" 2>&1; then
  exit 0                     # vert → code-x peut terminer l'étape
fi

# rouge → on bloque et on renvoie code-x corriger (le fichier de résultats = la preuve).
printf '%s\n' "{\"decision\":\"block\",\"reason\":\"Les tests rapides échouent. Lis $RESULT_FILE, corrige la cause, puis relance. Ne termine pas l'étape tant que ce n'est pas vert.\"}"
exit 0
