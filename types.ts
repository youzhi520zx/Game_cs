
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum PlayerClass {
  ASSAULT = 'ASSAULT',
  RUSHER = 'RUSHER',
  SNIPER = 'SNIPER',
  HEAVY = 'HEAVY'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  radius: number;
  velocity: { x: number; y: number };
  rotation: number; // Radians
  color: string;
  markedForDeletion?: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  armor: number;
  score: number;
  weaponTier: number;
  
  // Class Stats
  playerClass: PlayerClass;
  gender: Gender;
  moveSpeed: number;
  
  // Weapon Stats
  fireRate: number; // ms delay
  bulletDamage: number;
  bulletSpeed: number;
  bulletCount: number; // Projectiles per shot
  spread: number; // Spread angle in radians
}

export interface Bullet extends Entity {
  damage: number;
  isPlayer: boolean;
  speed: number;
}

export interface Explosion extends Position {
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  damage: number;
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  type: 'grunt' | 'scout' | 'sniper' | 'heavy';
  scoreValue: number;
  attackCooldown: number;
}

export interface LootCrate extends Position {
  type: 'health' | 'weapon' | 'armor';
  radius: number;
  markedForDeletion: boolean;
}

export interface GameStats {
  kills: number;
  damageDealt: number;
  accuracy: number;
  survivedTime: number;
  rank: string;
  difficulty: Difficulty;
  playerClass: PlayerClass;
}

export interface SafeZone {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  shrinkSpeed: number;
}
