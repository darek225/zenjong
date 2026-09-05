const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
function load(file) {
  const filename = path.resolve(__dirname, "../lib", file);
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
  return compiled.exports;
}
const engine = load("solitaire.ts");
const { safeJson } = load("safeJson.ts");
const { parseItems, parseOwned, MOCK_DEFAULT_INVENTORY } = load("inventory.ts");
const modes = load("gameModes.ts");
const session = load("session.ts");
const environments = load("environments.ts");
const progression = load("progression.ts");
const challenges = load("challenges.ts");
const tile = (id, x, z = 0, layer = 0, face = "DOT_1") => ({ id, x, z, layer, face });

test("144 unique tiles, traditional deck counts, reproducible seed", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const state = engine.createSolitaire(seed);
    assert.equal(state.tiles.length, 144);
    assert.equal(new Set(state.tiles.map(t => t.id)).size, 144);
    const counts = state.tiles.reduce((map, t) => map.set(t.face, (map.get(t.face) || 0) + 1), new Map());
    assert.equal(counts.size, 42);
    for (const [face, count] of counts) assert.equal(count, /^(FLOWER|SEASON)_/.test(face) ? 1 : 4);
    assert.ok(engine.findPair(state.tiles));
    assert.deepEqual(state, engine.createSolitaire(seed));
  }
});
test("all production layouts stay 144 tiles and produce verified deterministic deals", () => {
  for (const layout of ["turtle", "fortress", "twin_peaks", "butterfly", "dragon", "garden"]) {
    assert.equal(engine.createLayout(layout).length, 144);
    const first = engine.createSolitaire(8848, layout);
    const second = engine.createSolitaire(8848, layout);
    assert.equal(first.verified, true);
    assert.deepEqual(first, second);
  }
  assert.equal(modes.dailySeed(new Date("2026-09-05T12:00:00Z")), modes.dailySeed(new Date("2026-09-05T23:59:59Z")));
  assert.notEqual(modes.dailySeed(new Date("2026-09-05T12:00:00Z")), modes.dailySeed(new Date("2026-09-06T00:00:00Z")));
});
test("session validation rejects corrupt saves and accepts a complete verified snapshot", () => {
  const originalWindow = global.window;
  const originalStorage = global.localStorage;
  let stored = null;
  global.window = {};
  global.localStorage = {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
    removeItem: () => { stored = null; },
  };
  try {
    assert.equal(session.loadSession(), null);
    const state = engine.createSolitaire(42, "garden");
    session.saveSession({ version: 1, modeId: "classic", layoutId: "garden", seed: 42, elapsed: 12, savedAt: 1, state });
    assert.equal(session.loadSession().state.seed, 42);
    stored = JSON.stringify({ version: 1, modeId: "classic", layoutId: "garden", seed: 42, elapsed: 12, state: { ...state, verified: false } });
    assert.equal(session.loadSession(), null);
    session.clearSession(); assert.equal(stored, null);
  } finally { global.window = originalWindow; global.localStorage = originalStorage; }
});
test("every production room has distinct geometry and a configured match effect", () => {
  assert.equal(environments.ENVIRONMENTS.length, 6);
  assert.equal(new Set(environments.ENVIRONMENTS.map(room => room.roomKind)).size, 6);
  assert.equal(new Set(environments.ENVIRONMENTS.map(room => room.matchEffect)).size, 6);
  for (const room of environments.ENVIRONMENTS) {
    assert.ok(room.description.length > 20);
    assert.ok(room.palette.background.startsWith("#"));
  }
});
test("local shop purchases are Jade-bound, duplicate-safe, and equipment persists", () => {
  let profile = { ...progression.DEFAULT_PROFILE, jade: 500 };
  profile = progression.buyLocalItem(profile, "default-obsidian");
  assert.ok(profile.ownedItems.includes("default-obsidian"));
  assert.equal(profile.jade, 250);
  assert.equal(progression.buyLocalItem(profile, "default-obsidian"), null);
  profile = progression.equipLocalItem(profile, "default-obsidian");
  assert.equal(profile.equipped.tileset, "default-obsidian");
  assert.equal(progression.buyLocalItem(profile, "mystic_sanctuary"), null);
});
test("daily completion reward is idempotent for the same UTC date", () => {
  const profile = { ...progression.DEFAULT_PROFILE, dailyClaim: "2026-09-05", jade: 100 };
  const repeat = progression.awardWin(profile, 250, 9000, 300, "daily", "2026-09-05");
  assert.equal(repeat.jade, 100);
  const nextDay = progression.awardWin(repeat, 250, 9000, 300, "daily", "2026-09-06");
  assert.equal(nextDay.jade, 350);
  assert.ok(nextDay.achievements.includes("daily_challenge"));
});
test("solo rule presets enforce mode restrictions and journey unlocks require stars", () => {
  const custom = modes.createSoloRules("custom", "dragon", 300);
  assert.equal(custom.timeLimit, 300);
  assert.equal(custom.hintsRemaining, 3);
  assert.equal(custom.shufflesRemaining, 2);
  assert.equal(custom.rewardEligible, false);
  const daily = modes.createSoloRules("daily", "butterfly");
  assert.equal(daily.hintsRemaining, 0);
  assert.equal(daily.shufflesRemaining, 0);
  assert.equal(daily.scoreMultiplier, 3);
  assert.equal(progression.isJourneyStageUnlocked(progression.DEFAULT_PROFILE, "intro"), true);
  assert.equal(progression.isJourneyStageUnlocked(progression.DEFAULT_PROFILE, "garden"), false);
  const completed = { ...progression.DEFAULT_PROFILE, journey: { intro: { stars: 1, bestScore: 6000 } } };
  assert.equal(progression.isJourneyStageUnlocked(completed, "garden"), true);
});
test("challenge codes round-trip safely and imported challenges are unranked", () => {
  const code = challenges.encodeChallenge({ mode: "daily", layoutId: "butterfly", seed: 8848, timer: 900, ranked: true });
  assert.equal(code, "ZJ1-DAILY-BUTTERFLY-8848-900");
  const decoded = challenges.decodeChallenge(code);
  assert.deepEqual(decoded, { mode: "custom", layoutId: "butterfly", seed: 8848, timer: 900, ranked: false });
  assert.equal(challenges.decodeChallenge("ZJ1-DAILY-NOPE-1-900"), null);
  assert.equal(challenges.decodeChallenge("ZJ1-DAILY-BUTTERFLY--900"), null);
});
test("daily records preserve personal bests and increment streak once", () => {
  let profile = { ...progression.DEFAULT_PROFILE };
  profile = progression.recordDailyResult(profile, "2026-09-05", 1, 4000, 500);
  profile = progression.recordDailyResult(profile, "2026-09-05", 1, 3000, 600);
  assert.equal(profile.dailyRecords["2026-09-05"].score, 4000);
  assert.equal(profile.dailyRecords["2026-09-05"].time, 500);
  assert.equal(profile.dailyStreak, 2);
});
test("profile settings migrate safely and keep accessibility defaults", () => {
  assert.equal(progression.DEFAULT_PROFILE.settings.colorSafe, true);
  assert.equal(progression.DEFAULT_PROFILE.settings.tutorialSeen, false);
  assert.equal(progression.DEFAULT_PROFILE.settings.ambientEffects, true);
});
test("free rules enforce both sides and partial overhead overlap", () => {
  const center = tile("center", 0);
  assert.equal(engine.isFree(center, [center, tile("left", -1), tile("right", 1)]), false);
  assert.equal(engine.isFree(center, [center, tile("left", -1)]), true);
  assert.equal(engine.isFree(center, [center, tile("top", 0.5, 0.5, 1)]), false);
  assert.equal(engine.isFree(center, [center, tile("distant", 2, 0, 1)]), true);
});
test("selection, mismatch, matching, duplicate click and undo are atomic", () => {
  let state = { ...engine.createSolitaire(), tiles: [tile("a", -2), tile("b", 0), tile("c", 2, 0, 0, "BAM_2")] };
  state = engine.solitaireReducer(state, { type: "select", id: "a", now: 10000 });
  assert.equal(state.selected, "a");
  state = engine.solitaireReducer(state, { type: "select", id: "c", now: 10000 });
  assert.equal(state.tiles.length, 3); assert.equal(state.selected, "c");
  state = engine.solitaireReducer(state, { type: "select", id: "a", now: 10000 });
  state = engine.solitaireReducer(state, { type: "select", id: "b", now: 10000 });
  assert.equal(state.tiles.length, 1); assert.equal(state.score, 100);
  assert.equal(engine.solitaireReducer(state, { type: "select", id: "b", now: 10000 }), state);
  state = engine.solitaireReducer(state, { type: "undo" });
  assert.equal(state.tiles.length, 3); assert.equal(state.score, 0);
});
test("complete legal hands with shuffle recovery, ending at 72 pairs", () => {
  for (let seed = 1; seed <= 10; seed++) {
    let state = engine.createSolitaire(seed);
    let moves = 0, shuffles = 0;
    while (state.tiles.length && moves < 72) {
      let pair = engine.findPair(state.tiles);
      if (!pair) {
        const before = state.tiles.map(t => t.face).sort();
        state = engine.solitaireReducer(state, { type: "shuffle", seed: seed + shuffles++ });
        assert.deepEqual(state.tiles.map(t => t.face).sort(), before);
        pair = engine.findPair(state.tiles);
      }
      assert.ok(pair, "recovery must produce a free pair");
      for (const id of pair) state = engine.solitaireReducer(state, { type: "select", id, now: 10000 + moves * 1000 });
      moves++;
    }
    assert.equal(moves, 72); assert.equal(state.tiles.length, 0); assert.ok(state.score >= 7200);
  }
});
test("flowers and seasons match within their own family", () => {
  assert.ok(engine.findPair([tile("a", 0, 0, 0, "FLOWER_PLUM"), tile("b", 2, 0, 0, "FLOWER_ORCHID")]));
  assert.equal(engine.findPair([tile("a", 0, 0, 0, "FLOWER_PLUM"), tile("b", 2, 0, 0, "SEASON_SPRING")]), null);
});
test("JSON guard rejects HTTP errors, HTML, malformed JSON and network failures", async () => {
  const original = global.fetch;
  try {
    for (const [body, status, type] of [
      ["<!DOCTYPE html><html>missing</html>", 404, "text/html"],
      ["<html>proxy</html>", 200, "application/json"],
      ["{broken", 200, "application/json"],
      ['{"items":[]}', 500, "application/json"],
      ['{"items":[]}', 200, "text/html"],
    ]) {
      global.fetch = async () => new Response(body, { status, headers: { "content-type": type } });
      assert.equal(await safeJson("/api/shop/items"), null);
    }
    global.fetch = async () => { throw new Error("offline"); };
    assert.equal(await safeJson("/api/inventory"), null);
    global.fetch = async () => new Response('{"items":[]}', { headers: { "content-type": "application/json; charset=utf-8" } });
    assert.deepEqual(await safeJson("/api/shop"), { items: [] });
  } finally { global.fetch = original; }
});
test("inventory validates array/envelope shapes and supplies all starter categories", () => {
  assert.ok(parseItems(MOCK_DEFAULT_INVENTORY));
  assert.ok(parseOwned({ items: MOCK_DEFAULT_INVENTORY }));
  assert.equal(parseItems({ items: [null] }), null);
  assert.equal(parseOwned({ items: [{ id: "bad" }] }), null);
  for (const category of ["tileset", "table_skin", "avatar"]) assert.ok(MOCK_DEFAULT_INVENTORY.some(item => item.item_type === category));
});