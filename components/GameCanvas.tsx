
import React, { useRef, useEffect, useCallback } from 'react';
import { Player, Enemy, Bullet, LootCrate, GameStats, GameState, SafeZone, Difficulty, Explosion, PlayerClass, Gender } from '../types';

interface GameCanvasProps {
  gameState: GameState;
  sessionId: number;
  difficulty: Difficulty;
  playerClass: PlayerClass;
  playerGender: Gender;
  onGameOver: (stats: GameStats) => void;
  onScoreUpdate: (kills: number, hp: number, survivors: number, dashCd: number, nadeCd: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, sessionId, difficulty, playerClass, playerGender, onGameOver, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    x: 0, y: 0, radius: 20, velocity: { x: 0, y: 0 }, rotation: 0,
    color: '#3b82f6', hp: 100, maxHp: 100, armor: 0, score: 0, weaponTier: 1,
    playerClass: PlayerClass.ASSAULT, gender: Gender.MALE, moveSpeed: 4, fireRate: 150, bulletDamage: 20, bulletSpeed: 12, bulletCount: 1, spread: 0.1
  });
  
  const difficultyRef = useRef<Difficulty>(difficulty);
  const mouseRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const lootRef = useRef<LootCrate[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  
  // Zone Logic
  const zoneRef = useRef<SafeZone>({
    x: 0, y: 0, radius: 2000, targetRadius: 100, shrinkSpeed: 0.5
  });

  // Stats
  const statsRef = useRef<{
    startTime: number;
    shotsFired: number;
    shotsHit: number;
    damageDealt: number;
    kills: number;
  }>({ startTime: 0, shotsFired: 0, shotsHit: 0, damageDealt: 0, kills: 0 });

  // Timing & Cooldowns
  const lastEnemySpawn = useRef<number>(0);
  const lastShotTime = useRef<number>(0);
  const lastBleedTime = useRef<number>(0);
  const lastZoneDamageTime = useRef<number>(0);
  
  // Skills
  const lastDashTime = useRef<number>(0);
  const isDashing = useRef<boolean>(false);
  const lastGrenadeTime = useRef<number>(0);

  const DASH_COOLDOWN = 3000;
  const GRENADE_COOLDOWN = 8000;

  // Pause Logic
  const pausedTimeRef = useRef<number>(0);
  const previousGameState = useRef<GameState>(GameState.MENU);

  // Sync refs
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Handle Pause/Resume Time Compensation
  useEffect(() => {
    if (previousGameState.current === GameState.PLAYING && gameState === GameState.PAUSED) {
      pausedTimeRef.current = Date.now();
    } else if (previousGameState.current === GameState.PAUSED && gameState === GameState.PLAYING) {
      const timePaused = Date.now() - pausedTimeRef.current;
      statsRef.current.startTime += timePaused;
      lastEnemySpawn.current += timePaused;
      lastShotTime.current += timePaused;
      lastBleedTime.current += timePaused;
      lastDashTime.current += timePaused;
      lastGrenadeTime.current += timePaused;
      lastZoneDamageTime.current += timePaused;
      
      enemiesRef.current.forEach(e => {
        e.attackCooldown += timePaused;
      });
    }
    previousGameState.current = gameState;
  }, [gameState]);

  // Initialize Game State
  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Configure Player Stats based on Class
    let classStats = {
      hp: 100,
      moveSpeed: 4,
      color: '#3b82f6', // Blue (Assault)
      fireRate: 150,
      bulletDamage: 25,
      bulletSpeed: 12,
      bulletCount: 1,
      spread: 0.05
    };

    switch (playerClass) {
      case PlayerClass.RUSHER:
        classStats = {
          hp: 75,
          moveSpeed: 5.5,
          color: '#eab308', // Yellow
          fireRate: 80, // Very Fast
          bulletDamage: 12, // Low Damage
          bulletSpeed: 13,
          bulletCount: 1,
          spread: 0.2 // High Spread
        };
        break;
      case PlayerClass.SNIPER:
        classStats = {
          hp: 60,
          moveSpeed: 3.5,
          color: '#10b981', // Green
          fireRate: 900, // Slow
          bulletDamage: 120, // High Damage
          bulletSpeed: 25, // Fast Bullet
          bulletCount: 1,
          spread: 0.0 // Pinpoint
        };
        break;
      case PlayerClass.HEAVY:
        classStats = {
          hp: 160,
          moveSpeed: 2.8,
          color: '#ef4444', // Red
          fireRate: 750,
          bulletDamage: 18,
          bulletSpeed: 10,
          bulletCount: 5, // Shotgun
          spread: 0.35 // Wide Cone
        };
        break;
      default: // ASSAULT
        classStats = {
          hp: 100,
          moveSpeed: 4,
          color: '#3b82f6',
          fireRate: 150,
          bulletDamage: 22,
          bulletSpeed: 12,
          bulletCount: 1,
          spread: 0.05
        };
        break;
    }

    playerRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 20, // Slightly larger cartoon hitboxes
      velocity: { x: 0, y: 0 },
      rotation: 0,
      color: classStats.color,
      hp: classStats.hp,
      maxHp: classStats.hp,
      armor: 0,
      score: 0,
      weaponTier: 1,
      playerClass: playerClass,
      gender: playerGender,
      moveSpeed: classStats.moveSpeed,
      fireRate: classStats.fireRate,
      bulletDamage: classStats.bulletDamage,
      bulletSpeed: classStats.bulletSpeed,
      bulletCount: classStats.bulletCount,
      spread: classStats.spread
    };
    
    zoneRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: Math.max(canvas.width, canvas.height) * 1.2, 
      targetRadius: 100,
      shrinkSpeed: 0.2
    };

    bulletsRef.current = [];
    explosionsRef.current = [];
    enemiesRef.current = [];
    lootRef.current = [];
    statsRef.current = {
      startTime: Date.now(),
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      kills: 0
    };
    keysPressed.current.clear();
    
    // Reset timestamps
    lastBleedTime.current = 0; 
    lastEnemySpawn.current = 0;
    lastShotTime.current = 0;
    lastDashTime.current = 0; 
    lastGrenadeTime.current = 0; 
    lastZoneDamageTime.current = 0;

  }, [playerClass, playerGender]);

  const createExplosion = (x: number, y: number, damage: number, radius: number) => {
    explosionsRef.current.push({
      x, y, radius: 5, maxRadius: radius, age: 0, maxAge: 25, damage
    });
  };

  const spawnEnemy = (canvasWidth: number, canvasHeight: number, timestamp: number) => {
    const elapsedTime = (Date.now() - statsRef.current.startTime) / 1000;
    
    let spawnRateMult = 1.0;
    let statMult = 1.0;

    switch (difficultyRef.current) {
      case Difficulty.EASY:
        spawnRateMult = 1.3;
        statMult = 0.7;
        break;
      case Difficulty.HARD:
        spawnRateMult = 0.7;
        statMult = 1.3;
        break;
      default:
        spawnRateMult = 1.0;
        statMult = 1.0;
    }

    const baseSpawnRate = Math.max(500, 2000 - (elapsedTime * 25)); 
    const finalSpawnRate = baseSpawnRate * spawnRateMult;
    
    if (timestamp - lastEnemySpawn.current > finalSpawnRate) {
      const edge = Math.floor(Math.random() * 4); 
      let x = 0, y = 0;
      const buffer = 50;

      switch(edge) {
        case 0: x = Math.random() * canvasWidth; y = -buffer; break;
        case 1: x = canvasWidth + buffer; y = Math.random() * canvasHeight; break;
        case 2: x = Math.random() * canvasWidth; y = canvasHeight + buffer; break;
        case 3: x = -buffer; y = Math.random() * canvasHeight; break;
      }

      const roll = Math.random();
      let type: Enemy['type'] = 'grunt';
      let hp = 50;
      let scoreVal = 1;
      let color = '#ef4444';
      let radius = 18;

      if (elapsedTime > 40 && roll > 0.85) {
        type = 'heavy';
        hp = 250;
        scoreVal = 10;
        color = '#7f1d1d';
        radius = 30;
      } else if (elapsedTime > 20 && roll > 0.6) {
        type = 'sniper';
        hp = 40;
        scoreVal = 5;
        color = '#9333ea';
        radius = 18;
      } else if (roll > 0.4) {
        type = 'scout';
        hp = 25;
        scoreVal = 2;
        color = '#f59e0b';
        radius = 14;
      }

      hp = Math.floor(hp * statMult);

      enemiesRef.current.push({
        x, y, radius,
        velocity: { x: 0, y: 0 },
        rotation: 0,
        color, hp, maxHp: hp,
        type, scoreValue: scoreVal,
        attackCooldown: 0
      });
      lastEnemySpawn.current = timestamp;
    }
  };

  const spawnLoot = (x: number, y: number) => {
    const roll = Math.random();
    let type: LootCrate['type'] = 'health';
    if (roll > 0.8) type = 'weapon'; // Lower chance for weapon
    else if (roll > 0.5) type = 'armor';

    lootRef.current.push({
      x, y, radius: 15, type, markedForDeletion: false
    });
  };

  // Helper for drawing rounded rectangles manually to ensure cross-browser compatibility
  const drawRoundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    }
  };

  const drawCartoonCharacter = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    radius: number, 
    color: string, 
    rotation: number,
    type: 'player' | 'grunt' | 'scout' | 'sniper' | 'heavy',
    gender: Gender = Gender.MALE,
    playerClass?: PlayerClass
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const SKIN_COLOR = '#FCD5B5'; // Cartoon skin tone
    
    // --- 1. Feet (Animation) ---
    // Simulate walking by moving feet based on global X/Y position
    const walkOffset = Math.sin((x + y) * 0.1) * 5;
    
    ctx.fillStyle = '#333'; // Dark boots
    ctx.beginPath();
    // Left foot
    ctx.ellipse(-8 + walkOffset, 10, 6, 8, 0, 0, Math.PI * 2);
    // Right foot
    ctx.ellipse(-8 - walkOffset, -10, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. Ponytail (Females) - Behind Head ---
    if (gender === Gender.FEMALE && type === 'player') {
       ctx.fillStyle = '#1a1a1a'; // Dark hair
       ctx.beginPath();
       const hairWiggle = Math.sin(Date.now() / 200) * 2;
       ctx.arc(-15, 0 + hairWiggle, 8, 0, Math.PI * 2);
       ctx.fill();
       ctx.stroke();
    }

    // --- 3. Body / Vest ---
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    
    ctx.beginPath();
    if (type === 'heavy' || playerClass === PlayerClass.HEAVY) {
      // Heavy armor - Boxy
      drawRoundRectPath(ctx, -radius, -radius * 0.9, radius * 1.8, radius * 1.8, 5);
    } else if (gender === Gender.FEMALE && type === 'player') {
      // Female vest - slightly smaller shoulders
      ctx.ellipse(0, 0, radius * 0.7, radius * 0.8, 0, 0, Math.PI * 2);
    } else {
      // Standard Male / Enemy vest
      ctx.ellipse(0, 0, radius * 0.8, radius * 0.9, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();

    // Vest Detail (Armor Plate)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.rect(-5, -6, 10, 12);
    ctx.fill();

    // --- 4. Hands (Holding Gun) ---
    // Hands positioned forward
    ctx.fillStyle = SKIN_COLOR;
    ctx.beginPath();
    ctx.arc(radius * 0.8, -radius * 0.6, 5, 0, Math.PI * 2); // Left hand
    ctx.arc(radius * 0.8, radius * 0.6, 5, 0, Math.PI * 2); // Right hand
    ctx.fill();
    ctx.stroke();

    // --- 5. Head ---
    ctx.fillStyle = SKIN_COLOR;
    ctx.beginPath();
    // Head size
    const headSize = type === 'heavy' ? radius * 0.7 : radius * 0.65;
    ctx.arc(0, 0, headSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- 6. Face (Eyes) ---
    const eyeOffset = 5;
    const eyeX = 4;
    
    // Goggles for Sniper
    if (type === 'sniper' || playerClass === PlayerClass.SNIPER) {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      drawRoundRectPath(ctx, 0, -eyeOffset - 4, 10, 16, 2);
      ctx.fill();
      ctx.fillStyle = '#0ff'; // Blue lens
      ctx.beginPath();
      ctx.arc(5, -2, 4, 0, Math.PI * 2); // Lens
      ctx.fill();
    } else {
      // Standard Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(eyeX, -eyeOffset, 4, 0, Math.PI * 2);
      ctx.arc(eyeX, eyeOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(eyeX + 2, -eyeOffset, 1.5, 0, Math.PI * 2);
      ctx.arc(eyeX + 2, eyeOffset, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Angry Eyebrows for enemies
      if (type !== 'player') {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(eyeX - 2, -eyeOffset - 4); ctx.lineTo(eyeX + 4, -eyeOffset - 1);
        ctx.moveTo(eyeX - 2, eyeOffset + 4); ctx.lineTo(eyeX + 4, eyeOffset + 1);
        ctx.stroke();
      }
    }

    // --- 7. Headgear / Hair ---
    
    // Assault / Standard Player Helmet
    if ((type === 'player' && playerClass === PlayerClass.ASSAULT) || (type === 'player' && !playerClass)) {
        ctx.fillStyle = '#4b5563'; // Grey helmet
        ctx.beginPath();
        ctx.arc(-2, 0, headSize + 1, Math.PI/2, Math.PI * 1.5);
        ctx.fill();
        ctx.stroke();
    }

    // Rusher Bandana
    if (type === 'player' && playerClass === PlayerClass.RUSHER) {
        ctx.fillStyle = '#ef4444'; // Red Bandana
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, headSize, 0, Math.PI * 2); // Just ring
        ctx.stroke();
        // Knot behind
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-headSize, -5); ctx.lineTo(-headSize - 8, -8); ctx.lineTo(-headSize, 0);
        ctx.moveTo(-headSize, 5); ctx.lineTo(-headSize - 8, 8); ctx.lineTo(-headSize, 0);
        ctx.fill();
    }
    
    // Heavy Helmet (Full)
    if (type === 'heavy' || playerClass === PlayerClass.HEAVY) {
        ctx.fillStyle = '#1f2937'; // Dark armor
        ctx.beginPath();
        ctx.arc(0, 0, headSize + 2, Math.PI/2, Math.PI * 1.5);
        ctx.fill();
        ctx.stroke();
        // Visor line
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(0, 6);
        ctx.stroke();
    }

    // Standard Hair (Male Player no helmet) - Fallback
    if (type === 'player' && gender === Gender.MALE && playerClass !== PlayerClass.HEAVY && playerClass !== PlayerClass.ASSAULT) {
        ctx.fillStyle = '#1a1a1a'; // Dark hair
        ctx.beginPath();
        ctx.arc(-2, 0, headSize, Math.PI/2, Math.PI * 1.5);
        ctx.fill();
    }
    
    // Scout Hood
    if (type === 'scout') {
       ctx.fillStyle = color;
       ctx.beginPath();
       ctx.arc(-2, 0, headSize + 1, Math.PI/2, Math.PI * 1.5);
       ctx.fill();
       ctx.stroke();
    }

    ctx.restore();
  };

  const animate = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dmgMult = 1.0;
    if (difficultyRef.current === Difficulty.EASY) dmgMult = 0.7;
    if (difficultyRef.current === Difficulty.HARD) dmgMult = 1.3;

    // --- Update Logic ---

    // 1. Zone Update
    if (zoneRef.current.radius > zoneRef.current.targetRadius) {
      zoneRef.current.radius -= zoneRef.current.shrinkSpeed;
    }

    // 2. Player Movement
    let speed = playerRef.current.moveSpeed;
    
    // DASH SKILL
    if (keysPressed.current.has(' ') && time - lastDashTime.current > DASH_COOLDOWN) {
      isDashing.current = true;
      lastDashTime.current = time;
      setTimeout(() => { isDashing.current = false; }, 200); 
    }

    if (isDashing.current) {
      speed *= 3;
    }

    let dx = 0; 
    let dy = 0;
    if (keysPressed.current.has('w') || keysPressed.current.has('ArrowUp')) dy -= 1;
    if (keysPressed.current.has('s') || keysPressed.current.has('ArrowDown')) dy += 1;
    if (keysPressed.current.has('a') || keysPressed.current.has('ArrowLeft')) dx -= 1;
    if (keysPressed.current.has('d') || keysPressed.current.has('ArrowRight')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx*dx + dy*dy);
      playerRef.current.x += (dx / length) * speed;
      playerRef.current.y += (dy / length) * speed;
    }

    playerRef.current.x = Math.max(playerRef.current.radius, Math.min(canvas.width - playerRef.current.radius, playerRef.current.x));
    playerRef.current.y = Math.max(playerRef.current.radius, Math.min(canvas.height - playerRef.current.radius, playerRef.current.y));

    // Player Rotation
    const angle = Math.atan2(mouseRef.current.y - playerRef.current.y, mouseRef.current.x - playerRef.current.x);
    playerRef.current.rotation = angle;

    // GRENADE SKILL (E Key)
    if (keysPressed.current.has('e') && time - lastGrenadeTime.current > GRENADE_COOLDOWN) {
      lastGrenadeTime.current = time;
      // Visual feedback: just instant explosion at cursor for simplicity in top-down
      createExplosion(mouseRef.current.x, mouseRef.current.y, 100, 100);
    }

    // Shooting
    if (keysPressed.current.has('mousedown') && time - lastShotTime.current > playerRef.current.fireRate) {
      const p = playerRef.current;
      const count = p.bulletCount;
      const spread = p.spread;
      
      // Calculate start angle (centered)
      // If 1 bullet, angle is 0. If 5, spread from -2*step to +2*step
      const startAngle = p.rotation - (spread / 2);
      const step = count > 1 ? spread / (count - 1) : 0;

      for (let i = 0; i < count; i++) {
        let currentAngle = count > 1 ? startAngle + (step * i) : p.rotation;
        
        // Add a tiny bit of random jitter to all shots so it feels organic
        currentAngle += (Math.random() - 0.5) * 0.05; 
        // For heavy spread, we already have spread, but maybe Rusher needs more random jitter?
        if (p.playerClass === PlayerClass.RUSHER) {
             currentAngle += (Math.random() - 0.5) * p.spread;
        }

        bulletsRef.current.push({
          x: p.x + Math.cos(p.rotation) * 20,
          y: p.y + Math.sin(p.rotation) * 20,
          radius: 4,
          velocity: {
            x: Math.cos(currentAngle) * p.bulletSpeed,
            y: Math.sin(currentAngle) * p.bulletSpeed
          },
          rotation: currentAngle,
          color: '#ffff00',
          damage: p.bulletDamage,
          isPlayer: true,
          speed: p.bulletSpeed
        });
      }
      
      lastShotTime.current = time;
      statsRef.current.shotsFired++;
    }

    // 3. Bleed Mechanic (Loss 1 HP per second)
    // IMPORTANT: Check for 0 initialization to avoid massive initial bleed
    if (lastBleedTime.current > 0 && time - lastBleedTime.current > 1000) {
      playerRef.current.hp = Math.max(0, playerRef.current.hp - 1);
      lastBleedTime.current = time;
      
      if (playerRef.current.hp <= 0) {
        // Game Over handled in next frame or immediate check
      }
    } else if (lastBleedTime.current === 0) {
        lastBleedTime.current = time;
    }

    // 4. Update Bullets
    bulletsRef.current.forEach(b => {
      b.x += b.velocity.x;
      b.y += b.velocity.y;
      
      if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
        b.markedForDeletion = true;
      }
    });

    // 5. Update Enemies
    spawnEnemy(canvas.width, canvas.height, time);
    enemiesRef.current.forEach(enemy => {
      const dx = playerRef.current.x - enemy.x;
      const dy = playerRef.current.y - enemy.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Move towards player
      let speed = 1.5;
      if (enemy.type === 'scout') speed = 2.5;
      if (enemy.type === 'heavy') speed = 0.8;
      if (enemy.type === 'sniper') speed = 1.2;

      // Snipers stop at distance
      if (enemy.type === 'sniper' && dist < 400 && dist > 200) {
         speed = 0;
      } else if (enemy.type === 'sniper' && dist <= 200) {
         speed = -1; // Retreat
      }

      const angle = Math.atan2(dy, dx);
      enemy.rotation = angle;
      enemy.x += Math.cos(angle) * speed;
      enemy.y += Math.sin(angle) * speed;

      // Enemy Shooting
      const fireRate = enemy.type === 'heavy' ? 2000 : (enemy.type === 'sniper' ? 3000 : 1500);
      if (time - enemy.attackCooldown > fireRate && dist < 500) {
         // Enemy shoots
         const bulletSpeed = enemy.type === 'sniper' ? 8 : 4;
         const dmg = enemy.type === 'heavy' ? 15 : (enemy.type === 'sniper' ? 30 : 5);
         
         bulletsRef.current.push({
           x: enemy.x, y: enemy.y,
           radius: 4,
           velocity: { x: Math.cos(angle)*bulletSpeed, y: Math.sin(angle)*bulletSpeed },
           rotation: angle,
           color: enemy.color,
           damage: Math.floor(dmg * dmgMult),
           isPlayer: false,
           speed: bulletSpeed
         });
         enemy.attackCooldown = time;
      }
    });

    // 6. Collisions
    // Bullet vs Enemies/Player
    bulletsRef.current.forEach(b => {
      if (b.isPlayer) {
        enemiesRef.current.forEach(e => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.radius + b.radius) {
            e.hp -= b.damage;
            b.markedForDeletion = true;
            statsRef.current.shotsHit++;
            statsRef.current.damageDealt += b.damage;
            
            // Knockback
            e.x += Math.cos(b.rotation) * 5;
            e.y += Math.sin(b.rotation) * 5;

            if (e.hp <= 0 && !e.markedForDeletion) {
              e.markedForDeletion = true;
              statsRef.current.kills++;
              playerRef.current.score += e.scoreValue * 100;
              // KILL REWARD
              playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + 10);
              
              createExplosion(e.x, e.y, 0, 30);
              // Chance to drop loot
              if (Math.random() > 0.8) spawnLoot(e.x, e.y);
            }
          }
        });
      } else {
        // Enemy bullet vs Player
        if (!isDashing.current) {
          const dist = Math.hypot(b.x - playerRef.current.x, b.y - playerRef.current.y);
          if (dist < playerRef.current.radius + b.radius) {
            playerRef.current.hp -= b.damage;
            b.markedForDeletion = true;
          }
        }
      }
    });

    // Explosion Damage
    explosionsRef.current.forEach(exp => {
      if (exp.damage > 0 && exp.age === 0) { // Apply damage only on first frame
         enemiesRef.current.forEach(e => {
            const dist = Math.hypot(exp.x - e.x, exp.y - e.y);
            if (dist < exp.maxRadius) {
               e.hp -= exp.damage;
               if (e.hp <= 0) e.markedForDeletion = true;
            }
         });
      }
      exp.age++;
    });

    // Check Safe Zone Damage
    const distToCenter = Math.hypot(playerRef.current.x - zoneRef.current.x, playerRef.current.y - zoneRef.current.y);
    if (distToCenter > zoneRef.current.radius) {
       // Outside zone!
       if (lastZoneDamageTime.current === 0 || time - lastZoneDamageTime.current > 1000) {
          playerRef.current.hp -= 5;
          lastZoneDamageTime.current = time;
       }
    }

    // Cleanup
    bulletsRef.current = bulletsRef.current.filter(b => !b.markedForDeletion);
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    explosionsRef.current = explosionsRef.current.filter(e => e.age < e.maxAge);
    lootRef.current = lootRef.current.filter(l => {
       const dist = Math.hypot(l.x - playerRef.current.x, l.y - playerRef.current.y);
       if (dist < l.radius + playerRef.current.radius) {
          // Pickup
          if (l.type === 'health') playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + 30);
          if (l.type === 'armor') playerRef.current.armor += 50;
          return false;
       }
       return true;
    });

    // Check Game Over
    if (playerRef.current.hp <= 0) {
      onGameOver({
        kills: statsRef.current.kills,
        damageDealt: statsRef.current.damageDealt,
        accuracy: statsRef.current.shotsFired > 0 ? statsRef.current.shotsHit / statsRef.current.shotsFired : 0,
        survivedTime: Math.floor((Date.now() - statsRef.current.startTime) / 1000),
        rank: 'Soldier',
        difficulty: difficultyRef.current,
        playerClass: playerClass
      });
      return;
    }

    // --- Rendering ---
    
    // Background (Grass)
    ctx.fillStyle = '#578a34';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    const gridSize = 50;
    const offsetX = Math.floor(playerRef.current.x / gridSize) * gridSize; // Parallax/scroll effect? No, simple fixed grid for now.
    for (let x=0; x<canvas.width; x+=gridSize) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for (let y=0; y<canvas.height; y+=gridSize) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

    // Safe Zone
    ctx.save();
    ctx.beginPath();
    ctx.arc(zoneRef.current.x, zoneRef.current.y, zoneRef.current.radius, 0, Math.PI * 2);
    ctx.rect(canvas.width, 0, -canvas.width, canvas.height); // Outer rect
    ctx.clip("evenodd"); // Clip hole
    ctx.fillStyle = 'rgba(20, 20, 150, 0.3)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(zoneRef.current.x, zoneRef.current.y, zoneRef.current.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Loot
    lootRef.current.forEach(l => {
       ctx.fillStyle = l.type === 'health' ? '#22c55e' : (l.type === 'weapon' ? '#f59e0b' : '#3b82f6');
       ctx.beginPath();
       ctx.rect(l.x - 10, l.y - 10, 20, 20);
       ctx.fill();
       ctx.lineWidth = 2;
       ctx.strokeStyle = '#fff';
       ctx.stroke();
       // Icon
       ctx.fillStyle = '#fff';
       ctx.font = 'bold 12px Arial';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(l.type === 'health' ? '+' : (l.type === 'weapon' ? 'W' : 'S'), l.x, l.y);
    });

    // Enemies
    enemiesRef.current.forEach(e => {
       drawCartoonCharacter(ctx, e.x, e.y, e.radius, e.color, e.rotation, e.type);
       // HP Bar
       ctx.fillStyle = 'red';
       ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30, 4);
       ctx.fillStyle = 'lime';
       ctx.fillRect(e.x - 15, e.y - e.radius - 12, 30 * (e.hp / e.maxHp), 4);
    });

    // Player
    drawCartoonCharacter(ctx, playerRef.current.x, playerRef.current.y, playerRef.current.radius, playerRef.current.color, playerRef.current.rotation, 'player', playerRef.current.gender, playerRef.current.playerClass);

    // Bullets
    bulletsRef.current.forEach(b => {
       ctx.fillStyle = b.color;
       ctx.beginPath();
       ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
       ctx.fill();
    });

    // Explosions
    explosionsRef.current.forEach(exp => {
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius + (exp.age / exp.maxAge) * exp.maxRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 100, 0, ${1 - exp.age/exp.maxAge})`;
      ctx.fill();
    });

    // Callback UI
    onScoreUpdate(
        statsRef.current.kills, 
        playerRef.current.hp, 
        99 - statsRef.current.kills, 
        Math.min(100, ((time - lastDashTime.current) / DASH_COOLDOWN) * 100),
        Math.min(100, ((time - lastGrenadeTime.current) / GRENADE_COOLDOWN) * 100)
    );

    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, onGameOver, onScoreUpdate]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  useEffect(() => {
    initGame();
  }, [sessionId, initGame]); // Re-init only when sessionId changes

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    const handleMouseDown = () => keysPressed.current.add('mousedown');
    const handleMouseUp = () => keysPressed.current.delete('mousedown');
    const handleMouseMove = (e: MouseEvent) => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
    }
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="block" />;
};

export default GameCanvas;
