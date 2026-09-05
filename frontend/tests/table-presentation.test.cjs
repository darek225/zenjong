const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Transpile the pure presentation modules without adding a test framework or config.
function load(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(source, filename);
  return compiled.exports;
}

const GameHUD = load("app/components/GameHUD.tsx").default;
const { sortTileIds } = load("lib/networkState.ts");
const noop = () => {};
const defaults = {
  hudState: "IN_GAME", remainingTiles: 80, activeScore: 25000,
  timeRemaining: 200, isConnected: true, onUndo: noop, onHint: noop,
  onShuffle: noop, selectedMapId: "temple_courtyard", onSelectMap: noop,
  onToggleCamera: noop, mapSelectorOpen: false, onOpenMapSelector: noop,
  onCloseMapSelector: noop,
};
const render = props => renderToStaticMarkup(React.createElement(GameHUD, { ...defaults, ...props }));

test("rounded tile is full-sized with six valid face material groups", async () => {
  const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
  const geometry = new RoundedBoxGeometry(0.8, 1.1, 0.5, 2, 0.04);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  [max.x - min.x, max.y - min.y, max.z - min.z].forEach((value, index) => {
    assert.ok(Math.abs(value - [0.8, 1.1, 0.5][index]) < 0.00001);
  });
  assert.deepEqual(geometry.groups.map(group => group.materialIndex), [0, 1, 2, 3, 4, 5]);
  assert.ok(geometry.groups.every(group => group.count > 0));
  assert.equal(geometry.getAttribute("uv").count, geometry.getAttribute("position").count);
  geometry.dispose();
});

test("hand sorting preserves physical IDs and does not mutate server order", () => {
  const hand = ["winds-east-0", "dots-9-0", "dots-1-2", "bamboo-2-1"];
  const original = [...hand];
  assert.deepEqual(sortTileIds(hand), ["dots-1-2", "dots-9-0", "bamboo-2-1", "winds-east-0"]);
  assert.deepEqual(hand, original);
});

test("expired multiplayer turn stays at zero instead of showing the fallback timer", () => {
  const html = render({ currentTurn: "me", isMyTurn: true, turnTimeLeft: 0 });
  assert.ok(html.includes("Your Turn: 0:00"));
  assert.ok(html.includes('aria-valuenow="0"'));
  assert.ok(html.includes('width:0%'));
  assert.ok(!html.includes("Pairs remaining"));
});

test("preview is honest and disables unsupported arcade actions", () => {
  const html = render({ gameMode: "preview", isConnected: false });
  assert.ok(html.includes("Offline Preview"));
  assert.ok(!html.includes("Single Player Mode"));
  assert.ok(!html.includes('role="progressbar"'));
  for (const label of ["↩ Undo", "💡 Hint", "🔀 Shuffle"]) {
    assert.ok(new RegExp(`<button[^>]*disabled=""[^>]*>${label}</button>`).test(html));
  }
});

test("arcade HUD uses supplied pair and combo telemetry", () => {
  const html = render({ gameMode: "arcade", isConnected: false,
    arcadeActionsEnabled: true, pairsRemaining: 12, combo: 4 });
  assert.ok(html.includes("Single Player Mode"));
  assert.ok(html.includes("Pairs remaining"));
  assert.ok(html.includes('>12</dd>'));
  assert.ok(html.includes('>4×</dd>'));
  assert.ok(!html.includes("click again on your turn"));
});