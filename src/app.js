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

  function newGame() {
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
    handleReveal(indexFromEvent(evt));
  });

  boardEl.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    handleFlag(indexFromEvent(evt));
  });

  boardEl.addEventListener('touchstart', (evt) => {
    const i = indexFromEvent(evt);
    clearPressTimer();
    pressTimer = setTimeout(() => {
      pressTimer = null;
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
