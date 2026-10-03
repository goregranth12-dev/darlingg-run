import { Action } from './Action.js';
import { KeyboardInput } from './KeyboardInput.js';
import { SwipeInput } from './SwipeInput.js';

export { Action };


const QUEUE_SIZE = 16;

// Merges keyboard + swipe into abstract actions. Sources push into a fixed
// ring buffer; Game drains it once per frame (deterministic ordering, no allocs).
export class InputManager {
  constructor(target, config) {
    this.queue = new Int8Array(QUEUE_SIZE);
    this.head = 0;
    this.count = 0;
    const push = (action) => this.push(action);
    this.keyboard = new KeyboardInput(push);
    this.swipe = new SwipeInput(target, config.input, push);
  }

  push(action) {
    if (this.count === QUEUE_SIZE) return; // drop when flooded
    this.queue[(this.head + this.count) % QUEUE_SIZE] = action;
    this.count++;
  }

  /** Calls handler(action) for each queued action, oldest first. */
  drain(handler) {
    while (this.count > 0) {
      const action = this.queue[this.head];
      this.head = (this.head + 1) % QUEUE_SIZE;
      this.count--;
      handler(action);
    }
  }

  clear() {
    this.count = 0;
  }

  dispose() {
    this.keyboard.dispose();
    this.swipe.dispose();
  }
}
