console.log("Memoire app.js loaded");

// ===== Supabase init (CDN global) =====
const SUPABASE_URL = "https://eepfsaulkakeqfucewau.supabase.co";

// Your real publishable / anon key
const SUPABASE_ANON_KEY = "sb_publishable_kXKPON3Ass12XEj7KAdlzw_7JkNjUpL";

let sb = null;

if (typeof supabase === "undefined") {
  console.warn("Supabase global is not available. Backend features disabled.");
} else if (!SUPABASE_ANON_KEY) {
  console.warn("Supabase anon key missing. Backend disabled.");
} else {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Supabase client initialized.");
}

// In-page password for pen
const PASSWORD = "stag";

// ===== DOM hooks =====

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

// Reader controls
const btnReaderClose = document.getElementById("btn-reader-close");
const pageLeft       = document.getElementById("page-left");
const pageRight      = document.getElementById("page-right");
const btnPagePrev    = document.getElementById("btn-page-prev");
const btnPageNext    = document.getElementById("btn-page-next");

// Edit controls
const btnEditClose = document.getElementById("btn-edit-close");
const btnEditSave  = document.getElementById("btn-edit-save");

// Edit area
const editArea = document.getElementById("edit-area");

// Auth bar
const authStatus   = document.getElementById("auth-status");
const authEmail    = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authLogin    = document.getElementById("auth-login");
const authLogout   = document.getElementById("auth-logout");

// ===== Reader state =====

let memoireContentHTML = "";
let memoirePages = [];
let currentPageIndex = 0;

// ===== Helpers: modal handling =====

function hideAllModals() {
  modals.forEach(function (m) {
    if (m) m.classList.add("hidden");
  });
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

// ===== Helpers: auth =====

async function getCurrentUser() {
  if (!sb) return null;

  const result = await sb.auth.getUser();
  if (result.error) {
    const msg = (result.error.message || "").toLowerCase();
    if (msg.includes("auth session missing")) return null;
    console.error("Error getting user:", result.error);
    return null;
  }

  return result.data.user || null;
}

function updateAuthUI(user) {
  const isLoggedIn = !!user;

  authStatus.textContent = isLoggedIn
    ? "Signed in as " + user.email
    : "Not signed in";

  if (isLoggedIn) {
    authLogin.classList.add("hidden");
    authLogout.classList.remove("hidden");
  } else {
    authLogin.classList.remove("hidden");
    authLogout.classList.add("hidden");
  }
}

// ===== Pagination Helpers =====

function htmlToPlainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  const text = tmp.innerText.replace(/\u00A0/g, " ");
  return text;
}

function paginateTextByLines(text, maxCharsPerPage) {
  const pages = [];
  if (!text) {
    pages.push("");
    return pages;
  }

  const normalized = text.replace(/\r\n/g, "\n");
  const rawLines = normalized.split("\n");

  let current = "";

  for (let line of rawLines) {
    const trimmed = line.replace(/\s+$/g, "");
    const sep = current ? "\n" : "";
    const candidate = current + sep + trimmed;

    if (candidate.length > maxCharsPerPage && current) {
      pages.push(current);
      current = trimmed;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0) pages.push(current);
  if (pages.length === 0) pages.push("");

  return pages;
}

function buildPagesFromContent(html) {
  memoireContentHTML = html || "";
  const plain = htmlToPlainText(memoireContentHTML);

  const viewportWidth = window.innerWidth || 1024;

  // Shrunk capacity so right page fills properly
  const maxCharsPerPage = viewportWidth < 700 ? 320 : 430;

  memoirePages = paginateTextByLines(plain, maxCharsPerPage);
  currentPageIndex = 0;
  updateReaderSpread();
}

function updateReaderSpread() {
  if (!memoirePages || memoirePages.length === 0) {
    pageLeft.textContent = "";
    pageRight.textContent = "";
    btnPagePrev.classList.add("disabled");
    btnPageNext.classList.add("disabled");
    return;
  }

  if (currentPageIndex < 0) currentPageIndex = 0;
  if (currentPageIndex >= memoirePages.length) {
    currentPageIndex = Math.max(0, memoirePages.length - 1);
  }
  if (currentPageIndex % 2 !== 0) currentPageIndex--;

  const leftIdx = currentPageIndex;
  const rightIdx = currentPageIndex + 1;

  pageLeft.textContent = memoirePages[leftIdx] || "";
  pageRight.textContent = memoirePages[rightIdx] || "";

  const hasPrev = leftIdx > 0;
  const hasNext = rightIdx < memoirePages.length - 1;

  btnPagePrev.classList.toggle("disabled", !hasPrev);
  btnPageNext.classList.toggle("disabled", !hasNext);
}

// ===== Supabase: load / save =====

async function loadMemoireFromSupabase() {
  if (!sb) return;
  if (!editArea) return;

  const user = await getCurrentUser();
  if (!user) return;

  const result = await sb
    .from("memoire_entries")
    .select("content, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (result.error) {
    console.error("Error loading memoire:", result.error);
    return;
  }

  if (result.data && result.data.length > 0 && result.data[0].content) {
    const html = result.data[0].content;
    editArea.innerHTML = html;
    buildPagesFromContent(html);
  } else {
    const fallback = "Start writing…";
    editArea.innerHTML = fallback;
    buildPagesFromContent(fallback);
  }
}

async function saveMemoireToSupabase() {
  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in to save.");
    return;
  }

  const content = editArea.innerHTML;

  const result = await sb
    .from("memoire_entries")
    .upsert(
      {
        user_id: user.id,
        content: content,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (result.error) {
    console.error("Save failed:", result.error);
    alert("Save failed. Check console.");
  } else {
    console.log("Memoire saved.");
    buildPagesFromContent(content);
  }
}

// ===== Auth Events =====

authLogin.addEventListener("click", async () => {
  if (!authEmail.value || !authPassword.value) {
    alert("Enter email & password.");
    return;
  }

  const result = await sb.auth.signInWithPassword({
    email: authEmail.value,
    password: authPassword.value
  });

  if (result.error) {
    alert("Login failed.");
    return;
  }

  updateAuthUI(result.data.user);
  await loadMemoireFromSupabase();
});

authLogout.addEventListener("click", async () => {
  await sb.auth.signOut();
  updateAuthUI(null);
  editArea.innerHTML = "Start writing…";
  memoirePages = [];
  updateReaderSpread();
});

(async function () {
  const user = await getCurrentUser();
  updateAuthUI(user);
  if (user) await loadMemoireFromSupabase();
})();

// ===== Book Flow =====

bookHitbox.addEventListener("click", () => openModal(warningModal));
btnWarningLeave.addEventListener("click", () => closeOverlay());

btnWarningOk.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) {
    alert("Log in first.");
    return;
  }
  await loadMemoireFromSupabase();
  openModal(readerModal);
});

btnReaderClose.addEventListener("click", () => closeOverlay());

// ===== Pen Flow =====

penHitbox.addEventListener("click", () => {
  passwordInput.value = "";
  passwordError.classList.add("hidden");
  openModal(passwordModal);
  setTimeout(() => passwordInput.focus(), 50);
});

btnPwdSubmit.addEventListener("click", async () => {
  if (passwordInput.value.trim() !== PASSWORD) {
    passwordError.classList.remove("hidden");
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    alert("Log in first.");
    return;
  }

  await loadMemoireFromSupabase();
  openModal(editModal);
});

btnPwdCancel.addEventListener("click", () => closeOverlay());

// ===== Edit Save & Close =====

btnEditSave.addEventListener("click", () => saveMemoireToSupabase());
btnEditClose.addEventListener("click", () => closeOverlay());

// ===== Page Navigation =====

btnPagePrev.addEventListener("click", () => {
  if (currentPageIndex > 0) {
    currentPageIndex -= 2;
    updateReaderSpread();
  }
});

btnPageNext.addEventListener("click", () => {
  if (currentPageIndex + 2 < memoirePages.length) {
    currentPageIndex += 2;
    updateReaderSpread();
  }
});

// ===== ESC to close =====

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});