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

// just to prove JS is actually running:
document.title = "Memoire • live";

// ======= CONTENT =======
const pages = [
  "Page 1\n\nThis is a placeholder entry. Replace with your real content.",
  "Page 2\n\nEverything loads directly over the parchment.",
  "Page 3\n\nMore content...",
  "Page 4\n\nMore content..."
];

let index = 0;

// ======= UTILS =======
function show(el){ el && el.classList.remove('hidden'); }
function hide(el){ el && el.classList.add('hidden'); }

function exitAll(){
  hide(warningModal);
  hide(modeModal);
  hide(passwordModal);
  hide(readerModal);
  hide(editorModal);
  hide(overlay);
}

// ======= OPEN SEQUENCE =======
if (book) {
  book.addEventListener('click', () => {
    show(overlay);
    show(warningModal);
  });
}

// warning
if (warningOk) {
  warningOk.addEventListener('click', () => {
    hide(warningModal);
    show(modeModal);
  });
}

if (warningLeave) warningLeave.addEventListener('click', exitAll);
if (warningClose) warningClose.addEventListener('click', exitAll);

// mode
if (modeBack) {
  modeBack.addEventListener('click', () => {
    hide(modeModal);
    show(warningModal);
  });
}

if (modeClose) modeClose.addEventListener('click', exitAll);

// read
if (modeRead) {
  modeRead.addEventListener('click', () => {
    hide(modeModal);
    index = 0;
    renderPages();
    show(readerModal);
  });
}

// edit (opens password modal)
if (modeEdit) {
  modeEdit.addEventListener('click', () => {
    hide(modeModal);
    if (passwordInput) passwordInput.value = "";
    hide(passwordError);
    show(passwordModal);
  });
}

// ======= PASSWORD HANDLING =======
const EDIT_PASSWORD = "memoire!"; // change this if you want

if (passwordSubmit) {
  passwordSubmit.addEventListener('click', () => {
    if (!passwordInput) return;

    if (passwordInput.value === EDIT_PASSWORD) {
      hide(passwordModal);
      show(editorModal);
    } else {
      show(passwordError);
    }
  });
}

if (passwordCancel) {
  passwordCancel.addEventListener('click', () => {
    hide(passwordModal);
    show(modeModal);
  });
}

if (passwordClose) {
  passwordClose.addEventListener('click', () => {
    hide(passwordModal);
    show(modeModal);
  });
}

// ======= READER =======
if (readerClose) readerClose.addEventListener('click', exitAll);

function renderPages(){
  if (leftPage)  leftPage.textContent  = pages[index] || "";
  if (rightPage) rightPage.textContent = pages[index+1] || "";
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (index + 2 < pages.length) {
      index += 2;
      renderPages();
    }
  });
}

if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (index - 2 >= 0) {
      index -= 2;
      renderPages();
    }
  });
}

// ======= EDITOR =======
if (editorClose) editorClose.addEventListener('click', exitAll);