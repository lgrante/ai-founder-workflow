# ai-founder-workflow — kit de workflow IA pour solo founders et équipes dev

Un modèle de sessions **répétable** pour piloter Claude Code : par feature côté build, par sujet côté découverte (incl. tickets support), par output côté audience. Avec une **vérification automatisée** sur le build et un **contexte qui reste propre** sur tous les axes. Conçu pour être **déployé sur n'importe quel repo**.

> **Pour qui** : les **solo founders** (qui font tout — dev, contenu, sales-discovery, support clients) et les **équipes dev** qui veulent un workflow IA cohérent et partageable.
> **Sur quoi** : n'importe quel repo de l'équipe.
> **Ce que ça remplace** : l'organisation « une session par rôle » (product / frontend / backend / qa / marketing / support), qui sature le contexte et fait que les sessions travaillent mal ensemble.

---

## 1. L'idée en une page

Tout part d'une contrainte unique : **la fenêtre de contexte se remplit vite, et la qualité baisse à mesure qu'elle se remplit.** Tout le reste en découle.

**Trois principes :**

1. **La mémoire persistante vit dans des fichiers, pas dans les sessions.** Les sessions sont **jetables**. Le relais entre deux étapes est toujours un **artefact durable** : un spec, du code commité, un fichier de tests, un draft de post, une édition de newsletter, un résumé de tickets support — jamais « la conversation ».
2. **Une session = un contexte cohérent.** L'organisation se fait par **feature** (build), par **sujet** (découverte, audience), **pas par rôle**. Les rôles (investiguer, relire…) deviennent des **subagents** *dans* une session.
3. **La vérification est automatisée** côté build, pour que le développeur ne soit jamais le messager entre deux étapes.

L'idée clé : **dès que ce qui compte est dans un fichier, une session neuve (ou `/clear`) bat une longue session encombrée.**

---

## 2. Les trois axes de sessions

| Axe | Sessions | Nature | Sortie |
|---|---|---|---|
| **Découverte** | `market-research-…`, `user-feedback-…`, `support-…` | continu, jamais par feature | fichiers de connaissance (`knowledge/`) |
| **Build** | `spec-…` → `code-…` → `test-…` | par feature, en pipeline | spec, code, tests (`features/`) |
| **Audience** | `post-…`, `article-…`, `newsletter-…` | continu, par output | fichiers de contenu (`content/`) |

Les axes sont **horizontaux** (chacun avec sa logique propre), pas **verticaux** (rôles dans une feature). La **découverte** est la source qui alimente les `spec-` du build ET les rédactions de l'audience.

### Nomenclature des sessions

Chaque session porte un **préfixe selon son type**, ce qui permet de les retrouver avec `--resume` / `/resume`. Chaque commande `/…` renomme la session avec le bon préfixe.

| Préfixe | Axe | Pour quoi | Écrit dans |
|---|---|---|---|
| `market-research-…` | Découverte | paysage marché, concurrents, tendances | `knowledge/market/` |
| `user-feedback-…` | Découverte | échanges avec de vrais utilisateurs (incl. discovery sales) | `knowledge/crm/contacts/` + `knowledge/insights.md` |
| `support-<client>` | Découverte | sift des tickets support (Jira / Zendesk / Linear / …) | `knowledge/support/clients/<client>.md` + `knowledge/support/insights.md` |
| `spec-<feature>` | Build | le **quoi** : spec + critères + jalons | `features/<feature>/SPEC.md` |
| `code-<feature>` | Build | le **comment** : plan + code + filet rapide | `features/<feature>/PLAN.md` + code commité |
| `test-<feature>` | Build | e2e depuis le spec + revue, au jalon | suite e2e commitée |
| `post-<channel>-<sujet>` | Audience | post court pour un réseau (LinkedIn, Twitter/X, …) | `content/<channel>/{drafts,scheduled,posted}/` |
| `article-<sujet>` | Audience | long form (blog) | `content/blog/{wip,published}/` |
| `newsletter-<edition>` | Audience | édition assemblée à partir du reste | `content/newsletter/<edition>.md` |

- **Trois types de découverte distincts** : `market-research-` regarde le **marché** (extérieur, abstrait) ; `user-feedback-` regarde des **personnes précises** (intérieur, qualitatif, 1-à-1) ; `support-` regarde des **tickets agrégés** (intérieur, quantitatif, depuis un système Jira/Zendesk/…). Les trois alimentent `knowledge/insights.md` global, qui est la source où émergent les motifs.
- Les skills audience (`post`, `article`, `newsletter`) **invoquent** les skills de copywriting existantes (ex. `marketing-skills:writing-linkedin-posts`) si elles sont disponibles globalement. Le kit fournit la **structure** + le **workflow** (où ranger, draft → review → publish), pas la rédaction elle-même.
- Le skill `support` utilise en priorité le **MCP Atlassian Rovo** officiel (GA février 2026, Claude partenaire officiel) si configuré ; sinon il bascule sur l'API Jira via API token.
- Le **format exact** des préfixes (séparateur, casse) est une préférence d'équipe ; seul le **préfixe par type** compte. La cohérence importe.

---

## 3. Le pipeline de build (par feature)

Trois sessions, dans l'ordre. Chacune laisse un fichier que la suivante lit.

- **`spec-<feature>`** — décide le **quoi**. Écrit le **spec**, les **critères d'acceptation** (= définition de « fini », dérivés **avant** le code) et les **jalons** (tranches user-facing). Les critères servent de référence à **tous** les tests. Au démarrage, le skill `/spec` lit `knowledge/insights.md` global ET `knowledge/support/insights.md` (motifs récurrents côté support) pour ne pas réinventer ou contredire silencieusement la découverte accumulée.
- **`code-<feature>`** — **construit**. Lit le spec, écrit son **plan** détaillé en *plan mode* (après exploration du codebase), puis implémente **une étape à la fois**. *(Front et back d'une même feature → même session : ils partagent le contrat d'API.)* À chaque étape, **un subagent écrit le filet rapide** (voir §4) et un **hook le lance**.
- **`test-<feature>`** — **valide indépendamment**. Session **fraîche qui n'a pas écrit le code**. Écrit la suite **e2e (+ acceptation)** depuis le **spec**, au jalon, et fait la **revue à œil neuf**.

Puis **un humain valide le jalon** avant d'enchaîner.

**Une feature = une branche git.** L'axe build est rattaché à une branche : les trois sessions d'une feature (`spec-`, `code-`, `test-`) travaillent toutes sur **cette même** branche dédiée (ex. `feature/<feature>`) — jamais deux features mélangées sur une branche. Plusieurs features en parallèle → **worktrees git séparés** (une branche chacune). Les sessions de **découverte** et d'**audience** ne sont rattachées à aucune branche.

```mermaid
flowchart TD
    spec["spec-&lt;feature&gt;<br/>écrit SPEC.md<br/>(quoi + critères + jalons)"]
    code["code-&lt;feature&gt;<br/>plan → code, étape par étape"]
    write["écrit le code de l'étape"]
    subagent["un subagent écrit les tests rapides"]
    hook{"hook lance les tests"}
    fix["corrige seul"]
    commit["commit + coche l'étape"]
    test["test-&lt;feature&gt;<br/>e2e depuis le spec + revue (œil neuf)"]
    human["humain valide le jalon"]

    spec --> code
    code --> write
    write --> subagent
    subagent --> hook
    hook -- "rouge" --> fix
    fix --> hook
    hook -- "vert" --> commit
    commit -- "étape suivante" --> write
    commit -- "feature finie" --> test
    test --> human
```

### Pipeline d'audience (par output)

Plus simple que le build — pas de tests automatisés, le gate est uniquement humain :

- **`post-<channel>-<sujet>`** : draft → review humaine → `scheduled/` ou `posted/`.
- **`article-<sujet>`** : plan (validé) → wip → review section par section → `published/`.
- **`newsletter-<edition>`** : structure (validée) → assemblage → review → posted.

### Session vs subagent

- **Session séparée** quand le relais est un **artefact durable** (spec, code commité, tests, draft de contenu, résumé support).
- **Subagent** (dans la session) quand le relais est des **trouvailles éphémères** qui reviennent dans le travail courant (investigation, rédaction de tests, copywriting d'une section, sift des tickets bruts).

---

## 4. Vérification — deux sortes de tests, deux boulots (côté build)

La vérification automatisée s'applique au **build** uniquement (les axes découverte et audience ont un gate purement humain à la review).

La ligne de partage côté build n'est **pas** « unitaire vs le reste ». C'est **rapide & incrémental** (`code-x`, à chaque étape) **vs bout-en-bout** (`test-x`, au jalon).

| | **Filet rapide** | **Validation indépendante** |
|---|---|---|
| **Où** | chez `code-x`, à chaque étape | chez `test-x`, au jalon |
| **Quoi** | unitaires + intégration rapide | e2e + acceptation |
| **Écrit par** | un subagent, depuis les **critères de l'étape** | une session fraîche, depuis le **spec** |
| **Lancé par** | un **hook** (bloque tant que rouge) | au jalon / en CI |
| **Rôle** | filet de régression (validation faible) | vraie validation (œil neuf) |
| **Image** | le cuisinier qui goûte en cuisinant | le critique qui juge l'assiette face au menu |

**Pourquoi ce découpage, précisément :**

- **Les tests s'ancrent sur l'intention** (les critères / le spec), **jamais sur le code qu'on vient d'écrire** — sinon ils ratifient l'implémentation, bugs compris.
- **L'intégration rapide reste chez `code-x`.** Une étape câble souvent deux modules ou tape une API ; si la vérification n'a lieu qu'à l'e2e du jalon, la casse est découverte **tard**. Un test d'intégration rapide à l'étape la rattrape sur le coup.
- **L'e2e ne peut pas être le gate par étape.** À l'étape 3/7, la tranche n'est pas câblée de bout en bout → l'e2e est forcément rouge. Le gate par étape doit donc être du rapide / incrémental.
- **Granularité du filet** : étape simple → des unitaires suffisent souvent ; étape qui touche l'API ou relie plusieurs morceaux → ajouter un test d'intégration rapide. **L'objectif n'est pas 100 % de couverture** (tests sans valeur, fragiles) — c'est « l'étape fait ce qu'elle doit faire ».
- **Disjoncteur** : « on corrige tant que c'est rouge » ne tourne pas à l'infini (le `Stop` hook s'auto-désactive après ~8 blocages). Après 2-3 tentatives toujours rouges, c'est le signal qu'un **humain** intervient (spec faux ? approche à revoir ?).

**Gate humain au jalon uniquement** : un humain valide la tranche avant d'enchaîner. La régression par étape est automatisée.

### Comment c'est câblé

- **`Stop` hook** (ou `PostToolUse` sur `Edit|Write`) : lance les tests rapides et **bloque la fin du tour** tant que ce n'est pas vert → `code-x` corrige et relance **seule**.
- **Anti-boucle obligatoire** : flag `stop_hook_active` dans le hook.
- (Optionnel) **statusline** affichant le % de contexte, **seuil d'auto-compact abaissé** (~0,85), et un **PreCompact → fichier + SessionStart → restore** comme filet sur les longues sessions.

---

## 5. Hygiène de contexte

- **`/compact`** aux points verts : préserver l'état du plan, les fichiers touchés, les critères ; jeter le bruit des échecs résolus. (Même sujet, on dégraisse.)
- **`/clear`** ou nouvelle session entre sujets sans rapport. (On change de sujet, rien à garder.)
- Le **déclenchement** du `clear`/`compact` reste un geste **humain** (décision sémantique : « cette tâche est finie ») ; ce qui s'automatise, ce sont les hooks — pas le moment.

---

## 6. Architecture par défaut (à adapter à chaque repo)

> ⚠️ **Deux structures à ne pas confondre.** Ceci est la structure que le kit **déploie dans un repo cible**. La structure **du repo kit lui-même** est décrite plus bas (§9).

C'est un **point de départ**, pas un dogme : chaque équipe l'adapte à son repo (noms, emplacements, intégration avec l'existant). Seuls les **principes** (§1–§4) sont non-négociables.

```
<racine du repo>/
├── CLAUDE.md                 # racine, versionné — COURT (commandes, conventions, étiquette)
├── CLAUDE.local.md           # gitignored — notes perso
├── .claude/
│   ├── settings.json         # hooks (Stop / PostToolUse)
│   ├── hooks/                # scripts (ex. test-gate) + anti-boucle stop_hook_active
│   └── skills/               # savoir de domaine + commandes de session (/<nom>)
│       ├── setup/ spec/ code/ test/                       # cœur dev (4 + setup)
│       ├── research/ feedback/ support/                   # découverte (3 types)
│       ├── post/ article/ newsletter/                     # cœur audience
│       └── <skills de domaine>                            # conventions front, back/API — À ADAPTER
├── docs/WORKFLOW.md          # cette doctrine + conventions de nommage
├── knowledge/                # axe DÉCOUVERTE (continu, jamais par feature)
│   ├── market/               # recherche marché
│   ├── insights.md           # agrégat global (features ET contenu)
│   ├── content/brand-book.md # tonalité, style, voice (lu par /post /article /newsletter)
│   ├── crm/contacts/         # données perso (user-feedback) — repo privé séparé OU gitignored
│   └── support/              # sift des tickets clients (4e type discovery)
│       ├── clients/<client>.md  # résumé cumulatif daté par client
│       └── insights.md          # agrégat motifs cross-clients support
├── features/                 # axe BUILD (par feature) — structure standard pour CHAQUE feature
│   └── <feature>/            # racine = la VERSION ACTIVE
│       ├── README.md         # statut + liens
│       ├── SPEC.md / SPEC.html   # le quoi (possédé par spec-x)
│       ├── PLAN.md / PLAN.html   # le comment (possédé par code-x)
│       ├── sub-features/<sub>/   # composants/pages atomiques (même structure récursive)
│       ├── prototypes/           # mockups, design exploratoire
│       ├── qa/sprint-{N}-{slug}/ # captures par sprint
│       ├── plans/                # roadmap, plans de release
│       └── archives/v{N}/        # versions périmées (refonte majeure → racine actuelle bascule ici)
├── content/                  # axe AUDIENCE (continu, output pour les réseaux)
│   ├── linkedin/{drafts,scheduled,posted}/    # posts courts par channel
│   ├── twitter-x/{drafts,posted}/             # idem (scheduled optionnel selon outil)
│   ├── blog/{wip,published}/                  # long form
│   └── newsletter/<edition>.md                # éditions périodiques
├── .cc-scratch/              # gitignored — résultats de tests + creds locaux (support-creds.json, etc.)
└── <code applicatif>         # INCHANGÉ
```

**Ce qui doit survivre, peu importe les noms :**

- **Trois axes physiquement séparés** : découverte (`knowledge/`), build (`features/`), audience (`content/`).
- **Découverte à 3 sources distinctes** : market (extérieur), CRM contacts (intérieur qualitatif), support (intérieur quantitatif via tickets agrégés). Toutes alimentent l'agrégat `knowledge/insights.md` global.
- Pour une feature, **SPEC et PLAN au même endroit**, dans une **structure standard reproductible** (sub-features / prototypes / qa / plans / archives) que TOUTES les features partagent.
- **Versionnage par dossier côté build** : la racine du feature dir = version active ; les versions périmées vont dans `archives/v{N}/` (« refonte majeure » : on bascule la racine entière, on n'édite pas in-place).
- **Sub-features récursives** : un composant atomique d'une version active vit dans `sub-features/<sub>/` avec la même structure.
- **Drafts/scheduled/posted séparés côté audience** : un draft se relit, un post publié n'a plus à être modifié. Les channels sont des sous-dossiers de `content/`, eux-mêmes avec une structure standard.
- **Brand book partagé** : `knowledge/content/brand-book.md` est la source de tonalité, lue par tous les skills audience pour la cohérence.
- **Support cumulatif** : `knowledge/support/clients/<client>.md` est **append-only** (sections datées par session). L'historique des motifs est lisible directement dans le fichier.
- Commandes + savoir de domaine dans `.claude/skills/` (chargés à la demande), pas dans un `CLAUDE.md` obèse.
- Le **statut** d'avancement à **un seul endroit** (les cases du PLAN pour le build, le sous-dossier `drafts/`/`published/` pour le contenu) ; les résultats de tests sont du **scratch** gitignored.
- Le `CLAUDE.md` reste **court** : pour chaque ligne, « la retirer ferait-elle faire une erreur à Claude ? » Sinon, on la coupe.

---

## 7. Installation

Le kit fournit un script `install.sh` avec deux modes. La voie recommandée pour démarrer est **l'install global** des skills, puis le déploiement du workflow dans chaque repo cible via le skill `/setup`.

### Étape 1 — Récupérer le kit

```bash
gh repo clone lgrante/ai-founder-workflow ~/ai-founder-workflow
```

### Étape 2 — Installer les skills globalement

```bash
~/ai-founder-workflow/install.sh --global
```

Les 10 skills (`/setup /spec /code /test /research /feedback /support /post /article /newsletter`) sont alors disponibles dans **toutes** les sessions Claude Code, sur n'importe quel repo (copiés dans `~/.claude/skills/`).

### Étape 3 — Déployer le workflow dans un repo cible

Dans le repo cible, ouvrir une session Claude Code et taper :

```
/setup
```

Le skill `/setup` pilote toute l'installation interactivement :
1. Vérifie que le repo est sur une branche propre (propose un commit/stash si besoin), puis crée la branche `setup-workflow`.
2. Inventorie le repo (lecture seule), propose un mapping de l'architecture par défaut sur la réalité du repo, et présente une **carte de migration `old → new`** + des questions stratégiques (périmètre, sort des dossiers par-rôle existants, commandes de test, channels audience, système de support utilisé, etc.).
3. **Attend la validation du paquet** avant toute action.
4. Exécute phase par phase, **avec autorisation explicite à chaque batch destructif** (move / rename / delete). Chaque phase fait un commit dédié + un compte-rendu.
5. Termine en proposant le push et des dry-run avec `/spec`, `/post`, `/support` pour valider les pipelines.

### Alternative — Install per-repo

Pour versionner les skills + hooks avec le repo lui-même (au lieu de les charger globalement) :

```bash
cd /chemin/vers/le/repo
~/ai-founder-workflow/install.sh
```

Copie `templates/` + `scaffold/` dans le repo. Ensuite, `/setup` pilote le déploiement comme ci-dessus.

### Garanties anti-perte

Le skill `/setup` applique les règles suivantes — quel que soit le repo :

- **Chaque fichier existant impacté figure dans la carte de migration** (`move` / `merge` / `keep` / `archive` / `delete` + raison). **Rien ne disparaît en silence.**
- **`git mv` partout** : l'historique est préservé pour chaque fichier déplacé.
- **Obsolètes → `_archive/`**, jamais supprimés directement. La suppression définitive n'arrive qu'après validation finale.
- **Code applicatif intact par défaut** : `git diff` sur les chemins applicatifs reste vide, sauf décision explicite.
- **Toute opération destructive demande une confirmation explicite** (par batch logique : ex. « je vais faire 12 git mv », pas par fichier).

---

## 8. Non-négociable vs adaptable

**Non-négociable (la doctrine §1–§5) :**
- Mémoire dans les fichiers, sessions jetables, relais = artefact durable.
- Organisation **par feature + découverte + audience**, jamais par rôle.
- Pipeline build `spec → code → test` ; tests ancrés sur l'intention.
- Filet rapide (étape, `code-x`) vs validation indépendante (jalon, `test-x`).
- Gate humain au jalon côté build, et à la review côté audience.
- 3 types de découverte distincts (market / user-feedback / support), tous alimentant l'agrégat global.

**Adaptable (par repo) :**
- Noms et emplacements des dossiers.
- La stack, les frameworks de test, les commandes exactes.
- Le format des préfixes de session.
- L'intégration avec un `.claude/` ou des hooks déjà présents.
- Les channels audience (LinkedIn, Twitter/X, Bluesky, etc. — à étendre selon les besoins).
- Le système de support utilisé (Jira / Zendesk / Linear / Intercom — détection auto via MCP ou API).

---

## 9. Le repo kit lui-même

```
ai-founder-workflow/          # le repo à partager
├── README.md · README.html   # ce guide (markdown + version web)
├── CONTRIBUTING.md           # comment l'équipe contribue (PR, doctrine, tests)
├── LICENSE                   # MIT
├── install.sh                # install global ou per-repo
├── templates/                # fichiers à installer
│   ├── CLAUDE.md             # squelette (commandes/conventions à remplir)
│   ├── docs/WORKFLOW.md      # la doctrine, copiée telle quelle
│   └── .claude/
│       ├── settings.json     # hooks — placeholders de commandes de test
│       ├── statusline.sh     # OPTIONNEL (opt-in) — % de contexte
│       ├── hooks/test-gate.sh             # Stop hook (filet rapide)
│       ├── hooks/context-handoff.sh       # OPTIONNEL — PreCompact
│       ├── hooks/context-restore.sh       # OPTIONNEL — SessionStart
│       └── skills/{setup,spec,code,test,research,feedback,support,post,article,newsletter}/SKILL.md
├── scaffold/                 # arborescence vide (knowledge/, features/, content/, .cc-scratch/)
└── examples/checkout-flow/   # exemple travaillé : SPEC.md + PLAN.md
```

> Les fichiers marqués **OPTIONNEL** sont livrés mais **non activés** : ils ne sont pas branchés dans `settings.json`. Voir `templates/docs/WORKFLOW.md` (§ Optionnel) pour les activer.

Mises à jour : `git pull` côté kit, puis re-run de `install.sh --global` (ou `install.sh` per-repo). Contributions de l'équipe : par PR sur ce repo (voir `CONTRIBUTING.md`).

---

## 10. Ce que ce kit n'est *pas*

- **Ce n'est pas de l'orchestration multi-agents autonome.** C'est un workflow pour **un humain qui pilote Claude Code en interactif**. Des agents qui se surveillent et se déclenchent mutuellement, c'est un autre problème (un runtime d'orchestration) — hors scope.
- **Ce n'est pas une promesse de « zéro relecture ».** Le gate humain au jalon, la revue à œil neuf côté build, et la review humaine côté audience sont volontairement maintenus : l'automatisation porte sur la **régression**, pas sur le **jugement**.
- **Ce n'est pas un kit de copywriting.** Les skills audience (`/post`, `/article`, `/newsletter`) fournissent la **structure et le workflow** (où ranger, dans quel ordre, validation). Pour la rédaction elle-même, ils **invoquent** des skills spécialisées (ex. `marketing-skills:writing-linkedin-posts`) si elles sont disponibles globalement.
- **Ce n'est pas une intégration support clé en main.** Le skill `/support` détecte le MCP Atlassian Rovo s'il est configuré et bascule sinon sur l'API Jira via token. La gestion fine de l'auth (refresh tokens, scopes, multi-instances) reste au repo cible.
