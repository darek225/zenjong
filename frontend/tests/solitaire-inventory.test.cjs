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