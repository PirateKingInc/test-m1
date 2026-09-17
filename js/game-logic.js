/**
 * Pure Snake game logic — no DOM, no globals besides the exported API.
 * Usable from Node (module.exports) and the browser (window.SnakeGame).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnakeGame = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
  };

  function isOpposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
  }

  function cellsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  /** Deterministic PRNG (mulberry32) so tests can be reproducible. */
  function createRng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isOnSnake(snake, pos) {
    for (var i = 0; i < snake.length; i++) {
      if (cellsEqual(snake[i], pos)) return true;
    }
    return false;
  }

  /** Picks a uniformly random free cell for food. Returns null if the board is full. */
  function spawnFood(state) {
    var free = [];
    for (var x = 0; x < state.width; x++) {
      for (var y = 0; y < state.height; y++) {
        var pos = { x: x, y: y };
        if (!isOnSnake(state.snake, pos)) free.push(pos);
      }
    }
    if (free.length === 0) return null;
    var idx = Math.floor(state.rng() * free.length);
    return free[idx];
  }

  function createGame(options) {
    options = options || {};
    var width = options.width || 20;
    var height = options.height || 20;
    var rng = options.rng || Math.random;
    var startX = Math.floor(width / 2);
    var startY = Math.floor(height / 2);

    var state = {
      width: width,
      height: height,
      rng: rng,
      snake: [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
      ],
      direction: DIRECTIONS.RIGHT,
      pendingDirection: DIRECTIONS.RIGHT,
      food: null,
      score: 0,
      gameOver: false
    };
    state.food = spawnFood(state);
    return state;
  }

  /** Queues a turn. Rejects a direct 180-degree reversal. Returns true if accepted. */
  function setDirection(state, dirName) {
    var dir = DIRECTIONS[dirName];
    if (!dir) return false;
    if (state.snake.length > 1 && isOpposite(dir, state.direction)) {
      return false;
    }
    state.pendingDirection = dir;
    return true;
  }

  /** Advances the simulation by one grid step. Mutates and returns event info. */
  function tick(state) {
    if (state.gameOver) return { gameOver: true, ate: false };

    state.direction = state.pendingDirection;
    var head = state.snake[0];
    var newHead = { x: head.x + state.direction.x, y: head.y + state.direction.y };

    if (newHead.x < 0 || newHead.x >= state.width || newHead.y < 0 || newHead.y >= state.height) {
      state.gameOver = true;
      return { gameOver: true, ate: false, reason: 'wall' };
    }

    var ate = !!(state.food && cellsEqual(newHead, state.food));
    var tailIndex = state.snake.length - 1;
    var bodyToCheck = ate ? state.snake : state.snake.slice(0, tailIndex);

    if (isOnSnake(bodyToCheck, newHead)) {
      state.gameOver = true;
      return { gameOver: true, ate: false, reason: 'self' };
    }

    state.snake.unshift(newHead);
    if (!ate) {
      state.snake.pop();
      return { gameOver: false, ate: false };
    }

    state.score += 1;
    state.food = spawnFood(state);
    if (!state.food) {
      state.gameOver = true;
      return { gameOver: true, ate: true, reason: 'win' };
    }
    return { gameOver: false, ate: true };
  }

  return {
    DIRECTIONS: DIRECTIONS,
    createRng: createRng,
    createGame: createGame,
    setDirection: setDirection,
    tick: tick,
    spawnFood: spawnFood,
    isOnSnake: isOnSnake
  };
}));
