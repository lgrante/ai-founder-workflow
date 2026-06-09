# MIGRATION — structure `knowledge/` (v1 → v2)

> Checklist de migration **manuelle, par projet**. Pas de script automatique : chaque repo se migre à la main, à son rythme. Le kit `/update` n'y touche pas (il ajoute seulement les dossiers/templates manquants via `create-if-missing` ; il ne déplace **jamais** ton contenu).

## Pourquoi migrer

L'ancienne structure (`knowledge/market/`, `knowledge/crm/contacts/`, parfois `knowledge/feedback/`) mélange **trois axes de classement** dans les mêmes dossiers : par personne (qui), par conversation (quand), par sujet (quoi). On ne peut alors plus suivre ni un contact ni un sujet dans le temps, et l'équipe interne n'a pas de place naturelle.

La v2 range par **objet stable** : **un objet = un dossier, un acte = un fichier daté**. Cinq objets — `people/`, `conversations/`, `research/`, `competitors/`, `community/` — avec des relations explicites (une conversation pointe vers une personne ; un sujet de research cite des conversations). Détail : README du kit, § Principe directeur découverte.

## Mapping ancien → nouveau

| Ancien | Nouveau | Note |
|---|---|---|
| `knowledge/crm/contacts/<x>.md` | `knowledge/people/<x>.md` | fiche personne stable, évolutive |
| `knowledge/feedback/<x>.md` (si présent) | `knowledge/people/<x>.md` **+** `knowledge/conversations/<date>-<x>.md` | split fiche / échanges datés |
| `knowledge/market/<date>-<sujet>.md` | `knowledge/research/<date>-<sujet>.md` | note de sujet |
| `knowledge/market/competitor-*/` | `knowledge/competitors/<nom>/` | un dossier par concurrent |
| `knowledge/market/` (threads Reddit/Slack/Discord, veille) | `knowledge/community/<canal>.md` | canaux passifs |
| `knowledge/crm/contacts/_template.md` | absorbé dans `knowledge/people/_template.md` | l'ancien gabarit disparaît |

**Inchangés** (ne pas renommer) : `knowledge/support/`, `knowledge/content/`, `knowledge/insights.md`, `knowledge/strategy/`, `knowledge/demos/`, `knowledge/doc/`.

---

## Vague 1 — Créer la structure cible (sans rien déplacer)

But : poser les dossiers et templates vides. Réversible, zéro risque.

- [ ] `git checkout -b chore/knowledge-v2` (working tree clean d'abord).
- [ ] Créer les dossiers : `mkdir -p knowledge/people knowledge/conversations knowledge/research knowledge/competitors knowledge/community`
- [ ] Copier les templates depuis le kit (ou `/update` pour les récupérer) :
      `knowledge/people/_template.md` et `knowledge/conversations/_template.md` (format 5 champs).
- [ ] Vérifier la PII : `knowledge/people/` et `knowledge/conversations/` contiennent des données personnelles → s'assurer qu'ils sont **gitignored** ou dans un repo privé séparé (comme l'était `crm/`).
- [ ] Commit : `chore(knowledge): scaffold structure v2 (people/conversations/research/competitors/community)`.

## Vague 2 — Migrer le contenu existant (par `git mv`)

But : déplacer l'existant en préservant l'historique git. Une catégorie à la fois ; rien ne disparaît en silence.

**Personnes & conversations**
- [ ] `git mv knowledge/crm/contacts/<x>.md knowledge/people/<x>.md` pour chaque fiche contact.
- [ ] Pour chaque ancien `knowledge/feedback/<x>.md` (s'il existe) : extraire la **fiche stable** vers `people/<x>.md` et chaque **échange daté** vers `conversations/<date>-<x>.md` (frontmatter `personne: people/<x>.md`). Reporter les verbatims dans la fiche, mettre à jour `dernier_contact`.
- [ ] Supprimer `knowledge/crm/contacts/_template.md` (remplacé par `people/_template.md`).

**Recherche, concurrents, communauté** (le split de `market/`)
- [ ] Notes de sujet datées → `git mv knowledge/market/<date>-<sujet>.md knowledge/research/`.
- [ ] Dossiers concurrents → `git mv knowledge/market/competitor-<nom>/ knowledge/competitors/<nom>/`.
- [ ] Threads de veille (Reddit, Slack, Discord, groupes LinkedIn) → `knowledge/community/<canal>.md`.
- [ ] Snapshots historiques / positionnement daté → `knowledge/research/<date>-<slug>.md`.

**Nettoyage**
- [ ] Une fois `knowledge/crm/` et `knowledge/market/` **vides**, les supprimer (`git rm -r` des `.gitkeep` résiduels).
- [ ] Mettre à jour les liens internes (`../crm/...`, `../market/...`) dans les fichiers migrés.
- [ ] Commit par catégorie (`refactor(knowledge): crm→people`, `refactor(knowledge): market→research/competitors/community`).

## Vague 3 — Compléter au fil de l'eau

But : profiter de la nouvelle structure ; pas de big-bang.

- [ ] Créer les fiches `people/` manquantes — notamment l'**équipe interne** (boss, collègues) qui n'avait pas de place avant (`type: interne`).
- [ ] À chaque nouvel échange, laisser `/feedback` écrire la conversation datée + enrichir la fiche.
- [ ] À chaque recherche, laisser `/research` alimenter `research/` (et `competitors/` / `community/` selon le cas).
- [ ] Quand un sujet `research/` s'appuie sur des échanges, ajouter les liens vers les `conversations/` correspondantes.

---

## Garde-fous

- **`git mv` partout** — l'historique de chaque fichier est préservé.
- **Rien ne se supprime avant d'être vide** — on vide `crm/` et `market/` puis on retire les dossiers, jamais l'inverse.
- **PII d'abord** — vérifier le gitignore/repo séparé **avant** de committer des fiches `people/`/`conversations/`.
- **Pas de script** — la migration est un geste humain, projet par projet. Le kit ne migre jamais ton contenu automatiquement.
