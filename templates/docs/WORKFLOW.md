# WORKFLOW — workflow de dev assisté par IA (référence in-repo)

> Référence courte vivant dans le repo. Le guide complet est dans le repo kit `ai-dev-workflow`.

## Principe central
La mémoire persistante vit dans des **fichiers**, pas dans les sessions. Les sessions sont **jetables**.
Le relais entre deux étapes = un **artefact durable** (spec, code commité, fichier de tests).
Dès que ce qui compte est dans un fichier, une session neuve (ou `/clear`) bat une longue session encombrée.

## Deux axes de sessions
- **Découverte** — continu, jamais par feature. Sort dans des fichiers (`knowledge/`).
- **Build** — par feature, en pipeline `spec → code → test`.

### Nomenclature
| Préfixe | Axe | Pour quoi | Écrit dans |
|---|---|---|---|
| `market-research-…` | Découverte | marché, concurrents, tendances | `knowledge/market/` |
| `user-feedback-…` | Découverte | échanges avec de vrais utilisateurs | `knowledge/crm/contacts/` + `knowledge/insights.md` |
| `spec-<feature>` | Build | le quoi : spec + critères + jalons | `features/<feature>/SPEC.md` |
| `code-<feature>` | Build | le comment : plan + code + filet rapide | `features/<feature>/PLAN.md` + code commité |
| `test-<feature>` | Build | e2e depuis le spec + revue, au jalon | suite e2e commitée |

`market-research` et `user-feedback` sont **deux types distincts** (extérieur/marché vs intérieur/personnes). Le format exact des préfixes est une préférence ; seul le préfixe par type compte.

## Pipeline de build
- `spec-<feature>` : écrit `SPEC.md` (description + **critères d'acceptation** dérivés AVANT le code + **jalons**).
- `code-<feature>` : écrit `PLAN.md` en plan mode, implémente étape par étape (front + back ensemble). À chaque étape, un **subagent** écrit le filet rapide depuis les **critères de l'étape**, le hook le lance.
- `test-<feature>` : session **fraîche**, écrit les **e2e** depuis le **spec** au jalon + **revue à œil neuf**.
- Puis **gate humain** : validation de la tranche au jalon.

## Session vs subagent
- **Session séparée** si le relais est un artefact durable (spec, code, tests).
- **Subagent** si le relais est éphémère (investigation, écarts d'une revue) et revient dans le travail courant.

## Vérification — deux sortes de tests
Ligne de partage : **rapide & incrémental** (code-x, à chaque étape) vs **bout-en-bout** (test-x, au jalon).
- **Filet rapide** (code-x) : unitaires + intégration rapide, écrits par subagent depuis les critères, lancés par le `Stop` hook qui **bloque tant que c'est rouge**. Filet de régression, pas validation finale.
- **Validation indépendante** (test-x) : e2e + acceptation, écrits depuis le spec par une session qui n'a pas écrit le code.

Règles : tests ancrés sur l'**intention** (jamais sur le code qu'on vient d'écrire) ; l'intégration rapide reste chez code-x ; l'e2e ne peut pas être le gate par étape (tranche pas câblée de bout en bout) ; **pas 100 % de couverture** ; disjoncteur après 2-3 échecs → un humain intervient.

## Hygiène de contexte
- `/compact` aux points verts (préserver : état du PLAN, fichiers touchés, critères ; jeter le bruit des échecs résolus).
- `/clear` ou nouvelle session entre sujets sans rapport.
- Le **moment** du clear/compact est un geste humain ; ce qui s'automatise via hooks, c'est ce qui **survit**.

## Hook
`Stop` hook (`.claude/hooks/test-gate.sh`) : lance les tests rapides, bloque la fin du tour via `{"decision":"block","reason":...}` tant que rouge. Garde anti-boucle `stop_hook_active` obligatoire.
