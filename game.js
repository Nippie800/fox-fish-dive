// ===== Canvas Setup =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===== Game Constants =====
const W = canvas.width;
const H = canvas.height;

const SURFACE_HEIGHT = 60; // top strip (we'll use it for breath later)

// Player (fox) as a simple pixel block for now
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

// Simple fish "sprite" size
const FISH_W = 14;
const FISH_H = 10;

// Input state
const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// Listen for key presses
window.addEventListener("keydown", (e) => {
  if (e.key in keys) keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// ===== Helper: clamp value into range =====
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ===== Helper: random integer in range =====
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== Helper: AABB collision =====
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ===== Spawn fish =====
function spawnFish() {
  fishList.length = 0;
  fishCollected = 0;

  // Keep fish only in water area, with padding away from edges
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

spawnFish();

// ===== Update =====
function update() {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;

  // Normalize diagonal movement so it's not faster
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  player.x += dx * player.speed;
  player.y += dy * player.speed;

  // Boundaries (keep player inside the canvas)
  player.x = clamp(player.x, 0, W - player.w);
  player.y = clamp(player.y, 0, H - player.h);

  // Collect fish (collision)
  for (const f of fishList) {
    if (!f.alive) continue;
    if (rectsOverlap(player, f)) {
      f.alive = false;
      fishCollected += 1;
    }
  }
}

// ===== Draw fish (pixel-ish) =====
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

// ===== Draw =====
function draw() {
  // Clear
  ctx.clearRect(0, 0, W, H);

  // Surface zone
  ctx.fillStyle = "#1b4b7a";
  ctx.fillRect(0, 0, W, SURFACE_HEIGHT);

  // Water zone
  ctx.fillStyle = "#0f2a4a";
  ctx.fillRect(0, SURFACE_HEIGHT, W, H - SURFACE_HEIGHT);

  // Surface label
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "14px system-ui";
  ctx.fillText("SURFACE (breathe here)", 14, 22);

  // UI: fish counter
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "16px system-ui";
  ctx.fillText(`Fish: ${fishCollected} / ${TOTAL_FISH}`, W - 150, 22);

  // Draw fish
  for (const f of fishList) {
    if (!f.alive) continue;
    drawFish(f);
  }

  // Player (fox placeholder)
  ctx.fillStyle = "#f08c2b"; // fox orange
  ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

  // Tiny “snout” pixel
  ctx.fillStyle = "#2b1a10";
  ctx.fillRect(Math.round(player.x + player.w - 4), Math.round(player.y + 6), 2, 2);
}

// ===== Game Loop =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();