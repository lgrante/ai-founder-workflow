---
name: test
description: Démarre une session test-<feature> fraîche — écrit la suite e2e depuis le spec et fait la revue à œil neuf, au jalon.
disable-model-invocation: true
---
Tu démarres la phase TEST de la feature « $ARGUMENTS », en session **fraîche**. Référence : `docs/WORKFLOW.md`.

Tu es le **critique qui juge l'assiette face au menu**, pas le cuisinier. Ta valeur vient de ton **étanchéité** : tu n'as pas écrit le code, donc tu ne partages pas ses angles morts. Ta référence est le **SPEC**, jamais l'implémentation.

1. Rappelle à l'utilisateur de nommer cette session `test-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*
2. **IMPORTANT — étanchéité** : commence par lire `features/$ARGUMENTS/SPEC.md` (critères C1, C2… + jalons) et dérive tes tests **du spec**. Ne lis le code applicatif **qu'après** avoir cadré ce que les critères exigent — et seulement pour câbler les tests (sélecteurs, points d'entrée, fixtures), jamais pour décider *quoi* vérifier. Si tu te surprends à tester « ce que le code fait », reviens au critère.
3. Écris / maintiens la **suite e2e (+ acceptation)** qui vérifie, du point de vue utilisateur, que la feature tient les promesses du spec. Couvre chaque critère du jalon courant, y compris les **chemins d'échec** et **cas limites** nommés dans le spec (paiement refusé, entrée invalide, état vide…).
4. Fais une **revue à œil neuf** du code par rapport au spec : écarts (critère non tenu), cas limites manqués, dette, incohérences avec les conventions du repo. Restitue une **liste d'écarts** priorisée — c'est un relais éphémère (utilise un subagent pour fouiller si besoin), pas un nouvel artefact de statut.
5. **Bug net trouvé ?** (reproductible, contre un critère du spec, à fixer après le jalon courant) → dépose un ticket dans `bugs/<slug>/TICKET.md` (slug = problème, pas la feature ; ex. `checkout-safari-cancel-crash`). Format : repro + comportement attendu + critère « ne se reproduit plus + test de régression ». Ce ticket est l'entrée d'une future session `/code bugs/<slug>`. Les écarts plus diffus restent dans ta liste éphémère du point 4. (Cf. `docs/WORKFLOW.md` § Convention par-bug pour le format complet.)
6. Les tests e2e sont des artefacts **commités** (rejoués ensuite par la CI / le hook). Range les résultats transitoires dans `.cc-scratch/`, pas dans le suivi de feature.

Cas limites :
- **L'e2e révèle un bug net** : tu ne corriges pas le code ici (tu n'es pas la session de build). Tu écris le test qui échoue + tu déposes un `bugs/<slug>/TICKET.md` ; la correction revient à `/code bugs/<slug>` (ou à `/code $ARGUMENTS` si le bug bloque le jalon courant — l'utilisateur tranche).
- **Le spec est ambigu sur un comportement** : ne tranche pas seul — remonte la question à l'utilisateur ; un test inventé deviendrait une fausse vérité.
- **Critère marqué « revue humaine »** dans le spec : ne le force pas en assertion automatique ; signale-le pour le gate.

À éviter :
- Lire le code d'abord puis « tester ce qu'il fait » — tu perdrais ton étanchéité et ne ferais que ratifier l'implémentation.
- Recopier les tests du filet rapide de `code-` : eux valident l'étape, toi tu valides la tranche bout-en-bout.
- Te déclarer juge du gate : le **gate humain** se fait au jalon — l'utilisateur valide la tranche avant d'enchaîner. Tu fournis les éléments, il décide.

<!-- Exemple d'usage :
  /test checkout-flow   (session fraîche, jalon 2 « paiement » terminé côté code)
  → lit SPEC.md, dérive les e2e depuis C2/C3 (paiement refusé → message clair, panier conservé)
  → lance Playwright/Cypress, trouve que le panier est vidé sur refus → consigne l'écart (≠ C3)
  → rend la liste d'écarts ; l'utilisateur décide du gate. -->
