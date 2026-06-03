# Support — agrégat des motifs cross-clients

Agrégation des motifs récurrents identifiés depuis les sessions `/support`. Mis à jour quand un thème est détecté sur ≥ 3 clients OU récurrent sur 3+ sessions du même client.

## Format type

```markdown
### <Titre du motif>
- **Première détection** : YYYY-MM-DD (session support-<client>)
- **Sources** : <client-1>, <client-2>, <client-3>
- **Total tickets** : N
- **Criticité agrégée** : haute / moyenne / faible
- **Description** : Ce que l'utilisateur observe, ses workarounds, son impact.
- **Implication produit** : (optionnel) ce que ça suggère si pertinent — sans s'engager.
- **Lié à** : (lien éventuel vers `features/<slug>` existant ou candidat dans `insights.md` global)
```

---

## Motifs ouverts

_À remplir au fil des sessions `support-`._

## Motifs adressés

_(Les motifs ayant donné lieu à une feature livrée — pour archive et tracking d'efficacité.)_

---

> **Rappel doctrine** : un motif support ≠ une feature. Les features émergent de **l'intersection** des 3 axes discovery (market-research + user-feedback + support). C'est `knowledge/insights.md` global qui agrège tout. Ce fichier-ci reste filtré au support pour qui veut voir uniquement les motifs de tickets.
