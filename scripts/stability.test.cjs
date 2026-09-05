const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'frontend/node_modules/typescript'));

// Exercise source files without writing compiled artifacts or adding a framework.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true, useDefineForClassFields: false, esModuleInterop: true,
    },
  }).outputText;
  module._compile(output, filename);
};
const { TileManager } = require('../backend/src/game/TileManager.ts');
const { MahjongRoom } = require('../backend/src/rooms/MahjongRoom.ts');
const { Player } = require('../backend/src/rooms/schema/MahjongState.ts');
const { snapshotGameState, getTileType, sortTileIds } = require('../frontend/lib/networkState.ts');
const { resolveWebSocketUrl } = require('../frontend/lib/config.ts');
const { joinRoomWithRetry, leaveRoomSafely } = require('../frontend/lib/colyseus.ts');

test('144 unique physical tiles with correct face multiplicities', () => {
  const deck = TileManager.createDeck();
  assert.equal(deck.length, 144);
  assert.equal(new Set(deck.map(tile => tile.id)).size, 144);
  const counts = new Map();
  for (const tile of deck) {
    const face = getTileType(tile.id);
    assert.ok(face, tile.id);
    counts.set(face, (counts.get(face) || 0) + 1);
  }
  assert.equal(counts.size, 42);
  for (const [face, count] of counts) assert.equal(count, /^(FLOWER|SEASON)_/.test(face) ? 1 : 4);
  assert.deepEqual(TileManager.shuffleDeck(deck).map(t => t.id).sort(), deck.map(t => t.id).sort());
});

test('deal, draw, discard, and empty wall preserve tiles without missing indices', () => {
  const room = new MahjongRoom();
  room.onCreate({ maxPlayers: 4 });
  try {
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.sessionId = `player-${i}`;
      room.state.players.set(player.sessionId, player);
    }
    room.state.currentPlayerCount = 4;
    room.startGame();
    const player = room.state.players.get('player-0');
    for (const p of room.state.players.values()) assert.equal(p.hand.length, 13);
    assert.equal(room.state.wall.remaining, 92);
    room.startGame(); // A second start must not redeal.
    assert.equal(room.state.wall.remaining, 92);
    room.handleDraw({ sessionId: 'player-0' });
    assert.equal(player.hand.length, 14);
    assert.equal(room.state.wall.remaining, 91);
    const discardedId = player.hand[0].id;
    room.handleDiscard({ sessionId: 'player-0' }, 0);
    assert.equal(room.state.discardPile.tiles[0].id, discardedId);
    const ids = [...room.state.wall.tiles, ...room.state.discardPile.tiles,
      ...Array.from(room.state.players.values()).flatMap(p => Array.from(p.hand))].map(tile => tile.id);
    assert.equal(ids.length, 144);
    assert.equal(new Set(ids).size, 144);
    while (room.state.wall.remaining > 0) assert.ok(room.getNextTile());
    assert.equal(room.getNextTile(), null);
    assert.equal(room.state.wall.remaining, 0);
  } finally {
    room.onDispose();
    room.clock.clear();
    room.clock.stop();
  }
});

test('tile display mapping supports legacy IDs and preserves copies and order', () => {
  assert.equal(getTileType('dots-1'), 'DOT_1');
  assert.equal(getTileType('winds-East-2'), 'WIND_EAST');
  assert.equal(getTileType('BAM_9'), 'BAM_9');
  assert.equal(getTileType('invalid'), undefined);
  assert.deepEqual(sortTileIds(['winds-East-2', null, 'dots-2-0', 'dots-1-1', 'dots-1-0']),
    ['dots-1-1', 'dots-1-0', 'dots-2-0', 'winds-East-2']);
});

test('network snapshots filter invalid slots and do not share mutable schema state', () => {
  const player = { username: 'One', score: 10, hand: [null, { id: 'dots-1-0' }, undefined] };
  const state = { players: new Map([['one', player], ['invalid', null]]),
    wall: { remaining: 92 }, discardPile: { tiles: [null] }, turnState: { timeLeft: 30 } };
  const first = snapshotGameState(state);
  player.score = 20;
  player.hand[1].id = 'dots-2-0';
  state.wall.remaining = 91;
  const second = snapshotGameState(state);
  assert.equal(first.players.get('one').score, 10);
  assert.equal(first.players.get('one').hand[0].id, 'dots-1-0');
  assert.equal(first.wall.remaining, 92);
  assert.equal(second.players.get('one').score, 20);
  assert.equal(second.wall.remaining, 91);
  assert.equal(second.players.size, 1);
  assert.deepEqual(second.discardPile.tiles, []);
  assert.equal(snapshotGameState(null), null);
});

test('production sockets reject missing, malformed, loopback and insecure URLs', () => {
  const production = { hostname: 'game.example.com', protocol: 'https:' };
  for (const value of [undefined, 'bad', 'ws://localhost:2567', 'wss://127.0.0.1',
    'wss://[::1]', 'ws://remote.example.com', 'wss://bad\0host', 'https://remote.example.com']) {
    assert.equal(resolveWebSocketUrl(value, false, production), null, String(value));
  }
  assert.equal(resolveWebSocketUrl('wss://remote.example.com', false, production), 'wss://remote.example.com/');
  assert.equal(resolveWebSocketUrl(undefined, true, { hostname: 'localhost', protocol: 'http:' }), 'ws://localhost:2567/');
  assert.equal(resolveWebSocketUrl(undefined, true, production), null);
});

test('shadow props apply safely and context-loss handler never renders DOM', () => {
  const source = fs.readFileSync(path.join(root, 'frontend/app/components/ZenjongCanvas.tsx'), 'utf8');
  assert.doesNotMatch(source, /shadow-map-size/);
  const THREE = require(path.join(root, 'frontend/node_modules/three'));
  const { applyProps } = require(path.join(root, 'frontend/node_modules/@react-three/fiber'));
  const light = new THREE.DirectionalLight();
  const props = {};
  for (const match of source.matchAll(/(shadow-mapSize-\w+)=\{(\d+)\}/g)) props[match[1]] = Number(match[2]);
  applyProps(light, props);
  assert.equal(light.shadow.mapSize.x, 2048);
  assert.equal(light.shadow.mapSize.y, 2048);
  assert.equal(light.shadow.map, null);
  const handler = source.slice(source.indexOf('function WebGLContextLossHandler'), source.indexOf('function TouchGestureHandler'));
  assert.doesNotMatch(handler, /<(div|span)\b/);
  assert.match(handler, /return null/);
  assert.ok(source.indexOf('Graphics interrupted') > source.indexOf('</Canvas>'));
});

test('retry exhaustion stops after three attempts', async () => {
  let attempts = 0;
  await assert.rejects(joinRoomWithRetry({ joinOrCreate: async () => { attempts++; throw new Error('offline'); } }, 'room', 10), /offline/);
  assert.equal(attempts, 3);
});

test('cancelled late join leaves its room and does not retry', async () => {
  const controller = new AbortController();
  let leaves = 0;
  const promise = joinRoomWithRetry({ joinOrCreate: async () => {
    controller.abort();
    return { leave: async () => { leaves++; } };
  } }, 'room', 3, controller.signal);
  await assert.rejects(promise, { name: 'AbortError' });
  assert.equal(leaves, 1);
});

test('abort cancels pending backoff; cleanup accepts invalid/already closed rooms', async () => {
  const controller = new AbortController();
  let attempts = 0;
  const promise = joinRoomWithRetry({ joinOrCreate: async () => { attempts++; throw new Error('offline'); } }, 'room', 3, controller.signal);
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(promise, { name: 'AbortError' });
  assert.equal(attempts, 1);
  for (const room of [null, undefined, new Error('not a room'), { leave: false },
    { leave: () => { throw new Error('closed'); } }, { leave: async () => { throw new Error('closed'); } }]) {
    await leaveRoomSafely(room);
  }
});