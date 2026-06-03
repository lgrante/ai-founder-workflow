---
name: support
description: Démarre une session support-<client> — sift les tickets de support (Jira via MCP Atlassian Rovo en priorité, ou API token en fallback), extrait pain points et motifs, range dans knowledge/support/.
disable-model-invocation: true
---
Tu démarres une session de discovery **support** pour « $ARGUMENTS ». Référence : `docs/WORKFLOW.md`.

C'est de la **DÉCOUVERTE** orientée tickets clients — 4e type avec `market-research` (extérieur abstrait), `user-feedback` (intérieur, échange direct 1-à-1), et toi (intérieur, agrégé depuis le système support). Tu ne **décides rien** ici (pas de feature, pas de spec) — tu **consignes** ce qui ressort et laisses émerger les motifs sur plusieurs sessions.

Format attendu : `/support <client-slug>` (par client) ou `/support <sujet>` (analyse transverse cross-clients).

## Pipeline

1. Rappelle à l'utilisateur de nommer cette session `support-<slug>` via `/rename`. *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

> **Branche dédiée** (cf. `docs/WORKFLOW.md` § Étiquette git) : `support/$ARGUMENTS` — une branche par client (reprise à chaque sift). `git status` clean (commit/stash sinon) ; si sur `main` → `git checkout -b support/$ARGUMENTS`, sinon → `git checkout support/$ARGUMENTS`. **Stage par chemin explicite uniquement** — jamais `git add -A` (multi-agents potentiels).

2. **Détecte la source de tickets** dans cet ordre :
   - **Priorité 1 — MCP Atlassian Rovo** (officiel, GA février 2026). Vérifie si un serveur MCP `atlassian` est configuré (cherche dans la liste des outils MCP disponibles : noms commençant par `mcp__atlassian__`). Si oui, utilise-le directement — l'auth OAuth est gérée par le MCP.
   - **Priorité 2 — API token Jira** (fallback). Si pas de MCP, demande à l'utilisateur :
     - URL de l'instance (ex. `https://entreprise.atlassian.net`)
     - Email du compte
     - API token (à générer ici : https://id.atlassian.com/manage-profile/security/api-tokens)
     - Range les credentials dans `.cc-scratch/support-creds.json` (gitignored via `.cc-scratch/`).
     - L'auth HTTP basic se fait avec `Authorization: Basic base64(email:token)`.
   - **Priorité 3 — autres sources** (Zendesk, Linear, Intercom). Si Jira pas utilisé, demande à l'utilisateur quelle solution + adapte. L'architecture du skill est extensible : la sortie standardisée (`knowledge/support/clients/<client>.md`) reste la même.

3. **Mode incrémental** (par défaut) :
   - Lis `knowledge/support/clients/<client>.md` si existant et récupère `last_synced` dans le frontmatter.
   - Fetch les tickets **modifiés depuis** `last_synced` (filtre `updated >= last_synced` côté Jira via JQL).
   - Si le fichier n'existe pas → demande à l'utilisateur la fenêtre initiale (ex. 30/90/365 jours). Cap par défaut à 50 tickets pour la première fois (paginer si besoin via un subagent).
   - Option **full refetch** : si l'utilisateur passe `--full` ou si le fichier est marqué `needs_full_resync: true`, refait l'analyse complète.

4. **Sift via subagent** (obligatoire pour ne pas saturer ton contexte) :
   - Le subagent reçoit les tickets bruts (titre + description + commentaires + status + priorité + labels).
   - Il extrait : **pain points** (avec verbatims), **thèmes récurrents**, **criticité** (basée sur priorité Jira + nombre de tickets sur le thème), **status agrégé** (ouverts/résolus/abandonnés).
   - Il rend une **synthèse structurée** (3-7 thèmes max). Pas les tickets bruts dans ta session.

5. **Met à jour `knowledge/support/clients/<client>.md`** :
   - Frontmatter : `client`, `source` (jira/zendesk/...), `jira_project` (si applicable), `last_synced` (mis à jour à maintenant), `total_tickets_analyzed` (cumulatif).
   - **Append daté** : chaque session ajoute une section `## <YYYY-MM-DD> (N nouveaux tickets depuis <date>)`. Jamais d'écrasement de l'historique. Si une section pour aujourd'hui existe déjà, demande à l'utilisateur (fusion ou écrasement explicite).
   - Sections par session : `Pain points`, `Verbatims marquants` (anonymisés — IDs Jira plutôt que noms), `Statistiques`, `Status des thèmes ouverts`.

6. **Détecte (a) motifs forts et (b) bugs nets** — deux sorties distinctes :
   - **Motif fort** (fréquence ≥ 3 tickets, criticité haute, récurrent 3+ sessions) → propose à l'utilisateur d'ajouter / renforcer dans `knowledge/support/insights.md` (agrégat support cross-clients). Si transverse aux 3 axes discovery, propose aussi `knowledge/insights.md` (agrégat global).
   - **Bug net** (un ticket individuel = problème reproductible, gravité claire, fixable directement — distinct d'un motif diffus) → propose à l'utilisateur d'ouvrir un ticket dans `bugs/<slug>/TICKET.md` (slug = description du problème, ex. `acme-export-pdf-utf8`). Format : repro + comportement attendu + critère « ne se reproduit plus + test de régression » (cf. `docs/WORKFLOW.md` § Convention par-bug). Ce ticket est l'entrée d'une future `/code bugs/<slug>`. Un même ticket Jira peut produire **les deux** (un motif agrégé + un bug à fixer maintenant) — ce n'est pas un OU exclusif.

7. **Stop** : ta session est finie. Pas de plan d'action, pas de spec. Les idées de features émergent de l'agrégat **sur plusieurs sessions** (la doctrine : un échange ≠ une preuve, c'est l'agrégat qui fait foi). Les bugs ouverts en 6.b vivent leur vie dans `bugs/` jusqu'à ce que `/code` les ferme.

## Cas limites

- **Aucune source configurée et utilisateur refuse de fournir des creds** : signale et abandonne sans rien créer.
- **MCP renvoie une erreur d'auth** (token expiré, scope insuffisant) : signale clairement, propose le fallback API token, n'invente pas le contenu.
- **Trop de tickets** (> 500 sur la fenêtre demandée) : demande à l'utilisateur de filtrer (par label Jira, par status, par dates plus serrées). Ne charge pas tout en mémoire.
- **Client inconnu dans Jira** : suggère de vérifier le slug, propose la liste des projets/clients récents (via MCP ou API).
- **Tickets multi-clients dans un même projet** : demande à l'utilisateur le filtre exact (label client, custom field, etc.).
- **Interruption utilisateur** : ne reprends pas auto, attends une instruction.

## À éviter

- **Stocker des PII brutes** (noms, emails, téléphones de contacts client) dans `knowledge/support/clients/<client>.md` versionné. **Anonymise** ou réfère aux IDs Jira (`PROJ-1234`).
- **Écraser l'historique** : `knowledge/support/clients/<client>.md` est **cumulatif**. Les sections datées s'ajoutent, ne remplacent pas.
- **Décider d'une feature** ici — c'est le rôle de `/spec`, déclenché plus tard quand un motif a émergé de l'agrégat.
- **Confondre avec `/feedback`** (échange direct, 1 personne, qualitatif) ou `/research` (marché abstrait, sources externes).
- **Charger tous les tickets bruts dans ta session** — toujours déléguer le sift à un subagent et ne ramener que la synthèse.

## Format du fichier client (référence)

```markdown
---
client: acme-corp
source: jira
jira_project: ACME
last_synced: 2026-06-03T15:00:00Z
total_tickets_analyzed: 47
---

# Support — Acme Corp

## 2026-06-03 (12 nouveaux tickets depuis 2026-05-15)

### Pain points
- **Lenteur des exports** (5 tickets — ACME-1234, ACME-1241, ACME-1255, ACME-1260, ACME-1267). Récurrent depuis 3 sessions.
- ...

### Verbatims marquants
- > « L'export Excel met 8 minutes pour 500 lignes » (ACME-1234)
- > ...

### Statistiques
- Tickets critiques : 3
- Status agrégé : 8 ouverts, 4 résolus, 0 abandonnés
- Thèmes ouverts : Lenteur exports (5), Auth SSO (2)

## 2026-05-15 (8 nouveaux tickets depuis 2026-04-30)
...
```

Sortie = `knowledge/support/clients/<client>.md` (mis à jour cumulativement) + éventuels ajouts dans `knowledge/support/insights.md` et `knowledge/insights.md`.

<!-- Exemple d'usage :
  /support acme-corp
  → détecte MCP atlassian (outils mcp__atlassian__* dispos) → utilise
  → lit knowledge/support/clients/acme-corp.md → last_synced = 2026-05-15
  → JQL : project = ACME AND updated >= "2026-05-15" → 12 tickets
  → subagent sift → 3 thèmes (lenteur exports x5, auth SSO x2, UI export PDF x3) + 1 bug net (ACME-1267 : export PDF cassé sur caractères UTF-8 non-latin1, repro claire)
  → append section 2026-06-03 dans acme-corp.md
  → "lenteur exports" est forte (récurrente 3 sessions, 5 tickets) → propose ajout à support/insights.md → utilisateur valide
  → ACME-1267 = bug net → propose `bugs/acme-export-pdf-utf8/TICKET.md` → utilisateur valide → ticket prêt pour /code -->
