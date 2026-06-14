// Modèle de domaine — dérivé de la doctrine ai-founder-workflow (cf. ARCHITECTURE.md §3).
// Table déclarative unique : pilote l'UI (colonnes), le runner (cwd/branche) et,
// à partir de J2, les profils de permission. En J1 (lecture seule) seuls `axe` et
// les emplacements de sortie sont exploités par le State Reader.

export type Axe = "build" | "discovery" | "content" | "transverse";

/**
 * Mode de permission Claude Code pour une session automatisée (cf. ARCHITECTURE.md §7).
 * On évite `bypassPermissions` aveugle : profils ciblés par type.
 */
export type PermissionMode = "acceptEdits" | "default" | "plan" | "bypassPermissions";

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
  /** mode de permission par défaut pour piloter ce type en headless */
  permissionMode: PermissionMode;
  /** liste blanche d'outils (vide = pas de restriction explicite) */
  allowedTools: readonly string[];
}

// Profils de permission réutilisés (cf. ARCHITECTURE.md §7).
// - lecture/écriture d'artefacts (discovery, content) : acceptEdits + outils ciblés.
// - build (/code) : acceptEdits mais les vraies décisions passent par les portes (J3).
const RW = ["Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch"] as const;
const CODE_TOOLS = [...RW, "Bash"] as const;

/** La table §3, comme donnée. Source unique de vérité du mapping type→branche→permissions. */
export const SESSION_TYPES: readonly SessionTypeDef[] = [
  { type: "spec", axe: "build", skill: "/spec", branchPrefix: "feat", sharedFeatureBranch: true, permissionMode: "acceptEdits", allowedTools: RW },
  { type: "code", axe: "build", skill: "/code", branchPrefix: "feat", sharedFeatureBranch: true, permissionMode: "acceptEdits", allowedTools: CODE_TOOLS },
  { type: "test", axe: "build", skill: "/test", branchPrefix: "feat", sharedFeatureBranch: true, permissionMode: "acceptEdits", allowedTools: CODE_TOOLS },
  { type: "fix", axe: "build", skill: "/code", branchPrefix: "fix", permissionMode: "acceptEdits", allowedTools: CODE_TOOLS },
  { type: "market-research", axe: "discovery", skill: "/research", branchPrefix: "research", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "user-feedback", axe: "discovery", skill: "/feedback", branchPrefix: "feedback", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "support", axe: "discovery", skill: "/support", branchPrefix: "support", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "backlog", axe: "transverse", skill: "/backlog", branchPrefix: "backlog", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "post", axe: "content", skill: "/post", branchPrefix: "post", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "article", axe: "content", skill: "/article", branchPrefix: "article", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "newsletter", axe: "content", skill: "/newsletter", branchPrefix: "newsletter", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "report", axe: "content", skill: "/report", branchPrefix: "report", permissionMode: "acceptEdits", allowedTools: RW },
  { type: "status", axe: "transverse", skill: "/status", branchPrefix: "status", permissionMode: "acceptEdits", allowedTools: RW },
] as const;

export function sessionTypeByName(type: string): SessionTypeDef | undefined {
  return SESSION_TYPES.find((t) => t.type === type);
}

/**
 * Résout la branche git d'une session selon l'étiquette du kit.
 * Build (spec/code/test) partage `feat/<slug>` ; sinon `<prefix>/<slug>`.
 * Les branches uniques (backlog) ignorent le slug.
 */
export function resolveBranch(def: SessionTypeDef, slug: string): string {
  if (def.branchPrefix === "backlog") return "backlog";
  return `${def.branchPrefix}/${slug}`;
}
