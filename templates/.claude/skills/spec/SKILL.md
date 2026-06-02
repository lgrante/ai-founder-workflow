---
name: spec
description: Démarre une session spec-<feature> — écrit le SPEC (quoi + critères d'acceptation + jalons) d'une feature, sans coder.
disable-model-invocation: true
---
Tu démarres la phase SPEC de la feature « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

1. Rappelle à l'utilisateur de nommer cette session `spec-$ARGUMENTS` (via `/rename`) si ce n'est pas déjà fait.
2. Reste en mode SPEC : tu n'écris **pas** de code.
3. Si pertinents, lis `knowledge/insights.md` et `knowledge/market/` — la découverte alimente le spec.
4. Produis / mets à jour `features/$ARGUMENTS/SPEC.md` avec :
   - une **description** courte de la feature ;
   - les **critères d'acceptation** = la définition de « fini », dérivés AVANT le code ; ils serviront de référence à TOUS les tests (rapides comme e2e) ;
   - les **jalons** : les tranches user-facing successives (= points de contrôle e2e + gate humain).
5. Interviewe l'utilisateur pour combler les flous (une question à la fois). Ne devine pas les critères : fais-les valider.

Sortie = `features/$ARGUMENTS/SPEC.md`, l'artefact que `code-$ARGUMENTS` lira ensuite.
