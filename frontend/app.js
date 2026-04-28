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
const panels = {
  submit: document.getElementById("submitPanel"),
  track: document.getElementById("trackPanel"),
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeTextRegex = /^[^<>]*$/;
const allowedStatuses = ["New", "InProgress", "Resolved", "Closed"];

const mockTickets = [];

function sanitize(value) {
  return String(value || "").trim();
}

function setFieldError(id, message) {
  const el = document.getElementById(`${id}Error`);
  if (el) el.textContent = message;
}

function clearFormErrors() {
  [
    "name",
    "email",
    "category",
    "subject",
    "description",
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

function validateTicketPayload(payload) {
  const errors = {};
  if (!payload.name) errors.name = "Name is required.";
  if (!payload.email) errors.email = "Email is required.";
  else if (!emailRegex.test(payload.email)) errors.email = "Enter a valid email.";
  if (!payload.category) errors.category = "Category is required.";
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
    const ticket = {
      ticket_id: randomTicketId(),
      status: "New",
      submitted_at: currentIsoTime(),
      message: "Ticket submitted successfully (demo mode).",
      ...payload,
      created_at: currentIsoTime(),
      updated_at: currentIsoTime(),
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
    const card = document.createElement("article");
    card.className = "ticket-card";
    card.innerHTML = `
      <div class="ticket-top">
        <p class="ticket-id">${t.ticket_id || "N/A"}</p>
        <span class="badge ${statusBadgeClass(status)}">${status}</span>
      </div>
      <p><strong>${t.subject || "No subject"}</strong></p>
      <p>Category: ${t.category || "General Inquiry"}</p>
      <p>Updated: ${new Date(t.updated_at || t.submitted_at || Date.now()).toLocaleString()}</p>
    `;
    ticketsResult.appendChild(card);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors();
  hideSubmitResult();

  const payload = {
    name: sanitize(form.name.value),
    email: sanitize(form.email.value),
    category: sanitize(form.category.value),
    priority: sanitize(form.priority.value || "Medium"),
    subject: sanitize(form.subject.value),
    location: sanitize(form.location.value),
    description: sanitize(form.description.value),
  };

  const errors = validateTicketPayload(payload);
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
  } catch (error) {
    showSubmitResult("error", error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Ticket";
  }
});

trackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFieldError("trackEmail", "");
  ticketsResult.innerHTML = "";

  const email = sanitize(trackForm.trackEmail.value);
  if (!email) {
    setFieldError("trackEmail", "Email is required.");
    return;
  }
  if (!emailRegex.test(email)) {
    setFieldError("trackEmail", "Enter a valid email.");
    return;
  }

  trackBtn.disabled = true;
  trackBtn.textContent = "Searching...";
  try {
    const data = await getTicketsByEmail(email);
    renderTickets(Array.isArray(data.tickets) ? data.tickets : []);
  } catch (error) {
    ticketsResult.innerHTML = `<div class="ticket-card">${error.message}</div>`;
  } finally {
    trackBtn.disabled = false;
    trackBtn.textContent = "Find Tickets";
  }
});

desc.addEventListener("input", () => {
  descCount.textContent = String(desc.value.length);
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
