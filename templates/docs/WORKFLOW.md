# WORKFLOW — workflow de dev assisté par IA (référence in-repo)

> Référence courte vivant dans le repo. Le guide complet est dans le repo kit `ai-founder-workflow`.

## Principe central
La mémoire persistante vit dans des **fichiers**, pas dans les sessions. Les sessions sont **jetables**.
Le relais entre deux étapes = un **artefact durable** (spec, code commité, fichier de tests).
Dès que ce qui compte est dans un fichier, une session neuve (ou `/clear`) bat une longue session encombrée.

## Pre-flight (garde-fou à l'entrée des skills non-`/setup`)

**Principe** : tous les skills sauf `/setup` doivent **refuser de s'exécuter** si le workflow ai-founder-workflow n'est pas installé sur le repo courant. Sinon ils écriraient dans une arborescence inexistante (ex. `features/<feature>/SPEC.md` sans dossier `features/`), pollueraient le repo de l'utilisateur, ou perdraient des artefacts.

**Détection canonique** : présence de `docs/WORKFLOW.md` à la racine du repo. C'est le fichier installé par `/setup` Phase 2 — son absence = workflow non déployé.

### Couche 1 — Hook Python déterministe (garde-fou primaire)

Le vrai garde-fou est un **script Python** branché en `UserPromptSubmit` hook. Quand l'utilisateur tape `/spec`, `/code`, `/test`, `/research`, `/feedback`, `/support`, `/post`, `/article`, `/newsletter`, ou `/report`, le hook s'exécute **avant** que Claude ne lise le SKILL.md — et bloque déterministiquement si `docs/WORKFLOW.md` est absent du repo. Réponse au format `{"decision":"block","reason":"…"}`.

Fichier : `.claude/hooks/preflight-guard.py` (per-repo après `/setup`) **et/ou** `~/.claude/hooks/preflight-guard.py` (global après `install.sh --global`). Enregistré dans `settings.json` via le helper `register-hook.py` (idempotent, backup auto).

Le hook fait :
1. Lit le payload JSON sur stdin (clé `prompt`).
2. Si la commande n'est pas une des 10 skills gardées, ou si c'est `/setup` → passe (exit 0 silencieux).
3. Trouve la racine git (`git rev-parse --show-toplevel`) ; teste si `docs/WORKFLOW.md` existe.
4. Si présent → passe. Si absent → bloque avec un message clair indiquant de lancer `/setup`.

**Pourquoi déterministe** : un LLM peut « oublier » de vérifier ou être convaincu de passer outre par un prompt rusé. Un script Python ne peut pas être contourné par persuasion.

### Couche 2 — Instructions LLM (fallback dans chaque SKILL.md)

Chaque SKILL.md non-`/setup` contient aussi un bloc « Pre-flight obligatoire » qui répète le même check côté LLM. C'est un **filet de secours** au cas où :
- Le hook n'est pas (encore) installé (ex. premier `install.sh --global` partiel, ou config utilisateur sans `UserPromptSubmit` activé).
- Claude invoque un skill via le `Skill` tool dans un sous-flux (le hook `UserPromptSubmit` ne fire que sur les prompts utilisateur, pas sur les appels internes).

Le LLM Read `docs/WORKFLOW.md` ; si absent, répond exactement :
> « Je ne peux pas exécuter cette commande : le workflow ai-founder-workflow n'est pas installé sur ce repo (pas de `docs/WORKFLOW.md` trouvé). Veux-tu lancer `/setup` maintenant ? »

Puis `AskUserQuestion` — oui → invoque `/setup` et STOP ; non → STOP.

### Exceptions

- **`/setup`** est exempté par définition (il installe le workflow). Il a sa propre logique de détection en Phase 0 (« déjà setup ? mise à jour ou ré-install ? »).
- Sous-répertoire du repo → le hook utilise `git rev-parse --show-toplevel` pour remonter à la racine, donc fonctionne depuis n'importe où.

### Pourquoi un seul fichier comme signal

- **Lisible** : 1 check, pas une cascade de présences/absences à corréler.
- **Reproductible** : le fichier est canonique et créé par `/setup` Phase 2.
- **Réversible** : l'utilisateur peut le supprimer pour « désactiver » temporairement les skills sur un fork qui n'a pas adopté le workflow.

## Trois axes de sessions
- **Découverte** — continu, jamais par feature. Sort dans `knowledge/`.
- **Build** — par feature, en pipeline `spec → code → test`. Sort dans `features/`.
- **Audience** — continu, par output (réseaux, blog, newsletter). Sort dans `content/`.

### Nomenclature
| Préfixe | Axe | Pour quoi | Écrit dans |
|---|---|---|---|
| `market-research-…` | Découverte | marché, concurrents, tendances | `knowledge/market/` |
| `user-feedback-…` | Découverte | échanges avec de vrais utilisateurs (incl. discovery sales) | `knowledge/crm/contacts/` + `knowledge/insights.md` |
| `support-<client>` | Découverte | sift des tickets support (Jira / Zendesk / …) | `knowledge/support/clients/<client>.md` + `knowledge/support/insights.md` |
| `spec-<feature>` | Build | le quoi : spec + critères + jalons | `features/<feature>/SPEC.md` |
| `code-<feature>` | Build | le comment : plan + code + filet rapide | `features/<feature>/PLAN.md` + code commité |
| `test-<feature>` | Build | e2e depuis le spec + revue, au jalon | suite e2e commitée |
| `post-<channel>-<sujet>` | Audience | post court réseau social | `content/<channel>/{drafts,scheduled,posted}/` |
| `article-<sujet>` | Audience | long form (blog) | `content/blog/{wip,published}/` |
| `newsletter-<edition>` | Audience | édition assemblée | `content/newsletter/<edition>.md` |
| `report-<network>` | Audience | analyse de performance via MCP du réseau | `content/<network>/stats/` (raw) + `content/<network>/insights/` (synthèse) |
| `status-<date>` | Transverse | snapshot 360° du projet (build + discovery + audience + activity + archi) | `.cc-scratch/status/<date>-status.html` (privé) ou `docs/status/<date>-status.html` (public anonymisé) |

`market-research` et `user-feedback` sont **deux types distincts** (extérieur/marché vs intérieur/personnes). Les skills audience **invoquent** des skills de copywriting globales (ex. `marketing-skills:writing-linkedin-posts`) si disponibles. Le format exact des préfixes est une préférence ; seul le préfixe par type compte.

## Pipeline de build
- `spec-<feature>` : écrit `SPEC.md` (description + **critères d'acceptation** dérivés AVANT le code + **jalons**).
- `code-<feature>` : écrit `PLAN.md` en plan mode, implémente étape par étape (front + back ensemble). À chaque étape, un **subagent** écrit le filet rapide depuis les **critères de l'étape**, le hook le lance.
- `test-<feature>` : session **fraîche**, écrit les **e2e** depuis le **spec** au jalon + **revue à œil neuf**.
- Puis **gate humain** : validation de la tranche au jalon.

**Une feature = une branche git.** L'axe build est rattaché à une branche : les trois sessions build d'une feature (`spec-`, `code-`, `test-`) travaillent toutes sur **cette même** branche dédiée (ex. `feature/<feature>`). On ne mélange jamais deux features sur une branche. Pour traiter plusieurs features en parallèle → **worktrees git séparés** (une branche chacune). Les sessions de **découverte** (`market-research-`, `user-feedback-`), elles, ne sont rattachées à aucune branche.

## Session vs subagent
- **Session séparée** si le relais est un artefact durable (spec, code, tests).
- **Subagent** si le relais est éphémère (investigation, écarts d'une revue) et revient dans le travail courant.

## Vérification — deux sortes de tests
Ligne de partage : **rapide & incrémental** (code-x, à chaque étape) vs **bout-en-bout** (test-x, au jalon).
- **Filet rapide** (code-x) : unitaires + intégration rapide, écrits par subagent depuis les critères, lancés par le `Stop` hook qui **bloque tant que c'est rouge**. Filet de régression, pas validation finale.
- **Validation indépendante** (test-x) : e2e + acceptation, écrits depuis le spec par une session qui n'a pas écrit le code.

Règles : tests ancrés sur l'**intention** (jamais sur le code qu'on vient d'écrire) ; l'intégration rapide reste chez code-x ; l'e2e ne peut pas être le gate par étape (tranche pas câblée de bout en bout) ; **pas 100 % de couverture** ; disjoncteur après 2-3 échecs → un humain intervient.

## Hygiène de contexte
- `/compact` aux points verts (préserver : état du PLAN, fichiers touchés, critères ; jeter le bruit des échecs résolus).
- `/clear` ou nouvelle session entre sujets sans rapport.
- Le **moment** du clear/compact est un geste humain ; ce qui s'automatise via hooks, c'est ce qui **survit**.

## Hook
`Stop` hook (`.claude/hooks/test-gate.sh`) : lance les tests rapides, bloque la fin du tour via `{"decision":"block","reason":...}` (sortie sur stdout, `exit 0`) tant que rouge. Garde anti-boucle `stop_hook_active` obligatoire.

## Mini-glossaire
- **Session** — un fil Claude Code, jetable. Porte un préfixe par type (`spec-`, `code-`, `test-`, `market-research-`, `user-feedback-`). Ce qui survit n'est pas la session mais son **artefact**.
- **Subagent** — un sous-fil lancé *dans* une session pour une tâche bornée (fouiller, écrire le filet rapide, lister des écarts). Son contexte ne pollue pas la session ; il rend une synthèse.
- **Artefact durable** — un fichier qui sert de relais entre sessions : `SPEC.md`, code commité, suite de tests. C'est lui le relais, jamais « la conversation ».
- **Critère d'acceptation** — une assertion observable issue du spec (« Étant donné… Quand… Alors… »), numérotée (C1, C2…). Définit « fini » et sert de référence à **tous** les tests.
- **Jalon** — une tranche user-facing livrable, regroupant des critères. Point de contrôle e2e + **gate humain**.
- **Filet rapide** — unitaires + intégration rapide, écrits par un subagent depuis les **critères de l'étape**, lancés par le hook à chaque étape de `code-`. Régression, pas validation finale.
- **Validation indépendante** — e2e + acceptation, écrits depuis le **spec** par `test-`, session fraîche qui n'a pas codé. Vraie validation à œil neuf.
- **Découverte** — sessions continues, jamais par feature, qui alimentent les futurs specs : `market-research-` (extérieur/marché) et `user-feedback-` (intérieur/personnes), deux types distincts.
- **Gate humain** — la décision de valider une tranche au jalon. Reste humaine ; l'automatisation porte sur la régression, pas sur le jugement.
- **Disjoncteur** — après 2-3 rouges persistants sur une étape, on arrête : le spec ou l'approche est en cause.
- **Ticket de bug** — `bugs/<slug>/TICKET.md`, mini-spec à 1-2 critères, déposé par `/test` ou `/support` quand un bug net est trouvé. Lu par `/code <slug>` comme une SPEC. Distinct du *pain point* qui, lui, reste agrégé dans `knowledge/support/insights.md`.
- **Stats (audience)** — raw dump horodaté du MCP réseau dans `content/<network>/stats/<date>-snapshot.<ext>`. Preuve brute, append-only, sert de traçabilité aux insights.
- **Insight (audience)** — rapport synthétisé par `/report` dans `content/<network>/insights/<date>-report.md` (+ .html). Source actionnable lue par `/post`, `/article`, `/newsletter` pour informer leurs drafts.

## Exemple de cycle de bout en bout
Petite feature « checkout-flow » (voir un exemple travaillé dans le repo kit `examples/checkout-flow/`).

1. **Découverte (en amont, continue)** — `user-feedback-marie` note « panier perdu quand le paiement est refusé » ; l'agrégat `knowledge/insights.md` voit ce motif sur 3 contacts.
2. **`/spec checkout-flow`** — session `spec-checkout-flow`. Écrit `features/checkout-flow/SPEC.md` : critères C1 (panier → commande, stock décrémenté), C2 (paiement refusé → message clair, panier conservé)… ; jalons J1 « panier→commande » (C1, C4), J2 « paiement » (C2, C3). → artefact : `SPEC.md`.
3. **`/code checkout-flow`** — session `code-checkout-flow`. Plan mode → `PLAN.md` (étapes ↔ critères), validé. Étape 1 (C1) : code la création de commande ; un subagent écrit les unitaires **depuis C1** ; le hook tourne, **rouge** (stock non décrémenté) → lit `.cc-scratch/test-gate.last.txt`, corrige la cause, relance, **vert** → commit + coche l'étape. Idem étape par étape. `/compact` aux points verts.
4. **`/test checkout-flow`** — session **fraîche** `test-checkout-flow`, au jalon J2. Dérive les e2e **du spec** (pas du code), trouve que le panier est vidé sur refus (≠ C3) → consigne l'écart. La correction repart en `code-`.
5. **Gate humain** — une fois J2 vert et l'écart corrigé, **tu** valides la tranche avant d'enchaîner sur le jalon suivant.

## Convention par-feature (structure standard)

**Principe** : chaque feature dans `features/` suit la **même structure** — un LLM (ou un humain) qui ouvre un dossier feature sait *immédiatement* où chercher la spec courante, l'historique, les prototypes, les captures QA.

La **racine** du dossier feature représente toujours la **version active**. Les versions périmées vont dans `archives/v{N}/`. Les composants atomiques de la version active vont dans `sub-features/`.

```
features/<slug>/
├── README.md              # statut, vue d'ensemble, liens
├── SPEC.md / SPEC.html    # spec de la version ACTIVE (le quoi, possédé par spec-x)
├── PLAN.md / PLAN.html    # plan d'implémentation (le comment, possédé par code-x)
├── sub-features/<slug>/   # composants/pages atomiques de la version active (même structure récursive)
├── prototypes/            # mockups HTML pour la version active
├── qa/sprint-{N}-{slug}/  # captures par sprint
├── plans/                 # roadmap, plans de release
└── archives/v{N}/         # une version périmée = un sous-dossier (SPEC, PLAN, prototypes, etc.)
```

**Règles** :
- **Refonte majeure** (ex. UX v2 d'une feature) → déplacer la racine actuelle dans `archives/v{N}/`, écrire la nouvelle racine. On ne mélange pas deux versions à la racine.
- **Itération sur la version active** → édition in-place de la racine (pas d'archive).
- **Composant atomique** de la version active → `sub-features/<sub-slug>/` (même structure récursive : son propre SPEC, PLAN, archives, etc.).
- **Obsolètes globaux** (non liés à une version d'une feature) → `_archive/` à la racine du repo, jamais de delete direct.
- **`/spec <feature>` scaffold la structure** quand le dossier n'existe pas. Et propose l'archivage quand `SPEC.md` existe déjà et qu'on annonce une refonte majeure.

**Pourquoi cette uniformité** : un dossier prévisible = un LLM qui retrouve l'historique sans chercher. Et un onboarding humain à 0 effort.

## Étiquette git (multi-agents concurrents)

**Principe** : chaque session bosse sur **sa propre branche** dédiée. Cette discipline permet à plusieurs agents Claude qui partagent le même checkout de travailler en parallèle sans se marcher dessus, et donne à chaque artefact un diff reviewable correspondant exactement au scope d'une session.

### Convention de nommage par axe

| Axe | Préfixe de branche | Exemple |
|---|---|---|
| **Build (feature)** | `feat/<feature>` | `feat/checkout-flow` |
| **Build (bug fix)** | `fix/<bug-slug>` | `fix/safari-cancel-crash` |
| **Découverte (market)** | `research/<topic>` | `research/agentforce-monitoring` |
| **Découverte (user feedback)** | `feedback/<person>` | `feedback/laurent` |
| **Découverte (support sift)** | `support/<client>` | `support/acme-corp` |
| **Audience (post)** | `post/<channel>/<slug>` | `post/linkedin/churn-paradox` |
| **Audience (article)** | `article/<slug>` | `article/inherited-org-monitoring` |
| **Audience (newsletter)** | `newsletter/<edition>` | `newsletter/2026-06` |
| **Audience (report)** | `report/<network>/<YYYY-MM-DD>` | `report/linkedin/2026-06-03` |
| **Transverse (status)** | `status/<YYYY-MM-DD>` | `status/2026-06-03` |

Le format exact (séparateur `-` vs `_`, casse) est une préférence d'équipe ; seul le **préfixe par axe** compte pour la lecture rapide de `git branch`. La cohérence importe plus que la forme.

### Exceptions au pattern « une session = une branche »

- **`spec-`, `code-`, `test-` d'une même feature** partagent la **même branche** `feat/<feature>` — elles écrivent ensemble dans le même dossier `features/<feature>/`. La première à ouvrir crée la branche ; les suivantes la rejoignent.
- **`/setup`** utilise une branche dédiée `setup-workflow` (créée depuis main), mergée après validation complète.
- **Ré-itération sur un artefact mergé** (ex. édition v2 d'un post déjà posté) → nouvelle branche `<prefix>/<slug>-v2`. Si l'artefact d'origine n'est pas encore mergé, reste sur la branche d'origine.

### Protocole d'ouverture de session

Chaque skill applique **avant toute écriture** :

1. **`git status`** : si le working tree n'est pas clean, propose à l'utilisateur un commit / stash. **Stoppe** si pas de réponse claire — ne crée jamais de branche par-dessus des changes pendants.
2. **`git branch --show-current`** :
   - Tu es déjà sur la branche cible → continue (reprise de session, normal).
   - Tu es sur `main` (ou la base configurée) → crée la branche : `git checkout -b <prefix>/<slug>`.
   - Tu es sur une autre branche dédiée → demande à l'utilisateur (mélange volontaire ou erreur ?).
3. **Branche déjà existante** (locale OU remote `origin/<prefix>/<slug>`) : `git checkout <prefix>/<slug>` (+ `git pull` si remote), pas de re-création.
4. **Stage par chemin explicite uniquement** : `git add features/<feature>/SPEC.md`, **jamais `git add -A`** — un autre agent concurrent peut être en train d'écrire ailleurs, et `-A` sweeperait son travail (et les artefacts gitignore-ables qui auraient leaké).

### Merge strategy (au choix de l'équipe)

Le kit ne tranche pas — chacun choisit selon son contexte :
- **PR review** (recommandé build/article) : `git push -u origin <branch>` → ouvrir PR → review → squash merge.
- **Direct merge** sur la base (acceptable audience court / discovery rapide) : `git checkout main && git merge --no-ff <branch>` après validation locale.
- **Pas de push automatique** : aucun skill ne push tout seul. Le push reste un geste humain explicite.

### Pourquoi cette rigueur

- **Multi-agent concurrence sûre** : 3 agents Claude sur le même checkout, chacun sur sa branche → zéro conflit accidentel.
- **Reviewabilité** : un diff = le scope d'une session = un artefact cohérent.
- **Rollback granulaire** : reverter une feature ou un post sans impacter le reste.
- **Historique propre** : `git log --graph --oneline --all` raconte ce qui s'est passé par axe.

## Convention par-channel audience (stats + insights + assets)

**Principe** : chaque channel d'audience (`linkedin`, `twitter-x`, `blog`, `newsletter`…) suit la même structure — `/post`, `/article`, `/newsletter` écrivent les drafts et publications ; `/report` mesure et synthétise.

```
content/<channel>/
├── drafts/          # WIP (post.md plat OU dossier <slug>/{post.md, assets})
├── scheduled/       # validé, en attente de publication (idem)
├── posted/          # publié (idem)
├── stats/           # raw dumps MCP/exports, append-only, horodatés
│   └── 2026-06-03-snapshot.json
└── insights/        # rapports synthétisés par /report (md + html dual)
    └── 2026-06-03-report.md / .html
```

*(Variantes : `blog/` utilise `wip/` au lieu de `drafts/` et n'a pas de `scheduled/`. `newsletter/` n'a pas de sous-dossiers de statut — chaque édition est un fichier unique chronologique.)*

**Règles** :
- **Post text-only** → `content/<channel>/<status>/<YYYY-MM-DD>-<slug>.md` (fichier plat).
- **Post avec asset** (image, diagramme) → `content/<channel>/<status>/<YYYY-MM-DD>-<slug>/` (dossier) contenant `post.md` + les assets. Garde l'artefact et ses visuels ensemble — un `.md` séparé de son image est cassé.
- **`stats/` est append-only** : chaque pull `/report` écrit un nouveau snapshot horodaté ; jamais d'écrasement (traçabilité « d'où sort ce 1 345 ? »).
- **`insights/` respecte la convention dual md+html** : `<date>-report.md` + `<date>-report.html` synchronisés.
- **`/post` et `/article` lisent `insights/`** au démarrage pour informer leurs choix éditoriaux (format gagnant, recommandations en cours).

**Pourquoi cette séparation stats/insights** : même logique que support (`knowledge/support/clients/<client>.md` cumul vs `knowledge/support/insights.md` motifs). Le raw est la preuve, l'insight est la synthèse actionnable. Les deux servent à un moment différent et ne se mélangent pas.

## Compagnons optionnels (skills externes)

Le kit reste utilisable seul. Certaines capacités peuvent être ajoutées via des skills installés globalement dans `~/.claude/skills/` :

- **[cc-nano-banana](https://github.com/kkoppenhaver/cc-nano-banana)** — wrap le Gemini CLI + extension nanobanana pour générer / éditer des images. Fournit `/generate`, `/icon`, `/diagram`, etc. Détecté à la volée par `/post`, `/article`, `/newsletter`. Output par défaut : `./nanobanana-output/` (à déplacer dans le dossier du post). Coût ~0,04 $/image. Prérequis : Gemini CLI + clé API Google AI Studio.
- **MCP du réseau social** (LinkedIn, Twitter/X, Substack…) — détecté par `/report` (et `/post`, `/article`, `/newsletter` pour lire les insights). Sans MCP, fallback export manuel ou skip.

Aucun n'est requis ; chacun enrichit une capacité existante.

## Convention par-bug (tickets éphémères)

**Principe** : un bug n'est pas une feature, mais il a le même cycle qu'une mini-spec (description → fix → vérif). On l'isole donc dans son propre dossier, à plat sous `bugs/`. Pas de skill dédié — `/code` accepte un slug de bug exactement comme un slug de feature.

```
bugs/<slug>/
├── TICKET.md     # le quoi : repro + comportement attendu + critère "ne se reproduit plus"
└── PLAN.md       # le comment, optionnel (écrit par /code si le fix n'est pas trivial)
```

**Qui écrit, qui lit** :
- `/test` dépose un ticket quand l'e2e révèle un bug net (reproductible, contre un critère du spec).
- `/support` dépose un ticket quand un sift Jira/Zendesk remonte un bug net (≠ pain point récurrent qui, lui, va dans `knowledge/support/insights.md` pour agrégation).
- N'importe quelle session peut aussi en déposer un à la volée (« ouvre un ticket pour X » → écrit le fichier).
- `/code bugs/<slug>` (ou `/code <slug>` si pas d'ambiguïté avec une feature) lit le ticket comme une SPEC, planifie, fixe, ajoute un test de régression.

**Format TICKET.md** (minimal — verrouille la repro et le critère « ne se reproduit plus ») :

```markdown
# Bug : <titre court>

> **Statut** : open
> **Détecté** : 2026-06-03 par `test-checkout-flow`
> **Origine** : feature `checkout-flow` · client `acme-corp` · autre

## Reproduire
1. ...
2. ...
3. → <observation>

## Comportement attendu
<ce qui devrait se passer>

## Critère d'acceptation
- C1 : le scénario ci-dessus ne reproduit plus l'erreur
- C2 : un test de régression couvre ce cas

## Notes
<contexte, hypothèse, lien vers la session/ticket d'origine>
```

**Pourquoi pas un skill `/bug` ou `/fixer`** : un bug = une mini-spec à 1-2 critères, donc `/code` réutilise tout le pipeline (plan mode, étapes, filet rapide, hook, jalon). Ajouter un skill = +1 surface pour 0 comportement distinct.

**Différence pain point vs bug** :
- *Pain point* (motif support récurrent) → `knowledge/support/insights.md`, émerge en feature plus tard via `/spec`.
- *Bug net* (problème ponctuel, reproductible, gravité claire) → `bugs/<slug>/TICKET.md`, fixé via `/code` directement.

## Optionnel : hooks de contexte & statusline
Filets pour les **longues** sessions `code-`. **Non activés par défaut** — à brancher toi-même dans `.claude/settings.json` si tu en veux. Les artefacts durables (PLAN/SPEC/code commité) restent le vrai relais ; ceci ne fait qu'aider la reprise.

- **`hooks/context-handoff.sh`** (événement `PreCompact`) — `PreCompact` est **notification-only** : il ne peut **pas** préserver le contexte lui-même. Le script se contente d'écrire un filet (`.cc-scratch/handoff.md` + sauvegarde du transcript) avant la compaction.
- **`hooks/context-restore.sh`** (événement `SessionStart`, matchers `compact`/`resume`) — réinjecte un rappel via `hookSpecificOutput.additionalContext` : « relis `PLAN.md`, le SPEC et `.cc-scratch/handoff.md` ».
- **`statusline.sh`** (clé `statusLine`, type `command`) — affiche le % de contexte utilisé (lu depuis le JSON passé au statusLine ; parsing défensif avec repli selon la version de Claude Code).

Pour activer : ajoute les blocs `PreCompact`, `SessionStart` et `statusLine` à `settings.json` (exemples en tête de chaque script). Tu peux aussi abaisser le seuil d'auto-compact (~0,85). Vérifie les noms de champs JSON contre `code.claude.com/docs` pour ta version.
