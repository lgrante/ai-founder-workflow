---
name: post
description: Démarre une session post-<channel>-<sujet> — écrit un draft de post court pour un réseau social, range dans content/<channel>/drafts/.
disable-model-invocation: true
---
Tu démarres une session de rédaction de post court pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

Format attendu : `/post <channel> <sujet>` (channels supportés : `linkedin`, `twitter-x` — extensibles).

C'est de l'**AUDIENCE** — output produit pour les réseaux. La session est jetable ; l'artefact (le draft, puis la version publiée) est durable.

1. Parse `$ARGUMENTS` pour extraire `<channel>` et `<sujet>`. Si ambigu ou manquant, demande à l'utilisateur.
2. Rappelle à l'utilisateur de nommer cette session `post-<channel>-<slug>` (via `/rename`). *(Tu ne peux pas renommer toi-même — c'est un rappel.)*
3. Charge le contexte :
   - `knowledge/insights.md` (les pain points / verbatims / motifs récurrents)
   - `knowledge/content/brand-book.md` ou équivalent (tonalité, style, voice)
   - `knowledge/market/` (si le sujet est lié à un thème marché)
   - `content/<channel>/posted/` récents (éviter répétitions de format/sujet)
4. **Si une skill spécialisée existe** (ex. `marketing-skills:writing-linkedin-posts`, ou autre skill globale de copywriting), **invoque-la** pour la rédaction. Notre rôle est la **STRUCTURE** et le **WORKFLOW**, pas le copywriting.
5. Écris le draft dans `content/<channel>/drafts/<YYYY-MM-DD>-<slug>.md`. Format : YAML frontmatter (`channel`, `slug`, `sujet`, `status: draft`, `created`) + corps du post.
6. Présente le draft à l'utilisateur. Itère selon ses retours — ne publie pas sans accord explicite.
7. **À la validation** : déplace dans `content/<channel>/scheduled/` (avec une note de date prévue dans le frontmatter) OU `content/<channel>/posted/` (si publié immédiatement). L'utilisateur décide.

Cas limites :
- **Pas de brand book** : signale-le et propose d'écrire un placeholder dans `knowledge/content/brand-book.md` avant de rédiger (sinon ton incohérent dans le temps).
- **Aucune skill marketing globale** dispo : rédige toi-même, mais délègue à un **subagent** pour ne pas saturer le contexte principal.
- **Channel non supporté** : demande à l'utilisateur, scaffold un nouveau dossier `content/<channel>/{drafts,posted}/` si nécessaire.
- **Sujet déjà traité** dans `posted/` récent : signale et propose un angle différent (variation, suite, contre-pied).

À éviter :
- **Réinventer le copywriting** quand une skill spécialisée existe.
- **Publier sans validation explicite** de l'utilisateur.
- **Mélanger plusieurs sujets** dans un seul post (un post = une idée).
- Ouvrir une session `post-` avec un sujet vague — précise le pain ou l'angle d'abord.

Sortie = `content/<channel>/drafts/<date>-<slug>.md`, puis `scheduled/` ou `posted/` après validation.

<!-- Exemple d'usage :
  /post linkedin agentforce-monitoring-pain
  → charge knowledge/insights.md (3 contacts mentionnent le pain)
  → invoque marketing-skills:writing-linkedin-posts (subagent)
  → écrit content/linkedin/drafts/2026-06-03-agentforce-monitoring-pain.md
  → présente à l'utilisateur, itère 1-2 fois
  → déplace vers scheduled/ (publication prévue 2026-06-05) -->
