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

  // Player (fox placeholder)
  ctx.fillStyle = "#f08c2b"; // fox orange
  ctx.fillRect(Math.round(player.x), Math.round(player.y), player.w, player.h);

  // Tiny “snout” pixel so it feels like a character
  ctx.fillStyle = "#2b1a10";
  ctx.fillRect(Math.round(player.x + player.w - 4), Math.round(player.y + 6), 2, 2);

  // Debug-ish coords (optional)
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(`x:${player.x.toFixed(0)} y:${player.y.toFixed(0)}`, 14, 44);
}

// ===== Game Loop =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
