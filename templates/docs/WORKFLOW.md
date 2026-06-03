# WORKFLOW — workflow de dev assisté par IA (référence in-repo)

> Référence courte vivant dans le repo. Le guide complet est dans le repo kit `ai-founder-workflow`.

## Principe central
La mémoire persistante vit dans des **fichiers**, pas dans les sessions. Les sessions sont **jetables**.
Le relais entre deux étapes = un **artefact durable** (spec, code commité, fichier de tests).
Dès que ce qui compte est dans un fichier, une session neuve (ou `/clear`) bat une longue session encombrée.

## Deux axes de sessions
- **Découverte** — continu, jamais par feature. Sort dans des fichiers (`knowledge/`).
- **Build** — par feature, en pipeline `spec → code → test`.

### Nomenclature
| Préfixe | Axe | Pour quoi | Écrit dans |
|---|---|---|---|
| `market-research-…` | Découverte | marché, concurrents, tendances | `knowledge/market/` |
| `user-feedback-…` | Découverte | échanges avec de vrais utilisateurs | `knowledge/crm/contacts/` + `knowledge/insights.md` |
| `spec-<feature>` | Build | le quoi : spec + critères + jalons | `features/<feature>/SPEC.md` |
| `code-<feature>` | Build | le comment : plan + code + filet rapide | `features/<feature>/PLAN.md` + code commité |
| `test-<feature>` | Build | e2e depuis le spec + revue, au jalon | suite e2e commitée |

`market-research` et `user-feedback` sont **deux types distincts** (extérieur/marché vs intérieur/personnes). Le format exact des préfixes est une préférence ; seul le préfixe par type compte.

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

## Optionnel : hooks de contexte & statusline
Filets pour les **longues** sessions `code-`. **Non activés par défaut** — à brancher toi-même dans `.claude/settings.json` si tu en veux. Les artefacts durables (PLAN/SPEC/code commité) restent le vrai relais ; ceci ne fait qu'aider la reprise.

- **`hooks/context-handoff.sh`** (événement `PreCompact`) — `PreCompact` est **notification-only** : il ne peut **pas** préserver le contexte lui-même. Le script se contente d'écrire un filet (`.cc-scratch/handoff.md` + sauvegarde du transcript) avant la compaction.
- **`hooks/context-restore.sh`** (événement `SessionStart`, matchers `compact`/`resume`) — réinjecte un rappel via `hookSpecificOutput.additionalContext` : « relis `PLAN.md`, le SPEC et `.cc-scratch/handoff.md` ».
- **`statusline.sh`** (clé `statusLine`, type `command`) — affiche le % de contexte utilisé (lu depuis le JSON passé au statusLine ; parsing défensif avec repli selon la version de Claude Code).

Pour activer : ajoute les blocs `PreCompact`, `SessionStart` et `statusLine` à `settings.json` (exemples en tête de chaque script). Tu peux aussi abaisser le seuil d'auto-compact (~0,85). Vérifie les noms de champs JSON contre `code.claude.com/docs` pour ta version.
