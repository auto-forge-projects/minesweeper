// Controller — bağlar: board.js (kurallar) <-> render.js (DOM). Kendisi kural/DOM detayına
// girmez (docs/05-architecture.md, DL-05-001). Girdi tek kanal: #board delege click/
// contextmenu/touchstart (SEC-4 — location/cookie/storage/fetch/ağ kullanılmaz).

import { DIFFICULTIES, createBoard, revealCell, toggleFlag } from './board.js';
import { mountBoard, updateCells, setStatus } from './render.js';

const LONG_PRESS_MS = 500;

// SEC-3: yalnız DIFFICULTIES anahtarları kabul edilir; her şey (prototype-pollution
// vektörleri dahil) 'easy'a düşer.
function resolveDifficultyKey(key) {
  return Object.hasOwn(DIFFICULTIES, key) ? key : 'easy';
}

function indexFromEvent(evt) {
  const target = evt.target;
  if (!target || !target.dataset || target.dataset.i === undefined) return -1;
  const i = Number.parseInt(target.dataset.i, 10);
  return Number.isInteger(i) ? i : -1;
}

export function initApp(root) {
  const difficultySelect = root.querySelector('#difficulty');
  const newGameBtn = root.querySelector('#new-game');
  const boardEl = root.querySelector('#board');
  const statusEl = root.querySelector('#status');

  let board = null;
  let pressTimer = null;
  // F1 fix: after a long-press flags a cell, the touch device still emits a
  // synthetic `click` (and on some Android/Chrome builds, an extra native
  // `contextmenu`) for the SAME gesture. Both must be swallowed once so they
  // don't re-toggle/open the cell the finger already left.
  let suppressNextClick = false;

  function newGame() {
    clearPressTimer(); // F8 fix: a pending long-press must not flag a cell on the NEW board
    const key = resolveDifficultyKey(difficultySelect ? difficultySelect.value : 'easy');
    board = createBoard(key);
    mountBoard(boardEl, board);
    setStatus(statusEl, board);
  }

  function applyResult(result) {
    if (!result.changed.length) return;
    updateCells(boardEl, board, result.changed);
    setStatus(statusEl, board);
  }

  function handleReveal(i) {
    if (!board || i < 0) return;
    applyResult(revealCell(board, i));
  }

  function handleFlag(i) {
    if (!board || i < 0) return;
    applyResult(toggleFlag(board, i));
  }

  function clearPressTimer() {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  boardEl.addEventListener('click', (evt) => {
    if (suppressNextClick) {
      // The emulated click for a gesture we already handled as a long-press
      // flag — swallow it so it doesn't reveal the cell (F1).
      suppressNextClick = false;
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
    handleReveal(indexFromEvent(evt));
  });

  boardEl.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    if (suppressNextClick) {
      // Same gesture already toggled the flag via the long-press timer
      // (Android/Chrome can fire a native contextmenu alongside it) — don't
      // toggle a second time, just keep swallowing the trailing click (F1).
      return;
    }
    if (pressTimer !== null) {
      // Native contextmenu arrived before our JS timer fired — treat it as
      // the long-press signal on this platform: toggle once, cancel the
      // pending timer, and suppress the click that may still follow.
      clearPressTimer();
      suppressNextClick = true;
    }
    handleFlag(indexFromEvent(evt));
  });

  boardEl.addEventListener('touchstart', (evt) => {
    const i = indexFromEvent(evt);
    clearPressTimer();
    pressTimer = setTimeout(() => {
      pressTimer = null;
      suppressNextClick = true;
      handleFlag(i);
    }, LONG_PRESS_MS);
  });

  boardEl.addEventListener('touchend', clearPressTimer);
  boardEl.addEventListener('touchmove', clearPressTimer);
  boardEl.addEventListener('touchcancel', clearPressTimer);

  if (difficultySelect) {
    difficultySelect.addEventListener('change', newGame);
  }
  if (newGameBtn) {
    newGameBtn.addEventListener('click', newGame);
  }

  newGame();

  return { newGame };
}

// Tarayıcıda otomatik başlat. `document.body` yalnız gerçek bir DOM'da bulunur —
// testlerdeki minimal fake `document` (yalnız createElement) bunu taşımaz, bu yüzden
// import edildiğinde testlerde YAN ETKİSİZ kalır (SEC-4: tek girdi kanalı #board olayları).
if (typeof document !== 'undefined' && document.body) {
  initApp(document.body);
}
