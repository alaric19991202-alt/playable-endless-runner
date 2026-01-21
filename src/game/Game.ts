import { loadFont, loadTextures } from "./assets";
import { Input } from "./Input";
import { RunnerWorld } from "./RunnerWorld";
import { UI } from "./UI";  

export class Game {
  app: PIXI.Application;
  input: Input;
  world!: RunnerWorld;
  ui!: UI;
  private ctaUrl?: string;

  constructor(private mount: HTMLElement) {
    this.app = new PIXI.Application();
    this.input = new Input();

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
    this.world = new RunnerWorld(textures);
    this.ctaUrl = this.resolveCtaUrl();
    this.ui = new UI(this.world.state, textures, () => this.handleCta());

    this.app.stage.addChild(this.world.view);
    this.app.stage.addChild(this.ui.view);

    this.input.attach(this.app.canvas, {
      onJump: () => this.world.jumpOrRestart()
    });

    this.resize();

    this.app.ticker.add((t) => {
      const deltaSeconds = t.deltaMS / 1000;
      this.input.update(deltaSeconds);
      this.world.update(t);
      this.input.setBlocked(
        this.world.state.phase === "cta" ||
        this.world.state.phase === "success" ||
        this.world.state.phase === "fail" ||
        this.world.state.phase === "ctaPanel"
      );
      this.ui.update(deltaSeconds);
    });
  }
  private handleCta() {
    const url = this.ctaUrl ?? this.resolveCtaUrl();
    if (!url) {
      console.warn("CTA URL not set.");
      return;
    }
    const win = window as Window & {
      mraid?: { open?: (target: string) => void };
      ExitApi?: { exit?: (target: string) => void };
    };
    if (win.mraid?.open) {
      win.mraid.open(url);
      return;
    }
    if (win.ExitApi?.exit) {
      win.ExitApi.exit(url);
      return;
    }
    const opened = window.open(url, "_blank");
    if (!opened) {
      window.location.href = url;
    }
  }
   private resolveCtaUrl() {
    const win = window as Window & {
      clickTag?: string;
      clickTag1?: string;
      CTA_URL?: string;
    };
    const url = win.clickTag || win.clickTag1 || win.CTA_URL || document.body.dataset.ctaUrl;
    if (!url) {
      return undefined;
    }
    const trimmed = url.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.app.renderer.resize(w, h);
  }
}
