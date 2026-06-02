---
name: code
description: Démarre une session code-<feature> — planifie puis implémente la feature étape par étape, avec un filet de tests rapides lancé par le hook.
disable-model-invocation: true
---
Tu démarres la phase CODE de la feature « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

1. Rappelle à l'utilisateur de nommer cette session `code-$ARGUMENTS` (via `/rename`) si besoin.
2. Lis `features/$ARGUMENTS/SPEC.md` (spec + critères + jalons).
3. En **plan mode**, explore le codebase puis écris `features/$ARGUMENTS/PLAN.md` : étapes techniques, fichiers touchés, ordre, chaque étape rattachée à un critère du spec. **Fais valider le plan** avant d'implémenter.
4. Implémente **une étape à la fois** (front + back ensemble — ils partagent le contrat d'API). À chaque étape :
   - écris le code de l'étape ;
   - délègue à un **subagent** l'écriture du **filet rapide** (unitaires + intégration rapide), dérivé des **critères de l'étape**, JAMAIS du code que tu viens d'écrire ;
   - le `Stop` hook lance ces tests et bloque tant que ce n'est pas vert : corrige et relance toi-même ;
   - au vert : commit, coche l'étape dans `PLAN.md`, passe à la suivante.
5. **Compacte aux points verts** (préserve l'état du PLAN, les fichiers touchés, les critères ; jette le bruit des échecs résolus).
6. **Disjoncteur** : après 2-3 échecs persistants sur une étape, ARRÊTE et signale à l'utilisateur (le spec ou l'approche est peut-être en cause).

Ne vise PAS 100 % de couverture : vise « l'étape fait ce qu'elle doit faire ».
