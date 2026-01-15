// Memoire – interaction logic

// Change to whatever you want
const PASSWORD = "stag";

// Overlay + modals
const overlay       = document.getElementById("modal-overlay");
const warningModal  = document.getElementById("warning-modal");
const passwordModal = document.getElementById("password-modal");
const readerModal   = document.getElementById("reader-modal");
const editModal     = document.getElementById("edit-modal");

const modals = [warningModal, passwordModal, readerModal, editModal];

// Desk buttons
const bookHitbox = document.getElementById("book-hitbox");
const penHitbox  = document.getElementById("pen-hitbox");

// Warning buttons
const btnWarningLeave = document.getElementById("btn-warning-leave");
const btnWarningOk    = document.getElementById("btn-warning-ok");

// Password controls
const passwordInput = document.getElementById("password-input");
const passwordError = document.getElementById("password-error");
const btnPwdCancel  = document.getElementById("btn-password-cancel");
const btnPwdSubmit  = document.getElementById("btn-password-submit");

// Reader close
const btnReaderClose = document.getElementById("btn-reader-close");

// Edit close
const btnEditClose = document.getElementById("btn-edit-close");

// ===== Helpers =====

function hideAllModals() {
  modals.forEach((m) => m && m.classList.add("hidden"));
}

function openModal(modal) {
  overlay.classList.remove("hidden");
  hideAllModals();
  modal.classList.remove("hidden");
}

function closeOverlay() {
  overlay.classList.add("hidden");
  hideAllModals();
}

// ===== Book Flow: warning -> read =====

if (bookHitbox) {
  bookHitbox.addEventListener("click", () => openModal(warningModal));
}

if (btnWarningLeave) {
  btnWarningLeave.addEventListener("click", closeOverlay);
}

if (btnWarningOk) {
  btnWarningOk.addEventListener("click", () => openModal(readerModal));
}

if (btnReaderClose) {
  btnReaderClose.addEventListener("click", closeOverlay);
}

// ===== Pen Flow: password -> edit =====

if (penHitbox) {
  penHitbox.addEventListener("click", () => {
    passwordInput.value = "";
    passwordError.classList.add("hidden");
    openModal(passwordModal);
    setTimeout(() => passwordInput.focus(), 50);
  });
}

function submitPassword() {
  const value = passwordInput.value.trim();
  if (value === PASSWORD) {
    passwordError.classList.add("hidden");
    openModal(editModal);
  } else {
    passwordError.classList.remove("hidden");
  }
}

if (btnPwdSubmit) {
  btnPwdSubmit.addEventListener("click", submitPassword);
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitPassword();
    }
  });
}

if (btnPwdCancel) {
  btnPwdCancel.addEventListener("click", closeOverlay);
}

// ===== Edit Close =====

if (btnEditClose) {
  btnEditClose.addEventListener("click", closeOverlay);
}

// ===== ESC Key =====

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});