import * as PIXI from "pixi.js";
import { TextureMap } from "./assets";
import { applyLayout, computeLayout, Layout } from "./layout";
import { createInitialState, GameState } from "./state";

type PlayerAnimState = "idle" | "run" | "jump" | "damage";

export class RunnerWorld {
  view: PIXI.Container;
  state: GameState;

  private layout: Layout;
  private textures: TextureMap;

  private playerIdleFrames: PIXI.Texture[];
  private playerRunFrames: PIXI.Texture[];
  private playerJumpFrames: PIXI.Texture[];
  private playerDamageFrames: PIXI.Texture[];
  private player: PIXI.AnimatedSprite;

  private speed = 0;
  private baseSpeed = 0;
  private maxSpeed = 0;
  private accel = 0;
  private distance = 0;

  private playerAnimState: PlayerAnimState = "idle";

  constructor(textures: TextureMap) {
    this.textures = textures;
    this.view = new PIXI.Container();
    this.state = createInitialState();
    this.layout = computeLayout(720, 1280);

    // build animation frame lists
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

    // create AnimatedSprite--------------------------------------------------------
    this.player = new PIXI.AnimatedSprite(this.playerIdleFrames);
    this.player.anchor.set(1, 2);
    this.player.animationSpeed = 1;
    this.player.autoUpdate = false;
    this.player.loop = true;
    this.player.play();
    this.view.addChild(this.player);
  }

  resize(viewWidth: number, viewHeight: number) {
    this.layout = computeLayout(viewWidth, viewHeight);
    applyLayout(this.view, this.layout);
    this.player.position.set(this.layout.designWidth * 1, this.layout.designHeight * 3);
  }

  update(ticker: PIXI.Ticker) {
    this.player.update(ticker);
  }

  jumpOrRestart() {}

  moveLane(_delta: number) {}
}
