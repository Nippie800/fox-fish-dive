// ===== Canvas Setup =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===== Game Constants =====
const W = canvas.width;
const H = canvas.height;

const SURFACE_HEIGHT = 60;

// ===== Animation Clock =====
let t = 0; // seconds

// Player (fox)
const player = {
  x: 100,
  y: 10, // ✅ spawn on land/surface
  w: 39,
  h: 39,
  speed: 2.6,
  facing: 1, // 1 = right, -1 = left
};

// ===== Fish Setup =====
const TOTAL_FISH = 12;
const fishList = [];
let fishCollected = 0;

const FISH_W = 24;
const FISH_H = 16;

// ===== Oxygen Setup =====
const OXYGEN_MAX = 100;
let oxygen = OXYGEN_MAX;

const DRAIN_RATE = 18;
const REFILL_RATE = 55;

let gameOver = false;
let gameWon = false;

// ===== Obstacles =====
const mines = [];
const logs = [];

// Mines
const MINE_COUNT = 6;
const MINE_ARM_DELAY = 1.0; // seconds before mine becomes lethal

// Logs (horizontal current)
let logSpawnTimer = 0;
const LOG_SPAWN_EVERY = 2.0; // seconds
const LOG_SPEED_MIN = 70;
const LOG_SPEED_MAX = 120;

// ===== Bubbles =====
const bubbles = [];
let bubbleTimer = 0;

// ===== Atmosphere FX =====
const dust = []; // floating particles
const DUST_COUNT = 85;

// Foreground seaweed
const seaweed = [];
const SEAWEED_COUNT = 14;

// ===== Decor (background props) =====
const decor = {
  corals: [],
  shells: [],
  wreck: null,
};

// ===== End-screen assets (thumbs + confetti) =====
// Put these images in /assets:
// - transparentwin-Photoroom.png
// - transparentlose-Photoroom.png
const thumbsUpImg = new Image();
thumbsUpImg.src = "assets/transparentwin-Photoroom.png";

const thumbsDownImg = new Image();
thumbsDownImg.src = "assets/transparentlose-Photoroom.png";

// Confetti particles (spawn once on win)
const confetti = [];
let winFXStarted = false;
let loseFXStarted = false;

// Optional: quick debug
thumbsUpImg.onload = () => console.log("✅ thumbs up loaded");
thumbsUpImg.onerror = () => console.log("❌ thumbs up failed (check path/name)");

thumbsDownImg.onload = () => console.log("✅ thumbs down loaded");
thumbsDownImg.onerror = () => console.log("❌ thumbs down failed (check path/name)");

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

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
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
  return player.y < SURFACE_HEIGHT;
}

function isUnderwater() {
  return player.y >= SURFACE_HEIGHT;
}

function px(x, y, s) {
  ctx.fillRect(x, y, s, s);
}

function endLose() {
  if (!gameOver) {
    gameOver = true;
    if (!loseFXStarted) loseFXStarted = true;
  }
}

function startWinFX() {
  if (winFXStarted) return;
  winFXStarted = true;

  // explosion center
  const cx = W / 2;
  const cy = H / 2 - 30;

  confetti.length = 0;
  const n = 120;

  for (let i = 0; i < n; i++) {
    const a = randFloat(0, Math.PI * 2);
    const sp = randFloat(120, 320);
    confetti.push({
      x: cx + randFloat(-12, 12),
      y: cy + randFloat(-10, 10),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - randFloat(40, 160),
      size: randFloat(3, 7),
      rot: randFloat(0, Math.PI * 2),
      vr: randFloat(-6, 6),
      life: randFloat(1.2, 2.0),
      seed: Math.random() * 10,
      style: randInt(0, 2), // 0=rect,1=dot,2=short line
    });
  }
}

// ===== Spawn fish =====
function spawnFish() {
  fishList.length = 0;
  fishCollected = 0;

  const padding = 12;

  for (let i = 0; i < TOTAL_FISH; i++) {
    fishList.push({
      x: randInt(padding, W - FISH_W - padding),
      y: randInt(SURFACE_HEIGHT + padding, H - FISH_H - padding),
      w: FISH_W,
      h: FISH_H,
      alive: true,
      sparkleSeed: Math.random() * 10,
    });
  }
}

// ===== Spawn mines (arm after 1s) =====
function spawnMines() {
  mines.length = 0;
  const padding = 14;

  for (let i = 0; i < MINE_COUNT; i++) {
    const size = randInt(22, 30);
    mines.push({
      x: randInt(padding, W - size - padding),
      y: randInt(SURFACE_HEIGHT + 40, H - size - padding),
      w: size,
      h: size,
      age: 0,
      armed: false,
    });
  }
}

// ===== Logs (horizontal current) =====
function spawnLog() {
  const w = randInt(55, 95);
  const h = randInt(14, 18);

  const dir = Math.random() < 0.5 ? 1 : -1;
  const x = dir === 1 ? -w - 10 : W + 10;

  const y = randInt(SURFACE_HEIGHT + 34, H - h - 12);

  logs.push({
    x,
    y,
    w,
    h,
    vx: dir * randFloat(LOG_SPEED_MIN, LOG_SPEED_MAX),
    wobbleSeed: Math.random() * 10,
  });
}

// ===== Background decor spawn =====
function spawnDecor() {
  decor.corals.length = 0;
  decor.shells.length = 0;

  // Coral clusters
  const coralCount = 7;
  for (let i = 0; i < coralCount; i++) {
    decor.corals.push({
      x: randInt(20, W - 40),
      y: randInt(Math.floor(H * 0.62), H - 35),
      s: randInt(10, 22),
      seed: Math.random() * 10,
    });
  }

  // Shells
  const shellCount = 9;
  for (let i = 0; i < shellCount; i++) {
    decor.shells.push({
      x: randInt(10, W - 20),
      y: randInt(H - 45, H - 12),
      r: randInt(5, 10),
      seed: Math.random() * 10,
    });
  }

  // Shipwreck silhouette
  const wreckW = randInt(140, 220);
  const wreckH = randInt(55, 85);
  decor.wreck = {
    x: randInt(20, W - wreckW - 20),
    y: randInt(Math.floor(H * 0.55), H - wreckH - 20),
    w: wreckW,
    h: wreckH,
    tilt: randFloat(-0.18, 0.18),
  };
}

// ===== Dust particles spawn =====
function spawnDust() {
  dust.length = 0;
  for (let i = 0; i < DUST_COUNT; i++) {
    dust.push({
      x: Math.random() * W,
      y: randFloat(SURFACE_HEIGHT + 10, H - 10),
      r: randFloat(0.7, 1.8),
      vx: randFloat(-6, 6),
      vy: randFloat(-2, 2),
      a: randFloat(0.06, 0.16),
      seed: Math.random() * 10,
    });
  }
}

// ===== Seaweed spawn (foreground layer) =====
function spawnSeaweed() {
  seaweed.length = 0;

  // Put most on bottom, a few mid-depth for parallax feel
  for (let i = 0; i < SEAWEED_COUNT; i++) {
    const baseY = randInt(Math.floor(H * 0.65), H - 8);
    seaweed.push({
      x: randInt(8, W - 8),
      y: baseY,
      h: randInt(40, 95),
      w: randInt(10, 18),
      seed: Math.random() * 10,
      alpha: randFloat(0.14, 0.26),
      layer: Math.random() < 0.7 ? 1 : 2, // 2 = closer = bigger sway
    });
  }
}

// ===== Reset =====
function resetGame() {
  player.x = 100;
  player.y = 10; // ✅ start on land

  oxygen = OXYGEN_MAX;
  gameOver = false;
  gameWon = false;

  winFXStarted = false;
  loseFXStarted = false;
  confetti.length = 0;

  bubbles.length = 0;
  bubbleTimer = 0;

  logs.length = 0;
  logSpawnTimer = 0;

  spawnDecor();
  spawnDust();
  spawnSeaweed();
  spawnFish();
  spawnMines();
}

resetGame();

// ===== Timing =====
let lastTime = performance.now();
let isMoving = false;
let kickPhase = 0;

// ===== Confetti update/draw =====
function updateConfetti(dt) {
  if (!winFXStarted) return;

  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.life -= dt;

    // gravity + a tiny water-y flutter
    c.vy += 420 * dt;
    c.vx += Math.sin(t * 2.2 + c.seed) * 18 * dt;

    c.x += c.vx * dt;
    c.y += c.vy * dt;

    c.rot += c.vr * dt;

    // fade out near end
    if (c.life <= 0 || c.y > H + 40) confetti.splice(i, 1);
  }
}

function drawConfetti() {
  if (!winFXStarted) return;

  for (const c of confetti) {
    const alpha = clamp(c.life / 1.2, 0, 1) * 0.95;

    // bright confetti (HSL)
    const hue = (Math.floor((c.seed * 97) % 360) + t * 40) % 360;
    ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`;
    ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);

    if (c.style === 0) {
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
    } else if (c.style === 1) {
      ctx.beginPath();
      ctx.arc(0, 0, c.size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-c.size / 2, 0);
      ctx.lineTo(c.size / 2, 0);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.restore();
  }
}

// ===== Update =====
function update(dt) {
  t += dt;

  // Restart (works on win or lose)
  if ((gameOver || gameWon) && (keys.r || keys.R)) {
    resetGame();
    return;
  }

  // Even when ended, keep win FX moving (confetti)
  if (gameWon) {
    updateConfetti(dt);
    return;
  }
  if (gameOver) return;

  // Movement input
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;

  if (dx < 0) player.facing = -1;
  if (dx > 0) player.facing = 1;

  isMoving = dx !== 0 || dy !== 0;
  if (isMoving) kickPhase += dt * 10;

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
  if (isAtSurface()) oxygen += REFILL_RATE * dt;
  else oxygen -= DRAIN_RATE * dt;

  oxygen = clamp(oxygen, 0, OXYGEN_MAX);

  if (oxygen <= 0) {
    endLose();
    return;
  }

  // ===== Dust update (underwater) =====
  for (let i = 0; i < dust.length; i++) {
    const d = dust[i];

    // subtle swirl
    d.vx += Math.sin(t * 0.7 + d.seed) * 0.03;
    d.vy += Math.cos(t * 0.6 + d.seed) * 0.02;

    d.x += d.vx * dt;
    d.y += d.vy * dt;

    // wrap
    if (d.x < -10) d.x = W + 10;
    if (d.x > W + 10) d.x = -10;
    if (d.y < SURFACE_HEIGHT + 5) d.y = H - 10;
    if (d.y > H + 10) d.y = SURFACE_HEIGHT + 10;
  }

  // ===== Bubble particles (only underwater + moving) =====
  bubbleTimer -= dt;
  if (isUnderwater() && isMoving && bubbleTimer <= 0) {
    bubbleTimer = 0.06;
    bubbles.push({
      x: player.x + (player.facing === 1 ? 8 : player.w - 10),
      y: player.y + 16,
      r: randInt(2, 4),
      vy: randFloat(22, 38),
      vx: randFloat(-8, 8),
      life: randFloat(0.8, 1.25),
    });
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y -= b.vy * dt;
    b.vx += Math.sin(t * 3 + i) * 4 * dt;

    if (b.life <= 0 || b.y < SURFACE_HEIGHT - 20) bubbles.splice(i, 1);
  }

  // ===== Fish collection =====
  for (const f of fishList) {
    if (!f.alive) continue;
    if (rectsOverlap(player, f)) {
      f.alive = false;
      fishCollected += 1;
    }
  }

  // ===== Mines update + fair arming =====
  for (const m of mines) {
    m.age += dt;
    if (!m.armed && m.age >= MINE_ARM_DELAY) m.armed = true;

    if (m.armed && rectsOverlap(player, m)) {
      endLose();
      return;
    }
  }

  // ===== Logs spawn/update (horizontal) =====
  logSpawnTimer += dt;
  if (logSpawnTimer >= LOG_SPAWN_EVERY) {
    logSpawnTimer = 0;
    spawnLog();
  }

  for (let i = logs.length - 1; i >= 0; i--) {
    const L = logs[i];
    const wobble = Math.sin(t * 2 + L.wobbleSeed) * 0.35;

    L.x += L.vx * dt;
    L.y += wobble;

    if (rectsOverlap(player, L)) {
      endLose();
      return;
    }

    if (L.vx > 0 && L.x > W + 40) logs.splice(i, 1);
    else if (L.vx < 0 && L.x < -L.w - 40) logs.splice(i, 1);
  }

  // Win condition
  if (fishCollected >= TOTAL_FISH) {
    gameWon = true;
    startWinFX();
  }
}

// ===== Background drawing =====
function drawBackground() {
  // --- LAND / SURFACE STRIP ---
  ctx.fillStyle = "#c9a36a"; // sand
  ctx.fillRect(0, 0, W, SURFACE_HEIGHT);

  ctx.fillStyle = "rgba(70,120,70,0.25)";
  ctx.fillRect(0, 0, W, 16);

  // shoreline foam
  const foamY = SURFACE_HEIGHT - 4;
  for (let x = 0; x < W; x += 10) {
    const wiggle = Math.sin(t * 3 + x * 0.06) * 2;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x, foamY + wiggle, 8, 2);
  }

  // little land rocks
  for (let i = 0; i < 8; i++) {
    const rx = (i * 70 + 30) % W;
    const ry = 18 + (i % 3) * 10;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(rx, ry, 18, 8);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(rx + 2, ry + 2, 8, 2);
  }

  // --- WATER / UNDERWATER ---
  ctx.fillStyle = "#123a64";
  ctx.fillRect(0, SURFACE_HEIGHT, W, H - SURFACE_HEIGHT);

  ctx.fillStyle = "rgba(9,28,54,0.35)";
  ctx.fillRect(0, SURFACE_HEIGHT + 40, W, H - SURFACE_HEIGHT - 40);

  ctx.fillStyle = "rgba(6,18,40,0.35)";
  ctx.fillRect(0, SURFACE_HEIGHT + 140, W, H - SURFACE_HEIGHT - 140);

  // light rays
  for (let i = 0; i < 6; i++) {
    const x = i * 140 + Math.sin(t * 0.6 + i) * 30;
    ctx.fillStyle = "rgba(200,240,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, SURFACE_HEIGHT);
    ctx.lineTo(x + 70, SURFACE_HEIGHT);
    ctx.lineTo(x + 170, H);
    ctx.lineTo(x - 30, H);
    ctx.closePath();
    ctx.fill();
  }

  // caustic shimmer lines
  for (let i = 0; i < 5; i++) {
    const baseY = SURFACE_HEIGHT + 40 + i * 70;
    ctx.strokeStyle = "rgba(180,240,255,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const y =
        baseY +
        Math.sin(t * 1.8 + x * 0.03 + i) * 6 +
        Math.sin(t * 0.9 + x * 0.05) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  // shipwreck silhouette
  if (decor.wreck) {
    const w = decor.wreck;
    ctx.save();
    ctx.translate(w.x + w.w / 2, w.y + w.h / 2);
    ctx.rotate(w.tilt);
    ctx.translate(-w.w / 2, -w.h / 2);

    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fillRect(0, 0, w.w, w.h);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(w.w * 0.65, -18, 10, 30);

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 4; i++) ctx.fillRect(18 + i * 26, 18, 10, 10);
    ctx.restore();
  }

  // coral
  for (const c of decor.corals) {
    const sway = Math.sin(t * 1.5 + c.seed) * 2;
    ctx.fillStyle = "rgba(255,120,180,0.18)";
    ctx.fillRect(c.x, c.y, c.s, c.s + 10);

    ctx.fillStyle = "rgba(120,255,200,0.16)";
    ctx.fillRect(c.x + 14 + sway, c.y + 6, c.s - 4, c.s);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(c.x + 4, c.y + 6, 4, 10);
  }

  // shells
  for (const s of decor.shells) {
    const tw = Math.sin(t * 3 + s.seed) > 0.65;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    if (tw) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(s.x - 1, s.y - s.r - 6, 2, 2);
      ctx.fillRect(s.x + 3, s.y - s.r - 4, 2, 2);
    }
  }

  // dust particles (behind gameplay)
  for (const d of dust) {
    ctx.fillStyle = `rgba(220,250,255,${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== Foreground seaweed layer =====
function drawSeaweedForeground() {
  // only makes sense underwater, but looks fine across screen
  for (const w of seaweed) {
    const sway = Math.sin(t * 1.3 + w.seed) * (w.layer === 2 ? 10 : 6);

    const tipX = w.x + sway;
    const baseX = w.x;
    const baseY = w.y;
    const tipY = w.y - w.h;

    // stem
    ctx.strokeStyle = `rgba(80, 180, 120, ${w.alpha})`;
    ctx.lineWidth = w.layer === 2 ? 5 : 4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX + sway * 0.35, baseY - w.h * 0.45, tipX, tipY);
    ctx.stroke();

    // leaf highlight
    ctx.strokeStyle = `rgba(200, 255, 220, ${w.alpha * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX + 2, baseY - 10);
    ctx.quadraticCurveTo(
      baseX + sway * 0.2,
      baseY - w.h * 0.5,
      tipX + 2,
      tipY + 6
    );
    ctx.stroke();
  }

  ctx.lineWidth = 1;
}

// ===== Vignette (dark edges) =====
function drawVignette() {
  // subtle overlay - multiple passes (cheap but good looking)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  // top
  ctx.fillRect(0, 0, W, 28);
  // bottom
  ctx.fillRect(0, H - 40, W, 40);
  // left
  ctx.fillRect(0, 0, 24, H);
  // right
  ctx.fillRect(W - 24, 0, 24, H);

  // corner darkening
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, H, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W, H, 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ===== Fish drawing =====
function drawFish(f) {
  const x = Math.round(f.x);
  const y = Math.round(f.y);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - 1, y + 1, f.w - 2, f.h - 2);

  ctx.fillStyle = "#cfe9ff";
  ctx.fillRect(x, y + 2, f.w - 4, f.h - 4);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + 2, y + 6, f.w - 10, 3);

  ctx.fillStyle = "#9ad0ff";
  ctx.fillRect(x + f.w - 4, y + 4, 4, f.h - 8);

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(x + 3, y + 6, 2, 2);

  const tw = Math.sin(t * 6 + f.sparkleSeed) > 0.35;
  if (tw) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(x - 6, y + 3, 2, 2);
    ctx.fillRect(x - 4, y + 1, 2, 2);
    ctx.fillRect(x - 2, y + 3, 2, 2);
    ctx.fillRect(x - 4, y + 5, 2, 2);
  }
}

// ===== Obstacles drawing =====
function drawMine(m) {
  const x = Math.round(m.x);
  const y = Math.round(m.y);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - 1, y - 1, m.w + 2, m.h + 2);

  ctx.fillStyle = "#3a3f4a";
  ctx.fillRect(x, y, m.w, m.h);

  ctx.fillStyle = "#222733";
  ctx.fillRect(x + m.w / 2 - 2, y - 6, 4, 6);
  ctx.fillRect(x + m.w / 2 - 2, y + m.h, 4, 6);
  ctx.fillRect(x - 6, y + m.h / 2 - 2, 6, 4);
  ctx.fillRect(x + m.w, y + m.h / 2 - 2, 6, 4);

  const blink = Math.sin(t * 8 + x) > 0;

  if (!m.armed) {
    if (blink) {
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(x + m.w / 2 - 2, y + m.h / 2 - 2, 4, 4);
    }
  } else {
    if (blink) {
      ctx.fillStyle = "#ff4d4d";
      ctx.fillRect(x + m.w / 2 - 2, y + m.h / 2 - 2, 4, 4);
    }
  }
}

function drawLog(L) {
  const x = Math.round(L.x);
  const y = Math.round(L.y);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - 1, y - 1, L.w + 2, L.h + 2);

  ctx.fillStyle = "#7a4b2a";
  ctx.fillRect(x, y, L.w, L.h);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < L.w; i += 12) {
    ctx.fillRect(x + i, y + 2, 4, L.h - 4);
  }
}

// ===== Fox sprite =====
function drawFoxSprite(x, y, facing) {
  const S = 3;

  const bobAmp = isAtSurface() ? 0.6 : 1.6;
  const bob = Math.round(Math.sin(t * 6) * bobAmp);

  const ox = Math.round(x);
  const oy = Math.round(y + bob);

  const ORANGE = "#f08c2b";
  const DARK = "#2b1a10";
  const CREAM = "#f7e6c6";
  const BLUE = "#6dd6ff";
  const GLASS = "rgba(200,245,255,0.75)";
  const BLACK = "#0b1220";
  const OUTLINE = "rgba(0,0,0,0.65)";

  const GRID = 13;

  const fx = (gx) => {
    const mx = facing === 1 ? gx : GRID - 1 - gx;
    return ox + mx * S;
  };
  const fy = (gy) => oy + gy * S;

  function outlinePixel(gx, gy) {
    ctx.fillStyle = OUTLINE;
    px(fx(gx) - 1, fy(gy), S);
    px(fx(gx) + 1, fy(gy), S);
    px(fx(gx), fy(gy) - 1, S);
    px(fx(gx), fy(gy) + 1, S);
  }

  for (let gy = 2; gy <= 12; gy++) {
    for (let gx = 3; gx <= 9; gx++) outlinePixel(gx, gy);
  }
  for (let gy = 0; gy <= 2; gy++) {
    outlinePixel(4, gy);
    outlinePixel(8, gy);
  }
  outlinePixel(11, 3);

  ctx.fillStyle = ORANGE;
  for (let gy = 2; gy <= 9; gy++) {
    for (let gx = 3; gx <= 9; gx++) px(fx(gx), fy(gy), S);
  }

  for (let gy = 0; gy <= 2; gy++) px(fx(4), fy(gy), S);
  px(fx(5), fy(1), S);

  for (let gy = 0; gy <= 2; gy++) px(fx(8), fy(gy), S);
  px(fx(7), fy(1), S);

  ctx.fillStyle = CREAM;
  px(fx(4), fy(2), S);
  px(fx(8), fy(2), S);

  ctx.fillStyle = CREAM;
  for (let gx = 4; gx <= 8; gx++) px(fx(gx), fy(8), S);
  for (let gx = 5; gx <= 7; gx++) px(fx(gx), fy(9), S);

  ctx.fillStyle = DARK;
  px(fx(9), fy(8), S);

  ctx.fillStyle = ORANGE;
  for (let gy = 10; gy <= 12; gy++) {
    for (let gx = 5; gx <= 7; gx++) px(fx(gx), fy(gy), S);
  }

  const kick = isMoving ? (Math.sin(kickPhase) > 0 ? 1 : -1) : 0;
  ctx.fillStyle = DARK;
  px(fx(5), fy(12) + kick, S);
  px(fx(7), fy(12) - kick, S);

  ctx.fillStyle = BLUE;
  for (let gx = 2; gx <= 10; gx++) px(fx(gx), fy(5), S);
  for (let gx = 4; gx <= 8; gx++) px(fx(gx), fy(6), S);
  px(fx(4), fy(7), S);
  px(fx(8), fy(7), S);

  ctx.fillStyle = GLASS;
  for (let gx = 5; gx <= 7; gx++) px(fx(gx), fy(6), S);
  for (let gx = 5; gx <= 7; gx++) px(fx(gx), fy(7), S);

  ctx.fillStyle = BLACK;
  px(fx(6), fy(7), 1);

  ctx.fillStyle = BLUE;
  px(fx(10), fy(9), S);
  px(fx(11), fy(9), S);

  px(fx(11), fy(8), S);
  px(fx(11), fy(7), S);
  px(fx(11), fy(6), S);
  px(fx(11), fy(5), S);
  px(fx(11), fy(4), S);

  ctx.fillStyle = "#ff6b6b";
  px(fx(11), fy(3), S);
}

// ===== Oxygen bar =====
function drawOxygenBar() {
  const barX = 14;
  const barY = 34;
  const barW = 180;
  const barH = 14;

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(barX, barY, barW, barH);

  const pct = oxygen / OXYGEN_MAX;
  ctx.fillStyle =
    pct > 0.35 ? "rgba(120,220,255,0.95)" : "rgba(255,120,120,0.95)";
  ctx.fillRect(barX, barY, Math.round(barW * pct), barH);

  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "12px system-ui";
  ctx.fillText("OXYGEN", barX + barW + 10, barY + 12);
}

// ===== End overlays (thumbs) =====
function drawThumbOverlay(isWin) {
  const img = isWin ? thumbsUpImg : thumbsDownImg;

  // size + position
  const size = 200;
  const x = W / 2 - size / 2;
  const y = H / 2 - size / 2 - 10;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(W / 2, y + size + 18, 90, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // draw image when loaded; if not loaded yet, draw fallback
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "22px system-ui";
    ctx.fillText(isWin ? "👍" : "👎", W / 2 - 12, H / 2);
  }
}

// ===== Draw =====
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Background pass (land + water + wreck + dust)
  drawBackground();

  // UI strip
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, W, 26);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "14px system-ui";
  ctx.fillText("LAND (breathe here)", 14, 18);

  ctx.font = "16px system-ui";
  ctx.fillText(`Fish: ${fishCollected} / ${TOTAL_FISH}`, W - 170, 18);

  drawOxygenBar();

  // Bubbles
  for (const b of bubbles) {
    ctx.strokeStyle = "rgba(220,250,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  // Mines
  for (const m of mines) drawMine(m);

  // Logs
  for (const L of logs) drawLog(L);

  // Fish
  for (const f of fishList) {
    if (!f.alive) continue;
    drawFish(f);
  }

  // Player
  drawFoxSprite(player.x, player.y, player.facing);

  // Foreground seaweed (over gameplay)
  drawSeaweedForeground();

  // Vignette (final mood pass)
  drawVignette();

  // ===== End screens =====
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    // thumbs down
    drawThumbOverlay(false);

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.font = "34px system-ui";
    ctx.fillText("GAME OVER", W / 2 - 105, H / 2 + 140);

    ctx.font = "18px system-ui";
    ctx.fillText("Press R to Restart", W / 2 - 85, H / 2 + 172);
  }

  if (gameWon) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);

    // confetti behind thumb
    drawConfetti();

    // thumbs up
    drawThumbOverlay(true);

    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.font = "34px system-ui";
    ctx.fillText("YOU WIN!", W / 2 - 78, H / 2 + 140);

    ctx.font = "18px system-ui";
    ctx.fillText("Press R to Play Again", W / 2 - 105, H / 2 + 172);
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