import './styles/main.css';
import { Game } from './core/Game.js';

const game = new Game(document.getElementById('app'));
game.start();

if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());

// Dev-only handle for console poking / automated tests.
if (import.meta.env.DEV) window.__game = game;
