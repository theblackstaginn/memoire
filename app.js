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

let memoireContentHTML = "";  // raw HTML from Supabase
let memoirePages = [];        // array of plain-text pages
let currentPageIndex = 0;     // index of LEFT page (0,2,4,...)

// ===== Helpers: modal handling =====

function hideAllModals() {
  modals.forEach(function (m) {
    if (m) m.classList.add("hidden");
  });
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

// ===== Helpers: auth =====

async function getCurrentUser() {
  if (!sb) return null;

  const result = await sb.auth.getUser();
  const data = result.data;
  const error = result.error;

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.indexOf("auth session missing") !== -1) {
      return null;
    }
    console.error("Error getting user:", error);
    return null;
  }

  return data && data.user ? data.user : null;
}

function updateAuthUI(user) {
  const isLoggedIn = !!user;

  if (authStatus) {
    authStatus.textContent = isLoggedIn
      ? "Signed in as " + user.email
      : "Not signed in";
  }

  if (authLogin && authLogout) {
    if (isLoggedIn) {
      authLogin.classList.add("hidden");
      authLogout.classList.remove("hidden");
    } else {
      authLogin.classList.remove("hidden");
      authLogout.classList.add("hidden");
    }
  }
}

// ===== Helpers: reader pagination =====

// Convert the saved HTML to plain text in DOM order, keeping newlines
function htmlToPlainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  const text = tmp.innerText.replace(/\u00A0/g, " ");
  return text;
}

/**
 * Line-based paginator:
 * - preserves line order exactly
 * - fills each page up to maxCharsPerPage
 */
function paginateTextByLines(text, maxCharsPerPage) {
  const pages = [];
  if (!text) {
    pages.push("");
    return pages;
  }

  const normalized = text.replace(/\r\n/g, "\n");
  const rawLines = normalized.split("\n");

  let current = "";

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmedLine = line.replace(/\s+$/g, "");

    const lineToAdd = trimmedLine;
    const separator = current ? "\n" : "";
    const candidate = current + separator + lineToAdd;

    if (candidate.length > maxCharsPerPage && current) {
      pages.push(current);
      current = lineToAdd;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0) {
    pages.push(current);
  }

  if (pages.length === 0) {
    pages.push("");
  }

  return pages;
}

function buildPagesFromContent(html) {
  memoireContentHTML = html || "";
  const plain = htmlToPlainText(memoireContentHTML);

  const viewportWidth = window.innerWidth || 1024;
  const maxCharsPerPage = viewportWidth < 700 ? 420 : 600;

  memoirePages = paginateTextByLines(plain, maxCharsPerPage);
  currentPageIndex = 0;
  updateReaderSpread();
}

function updateReaderSpread() {
  if (!pageLeft || !pageRight) return;

  if (!memoirePages || memoirePages.length === 0) {
    pageLeft.textContent = "";
    pageRight.textContent = "";
    if (btnPagePrev) btnPagePrev.classList.add("disabled");
    if (btnPageNext) btnPageNext.classList.add("disabled");
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

  if (btnPagePrev) {
    btnPagePrev.classList.toggle("disabled", !hasPrev);
  }
  if (btnPageNext) {
    btnPageNext.classList.toggle("disabled", !hasNext);
  }
}

// ===== Supabase: load / save memoire =====

async function loadMemoireFromSupabase() {
  if (!sb) {
    console.warn("Supabase not configured; skipping load.");
    return;
  }
  if (!editArea) return;

  const user = await getCurrentUser();
  if (!user) {
    console.warn("No user logged in; cannot load memoire.");
    return;
  }

  // Back to the known-good pattern: get the latest row by updated_at
  const result = await sb
    .from("memoire_entries")
    .select("content, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const data = result.data;
  const error = result.error;

  if (error) {
    console.error("Error loading memoire:", error);
    return;
  }

  if (data && data.length > 0 && data[0].content) {
    const html = data[0].content;
    editArea.innerHTML = html;
    buildPagesFromContent(html);
  } else {
    const fallback = "Start writing…";
    editArea.innerHTML = fallback;
    buildPagesFromContent(fallback);
  }
}

async function saveMemoireToSupabase() {
  if (!sb) {
    alert("Backend is not connected; cannot save to cloud.");
    return;
  }
  if (!editArea) return;

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

  const error = result.error;

  if (error) {
    console.error("Save failed:", error);
    alert("Save failed. Check console for details.");
  } else {
    console.log("Memoire saved to Supabase.");
    buildPagesFromContent(content);
  }
}

// ===== Auth events =====

if (authLogin) {
  authLogin.addEventListener("click", async function () {
    console.log("Login button clicked");

    if (!sb) {
      alert("Backend is not connected or anon key is incorrect; login disabled.");
      return;
    }

    if (!authEmail.value || !authPassword.value) {
      alert("Enter email and password.");
      return;
    }

    const result = await sb.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value
    });

    const data = result.data;
    const error = result.error;

    if (error) {
      console.error("Login error:", error);
      alert("Login failed. Check email/password or Supabase config.");
      return;
    }

    updateAuthUI(data.user);
    await loadMemoireFromSupabase();
  });
}

if (authLogout) {
  authLogout.addEventListener("click", async function () {
    if (sb) {
      await sb.auth.signOut();
    }
    updateAuthUI(null);
    if (editArea) {
      editArea.innerHTML = "Start writing…";
    }
    memoireContentHTML = "";
    memoirePages = [];
    currentPageIndex = 0;
    updateReaderSpread();
  });
}

// Check auth state on load (only if backend available)
(async function () {
  if (!sb) {
    console.warn(
      "Backend not available or anon key invalid; running in local-only mode."
    );
    return;
  }
  const user = await getCurrentUser();
  updateAuthUI(user);
  console.log("Memoire initialized, user:", user);

  if (user) {
    await loadMemoireFromSupabase();
  }
})();

// ===== Book Flow: warning -> read =====

if (bookHitbox) {
  bookHitbox.addEventListener("click", function () {
    console.log("Book clicked");
    openModal(warningModal);
  });
}

if (btnWarningLeave) {
  btnWarningLeave.addEventListener("click", function () {
    closeOverlay();
  });
}

async function openReader() {
  if (sb) {
    const user = await getCurrentUser();
    if (!user) {
      alert("Log in first using the bar at the top.");
      return;
    }
    await loadMemoireFromSupabase();
  } else {
    const html = editArea ? editArea.innerHTML : "";
    buildPagesFromContent(html);
  }

  updateReaderSpread();
  openModal(readerModal);
}

if (btnWarningOk) {
  btnWarningOk.addEventListener("click", function () {
    openReader();
  });
}

if (btnReaderClose) {
  btnReaderClose.addEventListener("click", function () {
    closeOverlay();
  });
}

// ===== Pen Flow: password -> edit =====

if (penHitbox) {
  penHitbox.addEventListener("click", function () {
    console.log("Pen clicked");
    if (passwordInput) passwordInput.value = "";
    if (passwordError) passwordError.classList.add("hidden");
    openModal(passwordModal);
    setTimeout(function () {
      if (passwordInput) passwordInput.focus();
    }, 50);
  });
}

async function submitPassword() {
  if (!passwordInput) return;
  const value = passwordInput.value.trim();

  if (value === PASSWORD) {
    if (passwordError) passwordError.classList.add("hidden");

    if (!sb) {
      alert("Backend not connected; edit mode is local-only.");
    }

    const user = await getCurrentUser();
    if (sb && !user) {
      alert("Log in first using the bar at the top.");
      return;
    }

    if (sb) {
      await loadMemoireFromSupabase();
    } else if (editArea) {
      buildPagesFromContent(editArea.innerHTML);
    }
    openModal(editModal);
  } else {
    if (passwordError) passwordError.classList.remove("hidden");
  }
}

if (btnPwdSubmit) {
  btnPwdSubmit.addEventListener("click", function () {
    submitPassword();
  });
}

if (passwordInput) {
  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitPassword();
    }
  });
}

if (btnPwdCancel) {
  btnPwdCancel.addEventListener("click", function () {
    closeOverlay();
  });
}

// ===== Edit Close & Save =====

if (btnEditClose) {
  btnEditClose.addEventListener("click", function () {
    closeOverlay();
  });
}

if (btnEditSave) {
  btnEditSave.addEventListener("click", function () {
    saveMemoireToSupabase();
  });
}

// ===== Reader page navigation =====

if (btnPagePrev) {
  btnPagePrev.addEventListener("click", function () {
    if (!memoirePages || memoirePages.length === 0) return;
    if (currentPageIndex <= 0) return;
    currentPageIndex = Math.max(0, currentPageIndex - 2);
    updateReaderSpread();
  });
}

if (btnPageNext) {
  btnPageNext.addEventListener("click", function () {
    if (!memoirePages || memoirePages.length === 0) return;
    if (currentPageIndex + 2 >= memoirePages.length) return;
    currentPageIndex = currentPageIndex + 2;
    updateReaderSpread();
  });
}

// ===== ESC Key =====

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});