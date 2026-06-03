# SPEC — checkout-flow

> Exemple travaillé (issu du repo kit `ai-founder-workflow`). Montre à quoi ressemble un `SPEC.md` réel.
> Produit par une session `spec-checkout-flow`. Lu ensuite par `code-checkout-flow` puis `test-checkout-flow`.

## Description
Permettre à un client connecté, avec un panier non vide, de **passer commande et de payer** en un parcours court.
Aujourd'hui le panier existe mais il n'y a pas de tunnel de commande.

**Utilisateur visé** : client connecté, panier déjà rempli.
**Origine** : motif récurrent en découverte — `knowledge/insights.md` (« panier perdu quand le paiement est refusé », 3 contacts).

**Hors périmètre (explicite)** :
- création de compte / authentification (déjà en place) ;
- gestion des promotions et codes promo ;
- facturation comptable / export ;
- moyens de paiement autres que carte (wallets → voir `knowledge/market/`, feature ultérieure).

## Critères d'acceptation
Définition de « fini ». Observables sans connaître l'implémentation. Référence de **tous** les tests.

- **C1** — Étant donné un panier non vide, Quand le client valide la commande, Alors une commande est créée avec les bons articles/quantités **et** le stock de chaque article est décrémenté d'autant.
- **C2** — Étant donné un paiement **refusé** par le prestataire, Quand le client revient au tunnel, Alors un message d'erreur clair est affiché **et** le panier est **conservé à l'identique** (rien n'est perdu).
- **C3** — Étant donné un paiement **accepté**, Quand il aboutit, Alors la commande passe au statut `payée`, le panier est vidé, et un récapitulatif (n° de commande + montant) est affiché.
- **C4** — Étant donné un panier dont un article est passé en **rupture** entre l'ajout et la validation, Quand le client valide, Alors la commande **n'est pas** créée et l'article en cause est signalé.
- **C5** — Étant donné un même clic de validation rejoué (double-soumission / réseau), Quand la requête arrive deux fois, Alors **une seule** commande est créée (idempotence).
- **C6** *(revue humaine)* — Le récapitulatif est lisible sur mobile (≤ 375 px de large) sans défilement horizontal. *Non vérifiable automatiquement — à valider au gate.*

## Jalons
Tranches user-facing successives. Chaque jalon = point de contrôle e2e + gate humain.

- **J1 — Panier → commande** : créer la commande depuis le panier, gérer le stock et la rupture. Couvre **C1, C4, C5**.
- **J2 — Paiement** : brancher le prestataire, gérer accepté / refusé, finaliser. Couvre **C2, C3**.
- **J3 — Récapitulatif & finitions** : écran de confirmation soigné. Couvre **C6** (+ revue mobile).
