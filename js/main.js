/**
 * Rendering, input, and game-loop wiring for the Nokia-style Snake game.
 * Depends on js/game-logic.js (window.SnakeGame) loaded first.
 */
(function () {
  'use strict';

  var GRID = 21;
  var CELL = 84 / GRID;
  var TICK_MS_START = 140;
  var TICK_MS_MIN = 80;
  var HIGH_SCORE_KEY = 'nokia-snake-high-score';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var scoreLabel = document.getElementById('scoreLabel');
  var highScoreLabel = document.getElementById('highScoreLabel');
  var startOverlay = document.getElementById('startOverlay');
  var gameOverOverlay = document.getElementById('gameOverOverlay');
  var finalScoreText = document.getElementById('finalScoreText');
  var newHighText = document.getElementById('newHighText');
  var keypad = document.getElementById('keypad');

  var STATE_START = 'start';
  var STATE_PLAYING = 'playing';
  var STATE_OVER = 'over';

  var appState = STATE_START;
  var game = null;
  var highScore = loadHighScore();
  var lastTickTime = 0;
  var tickInterval = TICK_MS_START;

  highScoreLabel.textContent = 'HI ' + highScore;

  function loadHighScore() {
    try {
      var v = window.localStorage.getItem(HIGH_SCORE_KEY);
      return v ? (parseInt(v, 10) || 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  function saveHighScore(v) {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(v));
    } catch (e) {
      /* localStorage unavailable (private mode, storage full, etc.) */
    }
  }

  function startGame() {
    game = SnakeGame.createGame({ width: GRID, height: GRID, rng: Math.random });
    tickInterval = TICK_MS_START;
    scoreLabel.textContent = 'SCORE 0';
    appState = STATE_PLAYING;
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    lastTickTime = 0;
  }

  function endGame() {
    appState = STATE_OVER;
    finalScoreText.textContent = 'SCORE ' + game.score;
    if (game.score > highScore) {
      highScore = game.score;
      saveHighScore(highScore);
      highScoreLabel.textContent = 'HI ' + highScore;
      newHighText.textContent = 'NEW HIGH SCORE!';
    } else {
      newHighText.textContent = '';
    }
    gameOverOverlay.classList.remove('hidden');
  }

  function handleDirection(dir) {
    if (appState !== STATE_PLAYING) {
      startGame();
      return;
    }
    SnakeGame.setDirection(game, dir);
  }

  function handleAnyInput() {
    if (appState !== STATE_PLAYING) {
      startGame();
    }
  }

  function loop(timestamp) {
    requestAnimationFrame(loop);
    if (appState === STATE_PLAYING) {
      if (!lastTickTime) lastTickTime = timestamp;
      if (timestamp - lastTickTime >= tickInterval) {
        lastTickTime = timestamp;
        var result = SnakeGame.tick(game);
        scoreLabel.textContent = 'SCORE ' + game.score;
        if (result.ate) {
          tickInterval = Math.max(TICK_MS_MIN, TICK_MS_START - game.score * 4);
        }
        if (result.gameOver) {
          endGame();
        }
      }
    }
    render();
  }

  function render() {
    ctx.fillStyle = '#c7d9a8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!game) return;

    if (game.food) {
      drawDiamond(game.food.x, game.food.y, '#2b3a1f');
    }

    for (var i = 0; i < game.snake.length; i++) {
      var seg = game.snake[i];
      var gap = i === 0 ? 0 : 0.6;
      ctx.fillStyle = '#2b3a1f';
      ctx.fillRect(seg.x * CELL + gap, seg.y * CELL + gap, CELL - gap * 2, CELL - gap * 2);
    }
  }

  function drawDiamond(x, y, color) {
    var cx = x * CELL + CELL / 2;
    var cy = y * CELL + CELL / 2;
    var r = CELL / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }

  // ---- Input: keyboard (arrows + WASD) -----------------------------------
  var KEY_MAP = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
    W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT'
  };

  window.addEventListener('keydown', function (e) {
    var dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      handleDirection(dir);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleAnyInput();
    }
  }, { passive: false });

  // ---- Input: on-screen keypad --------------------------------------------
  function onKeypadPress(e) {
    var btn = e.target.closest ? e.target.closest('.key') : null;
    if (!btn) return;
    e.preventDefault();
    var dir = btn.getAttribute('data-dir');
    if (dir) {
      handleDirection(dir);
    } else {
      handleAnyInput();
    }
  }
  keypad.addEventListener('touchstart', onKeypadPress, { passive: false });
  keypad.addEventListener('click', onKeypadPress);

  // ---- Input: swipe gestures on the screen --------------------------------
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;
  var SWIPE_THRESHOLD = 16;

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    if (!touchActive) return;
    touchActive = false;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      handleAnyInput();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      handleDirection(dy > 0 ? 'DOWN' : 'UP');
    }
  }, { passive: true });

  startOverlay.addEventListener('click', handleAnyInput);
  gameOverOverlay.addEventListener('click', handleAnyInput);

  // ---- Block page scroll / pinch-zoom while playing -----------------------
  document.body.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });

  render();
  requestAnimationFrame(loop);
}());
