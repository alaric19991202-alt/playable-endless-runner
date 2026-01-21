import * as PIXI from "pixi.js";
import { loadFont, loadTextures } from "./assets";

export class Game {
  app: PIXI.Application;

  constructor(private mount: HTMLElement, private ctaUrl?: string) {
    this.app = new PIXI.Application();

    window.addEventListener("resize", () => this.resize());
  }

  async start() {
    await this.app.init({
      background: "#f3e1dc",
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    this.mount.appendChild(this.app.canvas);

    await loadFont();
    const textures = await loadTextures();

    this.resize();
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.app.renderer.resize(w, h);
  }
}
