export type Phase = "start" | "tutorial" | "playing" | "fail" | "cta" | "success";

export interface GameState {
  phase: Phase;
  lives: number;
  money: number;
  payAmount: number;
  toastText: string;
  toastTimer: number;
  damageTimer: number;
  failBadgeTimer: number;
  countdown: number;

}

export function createInitialState(): GameState {
  return {
    
    phase: "start",
    lives: 3,
    money: 0,
    payAmount: 0,
    toastText: "",
    toastTimer: 0,
    damageTimer: 0,
    failBadgeTimer: 0,
    countdown: 60

  };
}
