// The web's "Which project?" question (owner 2026-11-24, same as the phone f25da9e2): several
// products from Home's AI always start a NEW project, so they are only asked its name; one product
// gets two clear radio choices, New project (picked first, its name field inside) and A project I
// have (the projects inside); a chat from a project's Add a product keeps that project. The Build
// gate's plan card offers no "Use a project I have" for several products.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("setup question: several products only name a new project; one product picks New project or A project I have", () => {
  const src = read("components/create/setup-turn.tsx");
  assert.match(src, /const choosing = \(!multi && projects\.length > 0\) \|\| addTo !== null;/);
  assert.match(src, /const mode = touchedMode \?\? \(addTo \? "existing" : "new"\);/, "New project is picked first, Add a product's project when there is one");
  assert.match(src, /`\$\{extra\.length \+ 1\} products belong together, so they start one new project\.`/);
  assert.doesNotMatch(src, /so they go in one project: one you have, or a new one/);
  assert.doesNotMatch(src, /label: "\+ Start a new project"/);
  assert.match(src, /"Start a new project with it, or add it to one you have\."/);
  assert.match(src, /role="radiogroup"/);
  assert.match(src, /title: "New project"/);
  assert.match(src, /title: "A project I have"/);
  assert.match(src, /<Radio checked=\{on\} decorative size="sm"/);
  // The answer names a new project or an existing one, never both.
  assert.match(src, /\? \{ projectId: "", projectName: projectName\.trim\(\), picked: extra\.map\(\(c\) => c\.id\) \}/);
  assert.match(src, /: \{ projectId, projectName: "", picked: extra\.map\(\(c\) => c\.id\) \}/);
});

test("Build gate: no 'Use a project I have' for several products", () => {
  const chat = read("components/create/concept-chat.tsx");
  assert.match(chat, /return t\?\.role === "setup" && !!t\.answer && t\.answer\.picked\.length > 0;/);
  assert.match(chat, /projects: gateMulti \? \[\] : setupProjects,/);
});

test("Save: several products never get to join a project at Save; a chosen project (Add a product) is kept", () => {
  const save = read("lib/manual/save-step.ts");
  assert.match(save, /const canJoin = single && projects\.length > 0;/);
  assert.match(save, /if \(chosen\) return \{ kind: "join", project: chosen \};/);
});
