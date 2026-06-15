---
name: article
description: Démarre une session article-<sujet> — écrit un long form pour le blog, range dans content/blog/wip/ puis published/.
disable-model-invocation: true
---
Tu démarres une session de rédaction d'article long pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de l'**AUDIENCE** — long form (blog, content marketing). Plus profond qu'un post réseau social, plus lent à produire, plus durable.

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

1. Rappelle à l'utilisateur de nommer cette session `article-<slug>` (via `/rename`).

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `article/$ARGUMENTS` — une branche par article, vit du wip au published. `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b article/$ARGUMENTS`, sinon → `git checkout article/$ARGUMENTS` (reprise si itération). **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. Charge le contexte :
   - `knowledge/insights.md` (les pain points / motifs)
   - `knowledge/brand/brand-book.md` ou équivalent
   - `knowledge/market/` (concurrents, sources, SEO)
   - `content/blog/published/` récents (cohérence éditoriale et SEO interne)
   - **`content/blog/insights/` — le dernier rapport `/report blog`** s'il existe : tu y trouves les motifs (angle qui convertit, longueur optimale, SEO qui ranke, sujets qui n'ont pas pris). Cite-le dans tes choix de plan.
3. **En plan mode**, propose à l'utilisateur :
   - **L'angle** (problème → solution / explainer / cas d'usage / interview / contre-point / etc.)
   - **Le plan détaillé** (sections + idées clés par section + sources)
   - **La longueur cible** (~1500-2500 mots typiquement)
   - **Les keywords SEO** si applicable (à pourcer dans le frontmatter)
   - **Les visuels** (hero image, diagrammes, captures) — décide ici si l'article devient un dossier (cf. 6).
4. **Fais valider le plan AVANT de rédiger.** Pas une ligne de prose avant que l'utilisateur ait OK le plan.
5. **Si une skill globale `marketing-skills:content-production` ou équivalent existe**, invoque-la pour la rédaction. Sinon, rédige toi-même via un subagent pour préserver ton contexte principal.
6. **Décide la structure de stockage** :
   - **Article text-only** → fichier plat : `content/blog/wip/<YYYY-MM-DD>-<slug>.md`.
   - **Article avec assets** (hero, diagrammes, captures) → dossier dédié : `content/blog/wip/<YYYY-MM-DD>-<slug>/` contenant `post.md` + tous les assets. Garde l'article et ses visuels ensemble.
   Frontmatter : `title`, `slug`, `date`, `status: wip`, `keywords`, `summary`, `target_words`, `has_assets`.
7. **Images / diagrammes (optionnel)** : si le skill `nano-banana` est installé globalement (il fournit `/generate`, `/diagram`, `/icon`) :
   - Pour un hero : `/generate "<prompt descriptif>"`.
   - Pour un diagramme technique : `/diagram "<description>"`.
   - L'output atterrit dans `./nanobanana-output/` du cwd — déplace-le dans le dossier de l'article (`mv ./nanobanana-output/<file>.png content/blog/wip/<slug>/hero.png`).
   - Si nano-banana n'est pas dispo : skip, mentionne dans `notes:` du frontmatter ce qui serait pertinent (l'utilisateur fournira ou installera plus tard).
8. Itère avec l'utilisateur : feedback section par section ou globalement, à son choix.
9. **À la validation finale** : déplace dans `content/blog/published/<YYYY-MM-DD>-<slug>.md` (ou dossier, si assets) et marque `status: published` dans le frontmatter.

Cas limites :
- **Article trop ambitieux** (multi-sujets, > 4000 mots projetés) : propose de scinder en série de posts ou plusieurs articles distincts.
- **Pas de rapport `/report blog`** : tu rédiges sans data sur ce qui marche — pas bloquant, mais propose `/report blog` plus tard pour itérer.
- **Pas de skill marketing globale** : rédige via subagent pour préserver le contexte ; cite la stratégie de rédaction en début de plan.
- **Sujet déjà couvert** dans `published/` : propose un angle nouveau (mise à jour, contre-point, approfondissement) plutôt que duplication.
- **nano-banana échoue** : signale, n'invente pas une image, propose visuel manuel.

À éviter :
- Rédiger sans plan validé.
- Confondre avec `/post` (court vs long).
- Inventer des stats ou citations — toute affirmation forte doit être sourcée (lien + date).
- Écrire dans un ton incohérent avec le brand book — relis-le avant.
- **Séparer l'article de ses assets** — utilise le dossier dédié quand il y a un hero/diagramme.

Sortie = `content/blog/wip/<date>-<slug>.md` (flat) OU `content/blog/wip/<date>-<slug>/{post.md, <assets>}` (folder), puis `published/` après validation.

<!-- Exemple d'usage :
  /article inherited-org-monitoring-vs-shield
  → plan mode : angle = "vs Salesforce Shield" + 5 sections + 7 keywords → valide
  → invoque marketing-skills:content-production (subagent)
  → écrit content/blog/wip/2026-06-03-inherited-org-monitoring-vs-shield.md
  → itère par sections → publié → déplace dans published/ -->
