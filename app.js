console.log("Memoire app.js loaded");

// ===== Supabase init (CDN global) =====
const SUPABASE_URL = "https://eepfsaulkakeqfucewau.supabase.co";

// This is your real publishable/anon key
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
  modals.forEach((m) => m && m.classList.add("hidden"));
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

function updateAuthUI(user) {
  const isLoggedIn = !!user;
  if (authStatus) {
    authStatus.textContent = isLoggedIn
      ? `Signed in as ${user.email}`
      : "Not signed in";
  }
  if (authLogin && authLogout) {
    authLogin.classList.toggle("hidden", isLoggedIn);
    authLogout.classList.toggle("hidden", !isLoggedIn);
  }
}

async function getCurrentUser() {
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  return data.user || null;
}

// ===== Supabase: load / save memoire =====

async function loadMemoireFromSupabase() {
  if (!sb) return;
  if (!editArea) return;

  const user = await getCurrentUser();
  if (!user) return;

  const { data, error } = await sb
    .from("memoire_entries")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      const { data: newRow } = await sb
        .from("memoire_entries")
        .insert({
          user_id: user.id,
          content: "Start writing…"
        })
        .select()
        .single();

      editArea.innerHTML = newRow?.content || "Start writing…";
      return;
    }
    console.error("Load error:", error);
    return;
  }

  editArea.innerHTML = data.content || "Start writing…";
}

async function saveMemoireToSupabase() {
  if (!sb) return alert("Backend not connected.");
  if (!editArea) return;
  
  const user = await getCurrentUser();
  if (!user) {
    alert("Log in first.");
    return;
  }

  const { error } = await sb
    .from("memoire_entries")
    .update({
      content: editArea.innerHTML,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Save failed:", error);
    alert("Save failed.");
  } else {
    console.log("Saved to Supabase.");
  }
}

// ===== Auth events =====

if (authLogin) {
  authLogin.addEventListener("click", async () => {
    if (!sb) return alert("Backend not connected.");
    if (!authEmail.value || !authPassword.value) {
      alert("Enter email + password.");
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value
    });

    if (error) {
      console.error("Login error:", error);
      alert("Login failed.");
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
  });
}

// ===== Init auth state =====

(async () => {
  if (!sb) return;
  const user = await getCurrentUser();
  updateAuthUI(user);
})();

// ===== Book Flow =====

if (bookHitbox) {
  bookHitbox.addEventListener("click", () => openModal(warningModal));
}

if (btnWarningLeave) btnWarningLeave.addEventListener("click", closeOverlay);

if (btnWarningOk) btnWarningOk.addEventListener("click", () => openModal(readerModal));

if (btnReaderClose) btnReaderClose.addEventListener("click", closeOverlay);

// ===== Pen Flow =====

if (penHitbox) {
  penHitbox.addEventListener("click", () => {
    if (passwordInput) passwordInput.value = "";
    if (passwordError) passwordError.classList.add("hidden");
    openModal(passwordModal);
    setTimeout(() => passwordInput && passwordInput.focus(), 50);
  });
}

async function submitPassword() {
  const value = passwordInput.value.trim();
  if (value !== PASSWORD) {
    passwordError.classList.remove("hidden");
    return;
  }

  const user = await getCurrentUser();
  if (!user) return alert("Log in first.");

  await loadMemoireFromSupabase();
  openModal(editModal);
}

if (btnPwdSubmit) btnPwdSubmit.addEventListener("click", submitPassword);
if (btnPwdCancel) btnPwdCancel.addEventListener("click", closeOverlay);

if (passwordInput) {
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitPassword();
    }
  });
}

// ===== Edit Save & Close =====

if (btnEditClose) btnEditClose.addEventListener("click", closeOverlay);
if (btnEditSave) btnEditSave.addEventListener("click", saveMemoireToSupabase);

// ===== ESC =====

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});