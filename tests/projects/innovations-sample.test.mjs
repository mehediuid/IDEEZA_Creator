// The sample Innovations posts (lib/innovations/sample-posts.ts): one full post per feed project,
// the approved smart-plant-watering-hub mockup to the letter, and seed threads that obey the
// comment rules (three levels, replyTo only at the nested level, ids unique per post).
import { test } from "node:test";
import assert from "node:assert/strict";

const { SAMPLE_POSTS, samplePostBySlug, samplePostOf, sampleCommentsOf } = await import(
  "../../.tmp-test/lib/innovations/sample-posts.js"
);
const { PROJECTS, CATEGORIES } = await import("../../.tmp-test/lib/feed.js");
const { STAGES } = await import("../../.tmp-test/lib/manual/journey.js");
const { SAMPLE_PEOPLE_IDS, personOf } = await import("../../.tmp-test/lib/innovations/people.js");
const { postIdOfSample } = await import("../../.tmp-test/lib/innovations/slug.js");
const { ME_ID } = await import("../../.tmp-test/lib/innovations/types.js");
const { MAX_DEPTH, depthOf } = await import("../../.tmp-test/lib/innovations/comments.js");

const NOW = Date.UTC(2026, 9, 13, 12, 0);
const MIN = 60_000;
const PIECE_ORDER = ["3d", "pcb", "code", "wiring", "parts"];
const REAL_STAGES = STAGES.map((s) => s.id).filter((id) => id !== "others");
const sentences = (s) => s.split(/(?<=[.!?])\s+/).filter(Boolean).length;

test("every feed project has a sample post, in feed order, with the feed's fields", () => {
  assert.equal(SAMPLE_POSTS.length, PROJECTS.length);
  PROJECTS.forEach((project, i) => {
    const post = SAMPLE_POSTS[i];
    assert.equal(post.id, postIdOfSample(project.id));
    assert.equal(post.slug, project.slug);
    assert.equal(post.source, "sample");
    assert.equal(post.projectId, null);
    assert.equal(post.title, project.title);
    assert.equal(post.category, CATEGORIES.find((c) => c.id === project.category).label);
    assert.equal(post.sharedAt, project.createdAt);
    assert.equal(post.createdAt, project.createdAt);
    assert.ok(post.updatedAt > post.createdAt, `${post.slug} updatedAt`);
    assert.deepEqual(post.creator, personOf(project.creator.id));
    assert.equal(post.minted, project.minted);
    assert.deepEqual(post.base, { appreciations: project.appreciations, views: project.views });
    assert.equal(post.shared, true);
    assert.deepEqual(samplePostBySlug(project.slug), post);
  });
  assert.equal(samplePostBySlug("no-such-post"), null);
});

test("slugs and ids are unique and match the feed", () => {
  assert.equal(new Set(SAMPLE_POSTS.map((p) => p.slug)).size, SAMPLE_POSTS.length);
  assert.equal(new Set(SAMPLE_POSTS.map((p) => p.id)).size, SAMPLE_POSTS.length);
  assert.deepEqual(
    SAMPLE_POSTS.map((p) => p.slug),
    PROJECTS.map((p) => p.slug),
  );
});

test("every post's copy, stage, licence and listing follow the rules", () => {
  for (const post of SAMPLE_POSTS) {
    const at = post.slug;
    assert.ok(post.story.trim().length > 0 && post.story.length <= 500, `${at} story length ${post.story.length}`);
    assert.ok(post.description.length > 0 && post.description.length <= 600, `${at} description length`);
    const n = sentences(post.description);
    assert.ok(n >= 2 && n <= 4, `${at} description has ${n} sentences`);
    for (const text of [post.story, post.description]) {
      assert.ok(!text.includes("—"), `${at} has an em-dash`);
      assert.ok(!/\p{Extended_Pictographic}/u.test(text), `${at} has an emoji`);
    }
    assert.ok(REAL_STAGES.includes(post.stage), `${at} stage ${post.stage}`);
    if (post.minted) {
      assert.ok(["Commercial use", "Personal use"].includes(post.license), `${at} license`);
      assert.equal(post.chain, "Polygon");
    } else {
      assert.equal(post.license, null);
      assert.equal(post.chain, null);
      assert.equal(post.listing, null, `${at} listing without a mint`);
    }
    if (post.listing) {
      assert.equal(post.listing.href, "/marketplace");
      assert.ok(post.listing.rows.length > 0);
      for (const row of post.listing.rows) assert.match(row.price, /^\d+(\.\d+)? ETH$/);
    }
    assert.ok(post.network === null || (typeof post.network === "string" && post.network.length > 0));
  }
  const minted = SAMPLE_POSTS.filter((p) => p.minted);
  const listed = minted.filter((p) => p.listing);
  assert.ok(listed.length >= minted.length / 3 && listed.length <= (minted.length * 2) / 3, `${listed.length} of ${minted.length} listed`);
  // Spread over the real stages, mostly Prototype Development … Pilot Production Run.
  const stages = new Set(SAMPLE_POSTS.map((p) => p.stage));
  assert.equal(stages.size, REAL_STAGES.length);
  const middle = REAL_STAGES.slice(REAL_STAGES.indexOf("prototype-development"), REAL_STAGES.indexOf("pilot-production-run") + 1);
  assert.ok(SAMPLE_POSTS.filter((p) => middle.includes(p.stage)).length > SAMPLE_POSTS.length / 2);
});

test("every post has products with pieces, specs and parts, and partsCount adds up", () => {
  let twoProducts = 0;
  for (const post of SAMPLE_POSTS) {
    const at = post.slug;
    assert.ok(post.products.length >= 1, `${at} products`);
    if (post.products.length > 1) twoProducts += 1;
    const ids = post.products.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${at} product ids`);
    post.products.forEach((product, i) => {
      assert.match(product.id, /^[a-z0-9-]+$/, `${at} product id`);
      assert.ok(product.name && product.summary, `${at} product name`);
      if (i === 0) assert.equal(product.image, PROJECTS.find((p) => p.slug === at).image, `${at} first product image`);
      assert.ok(product.pieces.length > 0);
      assert.deepEqual(product.pieces, PIECE_ORDER.filter((x) => product.pieces.includes(x)), `${at} pieces order`);
      assert.ok(product.specs.length >= 4 && product.specs.length <= 6, `${at}/${product.id} specs ${product.specs.length}`);
      for (const s of product.specs) assert.ok(s.label && s.value);
      assert.ok(product.parts.length >= 6 && product.parts.length <= 18, `${at}/${product.id} parts ${product.parts.length}`);
      for (const p of product.parts) assert.ok(p.name && p.use && Number.isInteger(p.qty) && p.qty > 0, `${at} part ${p.name}`);
      assert.equal(product.build, null);
    });
    assert.equal(post.partsCount, post.products.reduce((n, p) => n + p.parts.length, 0), `${at} partsCount`);
    // Media: images only, the cover first, then every product image that differs.
    assert.ok(post.media.every((m) => m.kind === "image" && m.src && m.alt && m.label));
    assert.equal(post.media[0].label, "Cover");
    assert.equal(post.media[0].src, PROJECTS.find((p) => p.slug === at).image);
    assert.equal(new Set(post.media.map((m) => m.src)).size, post.media.length, `${at} media repeats`);
  }
  assert.ok(twoProducts >= 8 && twoProducts <= 16, `${twoProducts} posts with two products`);
  assert.ok(SAMPLE_POSTS.some((p) => p.products.some((x) => x.pieces.length < 5)), "a few products lack a piece");
});

test("samplePostOf and sampleCommentsOf are deterministic", () => {
  for (const project of PROJECTS) {
    assert.deepEqual(samplePostOf(project), samplePostOf(project));
    const id = postIdOfSample(project.id);
    assert.deepEqual(sampleCommentsOf(id, NOW), sampleCommentsOf(id, NOW));
  }
  // Fresh objects: changing one call's result does not leak into the next.
  const a = samplePostOf(PROJECTS[11]);
  a.products[0].parts.push({ name: "x", qty: 1, use: "y" });
  assert.equal(samplePostOf(PROJECTS[11]).products[0].parts.length, 18);
});

test("a project without a hand-written entry still gets a full post from its category", () => {
  const project = { ...PROJECTS[2], id: "p99", slug: "e-paper-badge", title: "E-paper badge", minted: true };
  const post = samplePostOf(project);
  assert.equal(post.id, "sample:p99");
  assert.equal(post.slug, "e-paper-badge");
  assert.equal(post.category, "Wearables");
  assert.ok(post.story.includes("e-paper badge") && post.story.length <= 500);
  assert.ok(post.description.startsWith("An e-paper badge"));
  assert.ok(REAL_STAGES.includes(post.stage));
  assert.ok(post.products.length === 1 && post.products[0].parts.length >= 6 && post.products[0].specs.length >= 4);
  assert.equal(post.partsCount, post.products[0].parts.length);
  assert.ok(["Commercial use", "Personal use"].includes(post.license));
  assert.deepEqual(samplePostOf(project), post);
  assert.deepEqual(sampleCommentsOf("sample:p99", NOW), []);
});

test("smart-plant-watering-hub matches the approved mockup", () => {
  const post = samplePostBySlug("smart-plant-watering-hub");
  assert.equal(post.id, "sample:p12");
  assert.equal(post.creator.id, "c4");
  assert.equal(post.creator.name, "Aiko Tanaka");
  assert.equal(post.category, "IoT");
  assert.equal(post.minted, true);
  assert.equal(
    post.story,
    "I kept killing my balcony herbs every time I travelled. This hub waters up to four pots from one 5 L tank, using soil moisture instead of a timer. Two probes have run on my balcony for six weeks on one charge. If you build one, tell me how your soil readings compare.",
  );
  assert.equal(
    post.description,
    "A Wi-Fi watering hub for up to four pots. Each capacitive probe reports soil moisture over a low-power mesh, and the hub opens a pump channel when a pot drops below its threshold, then logs every watering. It runs from a 5 V USB-C supply, with an optional 18650 cell in each probe. Set thresholds and see the history on the hub's OLED or in the small dashboard it serves on your network.",
  );
  assert.equal(post.stage, "testing-refinement");
  assert.equal(post.network, "Mesh · 1 hub, 4 probes");
  assert.equal(post.license, "Commercial use");
  assert.equal(post.chain, "Polygon");
  assert.deepEqual(post.listing, {
    rows: [
      { label: "Whole project (Main NFT)", price: "0.40 ETH" },
      { label: "Physical copy · 2 of 30 sold", price: "0.05 ETH" },
      { label: "Virtual copy", price: "0.02 ETH" },
    ],
    href: "/marketplace",
  });
  assert.deepEqual(
    post.media.map((m) => [m.kind, m.src, m.label]),
    [
      ["image", "/innovations/smart-plant-watering-hub.png", "Cover"],
      ["image", "/innovations/soil-moisture-mesh-network.png", "Soil Probe"],
    ],
  );

  const [hub, probe] = post.products;
  assert.equal(post.products.length, 2);
  assert.equal(hub.id, "hub");
  assert.equal(hub.name, "Watering Hub");
  assert.equal(hub.summary, "ESP32-C3 controller, 4 pump channels, small OLED");
  assert.equal(hub.image, "/innovations/smart-plant-watering-hub.png");
  assert.deepEqual(hub.pieces, PIECE_ORDER);
  assert.deepEqual(
    hub.specs.map((s) => [s.label, s.value]),
    [
      ["Controller", "ESP32-C3"],
      ["Power", "5 V USB-C"],
      ["Radio", "Wi-Fi + 802.15.4 mesh"],
      ["Outputs", "4 pumps, 500 mA each"],
      ["Display", "0.96 in OLED"],
      ["Size", "86 × 86 × 42 mm"],
    ],
  );
  assert.deepEqual(
    hub.parts.map((p) => [p.name, p.qty, p.use]),
    [
      ["ESP32-C3-MINI-1 module", 1, "Controller, Wi-Fi"],
      ["SSD1306 0.96 in OLED", 1, "Display"],
      ["AO3400A N-MOSFET", 4, "Pump switches"],
      ["1N5819 Schottky diode", 4, "Flyback"],
      ["5 V mini submersible pump", 4, "Watering"],
      ["USB-C receptacle, 16-pin", 1, "Power in"],
      ["AMS1117-3.3 regulator", 1, "3.3 V rail"],
      ["JST-PH 2-pin connector", 4, "Pump leads"],
      ["10 kΩ resistor, 0603", 6, "Pull-ups"],
      ["100 nF capacitor, 0603", 8, "Decoupling"],
      ["22 µF capacitor, 0805", 2, "Bulk"],
      ["6 mm tactile switch", 2, "Menu, reset"],
      ["WS2812B LED", 1, "Status"],
      ["Silicone tubing, 4 mm, 1 m", 4, "Water lines"],
      ["4-way manifold", 1, "Water lines"],
      ["5 L tank with lid", 1, "Reservoir"],
      ["M3 × 8 screw", 6, "Enclosure"],
      ["Enclosure, 3D printed", 1, "PETG"],
    ],
  );
  assert.equal(probe.id, "probe");
  assert.equal(probe.name, "Soil Probe");
  assert.equal(probe.summary, "Capacitive moisture probe on a low-power mesh, one per pot");
  assert.equal(probe.image, "/innovations/soil-moisture-mesh-network.png");
  assert.deepEqual(
    probe.specs.map((s) => [s.label, s.value]),
    [
      ["Controller", "nRF52840"],
      ["Power", "18650 cell or 5 V"],
      ["Sensor", "Capacitive, 0–100 %"],
      ["Radio", "802.15.4 mesh"],
      ["Battery life", "About 6 weeks"],
      ["Size", "48 × 48 × 30 mm"],
    ],
  );
  assert.deepEqual(
    probe.parts.map((p) => [p.name, p.qty, p.use]),
    [
      ["nRF52840 module", 1, "Mesh radio"],
      ["Capacitive sensing pad (on PCB)", 1, "Moisture"],
      ["TLV9001 op-amp", 1, "Sensor front end"],
      ["18650 holder", 1, "Battery"],
      ["TP4056 charger", 1, "Charging"],
      ["MCP1700-3.3 regulator", 1, "3.3 V rail"],
      ["100 nF capacitor, 0603", 4, "Decoupling"],
      ["10 kΩ resistor, 0603", 3, "Divider"],
      ["Enclosure, 3D printed", 1, "Coated stake"],
    ],
  );
  assert.equal(post.partsCount, 27);
});

test("smart-plant-watering-hub's seeded thread matches the mockup", () => {
  const list = sampleCommentsOf("sample:p12", NOW);
  const byId = new Map(list.map((c) => [c.id, c]));
  const ago = (c) => (NOW - c.createdAt) / MIN;
  // [author, minutes ago, likes, parent's author (null = on the post), body start]
  const expected = [
    ["c2", 300, 21, null, "Which probe firmware handles the mesh retries? Mine drops packets when the balcony door is closed. Did you raise the radio power or add a repeater?"],
    ["c4", 240, 9, "c2", "I raised TX power to +4 dBm and added a retry with backoff in mesh.c. Any hub on USB power also relays for the probes near it, so a second hub by the door fixes it too."],
    ["c3", 120, 3, "c4", "Same here. +4 dBm was enough through one wall. Thanks for writing it up."],
    ["c8", 180, 1, "c2", "Is relay mode on by default, or do I flash a different build for the hub?"],
    ["c6", 90, 2, "c2", "How is battery life on the probes with the higher TX power? Still around six weeks?"],
    ["c1", 60, 0, "c2", "Following this. Same problem here behind a brick wall."],
    ["c5", 1440, 14, null, "Built one this weekend for my greenhouse with a 3 L tank. The OLED is great, but the pump is louder than I expected at night, so I moved it into a cupboard and ran the tubing through the door frame. Would a quieter peristaltic pump work on the same driver, or does it need a bigger MOSFET? Also, the lid clips were a little tight on my printer and I had to scale them to 101%."],
    ["c4", 1380, 6, "c5", "Great build! A 12 V peristaltic pump needs its own supply, and the AO3400A on the board can switch it. I will add it as an option in the parts list."],
    ["c7", 1200, 4, "c5", "The Kamoer NKP pumps are quiet. I use one on a similar setup."],
    ["c5", 1100, 1, "c5", "Thanks both, ordering one."],
    ["c7", 40, 2, null, "Could the probes report soil temperature too? It would help with seedlings in spring."],
    ["k1", 2000, 0, null, "Cheap pumps here!!! Check the link in my profile, 70% off today only."],
    ["c1", 2880, 5, null, "Love that it waters by moisture and not on a timer. How do you calibrate dry and wet for different soils?"],
  ];
  assert.equal(list.length, expected.length);
  expected.forEach(([author, minutes, likes, parentAuthor, body], i) => {
    const c = list[i];
    assert.equal(c.postId, "sample:p12");
    assert.equal(c.authorId, author, `#${i} author`);
    assert.equal(ago(c), minutes, `#${i} time`);
    assert.equal(c.likes, likes, `#${i} likes`);
    assert.equal(c.body, body, `#${i} body`);
    assert.equal(c.parentId === null ? null : byId.get(c.parentId).authorId, parentAuthor, `#${i} parent`);
    assert.equal(c.likedByMe, false);
    assert.equal(c.deletedAt, null);
    assert.equal(c.replyTo, null);
  });
  // Diego's nested reply sits under Aiko's reply, which sits under Sora's comment.
  assert.equal(list[2].parentId, list[1].id);
  assert.equal(list[1].parentId, list[0].id);
  // Aiko's reply was edited; Kai's spam is hidden by the maker; Liam's comment carries a photo.
  assert.ok(list[1].editedAt !== null && list[1].editedAt > list[1].createdAt && list[1].editedAt <= NOW);
  assert.ok(list.filter((c) => c !== list[1]).every((c) => c.editedAt === null));
  assert.ok(list[11].hiddenAt !== null && list[11].hiddenAt > list[11].createdAt && list[11].hiddenAt <= NOW);
  assert.ok(list.filter((c) => c !== list[11]).every((c) => c.hiddenAt === null));
  assert.equal(list[6].image, "/innovations/greenhouse-climate-node.jpg");
  assert.ok(list.filter((c) => c !== list[6]).every((c) => c.image === null));
});

test("every seeded thread obeys the comment rules", () => {
  let withComments = 0;
  let creatorAnswers = 0;
  for (const post of SAMPLE_POSTS) {
    const list = sampleCommentsOf(post.id, NOW);
    if (list.length === 0) continue;
    withComments += 1;
    const ids = new Set(list.map((c) => c.id));
    assert.equal(ids.size, list.length, `${post.slug} ids unique`);
    const tops = list.filter((c) => c.parentId === null);
    assert.ok(tops.length >= 1 && tops.length <= 6, `${post.slug} has ${tops.length} comments`);
    for (const c of list) {
      assert.equal(c.postId, post.id);
      assert.ok(c.parentId === null || ids.has(c.parentId), `${c.id} parent exists`);
      const depth = depthOf(c, list);
      assert.ok(depth <= MAX_DEPTH, `${c.id} depth ${depth}`);
      if (c.replyTo !== null) {
        assert.equal(depth, 2, `${c.id} replyTo only at the nested level`);
        assert.ok(SAMPLE_PEOPLE_IDS.includes(c.replyTo));
      }
      assert.ok(SAMPLE_PEOPLE_IDS.includes(c.authorId), `${c.id} author ${c.authorId}`);
      assert.notEqual(c.authorId, ME_ID);
      assert.equal(c.likedByMe, false);
      assert.ok(Number.isInteger(c.likes) && c.likes >= 0);
      assert.ok(c.createdAt < NOW && c.body.length > 0 && c.body.length <= 1000);
      if (c.parentId !== null) assert.ok(c.createdAt > list.find((p) => p.id === c.parentId).createdAt, `${c.id} after its parent`);
      if (c.editedAt !== null) assert.ok(c.editedAt >= c.createdAt);
      if (c.hiddenAt !== null) assert.ok(c.hiddenAt >= c.createdAt);
      assert.equal(c.deletedAt, null);
    }
    if (list.some((c) => c.parentId !== null && c.authorId === post.creator.id)) creatorAnswers += 1;
  }
  // About 40 % of posts show the empty state.
  const empty = SAMPLE_POSTS.length - withComments;
  assert.ok(empty >= SAMPLE_POSTS.length * 0.3 && empty <= SAMPLE_POSTS.length * 0.5, `${empty} posts without comments`);
  assert.ok(creatorAnswers >= withComments - 2, "the creator answers in most threads");
  assert.deepEqual(sampleCommentsOf("sample:nope", NOW), []);
  assert.deepEqual(sampleCommentsOf("mine:p12", NOW), []);
  // Times follow `now`.
  const later = sampleCommentsOf("sample:p12", NOW + 5 * MIN);
  assert.equal(later[0].createdAt, sampleCommentsOf("sample:p12", NOW)[0].createdAt + 5 * MIN);
});
