---
name: setup
description: Installe le workflow ai-founder-workflow sur le repo courant — inventaire, plan de migration, exécution phase par phase avec autorisation à chaque batch destructif. Filets de sécurité multiples (git tag rollback, scan fichiers sensibles, sous-repos protégés, pas de push auto).
disable-model-invocation: true
---
Tu démarres l'installation interactive du workflow ai-founder-workflow sur le repo courant. Référence doctrine : `README.md` + `templates/docs/WORKFLOW.md` du repo kit.

Tu connais ce repo (après l'inventaire), pas l'inverse. Ton job : poser l'architecture par défaut du kit sur la réalité de ce repo **sans perdre un fichier et sans rien casser chez l'utilisateur**.

## Règles d'or

1. **Lecture seule d'abord.** Reste en plan mode jusqu'à la validation du paquet Phase 0. Ne crée / déplace / modifie / supprime RIEN avant.
2. **État propre + branche source explicite + scan fichiers sensibles.** Si `git status` n'est pas clean, propose à l'utilisateur de commit/stash. Liste les fichiers modifiés/untracked, propose un commit minimal cohérent, **attends l'OK explicite**. **Scanne** pour fichiers sensibles (`.env*`, `*credentials*`, `*secret*`, `id_rsa*`, `*.pem`, `*.key`) qui ne seraient pas gitignored — signale-les et propose à l'utilisateur de les `.gitignore` + `git rm --cached` AVANT le commit préparatoire. Demande aussi **depuis quelle branche** créer `setup-workflow` (default proposé : `main` si la branche courante n'est pas main) — ne suppose jamais que la branche courante est la bonne base. **Si la branche source est sensible** (`main`, `master`, `production`, `release/*`, `prod/*`, `live/*`) → DOUBLE confirmation explicite avant de procéder.
3. **Garantie anti-perte.** Chaque fichier impacté figure dans une carte de migration (`move` / `merge` / `keep` / `archive` / `delete`+raison). `git mv` partout (préserve l'historique). Obsolètes → `_archive/`, jamais supprimés directement. Toute opération destructive demande une autorisation explicite.
4. **Autorisation par batch logique**, pas par fichier : annonce le groupe d'opérations cohérent (ex. « je vais faire 12 git mv pour structurer knowledge/ »), un OK = tout le batch passe. Sauf si un fichier de ce batch est sensible : alors traite-le séparément.
5. **Validation phase par phase.** Commit dédié + court compte-rendu à chaque phase, **attente de l'OK utilisateur entre chaque phase**.
6. **Sous-repos / submodules : KEEP par défaut.** Ne touche **jamais** aux sous-repos (gitlinks dans l'index, repos imbriqués avec leur propre `.git`) sans autorisation explicite séparée. Le code applicatif et les sous-repos restent intacts par défaut — `git diff` sur leurs chemins doit être vide à la fin.
7. **Aucun `git push` automatique.** Le skill propose le push **uniquement à la Phase Final**, après validation complète de l'utilisateur. Aucun push ne se fait à aucune autre étape, jamais. Idem pour `push -f`, push de tags, push sur un autre remote — toujours OK explicite séparé.

## Sécurité & rollback

Le skill applique plusieurs filets pour qu'aucune action ne soit irréversible avant la validation finale.

### Filet ultime : tag `pre-setup-<timestamp>`

**Tout début de la Pré-Phase 1** (avant `git checkout -b setup-workflow`), créer un tag de rollback :

```bash
git tag pre-setup-$(date +%Y-%m-%d-%H%M)
```

À n'importe quelle phase, l'utilisateur peut revenir à l'état initial :

```bash
git checkout <branche-origine>
git branch -D setup-workflow
git reset --hard pre-setup-<timestamp>
# (optionnel, après vérif)
git tag -d pre-setup-<timestamp>
```

### Pas de push automatique

Toutes les phases commitent **en local seulement**. Le push n'est proposé qu'à la Phase Final, et nécessite OK explicite. L'utilisateur garde le contrôle total avant que quoi que ce soit ne sorte sur un remote.

### Fichiers sensibles

Pré-Phase 1 scanne le working tree pour des patterns suspects (`.env*`, `*credentials*`, `*secret*`, `id_rsa*`, `*.pem`, `*.key`). Si trouvés et non-gitignored :
- signale explicitement à l'utilisateur,
- propose de les `.gitignore` + `git rm --cached`,
- **n'inclus jamais un fichier sensible dans le commit préparatoire**.

### Branches sensibles

Si la branche source choisie matche `main` / `master` / `production` / `release/*` / `prod/*` / `live/*` :
- affiche un message d'avertissement explicite,
- demande une **double confirmation** : « Tu vas créer setup-workflow depuis la branche sensible `<branche>`. C'est ton dernier filet pour switcher. Continuer ? »
- Si l'utilisateur dit oui : procède. Sinon : repropose le choix de branche.

### Sous-repos / gitlinks

Détecter les sous-repos (gitlinks dans l'index `git ls-files --stage | grep ^160000`, repos imbriqués avec `.git` à l'intérieur) et les inscrire en **KEEP** par défaut dans la carte de migration. Aucune modification dans un sous-repo sans :
1. signaler explicitement le besoin à l'utilisateur,
2. proposer un commit **séparé dans le sous-repo** (depuis sa propre branche),
3. proposer un bump du gitlink dans le parent **uniquement après push** du sous-repo.

### Plan de rollback en une commande

Si l'utilisateur veut tout annuler :

```bash
git checkout <branche-origine>
git branch -D setup-workflow
git reset --hard pre-setup-<timestamp>
ls _archive/  # vérifier qu'aucun artefact important ne reste avant rm -rf
```

Aucun fichier perdu (les déplacements via `git mv` sont récupérables via le reflog ou les tags).

## Architecture cible (résumé)

```
<repo>/
├── CLAUDE.md                 # court, par projet (commandes, conventions, étiquette)
├── CLAUDE.local.md           # gitignored — notes perso
├── docs/WORKFLOW.md          # doctrine, copie de templates/docs/WORKFLOW.md du kit
├── .claude/
│   ├── settings.json         # Stop hook → test-gate.sh
│   ├── hooks/test-gate.sh    # filet rapide (anti-boucle stop_hook_active obligatoire)
│   ├── statusline.sh         # OPTIONNEL — % contexte
│   └── skills/               # 10 skills : setup, spec, code, test (dev) + research, feedback, support (découverte) + post, article, newsletter (audience)
├── knowledge/                # axe DÉCOUVERTE (continu, jamais par feature)
│   ├── market/               # recherche marché
│   ├── insights.md           # agrégat global (features ET contenu — alimenté par les 3 types discovery)
│   ├── content/brand-book.md # tonalité, style, voice (lu par /post /article /newsletter)
│   ├── crm/contacts/         # données perso (user-feedback) — gitignored OU repo séparé
│   └── support/              # 4e type découverte : tickets clients (Jira/Zendesk/…)
│       ├── clients/<client>.md  # résumé cumulatif daté par client
│       └── insights.md          # agrégat motifs cross-clients support
├── features/<feature>/       # axe BUILD — racine = version active
│   ├── README.md             # statut + liens
│   ├── SPEC.md / SPEC.html   # le quoi (possédé par spec-x)
│   ├── PLAN.md / PLAN.html   # le comment (possédé par code-x)
│   ├── sub-features/<slug>/  # composants/pages atomiques (récursif)
│   ├── prototypes/           # mockups
│   ├── qa/sprint-{N}-{slug}/ # captures par sprint
│   ├── plans/                # roadmap
│   └── archives/v{N}/        # versions périmées
├── content/                  # axe AUDIENCE (continu, output pour les réseaux)
│   ├── linkedin/{drafts,scheduled,posted}/
│   ├── twitter-x/{drafts,posted}/
│   ├── blog/{wip,published}/
│   └── newsletter/<edition>.md
├── .cc-scratch/              # gitignored — résultats de tests transitoires + creds locaux (ex. support-creds.json)
├── _archive/                 # transit avant suppression définitive
└── <code applicatif>         # INCHANGÉ
```

Détail complet : `templates/docs/WORKFLOW.md` du kit (Convention par-feature + Trois axes).

## Pipeline

1. **Pré-Phase 1 — État propre + branche source + filets de sécurité** :
   - **A. Tag de rollback** : `git tag pre-setup-$(date +%Y-%m-%d-%H%M)` **AVANT toute action**. Annonce-le à l'utilisateur (filet ultime de retour en arrière).
   - **B. Scan fichiers sensibles** : cherche `.env*`, `*credentials*`, `*secret*`, `id_rsa*`, `*.pem`, `*.key` dans le working tree. Si trouvés et non-gitignored → signale et propose à l'utilisateur de les `.gitignore` + `git rm --cached` AVANT tout commit préparatoire.
   - **C. État propre** : `git status` → si pas clean, propose un commit minimal cohérent OU `git stash` (selon ce que l'utilisateur veut faire des changes). Attends l'OK explicite.
   - **D. Branche source** : demande via `AskUserQuestion` depuis quelle branche créer setup-workflow — (a) la branche courante (affiche son nom), (b) `main`, (c) une autre branche qu'il précise. Default proposé : `main` si la branche courante n'est pas `main`. **Si la branche source est sensible** (`main`, `master`, `production`, `release/*`, `prod/*`, `live/*`) → **double confirmation explicite** avant de procéder.
   - **E. Switch et pull** : Si la branche source ≠ branche courante → `git checkout <branche-source>`. Si elle suit un remote, propose un `git pull` à l'utilisateur (recommandé).
   - **F. Création de setup-workflow** : Puis `git checkout -b setup-workflow` depuis cette branche source.

2. **Phase 0 — Inventaire & plan (lecture seule)** :
   - Inventorie : arborescence, code applicatif (stack), `.claude/` existant, `CLAUDE.md`, hooks/skills présents, **setup de test** (frameworks unit/e2e, commandes exactes), sous-repos / submodules, axe par-rôle résiduel, entanglements code↔orchestration, contenu marketing/audience préexistant (drafts, posts, articles, brand book) à intégrer dans `content/` et `knowledge/content/`, **système de support en place** (Jira, Zendesk, Linear…) à intégrer dans `knowledge/support/`.
   - Propose un mapping de l'architecture du kit sur ce repo (avec **écarts justifiés**).
   - Produit la **carte de migration `old → new`** explicite (chaque fichier/dossier impacté → action).
   - Lance `AskUserQuestion` pour les décisions stratégiques : périmètre (code applicatif KEEP ?), sort des dossiers par-rôle, setup de test, CRM (versionné ici ou repo séparé ?), préfixes de session, sous-repos formalisés en submodules ou pas, worktrees morts à supprimer ?, channels audience à scaffolder (LinkedIn, Twitter/X, blog, newsletter, autres ?), **système de support utilisé** (Jira / Zendesk / autre / aucun) ?
   - **Attends la validation complète (plan + carte + questions) AVANT toute action.**

3. **Phase 1 — Restructuration** : annonce le batch de `git mv`. Crée l'ossature (`mkdir -p _archive/`, `knowledge/`, `knowledge/content/`, `knowledge/support/clients/`, `features/`, `content/<channels>/{drafts,posted,...}/`, `.cc-scratch/`, `.claude/skills/`, `docs/`). Exécute les `git mv` validés (incl. déplacement de drafts/posts préexistants vers `content/<channel>/posted/`). Archive READMEs obsolètes. Supprime worktrees morts (autorisation explicite). **Commit Phase 1.**

4. **Phase 2 — Doctrine** : crée `CLAUDE.md` (court, rempli avec specs du repo), copie `docs/WORKFLOW.md` depuis `templates/docs/WORKFLOW.md` du kit, crée READMEs racine + `knowledge/` + `features/` + `content/`, crée `knowledge/insights.md` squelette, crée `knowledge/content/brand-book.md` placeholder si absent, crée `knowledge/support/insights.md` squelette. **Commit Phase 2.**

5. **Phase 3 — Outillage** : importe les 10 skills depuis `templates/.claude/skills/` (setup, spec, code, test côté dev ; research, feedback, support côté découverte ; post, article, newsletter côté audience), les hooks (`test-gate.sh` + 2 optionnels `context-handoff.sh` et `context-restore.sh`), `settings.json`, `statusline.sh`. Modifie `.gitignore` pour versionnement partiel `.claude/` (ignore `settings.local.json`, `scheduled_tasks.lock`, `worktrees/`). **Commit Phase 3.**

6. **Phase 4 — Configurer TEST_CMD** : discute avec l'utilisateur des options selon la stack (uv / venv / docker / autre). Demande la commande exacte. Edit `test-gate.sh` + `CLAUDE.md` (cohérence : la commande doit matcher au mot près). Smoke-test : `echo '{}' | .claude/hooks/test-gate.sh ; echo "exit=$?"`. **Commit Phase 4.**

7. **Phase 5 — Refonte features/ existantes** (optionnel, si le repo a déjà du contenu produit) : pour chaque feature pré-existante avec contenu, propose la migration vers la convention standard (`SPEC.md / PLAN.md / sub-features/ / prototypes/ / qa/ / plans/ / archives/v{N}/`). Pour chaque feature, demande si c'est une **itération sur la version active** (édition in-place) ou une **refonte majeure** (archive la racine dans `archives/v{N}/`). **Commit Phase 5.**

8. **Final** : **propose** le push de la branche `setup-workflow` (avec OK explicite séparé — aucun push automatique). Rappelle à l'utilisateur : merger sur `main` quand satisfait, vider `_archive/` après validation finale, supprimer le tag `pre-setup-<timestamp>` quand tout va bien. Suggère des dry-run pour valider les pipelines en bout-en-bout : `/spec <feature>` (build), `/support <client>` (découverte si système de tickets configuré), `/post linkedin <sujet>` (audience).

## Critères de succès

- Plan validé par l'utilisateur en Phase 0.
- **Aucun fichier perdu** : chaque entrée de la carte de migration est honorée.
- **Historique préservé** : tous les déplacements via `git mv` (renames à 100% similarity).
- **Code applicatif intact** : `git diff` sur les chemins applicatifs est vide (sauf décision explicite de l'utilisateur).
- **Sous-repos intacts** : `git diff` sur leurs chemins est vide.
- **Aucun fichier sensible commité** : `.env*`, secrets, clés n'apparaissent dans aucun commit du pipeline.
- **Aucun push automatique** : la branche `setup-workflow` reste locale jusqu'à l'OK explicite de la Phase Final.
- **Tag de rollback présent** : `git tag` montre `pre-setup-<timestamp>` et l'utilisateur peut revenir en arrière à tout moment.
- L'outillage marche : `/hooks` montre le `Stop` hook chargé ; `/setup /spec /code /test /research /feedback /support /post /article /newsletter` apparaissent (les 10).
- Smoke-test du hook : `echo '{}' | .claude/hooks/test-gate.sh ; echo "exit=$?"` retourne `exit=0` (vert) ou un JSON `decision:block` parsable.
- Dry-run d'une petite feature passe le pipeline build de bout en bout : `/spec` → `SPEC.md` → `/code` → étape → hook vert → `/test` au jalon → gate humain.
- Dry-run d'un draft de post (optionnel) : `/post linkedin <sujet>` → draft écrit dans `content/linkedin/drafts/` → review → déplacement vers `scheduled/` ou `posted/`.
- Dry-run support (optionnel, si système configuré) : `/support <client>` → résumé écrit dans `knowledge/support/clients/<client>.md` avec frontmatter daté.

## Cas limites

- **Repo vierge** (pas de `.claude/`, pas de `features/`, pas de `content/`) : Phase 0 minimale (rien à migrer), scaffold direct la structure standard.
- **Repo déjà setup** (`.claude/skills/spec/SKILL.md` existe) : signale et demande à l'utilisateur s'il veut **mettre à jour** (Phase 3 seulement) ou **ré-installer** (toutes les phases). Ne ré-installe pas auto.
- **Sous-repos avec leur propre `.git`** (gitlinks ou repos imbriqués sans `.gitmodules`) : KEEP par défaut, ne touche pas. Signale leur présence à l'utilisateur.
- **Sous-repo qui DOIT être modifié** (ex. paths en dur cassés par la migration) : signale précisément les modifs nécessaires + propose un commit séparé dans le sous-repo + bump du gitlink dans le parent (après push du sous-repo, et avec OK explicite à chaque étape).
- **Repo qui a déjà du contenu marketing dispersé** (drafts, brand book, posts publiés ailleurs) : propose une carte de migration dédiée pour `content/` et `knowledge/content/`. Ne supprime aucun contenu existant sans autorisation explicite.
- **Pas de système de support utilisé** : skip le scaffold de `knowledge/support/` (juste créer le dossier vide pour future use).
- **Fichiers sensibles détectés et l'utilisateur refuse de les exclure** : signale le risque et abandonne plutôt que de commiter avec des secrets exposés.
- **Branche source sensible refusée 2x** : repropose un choix de branche, ne force pas.
- **Interruption utilisateur** : ne reprends pas auto, attends une instruction. Le tag `pre-setup-<timestamp>` reste en place comme filet.

## À éviter

- Lancer plusieurs phases sans validation entre chaque.
- Demander la validation par fichier individuel (sauf opération destructive isolée comme `rm -rf` d'un worktree).
- Garder des fichiers obsolètes sans passer par `_archive/` (perte d'historique).
- Toucher au code applicatif sauf demande explicite.
- Toucher à un sous-repo sans autorisation séparée.
- **Pousser quoi que ce soit sans OK explicite** (aucune phase ne push, jamais — sauf la Phase Final après validation).
- Supprimer définitivement (`rm`, `git rm` final) avant la validation finale — `_archive/` est le seuil intermédiaire jusqu'à la validation Phase Final.
- Commiter un fichier sensible (`.env`, credentials, clés) — toujours scanner avant le commit préparatoire.
- Faire un `git reset --hard` ou `git push -f` automatique — destructif, jamais sans OK explicite séparé.

<!-- Exemple d'usage :
  /setup
  → git tag pre-setup-2026-06-03-1530 (filet rollback)
  → scan fichiers sensibles → 1 `.env` non-gitignored détecté → propose .gitignore + git rm --cached → OK
  → git status → 3 untracked + 1 modified → propose commit minimal cohérent → OK
  → "Tu es sur `main`. Créer setup-workflow depuis : (a) main, (b) autre ?" → "main est sensible, double confirmation : continuer ?" → OK
  → git checkout -b setup-workflow
  → Phase 0 : inventorie 247 fichiers, propose carte + AskUserQuestion (6 questions) → OK
  → Phase 1 : "12 git mv pour structurer features/, knowledge/, content/ — OK ?" → OK → commit
  → Phase 2-5 : idem, commit par phase
  → Phase Final : "Tout commité local sur setup-workflow. Tu veux que je push origin setup-workflow ?" → OK → push
  → Rappelle : tag pre-setup-... est ton filet, supprime-le quand satisfait. -->
