---
name: code
description: Démarre une session code-<feature> — planifie puis implémente la feature étape par étape, avec un filet de tests rapides lancé par le hook.
disable-model-invocation: true
---
Tu démarres la phase CODE pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

Tu décides le **comment** et tu construis. Ta référence d'intention reste l'artefact d'entrée (SPEC pour une feature, TICKET pour un bug) ; ton journal d'avancement est `PLAN.md` (les cases cochées = le seul statut). Front et back d'une même feature vont dans **cette** session : ils partagent le contrat d'API.

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

1. Rappelle à l'utilisateur de nommer cette session `code-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*
2. **Détecte le mode + branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) :
   - Mode **bug** si `$ARGUMENTS` commence par `bugs/` (ex. `/code bugs/safari-cancel-crash`) → dossier d'artefact = `$ARGUMENTS/`. **Branche : `fix/<bug-slug>`** (slug = `$ARGUMENTS` après le préfixe `bugs/`).
   - Sinon mode **feature** → dossier d'artefact = `features/$ARGUMENTS/`. **Branche : `feat/$ARGUMENTS`** (partagée avec `spec-` et `test-` ; existe déjà si `spec-` t'a précédé).
   - `git status` clean obligatoire (commit/stash sinon) ; `git checkout -b <branch>` si sur `main`, OU `git checkout <branch>` si reprise. **Stage par chemin explicite uniquement** (jamais `git add -A` — multi-agents).
3. **Lis l'artefact d'entrée** :
   - Mode bug → `$ARGUMENTS/TICKET.md` (repro + comportement attendu + critère « ne se reproduit plus »). Cf. `docs/WORKFLOW.md` § Convention par-bug.
   - Mode feature → `features/$ARGUMENTS/SPEC.md` (description + critères C1, C2… + jalons).
   - Si absent ou trop flou pour planifier → **stoppe** et renvoie vers `/spec` (mode feature) ou vers la session qui a ouvert le ticket (mode bug).
4. En **plan mode**, explore le codebase (conventions, modules concernés, setup de test réel) **avant** d'écrire le plan. Puis écris `<dossier-artefact>/PLAN.md` :
   - étapes techniques ordonnées, fichiers touchés, dépendances entre étapes ;
   - **chaque étape rattachée à un ou plusieurs critères** de l'artefact (référence par numéro : « Étape 3 → C2 ») ;
   - en mode feature : regroupe les étapes par jalon. En mode bug : pas de jalon (le fix est sa propre tranche), mais distingue **fix** et **test de régression** comme deux étapes minimum.
   - **Fais valider le plan** avant d'implémenter. N'écris aucun code en plan mode.
5. Implémente **une étape à la fois** (front + back ensemble). À chaque étape :
   - écris le code de l'étape ;
   - délègue à un **subagent** l'écriture du **filet rapide** (unitaires + intégration rapide), dérivé des **critères de l'étape**, JAMAIS du code que tu viens d'écrire. Le subagent reçoit les critères, pas l'implémentation, sinon les tests ratifieraient les bugs. **Granularité** : étape simple → des unitaires suffisent ; étape qui câble deux modules ou tape une API → ajoute un test d'intégration rapide.
   - le `Stop` hook (`.claude/hooks/test-gate.sh`) lance ces tests et **bloque la fin du tour** tant que ce n'est pas vert. Lis `.cc-scratch/test-gate.last.txt` (la sortie des tests = la preuve), corrige la **cause**, relance toi-même ;
   - au vert : commit, coche l'étape dans `PLAN.md`, passe à la suivante.
6. **Compacte aux points verts** (`/compact`) : préserve l'état du PLAN, les fichiers touchés, les critères ; jette le bruit des échecs résolus. Geste humain — propose-le, ne l'impose pas.
7. **Disjoncteur** : après 2-3 échecs persistants sur une même étape, ARRÊTE et signale à l'utilisateur. Un rouge qui s'entête = signal que l'**artefact d'entrée** (SPEC ou TICKET) ou l'**approche** est en cause, pas qu'il faut s'acharner. (Le `Stop` hook s'auto-désactive après ~8 blocages ; ne compte pas dessus.)

Cas limites :
- **Hook rouge pour une raison hors étape** (env, dépendance manquante, test pré-existant cassé) : ne maquille pas le test ; corrige la cause réelle ou signale-le.
- **Tentation de modifier les tests pour passer au vert** : interdit si ça change l'intention. On corrige le code, pas la barre.
- **L'e2e du jalon n'est pas ton boulot** (mode feature) : à l'étape 3/7 la tranche n'est pas câblée de bout en bout — l'e2e serait forcément rouge. Le gate par étape est du **rapide/incrémental** uniquement.
- **Bug avec repro fragile** (mode bug) : si la repro du TICKET.md ne se déclenche pas chez toi, **ne devine pas le fix** — remonte à l'utilisateur (manque de contexte, env spécifique, version client). Un fix à l'aveugle qui passe les tests qu'on s'est inventés ratifie le silence du bug, pas sa disparition.

À éviter :
- Viser 100 % de couverture (tests fragiles, sans valeur) — vise « l'étape fait ce qu'elle doit faire ».
- Coder plusieurs étapes avant de tester ; sauter le commit au vert (on perd les points de reprise).
- Laisser le subagent lire le code avant d'écrire les tests.

<!-- Exemple d'usage (mode feature) :
  /code checkout-flow
  → lit features/checkout-flow/SPEC.md, plan mode → PLAN.md (étapes ↔ C1..C5), fait valider
  → Étape 1 (C1) : crée la commande → subagent écrit les unitaires depuis C1
    → hook rouge (stock non décrémenté) → lit .cc-scratch/test-gate.last.txt → corrige → vert → commit + coche
  Voir examples/checkout-flow/PLAN.md pour un plan complet.

  Exemple d'usage (mode bug) :
  /code bugs/safari-cancel-crash
  → lit bugs/safari-cancel-crash/TICKET.md (repro + C1 "ne se reproduit plus" + C2 "test de régression couvre")
  → plan mode → bugs/safari-cancel-crash/PLAN.md : Étape 1 (fix event handler) → C1, Étape 2 (test régression Playwright) → C2
  → Étape 1 : corrige le handler → subagent écrit l'unitaire depuis C1
    → hook vert → commit + coche
  → Étape 2 : ajoute le test régression à la suite existante → hook vert → commit + coche → ticket statut "closed". -->
