// The hackathon page reads its campaign from one record (client 2026-11-17:
// one layout, the campaign's data). These check the pieces the sections build
// from it: the 1 vs 1 pairing, the group ranking, and the running campaign's words.
import test from "node:test";
import assert from "node:assert/strict";
import { GROUP, HACKATHON, competeLine, groupOf, groupStandings, inWords, matchesOf, unitLabel } from "../../.tmp-test/lib/hackathons/vibe-inventing.js";

const row = (id, votes, group = "", project = true) => ({
  p: { id, name: id, group, products: 3, published: 3, votes, referrals: 0, buildDays: 0, moved: 0, project: project ? { id: `${id}-x`, name: `${id} product`, image: "", thumb: "", video: "", summary: "" } : undefined },
  pts: votes,
  votes,
  rank: 0,
});

test("1 vs 1 pairs the products by votes: 1st v 2nd, 3rd v 4th; the odd one out waits", () => {
  const m = matchesOf([row("a", 5), row("b", 50), row("c", 20), row("d", 1, "", false), row("e", 30), row("f", 9)]);
  assert.deepEqual(
    m.map(({ a, b }) => [a.p.id, b.p.id]),
    [
      ["b", "e"],
      ["c", "f"],
    ],
  );
  assert.deepEqual(matchesOf([row("a", 5)]), []);
});

test("the group ranking sums each group's points and leaves out people in no group", () => {
  const g = groupStandings([row("a", 10, "X"), row("b", 4, ""), row("c", 7, "Y"), row("d", 5, "X")]);
  assert.deepEqual(
    g.map((x) => [x.name, x.people, x.pts]),
    [
      ["X", 2, 15],
      ["Y", 1, 7],
    ],
  );
});

test("the running campaign: individuals, university vs university, the board's top to the judges", () => {
  assert.equal(HACKATHON.unit, "solo");
  assert.equal(unitLabel(HACKATHON.unit), "Individuals");
  assert.equal(competeLine(HACKATHON.unit), "You compete as an individual");
  assert.equal(unitLabel("duel"), "1 vs 1");
  assert.equal(GROUP?.one, "university");
  assert.equal(groupOf(row("a", 1, "").p), "Open category");
  assert.equal(HACKATHON.winBy, "shortlist");
  assert.equal(inWords(HACKATHON.prizes.length), "three");
});
