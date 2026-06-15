# Changelog — ai-founder-workflow

Versions du **kit** (skills, hooks, doctrine). Le skill `/update` lit ce fichier
pour afficher ce qui change entre la version installée sur un repo
(`.claude/.kit-version`) et la version du kit clonée.

Format : [SemVer](https://semver.org/lang/fr/). `MAJEUR` = changement de
structure imposant une migration manuelle ; `MINEUR` = nouveau skill / hook /
capacité rétro-compatible ; `CORRECTIF` = corrections sans nouvelle surface.

## 2.0.0 — 2026-06-12

### Modifié
- **`knowledge/content/` → `knowledge/brand/`** — le dossier marque & positionnement
  (brand-book, marketing-context, structure de landing, pitch-kit, assets) change de
  nom : `knowledge/content/` entrait en collision avec `content/` racine (axe
  audience) — deux significations de « content » dans le même repo, piège permanent
  pour les agents. Touche les skills `/post`, `/article`, `/report`, `/setup` et le
  README.

### Migration (repos déjà installés)
- `git mv knowledge/content knowledge/brand` puis mettre à jour les références
  locales (READMEs, strategy, CLAUDE.md…). Fait sur `org-lookup` le 2026-06-12
  (commit `ff20a7d`).

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
