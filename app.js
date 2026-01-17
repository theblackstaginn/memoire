console.log("Memoire app.js loaded");

// ===== Supabase init (CDN global) =====
const SUPABASE_URL = "https://eepfsaulkakeqfucewau.supabase.co";
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
const editArea     = document.getElementById("edit-area");

// Auth bar
const authStatus   = document.getElementById("auth-status");
const authEmail    = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authLogin    = document.getElementById("auth-login");
const authLogout   = document.getElementById("auth-logout");

// ===== Reader state =====
let memoPages = [];
let currentPageIndex = 0;

// ===== Modal helpers =====
function hideAllModals() {
  modals.forEach(m => m && m.classList.add("hidden"));
}

function openModal(modal) {
  if (!overlay || !modal) return;
  overlay.classList.remove("hidden");
  hideAllModals();
  modal.classList.remove("hidden");
}

function closeOverlay() {
  if (!overlay) return;
  overlay.classList.add("hidden");
  hideAllModals();
}

// ===== Auth helpers =====
async function getCurrentUser() {
  if (!sb) return null;

  const { data, error } = await sb.auth.getUser();
  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("auth session missing")) return null;
    console.error("Error getting user:", error);
    return null;
  }
  return data.user || null;
}

function updateAuthUI(user) {
  if (!authStatus || !authLogin || !authLogout) return;

  const loggedIn = !!user;

  authStatus.textContent = loggedIn
    ? "Signed in as " + user.email
    : "Not signed in";

  if (loggedIn) {
    authLogin.classList.add("hidden");
    authLogout.classList.remove("hidden");
  } else {
    authLogin.classList.remove("hidden");
    authLogout.classList.add("hidden");
  }
}

// ===== Pagination =====

// HTML -> plain text in DOM order
function htmlToPlainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  const txt = (tmp.textContent || tmp.innerText || "").replace(/\u00A0/g, " ");
  return txt;
}

// Simple char-based paginator: never drops chars, just slices text
function paginateByChars(text, maxChars) {
  if (!text) return [""];

  const pages = [];
  const len = text.length;
  let idx = 0;

  while (idx < len) {
    let end = idx + maxChars;
    if (end >= len) {
      pages.push(text.slice(idx));
      break;
    }

    // Prefer to cut at a space before the maxChars mark
    let cut = text.lastIndexOf(" ", end);
    if (cut <= idx) cut = end; // no good space, hard cut

    pages.push(text.slice(idx, cut));
    idx = cut;
  }

  return pages.length ? pages : [""];
}

// Build pages from whatever is currently in the editor
function buildPagesFromEditArea() {
  if (!editArea) {
    memoPages = [""];
    currentPageIndex = 0;
    updateReaderSpread();
    return;
  }

  const html = editArea.innerHTML;
  const plain = htmlToPlainText(html);

  const vw = window.innerWidth || 1024;
  // This is how much fits on ONE physical page.
  // Tweak if you want more/less text per page.
  const maxCharsPerPage = vw < 700 ? 600 : 900;

  memoPages = paginateByChars(plain, maxCharsPerPage);
  currentPageIndex = 0;
  updateReaderSpread();
}

function updateReaderSpread() {
  if (!pageLeft || !pageRight) return;

  if (!memoPages || memoPages.length === 0) {
    pageLeft.textContent = "";
    pageRight.textContent = "";
    if (btnPagePrev) btnPagePrev.classList.add("disabled");
    if (btnPageNext) btnPageNext.classList.add("disabled");
    return;
  }

  if (currentPageIndex < 0) currentPageIndex = 0;
  if (currentPageIndex >= memoPages.length) {
    currentPageIndex = Math.max(0, memoPages.length - 1);
  }
  if (currentPageIndex % 2 !== 0) currentPageIndex--; // left page must be even index

  const leftIdx = currentPageIndex;
  const rightIdx = currentPageIndex + 1;

  pageLeft.textContent = memoPages[leftIdx] || "";
  pageRight.textContent = memoPages[rightIdx] || "";

  const hasPrevSpread = leftIdx > 0;
  const hasNextSpread = rightIdx < memoPages.length - 1;

  if (btnPagePrev) {
    btnPagePrev.classList.toggle("disabled", !hasPrevSpread);
  }
  if (btnPageNext) {
    btnPageNext.classList.toggle("disabled", !hasNextSpread);
  }
}

// ===== Supabase load/save =====
async function loadMemoireFromSupabase() {
  if (!sb || !editArea) return;

  const user = await getCurrentUser();
  if (!user) {
    console.warn("No user logged in; cannot load memoire.");
    return;
  }

  const { data, error } = await sb
    .from("memoire_entries")
    .select("content, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error loading memoire:", error);
    return;
  }

  if (data && data.length > 0 && data[0].content) {
    editArea.innerHTML = data[0].content;
  } else {
    editArea.innerHTML = "Start writing…";
  }

  // Build pages from what we just loaded
  buildPagesFromEditArea();
}

async function saveMemoireToSupabase() {
  if (!sb || !editArea) {
    alert("Backend not connected; cannot save.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in to save.");
    return;
  }

  const content = editArea.innerHTML;

  const { error } = await sb
    .from("memoire_entries")
    .upsert(
      {
        user_id: user.id,
        content: content,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Save failed:", error);
    alert("Save failed. Check console for details.");
    return;
  }

  console.log("Memoire saved to Supabase.");
  buildPagesFromEditArea();
}

// ===== Auth events =====
if (authLogin) {
  authLogin.addEventListener("click", async () => {
    if (!sb) {
      alert("Backend is not connected.");
      return;
    }
    if (!authEmail.value || !authPassword.value) {
      alert("Enter email & password.");
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value
    });

    if (error) {
      console.error("Login error:", error);
      alert("Login failed. Check email/password.");
      return;
    }

    updateAuthUI(data.user);
    await loadMemoireFromSupabase();
  });
}

if (authLogout) {
  authLogout.addEventListener("click", async () => {
    if (sb) await sb.auth.signOut();
    updateAuthUI(null);
    if (editArea) editArea.innerHTML = "Start writing…";
    memoPages = [""];
    currentPageIndex = 0;
    updateReaderSpread();
  });
}

// Initial auth check
(async function initMemoire() {
  if (!sb) {
    console.warn("Supabase not configured; running in local-only mode.");
    buildPagesFromEditArea();
    return;
  }

  const user = await getCurrentUser();
  updateAuthUI(user);

  if (user) {
    await loadMemoireFromSupabase();
  } else {
    // No user yet; still build pages from whatever is in the editor
    buildPagesFromEditArea();
  }
})();

// ===== Book flow =====
if (bookHitbox) {
  bookHitbox.addEventListener("click", () => {
    openModal(warningModal);
  });
}

if (btnWarningLeave) {
  btnWarningLeave.addEventListener("click", () => {
    closeOverlay();
  });
}

if (btnWarningOk) {
  btnWarningOk.addEventListener("click", () => {
    // Always use current editor content for the reader
    buildPagesFromEditArea();
    openModal(readerModal);
  });
}

if (btnReaderClose) {
  btnReaderClose.addEventListener("click", () => {
    closeOverlay();
  });
}

// ===== Pen / password flow =====
async function handlePasswordSubmit() {
  if (!passwordInput || !passwordError) return;
  const value = passwordInput.value.trim();

  if (value !== PASSWORD) {
    passwordError.classList.remove("hidden");
    return;
  }
  passwordError.classList.add("hidden");

  // Sync from Supabase once when entering edit
  if (sb) {
    const user = await getCurrentUser();
    if (!user) {
      alert("Log in first using the bar at the top.");
      return;
    }
    await loadMemoireFromSupabase();
  }

  openModal(editModal);
}

if (penHitbox) {
  penHitbox.addEventListener("click", () => {
    if (passwordInput) passwordInput.value = "";
    if (passwordError) passwordError.classList.add("hidden");
    openModal(passwordModal);
    setTimeout(() => {
      if (passwordInput) passwordInput.focus();
    }, 50);
  });
}

if (btnPwdSubmit) {
  btnPwdSubmit.addEventListener("click", () => {
    handlePasswordSubmit();
  });
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasswordSubmit();
    }
  });
}

if (btnPwdCancel) {
  btnPwdCancel.addEventListener("click", () => {
    closeOverlay();
  });
}

// ===== Edit save / close =====
if (btnEditSave) {
  btnEditSave.addEventListener("click", () => {
    saveMemoireToSupabase();
  });
}

if (btnEditClose) {
  btnEditClose.addEventListener("click", () => {
    closeOverlay();
  });
}

// ===== Reader page navigation =====
if (btnPagePrev) {
  btnPagePrev.addEventListener("click", () => {
    if (!memoPages || memoPages.length === 0) return;
    if (currentPageIndex <= 0) return;
    currentPageIndex = Math.max(0, currentPageIndex - 2);
    updateReaderSpread();
  });
}

if (btnPageNext) {
  btnPageNext.addEventListener("click", () => {
    if (!memoPages || memoPages.length === 0) return;
    if (currentPageIndex + 2 >= memoPages.length) return;
    currentPageIndex += 2;
    updateReaderSpread();
  });
}

// ===== ESC key =====
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});

// Optional: rebuild page splits on resize so it stays pretty
window.addEventListener("resize", () => {
  buildPagesFromEditArea();
});