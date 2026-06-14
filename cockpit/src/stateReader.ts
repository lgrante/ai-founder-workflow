// State Reader — pur lecteur, sans effet de bord. Dérive un BoardModel depuis les
// emplacements que la doctrine du kit fige déjà (cf. ARCHITECTURE.md §5).
// La source de vérité reste git/les fichiers ; le cockpit ne duplique rien.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
  BoardModel,
  FeatureCard,
  BacklogItem,
  BacklogStatut,
  BacklogPriorite,
  ContentChannel,
  DiscoverySummary,
  MilestoneProgress,
  StepTally,
} from "./domain/board.ts";
import { inspectRepo } from "./repoRegistry.ts";

const CHECKBOX = /^\s*[-*]\s*\[( |x|X)\]/;
const HEADING = /^##\s+(.*\S)\s*$/;

function listDirs(p: string): string[] {
  if (!existsSync(p)) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listVisibleFiles(p: string): string[] {
  if (!existsSync(p) || !statSync(p).isDirectory()) return [];
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name !== ".gitkeep")
    .map((d) => d.name);
}

/**
 * Avancement d'un PLAN.md : compte les cases (le seul statut d'avancement, doctrine
 * kit) globalement et par jalon (`## ...`). Une case hors de tout `##` compte au global.
 */
export function parsePlanProgress(planText: string): {
  steps: StepTally;
  milestones: MilestoneProgress[];
} {
  const milestones: MilestoneProgress[] = [];
  let global: StepTally = { done: 0, total: 0 };
  let current: MilestoneProgress | undefined;

  for (const line of planText.split(/\r?\n/)) {
    const h = line.match(HEADING);
    if (h) {
      current = { title: h[1], steps: { done: 0, total: 0 } };
      milestones.push(current);
      continue;
    }
    const c = line.match(CHECKBOX);
    if (c) {
      const checked = c[1].toLowerCase() === "x";
      global.total++;
      if (checked) global.done++;
      if (current) {
        current.steps.total++;
        if (checked) current.steps.done++;
      }
    }
  }
  // ne garde que les jalons qui contiennent réellement des étapes
  return { steps: global, milestones: milestones.filter((m) => m.steps.total > 0) };
}

/** Parse un frontmatter YAML simple (`key: value`, commentaires inline `#` tolérés). */
export function parseFrontmatter(md: string): Record<string, string> {
  const m = md.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/^\s*#.*$/, "").trimEnd();
    const kv = line.match(/^([^:#]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].trim();
    let val = kv[2].trim();
    val = val.replace(/\s+#.*$/, "").trim(); // commentaire en fin de valeur
    if (val) out[key] = val;
  }
  return out;
}

function readFeatures(repo: string): FeatureCard[] {
  const dir = join(repo, "features");
  return listDirs(dir)
    .filter((slug) => !slug.startsWith("_") && !slug.startsWith("."))
    .map((slug) => {
      const fdir = join(dir, slug);
      const specPath = join(fdir, "SPEC.md");
      const planPath = join(fdir, "PLAN.md");
      const hasPlan = existsSync(planPath);
      const { steps, milestones } = hasPlan
        ? parsePlanProgress(readFileSync(planPath, "utf8"))
        : { steps: { done: 0, total: 0 }, milestones: [] as MilestoneProgress[] };
      return { slug, hasSpec: existsSync(specPath), hasPlan, steps, milestones };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function normStatut(v: string | undefined): BacklogStatut {
  const s = (v ?? "").toLowerCase();
  return s === "idea" || s === "triaged" || s === "specced" || s === "dropped" ? s : "inconnu";
}
function normPriorite(v: string | undefined): BacklogPriorite {
  const s = (v ?? "").toUpperCase();
  return s === "P0" || s === "P1" || s === "P2" ? s : "inconnu";
}

function readBacklog(repo: string): BacklogItem[] {
  const dir = join(repo, "backlog");
  return listVisibleFiles(dir)
    .filter((f) => f.endsWith(".md") && f !== "_template.md")
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const fm = parseFrontmatter(readFileSync(join(dir, f), "utf8"));
      return {
        slug,
        titre: fm["titre"] || slug,
        statut: normStatut(fm["statut"]),
        priorite: normPriorite(fm["priorité"] ?? fm["priorite"]),
        source: fm["source"] || "inconnu",
      };
    })
    .sort((a, b) => a.priorite.localeCompare(b.priorite) || a.slug.localeCompare(b.slug));
}

const CONTENT_STATUSES = ["drafts", "scheduled", "posted", "wip", "published"] as const;

function readContent(repo: string): ContentChannel[] {
  const dir = join(repo, "content");
  return listDirs(dir)
    .map((channel) => {
      const cdir = join(dir, channel);
      const counts: Record<string, number> = {};
      for (const status of CONTENT_STATUSES) {
        const sdir = join(cdir, status);
        if (existsSync(sdir)) counts[status] = listVisibleFiles(sdir).length;
      }
      return { channel, counts };
    })
    .sort((a, b) => a.channel.localeCompare(b.channel));
}

function readDiscovery(repo: string): DiscoverySummary {
  const k = join(repo, "knowledge");
  const supportClients = listVisibleFiles(join(k, "support", "clients"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  const feedbackContacts = listVisibleFiles(join(k, "crm", "contacts")).filter(
    (f) => f.endsWith(".md") && f !== "_template.md",
  ).length;
  return {
    hasMarket: existsSync(join(k, "market")) && listVisibleFiles(join(k, "market")).length > 0,
    hasInsights: existsSync(join(k, "insights.md")),
    supportClients,
    feedbackContacts,
  };
}

/** Lit le board complet d'un repo cible. Non pilotable → BoardModel vide + raison. */
export function readBoard(repoPath: string): BoardModel {
  const status = inspectRepo(repoPath);
  if (!status.pilotable) {
    return {
      repoPath: status.path,
      pilotable: false,
      reason: status.reason,
      features: [],
      backlog: [],
      content: [],
      discovery: { hasMarket: false, hasInsights: false, supportClients: [], feedbackContacts: 0 },
    };
  }
  return {
    repoPath: status.path,
    pilotable: true,
    features: readFeatures(status.path),
    backlog: readBacklog(status.path),
    content: readContent(status.path),
    discovery: readDiscovery(status.path),
  };
}
