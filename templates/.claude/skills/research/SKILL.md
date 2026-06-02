---
name: research
description: Démarre une session market-research-<sujet> — recherche marché / concurrents / tendances, continue, jamais rattachée à une feature.
disable-model-invocation: true
---
Tu démarres une session de RECHERCHE MARCHÉ sur « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de la **découverte tournée vers l'extérieur** : le marché, les concurrents, les tendances — abstrait, pas une personne précise (ça, c'est `/feedback`). La découverte est **continue** et **jamais rattachée à une feature** : tu alimentes la source qui nourrira les futurs `spec-`.

1. Rappelle à l'utilisateur de nommer cette session `market-research-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*
2. Cadre la question avec l'utilisateur (que cherche-t-on à décider ?), puis **délègue les recherches lourdes à un subagent** : il fouille, lit les sources, et te rend une **synthèse**. Tu gardes ton contexte principal propre — ne ramène pas les pages brutes, seulement les conclusions sourcées.
3. Sortie = un fichier de notes **daté et sourcé** dans `knowledge/market/` (ex. `knowledge/market/2026-06-02-paiement-mobile.md`). Chaque affirmation porte sa source (lien + date de consultation). Distingue **fait** (sourcé) et **hypothèse**.
4. Si une trouvaille a une **implication produit**, ajoute une ligne à `knowledge/insights.md` (section « Pistes de features ») — c'est l'agrégat d'où émergent les idées.

Cas limites :
- **Le sujet recoupe une note existante** : amende / date la note existante plutôt que d'en créer une qui la contredit en silence.
- **Source incertaine ou non datée** : marque-la comme telle ; ne la promeus pas en fait.
- **La recherche débouche sur une idée de feature** : ne crée pas le spec ici — pose la piste dans `insights.md`, le `/spec` viendra plus tard.

À éviter :
- Écrire du code ou créer un dossier `features/…` — la recherche ne construit rien.
- Rattacher la session à une feature précise (« market-research pour checkout ») — la découverte est transverse.
- Polluer le contexte principal avec les dumps de recherche : c'est le rôle du subagent de les absorber.

`market-research` et `user-feedback` sont **deux types distincts** — extérieur/marché ici, intérieur/personnes là. Garde-les séparés.

<!-- Exemple d'usage :
  /research paiement-mobile
  → cadre la question (faut-il intégrer Apple Pay au checkout ?)
  → subagent fouille concurrents + adoption → synthèse
  → écrit knowledge/market/2026-06-02-paiement-mobile.md (sourcé)
  → ajoute à insights.md : « Piste : wallet au checkout (3 concurrents sur 4 le proposent) ». -->
