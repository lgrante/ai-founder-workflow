# cockpit/

Cockpit local de pilotage des sessions Claude Code, au-dessus du workflow ai-founder-workflow.

**En une phrase** : un daemon local perso qui, pour n'importe quel repo setupé (détecté via `docs/WORKFLOW.md`), affiche un board lu depuis les fichiers du kit — colonnes par feature (build) et par sujet (discovery / content) — et lance / reprend des sessions Claude Code via le **SDK Agent** dans des worktrees git dédiés, en remontant les portes humaines (plan mode, jalon, review) comme des cartes cliquables.

> ⚠️ `cockpit/` contient le **code de l'outil**, jamais l'état piloté. L'état métier vit dans les fichiers du repo cible (doctrine kit §1). Le cockpit le **lit**, il ne le double pas.

## Décisions cadre
- Runner **local, mono-utilisateur** (pas de SaaS / auth / multi-tenant).
- **Repo-agnostique** : pilote n'importe quel repo local passé par `/setup`.
- Backend de pilotage : **Agent SDK** (streaming multi-tours), pas `claude -p` one-shot ni l'API des sessions web.
- L'humain reste dans la boucle (cf. README du kit §10) — l'app rend les gestes cliquables, elle ne supprime pas le jugement.

## Documents
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — le plan complet : composants, modèle de données (lu vs stocké), contrat UI↔runner, mécanique des portes humaines, git/worktree, jalons.

## État — J1 + J2 livrés ✅

**J1 — lecture seule** : board **lu** depuis un repo setupé, sans lancer de session.
- **Repo Registry** (`src/repoRegistry.ts`) — pilotabilité via `docs/WORKFLOW.md`.
- **State Reader** (`src/stateReader.ts`) — `BoardModel` dérivé (features + avancement PLAN, backlog, content, discovery), lecture seule.

**J2 — lancer une session** (skill sans porte, ex. `/research`) via le SDK/CLI Claude Code.
- **Session types** (`src/domain/sessionTypes.ts`) — table type→branche→permissions + `resolveBranch`.
- **Git Manager** (`src/gitManager.ts`) — résout/crée la branche (refus si working tree sale), couture worktree pour J4.
- **Runner** (`src/runner/`) — frontière SDK : `ClaudeCliRunner` (headless `claude -p --output-format stream-json`) + `FakeRunner` (tests/démo) derrière une interface unique. Parser NDJSON pur.
- **Store** (`src/store.ts`) — SQLite natif (`node:sqlite`) : runtime des sessions + log de stream (le seul état possédé, jamais l'avancement métier).
- **Session Manager** (`src/sessionManager.ts`) — orchestre git → runner → store → bus, transitions d'état.
- **Daemon** (`src/server.ts`) — `POST /api/sessions` (lance), `GET /api/sessions/:id/events` (SSE replay + live), `/api/types`, + J1.
- **UI** (`ui/index.html`) — board + barre de lancement + panneau de stream live.

**Tests** (`test/`) — **23 tests**, zéro dépendance (Node built-ins + type-stripping). Le pipeline complet (git → stream → store → SSE) est prouvé via `FakeRunner` + un faux binaire `claude` ; aucune dépendance à un run LLM réel.

Reste à faire : **J3** (portes humaines — plan mode / `AskUserQuestion` remontés comme cartes cliquables, via le client SDK multi-tours) → **J4** (worktrees concurrents) → **J5** (reprise par `--resume`). Cf. `ARCHITECTURE.md §10`.

> ⚠️ Le run **LLM réel** (`/research` produisant un fichier dans `knowledge/`) est **câblé** mais non exécuté en sandbox (tokens + repo cible + auth requis). Le chemin code est couvert par les tests ci-dessus.

## Pré-requis & lancement
Node ≥ 22.18 (type-stripping + `node:sqlite` natifs, **aucune dépendance à installer**).

```bash
cd cockpit
npm test                                              # 23 tests
npm run board -- /chemin/vers/un/repo                  # imprime le board en CLI
COCKPIT_REPOS=/chemin/repoA:/chemin/repoB npm start    # daemon → http://127.0.0.1:4317

# démo/dev UI sans consommer de tokens (runner factice) :
COCKPIT_FAKE=1 COCKPIT_REPOS=/chemin/repo npm start
```

Variables : `COCKPIT_REPOS` (repos cibles, séparés par `:`), `COCKPIT_PORT` (défaut 4317),
`COCKPIT_DB` (défaut `~/.ai-founder-cockpit/cockpit.db`), `COCKPIT_FAKE` (runner factice).
