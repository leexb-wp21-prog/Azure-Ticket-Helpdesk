const API_BASE = window.QUICKAID_API_BASE || "";

const form = document.getElementById("ticketForm");
const submitBtn = document.getElementById("submitBtn");
const submitResult = document.getElementById("submitResult");
const trackForm = document.getElementById("trackForm");
const trackBtn = document.getElementById("trackBtn");
const ticketsResult = document.getElementById("ticketsResult");
const desc = document.getElementById("description");
const descCount = document.getElementById("descCount");
const tabButtons = document.querySelectorAll(".tab-btn");
const templateButtons = document.querySelectorAll(".chip[data-template]");
const statusFilter = document.getElementById("statusFilter");
const sortBy = document.getElementById("sortBy");
const subjectInput = document.getElementById("subject");
const kbList = document.getElementById("kbList");
const kbSuggestions = document.getElementById("kbSuggestions");
const ticketSearch = document.getElementById("ticketSearch");
const categoryFilter = document.getElementById("categoryFilter");
const priorityFilter = document.getElementById("priorityFilter");
const statusTabs = document.querySelectorAll(".status-tab[data-status]");
const attachmentInput = document.getElementById("attachment");
const attachmentInfo = document.getElementById("attachmentInfo");
const attachmentPreview = document.getElementById("attachmentPreview");
const attachmentDropzone = document.getElementById("attachmentDropzone");
const draftHint = document.getElementById("draftHint");
const slaHint = document.getElementById("slaHint");
const ticketsSkeleton = document.getElementById("ticketsSkeleton");

const prioritySegButtons = document.querySelectorAll(
  ".priority-seg .seg-btn[data-priority]"
);

const btnSignIn = document.getElementById("btnSignIn");
const btnProfile = document.getElementById("btnProfile");
const btnLogout = document.getElementById("btnLogout");

const ticketModal = document.getElementById("ticketModal");
const detailStatusBadge = document.getElementById("detailStatusBadge");
const detailPriorityPill = document.getElementById("detailPriorityPill");
const detailStatusSelect = document.getElementById("detailStatusSelect");
const detailPrioritySelect = document.getElementById("detailPrioritySelect");
const detailSubject = document.getElementById("detailSubject");
const detailCategory = document.getElementById("detailCategory");
const detailLocation = document.getElementById("detailLocation");
const detailUpdated = document.getElementById("detailUpdated");
const detailDepartment = document.getElementById("detailDepartment");
const detailAssignedTo = document.getElementById("detailAssignedTo");
const detailCreated = document.getElementById("detailCreated");
const detailLastUpdated = document.getElementById("detailLastUpdated");
const detailDescription = document.getElementById("detailDescription");
const detailTicketId = document.getElementById("detailTicketId");
const detailSla = document.getElementById("detailSla");
const timelineList = document.getElementById("timelineList");
const commentsList = document.getElementById("commentsList");
const commentText = document.getElementById("commentText");
const btnAddComment = document.getElementById("btnAddComment");

const profileModal = document.getElementById("profileModal");
const profileForm = document.getElementById("profileForm");
const profileEmail = document.getElementById("profileEmail");
const notifEmail = document.getElementById("notifEmail");
const notifInApp = document.getElementById("notifInApp");
const btnNotifications = document.getElementById("btnNotifications");
const notifDropdown = document.getElementById("notifDropdown");
const notifBadge = document.getElementById("notifBadge");
const notifUnreadCount = document.getElementById("notifUnreadCount");
const notifList = document.getElementById("notifList");
const btnMarkAllRead = document.getElementById("btnMarkAllRead");

const createFormWrap = document.getElementById("createFormWrap");
const btnNewTicket = document.getElementById("btnNewTicket");
const btnCloseCreate = document.getElementById("btnCloseCreate");
const btnCancelCreate = document.getElementById("btnCancelCreate");
const btnNewTicketTop = document.getElementById("btnNewTicketTop");
const panels = {
  submit: document.getElementById("submitPanel"),
  track: document.getElementById("trackPanel"),
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeTextRegex = /^[^<>]*$/;
const allowedStatuses = ["New", "InProgress", "Resolved", "Closed"];
const priorityOrder = { Low: 1, Medium: 2, High: 3, Urgent: 4 };
const draftStorageKey = "quickaid-ticket-draft-v1";

let activeStatusTab = "All";
const tabToStatus = {
  All: "All",
  Open: "New",
  InProgress: "InProgress",
  Resolved: "Resolved",
};

const tabCountAll = document.getElementById("tabCountAll");
const tabCountOpen = document.getElementById("tabCountOpen");
const tabCountInProgress = document.getElementById("tabCountInProgress");
const tabCountResolved = document.getElementById("tabCountResolved");

const statOpen = document.getElementById("statOpen");
const statInProgress = document.getElementById("statInProgress");
const statResolved = document.getElementById("statResolved");
const statTotal = document.getElementById("statTotal");

const mockTickets = [];
let lastLoadedTickets = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(value) {
  return String(value || "").trim();
}

function setFieldError(id, message) {
  const el = document.getElementById(`${id}Error`);
  if (el) el.textContent = message;
}

function clearFormErrors() {
  [
    "category",
    "name",
    "email",
    "department",
    "subject",
    "description",
    "attachment",
    "consent",
    "trackEmail",
  ].forEach((f) => setFieldError(f, ""));
}

function showSubmitResult(type, message) {
  submitResult.className = `result ${type}`;
  submitResult.textContent = message;
  submitResult.classList.remove("hidden");
}

function hideSubmitResult() {
  submitResult.classList.add("hidden");
}

function statusBadgeClass(status) {
  if (!status) return "badge-new";
  return `badge-${status.toLowerCase()}`;
}

function mapSafeStatus(status) {
  return allowedStatuses.includes(status) ? status : "New";
}

function prettyStatus(status) {
  if (status === "New") return "Open";
  if (status === "InProgress") return "In Progress";
  return status;
}

function validateTicketPayload(payload) {
  const errors = {};
  if (!payload.request_type) errors.category = "Category is required.";
  if (!payload.name) errors.name = "Name is required.";
  if (!payload.email) errors.email = "Email is required.";
  else if (!emailRegex.test(payload.email)) errors.email = "Enter a valid email.";
  if (!payload.category) errors.department = "Department is required.";
  if (!payload.subject) errors.subject = "Subject is required.";
  if (payload.subject.length > 120) errors.subject = "Subject must be 120 chars or less.";
  if (!payload.description) errors.description = "Description is required.";
  if (payload.description.length > 2000)
    errors.description = "Description must be 2000 chars or less.";
  if (!safeTextRegex.test(payload.subject) || !safeTextRegex.test(payload.description)) {
    errors.description = "Please remove unsupported characters like < or >.";
  }
  return errors;
}

function getSlaByPriority(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "urgent") return "Estimated first response SLA: within 1 working hour";
  if (p === "high") return "Estimated first response SLA: within 2 working hours";
  if (p === "low") return "Estimated first response SLA: within 8 working hours";
  return "Estimated first response SLA: within 4 working hours";
}

function syncPrioritySegUi() {
  if (!prioritySegButtons?.length) return;
  if (!form?.priority) return;
  const current = String(form.priority.value || "Medium");
  prioritySegButtons.forEach((btn) => {
    const p = String(btn.dataset.priority || "");
    const isActive = p === current;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function saveDraft() {
  const draft = {
    category: form.category.value,
    name: form.name.value,
    email: form.email.value,
    department: form.department?.value || "",
    priority: form.priority.value,
    subject: form.subject.value,
    location: form.location.value,
    description: form.description.value,
    consent: form.consent.checked,
    savedAt: Date.now(),
  };
  localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  const savedTime = new Date(draft.savedAt).toLocaleTimeString();
  draftHint.textContent = `Draft auto-saved at ${savedTime}.`;
}

function loadDraft() {
  const raw = localStorage.getItem(draftStorageKey);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object") return;
    form.category.value = draft.category || draft.requestType || "";
    form.name.value = draft.name || "";
    form.email.value = draft.email || "";
    if (form.department) form.department.value = draft.department || draft.assignTo || "";
    const p = draft.priority || "Medium";
    form.priority.value = ["Low", "Medium", "High"].includes(p) ? p : "Medium";
    form.subject.value = draft.subject || "";
    form.location.value = draft.location || "";
    form.description.value = draft.description || "";
    form.consent.checked = Boolean(draft.consent);
    descCount.textContent = String((draft.description || "").length);
    draftHint.textContent = draft.savedAt
      ? `Draft restored from ${new Date(draft.savedAt).toLocaleString()}.`
      : "Draft restored.";
    slaHint.textContent = getSlaByPriority(form.priority.value);
    syncPrioritySegUi();
  } catch {
    // ignore invalid draft payload
  }
}

function clearDraft() {
  localStorage.removeItem(draftStorageKey);
  draftHint.textContent = "Draft cleared.";
}

function currentIsoTime() {
  return new Date().toISOString();
}

function randomTicketId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `QKA-${yyyy}-${rand}`;
}

async function submitTicket(payload) {
  if (!API_BASE) {
    await sleep(600);
    const ticket = {
      ticket_id: randomTicketId(),
      status: "New",
      submitted_at: currentIsoTime(),
      message: "Ticket submitted successfully (demo mode).",
      ...payload,
      created_at: currentIsoTime(),
      updated_at: currentIsoTime(),
      department: payload.category || "General Inquiry",
      assignedTo:
        payload.assigned_to ||
        (payload.category === "IT Support" ? "IT Support Team" : "Campus Support Desk"),
      comments: [
        {
          by: payload.name || "Requester",
          text: "Ticket created by requester. Support will review shortly.",
          at: currentIsoTime(),
        },
      ],
      timeline: [
        { label: "Ticket created", at: currentIsoTime() },
        { label: "Request queued for triage", at: currentIsoTime() },
      ],
    };
    mockTickets.push(ticket);
    return ticket;
  }

  const response = await fetch(`${API_BASE}/api/submit_ticket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Correlation-Id": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const msg = error?.error_message || "Unable to submit ticket. Please try again.";
    throw new Error(msg);
  }

  return response.json();
}

async function getTicketsByEmail(email) {
  if (!API_BASE) {
    await sleep(500);
    const items = mockTickets
      .filter((t) => t.email?.toLowerCase() === email.toLowerCase())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return { tickets: items };
  }

  const response = await fetch(
    `${API_BASE}/api/get_tickets?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Correlation-Id": crypto.randomUUID(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const msg = error?.error_message || "Unable to retrieve tickets right now.";
    throw new Error(msg);
  }

  return response.json();
}

function renderTickets(items) {
  ticketsResult.innerHTML = "";
  if (!items.length) {
    ticketsResult.innerHTML =
      '<div class="ticket-card">No tickets found for this email.</div>';
    return;
  }

  items.forEach((t) => {
    const status = mapSafeStatus(t.status);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "ticket-row";
    row.dataset.ticketId = t.ticket_id || "";
    row.setAttribute("aria-label", `Open ticket ${t.ticket_id || "N/A"}`);

    const dueLabel = computeSlaDueLabel(t);
    const updatedStr = new Date(
      t.updated_at || t.submitted_at || Date.now()
    ).toLocaleString();

    const priorityRaw = String(t.priority || "Medium");
    const priorityKey =
      priorityRaw.toLowerCase() === "urgent"
        ? "high"
        : priorityRaw.toLowerCase() || "medium";

    row.innerHTML = `
      <div class="ticket-card-top">
        <div class="ticket-card-left">
          <div class="ticket-card-id">${escapeHtml(t.ticket_id || "N/A")}</div>
          <span class="badge ${statusBadgeClass(status)}">${prettyStatus(status)}</span>
          <span class="priority-pill priority-${escapeHtml(priorityKey)}">${escapeHtml(
      priorityRaw
    )}</span>
        </div>
        <div class="ticket-card-right">
          <div class="ticket-view">View Details</div>
        </div>
      </div>

      <div class="ticket-card-subject">
        <strong>${escapeHtml(t.subject || "No subject")}</strong>
      </div>

      <div class="ticket-card-meta">
        <span class="muted">${escapeHtml(t.category || "General Inquiry")}</span>
        <span class="muted">•</span>
        <span class="muted">${escapeHtml(updatedStr)}</span>
      </div>

      <div class="ticket-card-bottom">
        <div class="ticket-sla">${escapeHtml(dueLabel)}</div>
      </div>
    `;

    row.addEventListener("click", () => openTicketDetails(t));
    ticketsResult.appendChild(row);
  });
}

function applyStatusFilter() {
  const activeStatus = tabToStatus[activeStatusTab] || "All";
  const q = sanitize(ticketSearch?.value || "").toLowerCase();
  const cat = categoryFilter?.value || "All";
  const pri = priorityFilter?.value || "All";

  // Update tab counts based on status only (before other filters).
  const counts = {
    All: lastLoadedTickets.length,
    Open: lastLoadedTickets.filter((t) => mapSafeStatus(t.status) === "New").length,
    InProgress: lastLoadedTickets.filter((t) => mapSafeStatus(t.status) === "InProgress").length,
    Resolved: lastLoadedTickets.filter((t) => mapSafeStatus(t.status) === "Resolved").length,
  };
  if (tabCountAll) tabCountAll.textContent = String(counts.All);
  if (tabCountOpen) tabCountOpen.textContent = String(counts.Open);
  if (tabCountInProgress) tabCountInProgress.textContent = String(counts.InProgress);
  if (tabCountResolved) tabCountResolved.textContent = String(counts.Resolved);

  if (statOpen) statOpen.textContent = String(counts.Open);
  if (statInProgress) statInProgress.textContent = String(counts.InProgress);
  if (statResolved) statResolved.textContent = String(counts.Resolved);
  if (statTotal) statTotal.textContent = String(counts.All);

  let filtered = [...lastLoadedTickets];
  if (activeStatus !== "All") {
    filtered = filtered.filter((ticket) => mapSafeStatus(ticket.status) === activeStatus);
  }
  if (cat && cat !== "All") {
    filtered = filtered.filter((ticket) => String(ticket.category || "").trim() === cat);
  }
  if (pri && pri !== "All") {
    filtered = filtered.filter((ticket) => {
      const p = String(ticket.priority || "").toLowerCase();
      return p === pri.toLowerCase();
    });
  }
  if (q) {
    filtered = filtered.filter((t) => {
      const subject = String(t.subject || "").toLowerCase();
      const ticketId = String(t.ticket_id || "").toLowerCase();
      return subject.includes(q) || ticketId.includes(q);
    });
  }

  // Sorting: keep stable and predictable (updated desc like portal UIs).
  filtered.sort((a, b) => {
    const aMs = new Date(a.updated_at || a.submitted_at || 0).getTime();
    const bMs = new Date(b.updated_at || b.submitted_at || 0).getTime();
    return bMs - aMs;
  });

  renderTickets(filtered);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSlaMsByPriority(priority) {
  const p = String(priority || "Medium").toLowerCase();
  if (p === "urgent") return 1 * 60 * 60 * 1000;
  if (p === "high") return 2 * 60 * 60 * 1000;
  if (p === "low") return 8 * 60 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

function computeSlaDueLabel(ticket) {
  const submittedAt = ticket.submitted_at || ticket.created_at || ticket.updated_at || new Date().toISOString();
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return "SLA due soon";

  const status = mapSafeStatus(ticket.status);
  if (status === "Resolved" || status === "Closed") return "SLA closed";

  const dueMs = submittedMs + getSlaMsByPriority(ticket.priority);
  const diffMs = dueMs - Date.now();
  if (diffMs <= 0) return "SLA overdue";

  const mins = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `Due in ${h}h ${m}m`;
  return `Due in ${m}m`;
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
}

function formatTimelineEvents(ticket) {
  const timeline = [];
  const raw = ticket.timeline;

  if (Array.isArray(raw) && raw.length) {
    raw.forEach((evt) => {
      if (!evt) return;
      timeline.push({
        label: evt.label || "Event",
        at: evt.at || new Date().toISOString(),
      });
    });
    // Always add a "viewed" marker for demo clarity.
    timeline.push({ label: "Opened in portal", at: new Date().toISOString() });
    return timeline;
  }

  const createdAt = ticket.created_at || ticket.submitted_at;
  const updatedAt = ticket.updated_at;
  const status = mapSafeStatus(ticket.status);

  if (createdAt) timeline.push({ label: "Created", at: createdAt });
  if (updatedAt) {
    if (status === "New") timeline.push({ label: "Updated", at: updatedAt });
    else timeline.push({ label: `Status: ${prettyStatus(status)}`, at: updatedAt });
  }
  timeline.push({ label: "Opened in portal", at: new Date().toISOString() });
  return timeline;
}

function openTicketDetails(ticket) {
  if (!ticketModal) return;
  const status = mapSafeStatus(ticket.status);
  detailStatusBadge.className = `badge ${statusBadgeClass(status)}`;
  detailStatusBadge.textContent = prettyStatus(status);
  if (detailStatusSelect) {
    detailStatusSelect.value = status;
  }

  const prRaw = String(ticket.priority || "Medium");
  const pLower = prRaw.toLowerCase();
  const prKey = pLower === "urgent" ? "high" : pLower;
  const normalized =
    prKey === "low" || prKey === "high" ? prKey : "medium";
  detailPriorityPill.className = `detail-priority-pill priority-${normalized}`;
  detailPriorityPill.textContent = prRaw;

  if (detailPrioritySelect) {
    // Map urgent -> High so dropdown matches UI options.
    detailPrioritySelect.value =
      normalized === "high" ? "High" : normalized === "low" ? "Low" : "Medium";
  }
  detailSubject.textContent = ticket.subject || "No subject";
  if (detailTicketId) {
    detailTicketId.textContent = ticket.ticket_id ? `#${ticket.ticket_id}` : "";
  }
  detailCategory.textContent = `Department: ${ticket.category || "General Inquiry"}`;
  detailLocation.textContent = `Location: ${ticket.location || "Not provided"}`;
  const updatedAt = ticket.updated_at || ticket.submitted_at || Date.now();
  detailUpdated.textContent = `Updated: ${new Date(updatedAt).toLocaleString()}`;

  if (detailDepartment) {
    detailDepartment.textContent = ticket.department || ticket.category || "General Inquiry";
  }
  if (detailAssignedTo) {
    detailAssignedTo.textContent = ticket.assignedTo || "Unassigned";
  }
  if (detailCreated) {
    const createdAt = ticket.created_at || ticket.submitted_at || updatedAt;
    detailCreated.textContent = new Date(createdAt).toLocaleString();
  }
  if (detailLastUpdated) {
    detailLastUpdated.textContent = new Date(updatedAt).toLocaleString();
  }
  if (detailDescription) {
    detailDescription.textContent = ticket.description || "No additional description provided.";
  }

  const dueLabel = computeSlaDueLabel(ticket);
  detailSla.textContent =
    dueLabel === "SLA overdue" ? "Overdue, needs attention" : `${dueLabel} (est.)`;

  timelineList.innerHTML = "";
  const events = formatTimelineEvents(ticket);
  events.forEach((e) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(e.label)}</strong> <span class="muted">${escapeHtml(
      new Date(e.at).toLocaleString()
    )}</span>`;
    timelineList.appendChild(li);
  });

  openModal(ticketModal);

  renderComments(ticket);
  if (btnAddComment) {
    btnAddComment.onclick = () => addCommentToTicket(ticket);
  }
}

function renderComments(ticket) {
  if (!commentsList) return;
  const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
  commentsList.innerHTML = "";

  if (!comments.length) {
    const li = document.createElement("li");
    li.textContent = "No comments yet. Add the details support needs to resolve this faster.";
    commentsList.appendChild(li);
    return;
  }

  comments.forEach((c) => {
    const li = document.createElement("li");
    const by = c.by || "Support";
    const at = c.at ? new Date(c.at).toLocaleString() : "";
    li.innerHTML = `
      <div><strong>${escapeHtml(by)}</strong></div>
      <div class="muted">${escapeHtml(at)}</div>
      <div>${escapeHtml(c.text || "")}</div>
    `;
    commentsList.appendChild(li);
  });
}

function addCommentToTicket(ticket) {
  if (!commentText) return;
  const text = sanitize(commentText.value);
  if (!text) {
    commentText.focus();
    return;
  }

  const session = loadSession?.() || {};
  const by = session.name || session.email || "Requester";
  const at = currentIsoTime();

  if (!Array.isArray(ticket.comments)) ticket.comments = [];
  ticket.comments.push({ by, text, at });

  // Keep raw events for formatTimelineEvents, which adds an "Opened in portal" marker.
  if (!Array.isArray(ticket.timeline)) ticket.timeline = [];
  ticket.timeline.push({ label: `Comment added (${by})`, at });

  ticket.updated_at = at;

  // Refresh UI
  if (detailLastUpdated) detailLastUpdated.textContent = new Date(at).toLocaleString();
  if (detailUpdated) detailUpdated.textContent = `Updated: ${new Date(at).toLocaleString()}`;

  timelineList.innerHTML = "";
  const events = formatTimelineEvents(ticket);
  events.forEach((e) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(e.label)}</strong> <span class="muted">${escapeHtml(
      new Date(e.at).toLocaleString()
    )}</span>`;
    timelineList.appendChild(li);
  });

  renderComments(ticket);
  commentText.value = "";
}

const sessionKey = "quickaid-session-v1";
function loadSession() {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function ensureDemoSession() {
  const existing = loadSession();
  if (existing?.email) return existing;
  const demo = {
    email: "sarah.johnson@school.edu",
    role: "Staff",
    name: "Sarah Johnson",
    prefs: { notifEmail: true, notifInApp: true },
  };
  saveSession(demo);
  return demo;
}

function seedDemoTickets(email) {
  if (mockTickets.length) return;
  const now = Date.now();
  const mk = (overrides) => ({
    ticket_id: randomTicketId(),
    status: "New",
    submitted_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    created_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    request_type: "Incident",
    name: "Sarah Johnson",
    email,
    category: "IT Support",
    priority: "High",
    subject: "Projector not working in Room 203",
    location: "Room 203",
    description:
      "The projector in classroom 203 is not displaying any image. The power light is on but no signal detected.",
    department: "IT",
    assignedTo: "Mike Chen",
    comments: [
      {
        by: "IT Support",
        text: "Thanks for reporting. We’re investigating and will update you shortly.",
        at: new Date(now - 1000 * 60 * 60 * 10).toISOString(),
      },
    ],
    timeline: [
      { label: "Ticket created", at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString() },
      { label: "Assigned to technician", at: new Date(now - 1000 * 60 * 60 * 30).toISOString() },
      { label: "Status changed to In Progress", at: new Date(now - 1000 * 60 * 60 * 22).toISOString() },
    ],
    ...overrides,
  });

  mockTickets.push(
    mk({ status: "InProgress", priority: "High", category: "IT Support" }),
    mk({
      status: "New",
      priority: "Medium",
      category: "Facilities",
      subject: "Air conditioner leaking - Block B Level 3",
      description: "Water is dripping from the AC unit. Please advise maintenance.",
      assignedTo: "Facilities Desk",
    }),
    mk({
      status: "Resolved",
      priority: "Low",
      category: "Academic Admin",
      subject: "Password reset request",
      description: "Need password reset for portal access.",
      assignedTo: "Academic Admin Desk",
    })
  );
}

function updateHeaderAuthUi() {
  const session = loadSession();
  const signedIn = Boolean(session && session.email);
  const role = String(session?.role || "user").toLowerCase();
  document.body.dataset.role = ["user", "admin", "staff"].includes(role) ? role : "user";
  btnSignIn?.classList.remove("hidden");
  btnProfile?.classList.add("hidden");
  btnLogout?.classList.add("hidden");
  btnNotifications?.classList.remove("hidden");
  if (!signedIn) closeNotifDropdown();
}

// -----------------------------
// Notifications dropdown wiring
// -----------------------------
const notifStorageKey = "quickaid-notifs-read-v1";
const defaultNotifications = [
  {
    id: "n1",
    unread: true,
    title: "Your ticket #TKT-001 has been assigned to IT Support",
    time: "2 hours ago",
  },
  {
    id: "n2",
    unread: true,
    title: "New comment added to ticket #TKT-002",
    time: "1 day ago",
  },
  {
    id: "n3",
    unread: false,
    title: "Ticket #TKT-003 has been resolved",
    time: "3 days ago",
  },
];

function loadNotifReadSet() {
  const raw = localStorage.getItem(notifStorageKey);
  if (!raw) return new Set(["n3"]);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(["n3"]);
    return new Set(parsed.map(String));
  } catch {
    return new Set(["n3"]);
  }
}

function saveNotifReadSet(readSet) {
  localStorage.setItem(notifStorageKey, JSON.stringify(Array.from(readSet)));
}

function openNotifDropdown() {
  if (!notifDropdown) return;
  notifDropdown.classList.remove("hidden");
  btnNotifications?.setAttribute("aria-expanded", "true");
}

function closeNotifDropdown() {
  if (!notifDropdown) return;
  notifDropdown.classList.add("hidden");
  btnNotifications?.setAttribute("aria-expanded", "false");
}

function renderNotifDropdown() {
  if (!notifList || !notifUnreadCount) return;

  const readSet = loadNotifReadSet();
  const notifications = defaultNotifications.map((n) => ({
    ...n,
    isRead: readSet.has(n.id) || !n.unread,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  notifUnreadCount.textContent = String(unreadCount);
  notifBadge?.classList.toggle("hidden", unreadCount === 0);
  if (notifBadge) notifBadge.textContent = String(unreadCount);

  notifList.innerHTML = "";
  notifications.forEach((n) => {
    const li = document.createElement("li");
    li.className = `notif-item ${n.isRead ? "notif-item-read" : "notif-item-unread"}`;
    li.setAttribute("role", "menuitem");

    const left = document.createElement("span");
    if (n.isRead) {
      left.className = "notif-check";
      left.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      left.className = "notif-dot";
    }

    const textWrap = document.createElement("div");
    textWrap.className = "notif-text";

    const title = document.createElement("div");
    title.className = "notif-text-title";
    title.textContent = n.title;

    const time = document.createElement("div");
    time.className = "notif-time";
    time.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 7V12L15 14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2.2"/>
      </svg>
      <span>${n.time}</span>
    `;

    textWrap.appendChild(title);
    textWrap.appendChild(time);

    li.appendChild(left);
    li.appendChild(textWrap);
    notifList.appendChild(li);
  });
}

function markAllNotifAsRead() {
  const allIds = defaultNotifications.map((n) => n.id);
  saveNotifReadSet(new Set(allIds));
  renderNotifDropdown();
}

function wireNotificationsUi() {
  if (!btnNotifications || !notifDropdown) return;

  // Initial render (unread count + list)
  renderNotifDropdown();

  btnNotifications.addEventListener("click", () => {
    const isOpen = notifDropdown && !notifDropdown.classList.contains("hidden");
    if (isOpen) {
      closeNotifDropdown();
    } else {
      renderNotifDropdown(); // refresh counts in case of state changes
      openNotifDropdown();
    }
  });

  btnMarkAllRead?.addEventListener("click", () => {
    markAllNotifAsRead();
    closeNotifDropdown();
  });

  // Click outside to close.
  document.addEventListener("click", (e) => {
    if (!notifDropdown || notifDropdown.classList.contains("hidden")) return;
    const target = e.target;
    if (!target) return;
    if (btnNotifications.contains(target)) return;
    if (notifDropdown.contains(target)) return;
    closeNotifDropdown();
  });
}

wireNotificationsUi();

function openProfileModal() {
  if (!profileModal) return;
  const session = loadSession();
  if (profileEmail && session?.email) profileEmail.textContent = `Signed in as ${session.email}`;
  const prefs = session?.prefs || {};
  if (notifEmail) notifEmail.checked = Boolean(prefs.notifEmail);
  if (notifInApp) notifInApp.checked = Boolean(prefs.notifInApp);
  openModal(profileModal);
}

function validateAttachment() {
  setFieldError("attachment", "");
  attachmentInfo.textContent = "";
  if (attachmentPreview) attachmentPreview.classList.add("hidden");
  const file = attachmentInput.files?.[0];
  if (!file) {
    if (attachmentPreview) attachmentPreview.innerHTML = "";
    return true;
  }
  const maxBytes = 10 * 1024 * 1024; // Screenshot: up to 10MB
  if (file.size > maxBytes) {
    setFieldError("attachment", "Attachment must be 10 MB or smaller.");
    return false;
  }
  const sizeKb = Math.ceil(file.size / 1024);
  attachmentInfo.textContent = `Attached: ${file.name} (${sizeKb} KB)`;

  if (attachmentPreview) {
    if (String(file.type || "").startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        attachmentPreview.innerHTML = `
          <img src="${String(reader.result)}" alt="Attachment preview" />
          <div class="filemeta">${escapeHtml(file.name)}</div>
        `;
        attachmentPreview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      attachmentPreview.innerHTML = `
        <div class="filemeta">File: ${escapeHtml(file.name)}</div>
      `;
      attachmentPreview.classList.remove("hidden");
    }
  }
  return true;
}

const knowledgeArticles = [
  { keywords: ["wifi", "wi-fi", "internet", "network"], title: "Campus Wi-Fi troubleshooting guide" },
  { keywords: ["aircond", "air conditioner", "facilities", "leak"], title: "Facilities issue report checklist" },
  { keywords: ["portal", "login", "password"], title: "Student portal access recovery steps" },
  { keywords: ["printer", "print"], title: "Printer support and queue reset guide" },
];

function updateKnowledgeSuggestions() {
  const query = sanitize(subjectInput.value).toLowerCase();
  kbList.innerHTML = "";
  if (!query) {
    kbSuggestions.querySelector(".kb-empty").style.display = "block";
    return;
  }
  kbSuggestions.querySelector(".kb-empty").style.display = "none";
  const matches = knowledgeArticles
    .filter((article) => article.keywords.some((k) => query.includes(k)))
    .slice(0, 3);
  if (!matches.length) {
    const li = document.createElement("li");
    li.textContent = "No direct match found. Continue submitting your ticket.";
    kbList.appendChild(li);
    return;
  }
  matches.forEach((article) => {
    const li = document.createElement("li");
    li.textContent = article.title;
    kbList.appendChild(li);
  });
}

["name", "email", "category", "department", "subject", "description", "trackEmail"].forEach((fieldId) => {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.addEventListener("blur", () => {
    if (input.value && input.value.trim()) setFieldError(fieldId, "");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors();
  hideSubmitResult();

  const payload = {
    request_type: sanitize(form.category.value),
    name: sanitize(form.name.value),
    email: sanitize(form.email.value),
    category: sanitize(form.department.value),
    department: sanitize(form.department.value),
    priority: sanitize(form.priority.value || "Medium"),
    assigned_to: sanitize(form.department?.value || ""),
    subject: sanitize(form.subject.value),
    location: sanitize(form.location.value),
    description: sanitize(form.description.value),
  };

  const errors = validateTicketPayload(payload);
  if (!form.consent.checked) errors.consent = "Please confirm the ticket information.";
  if (!validateAttachment()) errors.attachment = "Attachment validation failed.";
  Object.entries(errors).forEach(([field, msg]) => setFieldError(field, msg));
  if (Object.keys(errors).length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const result = await submitTicket(payload);
    showSubmitResult(
      "success",
      `Success: Ticket ${result.ticket_id} submitted. Current status: ${
        result.status || "New"
      }.`
    );
    form.reset();
    descCount.textContent = "0";
    attachmentInfo.textContent = "";
    if (attachmentPreview) attachmentPreview.classList.add("hidden");
    clearDraft();
    setTimeout(() => closeCreateFormWrap(), 1400);
  } catch (error) {
    showSubmitResult("error", error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create";
  }
});

trackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFieldError("trackEmail", "");
  ticketsResult.innerHTML = "";
  if (ticketsSkeleton) ticketsSkeleton.classList.remove("hidden");

  const email = sanitize(trackForm.trackEmail.value);
  if (!email) {
    setFieldError("trackEmail", "Email is required.");
    if (ticketsSkeleton) ticketsSkeleton.classList.add("hidden");
    return;
  }
  if (!emailRegex.test(email)) {
    setFieldError("trackEmail", "Enter a valid email.");
    if (ticketsSkeleton) ticketsSkeleton.classList.add("hidden");
    return;
  }

  trackBtn.disabled = true;
  trackBtn.textContent = "Searching...";
  try {
    const data = await getTicketsByEmail(email);
    lastLoadedTickets = Array.isArray(data.tickets) ? data.tickets : [];
    applyStatusFilter();
  } catch (error) {
    lastLoadedTickets = [];
    ticketsResult.innerHTML = `<div class="ticket-card">${escapeHtml(error.message)}</div>`;
  } finally {
    if (ticketsSkeleton) ticketsSkeleton.classList.add("hidden");
    trackBtn.disabled = false;
    trackBtn.textContent = "Find Tickets";
  }
});

desc.addEventListener("input", () => {
  descCount.textContent = String(desc.value.length);
  saveDraft();
});

const templateMap = {
  wifi: {
    category: "Incident",
    department: "IT Support",
    subject: "Unable to connect to campus Wi-Fi",
    description:
      "I cannot connect to campus Wi-Fi. Device: [phone/laptop], Location: [building/room], Time started: [time], Error shown: [message].",
  },
  aircond: {
    category: "Incident",
    department: "Facilities",
    subject: "Air conditioner not working",
    description:
      "Air conditioner appears faulty. Location: [building/room], When observed: [time], Current condition: [not cooling/leaking/no power].",
  },
  portal: {
    category: "ServiceRequest",
    department: "Academic Admin",
    subject: "Student portal login issue",
    description:
      "Unable to access student portal. Account type: [student/staff], Time started: [time], Error message: [message], Steps already tried: [details].",
  },
};

templateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.template;
    const tpl = templateMap[key];
    if (!tpl) return;
    form.category.value = tpl.category || "Incident";
    if (form.department) form.department.value = tpl.department || "";
    form.subject.value = tpl.subject;
    form.description.value = tpl.description;
    descCount.textContent = String(form.description.value.length);
    hideSubmitResult();
    updateKnowledgeSuggestions();
    saveDraft();
    if (createFormWrap) {
      createFormWrap.classList.remove("hidden");
      createFormWrap.setAttribute("aria-hidden", "false");
    }
  });
});

if (ticketSearch) {
  ticketSearch.addEventListener("input", applyStatusFilter);
}
if (categoryFilter) {
  categoryFilter.addEventListener("change", applyStatusFilter);
}
if (priorityFilter) {
  priorityFilter.addEventListener("change", applyStatusFilter);
}

if (statusTabs?.length) {
  statusTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.status || "All";
      activeStatusTab = next;
      statusTabs.forEach((b) => b.classList.toggle("active", b === btn));
      statusTabs.forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
      applyStatusFilter();
    });
  });
}

if (subjectInput) subjectInput.addEventListener("input", () => {
  updateKnowledgeSuggestions();
  saveDraft();
});
if (attachmentInput) attachmentInput.addEventListener("change", validateAttachment);
if (attachmentDropzone && attachmentInput) {
  const trigger = () => attachmentInput.click();
  attachmentDropzone.addEventListener("click", trigger);
  attachmentDropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") trigger();
  });
}
if (form.priority) {
  form.priority.addEventListener("change", () => {
    slaHint.textContent = getSlaByPriority(form.priority.value);
    saveDraft();
  });
}

if (prioritySegButtons?.length) {
  prioritySegButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!form?.priority) return;
      const next = String(btn.dataset.priority || "Medium");
      form.priority.value = next;
      syncPrioritySegUi();
      // Reuse the existing select change handler (SLA + draft).
      form.priority.dispatchEvent(new Event("change"));
    });
  });
  // Ensure UI matches current priority select value.
  syncPrioritySegUi();
}

["category", "department", "name", "email", "location"].forEach((fieldName) => {
  if (!form[fieldName]) return;
  form[fieldName].addEventListener("input", saveDraft);
});
if (form.consent) form.consent.addEventListener("change", saveDraft);
if (trackForm.trackEmail) {
  trackForm.trackEmail.addEventListener("keydown", (event) => {
    if (event.key === "Enter") return;
  });
}

form.addEventListener("reset", () => {
  setTimeout(() => {
    descCount.textContent = "0";
    kbList.innerHTML = "";
    kbSuggestions.querySelector(".kb-empty").style.display = "block";
    attachmentInfo.textContent = "";
    if (attachmentPreview) attachmentPreview.classList.add("hidden");
    clearDraft();
    slaHint.textContent = getSlaByPriority("Medium");
  }, 0);
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tabName = button.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    Object.entries(panels).forEach(([name, panel]) => {
      panel.classList.toggle("active", name === tabName);
    });
  });
});

loadDraft();
updateKnowledgeSuggestions();

// -----------------------------
// Modal / Profile wiring
// -----------------------------

btnProfile?.addEventListener("click", openProfileModal);

btnLogout?.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  updateHeaderAuthUi();
  closeModal(profileModal);
});

function openCreateModal() {
  if (!createFormWrap || !form) return;

  const session = ensureDemoSession();

  // Ensure modal can render even if submitPanel is hidden.
  if (panels?.submit && panels?.track) {
    panels.submit.classList.add("active");
    panels.track.classList.remove("active");
  }

  // Prefill requester identity from the signed-in session.
  if (form.name) form.name.value = session.name || form.name.value || "Portal User";
  if (form.email) form.email.value = session.email;

  if (form.consent) form.consent.checked = true;

  if (form.category && !form.category.value) form.category.value = "Incident";
  if (form.department && !form.department.value) form.department.value = "IT Support";

  createFormWrap.classList.remove("hidden");
  createFormWrap.setAttribute("aria-hidden", "false");
  form?.subject?.focus?.();
}

btnNewTicket?.addEventListener("click", openCreateModal);
btnNewTicketTop?.addEventListener("click", openCreateModal);

function closeCreateFormWrap() {
  if (!createFormWrap) return;
  createFormWrap.classList.add("hidden");
  createFormWrap.setAttribute("aria-hidden", "true");
  hideSubmitResult();
  if (panels?.submit && panels?.track) {
    panels.submit.classList.remove("active");
    panels.track.classList.add("active");
  }
}

btnCloseCreate?.addEventListener("click", closeCreateFormWrap);
btnCancelCreate?.addEventListener("click", closeCreateFormWrap);

profileForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const session = loadSession();
  if (!session) return;
  session.prefs = {
    notifEmail: Boolean(notifEmail?.checked),
    notifInApp: Boolean(notifInApp?.checked),
  };
  saveSession(session);
  closeModal(profileModal);
});

// Close modals on backdrop click.
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!target) return;
  if (target.dataset?.closeTicket === "true") closeModal(ticketModal);
  if (target.dataset?.closeProfile === "true") closeModal(profileModal);
});

// Close modals on ESC.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeModal(ticketModal);
  closeModal(profileModal);
  if (createFormWrap) closeCreateFormWrap();
  closeNotifDropdown();
});

// SLA countdown auto-refresh for visible ticket rows.
function updateVisibleSlaCountdown() {
  const rows = document.querySelectorAll(".ticket-row");
  rows.forEach((row) => {
    const ticketId = row.dataset.ticketId;
    const ticket = lastLoadedTickets.find((t) => (t.ticket_id || "") === ticketId);
    if (!ticket) return;
    const slaLabel = computeSlaDueLabel(ticket);
    const cell = row.querySelector(".ticket-sla");
    if (cell) cell.textContent = slaLabel;
  });
}

if (lastLoadedTickets?.length) updateVisibleSlaCountdown();
setInterval(updateVisibleSlaCountdown, 60 * 1000);

updateHeaderAuthUi();

const bootSession = loadSession();
if (bootSession?.email) {
  seedDemoTickets(bootSession.email);
  (async () => {
    try {
      const data = await getTicketsByEmail(bootSession.email);
      lastLoadedTickets = Array.isArray(data?.tickets) ? data.tickets : [];
      applyStatusFilter();
    } catch {
      lastLoadedTickets = [];
      applyStatusFilter();
    }
  })();
}
