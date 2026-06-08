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
  - **Backlog** : `backlog` (branche unique, reprise)
  - **Audience** : `post/<channel>/<slug>` · `article/<slug>` · `newsletter/<edition>` · `report/<network>/<date>` (une branche par pièce / par rapport daté)
- Stage **par chemin explicite uniquement** (jamais `git add -A`) — multi-agents potentiels sur le même checkout.
- Pas de push automatique ; chaque session sur sa branche, merge à toi.
- Commits : conventionnels (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Worktrees git séparés pour features parallèles.

## Workflow
Ce repo suit le workflow décrit dans `docs/WORKFLOW.md` :
sessions par feature (build) + découverte + audience, pipeline `backlog → spec → code → test` côté build, tickets de bug dans `bugs/<slug>/TICKET.md` (écrits par `/test` ou `/support`, lus par `/code`), items de backlog dans `backlog/<slug>.md` (pont Découverte→Build, groomés par `/backlog`, lus par `/spec`), filet rapide via hook.

Commandes :
- **Setup / dev** : `/setup` `/spec` `/code <feature>` (ou `/code bugs/<slug>` pour fixer un ticket) `/test`
- **Découverte** : `/research <sujet>` `/feedback <qui>` `/support <client>`
- **Backlog** : `/backlog` (toilette/priorise les motifs en candidats à spécifier → `backlog/<slug>.md`)
- **Audience** : `/post <channel> <sujet>` `/article <sujet>` `/newsletter <edition>` `/report <network>`
- **Transverse** : `/status` (snapshot HTML responsive 360° — `--public` pour publier sur Pages ; écrit aussi `knowledge/dashboard.html`, vue *latest* gitignored)

## Jumeaux HTML
Tout `.md` livrable (SPEC, PLAN, ARCHITECTURE, TICKET, research, content, reports…) obtient automatiquement un `<fichier>.html` jumeau via le hook `.claude/hooks/md-to-html.py` (`PostToolUse`). N'écris **pas** ce `.html` à la main et ne l'édite jamais (il est réécrit à chaque sauvegarde du `.md`) — édite seulement le `.md` source. Cf. `docs/WORKFLOW.md` § Jumeau HTML.

## À la compaction
Toujours préserver : l'état du PLAN en cours, les fichiers modifiés, les critères d'acceptation.
Jeter le bruit des échecs déjà résolus.
