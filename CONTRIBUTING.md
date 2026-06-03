# Contribuer au kit ai-founder-workflow

Ce repo est un **kit partagé** : il déploie un workflow de dev sur n'importe quel repo. Les contributions de l'équipe passent par **PR**. Ce guide dit comment proposer un changement **sans casser la doctrine**.

## En deux mots
- On améliore le kit (skills, hooks, docs, exemples), pas un repo cible.
- Tout changement est **additif** : on n'enlève pas la structure existante sans raison forte et discutée.
- Avant d'ouvrir une PR, on **teste** ses changements (voir plus bas).

## Avant de toucher quoi que ce soit
Lis, dans l'ordre : `README.md`, `templates/docs/WORKFLOW.md`, les six `templates/.claude/skills/*/SKILL.md` (setup, spec, code, test, research, feedback). Comprends **l'intention** avant de proposer.

## La doctrine à préserver (non négociable)
Une PR qui régresse l'un de ces points sera refusée :
1. **Mémoire dans les fichiers ; sessions jetables ; relais = artefact durable** (spec, code commité, tests) — jamais « la conversation ».
2. **Organisation par feature + découverte, jamais par rôle.** Les rôles (investiguer, relire) sont des **subagents** dans une session.
3. **Pipeline spec → code → test.** Tests ancrés sur l'**intention** (critères / spec), jamais sur le code qu'on vient d'écrire.
4. **Deux sortes de tests** : filet rapide (unitaires + intégration rapide, écrit par un subagent depuis les critères de l'étape, chez `code-x`, lancé par le hook) vs validation indépendante (e2e + acceptation, écrite depuis le spec par `test-x` en session fraîche). **Pas 100 % de couverture.** Disjoncteur après 2-3 échecs.
5. **Gate humain au jalon uniquement.**
6. `market-research` et `user-feedback` sont **deux types de découverte distincts**.
7. Claude **ne peut pas** lancer `/rename` lui-même : les commandes le **rappellent**, elles ne le font pas.
8. Le `Stop` hook bloque via `{"decision":"block","reason":…}` + `exit 0`, avec garde `stop_hook_active` **obligatoire**.
9. Le template `CLAUDE.md` reste **court**.

En cas de doute sur un comportement Claude Code (format de hook, frontmatter de skill, invocation de commande), **vérifie la doc officielle** (`code.claude.com/docs`) et cite-la dans la PR — n'invente rien.

## Tester ses changements (avant la PR)
Selon ce que tu touches :

- **JSON** — `python3 -m json.tool templates/.claude/settings.json >/dev/null` (doit parser).
- **Scripts shell** — `bash -n` sur chaque `.sh` touché (`install.sh`, `templates/.claude/hooks/*.sh`, `templates/.claude/statusline.sh`).
- **Hook de test** — vérifie les deux chemins :
  - garde anti-boucle : `printf '{"stop_hook_active":true}' | bash templates/.claude/hooks/test-gate.sh ; echo "exit=$?"` → `exit=0`, aucune sortie ;
  - le JSON émis en cas de rouge parse : capture la sortie du `printf` de blocage et passe-la à `python3 -m json.tool`.
- **Skills** — frontmatter valide : chaque `SKILL.md` a `name:` et `description:` ; `disable-model-invocation: true` conservé sur les commandes de session.
- **Dry-run mental** — déroule une petite feature : `/spec` → `SPEC.md` (critères + jalons) → `/code` → plan validé → étape → hook vert → `/test` au jalon → gate humain. Le changement tient-il sur tout le cycle ?
- **Cohérence docs** — si tu changes le **contenu du workflow**, mets à jour `README.md` **et** `README.html` ensemble (ils décrivent la même doctrine).

## Ouvrir la PR
- Une PR = un changement cohérent. Décris **quoi** et **pourquoi**, et lequel des points de doctrine est concerné.
- Note les vérifs lancées (ci-dessus) et leur résultat.
- Garde le **français**, la terminologie de l'existant, et le **sentence case** dans les titres.
- Évite d'élargir le périmètre : pas de refonte de structure glissée dans une PR de contenu.

## Faire évoluer la doctrine
La doctrine peut évoluer — mais c'est une **décision d'équipe explicite**, pas un effet de bord. Ouvre une PR dédiée qui argumente le changement et met à jour `README.md`, `README.html` et `templates/docs/WORKFLOW.md` de façon cohérente.
