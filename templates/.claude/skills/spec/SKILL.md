---
name: spec
description: Démarre une session spec-<feature> — écrit le SPEC (quoi + critères d'acceptation + jalons) d'une feature, sans coder.
disable-model-invocation: true
---
Tu démarres la phase SPEC de la feature « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

Tu décides le **quoi**, jamais le **comment**. La sortie est un artefact durable (`SPEC.md`) que `code-$ARGUMENTS` puis `test-$ARGUMENTS` liront. Ce que tu écris ici devient la **référence de tous les tests** — si un critère est flou, les tests seront flous.

1. Rappelle à l'utilisateur de nommer cette session `spec-$ARGUMENTS` (via `/rename`) si ce n'est pas déjà fait. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `feat/$ARGUMENTS` — branche partagée avec `code-` et `test-` de cette même feature. Vérifie `git status` clean (commit/stash sinon) ; si tu es sur `main` → `git checkout -b feat/$ARGUMENTS`, sinon → `git checkout feat/$ARGUMENTS` (reprise si déjà créée par une session antérieure). **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels sur le même checkout).

2. Reste en mode SPEC : tu n'écris **pas** de code, tu ne crées pas de plan technique (ça, c'est `code-`).
3. **Structure de la feature** — applique la convention standard (cf. `docs/WORKFLOW.md` § Convention par-feature) :
   - **Si `features/$ARGUMENTS/` n'existe pas** : scaffold la structure standard. Crée le dossier + `README.md` court (statut + liens) + `SPEC.md` (à remplir) + `SPEC.html` placeholder + les sous-dossiers vides `sub-features/ prototypes/ qa/ plans/ archives/`. C'est le contrat de structure que TOUTES les features du repo partagent.
   - **Si `features/$ARGUMENTS/SPEC.md` existe DÉJÀ** : lis-le d'abord. Demande à l'utilisateur si c'est une **itération sur la version active** (édition in-place) ou une **refonte majeure** (alors propose d'archiver la racine actuelle dans `features/$ARGUMENTS/archives/v{N}/` avant d'écrire la nouvelle SPEC à la racine). Ne tranche pas seul.
   - **Sub-feature** (composant atomique d'une feature existante) : range-la dans `features/<parent>/sub-features/$ARGUMENTS/` avec la même structure récursive (SPEC, PLAN, archives…).
4. Si pertinents, lis les sources de découverte qui alimentent le spec :
   - `knowledge/insights.md` (agrégat global des 3 axes discovery) et `knowledge/market/` (recherche marché)
   - `knowledge/support/insights.md` (motifs cross-clients depuis les tickets) — souvent les signaux les plus directs sur ce qui manque ou casse
   - `knowledge/support/clients/<client>.md` si la feature concerne un client spécifique nommé
   - Les `archives/v{N}/SPEC.md` éventuels pour avoir l'historique de la feature (utile pour ne pas réinventer ou contredire silencieusement).

   Cite la source d'une demande quand elle vient d'un retour utilisateur, d'un ticket support, ou d'une étude marché.
5. Produis / mets à jour `features/$ARGUMENTS/SPEC.md` avec :
   - une **description** courte : le problème, l'utilisateur visé, ce qui est explicitement **hors périmètre** ;
   - les **critères d'acceptation** = la définition de « fini ». Dérive-les AVANT le code. Chacun doit être **observable et vérifiable** sans connaître l'implémentation (formule-les en Étant donné / Quand / Alors). Numérote-les (C1, C2…) : `code-` rattachera ses étapes à ces numéros, `test-` en dérivera les e2e.
   - les **jalons** : les tranches user-facing successives, chacune livrable et démontrable. Chaque jalon = un point de contrôle e2e + un gate humain. Associe chaque critère à un jalon.
5. Interviewe l'utilisateur pour combler les flous, **une question à la fois**. Ne devine pas les critères : fais-les valider. Si une réponse ouvre une nouvelle zone d'ombre, creuse-la avant de continuer.

Cas limites :
- **Feature trop grosse** : si les jalons dépassent ~3-5 ou si les critères se comptent par dizaines, propose de scinder en plusieurs features (specs séparés).
- **Critère non testable** (« doit être rapide », « intuitif ») : reformule en seuil mesurable (« réponse < 300 ms au p95 », « parcours en ≤ 3 clics ») ou marque-le explicitement comme non vérifiable automatiquement (revue humaine).
- **Spec qui existe déjà** : relis-le, ne le réécris pas en entier ; amende les critères impactés et signale ce qui change.

À éviter :
- Décrire l'implémentation (« ajouter une table `orders` », « hook React ») — c'est le rôle de `PLAN.md`. Le critère dit *quoi*, pas *comment*.
- Des critères que seul le code permet de vérifier (ils ratifieraient l'implémentation au lieu de l'intention).
- Mélanger plusieurs exigences dans un même critère : un critère = une assertion.

Sortie = `features/$ARGUMENTS/SPEC.md`, l'artefact que `code-$ARGUMENTS` lira ensuite.

<!-- Exemple d'usage :
  /spec checkout-flow
  → rappelle de renommer la session « spec-checkout-flow »
  → lit knowledge/insights.md (les utilisateurs abandonnent au paiement)
  → écrit features/checkout-flow/SPEC.md :
      C1 (Étant donné un panier non vide, Quand je valide, Alors une commande est créée et le stock décrémenté)
      C2 (paiement refusé → message clair, panier conservé) …
      Jalon 1 : panier → commande (C1, C4) · Jalon 2 : paiement (C2, C3)
  Voir examples/checkout-flow/SPEC.md pour un spec complet. -->
