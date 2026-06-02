---
name: feedback
description: Démarre une session user-feedback-<qui> — échange avec un utilisateur réel, met à jour sa fiche CRM et l'agrégat d'insights.
disable-model-invocation: true
---
Tu démarres une session USER FEEDBACK avec « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

1. Rappelle à l'utilisateur de nommer cette session `user-feedback-$ARGUMENTS` (via `/rename`) si besoin.
2. C'est de la **découverte** : continue, jamais rattachée à une feature. Regard vers l'**intérieur** (une personne précise).
3. Charge la fiche `knowledge/crm/contacts/$ARGUMENTS.md` si elle existe ; sinon, propose de la créer depuis `knowledge/crm/contacts/_template.md`.
4. Après l'échange, mets à jour **deux endroits** :
   - la fiche du contact (contexte, besoin, historique des échanges, prochaine action) ;
   - l'agrégat `knowledge/insights.md` (ce que les utilisateurs demandent).
5. Les idées de features émergent de l'**agrégat**, pas d'un seul échange.

Données sur de vraies personnes : garde `knowledge/crm/` en repo privé ou gitignored.
