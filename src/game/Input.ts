
export interface InputHandlers {

  onJump: () => void;
  onLaneLeft: () => void;
  onLaneRight: () => void;

}

export class Input {

  private handlers?: InputHandlers;
  private element?: HTMLElement;
  private pointerDown = false;
  private startX = 0;
  private startY = 0;
  private moved = false;
  private activePointer = -1;
  private readonly swipeThreshold = 40;
  private blocked = false;

  attach(element: HTMLElement, handlers: InputHandlers) {

    this.element = element;
    this.handlers = handlers;
    this.element.style.touchAction = "none";
    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);

  }

  setBlocked(blocked: boolean) {
    if (this.blocked === blocked) {
      return;
    }
    this.blocked = blocked;
    if (blocked) {
      this.pointerDown = false;
      this.moved = false;
      this.activePointer = -1;
    }
  }

  detach() {
    if (!this.element) {
      return;
    }
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    this.element = undefined;
    this.handlers = undefined;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.handlers || this.blocked) {
      return;
    }
    this.pointerDown = true;
    this.moved = false;
    this.activePointer = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
  };

  private onPointerMove = (event: PointerEvent) => {
    if (this.blocked || !this.pointerDown || event.pointerId !== this.activePointer || !this.handlers) {
      return;
    }
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (Math.abs(dx) > this.swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
      this.pointerDown = false;
      this.moved = true;
      return;
    } else if (dy < -this.swipeThreshold && Math.abs(dy) > Math.abs(dx)) {
      this.pointerDown = false;
      this.moved = true;
      this.handlers.onJump();
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    if (this.blocked || !this.pointerDown || event.pointerId !== this.activePointer || !this.handlers) {
      return;
    }
    this.pointerDown = false;
    if (!this.moved) {
      this.handlers.onJump();
    }
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.handlers || this.blocked) {
      return;
    }
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      this.handlers.onJump();
      return;
    }
  };
}
