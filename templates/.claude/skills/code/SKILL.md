---
name: code
description: Démarre une session code-<feature> — planifie puis implémente la feature étape par étape, avec un filet de tests rapides lancé par le hook.
disable-model-invocation: true
---
Tu démarres la phase CODE de la feature « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

Tu décides le **comment** et tu construis. Ta référence d'intention reste le SPEC ; ton journal d'avancement est `PLAN.md` (les cases cochées = le seul statut). Front et back d'une même feature vont dans **cette** session : ils partagent le contrat d'API.

1. Rappelle à l'utilisateur de nommer cette session `code-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*
2. Lis `features/$ARGUMENTS/SPEC.md` (description + critères C1, C2… + jalons). Si le spec est absent ou trop flou pour planifier, **stoppe** et renvoie l'utilisateur vers `/spec`.
3. En **plan mode**, explore le codebase (conventions, modules concernés, setup de test réel) **avant** d'écrire le plan. Puis écris `features/$ARGUMENTS/PLAN.md` :
   - étapes techniques ordonnées, fichiers touchés, dépendances entre étapes ;
   - **chaque étape rattachée à un ou plusieurs critères** du spec (référence par numéro : « Étape 3 → C2 ») ;
   - regroupe les étapes par jalon.
   - **Fais valider le plan** avant d'implémenter. N'écris aucun code en plan mode.
4. Implémente **une étape à la fois** (front + back ensemble). À chaque étape :
   - écris le code de l'étape ;
   - délègue à un **subagent** l'écriture du **filet rapide** (unitaires + intégration rapide), dérivé des **critères de l'étape**, JAMAIS du code que tu viens d'écrire. Le subagent reçoit les critères, pas l'implémentation, sinon les tests ratifieraient les bugs. **Granularité** : étape simple → des unitaires suffisent ; étape qui câble deux modules ou tape une API → ajoute un test d'intégration rapide.
   - le `Stop` hook (`.claude/hooks/test-gate.sh`) lance ces tests et **bloque la fin du tour** tant que ce n'est pas vert. Lis `.cc-scratch/test-gate.last.txt` (la sortie des tests = la preuve), corrige la **cause**, relance toi-même ;
   - au vert : commit, coche l'étape dans `PLAN.md`, passe à la suivante.
5. **Compacte aux points verts** (`/compact`) : préserve l'état du PLAN, les fichiers touchés, les critères ; jette le bruit des échecs résolus. Geste humain — propose-le, ne l'impose pas.
6. **Disjoncteur** : après 2-3 échecs persistants sur une même étape, ARRÊTE et signale à l'utilisateur. Un rouge qui s'entête = signal que le **spec** ou l'**approche** est en cause, pas qu'il faut s'acharner. (Le `Stop` hook s'auto-désactive après ~8 blocages ; ne compte pas dessus.)

Cas limites :
- **Hook rouge pour une raison hors étape** (env, dépendance manquante, test pré-existant cassé) : ne maquille pas le test ; corrige la cause réelle ou signale-le.
- **Tentation de modifier les tests pour passer au vert** : interdit si ça change l'intention. On corrige le code, pas la barre.
- **L'e2e du jalon n'est pas ton boulot** : à l'étape 3/7 la tranche n'est pas câblée de bout en bout — l'e2e serait forcément rouge. Le gate par étape est du **rapide/incrémental** uniquement.

À éviter :
- Viser 100 % de couverture (tests fragiles, sans valeur) — vise « l'étape fait ce qu'elle doit faire ».
- Coder plusieurs étapes avant de tester ; sauter le commit au vert (on perd les points de reprise).
- Laisser le subagent lire le code avant d'écrire les tests.

<!-- Exemple d'usage :
  /code checkout-flow
  → lit features/checkout-flow/SPEC.md, plan mode → PLAN.md (étapes ↔ C1..C5), fait valider
  → Étape 1 (C1) : crée la commande → subagent écrit les unitaires depuis C1
    → hook rouge (stock non décrémenté) → lit .cc-scratch/test-gate.last.txt → corrige → vert → commit + coche
  Voir examples/checkout-flow/PLAN.md pour un plan complet. -->
