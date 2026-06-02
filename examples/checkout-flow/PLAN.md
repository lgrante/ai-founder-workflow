# PLAN — checkout-flow

> Exemple travaillé. Produit par `code-checkout-flow` en **plan mode** après exploration du codebase, validé avant implémentation.
> Les cases cochées sont **le seul statut d'avancement**. Chaque étape est rattachée à un critère du SPEC.
> État illustré : **J1 terminé**, **J2 en cours** (l'étape paiement-refusé est rouge → en correction).

## Jalon J1 — Panier → commande  *(C1, C4, C5)*
- [x] **Étape 1 — Modèle `Order` + service `createOrderFromCart`** *(→ C1)*
  Fichiers : `src/orders/order.model.ts`, `src/orders/order.service.ts`.
  Filet rapide (subagent, depuis C1) : la commande reprend articles/quantités du panier.
- [x] **Étape 2 — Décrément de stock transactionnel** *(→ C1, C4)*
  Fichiers : `src/orders/order.service.ts`, `src/inventory/stock.service.ts`.
  Filet : stock décrémenté d'autant ; rupture détectée → commande refusée, article signalé.
  *Note : hook rouge au 1er essai (stock non décrémenté car hors transaction) → corrigé, vert.*
- [x] **Étape 3 — Idempotence sur la validation** *(→ C5)*
  Fichiers : `src/orders/order.controller.ts` (clé d'idempotence).
  Filet : deux requêtes avec la même clé → une seule commande.

## Jalon J2 — Paiement  *(C2, C3)*
- [x] **Étape 4 — Adaptateur prestataire (port + impl)** *(→ C2, C3)*
  Fichiers : `src/payments/payment.port.ts`, `src/payments/provider.adapter.ts`.
  Filet (intégration rapide) : appel prestataire mocké, mapping accepté/refusé.
- [ ] **Étape 5 — Paiement refusé : message + panier conservé** *(→ C2)*  ⟵ **en cours (hook rouge)**
  Fichiers : `src/payments/checkout.service.ts`, `src/cart/cart.service.ts`.
  Filet (depuis C2) : sur refus, panier inchangé + erreur claire.
  *Rouge : le panier est vidé avant la confirmation de paiement. Cause identifiée, correction en cours (1re tentative).*
- [ ] **Étape 6 — Paiement accepté : statut `payée`, panier vidé, récap** *(→ C3)*
  Fichiers : `src/payments/checkout.service.ts`, `src/orders/order.service.ts`.

## Jalon J3 — Récapitulatif & finitions  *(C6)*
- [ ] **Étape 7 — Écran de confirmation (n° commande + montant), responsive** *(→ C3, C6)*
  Fichiers : `src/web/checkout/Confirmation.tsx`.
  *C6 = revue humaine au gate (lisibilité mobile), pas d'assertion automatique.*

---
**Validation indépendante** : à chaque jalon, `test-checkout-flow` (session fraîche) écrit les e2e depuis le SPEC, puis **gate humain**. J1 validé. J2 : e2e à lancer une fois l'étape 5 verte.
