#!/usr/bin/env bash
# Stop hook — "filet rapide".
# Lance les tests RAPIDES (unitaires + intégration rapide) et empêche code-x de
# terminer un tour tant que ce n'est pas vert. Voir docs/WORKFLOW.md (§ Vérification).
#
# Branché par .claude/settings.json (événement "Stop"). À chaque fin de tour de
# code-x, ce script tourne ; rouge → renvoie Claude corriger (sans rendre la main).
#
# Usage / mise au point :
#   - garde TEST_CMD identique à « Tests rapides » dans CLAUDE.md ;
#   - vise des tests RAPIDES (quelques secondes) — pas l'e2e, qui est le boulot de test-x au jalon ;
#   - si le timeout de 120 s (settings.json) est trop court, augmente-le là-bas ;
#   - tester le script à la main :  echo '{}' | .claude/hooks/test-gate.sh ; echo "exit=$?"
#     (passe '{"stop_hook_active":true}' pour vérifier que la garde anti-boucle laisse finir).

# >>> À CONFIGURER : la commande qui lance tes tests RAPIDES (doit matcher CLAUDE.md).
TEST_CMD="npm test"
# Exemples par stack (remplace la ligne ci-dessus) :
#   node / npm   :  TEST_CMD="npm run test:unit"
#   node / pnpm  :  TEST_CMD="pnpm vitest run"
#   python       :  TEST_CMD="pytest -q"
#   python/poetry:  TEST_CMD="poetry run pytest -q"
#   go           :  TEST_CMD="go test ./..."
#   rust         :  TEST_CMD="cargo test --quiet"
#   java/maven   :  TEST_CMD="mvn -q test"
#   make         :  TEST_CMD="make test"
# Astuce : cible un sous-ensemble rapide si la suite complète est lente
#   (ex : TEST_CMD="pytest -q tests/unit"  ·  "go test ./internal/...").

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
