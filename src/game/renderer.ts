import {
  BulletEntity,
  CloudLayerItem,
  EnemyEntity,
  FloatingTextEntity,
  ParticleEntity,
  PlayerEntity,
  PowerUpEntity,
  ShockwaveEntity,
} from './types';

export interface RenderState {
  width: number;
  height: number;
  time: number;
  scrollOffset: number;
  shakeX: number;
  shakeY: number;
  clouds: CloudLayerItem[];
  player: PlayerEntity;
  enemies: EnemyEntity[];
  bullets: BulletEntity[];
  powerUps: PowerUpEntity[];
  particles: ParticleEntity[];
  shockwaves: ShockwaveEntity[];
  floatingTexts: FloatingTextEntity[];
  bossWarningTimer: number;
  warningText: string;
  showHitbox: boolean;
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { width, height, time, scrollOffset, shakeX, shakeY } = state;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1. Deep Stratospheric Twilight Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, '#081224');
  skyGrad.addColorStop(0.55, '#0D1C34');
  skyGrad.addColorStop(1, '#142642');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-20, -20, width + 40, height + 40);

  // Subtle horizon amber warmth at bottom
  const duskGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 1.05,
    20,
    width * 0.5,
    height * 1.05,
    height * 0.65
  );
  duskGlow.addColorStop(0, 'rgba(245, 158, 11, 0.10)');
  duskGlow.addColorStop(0.5, 'rgba(180, 83, 9, 0.04)');
  duskGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = duskGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Moving Tactical Altitude Grid
  drawAltitudeGrid(ctx, width, height, scrollOffset);

  // 3. Layered Parallax Clouds
  for (const cloud of state.clouds) {
    ctx.save();
    ctx.globalAlpha = cloud.alpha;
    ctx.fillStyle = cloud.tint;
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.radiusX, cloud.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    // Soft upper rim highlight
    ctx.globalAlpha = cloud.alpha * 0.45;
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.ellipse(
      cloud.x,
      cloud.y - cloud.radiusY * 0.35,
      cloud.radiusX * 0.72,
      cloud.radiusY * 0.38,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  // 4. Shockwaves (EMP & Boss Explosions)
  for (const sw of state.shockwaves) {
    ctx.save();
    ctx.globalAlpha = sw.alpha;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = sw.alpha * 0.22;
    ctx.fillStyle = sw.color;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Power-Ups
  for (const pu of state.powerUps) {
    drawPowerUp(ctx, pu, time);
  }

  // 6. Enemies & Telegraph Lines
  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy, time);
  }

  // 7. Player Aircraft
  drawPlayer(ctx, state.player, time, state.showHitbox);

  // 8. Bullets (Player & Enemy — high readability)
  for (const b of state.bullets) {
    drawBullet(ctx, b);
  }

  // 9. Particles
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'debris') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation ?? 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size * 0.6, -p.size * 0.3, p.size * 1.2, p.size * 0.6);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 10. Floating Score / Pickup Text
  for (const ft of state.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `700 ${Math.round(13 * ft.scale)}px "JetBrains Mono", "Noto Sans KR", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#09111F';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // 11. Boss Warning Banner (non-blocking centered band)
  if (state.bossWarningTimer > 0 && state.warningText) {
    const pulse = 0.65 + 0.35 * Math.sin(time * 14);
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bossWarningTimer) * pulse;
    const bandY = height * 0.28;
    ctx.fillStyle = 'rgba(185, 28, 28, 0.28)';
    ctx.fillRect(0, bandY - 28, width, 56);
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, bandY - 28);
    ctx.lineTo(width, bandY - 28);
    ctx.moveTo(0, bandY + 28);
    ctx.lineTo(width, bandY + 28);
    ctx.stroke();

    ctx.fillStyle = '#FEF2F2';
    ctx.font = '700 18px "Outfit", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.warningText, width * 0.5, bandY);
    ctx.restore();
  }

  ctx.restore();
}

function drawAltitudeGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollOffset: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
  ctx.lineWidth = 1;
  const step = 64;
  const offsetY = scrollOffset % step;

  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = offsetY; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerEntity,
  time: number,
  showHitbox: boolean
) {
  // Blink cleanly during invulnerability frames
  if (player.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = 0.42;
  } else {
    ctx.save();
  }

  ctx.translate(player.x, player.y);
  const bankScaleX = 1 - Math.abs(player.tilt) * 0.14;
  ctx.scale(bankScaleX, 1);

  const isFalcon = player.aircraftId === 'falcon';
  const flameLen = 14 + Math.sin(time * 48) * 4;

  // Twin afterburner flames
  const drawFlame = (fx: number, fy: number, w: number) => {
    const grad = ctx.createLinearGradient(fx, fy, fx, fy + flameLen);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.35, isFalcon ? '#38BDF8' : '#34D399');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(fx - w, fy);
    ctx.lineTo(fx + w, fy);
    ctx.lineTo(fx, fy + flameLen);
    ctx.closePath();
    ctx.fill();
  };

  if (isFalcon) {
    drawFlame(-6, 17, 3.6);
    drawFlame(6, 17, 3.6);

    // Swept main wings
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(8, -6);
    ctx.lineTo(26, 11);
    ctx.lineTo(24, 16);
    ctx.lineTo(9, 10);
    ctx.lineTo(14, 20);
    ctx.lineTo(5, 18);
    ctx.lineTo(0, 14);
    ctx.lineTo(-5, 18);
    ctx.lineTo(-14, 20);
    ctx.lineTo(-9, 10);
    ctx.lineTo(-24, 16);
    ctx.lineTo(-26, 11);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Signal amber tactical stripes on wings
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(22, 10);
    ctx.lineTo(18, 12);
    ctx.lineTo(7, 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-22, 10);
    ctx.lineTo(-18, 12);
    ctx.lineTo(-7, 3);
    ctx.closePath();
    ctx.fill();

    // Fuselage spine
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(5, -6);
    ctx.lineTo(4, 17);
    ctx.lineTo(-4, 17);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    ctx.fill();

    // Canopy
    ctx.fillStyle = '#0EA5E9';
    ctx.beginPath();
    ctx.ellipse(0, -7, 3.1, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.ellipse(-1, -9.5, 1.1, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // AEGIS X-9 Heavy Twin-Boom Interceptor
    drawFlame(-12, 19, 4.2);
    drawFlame(12, 19, 4.2);

    // Armored wings & twin booms
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -23);
    ctx.lineTo(9, -10);
    ctx.lineTo(29, 3);
    ctx.lineTo(27, 13);
    ctx.lineTo(16, 12);
    ctx.lineTo(15, 22);
    ctx.lineTo(9, 22);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-9, 22);
    ctx.lineTo(-15, 22);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-27, 13);
    ctx.lineTo(-29, 3);
    ctx.lineTo(-9, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing cannons
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-20, -14, 3.5, 16);
    ctx.fillRect(16.5, -14, 3.5, 16);

    // Emerald tactical trim
    ctx.fillStyle = '#10B981';
    ctx.fillRect(-14, -4, 3, 18);
    ctx.fillRect(11, -4, 3, 18);
    ctx.fillRect(-24, 5, 8, 3);
    ctx.fillRect(16, 5, 8, 3);

    // Central armored pod & canopy
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(6.5, -9);
    ctx.lineTo(5.5, 11);
    ctx.lineTo(-5.5, 11);
    ctx.lineTo(-6.5, -9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.ellipse(0, -9, 3.4, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Muzzle flash
  if (player.muzzleFlash > 0) {
    ctx.fillStyle = isFalcon
      ? 'rgba(253, 224, 71, 0.85)'
      : 'rgba(110, 231, 183, 0.85)';
    ctx.beginPath();
    ctx.arc(-12, -20, 4.5, 0, Math.PI * 2);
    ctx.arc(12, -20, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Energy Shield Dome
  if (player.shield > 0) {
    const pulse = 0.72 + 0.28 * Math.sin(time * 6);
    ctx.strokeStyle =
      player.shield >= 2
        ? `rgba(52, 211, 153, ${0.75 * pulse})`
        : `rgba(56, 189, 248, ${0.65 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle =
      player.shield >= 2
        ? 'rgba(16, 185, 129, 0.09)'
        : 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core hitbox indicator dot (always visible subtly for precise dodging)
  if (showHitbox) {
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, 1, player.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyEntity, time: number) {
  ctx.save();

  // Striker laser aim telegraph before dash
  if (enemy.type === 'STRIKER' && enemy.dashState === 'aim' && enemy.dashAngle !== undefined) {
    ctx.save();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.65)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(
      enemy.x + Math.cos(enemy.dashAngle) * 520,
      enemy.y + Math.sin(enemy.dashAngle) * 520
    );
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(enemy.x, enemy.y);

  const isHit = enemy.hitFlash > 0;

  if (enemy.type === 'SCOUT') {
    ctx.fillStyle = isHit ? '#FFFFFF' : '#94A3B8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(15, -8);
    ctx.lineTo(5, -14);
    ctx.lineTo(0, -6);
    ctx.lineTo(-5, -14);
    ctx.lineTo(-15, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHit ? '#FFFFFF' : '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'INTERCEPTOR') {
    ctx.fillStyle = isHit ? '#FFFFFF' : '#64748B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(7, 4);
    ctx.lineTo(22, 12);
    ctx.lineTo(18, -10);
    ctx.lineTo(6, -16);
    ctx.lineTo(-6, -16);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-22, 12);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isHit ? '#FFFFFF' : '#F97316';
    ctx.fillRect(-12, -6, 4, 10);
    ctx.fillRect(8, -6, 4, 10);
    ctx.beginPath();
    ctx.ellipse(0, 4, 3.2, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'HEAVY') {
    // Armored Flying-Wing Gunship
    ctx.fillStyle = isHit ? '#FFFFFF' : '#475569';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(18, 18);
    ctx.lineTo(36, 4);
    ctx.lineTo(30, -18);
    ctx.lineTo(12, -24);
    ctx.lineTo(-12, -24);
    ctx.lineTo(-30, -18);
    ctx.lineTo(-36, 4);
    ctx.lineTo(-18, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Accent armor plates & glowing core
    ctx.fillStyle = isHit ? '#FFFFFF' : '#B91C1C';
    ctx.fillRect(-24, -6, 12, 10);
    ctx.fillRect(12, -6, 12, 10);

    ctx.fillStyle = isHit ? '#FFFFFF' : '#F59E0B';
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'STRIKER') {
    const rot =
      enemy.dashAngle !== undefined ? enemy.dashAngle - Math.PI / 2 : 0;
    ctx.rotate(rot);

    ctx.fillStyle = isHit ? '#FFFFFF' : '#DC2626';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(13, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(-13, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, 4, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'BOSS') {
    drawBossSprite(ctx, enemy, time, isHit);
  }

  // Mini HP bar for Heavy enemies (not Boss, Boss has dedicated HUD bar)
  if (enemy.type === 'HEAVY' && enemy.hp < enemy.maxHp) {
    const bw = 46;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-bw / 2, -33, bw, 5);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-bw / 2 + 1, -32, (bw - 2) * ratio, 3);
  }

  ctx.restore();
}

function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  boss: EnemyEntity,
  time: number,
  isHit: boolean
) {
  const hpRatio = boss.hp / boss.maxHp;
  const pulse = 0.7 + 0.3 * Math.sin(time * 8);

  // Main Dreadnought Hull
  ctx.fillStyle = isHit ? '#FFFFFF' : '#334155';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 48);
  ctx.lineTo(28, 36);
  ctx.lineTo(44, 42);
  ctx.lineTo(86, 16);
  ctx.lineTo(94, -14);
  ctx.lineTo(64, -36);
  ctx.lineTo(30, -44);
  ctx.lineTo(-30, -44);
  ctx.lineTo(-64, -36);
  ctx.lineTo(-94, -14);
  ctx.lineTo(-86, 16);
  ctx.lineTo(-44, 42);
  ctx.lineTo(-28, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary Deck Armor
  ctx.fillStyle = isHit ? '#F8FAFC' : '#475569';
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(54, 12);
  ctx.lineTo(46, -28);
  ctx.lineTo(-46, -28);
  ctx.lineTo(-54, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crimson Wing Stripes
  ctx.fillStyle = isHit ? '#FFFFFF' : '#B91C1C';
  ctx.fillRect(-76, -12, 22, 14);
  ctx.fillRect(54, -12, 22, 14);

  // Twin Wing Turrets
  const drawTurret = (tx: number, ty: number) => {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(tx, ty, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(tx, ty + 4, 3.8, 0, Math.PI * 2);
    ctx.fill();
  };
  drawTurret(-52, 14);
  drawTurret(52, 14);

  // Central Reactor Core (turns crimson in Phase 2 below 50% HP)
  const coreColor = hpRatio < 0.5 ? '#EF4444' : '#F59E0B';
  ctx.save();
  ctx.fillStyle = coreColor;
  ctx.globalAlpha = 0.25 * pulse;
  ctx.beginPath();
  ctx.arc(0, 4, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = isHit ? '#FFFFFF' : coreColor;
  ctx.beginPath();
  ctx.arc(0, 4, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.arc(0, 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: BulletEntity) {
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.fromPlayer) {
    if (b.kind === 'missile') {
      const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.rotate(angle);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(3.5, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(-3.5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-1.2, -6, 2.4, 5);
    } else if (b.kind === 'cannon') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.fillRect(-5, -14, 10, 28);
      ctx.fillStyle = '#34D399';
      ctx.fillRect(-3, -12, 6, 24);
      ctx.fillStyle = '#ECFDF5';
      ctx.fillRect(-1.4, -10, 2.8, 18);
    } else {
      const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';
      ctx.fillRect(-3.8, -11, 7.6, 22);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-2.1, -9, 4.2, 18);
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(-1, -7, 2, 12);
    }
  } else {
    // High-contrast enemy bullets with bright white core
    if (b.kind === 'boss_plasma') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'enemy_dart') {
      const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.rotate(angle);
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(4, 6);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFF7ED';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FEF2F2';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpEntity, time: number) {
  ctx.save();
  ctx.translate(pu.x, pu.y);

  const pulse = 1 + 0.08 * Math.sin(time * 8 + pu.id);
  ctx.scale(pulse, pulse);

  let bg = '#F59E0B';
  let label = 'P';
  if (pu.type === 'REPAIR') {
    bg = '#10B981';
    label = '+';
  } else if (pu.type === 'BOMB') {
    bg = '#EF4444';
    label = 'B';
  } else if (pu.type === 'SHIELD') {
    bg = '#38BDF8';
    label = 'S';
  }

  // Soft outer ring
  ctx.strokeStyle = bg;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, pu.radius + 4, 0, Math.PI * 2);
  ctx.stroke();

  // Hexagonal capsule
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = bg;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const rx = Math.cos(a) * pu.radius;
    const ry = Math.sin(a) * pu.radius;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0.5);

  ctx.restore();
}
