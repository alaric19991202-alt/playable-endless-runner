
export interface InputHandlers {

  onJump: () => void;
  onLaneLeft: () => void;
  onLaneRight: () => void;

}

export class Input {

  private handlers?: InputHandlers;
  private element?: HTMLElement;

  attach(element: HTMLElement, handlers: InputHandlers) {

    this.element = element;
    this.handlers = handlers;
    this.element.style.touchAction = "none";
    this.element.addEventListener("pointerdown", this.onPointerDown);

  }

  update(_deltaSeconds: number) {}

  private onPointerDown = () => {
    if (!this.handlers) return;
    this.handlers.onJump();
  };
}
