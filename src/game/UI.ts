import * as PIXI from "pixi.js";
import { TextureMap } from "./assets";
import { applyLayout, computeLayout, Layout } from "./layout";
import { GameState, Phase } from "./state";

type PayCard = {
  view: PIXI.Container;
  amountText: PIXI.Text;
  panel: PIXI.Sprite;
  logo: PIXI.Sprite;
  shadow: PIXI.Graphics;
};

type ConfettiPiece = {
  sprite: PIXI.Graphics;
  speed: number;
  drift: number;
  spin: number;
};

type ButtonStyle = {
  color: number;
  shadowColor: number;
  highlightColor: number;
  radius: number;
  shadowOffset: number;
};

type PillButtonStyle = {
  height: number;
  radius: number;
  stops: { color: number; alpha: number; offset: number }[];
  shadowColor: number;
  shadowAlpha: number;
  labelColor: string;
  fontSize: number;
  labelShadow: boolean;
};

export class UI {
  view: PIXI.Container;

  private layout: Layout;
  private textures: TextureMap;
  private state: GameState;
  private onCta?: () => void;

  private hud: PIXI.Container;
  private hearts: PIXI.Graphics[] = [];
  private payPanel: PIXI.Container;
  private payPanelSprite: PIXI.Sprite;
  private payPanelAmount: PIXI.Text;

  private bottomBarPort: PIXI.Sprite;
  private bottomBarLand: PIXI.Sprite;

  private messageText: PIXI.Text;
  private toastText: PIXI.Text;
  private handSprite: PIXI.Sprite;
  private handPulse = 0;
  private messagePulse = 0;

  private failBadge: PIXI.Sprite;

  private downloadButton: PIXI.Container;
  private downloadGlow: PIXI.Graphics;
  private downloadPulse = 0;

  private ctaOverlay: PIXI.Container;
  private ctaTitle: PIXI.Text;
  private ctaSubtitle: PIXI.Text;
  private ctaCountdown: PIXI.Text;
  private ctaCountdownSub: PIXI.Text;
  private ctaButton: PIXI.Container;
  private ctaCard: PayCard;

  private installOverlay: PIXI.Container;
  private installSheet: PIXI.Container;
  private installCard: PIXI.Container;
  private installIcon: PIXI.Sprite;
  private installTitle: PIXI.Text;
  private installSubtitle: PIXI.Text;
  private installClose: PIXI.Container;
  private installConnectButton: PIXI.Container;
  private installGetButton: PIXI.Container;
  private installStoreText: PIXI.Text;
  private installPulse = 0;
  private installReturnPhase?: Phase;
  private installReveal = 0;
  private installRevealTarget = 0;
  private installSheetBaseX = 0;
  private installSheetBaseY = 0;
  private installSheetStartY = 0;
  private installSheetHeight = 0;

  private successOverlay: PIXI.Container;
  private successTitle: PIXI.Text;
  private successSubtitle: PIXI.Text;
  private successCountdown: PIXI.Text;
  private successCountdownSub: PIXI.Text;
  private successButton: PIXI.Container;
  private successCard: PayCard;
  private shine: PIXI.Sprite;
  private confetti: ConfettiPiece[] = [];
  private confettiLayer: PIXI.Container;
  private ctaPulse = 0;

  constructor(state: GameState, textures: TextureMap, onCta?: () => void) {
    this.state = state;
    this.textures = textures;
    this.onCta = onCta;
    this.view = new PIXI.Container();
    this.view.eventMode = "static";
    this.view.interactiveChildren = true;
    this.layout = computeLayout(720, 1280);

    this.hud = new PIXI.Container();
    this.hud.eventMode = "static";
    this.hud.interactiveChildren = true;
    this.view.addChild(this.hud);

    this.payPanel = new PIXI.Container();
    this.payPanelSprite = new PIXI.Sprite(this.textures.paypalBar);
    this.payPanelAmount = UI.outlinedText("$0", 32, "#fdfdff");
    this.payPanel.addChild(this.payPanelSprite);
    this.payPanel.addChild(this.payPanelAmount);

    this.createHearts();
    this.hud.addChild(this.payPanel);

    this.bottomBarPort = new PIXI.Sprite(this.textures.bottomBarPort);
    this.bottomBarLand = new PIXI.Sprite(this.textures.bottomBarLand);
    this.hud.addChild(this.bottomBarPort);
    this.hud.addChild(this.bottomBarLand);

    this.downloadButton = this.createPillButton("DOWNLOAD", {
      height: 46,
      radius: 22,
      shadowColor: 0x7a2a00,
      shadowAlpha: 0.55,
      labelColor: "#ffffff",
      fontSize: 20,
      labelShadow: true,
      stops: [
        { color: 0xffc33c, alpha: 1, offset: 0 },
        { color: 0xffa21b, alpha: 1, offset: 0.45 },
        { color: 0xf06b00, alpha: 1, offset: 1 }
      ]
    });
    this.downloadGlow = new PIXI.Graphics();
    this.downloadGlow.label = "download-glow";
    this.downloadGlow.blendMode = "add";
    this.downloadButton.addChildAt(this.downloadGlow, 0);
    this.downloadButton.eventMode = "static";
    this.downloadButton.cursor = "pointer";
    this.downloadButton.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.showInstallOverlay();
    });
    this.hud.addChild(this.downloadButton);

    this.messageText = UI.outlinedText("Tap to start earning!", 56, "#ffffff");
    this.messageText.style.align = "center";
    this.toastText = UI.outlinedText("Fantastic!", 64, "#ffffff");
    this.handSprite = new PIXI.Sprite(this.textures.tutorHand);
    this.handSprite.anchor.set(0.5, 0);

    this.hud.addChild(this.messageText);
    this.hud.addChild(this.toastText);
    this.hud.addChild(this.handSprite);

    this.failBadge = new PIXI.Sprite(this.textures.failBadge);
    this.failBadge.anchor.set(0.5);
    this.view.addChild(this.failBadge);

    this.ctaOverlay = new PIXI.Container();
    this.ctaOverlay.visible = false;
    this.view.addChild(this.ctaOverlay);

    this.ctaTitle = UI.outlinedText("You didn't make it!", 48, "#ffffff");
    this.ctaSubtitle = UI.outlinedText("Try again on the app!", 28, "#ffffff");
    this.ctaCountdown = UI.outlinedText("00:00", 42, "#ffffff");
    this.ctaCountdownSub = UI.outlinedText("Next payment in one minute", 20, "#ffffff");
    this.ctaCard = this.createPayCard();
    this.ctaButton = this.createButton("INSTALL AND EARN", 0xe54545);
    this.ctaOverlay.addChild(
      this.ctaTitle,
      this.ctaSubtitle,
      this.ctaCountdown,
      this.ctaCountdownSub,
      this.ctaCard.view,
      this.ctaButton
    );

    this.installOverlay = new PIXI.Container();
    this.installOverlay.visible = false;
    this.installOverlay.eventMode = "static";
    this.installOverlay.interactiveChildren = true;
    this.view.addChild(this.installOverlay);
    this.installSheet = new PIXI.Container();
    this.installSheet.eventMode = "static";
    this.installSheet.interactiveChildren = true;
    this.installOverlay.addChild(this.installSheet);

    this.installCard = new PIXI.Container();
    const installBg = new PIXI.Graphics();
    installBg.label = "install-bg";
    this.installCard.addChild(installBg);

    this.installIcon = new PIXI.Sprite(this.textures.payoff);
    this.installIcon.anchor.set(0.5);
    this.installCard.addChild(this.installIcon);

    this.installTitle = UI.outlinedText("Win Real Money Games: Playoff", 28, "#ffffff");
    this.installTitle.style.fontSize = 28;
    this.installTitle.style.fill = "#ffffff";
    this.installTitle.style.stroke = { color: "#000000", width: 0 };
    this.installTitle.style.dropShadow = true;
    this.installTitle.anchor.set(0, 0.5);
    this.installCard.addChild(this.installTitle);

    this.installSubtitle = UI.outlinedText("Gora Games ME FZ LLC", 20, "#b9b9b9");
    this.installSubtitle.style.fontSize = 20;
    this.installSubtitle.style.fill = "#b9b9b9";
    this.installSubtitle.style.stroke = { color: "#000000", width: 0 };
    this.installSubtitle.style.dropShadow = true;
    this.installSubtitle.anchor.set(0, 0.5);
    this.installCard.addChild(this.installSubtitle);

    this.installClose = new PIXI.Container();
    const closeBg = new PIXI.Graphics();
    closeBg.label = "close-bg";
    this.installClose.addChild(closeBg);
    const closeText = UI.outlinedText("X", 22, "#ffffff");
    closeText.style.stroke = { color: "#000000", width: 0 };
    closeText.style.dropShadow = true;
    closeText.anchor.set(0.5);
    this.installClose.addChild(closeText);
    this.installClose.eventMode = "static";
    this.installClose.cursor = "pointer";
    this.installClose.on("pointertap", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.hideInstallOverlay();
    });
    this.installCard.addChild(this.installClose);

    this.installConnectButton = this.createPillButton("Connect with Playbox", {
      height: 52,
      radius: 26,
      shadowColor: 0x4f1b78,
      shadowAlpha: 0.5,
      labelColor: "#ffffff",
      fontSize: 22,
      labelShadow: true,
      stops: [
        { color: 0xffa22e, alpha: 1, offset: 0 },
        { color: 0xff6a9d, alpha: 1, offset: 0.45 },
        { color: 0x8b5bd8, alpha: 1, offset: 1 }
      ]
    });
    this.installConnectButton.eventMode = "static";
    this.installConnectButton.cursor = "pointer";
    this.installConnectButton.on("pointertap", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.triggerCta();
    });

    this.installGetButton = this.createPillButton("GET", {
      height: 44,
      radius: 22,
      shadowColor: 0x124d97,
      shadowAlpha: 0.5,
      labelColor: "#ffffff",
      fontSize: 22,
      labelShadow: false,
      stops: [
        { color: 0x2ea1ff, alpha: 1, offset: 0 },
        { color: 0x1b6bdc, alpha: 1, offset: 1 }
      ]
    });
    this.installGetButton.eventMode = "static";
    this.installGetButton.cursor = "pointer";
    this.installGetButton.on("pointertap", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.triggerCta();
    });

    this.installStoreText = UI.outlinedText("Google Play", 16, "#8a8a8a");
    this.installStoreText.style.fontSize = 16;
    this.installStoreText.style.fill = "#8a8a8a";
    this.installStoreText.style.stroke = { color: "#000000", width: 0 };
    this.installStoreText.style.dropShadow = true;
    this.installStoreText.anchor.set(0.5);

    this.installSheet.addChild(
      this.installCard,
      this.installConnectButton,
      this.installGetButton,
      this.installStoreText
    );

    this.successOverlay = new PIXI.Container();
    this.successOverlay.visible = false;
    this.view.addChild(this.successOverlay);

    this.successTitle = UI.outlinedText("Congratulations!", 48, "#ffffff");
    this.successSubtitle = UI.outlinedText("Choose your reward!", 26, "#ffffff");
    this.successCountdown = UI.outlinedText("00:00", 42, "#ffffff");
    this.successCountdownSub = UI.outlinedText("Next payment in one minute", 20, "#ffffff");
    this.successCard = this.createPayCard();
    this.successButton = this.createPillButton("INSTALL AND EARN", {
      height: 72,
      radius: 36,
      shadowColor: 0x7a4a00,
      shadowAlpha: 0.6,
      labelColor: "#ffffff",
      fontSize: 28,
      labelShadow: true,
      stops: [
        { color: 0xffe27a, alpha: 1, offset: 0 },
        { color: 0xffc348, alpha: 1, offset: 0.5 },
        { color: 0xffa21b, alpha: 1, offset: 1 }
      ]
    });
    this.successButton.eventMode = "static";
    this.successButton.cursor = "pointer";
    this.successButton.on("pointertap", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.triggerCta();
    });
    this.shine = new PIXI.Sprite(this.textures.shine);
    this.shine.anchor.set(0.5);
    this.confettiLayer = new PIXI.Container();
    this.confettiLayer.eventMode = "none";
    this.confettiLayer.interactiveChildren = false;
    this.successOverlay.addChild(
      this.shine,
      this.successCard.view,
      this.successTitle,
      this.successSubtitle,
      this.successCountdown,
      this.successCountdownSub,
      this.successButton,
      this.confettiLayer
    );

    this.createConfetti();
  }

  resize(viewWidth: number, viewHeight: number) {
    this.layout = computeLayout(viewWidth, viewHeight);
    applyLayout(this.view, this.layout);
    this.layoutHud();
    this.layoutOverlays();
    this.layoutInstallOverlay();
    this.resetConfetti();
  }

  update(deltaSeconds: number) {
    this.updateHud(deltaSeconds);
    this.updateOverlays(deltaSeconds);
    this.updateInstallOverlay(deltaSeconds);
  }

  private createHearts() {
    for (let i = 0; i < 3; i += 1) {
      const heart = UI.heartShape(40);
      this.hearts.push(heart);
      this.hud.addChild(heart);
    }
  }

  private layoutHud() {
    const { designWidth, designHeight, unit, isPortrait } = this.layout;
    const padding = 20 * unit;

    const heartSize = 28 * unit;
    for (let i = 0; i < this.hearts.length; i += 1) {
      const heart = this.hearts[i];
      heart.position.set(padding * 4 + i * heartSize * 3.3, padding + heartSize * 1.6);
      heart.scale.set(heartSize / 18);
    }

    const payWidth = designWidth * (isPortrait ? 0.34 : 0.22);
    const payScale = payWidth / this.payPanelSprite.texture.width;
    this.payPanelSprite.scale.set(payScale);
    this.payPanelSprite.position.set(0, 0);
    this.payPanel.pivot.set(this.payPanelSprite.width, 0);
    this.payPanel.position.set(designWidth - padding, padding * 0.5);

    this.payPanelAmount.style.fontSize = Math.round(this.payPanelSprite.height * 0.38);
    this.payPanelAmount.anchor.set(0.5);
    this.payPanelAmount.position.set(
      this.payPanelSprite.width * 0.82,
      this.payPanelSprite.height * 0.55
    );

    const messageSize = Math.round((isPortrait ? 54 : 76) * unit);
    this.messageText.style.fontSize = messageSize;
    this.messageText.style.wordWrap = true;
    this.messageText.style.wordWrapWidth = designWidth * 0.82;
    this.messageText.anchor.set(0.5);
    this.messageText.position.set(
      designWidth * 0.5,
      designHeight * (isPortrait ? 0.44 : 0.38)
    );

    const toastSize = Math.round(60 * unit);
    this.toastText.style.fontSize = toastSize;
    this.toastText.anchor.set(0.5);
    this.toastText.position.set(designWidth * 0.5, designHeight * (isPortrait ? 0.3 : 0.28));

    const handScale = (isPortrait ? 0.1 : 0.2) * unit;
    this.handSprite.scale.set(handScale);
    this.handSprite.position.set(
      designWidth * 0.5,
      designHeight * (isPortrait ? 0.64 : 0.6)
    );

    this.bottomBarPort.visible = isPortrait;
    this.bottomBarLand.visible = !isPortrait;
    if (isPortrait) {
      const barScale = designWidth / this.bottomBarPort.texture.width;
      this.bottomBarPort.scale.set(barScale);
      this.bottomBarPort.anchor.set(0.5, 1);
      this.bottomBarPort.position.set(designWidth * 0.5, designHeight);
    } else {
      const barScale = designWidth / this.bottomBarLand.texture.width;
      this.bottomBarLand.scale.set(barScale);
      this.bottomBarLand.anchor.set(0.5, 1);
      this.bottomBarLand.position.set(designWidth * 0.5, designHeight);
    }

    const barSprite = isPortrait ? this.bottomBarPort : this.bottomBarLand;
    const barWidth = barSprite.width;
    const barHeight = barSprite.height;
    const barLeft = barSprite.position.x - barWidth * barSprite.anchor.x;
    const barTop = barSprite.position.y - barHeight * barSprite.anchor.y;
    const buttonWidth = barWidth * (isPortrait ? 0.24 : 0.15);
    const buttonHeight = barHeight * (isPortrait ? 0.42 : 0.4);
    const buttonX = barLeft + barWidth * (isPortrait ? 0.83 : 0.89);
    const buttonY = barTop + barHeight * 0.6;
    this.downloadButton.position.set(buttonX, buttonY);
    this.layoutDownloadButton(buttonWidth, buttonHeight);

    this.failBadge.scale.set(0.7 * unit);
    this.failBadge.position.set(designWidth * 0.5, designHeight * 0.44);
  }

  private layoutOverlays() {
    const { designWidth, designHeight, unit, isPortrait } = this.layout;

    this.layoutDimBackground(this.ctaOverlay, designWidth, designHeight);
    this.layoutDimBackground(this.successOverlay, designWidth, designHeight, {
      alpha: 0.46,
      spotlight: {
        x: designWidth * 0.5,
        y: designHeight * (isPortrait ? 0.44 : 0.46),
        radius: Math.max(designWidth, designHeight) * 0.48,
        alpha: 0.16
      }
    });

    const ctaCardWidth = designWidth * (isPortrait ? 0.68 : 0.42);
    this.layoutPayCard(this.ctaCard, ctaCardWidth);

    this.ctaTitle.style.fontSize = Math.round((isPortrait ? 48 : 44) * unit);
    this.ctaSubtitle.style.fontSize = Math.round((isPortrait ? 26 : 24) * unit);
    this.ctaCountdown.style.fontSize = Math.round((isPortrait ? 42 : 38) * unit);
    this.ctaCountdownSub.style.fontSize = Math.round((isPortrait ? 20 : 18) * unit);

    this.ctaTitle.anchor.set(0.5);
    this.ctaSubtitle.anchor.set(0.5);
    this.ctaCountdown.anchor.set(0.5);
    this.ctaCountdownSub.anchor.set(0.5);

    const titleY = designHeight * (isPortrait ? 0.15 : 0.18);
    const subtitleY = designHeight * (isPortrait ? 0.21 : 0.24);
    const cardY = designHeight * (isPortrait ? 0.37 : 0.39);
    const countdownY = designHeight * (isPortrait ? 0.55 : 0.58);
    const countdownSubY = designHeight * (isPortrait ? 0.6 : 0.63);
    const buttonY = designHeight * (isPortrait ? 0.73 : 0.75);

    this.ctaTitle.position.set(designWidth * 0.5, titleY);
    this.ctaSubtitle.position.set(designWidth * 0.5, subtitleY);
    this.ctaCard.view.position.set(designWidth * 0.5, cardY);
    this.ctaCountdown.position.set(designWidth * 0.5, countdownY);
    this.ctaCountdownSub.position.set(designWidth * 0.5, countdownSubY);
    this.ctaButton.position.set(designWidth * 0.5, buttonY);

    const buttonWidth = designWidth * (isPortrait ? 0.72 : 0.5);
    const buttonHeight = 78 * unit;
    this.layoutButton(this.ctaButton, buttonWidth, buttonHeight);

    const successTitleY = designHeight * (isPortrait ? 0.17 : 0.22);
    const successSubtitleY = designHeight * (isPortrait ? 0.23 : 0.27);
    const successCardY = designHeight * (isPortrait ? 0.36 : 0.45);
    const successCountdownY = designHeight * (isPortrait ? 0.56 : 0.64);
    const successCountdownSubY = designHeight * (isPortrait ? 0.61 : 0.69);
    const successButtonY = designHeight * (isPortrait ? 0.72 : 0.78);
    const successCardWidth = designWidth * (isPortrait ? 0.78 : 0.24);

    this.layoutPayCard(this.successCard, successCardWidth);

    this.successTitle.style.fontSize = Math.round((isPortrait ? 46 : 44) * unit);
    this.successSubtitle.style.fontSize = Math.round((isPortrait ? 26 : 22) * unit);
    this.successCountdown.style.fontSize = Math.round((isPortrait ? 40 : 30) * unit);
    this.successCountdownSub.style.fontSize = Math.round((isPortrait ? 18 : 14) * unit);

    this.successTitle.anchor.set(0.5);
    this.successSubtitle.anchor.set(0.5);
    this.successCountdown.anchor.set(0.5);
    this.successCountdownSub.anchor.set(0.5);

    this.successTitle.position.set(designWidth * 0.5, successTitleY);
    this.successSubtitle.position.set(designWidth * 0.5, successSubtitleY);
    this.successCard.view.position.set(designWidth * 0.5, successCardY);
    this.successCountdown.position.set(designWidth * 0.5, successCountdownY);
    this.successCountdownSub.position.set(designWidth * 0.5, successCountdownSubY);
    this.successButton.position.set(designWidth * 0.5, successButtonY);

    const shineScale = (successCardWidth * 1.2) / this.shine.texture.width;
    this.shine.scale.set(shineScale);
    this.shine.position.set(designWidth * 0.5, successCardY);

    const successButtonWidth = isPortrait ? designWidth * 0.74 : successCardWidth * 1.05;
    const successButtonHeight = (isPortrait ? 70 : 86) * unit;
    this.layoutPillButton(this.successButton, successButtonWidth, successButtonHeight);

  }

  private layoutDimBackground(
    container: PIXI.Container,
    width: number,
    height: number,
    options?: {
      alpha?: number;
      spotlight?: { x: number; y: number; radius: number; alpha: number };
    }
  ) {
    let dim = container.getChildByLabel("dim") as PIXI.Graphics;
    if (!dim) {
      dim = new PIXI.Graphics();
      dim.label = "dim";
      container.addChildAt(dim, 0);
    }
    const alpha = options?.alpha ?? 0.55;
    dim
      .clear()
      .rect(0, 0, width, height)
      .fill({ color: 0x000000, alpha });

    let spotlight = container.getChildByLabel("spotlight") as PIXI.Graphics;
    if (!spotlight) {
      spotlight = new PIXI.Graphics();
      spotlight.label = "spotlight";
      container.addChildAt(spotlight, 1);
    }
    const spotlightSettings = options?.spotlight;
    const radius = spotlightSettings?.radius ?? Math.max(width, height) * 0.35;
    const spotlightX = spotlightSettings?.x ?? width * 0.5;
    const spotlightY = spotlightSettings?.y ?? height * 0.38;
    const spotlightAlpha = spotlightSettings?.alpha ?? 0.08;
    spotlight
      .clear()
      .circle(spotlightX, spotlightY, radius)
      .fill({ color: 0xffffff, alpha: spotlightAlpha });
  }

  private updateHud(deltaSeconds: number) {
    const phase = this.state.phase;
    const activeMessage = phase === "start" || phase === "tutorial";
    const showBar = phase === "start" || phase === "tutorial" || phase === "playing";
    this.messageText.visible = activeMessage;
    const startMessage = this.layout.isPortrait
      ? "Tap to start\nearning!"
      : "Tap to start earning!";
    this.messageText.text = phase === "tutorial" ? "Jump to avoid\nenemies" : startMessage;

    if (activeMessage) {
      this.messagePulse += deltaSeconds;
      const pulse = 1 + Math.sin(this.messagePulse * 3) * 0.03;
      this.messageText.scale.set(pulse);
      this.messageText.alpha = 0.9 + Math.sin(this.messagePulse * 2.2) * 0.08;
    } else {
      this.messagePulse = 0;
      this.messageText.scale.set(1);
      this.messageText.alpha = 1;
    }

    this.bottomBarPort.visible = showBar && this.layout.isPortrait;
    this.bottomBarLand.visible = showBar && !this.layout.isPortrait;
    this.downloadButton.visible = showBar;

    this.handSprite.visible = activeMessage;
    this.handPulse += deltaSeconds;
    const { designWidth, designHeight, isPortrait } = this.layout;
    const handX = phase === "tutorial" ? designWidth * 0.56 : designWidth * 0.5;
    const baseY = designHeight * (isPortrait ? 0.64 : 0.6);
    this.handSprite.position.set(
      handX,
      baseY + Math.sin(this.handPulse * 4) * 6
    );

    this.toastText.visible = this.state.toastTimer > 0;
    if (this.toastText.visible) {
      const fade = Math.min(1, this.state.toastTimer / 0.2);
      this.toastText.alpha = fade * 0.85;
      this.toastText.scale.set(1 + (1 - fade) * 0.12);
      this.toastText.text = this.state.toastText;
    }

    for (let i = 0; i < this.hearts.length; i += 1) {
      this.hearts[i].alpha = i < this.state.lives ? 1 : 0.2;
    }

    this.payPanelAmount.text = `$${this.state.money}`;

    if (showBar) {
      this.downloadPulse += deltaSeconds;
      const glow = 0.12 + Math.sin(this.downloadPulse * 3) * 0.08;
      const scale = 1 + Math.sin(this.downloadPulse * 3) * 0.03;
      this.downloadGlow.alpha = glow;
      this.downloadButton.scale.set(scale);
    } else {
      this.downloadButton.scale.set(1);
    }

    if (this.state.failBadgeTimer > 0) {
      const pulse = 1 + Math.sin(this.state.failBadgeTimer * 10) * 0.05;
      this.failBadge.visible = true;
      this.failBadge.scale.set(pulse * this.layout.unit * 0.7);
    } else {
      this.failBadge.visible = false;
    }
  }

  private updateOverlays(deltaSeconds: number) {
    const phase = this.state.phase;
    this.ctaOverlay.visible = phase === "cta";
    this.successOverlay.visible = phase === "success";
    if (phase === "ctaPanel") {
      this.ctaOverlay.visible = false;
      this.successOverlay.visible = false;
    }

    if (this.ctaOverlay.visible || this.successOverlay.visible) {
      this.ctaPulse += deltaSeconds;
      const pulse = 1 + Math.sin(this.ctaPulse * 4) * 0.03;
      if (this.ctaOverlay.visible) {
        this.ctaButton.scale.set(pulse);
      }
      if (this.successOverlay.visible) {
        this.successButton.scale.set(pulse);
      }
    } else {
      this.ctaPulse = 0;
      this.ctaButton.scale.set(1);
      this.successButton.scale.set(1);
    }

    if (this.ctaOverlay.visible) {
      this.ctaCard.amountText.text = `$${this.state.payAmount}.00`;
      this.ctaCountdown.text = UI.formatCountdown(this.state.countdown);
    }

    if (this.successOverlay.visible) {
      this.successCard.amountText.text = `$${this.state.payAmount}.00`;
      this.successCountdown.text = UI.formatCountdown(this.state.countdown);
      this.updateConfetti(deltaSeconds);
      this.shine.rotation += deltaSeconds * 0.4;
    }
  }

  private updateInstallOverlay(deltaSeconds: number) {
    if (this.state.phase !== "ctaPanel" && this.installRevealTarget !== 0) {
      this.installRevealTarget = 0;
    }
    if (!this.installOverlay.visible && this.installRevealTarget === 0) {
      this.installPulse = 0;
      this.installConnectButton.scale.set(1);
      this.installGetButton.scale.set(1);
      return;
    }
    if (!this.installOverlay.visible) {
      this.installOverlay.visible = true;
    }
    if (this.installReveal !== this.installRevealTarget) {
      const direction = this.installRevealTarget > this.installReveal ? 1 : -1;
      this.installReveal = Math.max(
        0,
        Math.min(1, this.installReveal + direction * deltaSeconds * 3.4)
      );
      this.applyInstallReveal();
      if (this.installReveal === 0 && this.installRevealTarget === 0) {
        this.installOverlay.visible = false;
        if (this.state.phase === "ctaPanel") {
          this.state.phase = this.installReturnPhase ?? "start";
          this.installReturnPhase = undefined;
        }
      }
    }
    this.installPulse += deltaSeconds;
    const pulse = 0.4 + Math.sin(this.installPulse * 2.4) * 0.02;
    this.installConnectButton.scale.set(pulse);
    const getPulse = 1 + Math.sin(this.installPulse * 3.6 + 0.8) * 0.02;
    this.installGetButton.scale.set(getPulse);
  }

  private layoutInstallOverlay() {
    const { designWidth, designHeight, unit, isPortrait } = this.layout;

    this.layoutDimBackground(this.installOverlay, designWidth, designHeight, {
      alpha: 0.6,
      spotlight: {
        x: designWidth * 0.5,
        y: designHeight * 0.6,
        radius: Math.max(designWidth, designHeight) * 0.5,
        alpha: 0.08
      }
    });

    const cardWidth = designWidth;
    const cardHeight = designHeight * (isPortrait ? 0.33 : 0.39);
    const cardTop = isPortrait
      ? designHeight - cardHeight
      : designHeight * 0.64;
    const cardLeft = (designWidth - cardWidth) * 0.5;
    this.installSheetHeight = cardHeight;
    this.installSheetBaseX = cardLeft;
    this.installSheetBaseY = cardTop;
    this.installSheetStartY = designHeight + cardHeight * 0.08;
    this.installSheet.position.set(cardLeft, cardTop);

    const bg = this.installCard.getChildByLabel("install-bg") as PIXI.Graphics;
    bg
      .clear()
      .roundRect(0, 0, cardWidth, cardHeight, 26 * unit)
      .fill({ color: 0x1c1c1e, alpha: 0.92 });

    this.installCard.position.set(0, 0);

    const iconSize = cardHeight * 0.24;
    this.installIcon.scale.set(iconSize / this.installIcon.texture.width);
    this.installIcon.position.set(
      cardWidth * (isPortrait ? 0.12 : 0.06),
      cardHeight * 0.33
    );

    const textX = cardWidth * (isPortrait ? 0.22 : 0.14);
    this.installTitle.style.fontSize = Math.round((isPortrait ? 24 : 26) * unit);
    this.installSubtitle.style.fontSize = Math.round((isPortrait ? 18 : 20) * unit);
    this.installTitle.position.set(textX, cardHeight * 0.24);
    this.installSubtitle.position.set(textX, cardHeight * 0.34);

    const closeSize = cardHeight * 0.16;
    this.installClose.position.set(cardWidth * 0.95, cardHeight * 0.2);
    const closeBg = this.installClose.getChildByLabel("close-bg") as PIXI.Graphics;
    closeBg
      .clear()
      .circle(0, 0, closeSize * 0.5)
      .fill({ color: 0x3a3a3c, alpha: 0.8 });
    const closeText = this.installClose.children[1] as PIXI.Text;
    closeText.style.fontSize = Math.round(25 * unit);

    const connectWidth = cardWidth * 1.7;
    const connectHeight = cardHeight * 0.44;
    this.layoutPillButton(this.installConnectButton, connectWidth, connectHeight);
    this.installConnectButton.position.set(
      cardWidth * 0.5,
      cardHeight * 0.58
    );

    const getWidth = cardWidth * 0.56;
    const getHeight = cardHeight * 0.13;
    this.layoutPillButton(this.installGetButton, getWidth, getHeight);
    this.installGetButton.position.set(
      cardWidth * 0.5,
      cardHeight * 0.79
    );

    this.installStoreText.style.fontSize = Math.round(16 * unit);
    this.installStoreText.position.set(cardWidth * 0.5, cardHeight * 0.9);
    this.applyInstallReveal();
  }

  private showInstallOverlay() {
    if (!this.installOverlay.visible) {
      this.installReturnPhase = this.state.phase;
    }
    this.installOverlay.visible = true;
    this.installReveal = 0;
    this.installRevealTarget = 1;
    this.applyInstallReveal();
    this.state.phase = "ctaPanel";
  }

  private hideInstallOverlay() {
    this.installRevealTarget = 0;
  }

  private applyInstallReveal() {
    const progress = Math.max(0, Math.min(1, this.installReveal));
    const eased = UI.easeOutBack(progress);
    const scaleX = 0.96 + 0.04 * eased;
    const scaleY = 0.7 + 0.3 * eased;
    const baseY = this.installSheetBaseY;
    const startY = this.installSheetStartY;
    const slideY = startY + (baseY - startY) * eased;
    const adjustedY = slideY + (1 - scaleY) * this.installSheetHeight;
    this.installSheet.position.set(this.installSheetBaseX, adjustedY);
    this.installSheet.scale.set(scaleX, scaleY);
    this.installSheet.alpha = Math.min(1, 0.6 + 0.4 * eased);
  }

  private createPayCard(): PayCard {
    const view = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    shadow.label = "shadow";
    view.addChild(shadow);
    const panel = new PIXI.Sprite(this.textures.moneyPanel);
    panel.anchor.set(0.5);
    view.addChild(panel);

    const logo = new PIXI.Sprite(this.textures.paypalBar);
    logo.anchor.set(0.5);
    view.addChild(logo);

    const amountText = UI.outlinedText("$0.00", 46, "#ffffff");
    amountText.anchor.set(0.4);
    view.addChild(amountText);

    return {
      view,
      amountText,
      panel,
      logo,
      shadow
    };
  }

  private layoutPayCard(card: PayCard, width: number) {
    const scale = width / card.panel.texture.width;
    card.panel.scale.set(scale);
    card.panel.position.set(0, 0);
    card.view.pivot.set(0, 0);
    card.view.scale.set(0.7);
    card.view.position.set(0, 0);

    const radius = card.panel.height * 0.08;

    const logoScale = (card.panel.width * 0.6) / card.logo.texture.width;
    card.logo.scale.set(0);
    card.logo.position.set(0, -card.panel.height * 0.18);

    const amountOffset = this.layout.isPortrait ? -0.1 : -0.05;
    card.amountText.style.fontSize = Math.round(card.panel.height * 0.22);
    card.amountText.position.set(23, card.panel.height * amountOffset);
  }

  private createButton(label: string, color: number) {
    const container = new PIXI.Container() as PIXI.Container & { buttonStyle: ButtonStyle };
    container.buttonStyle = {
      color,
      shadowColor: UI.adjustColor(color, -0.35),
      highlightColor: UI.adjustColor(color, 0.18),
      radius: 0,
      shadowOffset: 0
    };
    const shadow = new PIXI.Graphics();
    shadow.label = "shadow";
    container.addChild(shadow);
    const background = new PIXI.Graphics();
    background.label = "background";
    container.addChild(background);
    const highlight = new PIXI.Graphics();
    highlight.label = "highlight";
    container.addChild(highlight);

    const text = UI.outlinedText(label, 28, "#ffffff");
    text.anchor.set(0.5);
    container.addChild(text);

    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.triggerCta();
    });
    return container;
  }

  private layoutButton(container: PIXI.Container, width: number, height: number) {
    const style = (container as PIXI.Container & { buttonStyle?: ButtonStyle }).buttonStyle;
    const color = style?.color ?? 0xff0000;
    const radius = style?.radius && style.radius > 0 ? style.radius : height * 0.45;
    const shadowOffset = style?.shadowOffset && style.shadowOffset > 0
      ? style.shadowOffset
      : height * 0.12;
    const shadowColor = style?.shadowColor ?? UI.adjustColor(color, -0.35);
    const highlightColor = style?.highlightColor ?? UI.adjustColor(color, 0.18);
    const shadow = container.getChildByLabel("shadow") as PIXI.Graphics;
    const background = container.getChildByLabel("background") as PIXI.Graphics;
    const highlight = container.getChildByLabel("highlight") as PIXI.Graphics;
    shadow
      .clear()
      .roundRect(-width * 0.5, -height * 0.5 + shadowOffset, width, height, radius)
      .fill({ color: shadowColor, alpha: 0.9 });
    background
      .clear()
      .roundRect(-width * 0.5, -height * 0.5, width, height, radius)
      .fill({ color });
    highlight
      .clear()
      .roundRect(
        -width * 0.48,
        -height * 0.5 + height * 0.06,
        width * 0.96,
        height * 0.38,
        radius * 0.85
      )
      .fill({ color: highlightColor, alpha: 0.35 });

    const text = container.children[3] as PIXI.Text;
    text.style.fontSize = Math.round(height * 0.36);
    text.style.letterSpacing = Math.max(0, Math.round(height * 0.02));
    text.position.set(0, -height * 0.02);
  }

  private layoutDownloadButton(width: number, height: number) {
    this.downloadButton.scale.set(1);
    this.layoutPillButton(this.downloadButton, width, height);
    this.downloadButton.hitArea = new PIXI.Rectangle(
      -width * 0.5,
      -height * 0.5,
      width,
      height
    );
    this.downloadGlow
      .clear()
      .roundRect(
        -width * 0.55,
        -height * 0.55,
        width * 1.1,
        height * 1.1,
        height * 0.6
      )
      .fill({ color: 0xfff3bf, alpha: 0.28 });
  }

  private triggerCta() {
    if (this.onCta) {
      this.onCta();
    }
  }

  private createPillButton(label: string, style: PillButtonStyle) {
    const container = new PIXI.Container() as PIXI.Container & { pillStyle: PillButtonStyle };
    container.pillStyle = style;
    const shadow = new PIXI.Graphics();
    shadow.label = "pill-shadow";
    container.addChild(shadow);
    const background = new PIXI.Graphics();
    background.label = "pill-bg";
    container.addChild(background);
    const labelText = new PIXI.Text({
      text: label,
      style: new PIXI.TextStyle({
        fontFamily: "PlayFont, Arial Black, Arial",
        fontSize: style.fontSize,
        fill: style.labelColor,
        stroke: style.labelShadow
          ? {
            color: "#000000",
            width: Math.max(2, Math.round(style.fontSize / 10)),
            join: "round"
          }
          : undefined,
        dropShadow: style.labelShadow
          ? {
            color: "#000000",
            distance: 3,
            blur: 0,
            angle: Math.PI / 2,
            alpha: 0.6
          }
          : undefined
      })
    });
    labelText.anchor.set(0.5);
    labelText.label = "pill-label";
    container.addChild(labelText);
    return container;
  }

  private layoutPillButton(container: PIXI.Container, width: number, height: number) {
    const style = (container as PIXI.Container & { pillStyle?: PillButtonStyle }).pillStyle;
    if (!style) {
      return;
    }
    const shadow = container.getChildByLabel("pill-shadow") as PIXI.Graphics;
    const background = container.getChildByLabel("pill-bg") as PIXI.Graphics;
    const labelText = container.getChildByLabel("pill-label") as PIXI.Text;
    shadow
      .clear()
      .roundRect(
        -width * 0.5,
        -height * 0.5 + height * 0.1,
        width,
        height,
        height * 0.5
      )
      .fill({ color: style.shadowColor, alpha: style.shadowAlpha });

    const gradient = new PIXI.FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      textureSpace: "local",
      colorStops: style.stops.map((stop) => ({
        offset: stop.offset,
        color: UI.colorToCss(stop.color, stop.alpha)
      }))
    });

    background
      .clear()
      .roundRect(-width * 0.5, -height * 0.5, width, height, height * 0.5)
      .fill(gradient);

    const baseHeight = style.height || height;
    const fontScale = height / baseHeight;
    labelText.style.fontSize = Math.round(style.fontSize * fontScale);
    labelText.style.letterSpacing = Math.max(0, Math.round(labelText.style.fontSize * 0.08));
    labelText.position.set(0, -height * 0.04);
  }

  private createConfetti() {
    const colors = [0xffc857, 0xff6f91, 0x7ed957, 0x5ab1ff, 0xfff0a5];
    for (let i = 0; i < 60; i += 1) {
      const piece = new PIXI.Graphics();
      piece.rect(-3, -6, 6, 12).fill({ color: colors[i % colors.length] });
      this.confettiLayer.addChild(piece);
      this.confetti.push({
        sprite: piece,
        speed: 0,
        drift: 0,
        spin: 0
      });
    }
    this.resetConfetti();
  }

  private resetConfetti() {
    const { designWidth, designHeight, unit } = this.layout;
    for (const piece of this.confetti) {
      piece.sprite.scale.set(unit);
      piece.sprite.x = Math.random() * designWidth;
      piece.sprite.y = -Math.random() * designHeight;
      piece.speed = (60 + Math.random() * 80) * unit;
      piece.drift = (-30 + Math.random() * 60) * unit;
      piece.spin = -4 + Math.random() * 8;
    }
  }

  private updateConfetti(deltaSeconds: number) {
    const { designWidth, designHeight } = this.layout;
    for (const piece of this.confetti) {
      piece.sprite.y += piece.speed * deltaSeconds;
      piece.sprite.x += piece.drift * deltaSeconds;
      piece.sprite.rotation += piece.spin * deltaSeconds;
      if (piece.sprite.y > designHeight + 40) {
        piece.sprite.y = -40 - Math.random() * 200;
        piece.sprite.x = Math.random() * designWidth;
      }
      if (piece.sprite.x < -40) {
        piece.sprite.x = designWidth + 40;
      } else if (piece.sprite.x > designWidth + 40) {
        piece.sprite.x = -40;
      }
    }
  }

  private static adjustColor(color: number, amount: number) {
    const clamped = Math.max(-1, Math.min(1, amount));
    const target = clamped < 0 ? 0 : 255;
    const mix = Math.abs(clamped);
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const nr = Math.round(r + (target - r) * mix);
    const ng = Math.round(g + (target - g) * mix);
    const nb = Math.round(b + (target - b) * mix);
    return (nr << 16) | (ng << 8) | nb;
  }

  private static easeOutBack(t: number) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private static colorToCss(color: number, alpha = 1) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    if (alpha >= 0.999) {
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
        .toString(16)
        .padStart(2, "0")}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static heartShape(size: number) {
    const heart = new PIXI.Graphics();
    const top = size * 0.25;
    const radius = size * 0.25;
    heart.circle(-radius, top, radius);
    heart.circle(radius, top, radius);
    heart.poly([
      -radius * 2, top,
      0, size * 0.9,
      radius * 2, top
    ]);
    heart.fill({ color: 0xff4d5a });
    return heart;
  }

  private static outlinedText(text: string, size: number, fill: string) {
    const strokeWidth = Math.max(2, Math.round(size / 8));
    const shadowDistance = Math.max(2, Math.round(size / 14));
    return new PIXI.Text({
      text,
      style: new PIXI.TextStyle({
        fontFamily: "PlayFont, Arial Black, Arial",
        fontSize: size,
        fill,
        stroke: {
          color: "#000000",
          width: strokeWidth,
          join: "round"
        },
        dropShadow: {
          color: "#000000",
          distance: shadowDistance,
          blur: 0,
          angle: Math.PI / 2,
          alpha: 0.9
        }
      })
    });
  }

  private static formatCountdown(seconds: number) {
    const clamped = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(clamped / 60);
    const secs = clamped % 60;
    const pad = secs < 10 ? `0${secs}` : `${secs}`;
    return `0${mins}:${pad}`;
  }
}
