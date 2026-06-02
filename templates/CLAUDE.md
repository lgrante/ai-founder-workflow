# CLAUDE.md

<!-- Court par design : pour chaque ligne, « la retirer ferait-elle faire une erreur à Claude ? » Sinon, coupe-la.
     Le savoir de domaine (front, back/API) va dans .claude/skills/, chargé à la demande — pas ici. -->

## Projet
<!-- Une ou deux phrases : ce que fait ce repo + sa stack. -->

## Commandes
- Build :          # ex : npm run build
- Tests rapides :  # ex : npm run test:unit   ← DOIT être identique à TEST_CMD dans .claude/hooks/test-gate.sh
- Tests e2e :      # ex : npm run test:e2e    ← lancés par test-<feature> au jalon, pas par le hook
- Lint :           # ex : npm run lint

## Conventions
<!-- Seulement ce que Claude ne devine pas : style imposé, patterns maison, pièges du repo. -->

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
