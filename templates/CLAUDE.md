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
- Branches : voir `docs/WORKFLOW.md` § Étiquette git pour la convention complète. Résumé :
  - **Build** : `feat/<feature>` (partagée spec/code/test) · `fix/<bug-slug>` (mode bug)
  - **Découverte** : `research/<topic>` · `feedback/<person>` · `support/<client>` (une branche par sujet/contact/client, reprise à chaque session)
  - **Audience** : `post/<channel>/<slug>` · `article/<slug>` · `newsletter/<edition>` · `report/<network>/<date>` (une branche par pièce / par rapport daté)
- Stage **par chemin explicite uniquement** (jamais `git add -A`) — multi-agents potentiels sur le même checkout.
- Pas de push automatique ; chaque session sur sa branche, merge à toi.
- Commits : conventionnels (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Worktrees git séparés pour features parallèles.

## Workflow
Ce repo suit le workflow décrit dans `docs/WORKFLOW.md` :
sessions par feature (build) + découverte + audience, pipeline `spec → code → test` côté build, tickets de bug dans `bugs/<slug>/TICKET.md` (écrits par `/test` ou `/support`, lus par `/code`), filet rapide via hook.

Commandes :
- **Setup / dev** : `/setup` `/spec` `/code <feature>` (ou `/code bugs/<slug>` pour fixer un ticket) `/test`
- **Découverte** : `/research <sujet>` `/feedback <qui>` `/support <client>`
- **Audience** : `/post <channel> <sujet>` `/article <sujet>` `/newsletter <edition>` `/report <network>`
- **Transverse** : `/status` (snapshot HTML responsive 360° — `--public` pour publier sur Pages)

## À la compaction
Toujours préserver : l'état du PLAN en cours, les fichiers modifiés, les critères d'acceptation.
Jeter le bruit des échecs déjà résolus.
