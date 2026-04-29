const ticketCacheStorageKey = "quickaid-ticket-cache-v1";

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusBadgeClass(status) {
  if (!status) return "badge-new";
  return `badge-${String(status).toLowerCase()}`;
}

function prettyStatus(status) {
  if (status === "New") return "Open";
  if (status === "InProgress") return "In Progress";
  return status || "Open";
}

function priorityClass(priority) {
  const p = String(priority || "Medium").toLowerCase();
  if (p === "low") return "priority-low";
  if (p === "high" || p === "urgent") return "priority-high";
  return "priority-medium";
}

function loadCachedTickets() {
  try {
    const raw = localStorage.getItem(ticketCacheStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTicketIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("ticketId") || "";
}

function renderTicket(ticket) {
  const title = document.getElementById("pageTicketTitle");
  const subtitle = document.getElementById("pageTicketSubject");
  const statusBadge = document.getElementById("pageStatusBadge");
  const priorityBadge = document.getElementById("pagePriorityBadge");
  const subject = document.getElementById("pageSubject");
  const description = document.getElementById("pageDescription");
  const attachments = document.getElementById("pageAttachments");
  const attachmentTitle = document.getElementById("pageAttachmentTitle");
  const submittedBy = document.getElementById("pageSubmittedBy");
  const department = document.getElementById("pageDepartment");
  const assignedTo = document.getElementById("pageAssignedTo");
  const createdAt = document.getElementById("pageCreatedAt");
  const updatedAt = document.getElementById("pageUpdatedAt");
  const comments = document.getElementById("pageComments");
  const commentsTitle = document.getElementById("pageCommentsTitle");
  const timeline = document.getElementById("pageTimeline");

  const safeTicketId = ticket.ticket_id || "N/A";
  const safeSubject = ticket.subject || "No subject";
  const status = ticket.status || "New";
  const priority = ticket.priority || "Medium";

  title.textContent = `Ticket #${safeTicketId}`;
  subtitle.textContent = safeSubject;
  statusBadge.className = `badge ${statusBadgeClass(status)}`;
  statusBadge.textContent = prettyStatus(status);
  priorityBadge.className = `detail-priority-pill ${priorityClass(priority)}`;
  priorityBadge.textContent = priority;
  subject.textContent = safeSubject;
  description.textContent = ticket.description || "No additional description provided.";
  submittedBy.textContent = ticket.name || "Requester";
  department.textContent = ticket.department || ticket.category || "General Inquiry";
  assignedTo.textContent = ticket.assignedTo || ticket.assigned_to || "Unassigned";
  createdAt.textContent = formatDateTime(ticket.created_at || ticket.submitted_at);
  updatedAt.textContent = formatDateTime(ticket.updated_at || ticket.submitted_at);

  const atts = Array.isArray(ticket.attachments) ? ticket.attachments : [];
  if (attachmentTitle) attachmentTitle.textContent = `Attachments (${atts.length})`;
  attachments.innerHTML = "";
  if (!atts.length) {
    const li = document.createElement("li");
    li.className = "attachment-item muted";
    li.textContent = "No attachments.";
    attachments.appendChild(li);
  } else {
    atts.forEach((file, idx) => {
      const li = document.createElement("li");
      li.className = "attachment-item";
      const sizeKb = Math.ceil(Number(file.size || 0) / 1024);
      const isImage = String(file.type || "").startsWith("image/");
      li.innerHTML = `
        <div class="attachment-item-head">
          <div class="attachment-item-meta">
            <strong>${file.name || `attachment_${idx + 1}`}</strong>
            <span class="muted">${isImage ? "Image" : "File"} · ${sizeKb} KB</span>
          </div>
          <div class="attachment-item-actions">
            <button type="button" class="ghost" disabled>View</button>
            <button type="button" class="ghost" disabled>Download</button>
          </div>
        </div>
        <div class="attachment-item-preview muted">${isImage ? "Image preview available after backend/file storage integration." : "File preview unavailable."}</div>
      `;
      attachments.appendChild(li);
    });
  }

  const commentItems = Array.isArray(ticket.comments) ? ticket.comments : [];
  if (commentsTitle) commentsTitle.textContent = `Comments (${commentItems.length})`;
  comments.innerHTML = "";
  if (!commentItems.length) {
    const li = document.createElement("li");
    li.textContent = "No comments yet.";
    comments.appendChild(li);
  } else {
    commentItems.forEach((c) => {
      const li = document.createElement("li");
      li.className = "comment-bubble";
      li.innerHTML = `
        <div class="comment-head">
          <strong>${c.by || "Support"}</strong>
          <span class="muted">${formatDateTime(c.at)}</span>
        </div>
        <div class="comment-body">${c.text || ""}</div>
      `;
      comments.appendChild(li);
    });
  }

  const timelineItems = Array.isArray(ticket.timeline) ? ticket.timeline : [];
  timeline.innerHTML = "";
  if (!timelineItems.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No timeline entries.";
    timeline.appendChild(li);
  } else {
    timelineItems.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "timeline-item activity-item";
      const actor = entry.by || entry.actor || (String(entry.label || "").toLowerCase().includes("created") ? (ticket.name || "Requester") : "System");
      li.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-body">
          <strong>${entry.label || "Event"}</strong>
          <div class="muted">${actor} • ${formatDateTime(entry.at)}</div>
        </div>
      `;
      timeline.appendChild(li);
    });
  }
}

function init() {
  document.getElementById("btnBackToList")?.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  const ticketId = getTicketIdFromUrl();
  const tickets = loadCachedTickets();
  const ticket = tickets.find((t) => String(t.ticket_id || "") === String(ticketId || ""));

  if (!ticket) {
    renderTicket({
      ticket_id: ticketId || "N/A",
      subject: "Ticket not found",
      description: "No matching cached ticket was found. Return to the ticket list and open preview again.",
      status: "New",
      priority: "Medium",
      comments: [],
      timeline: [],
      attachments: [],
    });
    return;
  }

  renderTicket(ticket);
}

init();
