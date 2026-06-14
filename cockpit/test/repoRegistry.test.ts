import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inspectRepo } from "../src/repoRegistry.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sample = join(here, "fixtures", "sample-repo");
const notsetup = join(here, "fixtures", "notsetup-repo");

test("repo avec docs/WORKFLOW.md → pilotable", () => {
  const r = inspectRepo(sample);
  assert.equal(r.pilotable, true);
  assert.equal(r.reason, undefined);
});

test("repo sans docs/WORKFLOW.md → non pilotable avec raison", () => {
  const r = inspectRepo(notsetup);
  assert.equal(r.pilotable, false);
  assert.match(r.reason ?? "", /WORKFLOW\.md/);
});

test("chemin inexistant → non pilotable", () => {
  const r = inspectRepo(join(here, "fixtures", "nope-does-not-exist"));
  assert.equal(r.pilotable, false);
});
