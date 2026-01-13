// ======= ELEMENTS =======
const overlay = document.getElementById('modal-overlay');

const book = document.getElementById('book-hitbox');

// warning
const warningModal = document.getElementById('warning-modal');
const warningOk = document.getElementById('warning-ok');
const warningLeave = document.getElementById('warning-leave');
const warningClose = document.getElementById('warning-close');

// mode
const modeModal = document.getElementById('mode-modal');
const modeRead = document.getElementById('mode-read');
const modeEdit = document.getElementById('mode-edit');
const modeBack = document.getElementById('mode-back');
const modeClose = document.getElementById('mode-close');

// password
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('edit-password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordCancel = document.getElementById('password-cancel');
const passwordClose = document.getElementById('password-close');
const passwordError = document.getElementById('password-error');

// reader
const readerModal = document.getElementById('reader-modal');
const readerClose = document.getElementById('reader-close');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const leftPage = document.getElementById('page-left');
const rightPage = document.getElementById('page-right');

// editor
const editorModal = document.getElementById('editor-modal');
const editorClose = document.getElementById('editor-close');

// ======= CONTENT =======
const pages = [
  "Page 1\n\nThis is a placeholder entry. Replace with your real content.",
  "Page 2\n\nEverything loads directly over the parchment.",
  "Page 3\n\nMore content...",
  "Page 4\n\nMore content..."
];

let index = 0;

// ======= UTILS =======
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function exitAll(){
  hide(warningModal);
  hide(modeModal);
  hide(passwordModal);
  hide(readerModal);
  hide(editorModal);
  hide(overlay);
}

// ======= OPEN SEQUENCE =======
book.addEventListener('click',()=>{
  show(overlay);
  show(warningModal);
});

// warning
warningOk.addEventListener('click',()=>{
  hide(warningModal);
  show(modeModal);
});

warningLeave.addEventListener('click',exitAll);
warningClose.addEventListener('click',exitAll);

// mode
modeBack.addEventListener('click',()=>{
  hide(modeModal);
  show(warningModal);
});

modeClose.addEventListener('click',exitAll);

// read
modeRead.addEventListener('click',()=>{
  hide(modeModal);
  index = 0;
  renderPages();
  show(readerModal);