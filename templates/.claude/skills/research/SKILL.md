---
name: research
description: Démarre une session market-research-<sujet> — recherche marché / concurrents / tendances, continue, jamais rattachée à une feature. Sort dans knowledge/research/ (sujets), knowledge/competitors/ (concurrents), knowledge/community/ (veille passive).
disable-model-invocation: true
---
Tu démarres une session de RECHERCHE MARCHÉ sur « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de la **découverte tournée vers l'extérieur** : le marché, les concurrents, les tendances — abstrait, pas une personne précise (ça, c'est `/feedback`). La découverte est **continue** et **jamais rattachée à une feature** : tu alimentes la source qui nourrira les futurs `spec-`.

**Trois destinations dans `knowledge/`** (un objet = un dossier — cf. `docs/WORKFLOW.md` § Principe directeur découverte) :
- **`knowledge/research/`** — **destination par défaut** : une note synthétique **par sujet exploré** (datée, sourcée). C'est ici que tu écris la plupart du temps.
- **`knowledge/competitors/<nom>/`** — quand la trouvaille concerne **un concurrent précis** : un dossier par concurrent (`features.md`, `user-feedbacks.md`). La note `research/` peut citer le concurrent ; la fiche détaillée vit dans `competitors/`.
- **`knowledge/community/`** — quand tu **dépouilles un canal de veille passive** (thread Reddit, Slack, Discord, groupe LinkedIn) : une note par canal, mise à jour au fil des passages.

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

1. Rappelle à l'utilisateur de nommer cette session `market-research-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `research/$ARGUMENTS` — une branche par sujet de recherche (reprise à chaque nouvelle session sur le même sujet). `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b research/$ARGUMENTS`, sinon → `git checkout research/$ARGUMENTS`. **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. Cadre la question avec l'utilisateur (que cherche-t-on à décider ?), puis **délègue les recherches lourdes à un subagent** : il fouille, lit les sources, et te rend une **synthèse**. Tu gardes ton contexte principal propre — ne ramène pas les pages brutes, seulement les conclusions sourcées.
3. Sortie = une note **datée et sourcée** dans `knowledge/research/` (ex. `knowledge/research/2026-06-02-paiement-mobile.md`) — une note **par sujet**. Chaque affirmation porte sa source (lien + date de consultation). Distingue **fait** (sourcé) et **hypothèse**. *(Si la trouvaille est centrée concurrent → `knowledge/competitors/<nom>/` ; si c'est le dépouillement d'un canal de veille → `knowledge/community/`.)*
4. Si une trouvaille a une **implication produit**, ajoute une ligne à `knowledge/insights.md` (section « Pistes de features ») — c'est l'agrégat d'où émergent les idées.
5. **Pont vers le backlog** : si le motif est **déjà nettement récurrent** (croisé avec d'autres signaux discovery, ≥ ~3 sources/contacts), tu peux proposer à l'utilisateur de déposer un item `backlog/<slug>.md` (cf. `docs/WORKFLOW.md` § Convention backlog). Sinon, **laisse le signal mûrir dans `insights.md`** — c'est `/backlog` qui le promouvra quand l'agrégat sera assez fort. Tu n'écris **jamais** de spec ici.

Cas limites :
- **Le sujet recoupe une note existante** : amende / date la note existante plutôt que d'en créer une qui la contredit en silence.
- **Source incertaine ou non datée** : marque-la comme telle ; ne la promeus pas en fait.
- **La recherche débouche sur une idée de feature** : ne crée pas le spec ici — pose la piste dans `insights.md` (et, si le motif est déjà récurrent, un item `backlog/`) ; le `/spec` viendra plus tard, via le backlog.

À éviter :
- Écrire du code ou créer un dossier `features/…` — la recherche ne construit rien.
- Rattacher la session à une feature précise (« market-research pour checkout ») — la découverte est transverse.
- Polluer le contexte principal avec les dumps de recherche : c'est le rôle du subagent de les absorber.

`market-research` et `user-feedback` sont **deux types distincts** — extérieur/marché ici, intérieur/personnes là. Garde-les séparés.

<!-- Exemple d'usage :
  /research paiement-mobile
  → cadre la question (faut-il intégrer Apple Pay au checkout ?)
  → subagent fouille concurrents + adoption → synthèse
  → écrit knowledge/research/2026-06-02-paiement-mobile.md (sourcé)
  → (fiches concurrents détaillées → knowledge/competitors/apple-pay/ ; thread Reddit dépouillé → knowledge/community/reddit-r-fintech.md)
  → ajoute à insights.md : « Piste : wallet au checkout (3 concurrents sur 4 le proposent) ». -->
