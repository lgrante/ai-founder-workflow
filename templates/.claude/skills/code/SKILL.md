---
name: code
description: Démarre une session code-<feature> — plan + architecture validés par l'utilisateur, puis implémentation étape par étape avec filet de tests rapides via hook.
disable-model-invocation: true
---
Tu démarres la phase CODE pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

Tu décides le **comment** et tu construis. Ta référence d'intention reste l'artefact d'entrée (SPEC pour une feature, TICKET pour un bug) ; ton journal d'avancement est `PLAN.md` (les cases cochées = le seul statut). Front et back d'une même feature vont dans **cette** session : ils partagent le contrat d'API.

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

1. Rappelle à l'utilisateur de nommer cette session `code-$ARGUMENTS` (via `/rename`) si besoin. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

2. **Détecte le mode + branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) :
   - Mode **bug** si `$ARGUMENTS` commence par `bugs/` (ex. `/code bugs/safari-cancel-crash`) → dossier d'artefact = `$ARGUMENTS/`. **Branche : `fix/<bug-slug>`** (slug = `$ARGUMENTS` après le préfixe `bugs/`).
   - Sinon mode **feature** → dossier d'artefact = `features/$ARGUMENTS/`. **Branche : `feat/$ARGUMENTS`** (partagée avec `spec-` et `test-` ; existe déjà si `spec-` t'a précédé).
   - `git status` clean obligatoire (commit/stash sinon) ; `git checkout -b <branch>` si sur `main`, OU `git checkout <branch>` si reprise. **Stage par chemin explicite uniquement** (jamais `git add -A` — multi-agents).

3. **Lis l'artefact d'entrée** :
   - Mode bug → `$ARGUMENTS/TICKET.md` (repro + comportement attendu + critère « ne se reproduit plus »). Cf. `docs/WORKFLOW.md` § Convention par-bug.
   - Mode feature → `features/$ARGUMENTS/SPEC.md` (description + critères C1, C2… + jalons).
   - Si absent ou trop flou pour planifier → **stoppe** et renvoie vers `/spec` (mode feature) ou vers la session qui a ouvert le ticket (mode bug).

4. **PLAN.md — porte de validation 1/2.** En **plan mode**, explore le codebase (conventions, modules concernés, setup de test réel) **avant** d'écrire le plan. Puis écris `<dossier-artefact>/PLAN.md` :
   - étapes techniques ordonnées, fichiers touchés, dépendances entre étapes ;
   - **chaque étape rattachée à un ou plusieurs critères** de l'artefact (référence par numéro : « Étape 3 → C2 ») ;
   - en mode feature : regroupe les étapes par jalon. En mode bug : pas de jalon (le fix est sa propre tranche), mais distingue **fix** et **test de régression** comme deux étapes minimum.
   - **À la fin du PLAN.md**, ajoute une section `## Régime architectural` qui annonce ta classification :
     - **Régime light** si ≤2 étapes ET ≤1 jalon (typique : bug fix, micro-feature) → tu intègres une section `## Architecture` (3-5 lignes + 1 mini-schéma Mermaid si pertinent) **dans PLAN.md** et **tu sautes l'étape 5** (pas d'ARCHITECTURE.md séparé).
     - **Régime full** si ≥3 étapes OU ≥2 jalons → ARCHITECTURE.md + ARCHITECTURE.html requis (étape 5).
   - Justifie le régime en 1 phrase (« 5 étapes / 3 jalons → régime full »). L'utilisateur peut t'imposer l'autre régime verbalement (« non, fais light »).
   - **N'écris aucun code en plan mode.**
   - Puis demande validation via **`AskUserQuestion`** avec 3 options (single-select) :
     - **Validé, on continue** → `git add <dossier-artefact>/PLAN.md` (chemin explicite) ; commit `docs(plan): plan validé pour $ARGUMENTS`. Passe à l'étape 5 (régime full) ou 6 (régime light).
     - **À améliorer** → recueille le retour (« revois l'étape 3 », « manque le câblage X »), retravaille les sections concernées, **re-AskUserQuestion**. Boucle jusqu'à validation ou stop.
     - **Stop, à repenser** → l'artefact d'entrée est probablement en cause. Renvoie à `/spec` (mode feature) ou à la session qui a ouvert le ticket (mode bug). **Termine ton flux.**

5. **ARCHITECTURE.md + ARCHITECTURE.html — porte de validation 2/2 (régime full uniquement).** Sinon, saute à l'étape 6.

   Écris `<dossier-artefact>/ARCHITECTURE.md` avec **cette structure obligatoire** :
   - `## Vue d'ensemble` — 2-3 lignes de prose + 1 diagramme Mermaid (`flowchart TD` ou `C4Context`) qui montre où s'insère la feature dans le système.
   - `## Modules touchés` — tableau `module | responsabilité | nouveau / modifié`.
   - `## Diagrammes` — au minimum 1 **component diagram** (Mermaid). Ajoute un **sequence diagram** pour tout flow multi-acteurs ou async. Ajoute un **ER diagram** si le schéma DB est modifié. Tous en Mermaid (```mermaid blocs).
   - `## Choix architecturaux` — pour chaque décision structurante : la décision retenue, les alternatives écartées, **pourquoi** (perf, simplicité, contraintes, lock-in à éviter).
   - `## Application SOLID + GRASP` — tableau `principe | où c'est appliqué dans cette feature | pourquoi`. **Note explicitement les violations conscientes** (YAGNI > OCP prématuré, simplicité > Pure Fabrication, perf > Indirection). Cf. `docs/WORKFLOW.md` § SOLID & GRASP. **La violation justifiée compte plus que l'application dogmatique** — un sur-design qui coche toutes les cases est plus dangereux qu'un design pragmatique avec 2 entorses motivées.
   - `## Risques` — ce qui peut casser à l'implémentation ou au runtime (perf, sécurité, migration, rétrocompat).

   Puis génère `<dossier-artefact>/ARCHITECTURE.html` via pandoc (convention dual md+html) :
   ```bash
   pandoc <dossier-artefact>/ARCHITECTURE.md \
     -o <dossier-artefact>/ARCHITECTURE.html \
     --template .claude/skills/code/architecture.html.tmpl \
     --standalone \
     --metadata title="$ARGUMENTS"
   ```
   Si `pandoc` n'est pas installé, signale-le à l'utilisateur (`brew install pandoc` sur macOS, `apt install pandoc` sur Debian) et continue sans le HTML — propose de regénérer plus tard. Ne bloque pas le flow pour ça. Le template embarque mermaid.js via CDN et un thème dark responsive lisible mobile.

   Puis demande validation via **`AskUserQuestion`** avec 3 options :
   - **Validé, on code** → `git add <dossier>/ARCHITECTURE.md <dossier>/ARCHITECTURE.html` (chemins explicites) ; commit `docs(arch): architecture validée pour $ARGUMENTS`. Passe à l'étape 6.
   - **À améliorer** → recueille le retour (sur un diagramme, un choix, un principe, une violation contestée), retravaille les sections concernées, regénère le HTML, **re-AskUserQuestion**.
   - **Stop, à repenser** → l'approche ou le spec est en cause. Renvoie à `/spec`. **Termine.**

6. Implémente **une étape à la fois** (front + back ensemble). À chaque étape :
   - écris le code de l'étape ;
   - délègue à un **subagent** l'écriture du **filet rapide** (unitaires + intégration rapide), dérivé des **critères de l'étape**, JAMAIS du code que tu viens d'écrire. Le subagent reçoit les critères, pas l'implémentation, sinon les tests ratifieraient les bugs. **Granularité** : étape simple → des unitaires suffisent ; étape qui câble deux modules ou tape une API → ajoute un test d'intégration rapide.
   - le `Stop` hook (`.claude/hooks/test-gate.sh`) lance ces tests et **bloque la fin du tour** tant que ce n'est pas vert. Lis `.cc-scratch/test-gate.last.txt` (la sortie des tests = la preuve), corrige la **cause**, relance toi-même ;
   - au vert : commit (chemins explicites), coche l'étape dans `PLAN.md`, passe à la suivante.

7. **Compacte aux points verts** (`/compact`) : préserve l'état du PLAN, les fichiers touchés, les critères ; jette le bruit des échecs résolus. Geste humain — propose-le, ne l'impose pas.

8. **Disjoncteur** : après 2-3 échecs persistants sur une même étape, ARRÊTE et signale à l'utilisateur. Un rouge qui s'entête = signal que l'**artefact d'entrée** (SPEC ou TICKET) ou l'**approche** est en cause, pas qu'il faut s'acharner. (Le `Stop` hook s'auto-désactive après ~8 blocages ; ne compte pas dessus.)

Cas limites :
- **Hook rouge pour une raison hors étape** (env, dépendance manquante, test pré-existant cassé) : ne maquille pas le test ; corrige la cause réelle ou signale-le.
- **Tentation de modifier les tests pour passer au vert** : interdit si ça change l'intention. On corrige le code, pas la barre.
- **L'e2e du jalon n'est pas ton boulot** (mode feature) : à l'étape 3/7 la tranche n'est pas câblée de bout en bout — l'e2e serait forcément rouge. Le gate par étape est du **rapide/incrémental** uniquement.
- **Bug avec repro fragile** (mode bug) : si la repro du TICKET.md ne se déclenche pas chez toi, **ne devine pas le fix** — remonte à l'utilisateur (manque de contexte, env spécifique, version client). Un fix à l'aveugle qui passe les tests qu'on s'est inventés ratifie le silence du bug, pas sa disparition.
- **SOLID/GRASP appliqué dogmatiquement** : refuse l'over-engineering. Une `Factory` pour 1 implémenteur, une `IUserRepository` pour 1 use case, un médiateur sans alternative à découpler = signaux d'alarme. Préfère la violation consciente notée dans ARCHITECTURE.md à la cathédrale d'abstractions.
- **Reprise après validation** : si tu redémarres une session sur un dossier qui a déjà PLAN.md + ARCHITECTURE.md validés (commits `docs(plan):` et `docs(arch):` présents dans `git log`), **ne re-demande pas la validation** — saute directement à l'étape 6 et reprends à la première case PLAN.md non cochée.

À éviter :
- Viser 100 % de couverture (tests fragiles, sans valeur) — vise « l'étape fait ce qu'elle doit faire ».
- Coder plusieurs étapes avant de tester ; sauter le commit au vert (on perd les points de reprise).
- Laisser le subagent lire le code avant d'écrire les tests.
- Décider du régime architectural light/full sans l'annoncer explicitement à l'utilisateur dans le PLAN.md (il doit pouvoir l'overrider verbalement).
- Coder en régime full sans ARCHITECTURE.md validé, ou en régime light sans section Architecture dans PLAN.md.

<!-- Exemple d'usage (mode feature, régime full) :
  /code checkout-flow
  → lit features/checkout-flow/SPEC.md, plan mode → PLAN.md (5 étapes ↔ C1..C5, 2 jalons)
  → régime full annoncé → AskUserQuestion → "Validé"
  → commit docs(plan): plan validé pour checkout-flow
  → écrit ARCHITECTURE.md (vue d'ensemble + modules + 2 diagrammes Mermaid + SOLID/GRASP avec violation YAGNI notée + risques)
  → pandoc → ARCHITECTURE.html
  → AskUserQuestion → "À améliorer : sequence diagram payment manque le webhook async"
  → ajoute le webhook au sequence diagram, regénère HTML, re-AskUserQuestion → "Validé"
  → commit docs(arch): architecture validée pour checkout-flow
  → Étape 1 (C1) : crée la commande → subagent écrit les unitaires depuis C1 → hook vert → commit + coche
  Voir examples/checkout-flow/ pour PLAN, ARCHITECTURE et SPEC complets.

  Exemple d'usage (mode bug, régime light) :
  /code bugs/safari-cancel-crash
  → lit bugs/safari-cancel-crash/TICKET.md (repro + C1 "ne se reproduit plus" + C2 "test de régression")
  → plan mode → PLAN.md : Étape 1 (fix event handler) → C1, Étape 2 (test régression Playwright) → C2
  → régime light annoncé (2 étapes, 0 jalon) + section ## Architecture courte intégrée
  → AskUserQuestion → "Validé"
  → commit docs(plan): plan validé pour bugs/safari-cancel-crash
  → saute étape 5 (pas d'ARCHITECTURE.md)
  → Étape 1 : corrige le handler → subagent écrit l'unitaire depuis C1 → hook vert → commit + coche
  → Étape 2 : ajoute le test régression à la suite existante → hook vert → commit + coche → ticket statut "closed". -->
