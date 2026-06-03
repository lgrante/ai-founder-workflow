---
name: setup
description: Installe le workflow ai-founder-workflow sur le repo courant — inventaire (incl. archéologie des memory Claude et des sessions passées), plan de migration, exécution phase par phase avec autorisation à chaque batch destructif. Filets de sécurité multiples (git tag rollback, scan fichiers sensibles, sous-repos protégés, pas de push auto).
disable-model-invocation: true
---
Tu démarres l'installation interactive du workflow ai-founder-workflow sur le repo courant. Référence doctrine : `README.md` + `templates/docs/WORKFLOW.md` du repo kit.

Tu connais ce repo (après l'inventaire), pas l'inverse. Ton job : poser l'architecture par défaut du kit sur la réalité de ce repo **sans perdre un fichier, sans rien casser chez l'utilisateur, et sans oublier les artefacts éphémères produits dans les sessions passées qui n'ont jamais été commités**.

## Règles d'or

1. **Lecture seule d'abord.** Reste en plan mode jusqu'à la validation du paquet Phase 0. Ne crée / déplace / modifie / supprime RIEN avant.
2. **État propre + branche source explicite + scan fichiers sensibles.** Si `git status` n'est pas clean, propose à l'utilisateur de commit/stash. Liste les fichiers modifiés/untracked, propose un commit minimal cohérent, **attends l'OK explicite**. **Scanne** pour fichiers sensibles (`.env*`, `*credentials*`, `*secret*`, `id_rsa*`, `*.pem`, `*.key`) qui ne seraient pas gitignored — signale-les et propose à l'utilisateur de les `.gitignore` + `git rm --cached` AVANT le commit préparatoire. Demande aussi **depuis quelle branche** créer `setup-workflow` (default proposé : `main` si la branche courante n'est pas main) — ne suppose jamais que la branche courante est la bonne base. **Si la branche source est sensible** (`main`, `master`, `production`, `release/*`, `prod/*`, `live/*`) → DOUBLE confirmation explicite avant de procéder.
3. **Garantie anti-perte.** Chaque fichier impacté figure dans une carte de migration (`move` / `merge` / `keep` / `archive` / `delete`+raison / **`recover`** pour les artefacts retrouvés en archéologie). `git mv` partout (préserve l'historique). Obsolètes → `_archive/`, jamais supprimés directement. Toute opération destructive demande une autorisation explicite.
4. **Autorisation par batch logique**, pas par fichier : annonce le groupe d'opérations cohérent (ex. « je vais faire 12 git mv pour structurer knowledge/ »), un OK = tout le batch passe. Sauf si un fichier de ce batch est sensible : alors traite-le séparément.
5. **Validation phase par phase.** Commit dédié + court compte-rendu à chaque phase, **attente de l'OK utilisateur entre chaque phase**.
6. **Sous-repos / submodules : KEEP par défaut.** Ne touche **jamais** aux sous-repos (gitlinks dans l'index, repos imbriqués avec leur propre `.git`) sans autorisation explicite séparée. Le code applicatif et les sous-repos restent intacts par défaut — `git diff` sur leurs chemins doit être vide à la fin.
7. **Aucun `git push` automatique.** Le skill propose le push **uniquement à la Phase Final**, après validation complète de l'utilisateur. Aucun push ne se fait à aucune autre étape, jamais. Idem pour `push -f`, push de tags, push sur un autre remote — toujours OK explicite séparé.
8. **Étiquette git pour les sessions futures.** `/setup` tourne sur sa branche dédiée `setup-workflow`. Mais **toutes les sessions ultérieures** (spec, code, test, research, feedback, support, post, article, newsletter, report) suivront la convention de nommage de branche définie dans `templates/docs/WORKFLOW.md` § Étiquette git (préfixes par axe : `feat/`, `fix/`, `research/`, `feedback/`, `support/`, `post/`, `article/`, `newsletter/`, `report/`). Vérifie que le fichier WORKFLOW.md est copié en Phase 2 et mentionne cette convention dans le compte-rendu final de Phase Finale.
8. **Archéologie en lecture seule.** Toute lecture dans `~/.claude/projects/<repo-slug>/` (memory files + transcripts de sessions) est **strictement lecture seule**. Aucune écriture, aucun déplacement dans ce dossier, jamais. Les artefacts retrouvés y restent en place ; ils sont juste **copiés** dans la nouvelle arborescence du repo.

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

### Archéologie en lecture seule

Toute la fouille en Phase 0 (memory files + transcripts de sessions) est **read-only sur `~/.claude/projects/<repo-slug>/`**. Aucune écriture, aucun déplacement, jamais. Les artefacts retrouvés sont **copiés** (pas déplacés) vers la nouvelle arborescence du repo. Les fichiers originaux dans `~/.claude/projects/` restent intacts.

### Plan de rollback en une commande

Si l'utilisateur veut tout annuler :

```bash
git checkout <branche-origine>
git branch -D setup-workflow
git reset --hard pre-setup-<timestamp>
ls _archive/  # vérifier qu'aucun artefact important ne reste avant rm -rf
```

Aucun fichier perdu (les déplacements via `git mv` sont récupérables via le reflog ou les tags ; les artefacts retrouvés en archéologie ont leur original intact dans `~/.claude/projects/`).

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
│   └── skills/               # 12 skills : setup, spec, code, test (dev) + research, feedback, support (découverte) + post, article, newsletter, report (audience)
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
├── bugs/<slug>/              # tickets de bug — écrits par /test ou /support, lus par /code
│   ├── TICKET.md             # repro + comportement attendu + critère "ne se reproduit plus"
│   └── PLAN.md               # plan de fix (optionnel, écrit par /code si non trivial)
├── content/                  # axe AUDIENCE (continu, output pour les réseaux)
│   ├── linkedin/             # drafts/ scheduled/ posted/ + stats/ insights/ (alimentés par /report)
│   ├── twitter-x/            # drafts/ posted/ + stats/ insights/
│   ├── blog/                 # wip/ published/ + stats/ insights/
│   └── newsletter/           # <edition>.md + stats/ insights/
│   # Post text-only = .md plat. Post avec asset = dossier <slug>/{post.md, hero.png, …}
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

2. **Phase 0 — Inventaire + archéologie + plan (lecture seule)** :

   **2.1. Inventaire des fichiers** : arborescence, code applicatif (stack), `.claude/` existant, `CLAUDE.md`, hooks/skills présents, **setup de test** (frameworks unit/e2e, commandes exactes), sous-repos / submodules, axe par-rôle résiduel, entanglements code↔orchestration, contenu marketing/audience préexistant (drafts, posts, articles, brand book) à intégrer dans `content/` et `knowledge/content/`, **système de support en place** (Jira, Zendesk, Linear…) à intégrer dans `knowledge/support/`.

   **2.2. Archéologie des memory Claude** (toujours active, lecture seule) :
   - Calcule le slug du repo : `~/.claude/projects/<repo-slug>/` (où `<repo-slug>` = chemin du repo avec `/` → `-`, ex. `/Users/louis/org-lookup` → `-Users-louis-org-lookup`).
   - Si le dossier `memory/` existe : lis `MEMORY.md` (index) + tous les fichiers `.md` qu'il référence (typiquement `user_*.md`, `feedback_*.md`, `project_*.md`, `reference_*.md`).
   - Intègre les **décisions, préférences, contraintes, contexte historique** révélés par ces mémoires dans le mapping de Phase 0. Ne réinvente pas ce qui a déjà été décidé. Si une mémoire contredit la doctrine du kit, signale la tension à l'utilisateur pour qu'il tranche.
   - Si pas de dossier `memory/` : skip cette étape silencieusement, note-le dans le compte-rendu.

   **2.3. Archéologie des sessions passées** (proposée automatiquement après l'inventaire) :
   - Compte les sessions Claude récentes (`~/.claude/projects/<repo-slug>/<session-id>/` — chaque sous-dossier = une session, avec ses transcripts JSONL).
   - Affiche : « Tu as N sessions Claude sur ce repo. Veux-tu que je cherche des artefacts éphémères (posts, drafts, code, specs) que tu aurais produits sans les commiter ? »
   - Si l'utilisateur dit oui (ou par défaut si N ≥ 5) : **lance un subagent dédié** avec ce brief :
     > « Parcours les **20 sessions les plus récentes** de ce repo (par date de modification du dossier). Pour chaque session, cherche les **blocs de contenu structuré produits par Claude en réponse à l'utilisateur** qui n'ont pas d'équivalent committé dans le repo (`git ls-files` à comparer). Patterns à reconnaître : post LinkedIn (~1000-3000 chars, ton réseau social, structure hook/body/CTA), article long (> 3000 chars, sections), spec de feature (mentionne "Critères", "Jalons", "C1:", "C2:"), draft de newsletter (structure édito + sections), code orphelin (blocs ``` longs avec contexte produit, pas juste des snippets d'exploration). **Rends une synthèse compacte** : pour chaque artefact retrouvé `{session_id, date, type, sujet, location_in_transcript (offset), placement_suggéré dans la nouvelle arbo}`. Ne ramène PAS les transcripts bruts. Si tu ne trouves rien : dis-le clairement. »
   - Pour chaque artefact, propose un **placement automatique** :
     - Post LinkedIn → `content/linkedin/drafts/<date>-<slug>.md` (ou `posted/` si publié — demande à l'utilisateur cas par cas si non clair)
     - Post Twitter/X → `content/twitter-x/drafts/<date>-<slug>.md`
     - Article → `content/blog/wip/<date>-<slug>.md`
     - Spec de feature → `features/<slug>/SPEC.md` (avec scaffold de la structure standard)
     - Draft newsletter → `content/newsletter/<edition>.md` (édition à déterminer)
     - Code orphelin → signale en "à examiner manuellement", pas auto-placé
     - Autre / ambigu → présente à l'utilisateur pour décision
   - **Présente la liste structurée** à l'utilisateur : « J'ai trouvé N artefacts. Voici mes placements suggérés. Tu peux **décocher** ce que tu veux skipper. Valide en bloc. »
   - L'utilisateur valide en bloc, peut désélectionner ligne par ligne.

   **2.4. Mapping de l'architecture** : propose un mapping de l'architecture du kit sur ce repo (avec **écarts justifiés**), en intégrant les memory files lus en 2.2 et les artefacts retrouvés en 2.3.

   **2.5. Carte de migration `old → new`** : produit la carte explicite (chaque fichier/dossier impacté → action `move` / `merge` / `keep` / `archive` / `delete`+raison / **`recover`** pour les artefacts retrouvés).

   **2.6. Questions stratégiques** via `AskUserQuestion` : périmètre (code applicatif KEEP ?), sort des dossiers par-rôle, setup de test, CRM (versionné ici ou repo séparé ?), préfixes de session, sous-repos formalisés en submodules ou pas, worktrees morts à supprimer ?, channels audience à scaffolder (LinkedIn, Twitter/X, blog, newsletter, autres ?), **système de support utilisé** (Jira / Zendesk / autre / aucun) ?

   - **Attends la validation complète (plan + carte + questions + artefacts retrouvés) AVANT toute action.**

3. **Phase 1 — Restructuration** : annonce le batch de `git mv`. Crée l'ossature (`mkdir -p _archive/`, `knowledge/`, `knowledge/content/`, `knowledge/support/clients/`, `features/`, `bugs/`, `content/<channels>/{drafts,posted,stats,insights,...}/`, `.cc-scratch/`, `.claude/skills/`, `docs/`). **Important** : pour chaque channel audience scaffold-é (linkedin, twitter-x, blog, newsletter…), créer aussi `stats/` (raw dumps MCP/exports, archives append-only) et `insights/` (rapports synthétisés par `/report`). Exécute les `git mv` validés (incl. déplacement de drafts/posts préexistants vers `content/<channel>/posted/`). **Récupère les artefacts d'archéologie** validés en Phase 0 (étape 2.3) : pour chaque artefact, copie le contenu depuis le transcript original vers son emplacement cible (avec frontmatter `recovered_from: <session_id>` + `recovered_at: <timestamp>`). Archive READMEs obsolètes. Supprime worktrees morts (autorisation explicite). **Commit Phase 1.**

4. **Phase 2 — Doctrine** : crée `CLAUDE.md` (court, rempli avec specs du repo, **infusé des décisions tirées des memory files**), copie `docs/WORKFLOW.md` depuis `templates/docs/WORKFLOW.md` du kit, crée READMEs racine + `knowledge/` + `features/` + `content/`, crée `knowledge/insights.md` squelette, crée `knowledge/content/brand-book.md` placeholder si absent, crée `knowledge/support/insights.md` squelette. **Commit Phase 2.**

5. **Phase 3 — Outillage** : importe les 12 skills depuis `templates/.claude/skills/` (setup, spec, code, test côté dev ; research, feedback, support côté découverte ; post, article, newsletter, report côté audience), les hooks (`test-gate.sh` + `preflight-guard.py` **obligatoire** comme garde-fou déterministe + `register-hook.py` helper + 2 optionnels `context-handoff.sh` et `context-restore.sh`), `settings.json` (qui enregistre `preflight-guard.py` sur `UserPromptSubmit` et `test-gate.sh` sur `Stop`), `statusline.sh`. Modifie `.gitignore` pour versionnement partiel `.claude/` (ignore `settings.local.json`, `scheduled_tasks.lock`, `worktrees/`). **Important** : vérifie que `preflight-guard.py` est exécutable (`chmod +x`) et smoke-teste : `echo '{"prompt":"/spec foo"}' | .claude/hooks/preflight-guard.py` → si `docs/WORKFLOW.md` existe (donc workflow installé), exit silencieux ; sinon, JSON `decision:block`. **Note** : suggère à l'utilisateur d'installer aussi le skill compagnon `nano-banana` globalement s'il prévoit de générer des images de posts (cf. README § Compagnons optionnels). **Commit Phase 3.**

6. **Phase 4 — Configurer TEST_CMD** : discute avec l'utilisateur des options selon la stack (uv / venv / docker / autre). Demande la commande exacte. Edit `test-gate.sh` + `CLAUDE.md` (cohérence : la commande doit matcher au mot près). Smoke-test : `echo '{}' | .claude/hooks/test-gate.sh ; echo "exit=$?"`. **Commit Phase 4.**

7. **Phase 5 — Refonte features/ existantes** (optionnel, si le repo a déjà du contenu produit) : pour chaque feature pré-existante avec contenu, propose la migration vers la convention standard (`SPEC.md / PLAN.md / sub-features/ / prototypes/ / qa/ / plans/ / archives/v{N}/`). Pour chaque feature, demande si c'est une **itération sur la version active** (édition in-place) ou une **refonte majeure** (archive la racine dans `archives/v{N}/`). **Commit Phase 5.**

8. **Final** : **propose** le push de la branche `setup-workflow` (avec OK explicite séparé — aucun push automatique). Rappelle à l'utilisateur : merger sur `main` quand satisfait, vider `_archive/` après validation finale, supprimer le tag `pre-setup-<timestamp>` quand tout va bien. Suggère des dry-run pour valider les pipelines en bout-en-bout : `/spec <feature>` (build), `/support <client>` (découverte si système de tickets configuré), `/post linkedin <sujet>` (audience), `/report linkedin` (analytics si MCP réseau configuré), `/status` (snapshot 360° pour valider que tout est en place).

## Critères de succès

- Plan validé par l'utilisateur en Phase 0 (incl. liste des artefacts retrouvés).
- **Aucun fichier perdu** : chaque entrée de la carte de migration est honorée.
- **Aucun artefact éphémère oublié** : tous les drafts, posts, specs trouvés en archéologie sont soit récupérés dans la nouvelle arborescence, soit skippés explicitement par l'utilisateur (jamais en silence).
- **Historique préservé** : tous les déplacements via `git mv` (renames à 100% similarity). Les artefacts récupérés portent un frontmatter `recovered_from: <session_id>`.
- **Code applicatif intact** : `git diff` sur les chemins applicatifs est vide (sauf décision explicite de l'utilisateur).
- **Sous-repos intacts** : `git diff` sur leurs chemins est vide.
- **Aucun fichier sensible commité** : `.env*`, secrets, clés n'apparaissent dans aucun commit du pipeline.
- **`~/.claude/projects/` intact** : `git diff` sur les transcripts originaux n'existe pas (lecture seule respectée).
- **Aucun push automatique** : la branche `setup-workflow` reste locale jusqu'à l'OK explicite de la Phase Final.
- **Tag de rollback présent** : `git tag` montre `pre-setup-<timestamp>` et l'utilisateur peut revenir en arrière à tout moment.
- L'outillage marche : `/hooks` montre le `Stop` hook chargé ; `/setup /spec /code /test /research /feedback /support /post /article /newsletter /report /status` apparaissent (les 12).
- Smoke-test du hook : `echo '{}' | .claude/hooks/test-gate.sh ; echo "exit=$?"` retourne `exit=0` (vert) ou un JSON `decision:block` parsable.
- Dry-run d'une petite feature passe le pipeline build de bout en bout : `/spec` → `SPEC.md` → `/code` → étape → hook vert → `/test` au jalon → gate humain.

## Cas limites

- **Repo vierge** (pas de `.claude/`, pas de `features/`, pas de `content/`, pas de `~/.claude/projects/<repo-slug>/`) : Phase 0 minimale (rien à migrer, pas d'archéologie), scaffold direct la structure standard.
- **Repo déjà setup** (`.claude/skills/spec/SKILL.md` existe) : signale et demande à l'utilisateur s'il veut **mettre à jour** (Phase 3 seulement) ou **ré-installer** (toutes les phases). Ne ré-installe pas auto. **L'archéologie peut quand même tourner** sur les sessions passées (utile pour récupérer ce qui n'aurait pas été commité depuis le dernier setup).
- **Sous-repos avec leur propre `.git`** (gitlinks ou repos imbriqués sans `.gitmodules`) : KEEP par défaut, ne touche pas. Signale leur présence à l'utilisateur.
- **Sous-repo qui DOIT être modifié** (ex. paths en dur cassés par la migration) : signale précisément les modifs nécessaires + propose un commit séparé dans le sous-repo + bump du gitlink dans le parent (après push du sous-repo, et avec OK explicite à chaque étape).
- **Repo qui a déjà du contenu marketing dispersé** (drafts, brand book, posts publiés ailleurs) : propose une carte de migration dédiée pour `content/` et `knowledge/content/`. Ne supprime aucun contenu existant sans autorisation explicite.
- **Pas de système de support utilisé** : skip le scaffold de `knowledge/support/` (juste créer le dossier vide pour future use).
- **Fichiers sensibles détectés et l'utilisateur refuse de les exclure** : signale le risque et abandonne plutôt que de commiter avec des secrets exposés.
- **Branche source sensible refusée 2x** : repropose un choix de branche, ne force pas.
- **Pas de dossier `~/.claude/projects/<repo-slug>/`** (ex. nouveau repo, Claude jamais lancé dessus) : skip 2.2 et 2.3 silencieusement, note-le dans le compte-rendu.
- **Très grand nombre de sessions** (> 100) : demande à l'utilisateur s'il veut élargir la fenêtre de 20 sessions ou rester sur les plus récentes (default : 20).
- **Subagent d'archéologie ne trouve rien** : c'est OK, signale-le clairement (le repo a peut-être toujours bien sauvegardé en fichiers, ce qui est un bon signe).
- **Memory files contredisent la doctrine du kit** (ex. une décision de garder l'axe par rôle) : signale la tension à l'utilisateur, ne tranche pas seul.
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
- **Charger les transcripts bruts dans le contexte principal** (ils sont volumineux et polluent) — toujours déléguer au subagent qui rend une synthèse compacte.
- **Écrire dans `~/.claude/projects/`** — c'est strictement lecture seule. Les artefacts récupérés sont copiés vers la nouvelle arborescence, pas déplacés.
- **Récupérer des artefacts sans validation par-ligne** — l'utilisateur doit pouvoir décocher ce qu'il veut skipper.

<!-- Exemple d'usage :
  /setup
  → git tag pre-setup-2026-06-03-1530 (filet rollback)
  → scan fichiers sensibles → 1 `.env` non-gitignored détecté → propose .gitignore + git rm --cached → OK
  → git status → 3 untracked + 1 modified → propose commit minimal cohérent → OK
  → "Tu es sur `main`. Créer setup-workflow depuis : (a) main, (b) autre ?" → "main est sensible, double confirmation : continuer ?" → OK
  → git checkout -b setup-workflow

  → Phase 0.1 : inventorie 247 fichiers
  → Phase 0.2 : lis ~/.claude/projects/-Users-louis-org-lookup/memory/ → 18 memory files
      → "L'utilisateur préfère le dual md+html (memory feedback_dual_md_html_docs)" → intègre au mapping
      → "Convention archives/v{N}/ (memory project_v5_process_atlas)" → intègre
  → Phase 0.3 : "Tu as 47 sessions Claude sur ce repo. Veux-tu que je cherche des artefacts éphémères ?" → OK
      → subagent fouille 20 dernières → rend : "12 artefacts retrouvés"
        - 8 posts LinkedIn (proposés vers content/linkedin/drafts/)
        - 2 specs de features (proposés vers features/<slug>/SPEC.md)
        - 1 article (proposé vers content/blog/wip/)
        - 1 code orphelin (à examiner manuellement)
      → "Voici mes placements. Décoche ce que tu veux skipper." → utilisateur décoche 2 posts (déjà publiés ailleurs) → valide en bloc
  → Phase 0.4-0.5 : mapping + carte de migration (incl. 10 artefacts `recover`)
  → Phase 0.6 : AskUserQuestion (6 questions) → OK

  → Phase 1 : "12 git mv + récupération de 10 artefacts depuis ~/.claude/projects/ — OK ?" → OK → commit
  → Phase 2-5 : idem, commit par phase
  → Phase Final : "Tout commité local sur setup-workflow. Tu veux que je push origin setup-workflow ?" → OK → push
  → Rappelle : tag pre-setup-... est ton filet, supprime-le quand satisfait. -->
