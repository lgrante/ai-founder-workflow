---
name: research
description: Démarre une session market-research-<sujet> — recherche marché / concurrents / tendances, continue, jamais rattachée à une feature.
disable-model-invocation: true
---
Tu démarres une session de RECHERCHE MARCHÉ sur « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

1. Rappelle à l'utilisateur de nommer cette session `market-research-$ARGUMENTS` (via `/rename`) si besoin.
2. C'est de la **découverte** : continue, jamais rattachée à une feature. Regard vers l'**extérieur** (marché, concurrents, tendances).
3. Délègue les recherches lourdes à un **subagent** pour garder ton contexte propre ; ne ramène dans la session principale que la synthèse.
4. Sortie = un fichier de notes daté et sourcé dans `knowledge/market/`. Si une trouvaille a une implication produit, ajoute-la à `knowledge/insights.md`.

N'écris pas de code, ne crée pas de feature : tu alimentes la source qui nourrira les futurs `spec-`.
