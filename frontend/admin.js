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
const sharedTicketView = window.QuickAidTicketView || {};
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
let allTicketsState = [];
let overviewTicketsState = [];
let updateToastTimer = null;
let overviewTrendChart = null;
let activeOverviewModalTicketId = "";
const selectedManageTicketIds = new Set();

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
  if (sharedTicketView.escapeHtml) return sharedTicketView.escapeHtml(value);
  return String(value || "");
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
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.tabIndex = 0;
    toast.innerHTML = `
      <div class="admin-update-toast-icon" aria-hidden="true"></div>
      <div class="admin-update-toast-body">
      <div class="admin-update-toast-title"></div>
      <div class="admin-update-toast-detail"></div>
      </div>
    `;
    toast.addEventListener("click", () => {
      toast.classList.remove("show");
      toast.classList.add("hidden");
    });
    document.body.appendChild(toast);
  }
  const titleEl = toast.querySelector(".admin-update-toast-title");
  const detailEl = toast.querySelector(".admin-update-toast-detail");
  if (titleEl) titleEl.textContent = title || "Updated";
  if (detailEl) {
    detailEl.textContent = detail || "";
    detailEl.classList.toggle("is-empty", !detail);
  }
  toast.dataset.tone = tone;
  toast.classList.remove("hidden");
  toast.classList.add("show");
  if (updateToastTimer) window.clearTimeout(updateToastTimer);
  const dismissMs = detail ? 2200 : 1700;
  updateToastTimer = window.setTimeout(() => {
    toast?.classList.remove("show");
    toast?.classList.add("hidden");
  }, dismissMs);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? "");
}

function parseTicketCreatedDate(ticket) {
  const value = ticket?.created_at || ticket?.submitted_at || ticket?.updated_at;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isTicketInActiveRange(ticket, range) {
  const createdDate = parseTicketCreatedDate(ticket);
  if (!createdDate) return false;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (range === "today") return createdDate >= todayStart && createdDate <= todayEnd;
  if (range === "week") {
    const weekStart = startOfDay(new Date(now));
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = endOfDay(new Date(weekStart));
    weekEnd.setDate(weekStart.getDate() + 6);
    return createdDate >= weekStart && createdDate <= weekEnd;
  }
  if (range === "month") {
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return createdDate >= monthStart && createdDate <= monthEnd;
  }
  if (range === "year") {
    const yearStart = startOfDay(new Date(now.getFullYear(), 0, 1));
    const yearEnd = endOfDay(new Date(now.getFullYear(), 11, 31));
    return createdDate >= yearStart && createdDate <= yearEnd;
  }
  return true;
}

function getOverviewTicketsByRange() {
  return allTicketsState.filter((ticket) => isTicketInActiveRange(ticket, activeRange));
}

function computeOverviewDataFromTickets(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const metrics = {
    totalTickets: list.length,
    open: list.filter((ticket) => ticket.status === "Open").length,
    inProgress: list.filter((ticket) => ticket.status === "In Progress").length,
    resolved: list.filter((ticket) => ticket.status === "Resolved").length,
  };
  const categoryMap = new Map();
  const priorityMap = new Map([
    ["High", 0],
    ["Medium", 0],
    ["Low", 0],
  ]);
  const createdByDay = new Array(7).fill(0);
  const resolvedByDay = new Array(7).fill(0);

  list.forEach((ticket) => {
    const category = String(ticket.category || "General");
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    const priority = String(ticket.priority || "Medium");
    if (priorityMap.has(priority)) priorityMap.set(priority, Number(priorityMap.get(priority)) + 1);
    const createdDate = parseTicketCreatedDate(ticket);
    if (createdDate) createdByDay[createdDate.getDay()] += 1;
    const updatedDate = new Date(ticket.updated_at || ticket.created_at || ticket.submitted_at);
    if (ticket.status === "Resolved" && !Number.isNaN(updatedDate.getTime())) {
      resolvedByDay[updatedDate.getDay()] += 1;
    }
  });

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const total = Math.max(metrics.totalTickets, 1);
  const priorityDistribution = ["High", "Medium", "Low"].map((label) => {
    const value = Number(priorityMap.get(label) || 0);
    const percent = Math.round((value / total) * 100);
    return {
      label,
      percent,
      className: label.toLowerCase(),
    };
  });
  return {
    metrics,
    categoryDistribution,
    priorityDistribution,
    weeklyTrend: {
      created: createdByDay.slice(1).concat(createdByDay[0]),
      resolved: resolvedByDay.slice(1).concat(resolvedByDay[0]),
    },
  };
}

function formatDateTime(value) {
  if (sharedTicketView.formatDateTime) return sharedTicketView.formatDateTime(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function toDetailPriorityClass(priority) {
  if (sharedTicketView.priorityClass) return sharedTicketView.priorityClass(priority);
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "urgent") return "priority-high";
  if (value === "low") return "priority-low";
  return "priority-medium";
}

function toBadgeClass(status) {
  if (sharedTicketView.badgeClass) return sharedTicketView.badgeClass(status);
  const value = String(status || "").toLowerCase().replaceAll(" ", "");
  if (value === "resolved" || value === "closed") return "badge-resolved";
  if (value === "inprogress") return "badge-inprogress";
  return "badge-new";
}

function syncOverviewRowControls(ticket) {
  const ticketsBody = document.getElementById("manageTicketsBody");
  if (!ticketsBody) return;
  const controls = Array.from(ticketsBody.querySelectorAll("[data-ticket-id]"));
  const control = controls.find((node) => String(node.getAttribute("data-ticket-id") || "") === String(ticket.ticketId));
  const row = control?.closest("tr");
  if (!(row instanceof HTMLTableRowElement)) return;
  const statusSelect = row.querySelector('select[data-control="status"]');
  const teamSelect = row.querySelector('select[data-control="team"]');
  const selectCheckbox = row.querySelector('input[data-control="select-ticket"]');
  if (statusSelect instanceof HTMLSelectElement) statusSelect.value = ticket.status;
  if (teamSelect instanceof HTMLSelectElement) teamSelect.value = ticket.assignedTeam;
  if (selectCheckbox instanceof HTMLInputElement) {
    selectCheckbox.checked = selectedManageTicketIds.has(String(ticket.ticketId));
  }
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

function renderOverviewTrendChart(createdValues, resolvedValues) {
  const canvas = document.getElementById("overviewTrendCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  if (typeof window.Chart === "undefined") return;

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (overviewTrendChart) {
    overviewTrendChart.destroy();
    overviewTrendChart = null;
  }

  const tooltipStyle = {
    backgroundColor: "#fff",
    borderColor: "#d5dee8",
    borderWidth: 1,
    titleColor: "#24303d",
    bodyColor: "#24303d",
    titleFont: { size: 13, weight: "600" },
    bodyFont: { size: 12 },
    padding: 10,
    displayColors: false,
  };

  overviewTrendChart = new window.Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Created",
          data: createdValues,
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f6",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 18,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          cubicInterpolationMode: "monotone",
          tension: 0.36,
        },
        {
          label: "Resolved",
          data: resolvedValues,
          borderColor: "#22c55e",
          backgroundColor: "#22c55e",
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 18,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          cubicInterpolationMode: "monotone",
          tension: 0.36,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: "easeOutCubic",
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            title: (items) => items?.[0]?.label || "",
            label: (context) => `${context.dataset.label} : ${context.formattedValue}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#6b7280", font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e5e7eb", borderDash: [2, 4] },
          ticks: { color: "#6b7280", font: { size: 12 }, precision: 0 },
        },
      },
    },
  });
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

  // Weekly trend now uses Chart.js canvas animation.
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

  const trend = overviewData?.weeklyTrend || {};
  const createdValues = Array.isArray(trend.created) ? trend.created : [0, 0, 0, 0, 0, 0, 0];
  const resolvedValues = Array.isArray(trend.resolved) ? trend.resolved : [0, 0, 0, 0, 0, 0, 0];
  renderOverviewTrendChart(createdValues, resolvedValues);

  animateOverviewCharts();
}

function recalculateOverviewMetrics() {
  overviewTicketsState = getOverviewTicketsByRange();
  renderOverview(computeOverviewDataFromTickets(overviewTicketsState));
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
  activeOverviewModalTicketId = ticket.ticketId;
  const extraSectionHtml = `
    <section class="detail-block">
      <h3>Admin Update Controls</h3>
      <div class="admin-modal-controls">
        <label>
          <span>Status</span>
          <select id="adminModalStatusSelect" class="table-select">
            ${overviewStatusOptions
              .map(
                (status) =>
                  `<option value="${escapeHtml(status)}" ${status === ticket.status ? "selected" : ""}>${escapeHtml(
                    status
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Assigned Team</span>
          <select id="adminModalTeamSelect" class="table-select">
            ${overviewTeamOptions
              .map(
                (team) =>
                  `<option value="${escapeHtml(team)}" ${team === ticket.assignedTeam ? "selected" : ""}>${escapeHtml(
                    team
                  )}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="detail-actions">
        <button class="table-btn update" type="button" data-modal-control="update-ticket">Update Ticket</button>
      </div>
    </section>
  `;
  adminTicketModalContent.innerHTML = sharedTicketView.renderTicketDetailLayout
    ? sharedTicketView.renderTicketDetailLayout(ticket, { extraSectionHtml })
    : "";
}

function bindOverviewInteractions() {
  const ticketsBody = document.getElementById("manageTicketsBody");
  if (!ticketsBody) return;

  ticketsBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const ticketId = String(target.dataset.ticketId || "");
    const ticket = allTicketsState.find((item) => item.ticketId === ticketId);
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

    const nextStatus = String(statusSelect.value || ticket.status);
    const nextTeam = String(teamSelect.value || ticket.assignedTeam);
    applyTicketChanges(ticket, nextStatus, nextTeam, target);
  });

  ticketsBody.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.control !== "select-ticket") return;
    const ticketId = String(target.dataset.ticketId || "");
    if (!ticketId) return;
    if (target.checked) selectedManageTicketIds.add(ticketId);
    else selectedManageTicketIds.delete(ticketId);
    const selectAll = document.getElementById("manageSelectAll");
    if (selectAll instanceof HTMLInputElement) {
      const rows = Array.from(ticketsBody.querySelectorAll('input[data-control="select-ticket"]'));
      selectAll.checked = rows.length > 0 && rows.every((checkbox) => checkbox instanceof HTMLInputElement && checkbox.checked);
    }
  });

  adminTicketModalContent?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.dataset.modalControl !== "update-ticket") return;
    const ticket = allTicketsState.find((item) => item.ticketId === activeOverviewModalTicketId);
    if (!ticket) return;
    const statusSelect = document.getElementById("adminModalStatusSelect");
    const teamSelect = document.getElementById("adminModalTeamSelect");
    if (!(statusSelect instanceof HTMLSelectElement)) return;
    if (!(teamSelect instanceof HTMLSelectElement)) return;

    const nextStatus = String(statusSelect.value || ticket.status);
    const nextTeam = String(teamSelect.value || ticket.assignedTeam);
    await applyTicketChanges(ticket, nextStatus, nextTeam, target);
  });

  const selectAllCheckbox = document.getElementById("manageSelectAll");
  selectAllCheckbox?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const checkboxes = Array.from(ticketsBody.querySelectorAll('input[data-control="select-ticket"]'));
    checkboxes.forEach((checkbox) => {
      if (!(checkbox instanceof HTMLInputElement)) return;
      checkbox.checked = target.checked;
      const ticketId = String(checkbox.dataset.ticketId || "");
      if (!ticketId) return;
      if (target.checked) selectedManageTicketIds.add(ticketId);
      else selectedManageTicketIds.delete(ticketId);
    });
  });

  const bulkAssignBtn = document.getElementById("bulkAssignBtn");
  bulkAssignBtn?.addEventListener("click", async () => {
    const statusEl = document.getElementById("bulkStatusSelect");
    const teamEl = document.getElementById("bulkTeamSelect");
    const nextStatus = statusEl instanceof HTMLSelectElement ? String(statusEl.value || "").trim() : "";
    const nextTeam = teamEl instanceof HTMLSelectElement ? String(teamEl.value || "").trim() : "";
    if (!nextStatus && !nextTeam) {
      showUpdateToast({ title: "No changes selected", detail: "Choose status, team, or both.", tone: "warning" });
      return;
    }
    const selectedTickets = allTicketsState.filter((ticket) => selectedManageTicketIds.has(String(ticket.ticketId)));
    if (!selectedTickets.length) {
      showUpdateToast({ title: "No tickets selected", detail: "Select at least one ticket.", tone: "warning" });
      return;
    }
    if (bulkAssignBtn instanceof HTMLButtonElement) {
      bulkAssignBtn.disabled = true;
      bulkAssignBtn.textContent = "Applying...";
    }
    await Promise.all(selectedTickets.map((ticket) => applyTicketChanges(ticket, nextStatus, nextTeam, null, true)));
    if (bulkAssignBtn instanceof HTMLButtonElement) {
      bulkAssignBtn.disabled = false;
      bulkAssignBtn.textContent = "Apply to Selected";
    }
    showUpdateToast({
      title: "Bulk update complete",
      detail: `${selectedTickets.length} ticket(s) updated.`,
      tone: "success",
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

function normalizeAdminTicket(ticket) {
  const source = ticket || {};
  const rawStatus = String(source.status || "Open");
  const normalizedStatus =
    rawStatus === "New" ? "Open" : rawStatus === "InProgress" ? "In Progress" : rawStatus;
  return {
    ticketId: source.ticketId || source.ticket_id || source.id || "N/A",
    user: source.user || source.name || source.requester || "N/A",
    issue: source.issue || source.subject || "No issue provided",
    category: source.category || source.department || "General",
    priority: source.priority || "Medium",
    status: normalizedStatus || "Open",
    assignedTeam: source.assignedTeam || source.assigned_to || source.assignedTo || "Unassigned",
    comments: Array.isArray(source.comments) ? source.comments : [],
    timeline: Array.isArray(source.timeline) ? source.timeline : [],
    created_at: source.created_at || source.submitted_at || source.updated_at || new Date().toISOString(),
    submitted_at: source.submitted_at || source.created_at || source.updated_at || new Date().toISOString(),
    updated_at: source.updated_at || source.updatedAt || source.created_at || new Date().toISOString(),
  };
}

function renderManageTickets(tickets) {
  const manageBody = document.getElementById("manageTicketsBody");
  if (!manageBody) return;
  const list = Array.isArray(tickets) ? tickets : [];
  manageBody.innerHTML = list
    .map(
      (ticket) => `
      <tr>
        <td>
          <input
            type="checkbox"
            data-control="select-ticket"
            data-ticket-id="${escapeHtml(ticket.ticketId)}"
            ${selectedManageTicketIds.has(String(ticket.ticketId)) ? "checked" : ""}
            aria-label="Select ticket ${escapeHtml(ticket.ticketId)}"
          />
        </td>
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
                  `<option value="${escapeHtml(status)}" ${status === ticket.status ? "selected" : ""}>${escapeHtml(
                    status
                  )}</option>`
              )
              .join("")}
          </select>
        </td>
        <td>
          <select class="table-select" data-control="team" data-ticket-id="${escapeHtml(ticket.ticketId)}">
            ${overviewTeamOptions
              .map(
                (team) =>
                  `<option value="${escapeHtml(team)}" ${team === ticket.assignedTeam ? "selected" : ""}>${escapeHtml(
                    team
                  )}</option>`
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

async function applyTicketChanges(ticket, nextStatus, nextTeam, triggerButton = null, suppressToast = false) {
  const prevStatus = ticket.status;
  const prevTeam = ticket.assignedTeam;
  ticket.status = nextStatus || ticket.status;
  ticket.assignedTeam = nextTeam || ticket.assignedTeam;
  ticket.updated_at = new Date().toISOString();
  recalculateOverviewMetrics();
  syncOverviewRowControls(ticket);
  if (activeOverviewModalTicketId === ticket.ticketId) renderTicketDetails(ticket);
  if (triggerButton instanceof HTMLButtonElement) {
    triggerButton.disabled = true;
    triggerButton.textContent = "Updating...";
  }
  const ok = await persistOverviewTicketUpdate(ticket);
  const changes = [];
  if (prevStatus !== ticket.status) changes.push(`Status: ${prevStatus} -> ${ticket.status}`);
  if (prevTeam !== ticket.assignedTeam) changes.push(`Team: ${prevTeam} -> ${ticket.assignedTeam}`);
  const detail = changes.length ? `${ticket.ticketId} | ${changes.join(" | ")}` : `${ticket.ticketId} | No field changes`;
  if (!suppressToast) {
    showUpdateToast({
      title: ok ? "Ticket updated" : "Saved locally",
      detail,
      tone: ok ? "success" : "warning",
    });
  }
  if (triggerButton instanceof HTMLButtonElement) {
    triggerButton.disabled = false;
    triggerButton.textContent = "Update";
  }
}

async function loadAdminData() {
  const [overviewRes, manageRes, analyticsRes, teamsRes] = await Promise.all([
    fetchJsonOrFallback(
      `/api/admin/overview?range=${encodeURIComponent(activeRange)}`,
      mockAdminData.overview
    ),
    fetchJsonOrFallback(
      `/api/admin/tickets`,
      mockAdminData.manageTickets
    ),
    fetchJsonOrFallback(
      `/api/admin/analytics`,
      mockAdminData.analytics
    ),
    fetchJsonOrFallback(
      `/api/admin/support_teams`,
      mockAdminData.supportTeams
    ),
  ]);

  void overviewRes;
  const overviewTickets = Array.isArray(overviewRes?.tickets) ? overviewRes.tickets : [];
  const manageTickets = Array.isArray(manageRes?.tickets) ? manageRes.tickets : [];
  const sourceTickets = overviewTickets.length ? overviewTickets : manageTickets;
  allTicketsState = sourceTickets.map((ticket) => normalizeAdminTicket(ticket));
  overviewTicketsState = getOverviewTicketsByRange();
  renderOverview(computeOverviewDataFromTickets(overviewTicketsState));
  renderManageTickets(allTicketsState);
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
  button.addEventListener("click", () => {
    const selectedRange = String(button.dataset.range || "today");
    activeRange = selectedRange;
    rangeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.range === selectedRange);
    });
    recalculateOverviewMetrics();
  });
});

loadAdminData();
bindOverviewInteractions();
