---
name: status
description: Démarre une session status-<date> — agrège l'état du projet à 360° (build / discovery / audience / activity / architecture) et génère un rapport HTML responsive (mobile-first). Sortie par défaut dans `.cc-scratch/status/` (privé, PII OK) ; option `--public` anonymise et publie dans `docs/status/` (consultable via GitHub Pages depuis mobile).
disable-model-invocation: true
---
Tu démarres une session STATUS sur l'état actuel du projet. Référence : `docs/WORKFLOW.md`.

C'est une session d'**état des lieux transverse** — un snapshot 360° lisible en 2 minutes depuis un mobile : où en est le build, qu'est-ce qui ressort de la discovery, qu'est-ce qui marche côté audience, quelle activité récente, et l'architecture telle que documentée. **Tu n'écris pas de contenu nouveau** : tu agrèges ce qui existe.

**Pre-flight obligatoire — STOP avant toute autre action.**

Avant d'exécuter ce skill, vérifie que `docs/WORKFLOW.md` existe à la racine du repo courant (`Read docs/WORKFLOW.md`).

- **Si absent** → le workflow ai-founder-workflow n'est pas installé sur ce repo. Tu ne peux PAS exécuter ce skill. Réponds exactement :
  > « Je ne peux pas exécuter cette commande : le workflow ai-founder-workflow n'est pas installé sur ce repo (pas de `docs/WORKFLOW.md` trouvé). Veux-tu lancer `/setup` maintenant ? »

  Puis `AskUserQuestion` avec deux options :
  - **Oui, lance `/setup`** → invoque le skill `/setup` puis **STOP ton propre flux** (aucune étape ci-dessous).
  - **Non, arrête ici** → réponds « Compris, je m'arrête. Relance la commande quand le workflow sera installé. » et **STOP immédiatement**.

  Cf. `docs/WORKFLOW.md` § Pre-flight pour la doctrine complète.
- **Si présent** → poursuis avec la pipeline ci-dessous.

---

## Pipeline

1. Rappelle à l'utilisateur de nommer cette session `status-<YYYY-MM-DD>` (via `/rename`). *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `status/<YYYY-MM-DD>` (date du jour) — un snapshot = une branche datée. `git status` clean (commit/stash sinon) ; `git checkout -b status/<YYYY-MM-DD>` depuis `main`. **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. **Parse les flags depuis `$ARGUMENTS`** :
   - `--since=<date>` ou `--since=<N>d` → fenêtre temporelle (default : `7 days ago`).
   - `--public` → mode publiable (anonymisation + sortie dans `docs/status/`).
   - Sans flags → mode privé, fenêtre 7 jours.

3. **Délègue l'aggrégation à un subagent** (OBLIGATOIRE — sinon ton contexte explose avec 50+ fichiers). Le subagent reçoit le mode, la fenêtre, le chemin du repo, et collecte :

   - **Build** :
     - `features/<slug>/README.md` (statut) + `features/<slug>/PLAN.md` (cases cochées vs restantes) pour chaque feature active à la racine de `features/`. Compte les sub-features actives.
     - `bugs/<slug>/TICKET.md` : tickets dont le frontmatter `statut` est `open` ou `in-progress` (skip `fixed-pending-test` et `closed`).
     - **Backlog** (le pont Découverte→Build) : `backlog/*.md` (skip `_template.md`). Compte par `statut` (`idea` / `triaged` / `specced` / `dropped`) et liste le **top 3 des `triaged`** par `priorité` (titre + priorité + source). Ce sont les prochains candidats `/spec`.
     - Branches actives matchant `feat/*` et `fix/*` : `git branch -a | grep -E '(feat|fix)/' | head -20`.
     - Commits récents par branche dans la fenêtre.

   - **Discovery** :
     - `knowledge/insights.md` : 5 derniers signaux / motifs (sections datées récentes).
     - `knowledge/market/*.md` : titres + dates des notes dans la fenêtre.
     - `knowledge/crm/contacts/*.md` : contacts mis à jour dans la fenêtre (mtime fichier + sections datées). **PII gérée selon mode.**
     - `knowledge/support/insights.md` : motifs cross-clients récents.
     - `knowledge/support/clients/<client>.md` : statut des thèmes ouverts.

   - **Audience** :
     - Posts publiés dans la fenêtre : `content/<channel>/posted/` (modifiés / créés depuis date), par channel.
     - Articles publiés : `content/blog/published/`.
     - Newsletter envoyées : `content/newsletter/<edition>.md` avec frontmatter `status: posted`.
     - Latest `/report` insights : pour chaque channel, lit le rapport le plus récent dans `content/<channel>/insights/` et extrait les **3 recommandations prioritaires** + le format gagnant.

   - **Activity** :
     - `git log --since="<date>" --all --pretty=format:"%h|%an|%ad|%s" --date=short` (cap 30 entries).
     - Distribution par axe : compte commits par préfixe de branche (`feat/`, `fix/`, `research/`, etc.).

   - **Architecture** :
     - Lis `knowledge/architecture/*.md` si le dossier existe.
     - Sinon, lis `knowledge/architecture.md` ou `ARCHITECTURE.md` à la racine.
     - Sinon : note « Architecture non documentée dans `knowledge/` ». **N'invente pas**, ne lis pas le code applicatif.

   - **Stats globales (KPIs)** : nb features actives, nb bugs ouverts, nb items backlog `triaged` (prêts à spécifier), nb posts publiés (fenêtre), nb contacts actifs (fenêtre), nb commits (fenêtre).

   Le subagent rend une **synthèse structurée JSON** (pas le HTML), avec un objet par section, prête à templater. Pas de texte verbeux : des listes structurées.

4. **Mode `--public` → anonymisation par le subagent** :
   - Remplace les noms de contacts CRM (`<person>.md` → `Contact #1`, `Contact #2`, ordre stable par hash du slug).
   - Nettoie les verbatims : enlève les noms propres détectés (regex `^[A-Z][a-z]+$` mots isolés sur la liste noire des slugs CRM).
   - Garde les IDs publics (ex. `ACME-1234` ticket Jira).
   - Si un fichier de knowledge contient des données très sensibles (emails, téléphones), exclus-le entièrement du rapport public (signale-le en footer).

5. **Génère le HTML** à partir de la synthèse. **Template mobile-first**, contraintes obligatoires :
   - **Inline CSS** : aucun CDN externe pour les feuilles de style (le rapport doit s'afficher en avion, en file://, sur n'importe quel device offline). Fonts Google OK car cache navigateur + fallback system.
   - **Stack typo** : `Inter` (sans-serif) + `JetBrains Mono` (mono), via Google Fonts, avec fallback `system-ui, sans-serif` et `ui-monospace, monospace`.
   - **Responsive breakpoints** :
     - Mobile (< 600px) : sections empilées 1 col, cards pleine largeur, KPIs en 2 cols, font scaling réduit.
     - Tablet (600–1100px) : sections en 2 cols sur certaines (KPIs en 4 cols).
     - Desktop (> 1100px) : layout 12-col, max-width container 1180px.
   - **Dark theme** par défaut (cohérent avec LP). Variables CSS : `--bg`, `--bg-elev`, `--text`, `--text-soft`, `--text-muted`, `--border`, `--accent` (vert), `--blue`, `--purple`, `--pink`, `--yellow`. Palette des sections : Build = accent (vert), Discovery = blue, Audience = purple, Activity = yellow, Architecture = pink.
   - **Header** : titre du projet + date + window + 5 KPIs en chips. Animation fade-in au load.
   - **Sections empilées** dans l'ordre :
     1. **Build** : grid de cards features (statut, étapes restantes), liste bugs ouverts avec priorité visuelle, **panel Backlog** (compteurs par statut + top 3 `triaged` à spécifier, en chips priorité), mini-timeline commits.
     2. **Discovery** : insights récents (bullets), contacts (anonymisés si `--public`), themes support (avec compteur), market notes.
     3. **Audience** : posts publiés (cards avec date, channel, titre), top 3 recommandations du dernier `/report` par channel (panel coloré).
     4. **Activity** : timeline horodatée des commits, distribution par axe en barres.
     5. **Architecture** : contenu rendu en markdown formaté, ou note « non documentée ».
   - **Footer** : « généré le `<date>` par `/status`, mode `<privé|public>`, fenêtre `<N> jours` » + lien GitHub repo si commits visibles.
   - **A11y** : contrastes WCAG AA minimum, `aria-label` sur les chips KPI, focus visible.

6. **Écris le HTML + un jumeau `.md`** (convention dual md+html du repo) :
   - **Mode privé** (default) : `.cc-scratch/status/<YYYY-MM-DD>-status.html` + `.md`. `.cc-scratch/` est gitignored. **NE COMMIT PAS.**
   - **Mode `--public`** : `docs/status/<YYYY-MM-DD>-status.html` + `.md`. Crée `docs/status/.nojekyll` s'il n'existe pas (pour servir les fichiers à plat via Pages).

6 bis. **Dashboard "latest" — `knowledge/dashboard.html`** (à chaque run, quel que soit le mode) :
   - Écris (= écrase) `knowledge/dashboard.html` avec **le même HTML bespoke** que le snapshot que tu viens de générer — c'est le **pointeur vivant** vers le dernier état, ouvrable à chemin stable (`open knowledge/dashboard.html`), sans chercher la dernière date.
   - **HTML seul, jamais de `knowledge/dashboard.md`** : le hook `md-to-html` écraserait sinon ce HTML bespoke par un jumeau plat. Écrire le `.html` directement ne déclenche pas le hook (il n'agit que sur les `.md`).
   - `knowledge/dashboard.html` est **gitignored** (cf. `docs/WORKFLOW.md` § Dashboard latest) : artefact de travail local, peut contenir des PII en mode privé, et un fichier unique partagé que toutes les sessions réécrivent serait un aimant à conflits de merge. Le partage PII-safe reste `--public` → `docs/status/`. **Ne le commit pas.**
   - Ajoute un petit bandeau dans le HTML : « vue *latest* — régénérée à chaque `/status` (mode `<privé|public>`, le `<date>`) ».

7. **Mode `--public` → propose le commit + push** :
   - Stage par chemin explicite : `git add docs/status/<date>-status.html docs/status/<date>-status.md docs/status/.nojekyll`.
   - Annonce le commit (message suggéré : `docs(status): snapshot du <date>`).
   - **N'effectue pas le push automatique** — l'utilisateur valide explicitement. Une fois pushé sur main, le rapport est consultable mobile via `https://<user>.github.io/<repo>/status/<date>-status.html`.

8. **Stop** : ta session est finie. Donne à l'utilisateur le chemin d'ouverture :
   - Mode privé : `open .cc-scratch/status/<date>-status.html` (file://).
   - Mode public, après push : URL Pages mobile-friendly.

## Cas limites

- **Repo vide / quasi-vide** : génère un rapport minimal honnête (« rien de notable dans la fenêtre »), pas d'invention.
- **Fenêtre = 0 jour ou date future** : abandon avec message d'erreur clair.
- **Aucune doc d'architecture** (`knowledge/architecture/` absent, `ARCHITECTURE.md` absent) : section marquée « non documentée — ajoute des notes dans `knowledge/architecture/` pour les voir ici ».
- **Subagent dépasse 30 commits** : tronque la timeline aux 30 plus récents avec mention `(N autres non affichés)`.
- **Trop de features actives** (> 12) : groupe les anciennes (last commit > fenêtre) dans une section « features dormantes » pour ne pas noyer.
- **PII détectée en mode `--public`** : anonymise systématiquement. Si un fichier déclenche des doutes (emails, téléphones dans le contenu), exclus-le et signale-le en footer.

## À éviter

- **Inventer des chiffres** — si la donnée n'existe pas, dis-le. Toute valeur du rapport doit pointer vers un fichier source du repo.
- **Lire le code applicatif** — tu lis ce qui est documenté dans `knowledge/`, pas les fichiers source. L'architecture vient des notes humaines, pas de l'extraction de code.
- **Push automatique** — même en `--public`, le push reste un OK explicite séparé (cf. `docs/WORKFLOW.md` § Étiquette git, merge strategy).
- **PII en sortie publique** — aucun nom de contact réel ne sort dans `docs/status/`. Si tu as un doute, anonymise par défaut.
- **Charger le détail des fichiers dans ta session principale** — toujours déléguer au subagent qui rend une synthèse compacte. Ton job côté main est : valider la synthèse + écrire le HTML.

Sortie privée = `.cc-scratch/status/<date>-status.html` + `.md` (PII OK, jamais commitée).
Sortie publique = `docs/status/<date>-status.html` + `.md` (anonymisée, prête pour GitHub Pages).
Toujours = `knowledge/dashboard.html` (pointeur *latest*, HTML seul, gitignored — `open knowledge/dashboard.html` à tout moment).

<!-- Exemple d'usage :
  /status
  → branche status/2026-06-03 depuis main
  → fenêtre = 7j (default)
  → mode = privé (default)
  → subagent aggregate :
      Build : 3 features actives (checkout-flow, inherited-org, agentforce-mon), 2 bugs open
      Backlog : 6 items (3 idea, 2 triaged, 1 specced) — top triaged : export-async (P0), wallet-checkout (P1)
      Discovery : 5 contacts cette semaine, 3 thèmes support récurrents, 1 nouvelle note market
      Audience : 4 posts published, /report linkedin top reco = "format liste"
      Activity : 18 commits (12 feat/, 4 fix/, 2 docs)
      Architecture : "non documentée"
  → écrit .cc-scratch/status/2026-06-03-status.html + .md
  → écrit knowledge/dashboard.html (latest, gitignored) — le même HTML, à chemin stable
  → "Ouvre .cc-scratch/status/2026-06-03-status.html (ou knowledge/dashboard.html)"

  /status --public --since=14d
  → branche status/2026-06-03
  → fenêtre = 14j
  → mode public (anonymisation)
  → subagent + anonymisation (Contact #1, #2 ; verbatims nettoyés)
  → écrit docs/status/2026-06-03-status.html + .md + docs/status/.nojekyll
  → propose commit "docs(status): snapshot du 2026-06-03" + push → URL Pages -->
