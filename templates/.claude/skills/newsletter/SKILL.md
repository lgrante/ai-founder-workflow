---
name: newsletter
description: Démarre une session newsletter-<edition> — assemble une édition de newsletter depuis content/ + insights, range dans content/newsletter/.
disable-model-invocation: true
---
Tu démarres une session newsletter pour l'édition « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de l'**AUDIENCE** — assemblage périodique de ce qui a été produit / vécu / appris.

1. Rappelle à l'utilisateur de nommer cette session `newsletter-<edition>` (via `/rename`). Format edition libre : `2026-06`, `vol-12`, `q2-2026`, etc.
2. Charge le contexte (matière première) :
   - `content/blog/published/` (articles récents depuis la dernière édition)
   - `content/linkedin/posted/` + `content/twitter-x/posted/` (posts marquants)
   - `knowledge/insights.md` (motifs récents, signaux marché)
   - `features/` (releases / features livrées si pertinent côté produit)
   - L'édition précédente dans `content/newsletter/` (cohérence éditoriale, anti-redite)
3. **Propose une structure à l'utilisateur** (édito + 2-4 sections selon l'édition) et **fais valider** avant d'écrire.
4. **Si une skill globale** existe pour newsletters / internal-comms (ex. `marketing-skills:internal-comms`), invoque-la. Sinon, rédige toi-même via un subagent.
5. Écris dans `content/newsletter/<edition>.md` avec YAML frontmatter (`edition`, `date`, `status: wip`, `sections`).
6. Itère section par section avec l'utilisateur.
7. **À la validation** : marque `status: posted` dans le frontmatter et garde le fichier dans `content/newsletter/` (pas de sous-dossier `posted/` ici — le statut suffit, les éditions sont chronologiquement uniques).

Cas limites :
- **Pas assez de matière depuis la dernière édition** : signale et propose de reporter, raccourcir, ou pivoter le contenu (édition "thématique" plutôt que "récap").
- **Édition déjà existante** (`content/newsletter/<edition>.md` présent avec `status: posted`) : signale et demande si c'est une refonte (alors archive en `.bak`) ou erreur de slug.
- **Trop de matière** : sélectionne — la newsletter n'est pas un dump, c'est une curation.

À éviter :
- Recycler intégralement un article récent (résumé + lien suffisent).
- Composer plus d'une newsletter par session (un fichier = une édition).
- Mélanger les ton — la newsletter a SA voix, plus personnelle que le blog.

Sortie = `content/newsletter/<edition>.md` (avec frontmatter `status: posted` après validation).

<!-- Exemple d'usage :
  /newsletter 2026-06
  → charge content/blog/published/ (2 articles juin) + LinkedIn posts du mois
  → propose structure : édito + 1 article fort + 3 signaux marché + 1 update produit → valide
  → invoque marketing-skills:internal-comms (subagent)
  → écrit content/newsletter/2026-06.md → itère → marque status: posted -->
