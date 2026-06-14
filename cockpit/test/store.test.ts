import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.ts";

test("Store persiste une session, ses transitions et ses événements", () => {
  const store = new Store(":memory:");
  const s = store.createSession({
    id: "s1",
    repo_path: "/r",
    type: "market-research",
    slug: "agentforce",
    branch: "research/agentforce",
    workdir: "/r",
    sdk_session_id: "sdk-1",
    runtime_state: "running",
    prompt: "/research agentforce",
  });
  assert.equal(s.runtime_state, "running");
  assert.ok(s.created_at);

  store.appendEvent("s1", "assistant", "bonjour");
  store.appendEvent("s1", "tool_use", "Write");
  store.setState("s1", "done");
  store.setSdkSessionId("s1", "sdk-final");

  const got = store.getSession("s1");
  assert.equal(got?.runtime_state, "done");
  assert.equal(got?.sdk_session_id, "sdk-final");

  const events = store.getEvents("s1");
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, "assistant");
  assert.equal(events[0].text, "bonjour");

  assert.equal(store.listSessions("/r").length, 1);
  assert.equal(store.listSessions("/autre").length, 0);
  store.close();
});
