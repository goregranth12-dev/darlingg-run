import './styles/main.css';
import { Game } from './core/Game.js';

const MIN_LOADING_MS = 1800; // keep the loading art up long enough to be seen
const started = performance.now();

// Let the loading screen paint before the (synchronous) world generation starts.
requestAnimationFrame(() => {
  setTimeout(() => {
    const game = new Game(document.getElementById('app'));
    game.start();
    if (import.meta.env.DEV) window.__game = game; // dev-only handle for console poking / tests
    if (import.meta.hot) import.meta.hot.dispose(() => game.dispose());

    const loading = document.getElementById('loading');
    const wait = Math.max(0, MIN_LOADING_MS - (performance.now() - started));
    setTimeout(() => {
      loading.classList.add('is-done');
      setTimeout(() => loading.remove(), 600);
    }, wait);
  }, 30);
});
