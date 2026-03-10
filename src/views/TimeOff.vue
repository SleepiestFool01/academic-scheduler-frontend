<template>
  <div class="page-root">
    <div class="topnav">
      <div class="nav-left">
        <button class="back-btn" @click="router.push('/dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Dashboard
        </button>
        <div class="nav-logo">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="4" width="11" height="7" rx="2" fill="#FF1744"/>
            <rect x="15" y="4" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
            <rect x="2" y="14" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
            <rect x="15" y="14" width="11" height="7" rx="2" fill="#F0E6D3"/>
          </svg>
        </div>
        <h1 class="page-title">Time Off</h1>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab active">Requests</button>
      </div>
      <div class="nav-actions">
        <span class="pill muted">My pending: {{ myPending.length }}</span>
        <span v-if="isManager" class="pill muted">Team pending: {{ teamPending.length }}</span>
      </div>
    </div>

    <div class="content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Request time off</h2>
          <p class="panel-sub">Submit PTO or partial day coverage and track approvals</p>
        </div>
      </div>

      <div class="grid">
        <section class="card form-card">
          <div class="card-head">
            <div>
              <p class="card-eyebrow">Employee</p>
              <h3 class="card-title">New request</h3>
            </div>
            <div class="pill-row">
              <span class="pill muted">Auto notifies manager</span>
              <span class="pill muted">Adds to schedule</span>
            </div>
          </div>

          <form class="form" @submit.prevent="submitRequest">
            <div class="field-grid">
              <label class="field">
                <span>Type</span>
                <select v-model="form.type">
                  <option>PTO</option>
                  <option>Sick</option>
                  <option>Unpaid</option>
                  <option>Jury Duty</option>
                </select>
              </label>
              <label class="field">
                <span>Duration</span>
                <select v-model="form.duration">
                  <option value="full">Full day</option>
                  <option value="partial">Partial day</option>
                </select>
              </label>
              <label class="field">
                <span>Start date</span>
                <input type="date" v-model="form.startDate" required />
              </label>
              <label class="field">
                <span>End date</span>
                <input type="date" v-model="form.endDate" :min="form.startDate" required />
              </label>
              <label class="field" v-if="form.duration === 'partial'">
                <span>Start time</span>
                <input type="time" v-model="form.startTime" step="900" />
              </label>
              <label class="field" v-if="form.duration === 'partial'">
                <span>End time</span>
                <input type="time" v-model="form.endTime" step="900" />
              </label>
            </div>

            <label class="field block">
              <span>Notes for your manager</span>
              <textarea v-model="form.reason" rows="3" placeholder="Optional context: coverage, handoffs, urgency…"></textarea>
            </label>

            <div class="form-footer">
              <div class="alerts">
                <span class="error" v-if="formError">{{ formError }}</span>
                <span class="success" v-if="formSuccess">{{ formSuccess }}</span>
              </div>
              <button type="submit" class="primary" :disabled="saving">
                {{ saving ? "Sending…" : "Submit request" }}
              </button>
            </div>
          </form>
        </section>

        <section class="card list-card">
          <div class="card-head">
            <div>
              <p class="card-eyebrow">You</p>
              <h3 class="card-title">My requests</h3>
            </div>
            <div class="chips">
              <button class="chip" :class="{ active: myFilter === 'all' }" @click="myFilter = 'all'">All</button>
              <button class="chip" :class="{ active: myFilter === 'pending' }" @click="myFilter = 'pending'">
                Pending {{ myPending.length ? `(${myPending.length})` : "" }}
              </button>
            </div>
          </div>

          <div v-if="myRequests.length === 0" class="empty-card">
            <p class="empty-icon">📅</p>
            <p class="empty-title">No requests yet</p>
            <p class="empty-sub">Submit your first request using the form.</p>
          </div>

          <div v-else class="request-list">
            <div v-for="req in filteredMyRequests" :key="req.id" class="request-card">
              <div class="req-info">
                <div class="badge">{{ req.type }}</div>
                <div class="req-dates">
                  <span class="req-range">{{ formatRange(req) }}</span>
                  <span class="req-sub">{{ req.duration === 'partial' ? formatTimeRange(req) : 'Full day' }}</span>
                </div>
                <p v-if="req.reason" class="req-note">{{ req.reason }}</p>
              </div>
              <span class="status-badge" :class="req.status">{{ req.status }}</span>
            </div>
          </div>
        </section>
      </div>

      <section v-if="isManager" class="card manager-card">
        <div class="card-head">
          <div>
            <p class="card-eyebrow">Manager</p>
            <h3 class="card-title">Approval queue</h3>
          </div>
          <div class="chips">
            <button class="chip" :class="{ active: managerFilter === 'pending' }" @click="managerFilter = 'pending'">
              Pending {{ teamPending.length ? `(${teamPending.length})` : "" }}
            </button>
            <button class="chip" :class="{ active: managerFilter === 'all' }" @click="managerFilter = 'all'">All</button>
          </div>
        </div>

        <div v-if="teamLoading" class="loading-inline">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="displayedTeam.length === 0" class="empty-card">
          <p class="empty-icon">✓</p>
          <p class="empty-title">No pending requests</p>
          <p class="empty-sub">Your team is all set.</p>
        </div>
        <div v-else class="request-list">
          <div v-for="req in displayedTeam" :key="req.id" class="request-card manager">
            <div class="request-card-left">
              <div class="emp-avatar" :style="{ background: colorFor(req.id_employee) }">
                {{ initialsFor(req.id_employee) }}
              </div>
              <div class="request-info">
                <p class="request-emp">{{ nameFor(req.id_employee) }}</p>
                <p class="request-type">{{ req.type }}</p>
                <p class="req-sub">{{ formatRange(req) }} • {{ req.duration === 'partial' ? formatTimeRange(req) : 'Full day' }}</p>
              </div>
            </div>
            <span class="status-badge" :class="req.status">{{ req.status }}</span>
            <div class="req-actions" v-if="req.status === 'pending'">
              <button class="approve-btn" @click="updateStatus(req, 'approved')">✓ Approve</button>
              <button class="deny-btn" @click="updateStatus(req, 'denied')">✕ Deny</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import apiClient from "../services/services.js";
import { fmtHour, timeStrToHour } from "../services/employeeManagementService.js";

const router = useRouter();
const currentUser = ref(Utils.getStore("user") || {});
const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);

const form = ref({
  type: "PTO",
  duration: "full",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "17:00",
  reason: "",
});

const saving = ref(false);
const formError = ref("");
const formSuccess = ref("");

const myRequests = ref([]);
const teamRequests = ref([]);
const teamLoading = ref(false);
const myFilter = ref("all");
const managerFilter = ref("pending");

const palette = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
const colorFor = (id) => palette[(id || 0) % palette.length];
const initialsFor = (id) => {
  const e = employeeMap.value[id];
  return e ? `${e.fName?.[0] ?? "?"}${e.lName?.[0] ?? ""}` : "??";
};
const nameFor = (id) => {
  const e = employeeMap.value[id];
  return e ? `${e.fName} ${e.lName}` : `Employee #${id}`;
};

const employeeMap = ref({});

const myPending = computed(() => myRequests.value.filter(r => r.status === "pending"));
const teamPending = computed(() => teamRequests.value.filter(r => r.status === "pending"));

const filteredMyRequests = computed(() => {
  return myFilter.value === "pending"
    ? myRequests.value.filter(r => r.status === "pending")
    : myRequests.value;
});

const displayedTeam = computed(() => {
  return managerFilter.value === "pending"
    ? teamRequests.value.filter(r => r.status === "pending")
    : teamRequests.value;
});

const uniqueId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function normalizeTime(t) {
  if (!t) return "00:00:00";
  return t.length === 5 ? `${t}:00` : t;
}

function formatRange(req) {
  if (!req.startDate || !req.endDate) return "—";
  const opts = { month: "short", day: "numeric" };
  const start = new Date(req.startDate);
  const end = new Date(req.endDate);
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", opts);
  return startStr === endStr ? startStr : `${startStr} → ${endStr}`;
}

function formatTimeRange(req) {
  if (req.duration !== "partial") return "Full day";
  const start = fmtHour(timeStrToHour(req.startTime));
  const end = fmtHour(timeStrToHour(req.endTime));
  return `${start} – ${end}`;
}

function shapeRequest(raw) {
  return {
    ...raw,
    id: raw.id_personalAvailability || uniqueId(),
    type: raw.type || "PTO",
    duration: raw.duration || "full",
    reason: raw.reason || raw.notes || "",
    status: raw.status || "pending",
  };
}

async function loadEmployees() {
  try {
    const res = await apiClient.get("/employees");
    const map = {};
    for (const e of res.data || []) map[e.id_employee] = e;
    employeeMap.value = map;
  } catch (_) { /* non-blocking */ }
}

async function loadMine() {
  if (!currentUser.value?.id_employee) return;
  try {
    const res = await apiClient.get(`/personal-availability/employees/${currentUser.value.id_employee}`);
    myRequests.value = (res.data || []).map(shapeRequest);
  } catch (err) {
    formError.value = err.message || "Could not load your requests.";
  }
}

async function loadTeam() {
  if (!isManager.value) return;
  teamLoading.value = true;
  try {
    const res = await apiClient.get("/personal-availability");
    teamRequests.value = (res.data || []).map(shapeRequest);
  } catch (_) {
    // silently ignore for now
  } finally {
    teamLoading.value = false;
  }
}

async function submitRequest() {
  formError.value = "";
  formSuccess.value = "";

  if (!form.value.startDate || !form.value.endDate) {
    formError.value = "Please select a start and end date.";
    return;
  }
  if (form.value.duration === "partial" && !form.value.startTime) {
    formError.value = "Partial day requests need a start time.";
    return;
  }
  saving.value = true;
  try {
    const payload = {
      id_employee: currentUser.value.id_employee,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      startTime: normalizeTime(form.value.duration === "full" ? "00:00" : form.value.startTime),
      endTime: normalizeTime(form.value.duration === "full" ? "23:59" : (form.value.endTime || form.value.startTime)),
      type: form.value.type,
      duration: form.value.duration,
      reason: form.value.reason,
      status: "pending",
    };
    const res = await apiClient.post(`/personal-availability/employees/${currentUser.value.id_employee}`, payload);
    const shaped = shapeRequest({ ...payload, ...res.data });
    myRequests.value.unshift(shaped);
    if (isManager.value) teamRequests.value.unshift(shaped);
    formSuccess.value = "Request sent to your manager.";
    form.value.reason = "";
  } catch (err) {
    formError.value = err?.response?.data?.message || err.message || "Could not submit request.";
  } finally {
    saving.value = false;
  }
}

async function updateStatus(req, status) {
  const idx = teamRequests.value.findIndex(r => r.id === req.id);
  if (idx !== -1) {
    teamRequests.value[idx] = { ...teamRequests.value[idx], status };
  }
  if (req.id_employee === currentUser.value.id_employee) {
    const mIdx = myRequests.value.findIndex(r => r.id === req.id);
    if (mIdx !== -1) myRequests.value[mIdx] = { ...myRequests.value[mIdx], status };
  }
  try {
    await apiClient.put(`/personal-availability/employees/${req.id_employee}/${req.id_personalAvailability}`, {
      status,
    });
  } catch (_) {
    // keep optimistic UI even if backend ignores status
  }
}

onMounted(async () => {
  await Promise.all([loadEmployees(), loadMine(), loadTeam()]);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); color: var(--tx-primary); }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-size: 13px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); }
.nav-tabs { display: flex; gap: 2px; margin-left: 12px; }
.nav-tab { padding: 5px 14px; background: transparent; border: none; color: var(--tx-muted); font-size: 13px; border-radius: 6px; }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.nav-actions { margin-left: auto; display: flex; gap: 8px; }

.content { flex: 1; overflow-y: auto; padding: 28px 32px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.panel-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); }
.panel-sub { font-size: 13px; color: var(--tx-faint); }

.grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 16px; }

.card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 14px; padding: 18px; box-shadow: 0 18px 40px rgba(0,0,0,0.22); }
.form-card { min-height: 360px; }

.card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.card-eyebrow { color: var(--tx-faint); font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
.card-title { font-size: 18px; font-weight: 700; color: var(--tx-heading); }
.pill-row { display: flex; gap: 6px; flex-wrap: wrap; }

.form { display: flex; flex-direction: column; gap: 12px; }
.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--tx-secondary); }
.field span { font-weight: 600; color: var(--tx-heading); }
.field input,
.field select,
.field textarea { background: var(--bg-input); border: 1px solid var(--bdr-subtle); color: var(--tx-primary); padding: 10px 12px; border-radius: 10px; font-family: 'DM Sans', sans-serif; }
.field textarea { resize: vertical; }
.field.block { width: 100%; }

.form-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
.alerts { min-height: 18px; display: flex; gap: 8px; align-items: center; }
.primary { border: none; background: var(--accent); color: #fff; padding: 10px 16px; border-radius: 10px; cursor: pointer; font-weight: 700; }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { border: 1px solid var(--bdr-subtle); background: transparent; color: var(--tx-secondary); padding: 6px 10px; border-radius: 999px; cursor: pointer; font-size: 12px; }
.chip.active { background: var(--bg-active); color: var(--accent); border-color: var(--bdr-accent); }
.chip.ok { border-color: rgba(16,185,129,0.6); color: #22c55e; }
.chip.danger { border-color: rgba(239,68,68,0.7); color: #ef4444; }

.pill { padding: 6px 10px; border-radius: 999px; font-size: 12px; border: 1px solid var(--bdr-subtle); background: var(--bg-card); }
.pill.muted { color: var(--tx-muted); }

.request-list { display: flex; flex-direction: column; gap: 10px; }
.request-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--bdr-subtle); border-radius: 12px; background: var(--bg-card); }
.request-card.manager { align-items: center; }
.request-card-left { display: flex; align-items: center; gap: 12px; }
.emp-avatar { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; }
.request-info { display: flex; flex-direction: column; gap: 2px; }
.request-emp { font-size: 14px; font-weight: 600; color: var(--tx-heading); }
.request-type { font-size: 11px; color: var(--tx-muted); }

.req-info { display: flex; flex-direction: column; gap: 4px; }
.req-dates { display: flex; flex-direction: column; gap: 2px; }
.req-range { font-weight: 700; color: var(--tx-heading); }
.req-sub { color: var(--tx-muted); font-size: 12px; }
.req-note { color: var(--tx-secondary); font-size: 13px; }
.req-actions { display: flex; gap: 6px; }

.badge { padding: 6px 10px; border-radius: 10px; background: var(--accent-subtle); color: var(--accent); font-weight: 700; font-size: 12px; }

.status-badge { padding: 6px 12px; border-radius: 999px; font-size: 12px; text-transform: capitalize; border: 1px solid var(--bdr-subtle); color: var(--tx-secondary); }
.status-badge.pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.denied   { background: var(--deny-bg);  color: var(--err-text); }

.approve-btn { background: var(--ok-bg); border: none; color: var(--ok-text); padding: 6px 12px; border-radius: 8px; cursor: pointer; }
.deny-btn { background: var(--deny-bg); border: none; color: var(--err-text); padding: 6px 12px; border-radius: 8px; cursor: pointer; }

.empty-card { background: var(--bg-card); border: 1px dashed var(--bdr-subtle); border-radius: 12px; padding: 32px; text-align: center; color: var(--tx-muted); }
.empty-icon { font-size: 32px; margin-bottom: 6px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--tx-faint); margin-bottom: 4px; }
.empty-sub { font-size: 13px; color: var(--tx-ghost); }

.loading-inline { display: flex; justify-content: center; padding: 24px 0; }
.loading-spinner { width: 28px; height: 28px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error { color: #f87171; font-size: 12px; }
.success { color: #4ade80; font-size: 12px; }

@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr; }
  .form-card { grid-column: span 1; }
}
</style>
