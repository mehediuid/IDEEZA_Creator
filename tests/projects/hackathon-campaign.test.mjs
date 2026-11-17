// A hackathon's page reads its campaign from one record (client 2026-11-17:
// one layout, the campaign's data), and the website lists every hackathon
// (owner 2026-11-17: several can run at once). These check the pieces the
// sections build from a record — the 1 vs 1 pairing, the group ranking, the
// running campaign's words — and the list: its order, statuses and links.
import test from "node:test";
import assert from "node:assert/strict";
import { VIBE_INVENTING, campaignOf, groupStandings, inWords, matchesOf } from "../../.tmp-test/lib/hackathons/vibe-inventing.js";
import { HACKATHONS, hackathonBySlug, listOrder, statusOf } from "../../.tmp-test/lib/hackathons/campaigns.js";

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
  const { HACKATHON, GROUP, competeLine, groupOf, unitLabel } = campaignOf(VIBE_INVENTING);
  assert.equal(HACKATHON.unit, "solo");
  assert.equal(unitLabel(HACKATHON.unit), "Individuals");
  assert.equal(competeLine(HACKATHON.unit), "You compete as an individual");
  assert.equal(unitLabel("duel"), "1 vs 1");
  assert.equal(GROUP?.one, "university");
  assert.equal(groupOf(row("a", 1, "").p), "Open category");
  assert.equal(HACKATHON.winBy, "shortlist");
  assert.equal(inWords(HACKATHON.prizes.length), "three");
});

const at = (iso) => Date.parse(iso);

test("every hackathon has its own link and id; the Ethiopia page keeps its board", () => {
  assert.equal(new Set(HACKATHONS.map((h) => h.slug)).size, HACKATHONS.length);
  assert.equal(new Set(HACKATHONS.map((h) => h.id)).size, HACKATHONS.length);
  assert.equal(hackathonBySlug("vibe-inventing-ethiopia"), VIBE_INVENTING);
  assert.equal(hackathonBySlug("nope"), null);
  // The running board is the one the page always drew: 64 builders.
  assert.equal(campaignOf(VIBE_INVENTING).PARTICIPANTS.length, 64);
  // Only the real campaign is not a sample.
  assert.deepEqual(HACKATHONS.filter((h) => !h.sample).map((h) => h.slug), ["vibe-inventing-ethiopia"]);
});

test("each record makes its own page data: groups, format, money, board", () => {
  const cup = campaignOf(hackathonBySlug("east-africa-1-vs-1"));
  assert.equal(cup.unitLabel(cup.HACKATHON.unit), "1 vs 1");
  assert.equal(cup.GROUP?.one, "country");
  assert.equal(cup.money(cup.prizePool), "8,000 USD");
  // It has not started: nobody has built yet, so its board is empty.
  assert.equal(cup.standings([]).length, 0);
  const sprint = campaignOf(hackathonBySlug("smart-home-sprint"));
  assert.equal(sprint.GROUP, null);
  assert.equal(sprint.groupOf(sprint.PARTICIPANTS[0]), "");
  assert.equal(sprint.HACKATHON.winBy, "points");
  assert.ok(sprint.PARTICIPANTS.every((p) => p.group === ""));
  assert.equal(campaignOf(hackathonBySlug("smart-home-sprint")), sprint, "made once per hackathon");
});

test("the list: running first, then starting soon, then ended; the server keeps the list's own order", () => {
  const now = at("2026-11-17T12:00:00+03:00");
  assert.deepEqual(listOrder(now).map((h) => h.slug), ["vibe-inventing-ethiopia", "east-africa-1-vs-1", "smart-home-sprint"]);
  assert.deepEqual(listOrder(null).map((h) => h.slug), HACKATHONS.map((h) => h.slug));
  // After the Ethiopia hackathon ends (and is judged), the one starting soon leads the list.
  const later = at("2026-11-25T12:00:00+03:00");
  assert.deepEqual(listOrder(later).map((h) => h.slug), ["east-africa-1-vs-1", "vibe-inventing-ethiopia", "smart-home-sprint"]);
  assert.equal(statusOf("registration"), "soon");
  assert.equal(statusOf("soon"), "soon");
  assert.equal(statusOf("live"), "live");
  assert.equal(statusOf("judging"), "judging");
  assert.equal(statusOf("results"), "ended");
});
