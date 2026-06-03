---
name: article
description: Démarre une session article-<sujet> — écrit un long form pour le blog, range dans content/blog/wip/ puis published/.
disable-model-invocation: true
---
Tu démarres une session de rédaction d'article long pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de l'**AUDIENCE** — long form (blog, content marketing). Plus profond qu'un post réseau social, plus lent à produire, plus durable.

1. Rappelle à l'utilisateur de nommer cette session `article-<slug>` (via `/rename`).
2. Charge le contexte :
   - `knowledge/insights.md` (les pain points / motifs)
   - `knowledge/content/brand-book.md` ou équivalent
   - `knowledge/market/` (concurrents, sources, SEO)
   - `content/blog/published/` récents (cohérence éditoriale et SEO interne)
3. **En plan mode**, propose à l'utilisateur :
   - **L'angle** (problème → solution / explainer / cas d'usage / interview / contre-point / etc.)
   - **Le plan détaillé** (sections + idées clés par section + sources)
   - **La longueur cible** (~1500-2500 mots typiquement)
   - **Les keywords SEO** si applicable (à pourcer dans le frontmatter)
4. **Fais valider le plan AVANT de rédiger.** Pas une ligne de prose avant que l'utilisateur ait OK le plan.
5. **Si une skill globale `marketing-skills:content-production` ou équivalent existe**, invoque-la pour la rédaction. Sinon, rédige toi-même via un subagent pour préserver ton contexte principal.
6. Écris le draft dans `content/blog/wip/<YYYY-MM-DD>-<slug>.md` avec YAML frontmatter (`title`, `slug`, `date`, `status: wip`, `keywords`, `summary`, `target_words`).
7. Itère avec l'utilisateur : feedback section par section ou globalement, à son choix.
8. **À la validation finale** : déplace dans `content/blog/published/<YYYY-MM-DD>-<slug>.md` et marque `status: published` dans le frontmatter.

Cas limites :
- **Article trop ambitieux** (multi-sujets, > 4000 mots projetés) : propose de scinder en série de posts ou plusieurs articles distincts.
- **Pas de skill marketing globale** : rédige via subagent pour préserver le contexte ; cite la stratégie de rédaction en début de plan.
- **Sujet déjà couvert** dans `published/` : propose un angle nouveau (mise à jour, contre-point, approfondissement) plutôt que duplication.

À éviter :
- Rédiger sans plan validé.
- Confondre avec `/post` (court vs long).
- Inventer des stats ou citations — toute affirmation forte doit être sourcée (lien + date).
- Écrire dans un ton incohérent avec le brand book — relis-le avant.

Sortie = `content/blog/wip/<date>-<slug>.md`, puis `content/blog/published/<date>-<slug>.md` après validation.

<!-- Exemple d'usage :
  /article inherited-org-monitoring-vs-shield
  → plan mode : angle = "vs Salesforce Shield" + 5 sections + 7 keywords → valide
  → invoque marketing-skills:content-production (subagent)
  → écrit content/blog/wip/2026-06-03-inherited-org-monitoring-vs-shield.md
  → itère par sections → publié → déplace dans published/ -->
