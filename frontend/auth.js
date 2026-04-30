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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized === "admin@campus.edu";
}

function resolveRoleFromEmail(email, fallbackRole = "user") {
  if (isAdminEmail(email)) return "admin";
  return normalizeRole(fallbackRole);
}

function bindRolePreview(selectEl, previewEl) {
  if (!selectEl || !previewEl) return;
  const sync = () => {
    previewEl.dataset.role = normalizeRole(selectEl.value);
  };
  selectEl.addEventListener("change", sync);
  sync();
}

function toDashboard(session) {
  const role = normalizeRole(session?.role);
  window.location.href = role === "admin" ? "./admin.html" : "./index.html";
}

function handleMicrosoftAuth(roleValue, emailValue = "microsoft.user@campus.edu") {
  const email = normalizeEmail(emailValue);
  const role = resolveRoleFromEmail(email, roleValue);
  const session = {
    email,
    role,
    name: "Microsoft User",
    prefs: { notifEmail: true, notifInApp: true },
  };
  saveSession(session);
  toDashboard(session);
}

function bindInputShell(inputEl) {
  const shell = inputEl?.closest(".input-shell");
  if (!shell) return;
  const sync = () => {
    shell.classList.toggle("has-text", Boolean(String(inputEl.value || "").trim()));
  };
  inputEl.addEventListener("focus", () => shell.classList.add("has-focus"));
  inputEl.addEventListener("blur", () => shell.classList.remove("has-focus"));
  inputEl.addEventListener("input", sync);
  sync();
}

function initCuteBear({
  bearId,
  leftEyeId,
  rightEyeId,
  lookInputId,
  passwordInputId,
}) {
  const bear = document.getElementById(bearId);
  const leftEye = document.getElementById(leftEyeId);
  const rightEye = document.getElementById(rightEyeId);
  const lookInput = document.getElementById(lookInputId);
  const passwordInput = document.getElementById(passwordInputId);

  if (!bear || !leftEye || !rightEye || !lookInput || !passwordInput) return;

  let isLooking = true;

  const resetEyes = () => {
    leftEye.style.transform = "translate(0, 0)";
    rightEye.style.transform = "translate(0, 0)";
  };

  const lookMode = () => {
    isLooking = true;
    bear.classList.remove("hide");
  };

  const hideMode = () => {
    isLooking = false;
    bear.classList.add("hide");
    resetEyes();
  };

  const normalMode = () => {
    isLooking = true;
    bear.classList.remove("hide");
    resetEyes();
  };

  lookInput.addEventListener("focus", lookMode);
  lookInput.addEventListener("blur", normalMode);
  passwordInput.addEventListener("focus", hideMode);
  passwordInput.addEventListener("blur", normalMode);

  document.addEventListener("mousemove", (e) => {
    if (!isLooking) return;
    const rect = bear.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const x = Math.max(-5, Math.min(5, dx * 5));
    const y = Math.max(-3.5, Math.min(3.5, dy * 3.5));
    leftEye.style.transform = `translate(${x}px, ${y}px)`;
    rightEye.style.transform = `translate(${x}px, ${y}px)`;
  });
}

const loginForm = document.getElementById("loginPageForm");
if (loginForm) {
  const usernameEl = document.getElementById("loginUsername");
  const passwordEl = document.getElementById("loginPassword");
  const loginMicrosoftBtn = document.getElementById("loginMicrosoftBtn");
  bindInputShell(usernameEl);
  bindInputShell(passwordEl);
  initCuteBear({
    bearId: "loginBear",
    leftEyeId: "loginLeftEye",
    rightEyeId: "loginRightEye",
    lookInputId: "loginUsername",
    passwordInputId: "loginPassword",
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setError("loginUsernameError", "");
    setError("loginPasswordError", "");
    const username = String(usernameEl?.value || "").trim();
    const password = String(passwordEl?.value || "").trim();
    let hasError = false;
    if (!username) {
      setError("loginUsernameError", "Please enter your username.");
      hasError = true;
    }
    if (!password) {
      setError("loginPasswordError", "Password is required.");
      hasError = true;
    }
    if (hasError) return;

    const email = username.includes("@") ? username : `${username}@campus.edu`;

    const session = {
      email,
      role: resolveRoleFromEmail(email, "user"),
      name: username || "Portal User",
      prefs: { notifEmail: true, notifInApp: true },
    };
    saveSession(session);
    toDashboard(session);
  });

  loginMicrosoftBtn?.addEventListener("click", () => {
    handleMicrosoftAuth("user");
  });
}

const registerForm = document.getElementById("registerPageForm");
if (registerForm) {
  const nameEl = document.getElementById("registerName");
  const emailEl = document.getElementById("registerEmail");
  const passwordEl = document.getElementById("registerPassword");
  const registerMicrosoftBtn = document.getElementById("registerMicrosoftBtn");
  bindInputShell(nameEl);
  bindInputShell(emailEl);
  bindInputShell(passwordEl);
  initCuteBear({
    bearId: "registerBear",
    leftEyeId: "registerLeftEye",
    rightEyeId: "registerRightEye",
    lookInputId: "registerEmail",
    passwordInputId: "registerPassword",
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    setError("registerNameError", "");
    setError("registerEmailError", "");
    setError("registerPasswordError", "");
    const name = String(nameEl?.value || "").trim();
    const email = String(emailEl?.value || "").trim();
    const password = String(passwordEl?.value || "").trim();
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

    const session = {
      email,
      role: resolveRoleFromEmail(email, "user"),
      name,
      prefs: { notifEmail: true, notifInApp: true },
    };
    saveSession(session);
    toDashboard(session);
  });

  registerMicrosoftBtn?.addEventListener("click", () => {
    handleMicrosoftAuth("user");
  });
}
