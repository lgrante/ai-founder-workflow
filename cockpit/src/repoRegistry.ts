// Repo Registry — détecte si un repo local est *pilotable* par le cockpit.
// Signal canonique : présence de `docs/WORKFLOW.md` à la racine du repo, exactement
// le même critère que `preflight-guard.py` du kit (cf. ARCHITECTURE.md §3/§4).
// Lecture seule, aucun effet de bord.

import { existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

export interface RepoStatus {
  /** chemin absolu normalisé du repo */
  path: string;
  /** vrai si docs/WORKFLOW.md existe à la racine */
  pilotable: boolean;
  /** raison de non-pilotabilité, le cas échéant */
  reason?: string;
}

/** Le fichier canonique installé par `/setup` Phase 2. Son absence = workflow non déployé. */
export const WORKFLOW_MARKER = join("docs", "WORKFLOW.md");

/**
 * Teste si un chemin local est pilotable. On ne remonte PAS vers la racine git ici :
 * le cockpit pilote des repos dont on lui donne la racine (le State Reader résout
 * relativement à ce chemin). Un chemin inexistant ou non-répertoire → non pilotable.
 */
export function inspectRepo(inputPath: string): RepoStatus {
  const path = resolve(inputPath);
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    return { path, pilotable: false, reason: "chemin introuvable ou pas un répertoire" };
  }
  const marker = join(path, WORKFLOW_MARKER);
  if (!existsSync(marker)) {
    return {
      path,
      pilotable: false,
      reason: "docs/WORKFLOW.md absent — le workflow n'est pas déployé (lance /setup)",
    };
  }
  return { path, pilotable: true };
}
