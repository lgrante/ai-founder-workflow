# Cockpit — plan d'architecture

> **Statut** : plan validé conceptuellement, pas encore implémenté.
> **Décisions cadre** (prises avec l'utilisateur) : runner **local mono-utilisateur** · lit l'état de **n'importe quel repo** setupé · backend de pilotage **Agent SDK headless** · vit dans **ce repo** sous `cockpit/`.

Ce document est le **comment**. Il fige les composants, le modèle de données, le contrat UI↔runner et les jalons avant la première ligne de code.

---

## 1. Vision en une phrase

Un **daemon local perso** qui, pour **n'importe quel repo où le workflow ai-founder-workflow est déployé** (détecté via `docs/WORKFLOW.md`), affiche un **board lu depuis les fichiers du kit** — colonnes par feature (build) et par sujet (discovery / content) — et **lance / reprend des sessions Claude Code via le SDK** dans des **worktrees git dédiés**, en remontant les **portes humaines** (plan mode, jalon, review) comme des cartes cliquables.

Le cœur de valeur n'est **pas** l'UI : c'est le **runner** qui orchestre `worktrees git + sessions SDK + portes humaines`, en lisant l'état depuis les fichiers que le kit standardise déjà.

---

## 2. Périmètre

### Dans le périmètre
- Un process local (daemon) + une UI servie sur `localhost`. Un seul utilisateur (toi), tes creds Claude Code machine.
- **Repo-agnostique** : pilote n'importe quel repo local passé par `/setup`. Le code de l'outil (`cockpit/`) ne contient jamais l'état piloté.
- Lance, suit, reprend des sessions via le **SDK Agent** (mode streaming multi-tours), pas via `claude -p` one-shot.
- Gère les **branches + worktrees** selon l'étiquette git du kit.
- Remonte les **portes interactives** (`AskUserQuestion`, plan mode) dans l'UI et réinjecte la réponse.
- Dérive le board en **lisant** les artefacts du repo cible (PLAN, backlog, content, knowledge, dashboard).

### Hors périmètre (assumé d'emblée)
- ❌ Piloter les sessions **claude.ai/code** existantes (pas d'API publique — acté). Le cockpit lance *ses propres* sessions SDK, distinctes.
- ❌ Multi-utilisateur / SaaS / auth / isolation d'équipe.
- ❌ Orchestration **autonome** (sessions qui s'auto-déclenchent). L'humain reste dans la boucle — cf. README du kit §10. L'app rend les gestes cliquables, elle ne supprime pas le jugement.
- ❌ Pause / redirect **mid-tour** d'une session (le SDK ne l'expose pas). On laisse finir le tour, on répond à la porte suivante, ou on tue.
- ❌ Inventer de nouveaux formats d'état. On consomme ceux du kit.

---

## 3. Modèle de domaine (dérivé du kit, pas réinventé)

Chaque type de session du kit devient une **définition déclarative** `{ type, skill, axe, branche, sortie, permissions }`. C'est la table unique qui pilote l'UI (colonnes), le runner (cwd/branche) et les permissions.

| Type | Axe | Skill | Préfixe branche | Sortie lue | Colonne board |
|---|---|---|---|---|---|
| `spec-<feature>` | build | `/spec` | `feat/<feature>` (partagée) | `features/<f>/SPEC.md` | par **feature** |
| `code-<feature>` | build | `/code` | `feat/<feature>` (partagée) | `features/<f>/PLAN.md` (cases) | par **feature** |
| `test-<feature>` | build | `/test` | `feat/<feature>` (partagée) | suite e2e commitée | par **feature** |
| `fix-<bug>` | build | `/code bugs/<slug>` | `fix/<bug-slug>` | `bugs/<slug>/TICKET.md` | par **feature** (bug) |
| `market-research-<t>` | discovery | `/research` | `research/<topic>` | `knowledge/market/` | par **sujet** |
| `user-feedback-<p>` | discovery | `/feedback` | `feedback/<person>` | `knowledge/crm/contacts/` | par **sujet** |
| `support-<client>` | discovery | `/support` | `support/<client>` | `knowledge/support/clients/` | par **sujet** |
| `backlog` | transverse | `/backlog` | `backlog` (unique) | `backlog/*.md` (frontmatter) | bandeau |
| `post-<ch>-<t>` | content | `/post` | `post/<channel>/<slug>` | `content/<ch>/{drafts,…}` | par **sujet** |
| `article-<t>` | content | `/article` | `article/<slug>` | `content/blog/{wip,published}` | par **sujet** |
| `newsletter-<e>` | content | `/newsletter` | `newsletter/<edition>` | `content/newsletter/` | par **sujet** |
| `report-<net>` | content | `/report` | `report/<net>/<date>` | `content/<net>/{stats,insights}` | par **sujet** |
| `status` | transverse | `/status` | `status/<date>` | `knowledge/dashboard.html` | bandeau |

**Règle d'or des branches** : `spec/code/test` d'une même feature **partagent** `feat/<feature>` (la 1ʳᵉ crée, les suivantes rejoignent). Tout le reste = une branche par pièce. Le runner applique le protocole d'ouverture de session du kit (working tree clean → branche cible → checkout/pull). Features parallèles = **worktrees séparés**.

---

## 4. Architecture en composants

```
┌─────────────────────────── UI (localhost:PORT) ───────────────────────────┐
│  Repo switcher  │  Board (colonnes feature / sujet)  │  Session view (stream + portes) │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                    │  REST (actions) + WS/SSE (events live)
┌──────────────────────────────────┴──────────────── Daemon local ───────────┐
│  ① Repo Registry      — repos enregistrés, détection docs/WORKFLOW.md        │
│  ② State Reader       — parse PLAN/backlog/content/knowledge → board model   │
│  ③ Git/Worktree Mgr   — crée/reprend branches + worktrees, garde-fous        │
│  ④ Session Runner     — spawn/reprend sessions via Agent SDK (streaming)     │
│  ⑤ Gate Broker        — capture AskUserQuestion/plan, attend la réponse UI   │
│  ⑥ Event Bus          — pousse stream + transitions d'état vers l'UI         │
│  ⑦ Store (SQLite)     — session_id, état runtime, logs (le NON-fichier)      │
└─────────────────────────────────────────────────────────────────────────────┘
        │ spawne `claude` (SDK) avec cwd = worktree du repo CIBLE
        ▼
   Repo cible setupé  ←─── State Reader lit ses fichiers (jamais cockpit/)
```

**Responsabilités (Single Responsibility / High Cohesion)** :
- **① Repo Registry** — liste des chemins locaux pilotables. Un repo est *pilotable* ⇔ `docs/WORKFLOW.md` existe à sa racine git (même signal canonique que `preflight-guard.py`). Sinon : affiché « lance `/setup` d'abord ».
- **② State Reader** — pur lecteur, sans effet de bord. Parse les emplacements du kit en un `BoardModel`. Re-lit sur `fs.watch` + au focus. Source de vérité = git, pas la DB.
- **③ Git/Worktree Mgr** — applique l'étiquette git : `git status` (refuse si dirty sans accord), résolution branche cible, `git worktree add` pour le parallélisme, **stage par chemin explicite jamais `-A`**. Indirection devant `simple-git`/`git` CLI.
- **④ Session Runner** — encapsule le SDK Agent. Une instance = une session vivante (`ClaudeSDKClient`/`query` streaming). Tient `session_id` pour `--resume`. cwd = worktree cible.
- **⑤ Gate Broker** — quand une session émet `AskUserQuestion` ou s'arrête en plan mode, crée une **carte « porte »** et bloque la session jusqu'à la réponse UI, puis la réinjecte. C'est le pont interactif.
- **⑥ Event Bus** — un flux d'événements typés par session vers l'UI (stream tokens, tool-use, gate-opened, state-changed).
- **⑦ Store (SQLite)** — uniquement ce que les fichiers ne contiennent **pas** : `session_id`, état runtime (`running|waiting-gate|done|killed`), horodatages, logs de stream. Jamais l'avancement métier (ça vit dans `PLAN.md`).

---

## 5. Modèle de données — lu vs stocké (la règle anti-divergence)

> **Principe** : la mémoire métier vit dans les **fichiers du repo cible** (doctrine kit §1). Le cockpit ne **duplique** rien — il **dérive**. La DB ne stocke que le runtime des sessions.

**Lu (depuis le repo cible, jamais stocké en dur)** :
- Avancement build ← **cases cochées de `features/<f>/PLAN.md`** (`- [ ]` / `- [x]`).
- Existence feature ← présence `features/<f>/SPEC.md`.
- Backlog ← **frontmatter** `backlog/*.md` (`statut`, `priorité`, `source`).
- Contenu ← arborescence `content/<ch>/{drafts,scheduled,posted}/` (le dossier = le statut).
- Discovery ← `knowledge/**` (+ `insights.md`).
- Vue agrégée ← `knowledge/dashboard.html` (déjà produit par `/status`).

**Stocké (SQLite locale du cockpit, le seul état propriétaire)** :
```
session(id PK, repo_path, type, skill, slug, branch, worktree_path,
        sdk_session_id, runtime_state, created_at, updated_at)
gate(id PK, session_id FK, kind, payload_json, opened_at, answered_at, answer_json)
event_log(id PK, session_id FK, ts, kind, payload_json)   -- stream/tool-use, append-only
repo(path PK, label, last_seen_at, pilotable bool)
```

Conséquence : `git pull` ou une édition manuelle dans le repo cible se reflète **immédiatement** dans le board (re-lecture), sans resync DB. `/status` et le cockpit racontent la même histoire.

---

## 6. Contrat UI ↔ runner

**REST (actions, idempotentes quand possible)** :
- `GET  /repos` · `POST /repos { path }` · détection pilotable.
- `GET  /repos/:id/board` → `BoardModel` (lu par State Reader).
- `POST /sessions { repo, type, slug }` → ouvre branche/worktree + spawn session. Renvoie `session_id`.
- `POST /sessions/:id/resume` · `POST /sessions/:id/message { text }` · `POST /sessions/:id/kill`.
- `POST /gates/:id/answer { choice }` → débloque la session.

**WS/SSE (events live, push runner→UI)** :
- `session.stream` (tokens partiels) · `session.tool_use` · `session.state_changed`
- `gate.opened { kind, question, options }` · `gate.answered`
- `board.changed` (fs.watch a détecté une modif fichier).

Format des events = JSON typé par `kind`. L'UI est un **consommateur passif** d'events + émetteur d'actions REST ; toute la logique vit dans le runner.

---

## 7. Le cœur : remontée des portes humaines

C'est ce qui réconcilie *skills interactifs* et *headless*. On n'utilise **pas** `claude -p` one-shot mais le **client SDK multi-tours en streaming** :

1. Le runner ouvre la session (`ClaudeSDKClient` / `query` avec input streaming) sur le worktree cible, avec le skill demandé (`/code <feature>`).
2. La session streame → `session.stream` vers l'UI.
3. Quand `/code` atteint la **porte 1 (PLAN)**, il appelle `AskUserQuestion`. Le SDK expose ça comme un message structuré. Le **Gate Broker** :
   - le transforme en `gate.opened { kind: "validation", question, options: [Validé, À améliorer, Stop] }`,
   - met la session en `waiting-gate`,
   - **bloque** jusqu'à `POST /gates/:id/answer`.
4. L'UI affiche une **carte cliquable** ; ton clic → `answer` → le runner réinjecte la réponse dans la session → elle reprend.
5. Idem porte 2 (ARCHITECTURE, régime full), gate humain au jalon, review audience.

→ Le cockpit **n'automatise pas le jugement** ; il rend les portes du kit cliquables depuis le board. Fidèle au §10.

**Permissions par skill** (pour éviter les prompts bloquants sans `bypassPermissions` aveugle) : chaque type porte son profil dans la table §3.
- `/research`, `/feedback`, `/report` (lecture + écriture knowledge/content) → `acceptEdits` + `allowedTools` ciblés (Read, Write, WebFetch, MCP réseau).
- `/code` (écrit du code + lance des commandes) → `acceptEdits` mais `Bash` borné par allow/deny scoping (`Bash(git *)`, deny `Bash(rm *)`), les vraies décisions passant par les portes.
- Jamais de `bypassPermissions` global par défaut.

---

## 8. Mécanique git / worktree (valeur différenciante)

Le cockpit **possède** la corvée que l'humain rate sous pression. À l'ouverture d'une session, le Git/Worktree Mgr applique le protocole du kit :
1. `git status` du repo cible → si dirty, remonte une porte « commit / stash / annuler » (ne crée jamais de branche par-dessus des changes pendants).
2. Résout la branche cible selon §3 (`feat/<feature>` partagée pour build ; sinon préfixe/axe).
3. Si feature parallèle d'une autre déjà active → **`git worktree add` dédié** → la session tourne dans un répertoire isolé. 3 sessions concurrentes (`/code` A, `/article` B, `/report` linkedin) = 3 worktrees = zéro collision (ce que la doctrine réclame déjà).
4. Stage **par chemin explicite** uniquement. Pas de push automatique (geste humain — bouton « push » distinct).

Le board « colonne par feature / sujet » devient une **vue directe des branches + worktrees actifs**.

---

## 9. Stack proposée

- **Runner** : Node.js + TypeScript. Raison : le **SDK Agent TypeScript** est first-class, `fs.watch` natif, et le packaging d'un daemon + serveur HTTP/WS est trivial (`fastify` + `ws`). (Python est une alternative viable si tu préfères, le SDK existe aussi — mais TS aligne UI et runner sur un seul langage.)
- **Git** : `simple-git` (ou exec `git` direct) derrière le Git/Worktree Mgr.
- **Store** : SQLite (`better-sqlite3`) — fichier local, zéro serveur.
- **UI** : SPA légère (React/Vite) servie par le runner sur `localhost`. Board + session view temps réel via WS.
- **Parsing d'état** : lecteurs dédiés (frontmatter YAML pour backlog, regex cases pour PLAN, glob pour content). Pas de dépendance lourde.

Le tout vit sous `cockpit/` : `cockpit/runner/`, `cockpit/ui/`, `cockpit/shared/` (types du modèle de domaine §3, partagés).

---

## 10. Jalons (livrables vérifiables)

- **J1 — Lecture seule** : Repo Registry + State Reader + UI board. *Critère* : j'enregistre un repo setupé, je vois ses features (avec % d'avancement lu depuis PLAN), son backlog, son contenu. **Aucune** session lancée. (Valide tout le socle « lit n'importe quel repo » sans risque.)
- **J2 — Lancer une session simple** : Session Runner + Event Bus + Git Mgr pour un skill **sans porte** (`/research <sujet>`). *Critère* : je clique « lancer research », une branche `research/<topic>` est créée, la session streame dans l'UI, l'artefact apparaît dans `knowledge/`, la carte passe `done`.
- **J3 — Portes humaines** : Gate Broker + `/code` avec plan mode. *Critère* : `/code <feature>` s'arrête à la porte PLAN, une carte cliquable apparaît, mon clic « Validé » reprend la session jusqu'au prochain gate.
- **J4 — Concurrence worktrees** : 2+ sessions en parallèle sur le même repo dans des worktrees distincts sans collision. *Critère* : `/code` A et `/article` B tournent ensemble, `git worktree list` montre 2 worktrees, aucun stage croisé.
- **J5 — Reprise** : `--resume` d'une session via son `sdk_session_id`. *Critère* : je ferme le daemon, je le relance, je reprends une session `waiting-gate` là où elle était.

Gate humain à chaque jalon (toi) avant d'enchaîner — cohérent avec la doctrine build.

---

## 11. Risques & arbitrages

- **Surface SDK qui bouge** (sessions/permissions encore en évolution) → isoler tout le SDK derrière le Session Runner (Indirection / Protected Variations) : un seul module à adapter si l'API change.
- **`AskUserQuestion` headless** : vérifier tôt (dès J3, voire un spike avant J1) comment le SDK matérialise une porte interactive en mode programmatique — c'est l'hypothèse la plus risquée du design. Si la remontée n'est pas clean, fallback : détecter l'arrêt en plan mode et réinjecter via un message de continuation.
- **Frontière kit/outil** : `cockpit/` ne doit **jamais** écrire dans l'état d'un repo cible autrement que via une session Claude. Le State Reader est strictement lecture seule.
- **Tentation d'autonomie** : ne pas glisser vers l'auto-déclenchement. Chaque session reste initiée par un clic humain.

---

## 12. Ce que ce cockpit n'est pas (garde-fous d'intention)

- Pas un orchestrateur autonome multi-agents.
- Pas un pilote des sessions web claude.ai/code.
- Pas une source d'état concurrente de git : il **lit** les fichiers du kit, il ne les double pas.
- Pas un produit d'équipe (pour l'instant) : local, mono-utilisateur, extensible plus tard.
