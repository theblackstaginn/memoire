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

// Reader close
const btnReaderClose = document.getElementById("btn-reader-close");

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
    // Normal on first load when nobody is logged in
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

  const result = await sb
    .from("memoire_entries")
    .select("content")
    .eq("user_id", user.id)
    .limit(1);

  const data = result.data;
  const error = result.error;

  if (error) {
    console.error("Error loading memoire:", error);
    return;
  }

  if (data && data.length > 0 && data[0].content) {
    editArea.innerHTML = data[0].content;
  } else {
    editArea.innerHTML = "Start writing…";
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

if (btnWarningOk) {
  btnWarningOk.addEventListener("click", function () {
    openModal(readerModal);
  });
}

if (btnReaderClose) {
  btnReaderClose.addEventListener("click", function () {
    closeOverlay();
  });
}

// ===== Pen Flow: password -> edit (with Supabase load) =====

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

    // Load from backend (if available), then open editor
    if (sb) {
      await loadMemoireFromSupabase();
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

// ===== ESC Key =====

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});