export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER';

export type AircraftId = 'falcon' | 'aegis';
export type DifficultyId = 'normal' | 'hard' | 'ace';

export interface AircraftConfig {
  id: AircraftId;
  name: string;
  role: string;
  summary: string;
  weaponLabel: string;
  imagePath: string;
  imageRotateClass: string;
  accentHex: string;
  maxHp: number;
  speed: number;
  fireInterval: number;
  bulletDamage: number;
  startingBombs: number;
  startingShield: number;
  stats: {
    firepower: number; // 1-100
    speed: number;
    armor: number;
  };
}

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  enemyHpMult: number;
  enemySpeedMult: number;
  enemyFireRateMult: number;
  bulletSpeedMult: number;
  scoreMult: number;
  description: string;
}

export const AIRCRAFT_CONFIGS: Record<AircraftId, AircraftConfig> = {
  falcon: {
    id: 'falcon',
    name: '팰컨 MK-4',
    role: '기동형 전투기',
    summary: '빠른 회피 기동과 광역 확산 발칸, 레벨업 시 유도 미사일을 전개합니다.',
    weaponLabel: '확산 발칸 · 유도 미사일',
    imagePath: '/src/assets/images/aircraft_falcon_1795402121120.jpg',
    imageRotateClass: 'rotate-90',
    accentHex: '#F59E0B',
    maxHp: 100,
    speed: 440,
    fireInterval: 0.125,
    bulletDamage: 16,
    startingBombs: 3,
    startingShield: 1,
    stats: {
      firepower: 82,
      speed: 95,
      armor: 70,
    },
  },
  aegis: {
    id: 'aegis',
    name: '이지스 X-9',
    role: '중장갑 요격기',
    summary: '높은 기체 내구도와 관통형 트윈 캐논, 강화된 방어막으로 전선을 돌파합니다.',
    weaponLabel: '고위력 트윈 캐논 · 플라즈마 탄',
    imagePath: '/src/assets/images/aircraft_aegis_1795402122211.jpg',
    imageRotateClass: '',
    accentHex: '#10B981',
    maxHp: 130,
    speed: 365,
    fireInterval: 0.145,
    bulletDamage: 24,
    startingBombs: 2,
    startingShield: 2,
    stats: {
      firepower: 96,
      speed: 72,
      armor: 95,
    },
  },
};

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  normal: {
    id: 'normal',
    label: '보통',
    enemyHpMult: 1.0,
    enemySpeedMult: 1.0,
    enemyFireRateMult: 1.0,
    bulletSpeedMult: 1.0,
    scoreMult: 1.0,
    description: '표준 탄막 속도와 적 내구도 (점수 1.0배)',
  },
  hard: {
    id: 'hard',
    label: '어려움',
    enemyHpMult: 1.25,
    enemySpeedMult: 1.15,
    enemyFireRateMult: 1.25,
    bulletSpeedMult: 1.18,
    scoreMult: 1.4,
    description: '강화된 적 편대와 빠른 탄속 (점수 1.4배)',
  },
  ace: {
    id: 'ace',
    label: '에이스',
    enemyHpMult: 1.55,
    enemySpeedMult: 1.28,
    enemyFireRateMult: 1.5,
    bulletSpeedMult: 1.32,
    scoreMult: 2.0,
    description: '고밀도 탄막과 최정예 보스전 (점수 2.0배)',
  },
};

export const HERO_BACKDROP_PATH =
  '/src/assets/images/hero_sky_strike_backdrop_1795402121154.jpg';

export type EnemyType = 'SCOUT' | 'INTERCEPTOR' | 'HEAVY' | 'STRIKER' | 'BOSS';

export type PowerUpType = 'POWER' | 'REPAIR' | 'BOMB' | 'SHIELD';

export interface PlayerEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number; // -1 to 1 banking roll
  radius: number; // generous inner hitbox radius
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  weaponLevel: number; // 1 to 4
  bombs: number;
  maxBombs: number;
  invulnTimer: number;
  fireCooldown: number;
  missileCooldown: number;
  muzzleFlash: number;
  aircraftId: AircraftId;
}

export interface BulletEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  fromPlayer: boolean;
  kind: 'vulcan' | 'cannon' | 'missile' | 'enemy_orb' | 'enemy_dart' | 'boss_plasma';
  color: string;
  life: number;
  pierce?: number;
}

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  name?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  scoreValue: number;
  age: number;
  fireTimer: number;
  hitFlash: number;
  phase: number;
  // Pattern helpers
  baseX: number;
  waveAmp: number;
  waveFreq: number;
  targetY: number;
  dashState?: 'approach' | 'aim' | 'dash';
  dashTimer?: number;
  dashAngle?: number;
  bossPattern?: number;
  bossPatternTimer?: number;
}

export interface PowerUpEntity {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  age: number;
  radius: number;
}

export interface ParticleEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  kind: 'spark' | 'smoke' | 'ring' | 'debris';
  rotation?: number;
  vRot?: number;
}

export interface FloatingTextEntity {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
}

export interface ShockwaveEntity {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface CloudLayerItem {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  alpha: number;
  tint: string;
}

export interface HudSnapshot {
  gameState: GameState;
  score: number;
  bestScore: number;
  wave: number;
  stage: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  combo: number;
  maxCombo: number;
  comboTimerRatio: number; // 0 to 1
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  weaponLevel: number;
  bombs: number;
  maxBombs: number;
  bossActive: boolean;
  bossName: string;
  bossHpRatio: number;
  bossHp: number;
  bossMaxHp: number;
  warningText: string;
  isNewRecord: boolean;
  aircraftId: AircraftId;
  difficultyId: DifficultyId;
}

export interface SavedRecord {
  bestScore: number;
  bestWave: number;
  bestKills: number;
  aircraftId: AircraftId;
}
