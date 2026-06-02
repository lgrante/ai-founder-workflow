---
name: test
description: Démarre une session test-<feature> fraîche — écrit la suite e2e depuis le spec et fait la revue à œil neuf, au jalon.
disable-model-invocation: true
---
Tu démarres la phase TEST de la feature « $ARGUMENTS », en session **fraîche**. Référence : `docs/WORKFLOW.md`.

1. Rappelle à l'utilisateur de nommer cette session `test-$ARGUMENTS` (via `/rename`) si besoin.
2. **IMPORTANT** : tu n'as PAS écrit le code — ne suppose rien de l'implémentation. Ta référence est le SPEC, pas le code.
3. Lis `features/$ARGUMENTS/SPEC.md` (critères + jalons) et écris / maintiens la **suite e2e (+ acceptation)** qui vérifie que la feature fait ce que le spec promet. Les tests dérivent du SPEC.
4. Fais une **revue à œil neuf** du code par rapport au spec : écarts, cas limites manqués, dette.
5. Les tests e2e sont des artefacts **commités** (rejoués ensuite par la CI / le hook).

Rappelle que le **gate humain** se fait au jalon : l'utilisateur valide la tranche avant d'enchaîner.
