/**
 * Headless test suite for js/game-logic.js.
 * Pure Node, no dependencies: `node tests/game-logic.test.js`.
 */
'use strict';

var assert = require('assert');
var path = require('path');
var SnakeGame = require(path.join(__dirname, '..', 'js', 'game-logic.js'));

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    failed++;
    console.log('  ✗ ' + name);
    console.log('    ' + (err && err.stack ? err.stack : err));
  }
}

console.log('Snake game logic tests\n');

test('snake grows on eat and score increments', function () {
  var state = {
    width: 20,
    height: 20,
    rng: Math.random,
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    direction: SnakeGame.DIRECTIONS.RIGHT,
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 6, y: 5 },
    score: 0,
    gameOver: false
  };
  var lengthBefore = state.snake.length;
  var result = SnakeGame.tick(state);

  assert.strictEqual(result.ate, true, 'expected tick to report ate=true');
  assert.strictEqual(state.snake.length, lengthBefore + 1, 'snake should grow by one segment');
  assert.strictEqual(state.score, 1, 'score should increment by one');
  assert.deepStrictEqual(state.snake[0], { x: 6, y: 5 }, 'head should move onto the eaten food cell');
  assert.strictEqual(state.gameOver, false, 'game should not be over after a normal eat');
});

test('snake does not grow and score stays flat on a non-eating move', function () {
  var state = {
    width: 20,
    height: 20,
    rng: Math.random,
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    direction: SnakeGame.DIRECTIONS.RIGHT,
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 15, y: 15 },
    score: 0,
    gameOver: false
  };
  var lengthBefore = state.snake.length;
  var result = SnakeGame.tick(state);

  assert.strictEqual(result.ate, false);
  assert.strictEqual(state.snake.length, lengthBefore);
  assert.strictEqual(state.score, 0);
});

test('wall collision ends the game', function () {
  var state = {
    width: 5,
    height: 5,
    rng: Math.random,
    snake: [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }],
    direction: SnakeGame.DIRECTIONS.RIGHT,
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 0, y: 0 },
    score: 0,
    gameOver: false
  };
  var result = SnakeGame.tick(state);

  assert.strictEqual(result.gameOver, true, 'expected the wall hit to end the game');
  assert.strictEqual(result.reason, 'wall');
  assert.strictEqual(state.gameOver, true);
});

test('self collision ends the game', function () {
  // A 2x2 closed loop: any move from the head lands on the body.
  var state = {
    width: 10,
    height: 10,
    rng: Math.random,
    snake: [{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    direction: SnakeGame.DIRECTIONS.RIGHT, // last actual move was (1,2)->(2,2)
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 9, y: 9 },
    score: 0,
    gameOver: false
  };

  var accepted = SnakeGame.setDirection(state, 'UP'); // 90-degree turn, legal
  assert.strictEqual(accepted, true, 'a 90-degree turn should be accepted');

  var result = SnakeGame.tick(state);
  assert.strictEqual(result.gameOver, true, 'expected the self hit to end the game');
  assert.strictEqual(result.reason, 'self');
  assert.strictEqual(state.gameOver, true);
});

test('food never spawns on the snake body', function () {
  // Grid with a single free cell — spawnFood must always land there.
  var snake = [];
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      if (x === 3 && y === 3) continue; // leave (3,3) free
      snake.push({ x: x, y: y });
    }
  }
  for (var seed = 0; seed < 50; seed++) {
    var state = { width: 4, height: 4, rng: SnakeGame.createRng(seed), snake: snake };
    var food = SnakeGame.spawnFood(state);
    assert.ok(food, 'expected a free cell to be found');
    assert.deepStrictEqual(food, { x: 3, y: 3 });
    assert.strictEqual(SnakeGame.isOnSnake(snake, food), false);
  }

  // Larger, sparser board — run many trials with different seeds and verify the invariant.
  var bigSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }];
  for (var s = 0; s < 500; s++) {
    var bigState = { width: 20, height: 20, rng: SnakeGame.createRng(s * 7919 + 1), snake: bigSnake };
    var f = SnakeGame.spawnFood(bigState);
    assert.strictEqual(SnakeGame.isOnSnake(bigSnake, f), false, 'food landed on the snake body (seed ' + s + ')');
  }
});

test('spawnFood returns null when the board is completely full', function () {
  var snake = [];
  for (var x = 0; x < 3; x++) {
    for (var y = 0; y < 3; y++) {
      snake.push({ x: x, y: y });
    }
  }
  var state = { width: 3, height: 3, rng: Math.random, snake: snake };
  var food = SnakeGame.spawnFood(state);
  assert.strictEqual(food, null);
});

test('a direct 180-degree reversal is rejected', function () {
  var state = {
    width: 20,
    height: 20,
    rng: Math.random,
    snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
    direction: SnakeGame.DIRECTIONS.RIGHT,
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 15, y: 15 },
    score: 0,
    gameOver: false
  };

  var accepted = SnakeGame.setDirection(state, 'LEFT');
  assert.strictEqual(accepted, false, 'reversal should be rejected');
  assert.deepStrictEqual(state.pendingDirection, SnakeGame.DIRECTIONS.RIGHT, 'pending direction must be unchanged');

  // A tick still moves the snake forward, not backward into itself.
  var result = SnakeGame.tick(state);
  assert.strictEqual(result.gameOver, false);
  assert.deepStrictEqual(state.snake[0], { x: 6, y: 5 });
});

test('a direct reversal is allowed for a single-segment snake', function () {
  var state = {
    width: 20,
    height: 20,
    rng: Math.random,
    snake: [{ x: 5, y: 5 }],
    direction: SnakeGame.DIRECTIONS.RIGHT,
    pendingDirection: SnakeGame.DIRECTIONS.RIGHT,
    food: { x: 15, y: 15 },
    score: 0,
    gameOver: false
  };
  var accepted = SnakeGame.setDirection(state, 'LEFT');
  assert.strictEqual(accepted, true, 'a length-1 snake may reverse freely');
});

test('createGame produces a valid, in-bounds starting state', function () {
  var state = SnakeGame.createGame({ width: 20, height: 20, rng: SnakeGame.createRng(42) });
  assert.strictEqual(state.snake.length, 3);
  assert.strictEqual(state.score, 0);
  assert.strictEqual(state.gameOver, false);
  assert.ok(state.food);
  assert.strictEqual(SnakeGame.isOnSnake(state.snake, state.food), false);
  state.snake.forEach(function (seg) {
    assert.ok(seg.x >= 0 && seg.x < state.width);
    assert.ok(seg.y >= 0 && seg.y < state.height);
  });
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
