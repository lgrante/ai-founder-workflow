import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parsePlanProgress, parseFrontmatter, readBoard } from "../src/stateReader.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sample = join(here, "fixtures", "sample-repo");

test("parsePlanProgress compte cases globales et par jalon", () => {
  const plan = [
    "# PLAN — démo",
    "## Jalon J1",
    "- [x] étape 1",
    "- [x] étape 2",
    "## Jalon J2",
    "- [x] étape 3",
    "- [ ] étape 4",
    "- [ ] étape 5",
  ].join("\n");
  const { steps, milestones } = parsePlanProgress(plan);
  assert.deepEqual(steps, { done: 3, total: 5 });
  assert.equal(milestones.length, 2);
  assert.deepEqual(milestones[0].steps, { done: 2, total: 2 });
  assert.deepEqual(milestones[1].steps, { done: 1, total: 3 });
});

test("parsePlanProgress ignore les jalons sans étape", () => {
  const { milestones } = parsePlanProgress("## Vide\ntexte\n## Avec\n- [ ] x");
  assert.equal(milestones.length, 1);
  assert.equal(milestones[0].title, "Avec");
});

test("parseFrontmatter lit priorité accentuée et ignore les commentaires", () => {
  const md = "---\ntitre: Test\nstatut: triaged   # commentaire\npriorité: P0\n---\ncorps";
  const fm = parseFrontmatter(md);
  assert.equal(fm["titre"], "Test");
  assert.equal(fm["statut"], "triaged");
  assert.equal(fm["priorité"], "P0");
});

test("readBoard dérive features, backlog, content, discovery du repo fixture", () => {
  const b = readBoard(sample);
  assert.equal(b.pilotable, true);

  // features : checkout-flow (4/7, spec+plan) et onboarding (spec sans plan)
  const checkout = b.features.find((f) => f.slug === "checkout-flow");
  assert.ok(checkout);
  assert.equal(checkout.hasSpec, true);
  assert.equal(checkout.hasPlan, true);
  assert.deepEqual(checkout.steps, { done: 4, total: 7 });
  assert.equal(checkout.milestones.length, 3);

  const onboarding = b.features.find((f) => f.slug === "onboarding");
  assert.ok(onboarding);
  assert.equal(onboarding.hasPlan, false);
  assert.deepEqual(onboarding.steps, { done: 0, total: 0 });

  // backlog : 2 items (le _template.md est exclu), P0 trié avant P2
  assert.equal(b.backlog.length, 2);
  assert.equal(b.backlog[0].priorite, "P0");
  assert.equal(b.backlog[0].statut, "triaged");

  // content : linkedin drafts=2 posted=1, blog wip=1
  const linkedin = b.content.find((c) => c.channel === "linkedin");
  assert.equal(linkedin?.counts["drafts"], 2);
  assert.equal(linkedin?.counts["posted"], 1);
  const blog = b.content.find((c) => c.channel === "blog");
  assert.equal(blog?.counts["wip"], 1);

  // discovery
  assert.equal(b.discovery.hasMarket, true);
  assert.equal(b.discovery.hasInsights, true);
  assert.deepEqual(b.discovery.supportClients, ["acme-corp"]);
});

test("readBoard sur repo non setupé → vide + raison", () => {
  const b = readBoard(join(here, "fixtures", "notsetup-repo"));
  assert.equal(b.pilotable, false);
  assert.match(b.reason ?? "", /WORKFLOW/);
  assert.equal(b.features.length, 0);
});
