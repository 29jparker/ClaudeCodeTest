// art.js — all procedural pixel-art drawing for the shooter game
const Art = (() => {

  // ── Arena ──────────────────────────────────────────────────────────────────
  function drawArena(ctx, w, h) {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gs = 32;
    for (let x = 0; x <= w; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }

  // ── Player ─────────────────────────────────────────────────────────────────
  function drawPlayer(ctx, x, y, aimAngle, walkFrame, isHurt) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Hurt flicker
    if (isHurt && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.25;
    }

    // Legs (animated)
    const lo = Math.sin(walkFrame) * 4;
    ctx.fillStyle = '#2e2e50';
    ctx.fillRect(-6, 6 + lo,  5, 7);  // left leg
    ctx.fillRect( 1, 6 - lo,  5, 7);  // right leg

    // Body
    ctx.fillStyle = '#4a4a7e';
    ctx.fillRect(-7, -6, 14, 14);

    // Chest stripe
    ctx.fillStyle = '#6060a0';
    ctx.fillRect(-4, -4, 8, 3);

    // Head
    ctx.fillStyle = '#c8a070';
    ctx.fillRect(-5, -15, 10, 10);

    // Eyes — follow aim direction
    const ex = Math.cos(aimAngle) * 2;
    const ey = Math.sin(aimAngle) * 1;
    ctx.fillStyle = '#111';
    ctx.fillRect(-3 + ex, -12 + ey, 2, 2);
    ctx.fillRect( 1 + ex, -12 + ey, 2, 2);

    // Gun arm (rotates with aim)
    ctx.save();
    ctx.rotate(aimAngle);
    ctx.fillStyle = '#4a4a7e';   // upper arm
    ctx.fillRect(2, -3, 8, 5);
    ctx.fillStyle = '#444';       // gun body
    ctx.fillRect(8, -4, 7, 7);
    ctx.fillStyle = '#888';       // barrel
    ctx.fillRect(13, -2, 10, 3);
    ctx.fillStyle = '#aaa';       // muzzle
    ctx.fillRect(22, -1, 3, 2);
    ctx.restore();

    ctx.restore();
  }

  // ── Enemy ──────────────────────────────────────────────────────────────────
  function drawEnemy(ctx, x, y, type, walkFrame, hp, maxHp) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    if (type === 'walker') {
      const lo = Math.sin(walkFrame * 1.5) * 3;
      ctx.fillStyle = '#1a4a1a';
      ctx.fillRect(-5, 5 + lo,  4, 6);
      ctx.fillRect( 1, 5 - lo,  4, 6);
      ctx.fillStyle = '#2d8c2d';
      ctx.fillRect(-6, -5, 12, 12);
      ctx.fillStyle = '#3aaf3a';
      ctx.fillRect(-4, -14, 8, 10);
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(-3, -11, 2, 2);
      ctx.fillRect( 1, -11, 2, 2);

    } else if (type === 'runner') {
      const lo = Math.sin(walkFrame * 2.5) * 5;
      ctx.save();
      ctx.rotate(-0.18);
      ctx.fillStyle = '#7a3500';
      ctx.fillRect(-3, 5 + lo,  3, 8);
      ctx.fillRect( 0, 5 - lo,  3, 8);
      ctx.fillStyle = '#e06010';
      ctx.fillRect(-4, -6, 8, 13);
      ctx.fillStyle = '#f07820';
      ctx.fillRect(-3, -14, 7, 9);
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(-2, -11, 2, 2);
      ctx.fillRect( 2, -11, 2, 2);
      ctx.restore();

    } else if (type === 'tank') {
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(-10, -9, 20, 18);
      ctx.fillStyle = '#660000';
      ctx.fillRect(-10, -9,  4, 18);
      ctx.fillRect(  6, -9,  4, 18);
      ctx.fillRect(-10, -9, 20,  4);
      ctx.fillStyle = '#a01010';
      ctx.fillRect(-6, -17, 12, 10);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-4, -14, 3, 3);
      ctx.fillRect( 1, -14, 3, 3);

      // HP bar
      if (maxHp > 1) {
        const bw = 26, bh = 4;
        const filled = (hp / maxHp) * bw;
        ctx.fillStyle = '#222';
        ctx.fillRect(-13, -24, bw, bh);
        ctx.fillStyle = hp >= maxHp ? '#00cc44' : hp > 1 ? '#ff8800' : '#ff2222';
        ctx.fillRect(-13, -24, filled, bh);
      }
    }

    ctx.restore();
  }

  // ── Bullet ─────────────────────────────────────────────────────────────────
  function drawBullet(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255,255,80,0.25)';
    ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(-5, -2, 9, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, -1, 4, 2);
    ctx.restore();
  }

  // ── Particle ───────────────────────────────────────────────────────────────
  function drawParticle(ctx, p) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x) - p.size / 2, Math.round(p.y) - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  function drawHUD(ctx, w, h, playerHp, maxHp, level, wave, totalWaves, score) {
    // Hearts
    for (let i = 0; i < maxHp; i++) {
      drawHeart(ctx, 16 + i * 22, 16, i < playerHp);
    }

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 6;
    ctx.fillText('SCORE: ' + String(score).padStart(6, '0'), w - 14, 26);
    ctx.shadowBlur = 0;

    // Level (top center)
    ctx.fillStyle = '#8888cc';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL ' + level, w / 2, 22);

    // Wave (bottom center)
    ctx.fillStyle = '#8888aa';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('WAVE ' + wave + ' / ' + totalWaves, w / 2, h - 12);

    ctx.textAlign = 'left';
  }

  function drawHeart(ctx, x, y, filled) {
    // 5×5 pixel heart pattern
    const pat = [
      [0,1,0,1,0],
      [1,1,1,1,1],
      [1,1,1,1,1],
      [0,1,1,1,0],
      [0,0,1,0,0],
    ];
    ctx.fillStyle = filled ? '#e94560' : '#333355';
    for (let r = 0; r < pat.length; r++) {
      for (let c = 0; c < pat[r].length; c++) {
        if (pat[r][c]) ctx.fillRect(x + c * 3 - 7, y + r * 3 - 7, 3, 3);
      }
    }
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  function drawMenu(ctx, w, h, time, bgEnemies) {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Drifting background enemies
    ctx.globalAlpha = 0.18;
    bgEnemies.forEach(e => drawEnemy(ctx, e.x, e.y, 'walker', time * 3, 1, 1));
    ctx.globalAlpha = 1;

    // Title shadow
    ctx.textAlign = 'center';
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.fillStyle = '#7a0022';
    ctx.fillText('SHOOTER', w / 2 + 4, h / 2 - 90 + 4);
    // Title
    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 20;
    ctx.fillText('SHOOTER', w / 2, h / 2 - 90);
    ctx.shadowBlur = 0;

    // Controls
    ctx.fillStyle = '#555577';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('ARROW KEYS  •  MOUSE TO AIM  •  CLICK TO SHOOT', w / 2, h / 2 - 34);

    // Blinking start prompt
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText('PRESS ENTER OR CLICK TO START', w / 2, h / 2 + 16);
    }

    ctx.textAlign = 'left';
  }

  // ── Level transition ────────────────────────────────────────────────────────
  function drawTransition(ctx, w, h, level, alpha) {
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.88) + ')';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
    ctx.shadowColor = 'rgba(255,220,0,' + alpha + ')';
    ctx.shadowBlur = 30;
    ctx.fillText('LEVEL ' + level, w / 2, h / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(180,180,180,' + alpha + ')';
    ctx.font = '22px "Courier New", monospace';
    ctx.fillText('GET READY...', w / 2, h / 2 + 32);
    ctx.textAlign = 'left';
  }

  // ── Game Over ──────────────────────────────────────────────────────────────
  function drawGameOver(ctx, w, h, score, time) {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Courier New", monospace';
    ctx.fillStyle = '#7a0000';
    ctx.fillText('GAME OVER', w / 2 + 4, h / 2 - 56 + 4);
    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', w / 2, h / 2 - 56);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText('SCORE: ' + String(score).padStart(6, '0'), w / 2, h / 2 + 12);

    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('PRESS ENTER TO PLAY AGAIN', w / 2, h / 2 + 60);
    }
    ctx.textAlign = 'left';
  }

  // ── Hit flash overlay ──────────────────────────────────────────────────────
  function drawHitFlash(ctx, w, h, intensity) {
    ctx.fillStyle = 'rgba(220,0,0,' + (intensity * 0.38) + ')';
    ctx.fillRect(0, 0, w, h);
  }

  // ── Wave clear / level complete banner ─────────────────────────────────────
  function drawWaveBanner(ctx, w, h, text) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w / 2 - 180, h / 2 - 22, 360, 40);
    ctx.fillStyle = '#ffff44';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 12;
    ctx.fillText(text, w / 2, h / 2 + 10);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  return {
    drawArena,
    drawPlayer,
    drawEnemy,
    drawBullet,
    drawParticle,
    drawHUD,
    drawMenu,
    drawTransition,
    drawGameOver,
    drawHitFlash,
    drawWaveBanner,
  };
})();
