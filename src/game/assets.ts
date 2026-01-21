import * as PIXI from "pixi.js";

export const assetUrls = {

  actor:        "assets/Assets/actor1.png",
  playerIdle0:  "assets/Assets/player1/idle0.png",
  playerIdle1:  "assets/Assets/player1/idle1.png",
  playerRun0:   "assets/Assets/player1/run0.png",
  playerRun1:   "assets/Assets/player1/run1.png",
  playerRun2:   "assets/Assets/player1/run2.png",
  playerRun3:   "assets/Assets/player1/run3.png",
  playerRun4:   "assets/Assets/player1/run4.png",
  playerRun5:   "assets/Assets/player1/run5.png",
  playerJump0:  "assets/Assets/player1/jump0.png",
  playerJump1:  "assets/Assets/player1/jump1.png",
  playerJump2:  "assets/Assets/player1/jump2.png",
  playerDamage: "assets/Assets/player1/damage.png",
  enemy0:       "assets/Assets/enemy1/enemy0.png",
  enemy1:       "assets/Assets/enemy1/enemy1.png",
  enemy2:       "assets/Assets/enemy1/enemy2.png",
  enemy3:       "assets/Assets/enemy1/enemy3.png",
  enemy4:       "assets/Assets/enemy1/enemy4.png",
  enemy5:       "assets/Assets/enemy1/enemy5.png",
  enemy6:       "assets/Assets/enemy1/enemy6.png",
  enemy7:       "assets/Assets/enemy1/enemy7.png",
  enemy8:       "assets/Assets/enemy1/enemy8.png",
  enemy9:       "assets/Assets/enemy1/enemy9.png",
  road:         "assets/Assets/road.png",
  trees1:         "assets/Assets/streetTrees.png",
  trees2:        "assets/Assets/streetTrees2.png",
  streetlight:  "assets/Assets/streetlight.png",
  bottomBarPort:"assets/Assets/bottomBar_port.png",
  bottomBarLand:"assets/Assets/bottomBar_land.webp",
  paypalBar:    "assets/Assets/paypal.png",
  moneyPanel:   "assets/Assets/moneyPanel.png",
  money1:       "assets/Assets/money1.png",
  money2:       "assets/Assets/money2.png",
  failBadge:    "assets/Assets/fail.png",
  finishLine:   "assets/Assets/chekeredFinishLine.png",
  shine:        "assets/Assets/finalshine.png",
  tutorHand:    "assets/Assets/tutorHand.png",
  payoff:       "assets/Assets/payoff.png",
  warning:      "assets/Assets/warring.png",
  damage:       "assets/Assets/damage.webp"
} as const;

export type AssetKey = keyof typeof assetUrls;
export type TextureMap = Record<AssetKey, PIXI.Texture>;
//#region Asset Loading
export async function loadTextures(): Promise<TextureMap> {
  const embedded = typeof window !== "undefined"
    ? (window as Window & { __EMBEDDED_ASSETS__?: Partial<Record<AssetKey, string>> })
      .__EMBEDDED_ASSETS__
    : undefined;
  const sources = {} as Record<AssetKey, string>;
  for (const [key, url] of Object.entries(assetUrls)) {
    sources[key as AssetKey] = embedded?.[key as AssetKey] ?? url;
  }
  await PIXI.Assets.load(Object.values(sources));
  const textures = {} as TextureMap;
  for (const [key, src] of Object.entries(sources)) {
    textures[key as AssetKey] = PIXI.Assets.get(src) as PIXI.Texture;
  }
  return textures;
}

export async function loadFont(): Promise<void> {
  const embeddedFont = typeof window !== "undefined"
    ? (window as Window & { __EMBEDDED_FONT__?: string }).__EMBEDDED_FONT__
    : undefined;
  const fontSrc = embeddedFont ? `url(${embeddedFont})` : "url(assets/Assets/Font.ttf)";
  const font = new FontFace("PlayFont", fontSrc, {
    display: "swap"
  });
  await font.load();
  document.fonts.add(font);
}

declare global {
  interface Window {
    __EMBEDDED_ASSETS__?: Partial<Record<AssetKey, string>>;
    __EMBEDDED_FONT__?: string;
  }
}