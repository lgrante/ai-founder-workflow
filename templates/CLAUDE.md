# CLAUDE.md

<!-- Court par design : pour chaque ligne, « la retirer ferait-elle faire une erreur à Claude ? » Sinon, coupe-la. -->

## Projet
<!-- Une ou deux phrases : ce que fait ce repo. -->

## Commandes
- Build :          # ex : npm run build
- Tests rapides :  # ex : npm run test:unit   (DOIT matcher .claude/hooks/test-gate.sh)
- Tests e2e :      # ex : npm run test:e2e
- Lint :           # ex : npm run lint

## Conventions
<!-- Nommage, style, structure propres à la stack. -->

## Étiquette repo
- Branches :       # ex : feature/<nom> — une feature = une branche (worktree si parallèle)
- Commits :        # ex : conventionnels
- Une feature à la fois, sauf worktrees git séparés.

## Workflow
Ce repo suit le workflow décrit dans `docs/WORKFLOW.md` :
sessions par feature + découverte, pipeline spec → code → test, filet rapide via hook.
Commandes : `/spec` `/code` `/test` `/research` `/feedback`.

## À la compaction
Toujours préserver : l'état du PLAN en cours, les fichiers modifiés, les critères d'acceptation.
Jeter le bruit des échecs déjà résolus.
