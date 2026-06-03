---
name: report
description: Démarre une session report-<network> — pull les stats via le MCP du réseau (LinkedIn, Twitter/X, blog analytics, mailing tool…), archive le pull dans content/<network>/stats/, synthétise un rapport actionnable dans content/<network>/insights/.
disable-model-invocation: true
---
Tu démarres une session REPORT sur la performance de « $ARGUMENTS » (network = canal d'audience : `linkedin`, `twitter-x`, `blog`, `newsletter`…). Référence : `docs/WORKFLOW.md`.

C'est une session d'**analyse**, pas de création — sœur de `/support` côté découverte, mais focus sur ta performance audience (pas tes clients). Tu mesures, synthétises, archives ; les prochaines sessions `/post`, `/article`, `/newsletter` du même réseau liront ton rapport pour informer leurs drafts.

## Pipeline

1. Rappelle à l'utilisateur de nommer cette session `report-$ARGUMENTS` (via `/rename`). *(Tu ne peux pas renommer toi-même — c'est un rappel.)*

2. **Détecte la source de stats** dans cet ordre :
   - **Priorité 1 — MCP du réseau** : vérifie les outils MCP disponibles selon le préfixe :
     - LinkedIn → `mcp__linkedin__*` (ex. linkedin-scraper-mcp)
     - Twitter/X → `mcp__twitter__*` ou `mcp__x__*`
     - Blog → MCP analytics si configuré (Plausible, GA via wrapper, etc.)
     - Newsletter → MCP de l'outil mailing (Substack, Beehiiv, ConvertKit, Mailchimp…)
   - **Priorité 2 — Export manuel** : si pas de MCP, demande à l'utilisateur s'il a un CSV/JSON exporté depuis l'interface du réseau. Range-le dans `.cc-scratch/` pour la session, puis archive-le dans `stats/` après normalisation.
   - **Priorité 3 — Aucune source** : signale et abandonne. **Tu n'inventes jamais de chiffres.**

3. **Mode incrémental** (par défaut) :
   - Lis le rapport le plus récent dans `content/$ARGUMENTS/insights/` pour récupérer la fenêtre déjà couverte (date du dernier pull).
   - Pull les stats des posts publiés depuis cette date (ou cap par défaut : 30 derniers jours si premier rapport).
   - **Archive le pull brut** dans `content/$ARGUMENTS/stats/<YYYY-MM-DD>-snapshot.<json|md>` — fichiers append-only horodatés, jamais d'écrasement (traçabilité « d'où sort ce chiffre »).
   - Option **full refetch** si l'utilisateur passe `--full` ou si le dernier rapport est marqué `needs_full_resync: true`.

4. **Délègue le sift à un subagent** (obligatoire — évite de saturer ton contexte avec les raw stats) :
   - Le subagent reçoit la liste des posts + métriques (impressions, réactions, commentaires, partages, engagement rate, followers ; les colonnes varient selon le réseau).
   - Il extrait :
     - **KPIs cumulés** sur la fenêtre (impressions totales, réactions totales, engagement moyen, followers actuels).
     - **Tendance** post par post (trajectoire, % de croissance entre premier et dernier post).
     - **Format gagnant** (liste numérotée, récit, verbatim, repost, thread… quel format performe le mieux).
     - **Trade-offs détectés** (reach vs engagement, valeur vs produit explicite, timing de publication).
     - **Pattern d'engagement** (question miroir → +commentaires, longueur optimale, hashtags qui aident vs nuisent).
     - **Cadence** (régularité = effet compound ? trous = chutes de visibilité ?).
   - Il rend une synthèse structurée (5-8 insights max, chacun avec données chiffrées qui pointent vers le raw dump).

5. **Écris le rapport** dans `content/$ARGUMENTS/insights/<YYYY-MM-DD>-report.md` (+ `.html` via la convention dual md/html du repo). Structure :
   - **Header** : KPIs cumulés sur la fenêtre + delta vs rapport précédent.
   - **Trend** : trajectoire d'impressions post par post (ASCII chart ou table en md ; SVG en html).
   - **Posts détaillés** : table ou cards par post (date, format, impressions, réactions, engagement, statut produit/valeur).
   - **Insights** : 5-8 points avec données chiffrées + « pourquoi c'est important pour la suite ».
   - **Actions** : 4-6 recommandations concrètes avec **priorité** (haute / moyenne / basse) et **horizon** (cette semaine / ce mois / trimestre).
   - Frontmatter : `network`, `date_pull`, `window_start`, `window_end`, `total_posts`, `source` (mcp/manual).

6. **Stop** : ta session est finie. Pas de décision de publication ici, pas de nouveau spec. Les insights alimentent les prochaines sessions `/post`, `/article`, `/newsletter` du réseau (qui les liront au démarrage). **Si un motif structurant émerge sur 3+ rapports successifs**, propose à l'utilisateur d'en faire une règle dans `knowledge/content/brand-book.md` (ex. « toujours finir par une question miroir »).

## Cas limites

- **Aucun post sur la fenêtre** : signale, n'invente pas d'insights vides.
- **Échantillon trop petit (< 3 posts)** : disclaimer en tête du rapport « données insuffisantes pour conclure ; à reprendre quand ≥ 5 posts ».
- **MCP renvoie erreur d'auth** (token expiré, scope insuffisant) : signale clairement, propose fallback export manuel, n'invente pas le contenu.
- **Métriques manquantes** (ex. impressions n.c. pour reposts LinkedIn) : marque `n.c.` dans le rapport, ne devine pas.
- **Réseau non listé** ci-dessus (Bluesky, Mastodon, Threads…) : demande à l'utilisateur quel MCP / export il a, adapte le format. L'architecture du skill est extensible.
- **Interruption utilisateur** : ne reprends pas auto, attends instruction.

## À éviter

- **Inventer des chiffres** — toute donnée du rapport doit pointer vers le raw dump dans `stats/`.
- **Écrire un rapport sans archiver les raw dumps** — perd la traçabilité, le rapport devient invérifiable.
- **Déclencher de l'action commerciale** dans le rapport (« publie X demain ») — c'est `/post` qui décide ; toi tu rends des recommandations argumentées, pas des ordres.
- **Confondre stats et insights** : `stats/` = preuve brute (json, csv, dump md), `insights/` = synthèse actionnable (md + html). Les deux vivent séparément.
- **Charger les raw stats dans ta session principale** — toujours déléguer au subagent qui rend la synthèse compacte.
- **Mélanger plusieurs réseaux** dans un même rapport — un `/report` = un network. Pour comparer cross-network, écris un agrégat séparé après plusieurs rapports.

Sortie = `content/$ARGUMENTS/stats/<date>-snapshot.<ext>` (raw, append-only) + `content/$ARGUMENTS/insights/<date>-report.md` & `.html` (synthèse).

<!-- Exemple d'usage :
  /report linkedin
  → détecte mcp__linkedin__* (linkedin-scraper-mcp) → utilise
  → lit content/linkedin/insights/ → dernier rapport = 2026-05-15 → fenêtre depuis cette date
  → pull 5 posts publiés entre 2026-05-20 et 2026-05-29 → archive content/linkedin/stats/2026-06-03-snapshot.json
  → subagent sift → 6 insights : engagement 2× au-dessus B2B, format liste = reach max, posts produit = -38% reach,
                                  question miroir = +commentaires, cadence 3/sem = compound, reach > followers
  → écrit content/linkedin/insights/2026-06-03-report.md + .html
  → 6 reco priorisées : maintenir cadence (P1), programmer prochain post jeudi 08h30 (P1), question miroir systématique (P1),
                        ratio 80/20 valeur/produit (P2), format "note de terrain" récurrent (P2), re-sortir liste numérotée dans 7-10j (P3) -->
