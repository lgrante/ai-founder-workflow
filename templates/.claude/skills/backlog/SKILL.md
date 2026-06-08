---
name: backlog
description: Démarre une session backlog — toilette le backlog produit (le pont Découverte→Build). Promeut les motifs récurrents de `knowledge/insights.md` + `knowledge/support/insights.md` en items `backlog/<slug>.md`, dédoublonne, priorise, et recommande le prochain `/spec`. Ne décide pas une feature seul, n'écrit pas de spec.
disable-model-invocation: true
---
Tu démarres une session BACKLOG. Référence : `docs/WORKFLOW.md`.

C'est le **pont entre la découverte et le build** — l'axe transverse qui transforme un *motif agrégé* (plusieurs signaux discovery convergents) en *candidat à spécifier*. La découverte (`knowledge/`) produit des signaux ; le build (`features/`) démarre à `SPEC.md`. Entre les deux, c'est **ici** : la file d'attente triée et priorisée des idées prêtes à devenir des features. Tu **groomes**, tu ne **construis** pas : tu n'écris **pas** de spec (ça, c'est `/spec`), tu ne codes pas, tu ne décides pas une feature seul (la priorité reste un arbitrage humain — tu proposes).

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

1. Rappelle à l'utilisateur de nommer cette session `backlog` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `backlog` — une seule branche, reprise à chaque toilettage (le backlog est continu, comme la découverte). `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b backlog`, sinon → `git checkout backlog`. **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. **Charge l'état courant** (délègue la lecture lourde à un subagent si > ~15 items ou agrégats volumineux — il rend une synthèse compacte, pas les fichiers bruts) :
   - **Items existants** : tous les `backlog/*.md` (skip `_template.md`). Pour chacun, lis le frontmatter (`titre`, `statut`, `priorité`, `source`, `maj`) et le problème en une ligne.
   - **Sources discovery** : `knowledge/insights.md` (agrégat global des 3 axes) et `knowledge/support/insights.md` (motifs cross-clients). Ce sont les **viviers** d'où promouvoir des items.
   - **Build en cours** : les `features/*/` actives (pour ne pas re-proposer un item déjà devenu une feature, et pour marquer `specced` ceux qui le sont devenus).

3. **Promotion (Découverte → backlog)** : repère dans les agrégats les **motifs forts** qui n'ont pas encore d'item backlog :
   - Critère de promotion = un **motif récurrent** (signal sur ≥ 2-3 sources/contacts/sessions, cf. doctrine « l'agrégat fait foi, pas un signal isolé »), pas une demande ponctuelle.
   - Pour chaque motif retenu, **propose** (n'impose pas) un item `backlog/<slug>.md` (cf. format ci-dessous). Cite la source (`knowledge/insights.md` § …, `knowledge/support/insights.md`, ticket Jira) — un item doit toujours pointer vers une preuve.
   - **Un bug net n'est pas un item backlog** : il va dans `bugs/<slug>/TICKET.md` et se fixe via `/code` (cf. `docs/WORKFLOW.md` § Convention par-bug). Le backlog, c'est de la **valeur produit à construire**, pas un défaut à réparer.

4. **Toilettage (grooming)** sur l'ensemble des items :
   - **Dédoublonne / fusionne** les items qui décrivent le même besoin (garde le plus étoffé, fusionne les signaux, archive l'autre en `dropped` avec un renvoi `[[slug-gardé]]`).
   - **Re-priorise** : propose une priorité (`P0`/`P1`/`P2`) par item, justifiée (force du signal × impact estimé × effort approximatif). La priorité est une **proposition** — fais-la valider, ne tranche pas seul.
   - **Périme** : un item `idea` sans renforcement de signal depuis longtemps, ou rendu caduc → propose `statut: dropped` avec la raison (jamais de suppression du fichier — l'historique des idées écartées est une information).
   - **Promeut en `triaged`** les items mûrs (signal clair + problème net + priorité validée) : prêts à passer en `/spec`.

5. **Réconcilie avec le build** : pour chaque item dont une feature existe déjà à la racine de `features/<slug>/SPEC.md`, passe-le en `statut: specced` et ajoute `feature: <slug>` dans le frontmatter (renvoi vers la feature). Le backlog reflète ainsi fidèlement ce qui est encore *à faire* vs *déjà parti en build*.

6. **Recommande le prochain pas** : présente le **top 1-3** des items `triaged` par priorité, et propose à l'utilisateur de lancer `/spec <slug>` sur le premier. **Tu n'écris pas la spec ici** — tu passes le relais. Si l'utilisateur dit oui, rappelle simplement la commande (`/spec <slug>`) ; `/spec` lira l'item et marquera `specced` en fin de course.

7. **Stop** : ta session est finie. Le relais durable est le dossier `backlog/` à jour (items créés/fusionnés/priorisés/marqués). Pas de spec, pas de code.

## Format d'un item (`backlog/<slug>.md`)

Le `.html` jumeau est généré automatiquement par le hook — n'écris/édite **que** le `.md`. Le frontmatter est **validé déterministiquement** à chaque écriture par `.claude/hooks/backlog-lint.py` (énumérations `statut`/`priorité`/`source`, champs requis, dates ISO, cohérence `specced`↔`feature`) : respecte le schéma ci-dessous, sinon le hook te renverra quoi corriger.

```markdown
---
titre: Wallet (Apple Pay / Google Pay) au checkout
statut: idea            # idea | triaged | specced | dropped
priorité: P1            # P0 (critique) | P1 (importante) | P2 (plus tard)
source: insights        # insights | support | feedback | research | manuel
créé: 2026-06-08
maj: 2026-06-08
# feature:              # rempli quand statut: specced → slug dans features/
---

# Wallet au checkout

## Problème
<le besoin/la friction, du point de vue utilisateur — pas la solution>

## Signal (preuve)
- 3 contacts sur 5 le citent (`knowledge/insights.md` § Friction paiement)
- 3 concurrents sur 4 le proposent (`knowledge/market/2026-06-02-paiement-mobile.md`)
- Pain point support récurrent (`knowledge/support/insights.md`)

## Impact estimé / hypothèse de valeur
<pourquoi ça compte, ordre de grandeur si connu — sinon dis-le>

## Notes
<effort approximatif, dépendances, questions ouvertes, [[autres-items]] liés>
```

## Cas limites

- **Backlog vide et agrégats vides** : rien à promouvoir — dis-le honnêtement, ne fabrique pas d'items. Le backlog se remplira quand la découverte aura accumulé des signaux.
- **Signal isolé (1 seul contact / 1 seul ticket)** : ne le promeus PAS en item. Laisse-le mûrir dans l'agrégat discovery — c'est la récurrence qui fait un item, pas une demande unique.
- **Item qui décrit en fait un bug** (défaut reproductible) → redirige vers `bugs/<slug>/TICKET.md`, pas un item backlog.
- **Doublon avec une feature déjà en cours** : ne crée pas l'item, marque l'existant `specced` (ou skip si déjà fait).
- **Trop d'items `idea` accumulés** (> ~30) : propose une passe de tri agressive (dropped pour les plus faibles) avant d'en promouvoir de nouveaux — un backlog qui ne se vide jamais ne sert à rien.
- **Désaccord sur la priorité** : c'est un arbitrage humain. Propose, argumente, mais laisse l'utilisateur trancher.

## À éviter

- **Écrire un `SPEC.md` ou décider d'une feature** — c'est `/spec`. Le backlog s'arrête à « voici l'item prêt et priorisé », il passe le relais.
- **Promouvoir un signal isolé** — un item = un motif agrégé (≥ 2-3 sources/sessions), jamais une demande ponctuelle.
- **Supprimer un item écarté** — `statut: dropped` + raison, jamais de delete (l'historique des « non » est une information).
- **Confondre item et bug** — valeur à construire (backlog) vs défaut à réparer (`bugs/`).
- **Trancher la priorité seul** — propose et argumente ; la décision reste humaine.
- **Charger les agrégats bruts volumineux dans ta session** — délègue au subagent qui rend une synthèse compacte.

Sortie = le dossier `backlog/` à jour (items `.md` créés / fusionnés / priorisés / marqués `triaged`/`specced`/`dropped`), le pont vers `/spec`.

<!-- Exemple d'usage :
  /backlog
  → branche backlog (reprise)
  → lit backlog/ (6 items) + knowledge/insights.md + knowledge/support/insights.md + features/ actives
  → promotion : "wallet au checkout" récurrent (3 contacts + 3 concurrents + support) → propose backlog/wallet-checkout.md (idea) → OK
  → grooming : fusionne "export-rapide" et "export-async" (même besoin) → garde export-async, drop export-rapide avec renvoi
  → priorise : wallet-checkout = P1, export-async = P0 (5 tickets support critiques) → utilisateur valide
  → réconcilie : "sso-saml" a déjà features/sso-saml/SPEC.md → passe l'item en specced + feature: sso-saml
  → recommande : top = export-async (P0, triaged) → "Lance /spec export-async ?" → OK → rappelle la commande
  → stop : backlog/ à jour, pas de spec écrite ici -->
