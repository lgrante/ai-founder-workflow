---
name: newsletter
description: Démarre une session newsletter-<edition> — assemble une édition de newsletter depuis content/ + insights, range dans content/newsletter/.
disable-model-invocation: true
---
Tu démarres une session newsletter pour l'édition « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de l'**AUDIENCE** — assemblage périodique de ce qui a été produit / vécu / appris.

1. Rappelle à l'utilisateur de nommer cette session `newsletter-<edition>` (via `/rename`). Format edition libre : `2026-06`, `vol-12`, `q2-2026`, etc.

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `newsletter/$ARGUMENTS` — une branche par édition. `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b newsletter/$ARGUMENTS`, sinon → `git checkout newsletter/$ARGUMENTS` (reprise si itération). **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. Charge le contexte (matière première) :
   - `content/blog/published/` (articles récents depuis la dernière édition)
   - `content/linkedin/posted/` + `content/twitter-x/posted/` (posts marquants)
   - `knowledge/insights.md` (motifs récents, signaux marché)
   - `features/` (releases / features livrées si pertinent côté produit)
   - L'édition précédente dans `content/newsletter/` (cohérence éditoriale, anti-redite)
   - **`content/newsletter/insights/` — le dernier rapport `/report newsletter`** s'il existe : tu y trouves les patterns d'open rate, sections les plus cliquées, tonalité qui retient. Cite-le dans la structure proposée.
3. **Propose une structure à l'utilisateur** (édito + 2-4 sections selon l'édition) et **fais valider** avant d'écrire. Si l'édition a un visuel hero ou des images de section, décide à ce moment si le fichier devient un dossier (cf. 5).
4. **Si une skill globale** existe pour newsletters / internal-comms (ex. `marketing-skills:internal-comms`), invoque-la. Sinon, rédige toi-même via un subagent.
5. **Décide la structure de stockage** :
   - **Édition text-only** → fichier plat : `content/newsletter/<edition>.md`.
   - **Édition avec visuels** (hero, illustrations de section) → dossier dédié : `content/newsletter/<edition>/` contenant `edition.md` + assets. Garde tout ensemble.
   Frontmatter : `edition`, `date`, `status: wip`, `sections`, `has_assets`.
6. **Visuels (optionnel)** : si le skill `nano-banana` est installé globalement, propose `/generate` pour un hero d'édition ou des illustrations de section. Output dans `./nanobanana-output/`, déplace dans le dossier de l'édition. Si pas dispo, skip.
7. Itère section par section avec l'utilisateur.
8. **À la validation** : marque `status: posted` dans le frontmatter et garde le fichier (ou dossier) à sa place dans `content/newsletter/`. Pas de sous-dossier `posted/` — le statut + l'unicité chronologique de l'édition suffisent.

Cas limites :
- **Pas assez de matière depuis la dernière édition** : signale et propose de reporter, raccourcir, ou pivoter le contenu (édition "thématique" plutôt que "récap").
- **Pas de rapport `/report newsletter`** : tu rédiges sans data sur ce qui marche — pas bloquant, propose `/report newsletter` après quelques éditions.
- **Édition déjà existante** (`content/newsletter/<edition>.md` présent avec `status: posted`) : signale et demande si c'est une refonte (alors archive en `.bak`) ou erreur de slug.
- **Trop de matière** : sélectionne — la newsletter n'est pas un dump, c'est une curation.
- **nano-banana échoue** : signale, propose visuel manuel.

À éviter :
- Recycler intégralement un article récent (résumé + lien suffisent).
- Composer plus d'une newsletter par session (un fichier = une édition).
- Mélanger les ton — la newsletter a SA voix, plus personnelle que le blog.
- **Séparer l'édition de ses assets** — utilise le dossier dédié quand il y a un hero/visuel.

Sortie = `content/newsletter/<edition>.md` (flat) OU `content/newsletter/<edition>/{edition.md, <assets>}` (folder), avec frontmatter `status: posted` après validation.

<!-- Exemple d'usage :
  /newsletter 2026-06
  → charge content/blog/published/ (2 articles juin) + LinkedIn posts du mois
  → propose structure : édito + 1 article fort + 3 signaux marché + 1 update produit → valide
  → invoque marketing-skills:internal-comms (subagent)
  → écrit content/newsletter/2026-06.md → itère → marque status: posted -->
