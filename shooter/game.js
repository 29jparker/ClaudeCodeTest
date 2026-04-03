// game.js — main game logic, loop, entities, state machine

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W      = canvas.width;
const H      = canvas.height;

// ── Input ──────────────────────────────────────────────────────────────────
const keys  = {};
const mouse = { x: W / 2, y: H / 2, down: false };

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Enter') {
    if (state === STATE.MENU || state === STATE.GAME_OVER) startGame();
  }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousemove', e => {
  const r  = canvas.getBoundingClientRect();
  const sx = W / r.width;
  const sy = H / r.height;
  mouse.x  = (e.clientX - r.left) * sx;
  mouse.y  = (e.clientY - r.top)  * sy;
});
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  mouse.down = true;
  if (state === STATE.MENU || state === STATE.GAME_OVER) startGame();
});
canvas.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });

// ── State ──────────────────────────────────────────────────────────────────
const STATE = { MENU: 'MENU', PLAYING: 'PLAYING', TRANSITION: 'TRANSITION', GAME_OVER: 'GAME_OVER' };
let state = STATE.MENU;

// ── Game vars ──────────────────────────────────────────────────────────────
let score, level, wave, totalWaves;
let player, bullets, enemies, particles;
let shakeTimer, hitFlash;
let transitionTimer, menuTime;
let bgEnemies;
let spawnQueue, spawnTimer;
let waveClear, waveTimer;

const SPAWN_INTERVAL = 500;  // ms between enemy spawns
const WAVE_PAUSE     = 2200; // ms after wave clears before next starts

// ── Level config ───────────────────────────────────────────────────────────
function getLevelConfig(lvl) {
  if (lvl === 1) return { waves: 3, types: ['walker'],                    counts: [6, 8, 10] };
  if (lvl === 2) return { waves: 4, types: ['walker', 'runner'],          counts: [8, 10, 12, 14] };
  if (lvl === 3) return { waves: 5, types: ['walker', 'runner', 'tank'],  counts: [10, 12, 14, 16, 18] };
  // Level 4+ — scale up
  const mult   = Math.pow(1.3, lvl - 3);
  const counts = [10, 12, 14, 16, 18].map(c => Math.round(c * mult));
  return { waves: 5, types: ['walker', 'runner', 'tank'], counts };
}

// ── Player ─────────────────────────────────────────────────────────────────
class Player {
  constructor() {
    this.x         = W / 2;
    this.y         = H / 2;
    this.speed     = 180;
    this.hp        = 5;
    this.maxHp     = 5;
    this.aimAngle  = 0;
    this.walkFrame = 0;
    this.invTimer  = 0;   // ms remaining of invincibility
    this.fireCd    = 0;   // ms remaining until next shot
    this.moving    = false;
  }

  update(dt) {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;
    if (keys['ArrowUp']    || keys['w']) dy -= 1;
    if (keys['ArrowDown']  || keys['s']) dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this.moving = dx !== 0 || dy !== 0;

    this.x = Math.max(14, Math.min(W - 14, this.x + dx * this.speed * dt));
    this.y = Math.max(14, Math.min(H - 14, this.y + dy * this.speed * dt));

    if (this.moving) this.walkFrame += dt * 9;

    this.aimAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

    this.fireCd = Math.max(0, this.fireCd - dt * 1000);
    if (mouse.down && this.fireCd === 0) this.fire();

    this.invTimer = Math.max(0, this.invTimer - dt * 1000);
  }

  fire() {
    this.fireCd    = 240;
    const tipDist  = 22;
    bullets.push(new Bullet(
      this.x + Math.cos(this.aimAngle) * tipDist,
      this.y + Math.sin(this.aimAngle) * tipDist,
      this.aimAngle
    ));
  }

  takeDamage() {
    if (this.invTimer > 0) return;
    this.hp--;
    this.invTimer  = 1100;
    shakeTimer     = 320;
    hitFlash       = 1.0;
    if (this.hp <= 0) triggerGameOver();
  }

  draw() {
    Art.drawPlayer(ctx, this.x, this.y, this.aimAngle, this.walkFrame, this.invTimer > 0);
  }
}

// ── Bullet ─────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x     = x;
    this.y     = y;
    this.angle = angle;
    const spd  = 520;
    this.vx    = Math.cos(angle) * spd;
    this.vy    = Math.sin(angle) * spd;
    this.dead  = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -20 || this.x > W + 20 || this.y < -20 || this.y > H + 20) {
      this.dead = true;
    }
  }

  draw() {
    Art.drawBullet(ctx, this.x, this.y, this.angle);
  }
}

// ── Enemy ──────────────────────────────────────────────────────────────────
const ENEMY_STATS = {
  walker: { speed: 62,  hp: 1, maxHp: 1, radius: 10, points: 10 },
  runner: { speed: 125, hp: 1, maxHp: 1, radius:  8, points: 20 },
  tank:   { speed: 42,  hp: 3, maxHp: 3, radius: 14, points: 30 },
};

class Enemy {
  constructor(x, y, type) {
    this.x         = x;
    this.y         = y;
    this.type      = type;
    this.walkFrame = Math.random() * Math.PI * 2;
    this.dead      = false;
    Object.assign(this, ENEMY_STATS[type]);
    // give a personal copy of hp (maxHp is shared via prototype, that's fine)
    this.hp        = ENEMY_STATS[type].hp;
  }

  update(dt) {
    const dx   = player.x - this.x;
    const dy   = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.walkFrame += dt * 6;

    // Contact damage
    if (dist < this.radius + 13) player.takeDamage();
  }

  takeDamage(dmg = 1) {
    this.hp -= dmg;
    spawnHitParticles(this.x, this.y, this.type);
    if (this.hp <= 0) {
      this.dead = true;
      spawnDeathParticles(this.x, this.y, this.type);
      score += this.points;
    }
  }

  draw() {
    Art.drawEnemy(ctx, this.x, this.y, this.type, this.walkFrame, this.hp, this.maxHp);
  }
}

// ── Particle ───────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x       = x;  this.y    = y;
    this.vx      = vx; this.vy   = vy;
    this.color   = color;
    this.size    = size;
    this.life    = life;
    this.maxLife = life;
    this.dead    = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vx *= 0.88;
    this.vy *= 0.88;
    this.life -= dt * 1000;
    if (this.life <= 0) this.dead = true;
  }

  draw() { Art.drawParticle(ctx, this); }
}

const DEATH_COLORS = {
  walker: ['#2d8c2d','#3aaf3a','#1a4a1a','#66ff66'],
  runner: ['#e06010','#f07820','#ffaa00','#ff6600'],
  tank:   ['#8b0000','#a01010','#cc2222','#ff4444'],
};

function spawnDeathParticles(x, y, type) {
  const cols = DEATH_COLORS[type];
  for (let i = 0; i < 12; i++) {
    const a   = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 140;
    const col = cols[Math.floor(Math.random() * cols.length)];
    particles.push(new Particle(x, y, Math.cos(a)*spd, Math.sin(a)*spd, col, 2 + Math.random() * 4, 350 + Math.random() * 300));
  }
}

function spawnHitParticles(x, y, type) {
  const cols = DEATH_COLORS[type];
  for (let i = 0; i < 4; i++) {
    const a   = Math.random() * Math.PI * 2;
    const spd = 25 + Math.random() * 55;
    particles.push(new Particle(x, y, Math.cos(a)*spd, Math.sin(a)*spd, cols[0], 2, 180));
  }
}

// ── Spawn system ───────────────────────────────────────────────────────────
function spawnAtEdge(type) {
  const side = Math.floor(Math.random() * 4);
  const m    = 35;
  let x, y;
  if      (side === 0) { x = Math.random() * W;  y = -m; }
  else if (side === 1) { x = W + m;               y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W;  y = H + m; }
  else                 { x = -m;                  y = Math.random() * H; }
  enemies.push(new Enemy(x, y, type));
}

function buildSpawnQueue(lvl, waveIdx) {
  const cfg   = getLevelConfig(lvl);
  const count = cfg.counts[waveIdx] ?? cfg.counts[cfg.counts.length - 1];
  const types = cfg.types;
  const q     = [];
  for (let i = 0; i < count; i++) {
    let t;
    if      (types.length === 1) t = types[0];
    else if (types.length === 2) t = Math.random() < 0.58 ? types[0] : types[1];
    else {
      const r = Math.random();
      t = r < 0.48 ? types[0] : r < 0.80 ? types[1] : types[2];
    }
    q.push(t);
  }
  return q;
}

// ── Game flow ──────────────────────────────────────────────────────────────
function startGame() {
  score      = 0;
  level      = 1;
  wave       = 0;
  bullets    = [];
  enemies    = [];
  particles  = [];
  shakeTimer = 0;
  hitFlash   = 0;
  waveClear  = false;
  waveTimer  = 0;
  player     = new Player();
  state      = STATE.PLAYING;
  beginWave();
}

function beginWave() {
  wave++;
  const cfg  = getLevelConfig(level);
  totalWaves = cfg.waves;
  spawnQueue = buildSpawnQueue(level, wave - 1);
  spawnTimer = 0;   // spawn first enemy immediately
  waveClear  = false;
  waveTimer  = 0;
}

function triggerLevelTransition() {
  level++;
  wave      = 0;
  bullets   = [];
  enemies   = [];
  particles = [];
  transitionTimer = 2800;
  state           = STATE.TRANSITION;
}

function triggerGameOver() {
  state    = STATE.GAME_OVER;
  menuTime = 0;
}

// ── Collision ──────────────────────────────────────────────────────────────
function checkCollisions() {
  for (const b of bullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = b.x - e.x, dy = b.y - e.y;
      if (dx*dx + dy*dy < (e.radius + 4) * (e.radius + 4)) {
        b.dead = true;
        e.takeDamage(1);
        break;
      }
    }
  }
}

// ── Update ─────────────────────────────────────────────────────────────────
function updatePlaying(dt) {
  // Trickle enemies from spawn queue
  if (spawnQueue.length > 0) {
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      spawnAtEdge(spawnQueue.pop());
      spawnTimer = SPAWN_INTERVAL;
    }
  }

  player.update(dt);
  enemies.forEach(e => e.update(dt));
  bullets.forEach(b => b.update(dt));
  particles.forEach(p => p.update(dt));

  checkCollisions();

  bullets   = bullets.filter(b => !b.dead);
  enemies   = enemies.filter(e => !e.dead);
  particles = particles.filter(p => !p.dead);

  hitFlash   = Math.max(0, hitFlash   - dt * 2.5);
  shakeTimer = Math.max(0, shakeTimer - dt * 1000);

  // Wave / level progression
  if (!waveClear && spawnQueue.length === 0 && enemies.length === 0) {
    waveClear = true;
    waveTimer = WAVE_PAUSE;
  }
  if (waveClear) {
    waveTimer -= dt * 1000;
    if (waveTimer <= 0) {
      const cfg = getLevelConfig(level);
      if (wave >= cfg.waves) {
        triggerLevelTransition();
      } else {
        beginWave();
      }
    }
  }
}

function updateTransition(dt) {
  transitionTimer -= dt * 1000;
  if (transitionTimer <= 0) {
    state = STATE.PLAYING;
    beginWave();
  }
}

// ── Draw ───────────────────────────────────────────────────────────────────
function drawPlaying() {
  // Screen shake
  let sx = 0, sy = 0;
  if (shakeTimer > 0) { sx = (Math.random()-0.5)*8; sy = (Math.random()-0.5)*8; }
  ctx.save();
  ctx.translate(sx, sy);

  Art.drawArena(ctx, W, H);
  particles.forEach(p => p.draw());
  enemies.forEach(e => e.draw());
  player.draw();
  bullets.forEach(b => b.draw());

  if (hitFlash > 0) Art.drawHitFlash(ctx, W, H, hitFlash);
  ctx.restore();

  Art.drawHUD(ctx, W, H, player.hp, player.maxHp, level, wave, totalWaves, score);

  // Wave clear / level complete banner
  if (waveClear && waveTimer > 0) {
    const cfg = getLevelConfig(level);
    const txt = wave >= cfg.waves ? 'LEVEL COMPLETE!' : 'WAVE CLEAR!';
    Art.drawWaveBanner(ctx, W, H, txt);
  }
}

function drawTransition() {
  Art.drawArena(ctx, W, H);
  const elapsed = 2800 - transitionTimer;
  const alpha   = Math.min(1, elapsed / 600);
  Art.drawTransition(ctx, W, H, level, alpha);
}

// ── Main loop ───────────────────────────────────────────────────────────────
let lastTs = null;

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs   = ts;

  ctx.clearRect(0, 0, W, H);

  if (state === STATE.MENU) {
    menuTime += dt;
    bgEnemies.forEach(e => {
      e.x = ((e.x + e.vx * dt) + W + 60) % (W + 60);
      e.y = ((e.y + e.vy * dt) + H + 60) % (H + 60);
    });
    Art.drawMenu(ctx, W, H, menuTime, bgEnemies);

  } else if (state === STATE.PLAYING) {
    updatePlaying(dt);
    drawPlaying();

  } else if (state === STATE.TRANSITION) {
    updateTransition(dt);
    drawTransition();

  } else if (state === STATE.GAME_OVER) {
    menuTime += dt;
    Art.drawGameOver(ctx, W, H, score, menuTime);
  }

  requestAnimationFrame(loop);
}

// ── Init ───────────────────────────────────────────────────────────────────
bgEnemies = Array.from({ length: 6 }, () => ({
  x:  Math.random() * W,
  y:  Math.random() * H,
  vx: (Math.random() - 0.5) * 50,
  vy: (Math.random() - 0.5) * 50,
}));

menuTime = 0;
requestAnimationFrame(loop);
