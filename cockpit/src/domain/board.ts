// Types du board lu (BoardModel). Tout est DÉRIVÉ des fichiers du repo cible —
// rien ici n'est stocké en propre par le cockpit (cf. ARCHITECTURE.md §5).

export interface StepTally {
  done: number;
  total: number;
}

export interface MilestoneProgress {
  /** titre tel qu'écrit dans le PLAN, ex. "J1 — Panier → commande" */
  title: string;
  steps: StepTally;
}

/** Une feature de l'axe build, lue depuis features/<slug>/. */
export interface FeatureCard {
  slug: string;
  hasSpec: boolean;
  hasPlan: boolean;
  /** avancement global = somme des cases du PLAN (le seul statut, doctrine kit) */
  steps: StepTally;
  milestones: MilestoneProgress[];
}

export type BacklogStatut = "idea" | "triaged" | "specced" | "dropped" | "inconnu";
export type BacklogPriorite = "P0" | "P1" | "P2" | "inconnu";

/** Un item du backlog, lu depuis le frontmatter de backlog/<slug>.md. */
export interface BacklogItem {
  slug: string;
  titre: string;
  statut: BacklogStatut;
  priorite: BacklogPriorite;
  source: string;
}

/** Un channel d'audience, lu depuis content/<channel>/. */
export interface ContentChannel {
  channel: string;
  /** nombre de pièces par statut (drafts/scheduled/posted/wip/published) */
  counts: Record<string, number>;
}

/** Résumé léger de l'axe découverte (présence de signaux). */
export interface DiscoverySummary {
  hasMarket: boolean;
  hasInsights: boolean;
  supportClients: string[];
  feedbackContacts: number;
}

export interface BoardModel {
  repoPath: string;
  pilotable: boolean;
  /** raison si non pilotable (ex. "docs/WORKFLOW.md absent") */
  reason?: string;
  features: FeatureCard[];
  backlog: BacklogItem[];
  content: ContentChannel[];
  discovery: DiscoverySummary;
}
