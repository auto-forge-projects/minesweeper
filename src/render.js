// DOM adaptör katmanı — oyun kurallarına DOKUNMAZ (docs/05-architecture.md, DL-05-001).
// SEC-1 (zorunlu): DOM yazımı YALNIZ textContent + classList/className ile yapılır.
// innerHTML/outerHTML/insertAdjacentHTML/document.write/eval/new Function KULLANILMAZ.

function cellClassName(cell) {
  const classes = ['cell', cell.state];
  if (cell.state === 'revealed' && cell.mine) classes.push('mine');
  if (cell.triggered) classes.push('mine-triggered');
  return classes.join(' ');
}

function cellText(cell) {
  if (cell.state === 'flagged') return '🚩';
  if (cell.state !== 'revealed') return '';
  if (cell.mine) return '💣';
  return cell.adj === 0 ? '' : String(cell.adj);
}

// Grid `<div>`'lerini BİR KEZ kurar (index sırası = DOM sırası, DL-04-004).
export function mountBoard(el, board) {
  el.textContent = ''; // önceki çocukları temizler
  el.className = 'board';
  el.setAttribute('role', 'grid');
  el.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
  for (let i = 0; i < board.cells.length; i++) {
    const cellEl = document.createElement('div');
    cellEl.setAttribute('role', 'gridcell');
    cellEl.dataset.i = String(i);
    cellEl.className = cellClassName(board.cells[i]);
    cellEl.textContent = cellText(board.cells[i]);
    el.appendChild(cellEl);
  }
}

// Yalnız verilen indeksleri günceller (NFR-1: en kötü durumda 480 hücre, tam yeniden çizim yok).
export function updateCells(el, board, indices) {
  for (const i of indices) {
    const cellEl = el.children[i];
    if (!cellEl) continue;
    cellEl.className = cellClassName(board.cells[i]);
    cellEl.textContent = cellText(board.cells[i]);
  }
}

// FR-4/FR-5: kazan/kaybet mesajı + oynanırken kalan bayrak sayacı.
export function setStatus(el, board) {
  if (board.status === 'lost') {
    el.textContent = '💥 Kaybettin';
    return;
  }
  if (board.status === 'won') {
    el.textContent = '🎉 Kazandın';
    return;
  }
  const flagsLeft = board.mines - board.flagCount;
  el.textContent = `Kalan bayrak: ${flagsLeft}`;
}
