import * as PIXI from "pixi.js";

export interface Layout {
  viewWidth: number;
  viewHeight: number;
  designWidth: number;
  designHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  isPortrait: boolean;
  unit: number;
}

export function computeLayout(viewWidth: number, viewHeight: number): Layout {
  const isPortrait = viewHeight >= viewWidth;
  const designWidth = viewWidth;
  const designHeight = viewHeight;
  const scale = Math.min(viewWidth / designWidth, viewHeight / designHeight);
  const offsetX = (viewWidth - designWidth * scale) / 2;
  const offsetY = (viewHeight - designHeight * scale) / 2;
  const unit = designHeight / 1280;

  return {
    viewWidth,
    viewHeight,
    designWidth,
    designHeight,
    scale,
    offsetX,
    offsetY,
    isPortrait,
    unit
  };

}

export function applyLayout(container: PIXI.Container, layout: Layout): void { 

  container.position.set(layout.offsetX, layout.offsetY);
  container.scale.set(layout.scale);
}
