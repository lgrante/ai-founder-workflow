# DEPLOY — poser ce workflow sur un repo (brief pour une session Claude Code)

> **À donner en ouverture d'une session Claude Code, dans le repo cible.**
> Tu connais ce repo ; ce brief décrit le workflow et l'architecture par défaut.
> Doctrine complète : `README.md` du kit + `templates/docs/WORKFLOW.md`.
>
> **Alternative recommandée** : `/setup` (skill installé via `templates/.claude/skills/setup/`). Mêmes garanties, plus interactif — Claude pilote, demande validation à chaque batch destructif, commite phase par phase. Ce DEPLOY.md reste utile pour comprendre la doctrine ou si tu préfères la voie manuelle.

## Objectif
Poser le workflow (sessions par feature + découverte, pipeline spec→code→test, filet rapide via hook) sur **ce** repo, **sans perdre aucun fichier** et en gardant l'humain dans la boucle à chaque étape.

## Règles d'or (dans l'ordre, sans exception)
1. **Lecture seule d'abord.** Reste en *plan mode*. Tu ne crées / déplaces / modifies / supprimes **rien** tant que je n'ai pas validé le paquet de Phase 0.
2. **Périmètre :** on installe / réorganise la **couche orchestration & connaissance** (`.claude/`, `docs/WORKFLOW.md`, `knowledge/`, `features/`). Le **code applicatif reste en place** — tu peux proposer des déplacements, jamais les exécuter sans mon accord explicite.
3. **Garantie anti-perte (si refonte) :** chaque fichier existant impacté figure dans une **carte de migration** (`move` / `merge` / `keep` / `archive` / `delete`+raison). `git mv` pour l'historique ; obsolètes → `_archive/`, jamais supprimés directement ; toute opération destructive demande ma **confirmation explicite**.
4. **Validation phase par phase**, commit dédié + court compte-rendu à chaque phase.

> Filet : je mets le repo sur une branche `setup-workflow` propre avant qu'on commence.

## Phase 0 (lecture seule) — à me soumettre AVANT d'agir
- **Inventaire** : arborescence, où vit le code applicatif (+ stack), orchestration déjà présente (`.claude/`, hooks, skills, `CLAUDE.md`), **setup de test** (frameworks unit/e2e, CI, **commandes exactes**), conventions, endroits où code et orchestration sont enchevêtrés.
- **Plan d'application** : comment l'architecture par défaut (voir kit) se pose sur CE repo — arborescence concrète + **écarts justifiés**. Reste conforme à la doctrine (deux axes, pipeline, mémoire dans les fichiers, **pas d'axe par rôle**).
- **Carte de migration** `old → new` (si des éléments existent déjà).
- **Liste de questions** (`AskUserQuestion`). Tu ne passes à l'action qu'une fois que j'ai validé : plan + carte + questions.

## Architecture cible par défaut (à adapter)
```
<repo>/
├── CLAUDE.md                 # court : commandes, conventions, étiquette
├── CLAUDE.local.md           # gitignored
├── .claude/{settings.json, hooks/test-gate.sh, skills/{spec,code,test,research,feedback}/}
├── docs/WORKFLOW.md
├── knowledge/{market/, insights.md, crm/contacts/}    # découverte
├── features/<feature>/{SPEC.md, PLAN.md}              # build
├── .cc-scratch/              # gitignored — résultats de tests transitoires
└── <code applicatif>         # INCHANGÉ
```
Ce qui doit survivre peu importe les noms : découverte et build séparés ; SPEC+PLAN co-localisés ; commandes/savoir dans `.claude/skills/` ; statut à un seul endroit (cases du PLAN) ; résultats de tests = scratch gitignored.

## Phasage proposé
0. Inventaire + plan + carte + questions (lecture seule).
1. Restructuration validée (`git mv`, obsolètes → `_archive/`).
2. `CLAUDE.md` + `docs/WORKFLOW.md` + `knowledge/` & `features/`.
3. Commandes + skills (`.claude/skills/`).
4. Hook + intégration des tests (selon le setup réel ; renseigner `TEST_CMD` dans `test-gate.sh`).
5. Finalisation découverte + visibilité git, puis validation finale avant de vider `_archive/`.

## Critères de succès
- Plan validé ; **aucun fichier perdu** ; historique préservé (`git mv`) ; **code applicatif intact** (`git diff` vide sur ses chemins, sauf accord) ; `/hooks` montre le hook ; `/spec /code /test /research /feedback` apparaissent ; un dry-run d'une petite feature passe spec → code → hook vert → jalon e2e.
