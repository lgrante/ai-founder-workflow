// Modèle de domaine — dérivé de la doctrine ai-founder-workflow (cf. ARCHITECTURE.md §3).
// Table déclarative unique : pilote l'UI (colonnes), le runner (cwd/branche) et,
// à partir de J2, les profils de permission. En J1 (lecture seule) seuls `axe` et
// les emplacements de sortie sont exploités par le State Reader.

export type Axe = "build" | "discovery" | "content" | "transverse";

export interface SessionTypeDef {
  /** identifiant du type, ex. "code", "post" */
  type: string;
  /** axe horizontal du kit */
  axe: Axe;
  /** slash-command associée */
  skill: string;
  /** préfixe de branche git (selon § Étiquette git du kit) */
  branchPrefix: string;
  /**
   * vrai si spec/code/test partagent la même branche `feat/<feature>`
   * (exception documentée du kit : une feature = une branche partagée).
   */
  sharedFeatureBranch?: boolean;
}

/** La table §3, comme donnée. Source unique de vérité du mapping type→branche. */
export const SESSION_TYPES: readonly SessionTypeDef[] = [
  { type: "spec", axe: "build", skill: "/spec", branchPrefix: "feat", sharedFeatureBranch: true },
  { type: "code", axe: "build", skill: "/code", branchPrefix: "feat", sharedFeatureBranch: true },
  { type: "test", axe: "build", skill: "/test", branchPrefix: "feat", sharedFeatureBranch: true },
  { type: "fix", axe: "build", skill: "/code", branchPrefix: "fix" },
  { type: "market-research", axe: "discovery", skill: "/research", branchPrefix: "research" },
  { type: "user-feedback", axe: "discovery", skill: "/feedback", branchPrefix: "feedback" },
  { type: "support", axe: "discovery", skill: "/support", branchPrefix: "support" },
  { type: "backlog", axe: "transverse", skill: "/backlog", branchPrefix: "backlog" },
  { type: "post", axe: "content", skill: "/post", branchPrefix: "post" },
  { type: "article", axe: "content", skill: "/article", branchPrefix: "article" },
  { type: "newsletter", axe: "content", skill: "/newsletter", branchPrefix: "newsletter" },
  { type: "report", axe: "content", skill: "/report", branchPrefix: "report" },
  { type: "status", axe: "transverse", skill: "/status", branchPrefix: "status" },
] as const;

export function sessionTypeByName(type: string): SessionTypeDef | undefined {
  return SESSION_TYPES.find((t) => t.type === type);
}
