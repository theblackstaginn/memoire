// =====================
// Element hooks
// =====================
const modalOverlay = document.getElementById('modal-overlay');

const bookHitbox   = document.getElementById('book-hitbox');

// Warning
const warningModal = document.getElementById('warning-modal');
const warningOk    = document.getElementById('warning-ok');
const warningLeave = document.getElementById('warning-leave');
const warningClose = document.getElementById('warning-close');

// Mode chooser
const modeModal = document.getElementById('mode-modal');
const modeRead  = document.getElementById('mode-read');
const modeEdit  = document.getElementById('mode-edit');
const modeBack  = document.getElementById('mode-back');
const modeClose = document.getElementById('mode-close');

// Reader
const readerModal = document.getElementById('reader-modal');
const readerClose = document.getElementById('reader-close');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const leftPageEl  = document.getElementById('page-left');
const rightPageEl = document.getElementById('page-right');

// Editor
const editorModal  = document.getElementById('editor-modal');
const editorClose  = document.getElementById('editor-close');

// =====================
// Simple journal content
// (placeholder — you can load from storage later)
// =====================
const pages = [
  "Page 1\n\nThis is a placeholder entry. You can wire this to real data later.",
  "Page 2\n\nThe left and right pages always move together as a spread.",
  "Page 3\n\nWhen you click next, we advance two indices in this array.",
  "Page 4\n\nYou can replace this content with anything you want."
];

let spreadIndex = 0; // left page index (0,2,4,...)

// =====================
// Helper: show/hide
// =====================
function showOverlay(){
  modalOverlay.classList.remove('hidden');
}

function hideOverlay(){
  modalOverlay.classList.add('hidden');
}

function show(modal){
  modal.classList.remove('hidden');
}

function hide(modal){
  modal.classList.add('hidden');
}

// =====================
// Scene → Warning
// =====================
bookHitbox.addEventListener('click', () => {
  showOverlay();
  show(warningModal);
});

// Warning actions
function exitToDesk(){
  hide(warningModal);
  hide(modeModal);
  hide(readerModal);
  hide(editorModal);
  hideOverlay();
}

warningLeave.addEventListener('click', exitToDesk);
warningClose.addEventListener('click', exitToDesk);

// OK ⇒ mode chooser
warningOk.addEventListener('click', () => {
  hide(warningModal);
  show(modeModal);
});

// =====================
// Mode chooser
// =====================
modeBack.addEventListener('click', () => {
  hide(modeModal);
  show(warningModal);
});

modeClose.addEventListener('click', exitToDesk);

// READ
modeRead.addEventListener('click', () => {
  hide(modeModal);
  openReader();
});

// EDIT
modeEdit.addEventListener('click', () => {
  hide(modeModal);
  openEditor();
});

// =====================
// Reader logic
// =====================
function renderSpread(){
  const leftText  = pages[spreadIndex]     || "";
  const rightText = pages[spreadIndex + 1] || "";

  leftPageEl.textContent  = leftText;
  rightPageEl.textContent = rightText;
}

function openReader(){
  spreadIndex = 0;
  renderSpread();
  show(readerModal);
}

function closeReader(){
  hide(readerModal);
  hideOverlay();
}

readerClose.addEventListener('click', closeReader);

// Simple page-turn animation helper
function animateTurn(direction){
  const rightInner = rightPageEl;
  const leftInner  = leftPageEl;

  const className = direction === 'forward' ? 'turn-forward' : 'turn-back';

  rightInner.classList.add(className);
  leftInner.classList.add(className);

  setTimeout(() => {
    rightInner.classList.remove(className);
    leftInner.classList.remove(className);
  }, 450);
}

nextPageBtn.addEventListener('click', () => {
  if (spreadIndex + 2 >= pages.length) return; // no more pages
  animateTurn('forward');
  setTimeout(() => {
    spreadIndex += 2;
    renderSpread();
  }, 220);
});

prevPageBtn.addEventListener('click', () => {
  if (spreadIndex - 2 < 0) return;
  animateTurn('back');
  setTimeout(() => {
    spreadIndex -= 2;
    renderSpread();
  }, 220);
});

// =====================
// Editor logic
// =====================
function openEditor(){
  show(editorModal);
}

function closeEditor(){
  hide(editorModal);
  hideOverlay();
}

editorClose.addEventListener('click', closeEditor);