// Generic pool. Objects are created up front (or lazily on demand) and
// recycled with acquire()/release(); nothing is created per frame.

export class ObjectPool {
  /**
   * @param {() => any} factory   creates a new pooled object
   * @param {number} initialSize  objects pre-created
   */
  constructor(factory, initialSize = 0) {
    this.factory = factory;
    this.free = [];
    this.all = [];
    for (let i = 0; i < initialSize; i++) this.free.push(this._create());
  }

  _create() {
    const obj = this.factory();
    this.all.push(obj);
    return obj;
  }

  acquire() {
    return this.free.length > 0 ? this.free.pop() : this._create();
  }

  release(obj) {
    this.free.push(obj);
  }

  /** Calls fn on every object ever created (free or in use). */
  forEach(fn) {
    for (let i = 0; i < this.all.length; i++) fn(this.all[i]);
  }

  clear(disposeFn) {
    if (disposeFn) this.forEach(disposeFn);
    this.free.length = 0;
    this.all.length = 0;
  }
}
