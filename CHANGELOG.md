# Changelog — ai-founder-workflow

Versions du **kit** (skills, hooks, doctrine). Le skill `/update` lit ce fichier
pour afficher ce qui change entre la version installée sur un repo
(`.claude/.kit-version`) et la version du kit clonée.

Format : [SemVer](https://semver.org/lang/fr/). `MAJEUR` = changement de
structure imposant une migration manuelle ; `MINEUR` = nouveau skill / hook /
capacité rétro-compatible ; `CORRECTIF` = corrections sans nouvelle surface.

## 2.0.0 — 2026-06-08

Refonte du classement de `knowledge/` (axe Découverte). **MAJEUR** : la
structure change → migration manuelle des repos déjà installés (cf. `MIGRATION.md`).

### Principe directeur
- **Un objet = un dossier. Un acte = un fichier daté.** La découverte se range
  désormais par **objet stable** (5), plus par dossiers thématiques qui
  mélangeaient trois axes (par personne / par conversation / par sujet).

### Changé (structure `knowledge/`)
- **`people/`** (nouveau) — une fiche **par personne**, interne **ou** externe,
  évolutive. Absorbe `crm/contacts/`. L'équipe interne (boss, collègues) a enfin
  une place.
- **`conversations/`** (nouveau) — un fichier **par échange daté**, pointe vers
  `people/`. Format **5 champs** (citation brute, pain, solution actuelle, notes,
  liens).
- **`research/`** (renommé depuis `market/`) — une note **par sujet exploré**.
- **`competitors/`** (nouveau) — un dossier **par concurrent** (split de `market/`).
- **`community/`** (nouveau) — canaux de **veille passive** (split de `market/`).
- **Disparaissent** : `crm/contacts/` (→ `people/`), `market/` (→ `research/` +
  `competitors/` + `community/`). **Inchangés** : `support/`, `content/`,
  `insights.md`.

### Skills
- **`/feedback`** écrit maintenant **deux objets** : la conversation datée
  (`conversations/`) **et** la fiche personne (`people/`), + l'agrégat `insights.md`.
- **`/research`** sort dans `research/` par défaut (+ `competitors/`, `community/`).
- **`/support`** inchangé (dossier `support/` conservé) — renvois alignés.
- `/spec`, `/backlog`, `/status`, `/post`, `/article`, `/setup` : chemins et
  vocabulaire mis à jour.

### Ajouté
- **`MIGRATION.md`** — checklist de migration manuelle en 3 vagues (création
  structure → migration `git mv` → ajout au fil de l'eau). Pas de script auto.
- Templates `knowledge/people/_template.md` et `knowledge/conversations/_template.md`.

## 1.0.0 — 2026-06-08

Première version **versionnée** du kit (introduit la propagation propre).

### Ajouté
- **`/update` (14e skill)** — propage les améliorations du kit sur un repo déjà
  installé, par catégorie et selon des politiques de merge (jamais d'écrasement
  d'un fichier customisé). Clone automatiquement le kit (cache rafraîchi).
- **Versioning** : `KIT_VERSION`, ce `CHANGELOG.md`, et `kit-manifest.json`
  (politique de propagation par fichier — le kit se décrit lui-même).
- **`/backlog` (13e skill)** — pont Découverte→Build : promeut les motifs
  récurrents en items `backlog/<slug>.md` priorisés, lus par `/spec`.
- **Dashboard latest** — `/status` écrit `knowledge/dashboard.html` (vue vivante
  du dernier snapshot, HTML seul, gitignored).
- **`backlog-lint.py`** — garde-fou déterministe validant le frontmatter des
  items backlog (énumérations, champs requis, dates ISO, `specced`↔`feature`).
- **`/status` (12e skill)** — snapshot HTML responsive 360° du projet.
- **Jumeau HTML** — hook `md-to-html.py` (`PostToolUse`) : tout `.md` livrable
  obtient un `.html` jumeau. Scopé aux repos workflow (sûr en hook global).
- **`/code` — 2 portes de validation** (PLAN + ARCHITECTURE) + grille SOLID/GRASP.
- **`preflight-guard.py`** — garde-fou déterministe : bloque les skills du kit
  sur un repo où le workflow n'est pas installé.

### Câblé
- `research` / `feedback` / `support` déposent des items backlog quand un motif
  est récurrent ; `/spec` consomme l'item et le marque `specced` ; `/status`
  agrège backlog + dashboard.
