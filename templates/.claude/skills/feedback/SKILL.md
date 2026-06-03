---
name: feedback
description: Démarre une session user-feedback-<qui> — échange avec un utilisateur réel, met à jour sa fiche CRM et l'agrégat d'insights.
disable-model-invocation: true
---
Tu démarres une session USER FEEDBACK avec « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de la **découverte tournée vers l'intérieur** : une **personne précise** et concrète (pas le marché abstrait — ça, c'est `/research`). Découverte **continue**, **jamais rattachée à une feature**.

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

1. Rappelle à l'utilisateur de nommer cette session `user-feedback-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `feedback/$ARGUMENTS` — une branche par contact (reprise à chaque nouvel échange avec la même personne). `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b feedback/$ARGUMENTS`, sinon → `git checkout feedback/$ARGUMENTS`. **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. Charge la fiche `knowledge/crm/contacts/$ARGUMENTS.md` si elle existe (relis l'historique pour ne pas répéter les questions déjà posées) ; sinon, propose de la créer depuis `knowledge/crm/contacts/_template.md`.
3. Aide à préparer / dérouler l'échange : pars de « Ce que je veux apprendre de cette personne » dans la fiche. Cherche les **problèmes vécus** et les **faits** (« la dernière fois que… »), pas les souhaits de fonctionnalités hypothétiques. Note les **verbatims** marquants.
4. Après l'échange, mets à jour **deux endroits** :
   - la **fiche du contact** : contexte, besoin, historique des échanges (ligne datée), prochaine action ;
   - l'**agrégat** `knowledge/insights.md` : ce que les utilisateurs demandent / les frictions observées. Rattache le retour à un thème existant s'il y en a un (incrémente le signal) plutôt que d'empiler des lignes isolées.
5. Les idées de features émergent de l'**agrégat** (un motif sur plusieurs contacts), **pas** d'un seul échange.

Cas limites :
- **Demande de feature directe** (« il me faudrait un bouton X ») : note-la, mais creuse le **problème** derrière — c'est lui qui nourrira un bon spec.
- **Retour qui contredit un insight existant** : ne l'écrase pas ; ajoute le signal contraire et date-le — la tension est une information.
- **Contact nouveau sans fiche** : crée la fiche d'abord, sinon le verbatim se perd.

À éviter :
- Promettre une feature ou ouvrir un `spec-` ici : la découverte ne construit pas.
- Traiter un échange isolé comme une preuve : c'est l'agrégat qui fait foi.
- Confondre avec `/research` (marché abstrait). Ici = personnes réelles.

**Données personnelles** : ces fiches portent sur de vraies personnes — garde `knowledge/crm/` en **repo privé séparé** ou **gitignored**. Ne committe jamais de coordonnées dans un repo public.

<!-- Exemple d'usage :
  /feedback marie-dupont
  → charge knowledge/crm/contacts/marie-dupont.md (testeuse, 2e échange)
  → échange : elle abandonne au paiement quand sa carte est refusée et perd son panier
  → met à jour sa fiche (verbatim + prochaine action) + insights.md (« Friction : panier perdu sur refus paiement », 3e signal)
  → ce motif récurrent justifiera plus tard un /spec checkout-flow. -->
