import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===== Supabase init =====
const SUPABASE_URL = "https://eepfsaulkakeqfucewau.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kXKPON3Ass12XEj7KAdlzw_7JkNjUpL;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Change to whatever you want for the in-page pen password
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
  overlay.classList.remove("hidden");
  hideAllModals();
  modal.classList.remove("hidden");
}

function closeOverlay() {
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
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    return null;
  }
  return data.user || null;
}

// ===== Supabase: load / save memoire =====

async function loadMemoireFromSupabase() {
  if (!editArea) return;

  const user = await getCurrentUser();
  if (!user) {
    console.warn("No user logged in; cannot load memoire.");
    return;
  }

  const { data, error } = await supabase
    .from("memoire_entries")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // If no row yet, create one with default text
    if (error.code === "PGRST116" || error.message?.includes("No rows")) {
      const { data: newRow, error: insertError } = await supabase
        .from("memoire_entries")
        .insert({
          user_id: user.id,
          content: "Start writing…"
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating memoire row:", insertError);
        return;
      }

      editArea.innerHTML = newRow.content || "Start writing…";
      return;
    }

    console.error("Error loading memoire:", error);
    return;
  }

  editArea.innerHTML = data.content || "Start writing…";
}

async function saveMemoireToSupabase() {
  if (!editArea) return;

  const user = await getCurrentUser();
  if (!user) {
    alert("You must be logged in to save.");
    return;
  }

  const { error } = await supabase
    .from("memoire_entries")
    .update({
      content: editArea.innerHTML,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Save failed:", error);
    alert("Save failed. Check console for details.");
  } else {
    console.log("Memoire saved to Supabase.");
  }
}

// ===== Auth events =====

if (authLogin) {
  authLogin.addEventListener("click", async () => {
    if (!authEmail.value || !authPassword.value) {
      alert("Enter email and password.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value
    });

    if (error) {
      console.error("Login error:", error);
      alert("Login failed. Check email/password.");
      return;
    }

    updateAuthUI(data.user);
    // Optional: load memoire immediately on login
    await loadMemoireFromSupabase();
  });
}

if (authLogout) {
  authLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    updateAuthUI(null);
    if (editArea) {
      editArea.innerHTML = "Start writing…";
    }
  });
}

// Check auth state on load
(async () => {
  const user = await getCurrentUser();
  updateAuthUI(user);
})();

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

// ===== Pen Flow: password -> edit (with Supabase load) =====

if (penHitbox) {
  penHitbox.addEventListener("click", () => {
    if (passwordInput) passwordInput.value = "";
    if (passwordError) passwordError.classList.add("hidden");
    openModal(passwordModal);
    setTimeout(() => passwordInput && passwordInput.focus(), 50);
  });
}

async function submitPassword() {
  if (!passwordInput) return;
  const value = passwordInput.value.trim();

  if (value === PASSWORD) {
    passwordError && passwordError.classList.add("hidden");

    // Ensure logged in before editing
    const user = await getCurrentUser();
    if (!user) {
      alert("Log in first using the bar at the top.");
      return;
    }

    await loadMemoireFromSupabase();
    openModal(editModal);
  } else {
    passwordError && passwordError.classList.remove("hidden");
  }
}

if (btnPwdSubmit) {
  btnPwdSubmit.addEventListener("click", () => {
    submitPassword();
  });
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

// ===== Edit Close & Save =====

if (btnEditClose) {
  btnEditClose.addEventListener("click", closeOverlay);
}

if (btnEditSave) {
  btnEditSave.addEventListener("click", () => {
    saveMemoireToSupabase();
  });
}

// ===== ESC Key =====

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
    closeOverlay();
  }
});
