// Minimal synchronous event emitter. emit() takes up to two payload args
// (no rest params) so emitting in the hot loop does not allocate.
//
// Events used so far: 'jump', 'slide', 'land', 'laneChange', 'laneBump',
// 'paused', 'resumed'. Reserved for later: 'coinCollected', 'gameOver'.

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    let list = this.listeners.get(event);
    if (!list) {
      list = [];
      this.listeners.set(event, list);
    }
    list.push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this.listeners.get(event);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }

  emit(event, a, b) {
    const list = this.listeners.get(event);
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](a, b);
  }

  clear() {
    this.listeners.clear();
  }
}
