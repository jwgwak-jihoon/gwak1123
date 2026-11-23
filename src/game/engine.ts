import { renderGameFrame } from './renderer';
import { soundEngine } from './sound';
import {
  AIRCRAFT_CONFIGS,
  AircraftId,
  BulletEntity,
  CloudLayerItem,
  DIFFICULTY_CONFIGS,
  DifficultyId,
  EnemyEntity,
  EnemyType,
  FloatingTextEntity,
  GameState,
  HudSnapshot,
  ParticleEntity,
  PlayerEntity,
  PowerUpEntity,
  PowerUpType,
  ShockwaveEntity,
} from './types';

const BOSS_NAMES = [
  '스카이 포트리스 MK-I',
  '아이언 발키리',
  '오메가 캐리어',
  '크림슨 리바이어던',
];

const COMBO_DURATION = 2.8;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 560;
  private height = 760;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private time = 0;
  private scrollOffset = 0;

  private gameState: GameState = 'TITLE_MENU';
  private aircraftId: AircraftId = 'falcon';
  private difficultyId: DifficultyId = 'normal';
  private autoFire = true;
  private reducedMotion = false;

  // Entities
  private player: PlayerEntity;
  private enemies: EnemyEntity[] = [];
  private bullets: BulletEntity[] = [];
  private powerUps: PowerUpEntity[] = [];
  private particles: ParticleEntity[] = [];
  private shockwaves: ShockwaveEntity[] = [];
  private floatingTexts: FloatingTextEntity[] = [];
  private clouds: CloudLayerItem[] = [];

  // Progression & Stats
  private score = 0;
  private bestScore = 0;
  private isNewRecord = false;
  private wave = 1;
  private stage = 1;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private combo = 0;
  private maxCombo = 0;
  private comboTimer = 0;

  // Spawning
  private nextEntityId = 1;
  private waveSpawnQueue: Array<{ delay: number; spawn: () => void }> = [];
  private waveElapsed = 0;
  private waveClearDelay = 0;
  private bossActive = false;
  private bossWarningTimer = 0;
  private warningText = '';

  // Screen shake
  private shakeIntensity = 0;

  // Input state
  private keys = new Set<string>();
  private pointerActive = false;
  private pointerX = 0;
  private pointerY = 0;
  private pointerFiring = false;

  // HUD callback throttle
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onSaveRecord: (score: number, wave: number, kills: number, aircraftId: AircraftId) => void;
  private hudEmitTimer = 0;

  constructor(
    canvas: HTMLCanvasElement,
    initialBestScore: number,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onSaveRecord: (score: number, wave: number, kills: number, aircraftId: AircraftId) => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('2D Canvas context unavailable');
    }
    this.ctx = context;
    this.bestScore = initialBestScore;
    this.onHudUpdate = onHudUpdate;
    this.onSaveRecord = onSaveRecord;

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    this.player = this.createInitialPlayer('falcon');
    this.initClouds();
    this.resize(canvas.clientWidth || 560, canvas.clientHeight || 760);
    this.emitHud(true);
  }

  private createInitialPlayer(aircraftId: AircraftId): PlayerEntity {
    const spec = AIRCRAFT_CONFIGS[aircraftId];
    return {
      x: this.width * 0.5,
      y: this.height * 0.82,
      vx: 0,
      vy: 0,
      tilt: 0,
      radius: 7.5, // classic generous shmup inner core hitbox
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      shield: spec.startingShield,
      maxShield: 3,
      weaponLevel: 1,
      bombs: spec.startingBombs,
      maxBombs: 5,
      invulnTimer: 1.5,
      fireCooldown: 0,
      missileCooldown: 0,
      muzzleFlash: 0,
      aircraftId,
    };
  }

  private initClouds() {
    this.clouds = [];
    const tints = ['#1B3152', '#233D64', '#162844', '#2A4369'];
    for (let i = 0; i < 16; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radiusX: 55 + Math.random() * 110,
        radiusY: 28 + Math.random() * 52,
        speed: 22 + Math.random() * 52,
        alpha: 0.14 + Math.random() * 0.18,
        tint: tints[i % tints.length],
      });
    }
  }

  public resize(cssWidth: number, cssHeight: number) {
    const w = Math.max(320, Math.floor(cssWidth));
    const h = Math.max(420, Math.floor(cssHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = w;
    this.height = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clamp player inside new bounds
    this.player.x = Math.max(26, Math.min(this.width - 26, this.player.x));
    this.player.y = Math.max(36, Math.min(this.height - 32, this.player.y));
  }

  public startLoop() {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.keys.clear();
  }

  public setAutoFire(enabled: boolean) {
    this.autoFire = enabled;
  }

  public setBestScore(best: number) {
    this.bestScore = Math.max(this.bestScore, best);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public startNewGame(aircraftId: AircraftId, difficultyId: DifficultyId) {
    soundEngine.unlock();
    this.aircraftId = aircraftId;
    this.difficultyId = difficultyId;
    this.gameState = 'PLAYING';
    this.score = 0;
    this.isNewRecord = false;
    this.wave = 1;
    this.stage = 1;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.bossActive = false;
    this.bossWarningTimer = 0;
    this.warningText = '';
    this.shakeIntensity = 0;

    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.player = this.createInitialPlayer(aircraftId);
    this.pointerActive = false;
    this.pointerFiring = false;

    this.scheduleWave(1);
    this.emitHud(true);
  }

  public returnToTitle() {
    this.gameState = 'TITLE_MENU';
    this.enemies = [];
    this.bullets = [];
    this.powerUps = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.bossActive = false;
    this.bossWarningTimer = 0;
    this.warningText = '';
    this.player = this.createInitialPlayer(this.aircraftId);
    this.emitHud(true);
  }

  public togglePause() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.keys.clear();
      this.pointerActive = false;
      this.emitHud(true);
    } else if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.lastTimestamp = performance.now();
      this.emitHud(true);
    }
  }

  public continueNextStage() {
    if (this.gameState !== 'STAGE_CLEAR') return;
    this.stage += 1;
    this.wave += 1;
    this.gameState = 'PLAYING';
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.invulnTimer = 1.6;
    this.scheduleWave(this.wave);
    this.emitHud(true);
  }

  // Input handlers
  public handleKeyDown(code: string) {
    if (code === 'KeyP' || code === 'Escape') {
      if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
        this.togglePause();
      }
      return;
    }
    if (
      (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyX' || code === 'KeyE') &&
      this.gameState === 'PLAYING'
    ) {
      this.triggerEmpBomb();
      return;
    }
    this.keys.add(code);
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD'
    ) {
      this.pointerActive = false;
    }
  }

  public handleKeyUp(code: string) {
    this.keys.delete(code);
  }

  public handlePointerDown(x: number, y: number, button: number) {
    soundEngine.unlock();
    if (this.gameState !== 'PLAYING') return;
    if (button === 2) {
      this.triggerEmpBomb();
      return;
    }
    this.pointerActive = true;
    this.pointerFiring = true;
    this.pointerX = x;
    this.pointerY = y;
  }

  public handlePointerMove(x: number, y: number, isDown: boolean) {
    if (this.gameState !== 'PLAYING') return;
    if (isDown || this.pointerActive) {
      this.pointerX = x;
      this.pointerY = y;
    }
  }

  public handlePointerUp() {
    this.pointerFiring = false;
    this.pointerActive = false;
  }

  public triggerEmpBomb() {
    if (this.gameState !== 'PLAYING') return;
    if (this.player.bombs <= 0) return;

    this.player.bombs -= 1;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 1.5);
    soundEngine.playEmpBomb();
    this.addShake(12);

    this.shockwaves.push({
      x: this.player.x,
      y: this.player.y,
      radius: 18,
      maxRadius: Math.max(this.width, this.height) * 0.95,
      alpha: 0.95,
      color: '#38BDF8',
    });

    // Clear all enemy bullets into small sparks
    const keptBullets: BulletEntity[] = [];
    for (const b of this.bullets) {
      if (b.fromPlayer) {
        keptBullets.push(b);
      } else {
        this.spawnParticles(b.x, b.y, '#7DD3FC', 3, 90);
      }
    }
    this.bullets = keptBullets;

    // Deal heavy EMP damage to all enemies on screen
    for (const enemy of this.enemies) {
      const dmg = enemy.type === 'BOSS' ? 240 : 180;
      enemy.hp -= dmg;
      enemy.hitFlash = 0.16;
      this.spawnParticles(enemy.x, enemy.y, '#38BDF8', 10, 180);
    }

    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 40,
      vy: -42,
      text: 'EMP 충격파 발동',
      color: '#7DD3FC',
      alpha: 1,
      scale: 1.15,
    });

    this.emitHud(true);
  }

  private update(dt: number) {
    this.time += dt;

    // Always drift clouds calmly even on Title screen
    const scrollSpeed = this.gameState === 'PLAYING' ? 95 : 32;
    this.scrollOffset += scrollSpeed * dt;
    for (const cloud of this.clouds) {
      cloud.y += cloud.speed * (this.gameState === 'PLAYING' ? 1 : 0.4) * dt;
      if (cloud.y - cloud.radiusY > this.height + 40) {
        cloud.y = -cloud.radiusY - 30;
        cloud.x = Math.random() * this.width;
      }
    }

    if (this.gameState !== 'PLAYING') {
      // Gentle idle hover for title screen backdrop plane
      if (this.gameState === 'TITLE_MENU') {
        this.player.x = this.width * 0.5 + Math.sin(this.time * 1.1) * 32;
        this.player.y = this.height * 0.78 + Math.cos(this.time * 1.6) * 8;
        this.player.tilt = Math.cos(this.time * 1.1) * 0.35;
      }
      return;
    }

    // Decay screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - 28 * dt);
    }

    // Decay boss warning timer
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
    }

    // Decay combo timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    this.updatePlayer(dt);
    this.updateWaveSpawner(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePowerUps(dt);
    this.handleCollisions();
    this.updateEffects(dt);

    // Emit HUD ~15 times/sec
    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.065) {
      this.hudEmitTimer = 0;
      this.emitHud(false);
    }
  }

  private updatePlayer(dt: number) {
    const spec = AIRCRAFT_CONFIGS[this.player.aircraftId];
    let dx = 0;
    let dy = 0;

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dy -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.player.vx = dx * spec.speed;
      this.player.vy = dy * spec.speed;
      this.player.x += this.player.vx * dt;
      this.player.y += this.player.vy * dt;
    } else if (this.pointerActive) {
      const targetX = this.pointerX;
      const targetY = this.pointerY - 22; // Slight offset so finger doesn't cover craft
      const diffX = targetX - this.player.x;
      const diffY = targetY - this.player.y;
      const dist = Math.hypot(diffX, diffY);
      const maxMove = spec.speed * 1.45 * dt;
      if (dist > 1) {
        const move = Math.min(dist, maxMove);
        this.player.vx = (diffX / dist) * (move / Math.max(dt, 0.001));
        this.player.vy = (diffY / dist) * (move / Math.max(dt, 0.001));
        this.player.x += (diffX / dist) * move;
        this.player.y += (diffY / dist) * move;
      } else {
        this.player.vx = 0;
        this.player.vy = 0;
      }
    } else {
      this.player.vx *= 0.8;
      this.player.vy *= 0.8;
    }

    // Clamp to arena
    this.player.x = Math.max(26, Math.min(this.width - 26, this.player.x));
    this.player.y = Math.max(40, Math.min(this.height - 28, this.player.y));

    // Smooth banking roll
    const targetTilt = Math.max(-1, Math.min(1, this.player.vx / spec.speed));
    this.player.tilt += (targetTilt - this.player.tilt) * Math.min(1, dt * 12);

    if (this.player.invulnTimer > 0) {
      this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    }
    if (this.player.muzzleFlash > 0) {
      this.player.muzzleFlash = Math.max(0, this.player.muzzleFlash - dt);
    }

    // Firing
    this.player.fireCooldown -= dt;
    this.player.missileCooldown -= dt;

    const wantsFire =
      this.autoFire ||
      this.pointerFiring ||
      this.keys.has('Space') ||
      this.keys.has('KeyZ');

    if (wantsFire && this.player.fireCooldown <= 0) {
      this.firePlayerWeapons();
      this.player.fireCooldown = spec.fireInterval;
    }
  }

  private firePlayerWeapons() {
    const spec = AIRCRAFT_CONFIGS[this.player.aircraftId];
    const lv = this.player.weaponLevel;
    const isAegis = this.player.aircraftId === 'aegis';
    const baseDmg = spec.bulletDamage;
    const speed = isAegis ? 760 : 820;
    const kind = isAegis ? 'cannon' : 'vulcan';
    const color = isAegis ? '#34D399' : '#FBBF24';

    const spawnShot = (ox: number, oy: number, vx: number, vy: number, dmg: number, pierce = 0) => {
      this.bullets.push({
        id: this.nextEntityId++,
        x: this.player.x + ox,
        y: this.player.y + oy,
        vx,
        vy,
        radius: isAegis ? 5.5 : 4.2,
        damage: dmg,
        fromPlayer: true,
        kind,
        color,
        life: 1.8,
        pierce,
      });
      this.shotsFired += 1;
    };

    if (lv === 1) {
      spawnShot(-10, -18, 0, -speed, baseDmg);
      spawnShot(10, -18, 0, -speed, baseDmg);
    } else if (lv === 2) {
      spawnShot(0, -24, 0, -speed, baseDmg * 1.05);
      spawnShot(-14, -14, -45, -speed * 0.98, baseDmg * 0.85);
      spawnShot(14, -14, 45, -speed * 0.98, baseDmg * 0.85);
    } else if (lv === 3) {
      spawnShot(-9, -22, 0, -speed, baseDmg);
      spawnShot(9, -22, 0, -speed, baseDmg);
      spawnShot(-18, -12, -105, -speed * 0.96, baseDmg * 0.82);
      spawnShot(18, -12, 105, -speed * 0.96, baseDmg * 0.82);
    } else {
      // Lv 4 Max Overdrive
      spawnShot(0, -25, 0, -speed * 1.05, baseDmg * 1.1, isAegis ? 1 : 0);
      spawnShot(-12, -20, -35, -speed, baseDmg * 0.95);
      spawnShot(12, -20, 35, -speed, baseDmg * 0.95);
      spawnShot(-22, -10, -145, -speed * 0.94, baseDmg * 0.82);
      spawnShot(22, -10, 145, -speed * 0.94, baseDmg * 0.82);
    }

    // Homing micro-missiles at Lv >= 3
    if (lv >= 3 && this.player.missileCooldown <= 0) {
      this.player.missileCooldown = isAegis ? 0.8 : 0.58;
      const missileDmg = isAegis ? 36 : 26;
      for (const side of [-20, 20]) {
        this.bullets.push({
          id: this.nextEntityId++,
          x: this.player.x + side,
          y: this.player.y - 6,
          vx: side * 3.5,
          vy: -320,
          radius: 5.5,
          damage: missileDmg,
          fromPlayer: true,
          kind: 'missile',
          color: '#F59E0B',
          life: 2.6,
        });
        this.shotsFired += 1;
      }
    }

    this.player.muzzleFlash = 0.045;
    soundEngine.playShoot(isAegis);
  }

  private scheduleWave(waveNum: number) {
    this.waveSpawnQueue = [];
    this.waveElapsed = 0;
    this.waveClearDelay = 0;
    this.bossActive = false;

    const isBossWave = waveNum % 3 === 0;
    const diff = DIFFICULTY_CONFIGS[this.difficultyId];

    if (isBossWave) {
      const bossIndex = Math.floor(waveNum / 3) - 1;
      const bossName = BOSS_NAMES[bossIndex % BOSS_NAMES.length];
      this.warningText = `경고 · 대형 보스 출현: ${bossName}`;
      this.bossWarningTimer = 2.6;
      soundEngine.playBossWarning();

      // Escort wave then Boss
      this.waveSpawnQueue.push({
        delay: 0.6,
        spawn: () => {
          this.spawnEnemy('SCOUT', this.width * 0.22, -30);
          this.spawnEnemy('SCOUT', this.width * 0.78, -30);
        },
      });
      this.waveSpawnQueue.push({
        delay: 2.2,
        spawn: () => {
          this.spawnBoss(bossName, waveNum);
        },
      });
      return;
    }

    // Regular tactical formations scaling smoothly with wave
    const scaleCount = Math.min(6, Math.floor((waveNum - 1) * 0.7));
    const totalGroups = 4 + Math.min(3, Math.floor(waveNum / 2));

    for (let g = 0; g < totalGroups; g++) {
      const baseDelay = 0.6 + g * Math.max(1.55, 2.5 - waveNum * 0.08);
      const pattern = (waveNum + g) % 4;

      if (pattern === 0) {
        // V-Formation Scouts
        const count = 4 + Math.min(3, scaleCount);
        const centerX = this.width * (0.3 + Math.random() * 0.4);
        for (let i = 0; i < count; i++) {
          const offset = i - (count - 1) / 2;
          this.waveSpawnQueue.push({
            delay: baseDelay + Math.abs(offset) * 0.16,
            spawn: () => {
              const x = Math.max(36, Math.min(this.width - 36, centerX + offset * 44));
              this.spawnEnemy('SCOUT', x, -28);
            },
          });
        }
      } else if (pattern === 1) {
        // Sine-weaving Interceptors
        const count = 3 + Math.min(2, Math.floor(waveNum / 2));
        for (let i = 0; i < count; i++) {
          this.waveSpawnQueue.push({
            delay: baseDelay + i * 0.38,
            spawn: () => {
              const laneX = this.width * (0.2 + ((i + 0.5) / count) * 0.6);
              this.spawnEnemy('INTERCEPTOR', laneX, -32);
            },
          });
        }
      } else if (pattern === 2) {
        // Heavy Gunship + Escorts
        this.waveSpawnQueue.push({
          delay: baseDelay,
          spawn: () => {
            const hx = this.width * (0.28 + Math.random() * 0.44);
            this.spawnEnemy('HEAVY', hx, -48);
            this.spawnEnemy('SCOUT', Math.max(36, hx - 76), -36);
            this.spawnEnemy('SCOUT', Math.min(this.width - 36, hx + 76), -36);
          },
        });
      } else {
        // Striker Dash Squad
        const count = 2 + (diff.id === 'ace' ? 2 : diff.id === 'hard' ? 1 : 0);
        for (let i = 0; i < count; i++) {
          this.waveSpawnQueue.push({
            delay: baseDelay + i * 0.45,
            spawn: () => {
              const sx = this.width * (0.18 + Math.random() * 0.64);
              this.spawnEnemy('STRIKER', sx, -30);
            },
          });
        }
      }
    }

    this.waveSpawnQueue.sort((a, b) => a.delay - b.delay);
  }

  private spawnEnemy(type: EnemyType, x: number, y: number) {
    const diff = DIFFICULTY_CONFIGS[this.difficultyId];
    const waveScale = 1 + (this.wave - 1) * 0.14;

    if (type === 'SCOUT') {
      const hp = Math.round(28 * waveScale * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEntityId++,
        type,
        x,
        y,
        vx: 0,
        vy: (135 + Math.random() * 25) * diff.enemySpeedMult,
        width: 30,
        height: 28,
        hp,
        maxHp: hp,
        scoreValue: 120,
        age: 0,
        fireTimer: (0.8 + Math.random() * 0.8) / diff.enemyFireRateMult,
        hitFlash: 0,
        phase: Math.random() * Math.PI * 2,
        baseX: x,
        waveAmp: 22,
        waveFreq: 2.2,
        targetY: this.height + 80,
      });
    } else if (type === 'INTERCEPTOR') {
      const hp = Math.round(52 * waveScale * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEntityId++,
        type,
        x,
        y,
        vx: 0,
        vy: 96 * diff.enemySpeedMult,
        width: 42,
        height: 36,
        hp,
        maxHp: hp,
        scoreValue: 240,
        age: 0,
        fireTimer: (0.9 + Math.random() * 0.5) / diff.enemyFireRateMult,
        hitFlash: 0,
        phase: Math.random() * Math.PI * 2,
        baseX: x,
        waveAmp: 68,
        waveFreq: 2.4,
        targetY: this.height + 80,
      });
    } else if (type === 'HEAVY') {
      const hp = Math.round(185 * waveScale * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEntityId++,
        type,
        x,
        y,
        vx: (Math.random() > 0.5 ? 1 : -1) * 32,
        vy: 54 * diff.enemySpeedMult,
        width: 68,
        height: 48,
        hp,
        maxHp: hp,
        scoreValue: 550,
        age: 0,
        fireTimer: 1.0 / diff.enemyFireRateMult,
        hitFlash: 0,
        phase: 0,
        baseX: x,
        waveAmp: 0,
        waveFreq: 0,
        targetY: 110 + Math.random() * 95,
      });
    } else if (type === 'STRIKER') {
      const hp = Math.round(44 * waveScale * diff.enemyHpMult);
      this.enemies.push({
        id: this.nextEntityId++,
        type,
        x,
        y,
        vx: 0,
        vy: 160 * diff.enemySpeedMult,
        width: 28,
        height: 36,
        hp,
        maxHp: hp,
        scoreValue: 280,
        age: 0,
        fireTimer: 99,
        hitFlash: 0,
        phase: 0,
        baseX: x,
        waveAmp: 0,
        waveFreq: 0,
        targetY: 90 + Math.random() * 80,
        dashState: 'approach',
        dashTimer: 0.72,
      });
    }
  }

  private spawnBoss(name: string, waveNum: number) {
    const diff = DIFFICULTY_CONFIGS[this.difficultyId];
    const bossTier = Math.max(1, Math.floor(waveNum / 3));
    const hp = Math.round((1100 + (bossTier - 1) * 520) * diff.enemyHpMult);
    this.bossActive = true;

    this.enemies.push({
      id: this.nextEntityId++,
      type: 'BOSS',
      name,
      x: this.width * 0.5,
      y: -75,
      vx: 75 * diff.enemySpeedMult,
      vy: 68,
      width: 176,
      height: 86,
      hp,
      maxHp: hp,
      scoreValue: 3500 * bossTier,
      age: 0,
      fireTimer: 1.2,
      hitFlash: 0,
      phase: 1,
      baseX: this.width * 0.5,
      waveAmp: 0,
      waveFreq: 0,
      targetY: 118,
      bossPattern: 0,
      bossPatternTimer: 4.5,
    });
    this.emitHud(true);
  }

  private updateWaveSpawner(dt: number) {
    this.waveElapsed += dt;
    while (
      this.waveSpawnQueue.length > 0 &&
      this.waveSpawnQueue[0].delay <= this.waveElapsed
    ) {
      const next = this.waveSpawnQueue.shift();
      next?.spawn();
    }

    // Check if wave cleared
    if (this.waveSpawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveClearDelay += dt;
      if (this.waveClearDelay >= 1.25) {
        if (this.wave % 3 === 0) {
          // Stage Clear after Boss!
          soundEngine.playStageClear();
          this.gameState = 'STAGE_CLEAR';
          this.emitHud(true);
        } else {
          this.wave += 1;
          this.floatingTexts.push({
            x: this.width * 0.5,
            y: this.height * 0.36,
            vy: -24,
            text: `WAVE ${this.wave}`,
            color: '#FBBF24',
            alpha: 1,
            scale: 1.4,
          });
          this.scheduleWave(this.wave);
          this.emitHud(true);
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    const diff = DIFFICULTY_CONFIGS[this.difficultyId];
    const alive: EnemyEntity[] = [];

    for (const e of this.enemies) {
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.type === 'SCOUT') {
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.age * e.waveFreq + e.phase) * e.waveAmp;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && e.y > 20 && e.y < this.height * 0.65) {
          this.fireAimedBullet(e.x, e.y + 14, 245 * diff.bulletSpeedMult, 'enemy_orb', '#EF4444');
          e.fireTimer = (2.1 + Math.random() * 0.8) / diff.enemyFireRateMult;
        }
      } else if (e.type === 'INTERCEPTOR') {
        e.y += e.vy * dt;
        e.x = Math.max(
          30,
          Math.min(this.width - 30, e.baseX + Math.sin(e.age * e.waveFreq + e.phase) * e.waveAmp)
        );
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && e.y > 20 && e.y < this.height * 0.65) {
          const baseAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          for (const spread of [-0.22, 0.22]) {
            this.fireAngleBullet(
              e.x,
              e.y + 16,
              baseAngle + spread,
              265 * diff.bulletSpeedMult,
              'enemy_dart',
              '#FB923C'
            );
          }
          e.fireTimer = 1.75 / diff.enemyFireRateMult;
        }
      } else if (e.type === 'HEAVY') {
        if (e.y < e.targetY) {
          e.y += e.vy * dt;
        } else {
          e.x += e.vx * dt;
          if (e.x < 54 || e.x > this.width - 54) e.vx *= -1;
          e.y += 14 * dt;
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && e.y > 25 && e.y < this.height * 0.7) {
          const baseAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          for (let i = -2; i <= 2; i++) {
            this.fireAngleBullet(
              e.x,
              e.y + 18,
              baseAngle + i * 0.24,
              220 * diff.bulletSpeedMult,
              'enemy_orb',
              '#F59E0B'
            );
          }
          e.fireTimer = 2.05 / diff.enemyFireRateMult;
        }
      } else if (e.type === 'STRIKER') {
        if (e.dashState === 'approach') {
          e.y += e.vy * dt;
          if (e.y >= e.targetY) {
            e.dashState = 'aim';
            e.dashTimer = 0.65;
            e.dashAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          }
        } else if (e.dashState === 'aim') {
          e.dashAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          e.dashTimer = (e.dashTimer ?? 0) - dt;
          if ((e.dashTimer ?? 0) <= 0) {
            e.dashState = 'dash';
            const speed = 440 * diff.enemySpeedMult;
            e.vx = Math.cos(e.dashAngle) * speed;
            e.vy = Math.sin(e.dashAngle) * speed;
          }
        } else {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }
      } else if (e.type === 'BOSS') {
        this.updateBossBehavior(e, dt);
      }

      // Keep if still inside generous bounds
      const outOfBounds =
        e.type !== 'BOSS' &&
        (e.y > this.height + 90 || e.x < -100 || e.x > this.width + 100);
      if (!outOfBounds) {
        alive.push(e);
      }
    }

    this.enemies = alive;
  }

  private updateBossBehavior(boss: EnemyEntity, dt: number) {
    const diff = DIFFICULTY_CONFIGS[this.difficultyId];
    const hpRatio = boss.hp / boss.maxHp;
    const enraged = hpRatio < 0.5;

    // Descend into battle position
    if (boss.y < boss.targetY) {
      boss.y += boss.vy * dt;
      return;
    }

    // Horizontal patrol with slight bobbing
    const speedMult = enraged ? 1.38 : 1.0;
    boss.x += boss.vx * speedMult * dt;
    if (boss.x < 105) {
      boss.x = 105;
      boss.vx = Math.abs(boss.vx);
    } else if (boss.x > this.width - 105) {
      boss.x = this.width - 105;
      boss.vx = -Math.abs(boss.vx);
    }
    boss.y = boss.targetY + Math.sin(boss.age * 1.8) * 14;

    // Smoke sparks when damaged below 50%
    if (enraged && Math.random() < 0.35) {
      this.spawnParticles(
        boss.x + (Math.random() - 0.5) * 100,
        boss.y + (Math.random() - 0.5) * 30,
        '#F97316',
        1,
        55
      );
    }

    // Cycle attack patterns
    boss.bossPatternTimer = (boss.bossPatternTimer ?? 4) - dt;
    if (boss.bossPatternTimer <= 0) {
      boss.bossPattern = ((boss.bossPattern ?? 0) + 1) % 3;
      boss.bossPatternTimer = enraged ? 3.4 : 4.4;
    }

    boss.fireTimer -= dt;
    if (boss.fireTimer <= 0) {
      const pattern = boss.bossPattern ?? 0;
      const bSpeed = (enraged ? 265 : 225) * diff.bulletSpeedMult;

      if (pattern === 0) {
        // Fan spread from central reactor
        const count = enraged ? 9 : 7;
        const baseAngle = Math.PI / 2;
        for (let i = 0; i < count; i++) {
          const t = (i / (count - 1)) - 0.5;
          this.fireAngleBullet(
            boss.x,
            boss.y + 34,
            baseAngle + t * 1.35,
            bSpeed,
            'boss_plasma',
            '#EF4444',
            6.2
          );
        }
        boss.fireTimer = (enraged ? 0.85 : 1.15) / diff.enemyFireRateMult;
      } else if (pattern === 1) {
        // Aimed Twin-Turret bursts
        for (const tx of [-52, 52]) {
          const angle = Math.atan2(this.player.y - (boss.y + 18), this.player.x - (boss.x + tx));
          for (const offset of [-0.14, 0, 0.14]) {
            this.fireAngleBullet(
              boss.x + tx,
              boss.y + 22,
              angle + offset,
              bSpeed * 1.12,
              'enemy_dart',
              '#FB923C',
              5
            );
          }
        }
        boss.fireTimer = (enraged ? 0.75 : 1.0) / diff.enemyFireRateMult;
      } else {
        // Rotating Spiral Ring
        const spokes = enraged ? 10 : 8;
        const spin = boss.age * 2.1;
        for (let i = 0; i < spokes; i++) {
          const a = spin + (Math.PI * 2 * i) / spokes;
          this.fireAngleBullet(
            boss.x,
            boss.y + 10,
            a,
            bSpeed * 0.88,
            'boss_plasma',
            '#F59E0B',
            5.8
          );
        }
        boss.fireTimer = (enraged ? 0.52 : 0.68) / diff.enemyFireRateMult;
      }
    }
  }

  private fireAimedBullet(
    x: number,
    y: number,
    speed: number,
    kind: BulletEntity['kind'],
    color: string
  ) {
    const angle = Math.atan2(this.player.y - y, this.player.x - x);
    this.fireAngleBullet(x, y, angle, speed, kind, color);
  }

  private fireAngleBullet(
    x: number,
    y: number,
    angle: number,
    speed: number,
    kind: BulletEntity['kind'],
    color: string,
    radius = 4.8
  ) {
    this.bullets.push({
      id: this.nextEntityId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage: 16,
      fromPlayer: false,
      kind,
      color,
      life: 5,
    });
  }

  private updateBullets(dt: number) {
    const kept: BulletEntity[] = [];

    for (const b of this.bullets) {
      b.life -= dt;
      if (b.life <= 0) continue;

      // Homing missile steering toward nearest enemy
      if (b.fromPlayer && b.kind === 'missile' && this.enemies.length > 0) {
        let nearest: EnemyEntity | null = null;
        let bestDist = Infinity;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < bestDist) {
            bestDist = d;
            nearest = e;
          }
        }
        if (nearest) {
          const desiredAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          let diff = desiredAngle - currentAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-7.5 * dt, Math.min(7.5 * dt, diff));
          const speed = Math.min(620, Math.hypot(b.vx, b.vy) + 420 * dt);
          const nextAngle = currentAngle + turn;
          b.vx = Math.cos(nextAngle) * speed;
          b.vy = Math.sin(nextAngle) * speed;
        }
        if (Math.random() < 0.45) {
          this.particles.push({
            x: b.x,
            y: b.y + 4,
            vx: (Math.random() - 0.5) * 16,
            vy: 30,
            size: 2.3,
            alpha: 0.45,
            decay: 2.2,
            color: '#CBD5E1',
            kind: 'smoke',
          });
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (
        b.x >= -30 &&
        b.x <= this.width + 30 &&
        b.y >= -40 &&
        b.y <= this.height + 40
      ) {
        kept.push(b);
      }
    }

    this.bullets = kept;
  }

  private updatePowerUps(dt: number) {
    const kept: PowerUpEntity[] = [];
    for (const pu of this.powerUps) {
      pu.age += dt;
      // Magnetic attraction when near player
      const dx = this.player.x - pu.x;
      const dy = this.player.y - pu.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 135) {
        const pull = 320 * dt;
        pu.x += (dx / Math.max(1, dist)) * pull;
        pu.y += (dy / Math.max(1, dist)) * pull;
      } else {
        pu.y += pu.vy * dt;
      }

      if (dist < pu.radius + 22) {
        this.applyPowerUp(pu);
        continue;
      }
      if (pu.y < this.height + 40) {
        kept.push(pu);
      }
    }
    this.powerUps = kept;
  }

  private applyPowerUp(pu: PowerUpEntity) {
    soundEngine.playPowerUp();
    let label = '';
    let color = '#FBBF24';

    if (pu.type === 'POWER') {
      if (this.player.weaponLevel < 4) {
        this.player.weaponLevel += 1;
        label = `화력 LV.${this.player.weaponLevel}`;
      } else {
        this.addScore(500);
        label = 'MAX 보너스 +500';
      }
      color = '#FBBF24';
    } else if (pu.type === 'REPAIR') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
      label = '내구도 +25';
      color = '#34D399';
    } else if (pu.type === 'BOMB') {
      if (this.player.bombs < this.player.maxBombs) {
        this.player.bombs += 1;
        label = 'EMP 폭탄 +1';
      } else {
        this.addScore(400);
        label = '폭탄 보너스 +400';
      }
      color = '#F87171';
    } else if (pu.type === 'SHIELD') {
      if (this.player.shield < this.player.maxShield) {
        this.player.shield += 1;
        label = '방어막 충전';
      } else {
        this.addScore(350);
        label = '방어막 보너스 +350';
      }
      color = '#38BDF8';
    }

    this.floatingTexts.push({
      x: this.player.x,
      y: this.player.y - 34,
      vy: -36,
      text: label,
      color,
      alpha: 1,
      scale: 1.05,
    });
    this.emitHud(true);
  }

  private handleCollisions() {
    const survivingBullets: BulletEntity[] = [];

    for (const b of this.bullets) {
      let consumed = false;

      if (b.fromPlayer) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const halfW = e.width * 0.5 + b.radius;
          const halfH = e.height * 0.5 + b.radius;
          if (Math.abs(b.x - e.x) <= halfW && Math.abs(b.y - e.y) <= halfH) {
            e.hp -= b.damage;
            e.hitFlash = 0.08;
            this.shotsHit += 1;
            soundEngine.playHit();
            this.spawnParticles(b.x, b.y, b.color, 3, 95);

            if (b.pierce && b.pierce > 0) {
              b.pierce -= 1;
            } else {
              consumed = true;
              break;
            }
          }
        }
      } else if (this.player.invulnTimer <= 0) {
        const d = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        if (d < this.player.radius + b.radius * 0.8) {
          consumed = true;
          this.damagePlayer(b.damage);
        }
      }

      if (!consumed) {
        survivingBullets.push(b);
      }
    }
    this.bullets = survivingBullets;

    // Enemy body collision with player + process destroyed enemies
    const remainingEnemies: EnemyEntity[] = [];
    for (const e of this.enemies) {
      if (e.hp <= 0) {
        this.handleEnemyDestroyed(e);
        continue;
      }

      if (this.player.invulnTimer <= 0) {
        const halfW = e.width * 0.42 + this.player.radius;
        const halfH = e.height * 0.42 + this.player.radius;
        if (Math.abs(e.x - this.player.x) < halfW && Math.abs(e.y - this.player.y) < halfH) {
          this.damagePlayer(e.type === 'BOSS' ? 32 : 24);
          if (e.type !== 'BOSS') {
            e.hp -= 60;
            if (e.hp <= 0) {
              this.handleEnemyDestroyed(e);
              continue;
            }
          }
        }
      }

      remainingEnemies.push(e);
    }
    this.enemies = remainingEnemies;
  }

  private handleEnemyDestroyed(enemy: EnemyEntity) {
    this.kills += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboTimer = COMBO_DURATION;

    const comboMult = Math.min(5, 1 + Math.floor(this.combo / 4) * 0.25);
    const diffMult = DIFFICULTY_CONFIGS[this.difficultyId].scoreMult;
    const gained = Math.round(enemy.scoreValue * comboMult * diffMult);
    this.addScore(gained);

    const isLarge = enemy.type === 'HEAVY' || enemy.type === 'BOSS';
    soundEngine.playExplosion(isLarge);
    this.addShake(enemy.type === 'BOSS' ? 16 : enemy.type === 'HEAVY' ? 7 : 3);

    // Explosion visuals
    this.spawnParticles(
      enemy.x,
      enemy.y,
      enemy.type === 'BOSS' ? '#F59E0B' : '#FB923C',
      enemy.type === 'BOSS' ? 42 : enemy.type === 'HEAVY' ? 18 : 10,
      enemy.type === 'BOSS' ? 280 : 165
    );
    this.spawnParticles(
      enemy.x,
      enemy.y,
      '#FEF3C7',
      enemy.type === 'BOSS' ? 18 : 5,
      110
    );

    if (enemy.type === 'BOSS') {
      this.bossActive = false;
      this.shockwaves.push({
        x: enemy.x,
        y: enemy.y,
        radius: 20,
        maxRadius: 280,
        alpha: 0.95,
        color: '#F59E0B',
      });
      // Clear enemy bullets on boss kill
      this.bullets = this.bullets.filter((b) => b.fromPlayer);
      // Drop guaranteed rewards
      this.spawnPowerUp(enemy.x - 28, enemy.y, 'POWER');
      this.spawnPowerUp(enemy.x + 28, enemy.y, 'REPAIR');
    } else {
      // Drop chance for power-ups
      const dropChance = enemy.type === 'HEAVY' ? 0.55 : 0.16;
      if (Math.random() < dropChance) {
        const roll = Math.random();
        let type: PowerUpType = 'POWER';
        if (roll < 0.44) type = 'POWER';
        else if (roll < 0.7) type = 'REPAIR';
        else if (roll < 0.88) type = 'SHIELD';
        else type = 'BOMB';
        this.spawnPowerUp(enemy.x, enemy.y, type);
      }
    }

    this.floatingTexts.push({
      x: enemy.x,
      y: enemy.y - 10,
      vy: -32,
      text: `+${gained.toLocaleString()}`,
      color: enemy.type === 'BOSS' ? '#FDE047' : '#F8FAFC',
      alpha: 1,
      scale: enemy.type === 'BOSS' ? 1.35 : 0.95,
    });
  }

  private spawnPowerUp(x: number, y: number, type: PowerUpType) {
    this.powerUps.push({
      id: this.nextEntityId++,
      type,
      x: Math.max(26, Math.min(this.width - 26, x)),
      y,
      vy: 78,
      age: 0,
      radius: 13,
    });
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnTimer > 0) return;

    if (this.player.shield > 0) {
      this.player.shield -= 1;
      this.player.invulnTimer = 1.15;
      soundEngine.playPlayerDamage(true);
      this.addShake(6);
      this.spawnParticles(this.player.x, this.player.y, '#38BDF8', 14, 160);
      this.floatingTexts.push({
        x: this.player.x,
        y: this.player.y - 30,
        vy: -32,
        text: '방어막 흡수',
        color: '#38BDF8',
        alpha: 1,
        scale: 1,
      });
      this.emitHud(true);
      return;
    }

    this.player.hp = Math.max(0, this.player.hp - amount);
    this.player.invulnTimer = 1.35;
    this.combo = 0;
    this.comboTimer = 0;
    soundEngine.playPlayerDamage(false);
    this.addShake(10);
    this.spawnParticles(this.player.x, this.player.y, '#EF4444', 18, 190);

    if (this.player.hp <= 0) {
      this.triggerGameOver();
    } else {
      this.emitHud(true);
    }
  }

  private triggerGameOver() {
    this.gameState = 'GAME_OVER';
    soundEngine.playExplosion(true);
    this.shockwaves.push({
      x: this.player.x,
      y: this.player.y,
      radius: 10,
      maxRadius: 150,
      alpha: 0.9,
      color: '#EF4444',
    });
    this.spawnParticles(this.player.x, this.player.y, '#F97316', 36, 240);
    this.onSaveRecord(this.score, this.wave, this.kills, this.aircraftId);
    this.emitHud(true);
  }

  private addScore(points: number) {
    this.score += points;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.isNewRecord = true;
    }
  }

  private addShake(intensity: number) {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.min(18, Math.max(this.shakeIntensity, intensity));
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    maxSpeed: number
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * maxSpeed;
      const isDebris = Math.random() < 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: isDebris ? 3 + Math.random() * 4 : 1.8 + Math.random() * 3.2,
        alpha: 1,
        decay: 1.4 + Math.random() * 1.4,
        color,
        kind: isDebris ? 'debris' : 'spark',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
      });
    }
  }

  private updateEffects(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot * dt;
      }
      p.alpha -= p.decay * dt;
      return p.alpha > 0.02;
    });

    this.shockwaves = this.shockwaves.filter((sw) => {
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 6.5) + 180 * dt;
      sw.alpha -= 1.65 * dt;
      return sw.alpha > 0.02 && sw.radius < sw.maxRadius;
    });

    this.floatingTexts = this.floatingTexts.filter((ft) => {
      ft.y += ft.vy * dt;
      ft.alpha -= 1.05 * dt;
      return ft.alpha > 0.02;
    });
  }

  private render() {
    const shakeX =
      this.shakeIntensity > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;
    const shakeY =
      this.shakeIntensity > 0 ? (Math.random() - 0.5) * 2 * this.shakeIntensity : 0;

    renderGameFrame(this.ctx, {
      width: this.width,
      height: this.height,
      time: this.time,
      scrollOffset: this.scrollOffset,
      shakeX,
      shakeY,
      clouds: this.clouds,
      player: this.player,
      enemies: this.enemies,
      bullets: this.bullets,
      powerUps: this.powerUps,
      particles: this.particles,
      shockwaves: this.shockwaves,
      floatingTexts: this.floatingTexts,
      bossWarningTimer: this.bossWarningTimer,
      warningText: this.warningText,
      showHitbox: this.gameState === 'PLAYING',
    });
  }

  private emitHud(force: boolean) {
    if (!force && this.gameState === 'TITLE_MENU') return;
    const boss = this.enemies.find((e) => e.type === 'BOSS');

    this.onHudUpdate({
      gameState: this.gameState,
      score: this.score,
      bestScore: this.bestScore,
      wave: this.wave,
      stage: this.stage,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      combo: this.combo,
      maxCombo: this.maxCombo,
      comboTimerRatio: this.combo > 0 ? Math.max(0, this.comboTimer / COMBO_DURATION) : 0,
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      shield: this.player.shield,
      maxShield: this.player.maxShield,
      weaponLevel: this.player.weaponLevel,
      bombs: this.player.bombs,
      maxBombs: this.player.maxBombs,
      bossActive: Boolean(boss),
      bossName: boss?.name ?? '',
      bossHpRatio: boss ? Math.max(0, boss.hp / boss.maxHp) : 0,
      bossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      warningText: this.bossWarningTimer > 0 ? this.warningText : '',
      isNewRecord: this.isNewRecord,
      aircraftId: this.aircraftId,
      difficultyId: this.difficultyId,
    });
  }
}
