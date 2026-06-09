---
name: feedback
description: Démarre une session user-feedback-<qui> — échange daté avec une personne réelle (interne ou externe). Écrit la conversation dans knowledge/conversations/, met à jour la fiche knowledge/people/ et l'agrégat d'insights.
disable-model-invocation: true
---
Tu démarres une session USER FEEDBACK avec « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de la **découverte tournée vers l'intérieur** : une **personne précise** et concrète (pas le marché abstrait — ça, c'est `/research`). Découverte **continue**, **jamais rattachée à une feature**.

**Deux objets, deux fichiers** (un objet = un dossier, un acte = un fichier daté — cf. `docs/WORKFLOW.md` § Principe directeur découverte) :
- **`knowledge/people/<slug>.md`** — la **fiche personne**, *stable* et *évolutive* (interne comme externe : un utilisateur, un prospect, mais aussi ton boss ou un collègue). Elle s'enrichit dans le temps.
- **`knowledge/conversations/<date>-<slug>.md`** — un **fichier par échange daté** (call, DM, meeting, event). Il pointe vers la fiche personne. C'est lui qui capte le verbatim brut d'une fois donnée.

Cette séparation permet de suivre une **personne** dans le temps (sa fiche grossit) ET un **sujet** dans le temps (les conversations s'accumulent et sont citées par `knowledge/research/`).

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

2. Charge la fiche `knowledge/people/$ARGUMENTS.md` si elle existe (relis la **Synthèse** + l'historique des conversations liées pour ne pas répéter les questions déjà posées) ; sinon, propose de la créer depuis `knowledge/people/_template.md` (frontmatter `type: interne | externe`).
3. Aide à préparer / dérouler l'échange : pars de la section **Synthèse** (« Ce qu'on veut tester encore ») de la fiche. Cherche les **problèmes vécus** et les **faits** (« la dernière fois que… »), pas les souhaits de fonctionnalités hypothétiques. Note les **verbatims** marquants (mots exacts).
4. Après l'échange, écris / mets à jour **trois endroits** :
   - **La conversation datée** — un **nouveau** fichier `knowledge/conversations/<YYYY-MM-DD>-<slug>.md` depuis `knowledge/conversations/_template.md` (format 5 champs : Citation brute, Pain ressenti, Solution actuelle, Notes, Liens). Le frontmatter `personne:` pointe vers `people/<slug>.md`. **Un échange = un fichier daté** — on ne réécrit jamais une conversation passée. *(Si vous avez plusieurs échanges le même jour avec la même personne, suffixe le slug.)*
   - **La fiche personne** `knowledge/people/<slug>.md` : ajoute une ligne dans **Conversations** (lien vers le fichier daté), reporte les **verbatims marquants**, mets à jour la **Synthèse** (sait / flou / à tester) et le frontmatter `dernier_contact`.
   - **L'agrégat** `knowledge/insights.md` : ce que les personnes demandent / les frictions observées. Rattache le retour à un thème existant s'il y en a un (incrémente le signal) plutôt que d'empiler des lignes isolées.
5. Les idées de features émergent de l'**agrégat** (un motif sur plusieurs personnes / conversations), **pas** d'un seul échange.
6. **Pont vers le backlog** : si ce retour fait basculer un motif dans le **récurrent** (≥ ~3 contacts sur le même problème), tu peux proposer à l'utilisateur de déposer un item `backlog/<slug>.md` (cf. `docs/WORKFLOW.md` § Convention backlog). Sinon, laisse-le dans `insights.md` — c'est `/backlog` qui promouvra quand l'agrégat sera assez fort. Tu n'ouvres **jamais** de `/spec` ici.

Cas limites :
- **Demande de feature directe** (« il me faudrait un bouton X ») : note-la, mais creuse le **problème** derrière — c'est lui qui nourrira un bon spec.
- **Retour qui contredit un insight existant** : ne l'écrase pas ; ajoute le signal contraire et date-le — la tension est une information.
- **Personne nouvelle sans fiche** : crée la fiche `people/<slug>.md` d'abord, sinon la conversation pointe dans le vide et le verbatim se perd.
- **Personne interne** (boss, collègue) : même mécanique — fiche `people/` (`type: interne`) + conversation datée. L'équipe interne a enfin une place naturelle, plus d'éparpillement.

À éviter :
- Promettre une feature ou ouvrir un `spec-` ici : la découverte ne construit pas.
- Traiter un échange isolé comme une preuve : c'est l'agrégat qui fait foi.
- Confondre avec `/research` (marché abstrait). Ici = personnes réelles.

**Données personnelles** : `knowledge/people/` et `knowledge/conversations/` portent sur de vraies personnes — garde-les en **repo privé séparé** ou **gitignored**. Ne committe jamais de coordonnées dans un repo public.

<!-- Exemple d'usage :
  /feedback marie-dupont
  → charge knowledge/people/marie-dupont.md (testeuse, 2e échange) → relit la Synthèse
  → échange : elle abandonne au paiement quand sa carte est refusée et perd son panier
  → écrit knowledge/conversations/2026-06-08-marie-dupont-paiement.md (5 champs, personne: people/marie-dupont.md)
  → met à jour la fiche people/marie-dupont.md (ligne Conversations + verbatim + Synthèse + dernier_contact)
  → insights.md (« Friction : panier perdu sur refus paiement », 3e signal)
  → ce motif récurrent justifiera plus tard un /spec checkout-flow. -->
