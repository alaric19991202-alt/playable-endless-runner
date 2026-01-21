import * as PIXI from "pixi.js";
import { TextureMap } from "./assets";
import { applyLayout, computeLayout, Layout } from "./layout";
import { createInitialState, GameState } from "./state";

type ObstacleKind = "enemy" | "warning";

type Obstacle = {
  sprite: PIXI.Sprite;
  speed: number;
  hit: boolean;
  lane: number;
  kind: ObstacleKind;
  animated: boolean;
};

type Pickup = {
  sprite: PIXI.Sprite;
  speed: number;
  value: number;
  phase: number;
};

type ParallaxItem = {
  sprite: PIXI.Sprite;
  speedFactor: number;
};

type PlayerAnimState = "idle" | "run" | "jump" | "damage";
type JumpPhase = "none" | "start" | "air" | "land";

export class RunnerWorld {
  view: PIXI.Container;
  state: GameState;

  private layout: Layout;
  private textures: TextureMap;
  private background: PIXI.Container;
  private finishLayer: PIXI.Container;
  private actorLayer: PIXI.Container;
  private road: PIXI.Sprite;
  private treeLayer: PIXI.Container;
  private lampLayer: PIXI.Container;
  private parallaxTrees: ParallaxItem[] = [];
  private parallaxLamps: ParallaxItem[] = [];
  private treeSpacing = 0;
  private lampSpacing = 0;

  private enemyFrames: PIXI.Texture[];
  private playerIdleFrames: PIXI.Texture[];
  private playerRunFrames: PIXI.Texture[];
  private playerJumpFrames: PIXI.Texture[];
  private playerDamageFrames: PIXI.Texture[];
  private player: PIXI.AnimatedSprite;
  private damageOverlay: PIXI.Sprite;
  private playerScale = 1;
  private enemyScale = 1;

  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];

  private laneIndex = 0;
  private laneYs: number[] = [0];
  private playerBaseY = 0;
  private playerX = 0;
  private playerVy = 0;
  private isJumping = false;
  private playerAnimState: PlayerAnimState = "idle";
  private jumpPhase: JumpPhase = "none";
  private jumpPhaseTimer = 0;

  private speed = 0;
  private baseSpeed = 0;
  private maxSpeed = 0;
  private accel = 0;
  private distance = 0;
  private finishDistance = 2600;
  private enemySpawnTimer = 0;
  private warningSpawnTimer = 0;
  private moneySpawnTimer = 0;
  private countdownTimer = 0;
  private tutorialJumped = false;
  private tutorialShown = false;
  private enemyUnlocked = false;
  private introWarningGoal = 1;
  private introWarningsDodged = 0;
  private introMoneyGoal = 15;
  private introMoneyCollected = 0;
  private landingSafetyTimer = 0;
  private landingSafetyDistance = 0;
  private tutorialObstacle?: Obstacle;
  private lastEnemyLane = 0;
  private lastWarningLane = 0;
  private lastMoneyLane = 0;

  private finishLine?: PIXI.Sprite;

  constructor(textures: TextureMap) {
    this.textures = textures;
    this.view = new PIXI.Container();
    this.state = createInitialState();
    this.layout = computeLayout(720, 1280);

    this.background = new PIXI.Container();
    this.finishLayer = new PIXI.Container();
    this.actorLayer = new PIXI.Container();
    this.treeLayer = new PIXI.Container();
    this.lampLayer = new PIXI.Container();

    this.road = new PIXI.Sprite(this.textures.road);
    this.background.addChild(this.road);
    this.background.addChild(this.treeLayer);
    this.background.addChild(this.lampLayer);

    this.view.addChild(this.background);
    this.view.addChild(this.finishLayer);
    this.view.addChild(this.actorLayer);

    this.playerIdleFrames = [
      this.textures.playerIdle0,
      this.textures.playerIdle1
    ];
    this.playerRunFrames = [
      this.textures.playerRun0,
      this.textures.playerRun1,
      this.textures.playerRun2,
      this.textures.playerRun3,
      this.textures.playerRun4,
      this.textures.playerRun5
    ];
    this.playerJumpFrames = [
      this.textures.playerJump0,
      this.textures.playerJump1,
      this.textures.playerJump2
    ];
    this.playerDamageFrames = [this.textures.playerDamage];
    this.enemyFrames = [
      this.textures.enemy0,
      this.textures.enemy1,
      this.textures.enemy2,
      this.textures.enemy3,
      this.textures.enemy4,
      this.textures.enemy5,
      this.textures.enemy6,
      this.textures.enemy7,
      this.textures.enemy8,
      this.textures.enemy9
    ];

    this.player = new PIXI.AnimatedSprite(this.playerIdleFrames);
    this.player.anchor.set(0.5, 1);
    this.player.animationSpeed = 0.1;
    this.player.autoUpdate = false;
    this.player.loop = true;
    this.player.play();
    this.actorLayer.addChild(this.player);

    this.damageOverlay = new PIXI.Sprite(this.textures.damage);
    this.damageOverlay.anchor.set(0.5, 1);
    this.damageOverlay.visible = false;
    this.actorLayer.addChild(this.damageOverlay);
  }

  resize(viewWidth: number, viewHeight: number) {
    this.layout = computeLayout(viewWidth, viewHeight);
    applyLayout(this.view, this.layout);
    this.layoutScene();
  }

  update(ticker: PIXI.Ticker) {
    const deltaSeconds = ticker.deltaMS / 1000;

    if (this.state.phase === "tutorial") {
      return;
    }

    this.updateTimers(deltaSeconds);
    this.updateParallax(deltaSeconds);
    const wasJumping = this.isJumping;
    this.updatePlayer(deltaSeconds);
    const landed = wasJumping && !this.isJumping;
    this.updatePlayerAnimation(deltaSeconds, landed);
    this.updateDamageOverlay();
    this.player.update(ticker);

    if (this.state.phase !== "playing") {
      return;
    }

    this.distance += this.speed * deltaSeconds;
    this.speed = Math.min(this.maxSpeed, this.speed + this.accel * deltaSeconds);

    if (!this.finishLine && this.distance > this.finishDistance) {
      this.spawnFinishLine();
    }

    const allowSpawns = !this.finishLine;
    if (allowSpawns && this.enemyUnlocked) {
      this.enemySpawnTimer -= deltaSeconds;
      if (this.enemySpawnTimer <= 0) {
        this.spawnEnemy();
        this.scheduleEnemySpawn();
      }
    }

    if (allowSpawns) {
      this.warningSpawnTimer -= deltaSeconds;
      if (this.warningSpawnTimer <= 0) {
        if (this.landingSafetyTimer <= 0 && !this.isJumping) {
          this.spawnWarning();
          this.scheduleWarningSpawn();
        } else {
          this.warningSpawnTimer = this.landingSafetyTimer + RunnerWorld.randomRange(0.2, 0.4);
        }
      }
    }

    if (allowSpawns) {
      this.moneySpawnTimer -= deltaSeconds;
      if (this.moneySpawnTimer <= 0) {
        this.spawnMoneyPattern();
      }
    }

    this.updateObstacles(deltaSeconds, ticker);
    if (this.state.phase !== "playing") {
      return;
    }
    this.updatePickups(deltaSeconds);
    this.updateFinishLine(deltaSeconds);

    if (this.finishLine && this.finishLine.x < this.player.x + 40) {
      this.triggerSuccess();
    }
  }

  jumpOrRestart() {
    if (this.state.phase === "start") {
      this.startRun();
      return;
    }
    if (this.state.phase === "tutorial") {
      this.exitTutorial();
      this.jump();
      return;
    }
    if (this.state.phase === "playing") {
      this.jump();
      return;
    }
    this.reset();
  }

  moveLane(delta: number) {
    if (this.state.phase !== "playing" && this.state.phase !== "tutorial") {
      return;
    }
    if (this.laneYs.length <= 1) {
      return;
    }
    const next = RunnerWorld.clamp(this.laneIndex + delta, 0, this.laneYs.length - 1);
    if (next !== this.laneIndex) {
      this.laneIndex = next;
      this.playerBaseY = this.laneYs[this.laneIndex];
    }
  }

  private layoutScene() {
    const { designWidth, designHeight, unit } = this.layout;
    const bgScale = designHeight / this.road.texture.height;
    this.road.scale.set(bgScale);
    this.road.position.set((designWidth - this.road.width) / 2, 0);

    const groundRatio = this.layout.isPortrait ? 0.73 : 0.77;
    const groundY = designHeight * groundRatio;
    this.laneYs = [groundY];
    this.laneIndex = 0;
    this.playerBaseY = this.laneYs[0];
    this.playerX = designWidth * 0.2;

    this.playerScale = 1 * unit;
    this.enemyScale = 0.7 * unit;
    this.player.scale.set(this.playerScale);
    this.player.position.set(this.playerX, this.playerBaseY);
    this.damageOverlay.scale.set(this.playerScale);
    this.damageOverlay.position.set(this.playerX, this.playerBaseY);
    this.landingSafetyDistance = 140 * unit;

    this.baseSpeed = 500 * unit;
    this.maxSpeed = 660 * unit;
    this.accel = 18 * unit;
    this.speed = Math.max(this.speed, this.baseSpeed);
    this.finishDistance = 16000 * unit;

    this.buildParallax();
  }
//#region Parallax
  private buildParallax() {
    const { designWidth, designHeight, unit } = this.layout;
    this.treeLayer.removeChildren();
    this.lampLayer.removeChildren();
    this.parallaxTrees = [];
    this.parallaxLamps = [];

    const treeTextures = [this.textures.trees1, this.textures.trees2];
    const treeCount = Math.ceil(designWidth / 420) + 4;
    this.treeSpacing = designWidth / (treeCount - 3);

    for (let i = 0; i < treeCount; i += 1) {
      const sprite = new PIXI.Sprite(treeTextures[i % treeTextures.length]);
      sprite.anchor.set(0.5, 1);
      const scale = 2.2 * unit;
      sprite.scale.set(scale);
      sprite.x = -this.treeSpacing + i * this.treeSpacing;
      sprite.y = designHeight * 0.6;
      this.treeLayer.addChild(sprite);
      this.parallaxTrees.push({
        sprite,
        speedFactor: 0.25
      });
    }
//#endregion
    const lampCount = Math.ceil(designWidth / 420) + 2;
    this.lampSpacing = designWidth / (lampCount - 1);
    for (let i = 0; i < lampCount; i += 1) {
      const sprite = new PIXI.Sprite(this.textures.streetlight);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(1.2 * unit);
      sprite.x = -this.lampSpacing * 0.5 + i * this.lampSpacing;
      sprite.y = designHeight * 0.62;
      this.lampLayer.addChild(sprite);
      this.parallaxLamps.push({
        sprite,
        speedFactor: 0.35
      });
    }
  }

  private updateParallax(deltaSeconds: number) {
    if (this.state.phase !== "playing") {
      return;
    }
    const scroll = this.speed * deltaSeconds;
    let maxTreeX = -Infinity;
    let maxLampX = -Infinity;
    for (const item of this.parallaxTrees) {
      if (item.sprite.x > maxTreeX) {
        maxTreeX = item.sprite.x;
      }
    }
    for (const item of this.parallaxLamps) {
      if (item.sprite.x > maxLampX) {
        maxLampX = item.sprite.x;
      }
    }

    for (const item of this.parallaxTrees) {
      item.sprite.x -= scroll * item.speedFactor;
      if (item.sprite.x < -item.sprite.width) {
        item.sprite.x = maxTreeX + this.treeSpacing;
        maxTreeX = item.sprite.x;
      }
    }
    for (const item of this.parallaxLamps) {
      item.sprite.x -= scroll * item.speedFactor;
      if (item.sprite.x < -item.sprite.width) {
        item.sprite.x = maxLampX + this.lampSpacing;
        maxLampX = item.sprite.x;
      }
    }
  }
//#region Jumping
  private updatePlayer(deltaSeconds: number) {
    if (this.isJumping) {
      this.playerVy += 2400 * this.layout.unit * deltaSeconds;
      this.player.y += 2 * this.playerVy * deltaSeconds;
      if (this.player.y >= this.playerBaseY) {
        this.player.y = this.playerBaseY;
        this.playerVy = 0;
        this.isJumping = false;
      }
      return;
    }
    const diff = this.playerBaseY - this.player.y;
    this.player.y += diff * Math.min(1, deltaSeconds * 20);
  }
//#endregion
  private updatePlayerAnimation(deltaSeconds: number, landed: boolean) {
    if (this.state.damageTimer > 0) {
      this.setDamageFrame();
      return;
    }

    if (landed) {
      this.jumpPhase = "land";
      this.jumpPhaseTimer = 0;
    }

    if (this.isJumping) {
      const startDuration = 0.08;
      this.jumpPhaseTimer += deltaSeconds;
      if (this.jumpPhase === "none" || this.jumpPhase === "land") {
        this.jumpPhase = "start";
        this.jumpPhaseTimer = 0;
      }
      if (this.jumpPhase === "start") {
        this.setJumpFrame(0);
        if (this.jumpPhaseTimer >= startDuration) {
          this.jumpPhase = "air";
          this.jumpPhaseTimer = 0;
        }
      } else {
        this.setJumpFrame(1);
      }
      return;
    }

    if (this.jumpPhase === "land") {
      const landDuration = 0.12;
      this.jumpPhaseTimer += deltaSeconds;
      this.setJumpFrame(2);
      if (this.jumpPhaseTimer >= landDuration) {
        this.jumpPhase = "none";
        this.jumpPhaseTimer = 0;
      }
      return;
    }

    if (this.jumpPhase === "start" || this.jumpPhase === "air") {
      this.jumpPhase = "none";
      this.jumpPhaseTimer = 0;
    }

    if (this.state.phase === "playing") {
      this.setRunAnimation();
    } else {
      this.setIdleAnimation();
    }
  }

  private updateDamageOverlay() {
    if (this.state.damageTimer > 0) {
      const alpha = Math.min(0.85, this.state.damageTimer * 2.4);
      this.damageOverlay.visible = true;
      this.damageOverlay.alpha = alpha;
      this.damageOverlay.position.set(this.player.x, this.player.y);
    } else {
      this.damageOverlay.visible = false;
    }
  }

  private setRunAnimation() {
    if (this.playerAnimState === "run") {
      return;
    }
    this.playerAnimState = "run";
    this.player.textures = this.playerRunFrames;
    this.player.loop = true;
    this.player.animationSpeed = 0.15;
    this.player.play();
  }

  private setIdleAnimation() {
    if (this.playerAnimState === "idle") {
      return;
    }
    this.playerAnimState = "idle";
    this.player.textures = this.playerIdleFrames;
    this.player.loop = true;
    this.player.animationSpeed = 0.08;
    this.player.play();
  }

  private setJumpFrame(frameIndex: number) {
    if (this.playerAnimState !== "jump") {
      this.playerAnimState = "jump";
      this.player.textures = this.playerJumpFrames;
      this.player.loop = false;
    }
    this.player.gotoAndStop(frameIndex);
  }

  private setDamageFrame() {
    if (this.playerAnimState !== "damage") {
      this.playerAnimState = "damage";
      this.player.textures = this.playerDamageFrames;
      this.player.loop = false;
    }
    this.player.gotoAndStop(0);
  }

  private updateObstacles(deltaSeconds: number, ticker: PIXI.Ticker) {
    const playerBounds = this.player.getBounds();
    for (const obstacle of this.obstacles) {
      if (this.shouldTriggerTutorial(obstacle)) {
        this.enterTutorial(obstacle);
        return;
      }
      if (obstacle.animated) {
        (obstacle.sprite as PIXI.AnimatedSprite).update(ticker);
      }
      obstacle.sprite.x -= obstacle.speed * deltaSeconds;
      if (!obstacle.hit && this.state.phase === "playing") {
        const enemyBounds = obstacle.sprite.getBounds();
        const overlap = obstacle.kind === "warning" ? 0.62 : 0.72;
        if (RunnerWorld.rectsOverlap(playerBounds, enemyBounds, overlap)) {
          if (this.handleHit(obstacle)) {
            return;
          }
        }
      }
    }
    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.sprite.x < -200) {
        if (obstacle.kind === "warning" && !obstacle.hit) {
          this.noteWarningDodged();
        }
        obstacle.sprite.removeFromParent();
        obstacle.sprite.destroy({ children: true, texture: false });
        return false;
      }
      return true;
    });
  }

  private updatePickups(deltaSeconds: number) {
    const playerBounds = this.player.getBounds();
    const time = performance.now() / 1000;
    this.pickups = this.pickups.filter((pickup) => {
      pickup.sprite.x -= pickup.speed * deltaSeconds;
      pickup.sprite.y += Math.sin(time * 3 + pickup.phase) * 0.35;
      if (RunnerWorld.rectsOverlap(playerBounds, pickup.sprite.getBounds(), 0.6)) {
        this.collectMoney(pickup.value);
        pickup.sprite.removeFromParent();
        pickup.sprite.destroy({ children: true, texture: false });
        return false;
      }
      if (pickup.sprite.x < -200) {
        pickup.sprite.removeFromParent();
        pickup.sprite.destroy({ children: true, texture: false });
        return false;
      }
      return true;
    });
  }

  private updateTutorial(_deltaSeconds: number) {}

  private updateFinishLine(deltaSeconds: number) {
    if (!this.finishLine) {
      return;
    }
    this.finishLine.x -= this.speed * deltaSeconds;
    if (this.finishLine.x < -1200) {
      this.finishLine.removeFromParent();
      this.finishLine.destroy({ children: true, texture: false });
      this.finishLine = undefined;
    }
  }

  private updateTimers(deltaSeconds: number) {
    if (this.state.toastTimer > 0) {
      this.state.toastTimer = Math.max(0, this.state.toastTimer - deltaSeconds);
    }
    if (this.state.damageTimer > 0) {
      this.state.damageTimer = Math.max(0, this.state.damageTimer - deltaSeconds);
    }
    if (this.state.failBadgeTimer > 0) {
      this.state.failBadgeTimer = Math.max(0, this.state.failBadgeTimer - deltaSeconds);
      if (this.state.failBadgeTimer === 0 && this.state.phase === "fail") {
        this.state.phase = "cta";
        this.startCountdown();
      }
    }
    if (this.state.phase === "cta" || this.state.phase === "success") {
      this.countdownTimer -= deltaSeconds;
      if (this.countdownTimer <= 0) {
        this.state.countdown = Math.max(0, this.state.countdown - 1);
        this.countdownTimer = 1;
      }
    }
    if (this.landingSafetyTimer > 0) {
      this.landingSafetyTimer = Math.max(0, this.landingSafetyTimer - deltaSeconds);
    }
  }

  private startRun() {
    this.state.phase = "playing";
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.clearObstacles();
    this.clearPickups();
    this.resetIntro();
    this.warningSpawnTimer = RunnerWorld.randomRange(0.4, 0.9);
    this.scheduleMoneySpawn(0);
    this.enemySpawnTimer = 0;
    this.landingSafetyTimer = 0;
    this.player.y = this.playerBaseY;
    this.playerVy = 0;
    this.isJumping = false;
    this.jumpPhase = "none";
    this.jumpPhaseTimer = 0;
  }

  private resetIntro() {
    this.enemyUnlocked = false;
    this.tutorialShown = false;
    this.tutorialJumped = false;
    this.introWarningsDodged = 0;
    this.introMoneyCollected = 0;
    this.introWarningGoal = 1 + Math.floor(Math.random() * 2);
    this.introMoneyGoal = 10 + Math.floor(Math.random() * 11);
  }

  private noteWarningDodged() {
    if (this.enemyUnlocked) {
      return;
    }
    this.introWarningsDodged += 1;
    this.checkIntroProgress();
  }

  private noteMoneyCollected(value: number) {
    if (this.enemyUnlocked) {
      return;
    }
    this.introMoneyCollected += value;
    this.checkIntroProgress();
  }

  private checkIntroProgress() {
    if (this.enemyUnlocked) {
      return;
    }
    if (
      this.introWarningsDodged >= this.introWarningGoal &&
      this.introMoneyCollected >= this.introMoneyGoal
    ) {
      this.enemyUnlocked = true;
      this.enemySpawnTimer = RunnerWorld.randomRange(0.6, 1.2);
    }
  }

  private shouldTriggerTutorial(obstacle: Obstacle) {
    if (this.tutorialShown || this.state.phase !== "playing") {
      return false;
    }
    if (obstacle.kind !== "enemy") {
      return false;
    }
    const distance = obstacle.sprite.x - this.player.x;
    const minDistance = 60 * this.layout.unit;
    const maxDistance = 220 * this.layout.unit;
    return distance > minDistance && distance < maxDistance;
  }

  private enterTutorial(obstacle: Obstacle) {
    this.state.phase = "tutorial";
    this.tutorialJumped = false;
    this.tutorialShown = true;
    this.tutorialObstacle = obstacle;
  }

  private exitTutorial() {
    this.state.phase = "playing";
    if (this.tutorialObstacle) {
      this.tutorialObstacle.hit = true;
      this.tutorialObstacle.sprite.x =
        this.player.x - 200 * this.layout.unit;
      this.tutorialObstacle = undefined;
    }
    this.enemySpawnTimer = RunnerWorld.randomRange(1, 5);
    this.warningSpawnTimer = RunnerWorld.randomRange(1.0, 3);
    this.scheduleMoneySpawn(0);
    this.landingSafetyTimer = 1;
    this.tutorialJumped = false;
  }

  private scheduleEnemySpawn() {
    const speedFactor = RunnerWorld.clamp(this.speed / this.maxSpeed, 0, 1);
    const min = 2.8 - speedFactor * 0.4;
    const max = 4.4 - speedFactor * 0.6;
    this.enemySpawnTimer = RunnerWorld.randomRange(min, max) + Math.random() * 0.4;
  }

  private scheduleWarningSpawn() {
    const speedFactor = RunnerWorld.clamp(this.speed / this.maxSpeed, 0, 1);
    const min = 1.6 - speedFactor * 0.25;
    const max = 2.9 - speedFactor * 0.45;
    const gapSeconds = this.speed > 0
      ? (this.landingSafetyDistance + 60 * this.layout.unit) / this.speed
      : min;
    this.warningSpawnTimer = Math.max(RunnerWorld.randomRange(min, max), gapSeconds);
    if (Math.random() < 0.2) {
      this.warningSpawnTimer *= 0.8;
    }
  }

  private scheduleMoneySpawn(extraDelay: number) {
    const speedFactor = RunnerWorld.clamp(this.speed / this.maxSpeed, 0, 1);
    const min = 2.0 - speedFactor * 0.25;
    const max = 3.4 - speedFactor * 0.5;
    this.moneySpawnTimer = RunnerWorld.randomRange(min, max) + extraDelay;
    if (Math.random() < 0.15) {
      this.moneySpawnTimer *= 0.85;
    }
  }

  private pickLane(previousLane: number) {
    const laneCount = this.laneYs.length;
    if (laneCount <= 1) {
      return 0;
    }
    let lane = Math.floor(Math.random() * laneCount);
    if (lane === previousLane) {
      lane = (lane + 1 + Math.floor(Math.random() * (laneCount - 1))) % laneCount;
    }
    return lane;
  }

  private spawnEnemy() {
    const sprite = new PIXI.AnimatedSprite(this.enemyFrames);
    sprite.anchor.set(0.5, 1);
    sprite.animationSpeed = 0.12;
    sprite.autoUpdate = false;
    sprite.play();
    sprite.scale.set(this.enemyScale);
    const lane = this.pickLane(this.lastEnemyLane);
    this.lastEnemyLane = lane;
    sprite.x = this.layout.designWidth + 160;
    sprite.y = this.laneYs[lane];
    this.actorLayer.addChild(sprite);
    this.obstacles.push({
      sprite,
      speed: this.speed * 1.05,
      hit: false,
      lane,
      kind: "enemy",
      animated: true
    });
  }

  private spawnWarning() {
    const sprite = new PIXI.Sprite(this.textures.warning);
    sprite.anchor.set(0.5, 1);
    const lane = this.pickLane(this.lastWarningLane);
    this.lastWarningLane = lane;
    sprite.scale.set(0.8 * this.layout.unit);
    sprite.x = this.layout.designWidth + 120 + Math.random() * 120;
    sprite.y = this.laneYs[lane] + 6 * this.layout.unit;
    this.actorLayer.addChild(sprite);
    this.obstacles.push({
      sprite,
      speed: this.speed,
      hit: false,
      lane,
      kind: "warning",
      animated: false
    });
  }
//#region MoneySpawn
  private spawnMoneyPattern() {
    const useGroup = Math.random() < 0.2;
    if (useGroup) {
      this.spawnMoneyGroup();
      this.scheduleMoneySpawn(0.8);
    } else {
      this.spawnMoneySingle();
      this.scheduleMoneySpawn(0);
    }
  }
//#endregion
  private spawnMoneySingle() {
    const texture = Math.random() < 0.14 ? this.textures.money2 : this.textures.money1;
    const lane = this.pickLane(this.lastMoneyLane);
    this.lastMoneyLane = lane;
    const startX = this.layout.designWidth + 140 + Math.random() * 80;
    const baseY = this.laneYs[lane] - (64 + Math.random() * 44) * this.layout.unit;
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(0.15 * this.layout.unit);
    sprite.x = startX;
    sprite.y = baseY;
    this.actorLayer.addChild(sprite);
    this.pickups.push({
      sprite,
      speed: this.speed,
      value: 5 + Math.floor(Math.random() * 5),
      phase: Math.random() * Math.PI * 2
    });
  }

  private spawnMoneyGroup() {
    const lane = this.pickLane(this.lastMoneyLane);
    this.lastMoneyLane = lane;
    const baseX = this.layout.designWidth + 160 + Math.random() * 60;
    const baseY = this.laneYs[lane] - (110 + Math.random() * 50) * this.layout.unit;
    const scale = 0.15 * this.layout.unit;
    const xStep = 320 * this.layout.unit;
    const yStep = 100 * this.layout.unit;
    const offsets = [
      { x: 0, y: -2 * yStep },
      { x: -xStep * 0.5, y: -yStep },
      { x: xStep * 0.5, y: -yStep },
      { x: -xStep, y: 0 },
      { x: xStep, y: 0 }
    ];
    const money2Count = 1 + Math.floor(Math.random() * 2);
    const money2Slots = RunnerWorld.pickUniqueIndices(offsets.length, money2Count);

    for (let i = 0; i < offsets.length; i += 1) {
      const useMoney2 = money2Slots.includes(i);
      const texture = useMoney2 ? this.textures.money2 : this.textures.money1;
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.scale.set(scale);
      sprite.x = baseX + offsets[i].x;
      sprite.y = baseY + offsets[i].y;
      this.actorLayer.addChild(sprite);
      this.pickups.push({
        sprite,
        speed: this.speed,
        value: 5 + Math.floor(Math.random() * 5),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private spawnFinishLine() {
    this.finishLine = new PIXI.Sprite(this.textures.finishLine);
    this.finishLine.anchor.set(0.5, 1);
    this.finishLine.scale.set(2 * this.layout.unit);
    this.finishLine.x = this.layout.designWidth + 200;
    this.finishLine.y = this.playerBaseY;
    this.finishLayer.addChild(this.finishLine);
  }

  private handleHit(obstacle: Obstacle) {
    obstacle.hit = true;
    this.state.damageTimer = 0.4;
    this.state.lives = Math.max(0, this.state.lives - 1);
    if (this.state.lives === 0) {
      this.triggerFail();
      return true;
    }
    return false;
  }

  private collectMoney(value: number) {
    this.state.money += value;
    this.noteMoneyCollected(value);
    this.state.toastText = "Fantastic!";
    this.state.toastTimer = 0.5;
  }

  private jump() {
    if (this.isJumping) {
      return;
    }
    this.isJumping = true;
    this.playerVy = -920 * this.layout.unit;
    this.jumpPhase = "start";
    this.jumpPhaseTimer = 0;
    this.landingSafetyTimer = 0.85;
    this.warningSpawnTimer = Math.max(
      this.warningSpawnTimer,
      this.landingSafetyTimer + 0.3
    );
    if (this.state.phase === "tutorial") {
      this.tutorialJumped = true;
    }
  }

  private triggerFail() {
    this.state.phase = "fail";
    this.state.failBadgeTimer = 0.9;
    this.state.payAmount = RunnerWorld.randomPayAmount();
    this.clearObstacles();
    this.clearPickups();
    this.finishLine?.destroy({ children: true, texture: false });
    this.finishLine = undefined;
  }

  private triggerSuccess() {
    this.state.phase = "success";
    this.state.payAmount = RunnerWorld.randomPayAmount(500, 200);
    this.startCountdown();
    this.clearObstacles();
    this.clearPickups();
    if (this.finishLine) {
      this.finishLine.removeFromParent();
      this.finishLine.destroy({ children: true, texture: false });
      this.finishLine = undefined;
    }
  }

  private startCountdown() {
    this.state.countdown = 60;
    this.countdownTimer = 1;
  }

  private reset() {
    Object.assign(this.state, createInitialState());
    this.speed = 0;
    this.distance = 0;
    this.enemySpawnTimer = 0;
    this.warningSpawnTimer = 0;
    this.moneySpawnTimer = 0;
    this.resetIntro();
    this.lastEnemyLane = 0;
    this.lastWarningLane = 0;
    this.lastMoneyLane = 0;
    this.clearObstacles();
    this.clearPickups();
    if (this.finishLine) {
      this.finishLine.removeFromParent();
      this.finishLine.destroy({ children: true, texture: false });
      this.finishLine = undefined;
    }
    this.player.y = this.playerBaseY;
    this.playerVy = 0;
    this.isJumping = false;
    this.jumpPhase = "none";
    this.jumpPhaseTimer = 0;
    this.landingSafetyTimer = 0;
    this.damageOverlay.visible = false;
    this.setIdleAnimation();
  }

  private clearObstacles() {
    for (const obstacle of this.obstacles) {
      obstacle.sprite.removeFromParent();
      obstacle.sprite.destroy({ children: true, texture: false });
    }
    this.obstacles = [];
  }

  private clearPickups() {
    for (const pickup of this.pickups) {
      pickup.sprite.removeFromParent();
      pickup.sprite.destroy({ children: true, texture: false });
    }
    this.pickups = [];
  }

  private static sliceSheet(texture: PIXI.Texture, cols: number, rows: number): PIXI.Texture[] {
    const frames: PIXI.Texture[] = [];
    const frameWidth = Math.floor(texture.width / cols);
    const frameHeight = Math.floor(texture.height / rows);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const rect = new PIXI.Rectangle(
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight
        );
        frames.push(new PIXI.Texture({ source: texture.source, frame: rect }));
      }
    }
    return frames;
  }

  private static rectsOverlap(
    a: PIXI.Bounds | PIXI.Rectangle,
    b: PIXI.Bounds | PIXI.Rectangle,
    scale: number
  ) {
    const ax = "minX" in a ? a.minX : a.x;
    const ay = "minY" in a ? a.minY : a.y;
    const aw = a.width;
    const ah = a.height;
    const bx = "minX" in b ? b.minX : b.x;
    const by = "minY" in b ? b.minY : b.y;
    const bw = b.width;
    const bh = b.height;
    const aPadX = aw * (1 - scale) * 0.5;
    const aPadY = ah * (1 - scale) * 0.5;
    const bPadX = bw * (1 - scale) * 0.5;
    const bPadY = bh * (1 - scale) * 0.5;
    const ax1 = ax + aPadX;
    const ay1 = ay + aPadY;
    const ax2 = ax + aw - aPadX;
    const ay2 = ay + ah - aPadY;
    const bx1 = bx + bPadX;
    const by1 = by + bPadY;
    const bx2 = bx + bw - bPadX;
    const by2 = by + bh - bPadY;
    return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
  }

  private static clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private static randomRange(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  private static pickUniqueIndices(max: number, count: number) {
    const indices: number[] = [];
    const pool = Array.from({ length: max }, (_, i) => i);
    for (let i = 0; i < count; i += 1) {
      const pick = Math.floor(Math.random() * pool.length);
      indices.push(pool[pick]);
      pool.splice(pick, 1);
    }
    return indices;
  }

  private static randomPayAmount(base = 200, spread = 120) {
    const amount = base + Math.floor(Math.random() * spread);
    return Math.round(amount);
  }
}
