

import { Game } from "./game/Game";

const root = document.getElementById("app")!;
const game = new Game(root);
game.start();
