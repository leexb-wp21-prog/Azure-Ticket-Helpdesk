const sessionKey = "quickaid-session-v1";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function setError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || "";
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase();
  if (role === "admin" || role === "staff" || role === "user") return role;
  return "user";
}

function bindRolePreview(selectEl, previewEl) {
  if (!selectEl || !previewEl) return;
  const sync = () => {
    previewEl.dataset.role = normalizeRole(selectEl.value);
  };
  selectEl.addEventListener("change", sync);
  sync();
}

function toDashboard() {
  window.location.href = "./index.html";
}

const loginForm = document.getElementById("loginPageForm");
if (loginForm) {
  const emailEl = document.getElementById("loginEmail");
  const passwordEl = document.getElementById("loginPassword");
  const roleEl = document.getElementById("loginRole");
  bindRolePreview(roleEl, document.getElementById("rolePreview"));

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setError("loginEmailError", "");
    setError("loginPasswordError", "");
    const email = String(emailEl?.value || "").trim();
    const password = String(passwordEl?.value || "").trim();
    const role = normalizeRole(roleEl?.value);

    let hasError = false;
    if (!email || !emailRegex.test(email)) {
      setError("loginEmailError", "Please enter a valid email.");
      hasError = true;
    }
    if (!password) {
      setError("loginPasswordError", "Password is required.");
      hasError = true;
    }
    if (hasError) return;

    saveSession({
      email,
      role,
      name: email.split("@")[0] || "Portal User",
      prefs: { notifEmail: true, notifInApp: true },
    });
    toDashboard();
  });
}

const registerForm = document.getElementById("registerPageForm");
if (registerForm) {
  const nameEl = document.getElementById("registerName");
  const emailEl = document.getElementById("registerEmail");
  const passwordEl = document.getElementById("registerPassword");
  const roleEl = document.getElementById("registerRole");
  bindRolePreview(roleEl, document.getElementById("rolePreview"));

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setError("registerNameError", "");
    setError("registerEmailError", "");
    setError("registerPasswordError", "");
    const name = String(nameEl?.value || "").trim();
    const email = String(emailEl?.value || "").trim();
    const password = String(passwordEl?.value || "").trim();
    const role = normalizeRole(roleEl?.value);

    let hasError = false;
    if (!name) {
      setError("registerNameError", "Name is required.");
      hasError = true;
    }
    if (!email || !emailRegex.test(email)) {
      setError("registerEmailError", "Please enter a valid email.");
      hasError = true;
    }
    if (!password) {
      setError("registerPasswordError", "Password is required.");
      hasError = true;
    }
    if (hasError) return;

    saveSession({
      email,
      role,
      name,
      prefs: { notifEmail: true, notifInApp: true },
    });
    toDashboard();
  });
}
