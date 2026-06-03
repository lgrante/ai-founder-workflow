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
   - **`content/<channel>/insights/` — le dernier rapport `/report`** s'il existe : tu y trouves ce qui marche sur ce réseau (format gagnant, trade-offs, recommandations en cours). Cite-le explicitement dans tes choix éditoriaux (ex. « le rapport du 03/06 a recommandé liste numérotée → j'applique »). Si pas de rapport, signale-le et propose à l'utilisateur de lancer `/report <channel>` avant.
4. **Si une skill spécialisée existe** (ex. `marketing-skills:writing-linkedin-posts`, ou autre skill globale de copywriting), **invoque-la** pour la rédaction. Notre rôle est la **STRUCTURE** et le **WORKFLOW**, pas le copywriting.
5. **Décide la structure de stockage** :
   - **Post text-only** (pas d'image / asset) → un fichier plat : `content/<channel>/drafts/<YYYY-MM-DD>-<slug>.md`.
   - **Post avec image / asset** → un dossier dédié : `content/<channel>/drafts/<YYYY-MM-DD>-<slug>/` contenant `post.md` + les assets (`hero.png`, etc.). Garde le post et ses assets ensemble — un .md déplacé sans son image est cassé.
   - Tu peux convertir flat → dossier en cours de route si l'utilisateur ajoute une image plus tard (renomme `<slug>.md` → `<slug>/post.md`).
6. Écris le draft (au chemin choisi en 5) avec YAML frontmatter (`channel`, `slug`, `sujet`, `status: draft`, `created`, `has_assets: true|false`) + corps du post.
7. **Image (optionnel)** : si l'utilisateur veut une image ET que le skill `nano-banana` est installé globalement (cherche dans la liste des skills disponibles — il fournit `/generate`, `/icon`, `/diagram`, etc.), propose de l'invoquer :
   - Invoque `/generate "<prompt descriptif>"` (le skill nano-banana wrap le Gemini CLI + nanobanana extension, ~0,04 $/image, cf. README du kit § Compagnons optionnels).
   - L'output par défaut atterrit dans `./nanobanana-output/` du cwd. **Déplace-le** dans le dossier du post (ex. `mv ./nanobanana-output/<file>.png content/<channel>/drafts/<slug>/hero.png`).
   - Si nano-banana n'est pas dispo : skip silencieux, mentionne dans `notes:` du frontmatter qu'une image serait pertinente — l'utilisateur la fournira manuellement ou installera nano-banana plus tard.
8. Présente le draft à l'utilisateur. Itère selon ses retours — ne publie pas sans accord explicite.
9. **À la validation** : déplace dans `content/<channel>/scheduled/` (avec date prévue dans le frontmatter) OU `content/<channel>/posted/` (si publié immédiatement). L'utilisateur décide. Si le post est en dossier, déplace tout le dossier d'un coup.

Cas limites :
- **Pas de brand book** : signale-le et propose d'écrire un placeholder dans `knowledge/content/brand-book.md` avant de rédiger (sinon ton incohérent dans le temps).
- **Pas de rapport `/report`** : tu rédiges sans data sur ce qui marche — propose à l'utilisateur de lancer `/report <channel>` d'abord, mais ne le force pas (il peut être tôt dans la phase de publication).
- **Aucune skill marketing globale** dispo : rédige toi-même, mais délègue à un **subagent** pour ne pas saturer le contexte principal.
- **Channel non supporté** : demande à l'utilisateur, scaffold un nouveau dossier `content/<channel>/{drafts,scheduled,posted,stats,insights}/` si nécessaire.
- **Sujet déjà traité** dans `posted/` récent : signale et propose un angle différent (variation, suite, contre-pied).
- **nano-banana échoue** (auth Gemini, quota, modèle indispo) : signale, n'invente pas une image, propose à l'utilisateur de fournir une image manuelle.

À éviter :
- **Réinventer le copywriting** quand une skill spécialisée existe.
- **Publier sans validation explicite** de l'utilisateur.
- **Mélanger plusieurs sujets** dans un seul post (un post = une idée).
- Ouvrir une session `post-` avec un sujet vague — précise le pain ou l'angle d'abord.
- **Séparer le post de son image** (post.md à un endroit, image à un autre) — utilise le dossier dédié quand il y a un asset.

Sortie = `content/<channel>/drafts/<date>-<slug>.md` (flat) OU `content/<channel>/drafts/<date>-<slug>/{post.md, <assets>}` (folder), puis `scheduled/` ou `posted/` après validation.

<!-- Exemple d'usage :
  /post linkedin agentforce-monitoring-pain
  → charge knowledge/insights.md (3 contacts mentionnent le pain)
  → invoque marketing-skills:writing-linkedin-posts (subagent)
  → écrit content/linkedin/drafts/2026-06-03-agentforce-monitoring-pain.md
  → présente à l'utilisateur, itère 1-2 fois
  → déplace vers scheduled/ (publication prévue 2026-06-05) -->
