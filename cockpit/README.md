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

## État — J1 (lecture seule) livré ✅
Premier jalon implémenté : board **lu** depuis un repo setupé, **sans lancer aucune session**.

- **Repo Registry** (`src/repoRegistry.ts`) — détecte la pilotabilité via `docs/WORKFLOW.md`.
- **State Reader** (`src/stateReader.ts`) — dérive le `BoardModel` (features + avancement PLAN, backlog, content, discovery) en lecture seule.
- **Daemon** (`src/server.ts`) — API `/api/repos`, `/api/board` + UI statique, bind `127.0.0.1`.
- **UI** (`ui/index.html`) — board thème sombre : colonnes build / backlog / content / discovery.
- **Tests** (`test/`) — 8 tests sur fixture, zéro dépendance.

Reste à faire : **J2** (lancer une session simple via le SDK) → **J3** (portes humaines) → **J4** (worktrees concurrents) → **J5** (reprise). Cf. `ARCHITECTURE.md §10`.

## Pré-requis & lancement
Node ≥ 22.18 (type-stripping natif, **aucune dépendance à installer**).

```bash
cd cockpit
npm test                                    # 8 tests sur la fixture
npm run board -- /chemin/vers/un/repo        # imprime le board en CLI
COCKPIT_REPOS=/chemin/repoA:/chemin/repoB npm start   # daemon → http://127.0.0.1:4317
```
