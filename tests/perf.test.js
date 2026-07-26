// Faz 11 (Test) — closes PR-1 review finding F11: NFR-1 (click -> DOM update <=100ms)
// had zero measurement (docs/10-review/PR-1.md). This is a code-level timing test, not a
// real-browser measurement — see docs/11-test/results.md for the residual gap this leaves.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createBoard, revealCell } from '../src/board.js';
import { createFakeDocument, FakeElement } from './helpers/fake-dom.js';

// render.js reads the global `document` at import time (same pattern as render.test.js) —
// inject a fake one before importing so this runs under plain node:test, zero deps (SEC-6).
globalThis.document = createFakeDocument();
const { mountBoard, updateCells } = await import('../src/render.js');

// NFR-1 worst case: the largest difficulty (hard: 16x30 = 480 cells) AND the largest
// possible flood-fill spread (every cell reachable in one zero-adjacency cascade). Forcing
// mines=0 makes a single reveal cascade through the ENTIRE board — the same technique
// board.reveal.test.js uses to force a full-board flood-fill — which is simultaneously the
// worst case for revealCell's flood-fill work AND for updateCells' changed-index count
// (all 480 cells changed in one batch).
test('NFR-1: revealCell + updateCells on a full-cascade 16x30 (hard) board complete within 100ms', () => {
  const board = createBoard('hard');
  board.mines = 0;
  assert.equal(board.cells.length, 480, 'sanity: hard difficulty is 16x30=480 cells');
  const el = new FakeElement('div');
  mountBoard(el, board);

  // Warm-up run (JIT/first-call overhead is not representative of steady-state perf);
  // discarded, not asserted on.
  {
    const warmBoard = createBoard('hard');
    warmBoard.mines = 0;
    const warmEl = new FakeElement('div');
    mountBoard(warmEl, warmBoard);
    const { changed } = revealCell(warmBoard, 0, () => 0.999);
    updateCells(warmEl, warmBoard, changed);
  }

  const t0 = performance.now();
  const { changed, status } = revealCell(board, 0, () => 0.999);
  updateCells(el, board, changed);
  const elapsedMs = performance.now() - t0;

  assert.equal(status, 'won'); // sanity: confirms the full board really cascaded (480 cells)
  assert.equal(changed.length, board.cells.length, 'sanity: all 480 cells changed in one cascade');

  // Budget = NFR-1's own target (<=100ms), asserted directly rather than loosened: this is
  // a synthetic-DOM + warmed-up-process measurement, which is consistently far faster than
  // a real browser's reflow/paint pipeline (no jsdom, no CSS layout, no compositing) — so
  // the fake-DOM number is a LOWER bound on real-world latency, not an equivalent one. A
  // 100ms budget here still leaves generous headroom (observed: low single-digit ms) before
  // this could plausibly flake on CI variance; if it ever does, that is itself a signal the
  // real-browser number (still unmeasured — see docs/11-test/results.md, F11 residual risk)
  // needs a dedicated look, not a wider assertion.
  assert.ok(elapsedMs <= 100, `expected <=100ms for full 16x30 cascade, got ${elapsedMs.toFixed(3)}ms`);
});
