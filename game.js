// ===== Canvas Setup =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===== Game Constants =====
const W = canvas.width;
const H = canvas.height;

const SURFACE_HEIGHT = 60;

// Player (fox)
const player = {
  x: 100,
  y: 120,
  w: 18,
  h: 18,
  speed: 2.6,
};

// ===== Fish Setup =====
const TOTAL_FISH = 12;
const fishList = [];
let fishCollected = 0;

const FISH_W = 14;
const FISH_H = 10;

// ===== Oxygen Setup =====
const OXYGEN_MAX = 100;
let oxygen = OXYGEN_MAX;

// Tune these to taste
const DRAIN_RATE = 18;   // oxygen per second drained underwater
const REFILL_RATE = 55;  // oxygen per second refilled at surface

let gameOver = false;
let gameWon = false;

// ===== Input state =====
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  r: false,
  R: false,
};

window.addEventListener("keydown", (e) => {
  if (e.key in keys) keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// ===== Helpers =====
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function isAtSurface() {
  // If any part of the player is inside the surface strip, count as breathing
  return player.y < SURFACE_HEIGHT;
}

// ===== Spawn fish =====
function spawnFish() {
  fishList.length = 0;
  fishCollected = 0;

  const padding = 10;

  for (let i = 0; i < TOTAL_FISH; i++) {
    const fish = {
      x: randInt(padding, W - FISH_W - padding),
      y: randInt(SURFACE_HEIGHT + padding, H - FISH_H - padding),
      w: FISH_W,
      h: FISH_H,
      alive: true,
    };
    fishList.push(fish);
  }
}

function resetGame() {
  player.x = 100;
  player.y = 120;
  oxygen = OXYGEN_MAX;
  gameOver = false;
  gameWon = false;
  spawnFish();
}

resetGame();

// ===== Timing =====
let lastTime = performance.now();

// ===== Update =====
function update(dt) {
  // Restart (works on win or lose)
  if ((gameOver || gameWon) && (keys.r || keys.R)) {
    resetGame();
    return;
  }

  // Freeze the game if ended
  if (gameOver || gameWon) return;

  // Movement input
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  player.x += dx * player.speed;
  player.y += dy * player.speed;

  // Boundaries
  player.x = clamp(player.x, 0, W - player.w);
  player.y = clamp(player.y, 0, H - player.h);

  // Oxygen logic
  if (isAtSurface()) {
    oxygen += REFILL_RATE * dt;
  } else {
    oxygen -= DRAIN_RATE * dt;
  }
  oxygen = clamp(oxygen, 0, OXYGEN_MAX);

  if (oxygen <= 0) {
    gameOver = true;
    return;
  }

  // Fish collection
  for (const f of fishList) {
    if (!f.alive) continue;
    if (rectsOverlap(player, f)) {
      f.alive = false;
      fishCollected += 1;
    }
  }

  // ✅ Win condition (MUST be inside update so it checks every frame)
  if (fishCollected >= TOTAL_FISH) {
    gameWon = true;
  }
}

// ===== Draw fish =====
function drawFish(f) {
  const x = Math.round(f.x);
  const y = Math.round(f.y);

  // Body
  ctx.fillStyle = "#cfe9ff";
  ctx.fillRect(x, y + 2, f.w - 4, f.h - 4);

  // Tail
  ctx.fillStyle = "#9ad0ff";
  ctx.fillRect(x + f.w - 4, y + 3, 3, f.h - 6);

  // Eye
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(x + 2, y + 4, 2, 2);
}

// ===== Draw oxygen bar =====
function drawOxygenBar() {
  const barX = 14;
  const barY = 34;
  const barW = 180;
  const barH = 14;

  // background
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(barX, barY, barW, barH);

  // fill
  const pct = oxygen / OXYGEN_MAX;
  ctx.fillStyle =
    pct > 0.35 ? "rgba(120,220,255,0.95)" : "rgba(255,120,120,0.95)";
  ctx.fillRect(barX, barY, Math.round(barW * pct), barH);

  // outline + label
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "12px system-ui";
  ctx.fillText("OXYGEN", barX + barW + 10, barY + 12);
}

// ===== Draw =====
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Surface zone
  ctx.fillStyle = "#1b4b7a";
  ctx.fillRect(0, 0, W, SURFACE_HEIGHT);

  // Water zone
  ctx.fillStyle = "#0f2a4a";
  ctx.fillRect(0, SURFACE_HEIGHT, W, H - SURFACE_HEIGHT);

  // Labels
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "14px system-ui";
  ctx.fillText("SURFACE (breathe here)", 14, 22);

  // UI
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "16px system-ui";
  ctx.fillText(`Fish: ${fishCollected} / ${TOTAL_FISH}`, W - 150, 22);

  drawOxygenBar();

  // Fish
  for (const f of fishList) {
    if (!f.alive) continue;
    drawFish(f);
  }

  // Player
  ctx.fillStyle = "#f08c2b";
  ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

  ctx.fillStyle = "#2b1a10";
  ctx.fillRect(Math.round(player.x + player.w - 4), Math.round(player.y + 6), 2, 2);

  // Game Over overlay
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.font = "38px system-ui";
    ctx.fillText("GAME OVER", W / 2 - 120, H / 2 - 10);

    ctx.font = "18px system-ui";
    ctx.fillText("Press R to Restart", W / 2 - 85, H / 2 + 26);
  }

  // Win overlay
  if (gameWon) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.font = "38px system-ui";
    ctx.fillText("YOU WIN!", W / 2 - 90, H / 2 - 10);

    ctx.font = "18px system-ui";
    ctx.fillText("Press R to Play Again", W / 2 - 105, H / 2 + 26);
  }
}

// ===== Game Loop =====
function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);