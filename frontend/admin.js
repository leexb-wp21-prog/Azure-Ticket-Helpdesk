const sessionKey = "quickaid-session-v1";
const API_BASE = window.QUICKAID_API_BASE || "";

function loadSession() {
  const raw = localStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAdminSession(session) {
  return String(session?.role || "").toLowerCase() === "admin";
}

const session = loadSession();
if (!isAdminSession(session)) {
  window.location.replace("./index.html");
}

const adminSessionLabel = document.getElementById("adminSessionLabel");
if (adminSessionLabel && session?.email) {
  adminSessionLabel.textContent = `Signed in as ${session.email}`;
}

const adminLogoutBtn = document.getElementById("adminLogoutBtn");
adminLogoutBtn?.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  window.location.href = "./login.html";
});

const pageLinks = Array.from(document.querySelectorAll("[data-page-link]"));
const pages = Array.from(document.querySelectorAll(".admin-page"));
const rangeButtons = Array.from(document.querySelectorAll(".range-tab[data-range]"));
const adminTicketModal = document.getElementById("adminTicketModal");
const adminTicketModalContent = document.getElementById("adminTicketModalContent");
const overviewStatusOptions = ["Open", "In Progress", "Resolved"];
const overviewTeamOptions = [
  "Network Team",
  "Software Team",
  "Account Team",
  "Hardware Team",
  "Infrastructure",
  "Application Support",
  "Facilities",
];

const mockAdminData = {
  overview: {
    metrics: { totalTickets: 5, open: 2, inProgress: 2, resolved: 1 },
    categoryDistribution: [
      { label: "Network and VPN", value: 1 },
      { label: "Software Installation", value: 1 },
      { label: "Account and Access", value: 1 },
      { label: "Hardware Issues", value: 1 },
      { label: "Email Issues", value: 1 },
    ],
    priorityDistribution: [
      { label: "High", percent: 40, className: "high" },
      { label: "Medium", percent: 40, className: "medium" },
      { label: "Low", percent: 20, className: "low" },
    ],
    weeklyTrend: {
      created: [12, 15, 10, 18, 14, 6, 4],
      resolved: [8, 10, 12, 14, 16, 8, 5],
    },
    tickets: [
      {
        ticketId: "#TKT101",
        user: "John Doe",
        issue: "VPN connection keeps dropping every 5 minutes",
        category: "Network and VPN",
        priority: "High",
        status: "In Progress",
        assignedTeam: "Network Team",
      },
      {
        ticketId: "#TKT102",
        user: "Jane Smith",
        issue: "Need Microsoft Office 365 installed on new laptop",
        category: "Software Installation",
        priority: "Medium",
        status: "Open",
        assignedTeam: "Software Team",
      },
      {
        ticketId: "#TKT103",
        user: "Mike Johnson",
        issue: "Cannot access shared drive after password reset",
        category: "Account and Access",
        priority: "High",
        status: "Resolved",
        assignedTeam: "Account Team",
      },
      {
        ticketId: "#TKT104",
        user: "Sarah Williams",
        issue: "Keyboard keys not responding properly",
        category: "Hardware Issues",
        priority: "Low",
        status: "Open",
        assignedTeam: "Hardware Team",
      },
      {
        ticketId: "#TKT105",
        user: "Robert Brown",
        issue: "Email not syncing on mobile device",
        category: "Email Issues",
        priority: "Medium",
        status: "In Progress",
        assignedTeam: "Account Team",
      },
    ],
  },
  manageTickets: {
    tickets: [
      {
        ticketId: "TKT-2014",
        issue: "Wi-Fi outage in Block C",
        priority: "High",
        status: "In Progress",
        assignedTeam: "Infrastructure",
      },
      {
        ticketId: "TKT-2015",
        issue: "Portal login failure",
        priority: "Medium",
        status: "New",
        assignedTeam: "Application Support",
      },
      {
        ticketId: "TKT-2016",
        issue: "Air conditioning leak",
        priority: "Low",
        status: "Resolved",
        assignedTeam: "Facilities",
      },
    ],
  },
  analytics: {
    summary: {
      new: 15,
      complete: 87,
      agents: 10,
      users: 12,
      tickets: 1266,
    },
    cards: [
      { title: "Ticket Trends", copy: "Open volume rose 14% this week, with peak load on Wednesday." },
      { title: "SLA Performance", copy: "94% of tickets met SLA, and high-priority breaches dropped to 6%." },
      { title: "Resolution Quality", copy: "Customer satisfaction remains steady at 4.7/5 with faster follow-ups." },
    ],
  },
  supportTeams: {
    teams: [
      {
        name: "Infrastructure",
        activeAgents: 4,
        scope: "Network, campus devices, internet stability",
      },
      {
        name: "Application Support",
        activeAgents: 3,
        scope: "Portal access, account resets, learning systems",
      },
      {
        name: "Facilities",
        activeAgents: 3,
        scope: "Classroom equipment, power, and environment",
      },
    ],
  },
};

let activeRange = "today";
let overviewTicketsState = [];
let updateToastTimer = null;

function resolveApiUrl(path) {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

async function fetchJsonOrFallback(path, fallbackData) {
  const url = resolveApiUrl(path);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } catch {
    return fallbackData;
  }
}

function toPriorityClass(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function closeAdminModal() {
  if (!adminTicketModal) return;
  adminTicketModal.classList.add("hidden");
}

function openAdminModal() {
  if (!adminTicketModal) return;
  adminTicketModal.classList.remove("hidden");
}

function showUpdateToast({ title, detail, tone = "success" }) {
  let toast = document.getElementById("adminUpdateToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminUpdateToast";
    toast.className = "admin-update-toast hidden";
    toast.innerHTML = `
      <div class="admin-update-toast-title"></div>
      <div class="admin-update-toast-detail"></div>
    `;
    document.body.appendChild(toast);
  }
  const titleEl = toast.querySelector(".admin-update-toast-title");
  const detailEl = toast.querySelector(".admin-update-toast-detail");
  if (titleEl) titleEl.textContent = title || "Updated";
  if (detailEl) detailEl.textContent = detail || "";
  toast.dataset.tone = tone;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  if (updateToastTimer) window.clearTimeout(updateToastTimer);
  updateToastTimer = window.setTimeout(() => {
    toast?.classList.remove("show");
    toast?.classList.add("hidden");
  }, 1400);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? "");
}

function buildLineCoordinates(values, height = 180, width = 700, maxValue = 1, startX = 20) {
  const safeValues = Array.isArray(values) && values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(maxValue, 1);
  const stepX = width / Math.max(safeValues.length - 1, 1);
  return safeValues.map((value, index) => {
    const x = startX + index * stepX;
    const y = 20 + height - (Number(value || 0) / max) * height;
    return { x: Math.round(x), y: Math.round(y), value: Number(value || 0), index };
  });
}

function buildPolylinePointsFromCoordinates(coords) {
  return coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
}

function getOrCreateChartTooltip() {
  let tooltip = document.getElementById("chartHoverTooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "chartHoverTooltip";
    tooltip.className = "chart-hover-tooltip hidden";
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function showChartTooltip(html, clientX, clientY) {
  const tooltip = getOrCreateChartTooltip();
  tooltip.innerHTML = html;
  tooltip.classList.remove("hidden");
  tooltip.classList.remove("line", "pie", "bar");
  const offset = 12;
  tooltip.style.left = `${clientX + offset}px`;
  tooltip.style.top = `${clientY + offset}px`;
}

function hideChartTooltip() {
  const tooltip = getOrCreateChartTooltip();
  tooltip.classList.add("hidden");
}

function bindHoverTooltip(element, formatter, variant = "") {
  if (!element) return;
  element.addEventListener("mousemove", (event) => {
    showChartTooltip(formatter(), event.clientX, event.clientY);
    const tooltip = getOrCreateChartTooltip();
    if (variant) tooltip.classList.add(variant);
  });
  element.addEventListener("mouseleave", hideChartTooltip);
}

function bindPieHoverTooltip(pieElement, priorities, totalTickets) {
  if (!pieElement || !Array.isArray(priorities) || !priorities.length) return;
  let progress = 0;
  const slices = priorities.map((item) => {
    const start = progress;
    progress += Number(item.percent || 0);
    return { ...item, start, end: progress };
  });

  pieElement.addEventListener("mousemove", (event) => {
    const rect = pieElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const radius = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      hideChartTooltip();
      return;
    }
    const degFromTopClockwise = (Math.atan2(dy, dx) * (180 / Math.PI) + 450) % 360;
    const percent = degFromTopClockwise / 3.6;
    const slice = slices.find((entry) => percent >= entry.start && percent < entry.end) || slices[0];
    const count = Math.round((Number(slice.percent || 0) / 100) * Number(totalTickets || 0));
    showChartTooltip(`${escapeHtml(slice.label)} : ${count}`, event.clientX, event.clientY);
    getOrCreateChartTooltip().classList.add("pie");
  });
  pieElement.addEventListener("mouseleave", hideChartTooltip);
}

function formatPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function animateOverviewCharts() {
  const bars = document.querySelectorAll("#overviewCategoryBars .mini-bar");
  bars.forEach((bar, index) => {
    bar.style.animationDelay = `${index * 90}ms`;
    bar.classList.remove("flow-rise");
    // force restart
    void bar.offsetWidth;
    bar.classList.add("flow-rise");
  });

  const pie = document.getElementById("overviewPriorityPie");
  if (pie) {
    pie.classList.remove("flow-spin");
    void pie.offsetWidth;
    pie.classList.add("flow-spin");
  }

  const lines = [
    document.getElementById("overviewCreatedLine"),
    document.getElementById("overviewResolvedLine"),
  ].filter(Boolean);

  lines.forEach((line, idx) => {
    if (!(line instanceof SVGGeometryElement)) return;
    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
    line.style.transition = "none";
    void line.getBoundingClientRect();
    const delay = 260 + idx * 260;
    line.style.transition = `stroke-dashoffset 1400ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
    line.style.strokeDashoffset = "0";
  });

  const points = document.querySelectorAll("#overviewTrendSvg .trend-point");
  points.forEach((point, index) => {
    point.classList.remove("flow-pop");
    point.setAttribute("style", `animation-delay:${760 + index * 44}ms`);
    void point.getBoundingClientRect();
    point.classList.add("flow-pop");
  });
}

function renderOverview(overviewData) {
  const metrics = overviewData?.metrics || {};
  setText("overviewTotalTickets", metrics.totalTickets ?? 0);
  setText("overviewOpenTickets", metrics.open ?? 0);
  setText("overviewInProgressTickets", metrics.inProgress ?? 0);
  setText("overviewResolvedTickets", metrics.resolved ?? 0);

  const bars = document.getElementById("overviewCategoryBars");
  const yAxis = document.getElementById("overviewCategoryYAxis");
  const xAxis = document.getElementById("overviewCategoryXAxis");
  if (bars) {
    const categories = Array.isArray(overviewData?.categoryDistribution) ? overviewData.categoryDistribution : [];
    const max = Math.max(...categories.map((item) => Number(item.value || 0)), 1);
    const total = categories.reduce((sum, item) => sum + Number(item.value || 0), 0);
    if (yAxis) {
      const ticks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
      yAxis.innerHTML = ticks.map((tick) => `<span>${tick}</span>`).join("");
    }
    if (xAxis) {
      xAxis.innerHTML = categories
        .map((item) => `<span title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>`)
        .join("");
    }
    bars.innerHTML = categories
      .map((item) => {
        const value = Number(item.value || 0);
        const heightPct = Math.max(12, Math.round((value / max) * 100));
        const share = formatPercent(value, total);
        return `<span class="mini-bar" data-label="${escapeHtml(item.label)}" data-value="${value}" data-share="${share}" style="height:${heightPct}%"></span>`;
      })
      .join("");
    bars.querySelectorAll(".mini-bar").forEach((bar) => {
      bindHoverTooltip(bar, () => {
        const label = bar.getAttribute("data-label") || "Category";
        const value = bar.getAttribute("data-value") || "0";
        return `${label}<br/>count : ${value}`;
      }, "bar");
    });
  }

  const priorityLegend = document.getElementById("overviewPriorityLegend");
  const priorityPie = document.getElementById("overviewPriorityPie");
  const priorities = Array.isArray(overviewData?.priorityDistribution)
    ? overviewData.priorityDistribution
    : [];
  if (priorityLegend) {
    priorityLegend.innerHTML = priorities
      .map(
        (item) =>
          `<p><span class="dot ${escapeHtml(item.className)}"></span>${escapeHtml(item.label)} ${escapeHtml(
            item.percent
          )}%</p>`
      )
      .join("");
    const totalTickets = Number(metrics.totalTickets || 0);
    priorityLegend.querySelectorAll("p").forEach((entry, index) => {
      const item = priorities[index];
      if (!item) return;
      bindHoverTooltip(entry, () => {
        const estCount = Math.round((Number(item.percent || 0) / 100) * totalTickets);
        return `${escapeHtml(item.label)} : ${estCount}`;
      }, "pie");
    });
  }
  if (priorityPie && priorities.length) {
    let progress = 0;
    const gradientParts = priorities.map((item) => {
      const color =
        item.className === "high" ? "#ef4444" : item.className === "medium" ? "#f97316" : "#6b7280";
      const start = progress;
      progress += Number(item.percent || 0);
      return `${color} ${start}% ${progress}%`;
    });
    priorityPie.style.background = `conic-gradient(${gradientParts.join(", ")})`;
    bindPieHoverTooltip(priorityPie, priorities, Number(metrics.totalTickets || 0));
  }

  const createdLine = document.getElementById("overviewCreatedLine");
  const resolvedLine = document.getElementById("overviewResolvedLine");
  const trendSvg = document.getElementById("overviewTrendSvg");
  const trend = overviewData?.weeklyTrend || {};
  const createdValues = Array.isArray(trend.created) ? trend.created : [0, 0, 0, 0, 0, 0, 0];
  const resolvedValues = Array.isArray(trend.resolved) ? trend.resolved : [0, 0, 0, 0, 0, 0, 0];
  const trendMax = Math.max(...createdValues, ...resolvedValues, 1);
  const axisLeft = 20;
  const axisRight = 860;
  const plotStartX = axisLeft + 16;
  const chartPlotWidth = axisRight - plotStartX;
  const createdCoords = buildLineCoordinates(createdValues, 180, chartPlotWidth, trendMax, plotStartX);
  const resolvedCoords = buildLineCoordinates(resolvedValues, 180, chartPlotWidth, trendMax, plotStartX);
  if (createdLine) createdLine.setAttribute("points", buildPolylinePointsFromCoordinates(createdCoords));
  if (resolvedLine) resolvedLine.setAttribute("points", buildPolylinePointsFromCoordinates(resolvedCoords));

  if (trendSvg) {
    trendSvg
      .querySelectorAll(".trend-point, .trend-hit, .trend-axis, .trend-grid, .trend-label")
      .forEach((point) => point.remove());
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const appendSvg = (name, attrs = {}, className = "") => {
      const node = document.createElementNS("http://www.w3.org/2000/svg", name);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (className) node.setAttribute("class", className);
      trendSvg.appendChild(node);
      return node;
    };

    const axisTop = 20;
    const axisBottom = 200;
    appendSvg("line", { x1: axisLeft, y1: axisTop, x2: axisLeft, y2: axisBottom }, "trend-axis");
    appendSvg("line", { x1: axisLeft, y1: axisBottom, x2: axisRight, y2: axisBottom }, "trend-axis");
    for (let i = 0; i <= 4; i += 1) {
      const y = axisBottom - ((axisBottom - axisTop) / 4) * i;
      const value = Math.round((trendMax / 4) * i);
      appendSvg("line", { x1: axisLeft, y1: y, x2: axisRight, y2: y }, "trend-grid");
      const text = appendSvg("text", { x: 14, y: y + 4 }, "trend-label y");
      text.textContent = String(value);
    }
    createdCoords.forEach((coord, idx) => {
      const xLabel = appendSvg("text", { x: coord.x, y: 208 }, "trend-label x");
      xLabel.textContent = labels[idx] || `Day ${idx + 1}`;
    });

    createdCoords.forEach((coord, idx) => {
      const hit = appendSvg(
        "circle",
        { cx: coord.x, cy: coord.y, r: 13 },
        "trend-hit"
      );
      appendSvg("circle", { cx: coord.x, cy: coord.y, r: 5 }, "trend-point created");
      bindHoverTooltip(hit, () => {
        const resolved = Number(resolvedValues[idx] || 0);
        return `${labels[idx] || `Day ${idx + 1}`}<br/><span class="line-created-text">Created : ${
          coord.value
        }</span><br/><span class="line-resolved-text">Resolved : ${resolved}</span>`;
      }, "line");
    });
    resolvedCoords.forEach((coord, idx) => {
      const hit = appendSvg(
        "circle",
        { cx: coord.x, cy: coord.y, r: 13 },
        "trend-hit"
      );
      appendSvg("circle", { cx: coord.x, cy: coord.y, r: 5 }, "trend-point resolved");
      bindHoverTooltip(hit, () => {
        const created = Number(createdValues[idx] || 0);
        return `${labels[idx] || `Day ${idx + 1}`}<br/><span class="line-created-text">Created : ${
          created
        }</span><br/><span class="line-resolved-text">Resolved : ${coord.value}</span>`;
      }, "line");
    });
  }

  const ticketsBody = document.getElementById("overviewTicketsBody");
  if (ticketsBody) {
    const tickets = Array.isArray(overviewData?.tickets) ? overviewData.tickets : [];
    overviewTicketsState = tickets.map((ticket) => ({ ...ticket }));
    ticketsBody.innerHTML = tickets
      .map(
        (ticket) => `
          <tr>
            <td>${escapeHtml(ticket.ticketId)}</td>
            <td>${escapeHtml(ticket.user)}</td>
            <td>${escapeHtml(ticket.issue)}</td>
            <td>${escapeHtml(ticket.category)}</td>
            <td><span class="pill ${toPriorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span></td>
            <td>
              <select class="table-select" data-control="status" data-ticket-id="${escapeHtml(ticket.ticketId)}">
                ${overviewStatusOptions
                  .map(
                    (status) =>
                      `<option value="${escapeHtml(status)}" ${
                        status === ticket.status ? "selected" : ""
                      }>${escapeHtml(status)}</option>`
                  )
                  .join("")}
              </select>
            </td>
            <td>
              <select class="table-select" data-control="team" data-ticket-id="${escapeHtml(ticket.ticketId)}">
                ${overviewTeamOptions
                  .map(
                    (team) =>
                      `<option value="${escapeHtml(team)}" ${
                        team === ticket.assignedTeam ? "selected" : ""
                      }>${escapeHtml(team)}</option>`
                  )
                  .join("")}
              </select>
            </td>
            <td>
              <div class="table-actions">
                <button class="table-btn" type="button" data-control="view" data-ticket-id="${escapeHtml(
                  ticket.ticketId
                )}">View</button>
                <button class="table-btn update" type="button" data-control="update" data-ticket-id="${escapeHtml(
                  ticket.ticketId
                )}">Update</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  animateOverviewCharts();
}

function recalculateOverviewMetrics() {
  const total = overviewTicketsState.length;
  const open = overviewTicketsState.filter((ticket) => ticket.status === "Open").length;
  const inProgress = overviewTicketsState.filter((ticket) => ticket.status === "In Progress").length;
  const resolved = overviewTicketsState.filter((ticket) => ticket.status === "Resolved").length;
  setText("overviewTotalTickets", total);
  setText("overviewOpenTickets", open);
  setText("overviewInProgressTickets", inProgress);
  setText("overviewResolvedTickets", resolved);
}

async function persistOverviewTicketUpdate(ticket) {
  if (!API_BASE) return true;
  try {
    const [statusRes, teamRes] = await Promise.all([
      fetch(`${API_BASE}/api/admin/tickets/${encodeURIComponent(ticket.ticketId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: ticket.status }),
      }),
      fetch(`${API_BASE}/api/admin/tickets/${encodeURIComponent(ticket.ticketId)}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTeam: ticket.assignedTeam }),
      }),
    ]);
    return statusRes.ok && teamRes.ok;
  } catch {
    return false;
  }
}

function renderTicketDetails(ticket) {
  if (!adminTicketModalContent) return;
  adminTicketModalContent.innerHTML = `
    <div class="admin-modal-row"><b>Ticket ID</b><span>${escapeHtml(ticket.ticketId)}</span></div>
    <div class="admin-modal-row"><b>User</b><span>${escapeHtml(ticket.user || "N/A")}</span></div>
    <div class="admin-modal-row"><b>Issue</b><span>${escapeHtml(ticket.issue || "")}</span></div>
    <div class="admin-modal-row"><b>Category</b><span>${escapeHtml(ticket.category || "N/A")}</span></div>
    <div class="admin-modal-row"><b>Priority</b><span>${escapeHtml(ticket.priority || "N/A")}</span></div>
    <div class="admin-modal-row"><b>Status</b><span>${escapeHtml(ticket.status || "N/A")}</span></div>
    <div class="admin-modal-row"><b>Assigned Team</b><span>${escapeHtml(ticket.assignedTeam || "N/A")}</span></div>
  `;
}

function bindOverviewInteractions() {
  const ticketsBody = document.getElementById("overviewTicketsBody");
  if (!ticketsBody) return;

  ticketsBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const ticketId = String(target.dataset.ticketId || "");
    const ticket = overviewTicketsState.find((item) => item.ticketId === ticketId);
    if (!ticket) return;
    const control = String(target.dataset.control || "");
    if (control === "view") {
      renderTicketDetails(ticket);
      openAdminModal();
      return;
    }
    if (control !== "update") return;

    const row = target.closest("tr");
    if (!(row instanceof HTMLTableRowElement)) return;
    const statusSelect = row.querySelector('select[data-control="status"]');
    const teamSelect = row.querySelector('select[data-control="team"]');
    if (!(statusSelect instanceof HTMLSelectElement)) return;
    if (!(teamSelect instanceof HTMLSelectElement)) return;

    const prevStatus = ticket.status;
    const prevTeam = ticket.assignedTeam;
    const nextStatus = String(statusSelect.value || ticket.status);
    const nextTeam = String(teamSelect.value || ticket.assignedTeam);
    ticket.status = nextStatus;
    ticket.assignedTeam = nextTeam;
    recalculateOverviewMetrics();

    target.disabled = true;
    target.textContent = "Updating...";
    // TODO_BACKEND_REAL_DATA: these updates should persist with backend PATCH endpoints.
    persistOverviewTicketUpdate(ticket).then((ok) => {
      const changes = [];
      if (prevStatus !== nextStatus) changes.push(`Status: ${prevStatus} -> ${nextStatus}`);
      if (prevTeam !== nextTeam) changes.push(`Team: ${prevTeam} -> ${nextTeam}`);
      const detail = changes.length
        ? `${ticket.ticketId} | ${changes.join(" | ")}`
        : `${ticket.ticketId} | No field changes`;

      showUpdateToast({
        title: ok ? "Ticket updated" : "Saved locally",
        detail,
        tone: ok ? "success" : "warning",
      });
      target.disabled = false;
      target.textContent = "Update";
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.closeAdminModal === "true") closeAdminModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAdminModal();
  });
}

function renderManageTickets(data) {
  const manageBody = document.getElementById("manageTicketsBody");
  if (!manageBody) return;
  const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
  manageBody.innerHTML = tickets
    .map(
      (ticket) => `
      <tr>
        <td>${escapeHtml(ticket.ticketId)}</td>
        <td>${escapeHtml(ticket.issue)}</td>
        <td><span class="pill ${toPriorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span></td>
        <td>${escapeHtml(ticket.status)}</td>
        <td>${escapeHtml(ticket.assignedTeam)}</td>
      </tr>
    `
    )
    .join("");
}

function renderAnalytics(data) {
  const summary = data?.summary || {};
  setText("analyticsNewCount", summary.new ?? 0);
  setText("analyticsCompleteCount", summary.complete ?? 0);
  setText("analyticsAgentsCount", summary.agents ?? 0);
  setText("analyticsUsersCount", summary.users ?? 0);
  setText("analyticsTicketsCount", summary.tickets ?? 0);

  const cards = document.getElementById("analyticsCards");
  if (!cards) return;
  const entries = Array.isArray(data?.cards) ? data.cards : [];
  cards.innerHTML = entries
    .map(
      (item) => `
      <article class="analytic-card">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.copy)}</p>
      </article>
    `
    )
    .join("");
}

function renderSupportTeams(data) {
  const grid = document.getElementById("supportTeamsGrid");
  if (!grid) return;
  const teams = Array.isArray(data?.teams) ? data.teams : [];
  grid.innerHTML = teams
    .map(
      (team) => `
      <article class="team-card">
        <h4>${escapeHtml(team.name)}</h4>
        <p>${escapeHtml(team.activeAgents)} active agents</p>
        <small>${escapeHtml(team.scope)}</small>
      </article>
    `
    )
    .join("");
}

async function loadAdminData() {
  const [overviewRes, manageRes, analyticsRes, teamsRes] = await Promise.all([
    fetchJsonOrFallback(
      `/api/admin/overview?range=${encodeURIComponent(activeRange)}`,
      mockAdminData.overview
    ),
    fetchJsonOrFallback(
      `/api/admin/tickets?range=${encodeURIComponent(activeRange)}`,
      mockAdminData.manageTickets
    ),
    fetchJsonOrFallback(
      `/api/admin/analytics?range=${encodeURIComponent(activeRange)}`,
      mockAdminData.analytics
    ),
    fetchJsonOrFallback(
      `/api/admin/support_teams?range=${encodeURIComponent(activeRange)}`,
      mockAdminData.supportTeams
    ),
  ]);

  renderOverview(overviewRes);
  renderManageTickets(manageRes);
  renderAnalytics(analyticsRes);
  renderSupportTeams(teamsRes);
}

function activateAdminPage(pageId) {
  const safePageId = pages.some((page) => page.id === pageId) ? pageId : "overview";
  pages.forEach((page) => {
    page.classList.toggle("active", page.id === safePageId);
  });
  pageLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.pageLink === safePageId);
  });
}

pageLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const pageId = String(link.dataset.pageLink || "overview");
    activateAdminPage(pageId);
    window.history.replaceState(null, "", `#${pageId}`);
  });
});

const initialHashPage = window.location.hash.replace("#", "");
activateAdminPage(initialHashPage || "overview");

rangeButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const selectedRange = String(button.dataset.range || "today");
    activeRange = selectedRange;
    rangeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.range === selectedRange);
    });
    await loadAdminData();
  });
});

loadAdminData();
bindOverviewInteractions();
