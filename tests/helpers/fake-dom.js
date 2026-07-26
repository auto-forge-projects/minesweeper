// Minimal hand-rolled DOM stand-in for testing src/render.js and src/app.js under
// plain `node:test` — zero dependencies (SEC-6/NFR-3), no jsdom/browser needed.
// Only implements the small surface the production code actually uses.

export class FakeEvent {
  constructor(type, { target = null } = {}) {
    this.type = type;
    this.target = target;
    this.defaultPrevented = false;
    this._stopped = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this._stopped = true;
  }
}

export class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = {};
    this._classes = new Set();
    this._attrs = new Map();
    this._text = '';
    this._listeners = new Map(); // type -> Set(fn)
  }

  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get className() {
    return Array.from(this._classes).join(' ');
  }
  get classList() {
    const self = this;
    return {
      add: (...c) => c.forEach((x) => self._classes.add(x)),
      remove: (...c) => c.forEach((x) => self._classes.delete(x)),
      contains: (c) => self._classes.has(c),
    };
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
  get textContent() {
    return this._text;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this._attrs.set(name, String(value));
  }
  getAttribute(name) {
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }

  querySelector(selector) {
    if (!selector.startsWith('#')) return null;
    const id = selector.slice(1);
    const search = (node) => {
      if (node.getAttribute && node.getAttribute('id') === id) return node;
      for (const child of node.children || []) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this);
  }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  // Dispatches on `this` and bubbles up through parentNode, preserving evt.target.
  dispatchEvent(evt) {
    if (evt.target === null) evt.target = this;
    let node = this;
    while (node) {
      const fns = node._listeners.get(evt.type);
      if (fns) for (const fn of Array.from(fns)) fn(evt);
      if (evt._stopped) break;
      node = node.parentNode;
    }
    return !evt.defaultPrevented;
  }
}

export function createFakeDocument() {
  return {
    createElement: (tag) => new FakeElement(tag),
  };
}

// Simulates a real touch device's compatibility-event sequence: touchstart,
// (optional hold via `tick`), touchend, then the browser-synthesized `click`
// that follows every touch tap (used to reproduce/guard against F1: the
// touch->click emulation race between long-press flagging and cell reveal).
// `onContextMenu: true` additionally fires a native `contextmenu` right after
// touchstart, before the hold completes — some Android/Chrome builds emit it
// alongside (not instead of) the JS long-press timer.
export function dispatchTouchTap(container, target, { holdMs = 0, tick, onContextMenu = false } = {}) {
  container.dispatchEvent(new FakeEvent('touchstart', { target }));
  if (onContextMenu) {
    container.dispatchEvent(new FakeEvent('contextmenu', { target }));
  }
  if (holdMs > 0 && tick) tick(holdMs);
  container.dispatchEvent(new FakeEvent('touchend', { target }));
  const clickEvt = new FakeEvent('click', { target });
  container.dispatchEvent(clickEvt);
  return clickEvt;
}
