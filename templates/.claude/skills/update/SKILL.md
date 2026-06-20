---
name: update
description: Met à jour le workflow ai-founder-workflow installé sur le repo courant depuis le kit — clone automatiquement le kit (cache rafraîchi), calcule le delta via le changelog, et propage par catégorie selon kit-manifest.json (écrase le kit-owned, préserve les fichiers customisés, crée les scaffolds manquants). Branche dédiée, commits par catégorie, jamais de push.
disable-model-invocation: true
---
Tu démarres une session UPDATE : propager les améliorations du kit ai-founder-workflow sur ce repo **proprement**, sans écraser ce qui est customisé. Référence : `docs/WORKFLOW.md` § Propagation.

Principe : le kit évolue souvent (nouveaux skills, hooks, doctrine). Plutôt que de copier à la main, tu **clones le kit à jour** et tu appliques `kit-manifest.json` — qui décrit, **par fichier**, comment propager (`overwrite` / `overwrite-confirm` / `merge-preserve` / `register` / `append` / `create-if-missing` / `suggest-only`). Tu ne décides pas les politiques : elles sont dans le manifest. Tu orchestres + tu tranches les cas de jugement (conflits doctrine, suggestions `CLAUDE.md`).

**Pre-flight obligatoire — STOP avant toute autre action.**

Avant d'exécuter ce skill, vérifie que `docs/WORKFLOW.md` existe à la racine du repo courant (`Read docs/WORKFLOW.md`).

- **Si absent** → le workflow n'est PAS installé sur ce repo : c'est `/setup`, pas `/update` (on ne *met à jour* que ce qui existe). Réponds exactement :
  > « Je ne peux pas mettre à jour : le workflow ai-founder-workflow n'est pas installé sur ce repo (pas de `docs/WORKFLOW.md`). C'est `/setup` qu'il te faut pour une première installation. Veux-tu lancer `/setup` maintenant ? »

  Puis `AskUserQuestion` : **Oui, lance `/setup`** → invoque `/setup` puis STOP ton flux ; **Non, arrête ici** → STOP.
- **Si présent** → poursuis.

---

## Pipeline

1. Rappelle à l'utilisateur de nommer cette session `update` (via `/rename`). *(Rappel — tu ne renommes pas toi-même.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `update` — une seule branche, reprise à chaque mise à jour. `git status` clean (commit/stash sinon — **stoppe** si pas clair) ; si sur `main` → `git checkout -b update`, sinon → `git checkout update`. **Stage par chemin explicite uniquement** — jamais `git add -A`.

2. **Récupère le kit à jour (clone automatique, cache rafraîchi)** :
   - **URL** = `$AI_FOUNDER_WORKFLOW_KIT_URL` si défini, sinon `https://github.com/lgrante/ai-founder-workflow.git`.
   - **Cache** = `${XDG_CACHE_HOME:-$HOME/.cache}/ai-founder-workflow/kit`.
   - Si le cache existe et est un repo git de la bonne origine → rafraîchis : `git -C <cache> fetch --depth 1 origin HEAD` puis `git -C <cache> reset --hard FETCH_HEAD`.
   - Sinon → clone : `git clone --depth 1 <url> <cache>` (crée le dossier parent au besoin).
   - **Gère l'échec proprement, sans rien modifier dans le repo** : pas de réseau → message clair + abandon ; échec SSH (URL `git@…`) → propose la variante HTTPS et re-essaie ; URL custom invalide → demande l'URL.
   - Lis `<cache>/KIT_VERSION` (= version cible) et `<cache>/kit-manifest.json` (= politiques). Si l'un manque → le kit cloné est trop ancien (pré-versioning) : signale-le, propose de continuer en mode best-effort (sync kit-owned + scaffolds) ou d'abandonner.

3. **Calcule le delta** :
   - **Version installée** = contenu de `.claude/.kit-version` du repo (un numéro). Absent → `0.0.0` (jamais mis à jour / installé avant le versioning).
   - **Version cible** = `<cache>/KIT_VERSION`.
   - Si installée == cible → **STOP** : « Déjà à jour (kit `<v>`). Rien à propager. » (sauf si l'utilisateur passe `--force` dans `$ARGUMENTS` pour re-synchroniser quand même).
   - Sinon, affiche les entrées de `<cache>/CHANGELOG.md` entre installée et cible (ce que cette mise à jour apporte).

4. **Détecte le mode d'installation** du repo (cf. § Propagation, hybride global/per-repo) :
   - **Per-repo** : `.claude/skills/` du repo contient des SKILL.md → les skills/hooks sont vendored ici.
   - **Global** : pas (ou peu) de skills dans `.claude/skills/` du repo → ils sont résolus depuis `~/.claude/skills/`.
   - En **mode global**, les entrées `scope: per-repo-only` du manifest (skills, hooks kit-owned) **ne sont pas** resynchronisées per-repo : à la place, **propose** à l'utilisateur de lancer `bash <cache>/install.sh --global` (une commande, propage skills + hooks globaux à TOUS les repos). Tu gères quand même per-repo le **résidu local** : doctrine, scaffold, `.gitignore`, settings.json, marqueur.

5. **Plan par catégorie** : parcours `kit-manifest.json`, et pour chaque entrée applicable au mode détecté, calcule l'action réelle (diff kit↔repo : *ajout* / *mise à jour* / *inchangé*). Présente un **plan groupé par politique** (ex. « 3 skills à mettre à jour, 1 nouveau (`/backlog`) ; hook `md-to-html.py` à mettre à jour + à enregistrer ; 1 dossier scaffold à créer (`backlog/`) ; 2 lignes `.gitignore` ; 4 ajouts suggérés à `CLAUDE.md` »). **Autorisation par batch** (un OK = un groupe), comme `/setup`.

6. **Applique, politique par politique** (chaque fichier vient de `<cache>/`) :
   - **`overwrite`** (kit-owned : skills, hooks `preflight-guard.py`/`md-to-html.py`/`backlog-lint.py`/`register-hook.py`, `statusline.sh`, context-hooks, **output style `output-styles/founder.md`**) → copie kit→repo. Ne **supprime jamais** un skill/hook présent dans le repo mais absent du kit (il peut être tiers) — signale-le seulement.
   - **`overwrite-confirm`** (`docs/WORKFLOW.md`) → si le contenu diffère, **montre le diff** et demande l'OK ; si l'utilisateur a des éditions locales qu'il veut garder, propose un merge à la main plutôt qu'un écrasement.
   - **`merge-preserve`** (`test-gate.sh`, clé `preserve: [TEST_CMD]`) → **préserve la ligne `TEST_CMD`** du repo ; ne mets à jour le reste que s'il a changé, et seulement après diff + OK.
   - **`register`** (`hooks_registration`) → pour chaque hook, assure son enregistrement dans `.claude/settings.json` via `python3 <cache>/templates/.claude/hooks/register-hook.py` (idempotent, backup auto, préserve les hooks existants). Inclut désormais `SessionStart` (bandeau de reprise, 3 matchers) et `PreCompact` (filet handoff, 2 matchers). En mode global, enregistre plutôt dans `~/.claude/settings.json` (ou laisse `install.sh --global` le faire).
   - **`settings_defaults`** (clés top-level non-hook) → pour chaque entrée (hors `_comment`), `python3 <cache>/templates/.claude/hooks/register-hook.py --ensure-setting .claude/settings.json <clé> <valeur>` : **set-if-absent**, n'écrase jamais un choix utilisateur (ex. `outputStyle: founder` — laissé tel quel si le repo a déjà choisi un autre style). En mode global, vise `~/.claude/settings.json`.
   - **`append`** (`.gitignore`, clé `gitignore_lines`) → ajoute uniquement les lignes manquantes (compare ligne à ligne).
   - **`create-if-missing`** (`scaffold/**`) → crée les dossiers/gabarits absents (`backlog/`, `backlog/_template.md`, etc.). **Ne touche jamais** un fichier existant (items, notes, drafts).
   - **`suggest-only`** (`CLAUDE.md`) → **n'écrase jamais**. Compare la version kit à celle du repo, dresse la liste des **ajouts** pertinents (nouvelles commandes comme `/backlog` `/update`, nouvelles lignes d'étiquette git, mentions dashboard) et **applique chirurgicalement** chaque ajout après OK. Laisse le contenu repo-spécifique (Projet, Commandes/TEST_CMD, Conventions) intact.

7. **Marqueur de version** : écris `.claude/.kit-version` = version cible (stamp). C'est ce que `/update` relira la prochaine fois pour le delta.

8. **Smoke-test** : `echo '{}' | .claude/hooks/test-gate.sh ; echo exit=$?` (vert ou JSON block parsable) ; `echo '{"prompt":"/spec foo"}' | .claude/hooks/preflight-guard.py` (silencieux si installé). Vérifie `chmod +x` sur les hooks copiés.

9. **Commits par catégorie, pas de push** : stage par chemin explicite, un commit par groupe cohérent (`chore(update): skills → kit X.Y.Z`, `chore(update): hooks + enregistrement`, `chore(update): scaffold + gitignore`, `docs(update): WORKFLOW + suggestions CLAUDE`). **Aucun push automatique** — l'utilisateur merge quand il veut.

10. **Stop** : rapport final — version `<avant>` → `<après>`, ce qui a été ajouté/mis à jour/inchangé, et **ce qui demande une attention manuelle** (éditions `CLAUDE.md` non triviales, conflit `WORKFLOW.md` décliné, skills tiers détectés). En mode global, rappelle la commande `install.sh --global` si elle reste à lancer.

## Cas limites

- **Déjà à jour** : STOP propre, rien à faire (sauf `--force`).
- **Repo non installé** : redirige vers `/setup` (pre-flight).
- **Pas de réseau / clone impossible** : abandonne **avant** toute modification du repo, message clair. Le repo reste intact.
- **SSH refusé** sur l'URL par défaut : bascule sur HTTPS (lecture seule, pas d'auth pour un repo public) et re-essaie.
- **Kit cloné pré-versioning** (pas de `KIT_VERSION`/`kit-manifest.json`) : best-effort (kit-owned + scaffold), signale la limite.
- **`WORKFLOW.md` édité localement** : ne l'écrase pas en silence — diff + choix (écraser / garder / merger).
- **Skill ou hook tiers** dans le repo (absent du kit) : **laisse-le tranquille**, ne supprime jamais ce que le kit ne connaît pas.
- **`test-gate.sh` divergent** : préserve `TEST_CMD` coûte que coûte ; en cas de doute, ne touche pas et signale.
- **Mode ambigu** (quelques skills per-repo + reliance globale) : demande à l'utilisateur quel mode il veut pour ce repo.

## À éviter

- **Écraser un fichier customisé** (`CLAUDE.md`, `test-gate.sh`/TEST_CMD) — politiques `suggest-only` / `merge-preserve` obligatoires.
- **Supprimer un skill/hook que le kit ne fournit pas** — il peut être tiers.
- **`git add -A`** — stage par chemin explicite (multi-agents).
- **Pousser quoi que ce soit** — aucun push, jamais (geste humain).
- **Modifier le repo avant d'avoir réussi le clone** — si la récupération du kit échoue, le repo reste intact.
- **Écrire dans le cache du kit comme s'il était le repo** — le cache est une **source en lecture** ; tu écris dans le repo courant.
- **Charger tout le kit cloné dans le contexte** — lis le manifest + les fichiers ciblés, pas l'arbre entier.

Sortie = le repo synchronisé sur la version cible du kit (`.claude/.kit-version` à jour), commits par catégorie sur la branche `update`, prêt à merger.

<!-- Exemple d'usage :
  /update
  → branche update
  → clone https://github.com/lgrante/ai-founder-workflow.git → ~/.cache/ai-founder-workflow/kit (KIT_VERSION=1.0.0)
  → installée = 0.0.0 (pas de .claude/.kit-version) → affiche le changelog jusqu'à 1.0.0
  → mode = per-repo (.claude/skills/ rempli)
  → plan : +1 skill (/backlog, /update), 4 skills maj, hook md-to-html.py maj + scope, +backlog-lint.py (+register), scaffold backlog/ créé, +1 ligne gitignore (knowledge/dashboard.html), 3 ajouts suggérés à CLAUDE.md
  → OK par batch → applique → .claude/.kit-version=1.0.0
  → commits : chore(update): skills · hooks+register · scaffold+gitignore · docs(update): WORKFLOW+CLAUDE
  → "Mis à jour 0.0.0 → 1.0.0. À relire : 1 ajout CLAUDE.md non trivial. Pas de push."

  /update   (déjà en 1.0.0)
  → "Déjà à jour (kit 1.0.0). Rien à propager."  (STOP) -->
