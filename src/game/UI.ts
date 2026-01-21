import * as PIXI from "pixi.js";
import { TextureMap } from "./assets";
import { applyLayout, computeLayout, Layout } from "./layout";
import { GameState } from "./state";

export class UI {
  view: PIXI.Container;
  private layout: Layout;
  private state: GameState;

  private label: PIXI.Text;

  constructor(state: GameState, _textures: TextureMap) {
    this.state = state;
    this.view = new PIXI.Container();
    this.layout = computeLayout(720, 1280);

    this.label = new PIXI.Text({
      text: "Tap to start",
      style: new PIXI.TextStyle({
        fontFamily: "PlayFont, Arial Black, Arial",
        fontSize: 48,
        fill: "#ffffff",
        stroke: { color: "#000000", width: 4 }
      })
    });

    this.label.anchor.set(0.5);
    this.view.addChild(this.label);
  }

  resize(viewWidth: number, viewHeight: number) {
    this.layout = computeLayout(viewWidth, viewHeight);
    applyLayout(this.view, this.layout);
    this.label.position.set(this.layout.designWidth * 0.5, this.layout.designHeight * 0.3);
  }

  update(_deltaSeconds: number) {
    this.label.text = this.state.phase === "start" ? "Tap to start" : "";
  }
}
