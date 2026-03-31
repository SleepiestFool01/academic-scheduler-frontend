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
        <h1 class="page-title">Tradeboard</h1>
      </div>
      <div class="nav-right">
        <button v-if="isEmployee" class="primary-btn" @click="openPostModal">
          + Post Shift
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <div class="content">
      <!-- ── Manager view: Pending approvals + full board ── -->
      <template v-if="isManager">
        <!-- Pending approvals -->
        <div class="section" v-if="pendingRequests.length > 0">
          <div class="section-header">
            <h2 class="section-title">Pending Approvals
              <span class="badge">{{ pendingRequests.length }}</span>
            </h2>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Shift Date</th>
                  <th>Shift Time</th>
                  <th>Requested To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pendingRequests" :key="r.id_swapRequest">
                  <td><div class="emp-cell"><div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>{{ nameFor(r.id_employeeRequester) }}</div></td>
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td class="mono">{{ r.shiftTime }}</td>
                  <td><div class="emp-cell"><div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequested) }">{{ initialsFor(r.id_employeeRequested) }}</div>{{ nameFor(r.id_employeeRequested) }}</div></td>
                  <td><span class="status-badge pending">Pending</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="approve-btn" @click="updateStatus(r, 'Approved')">✓ Approve</button>
                      <button class="deny-btn"    @click="updateStatus(r, 'Denied')">✕ Deny</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="pendingRequests.length === 0" class="empty-card">
          <p class="empty-icon">✓</p>
          <p class="empty-title">No pending approvals</p>
          <p class="empty-sub">All swap requests have been handled.</p>
        </div>

        <!-- All requests history -->
        <div class="section">
          <h2 class="section-title">All Requests</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Shift Date</th>
                  <th>Requested To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in allRequests" :key="r.id_swapRequest">
                  <td>{{ nameFor(r.id_employeeRequester) }}</td>
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td>{{ nameFor(r.id_employeeRequested) }}</td>
                  <td><span class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span></td>
                </tr>
                <tr v-if="allRequests.length === 0">
                  <td colspan="4" class="empty-row">No swap requests yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ── Employee view: post shifts + see board ── -->
      <template v-if="isEmployee">
        <div class="section">
          <h2 class="section-title">Open Trades</h2>
          <p class="section-sub">Shifts posted by your coworkers that you can pick up.</p>

          <div class="trade-grid">
            <div v-for="r in openTrades" :key="r.id_swapRequest" class="trade-card">
              <div class="trade-card-top">
                <div class="emp-cell">
                  <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>
                  <div>
                    <p class="trade-name">{{ nameFor(r.id_employeeRequester) }}</p>
                    <p class="trade-label">wants to trade</p>
                  </div>
                </div>
                <span class="status-badge pending">Open</span>
              </div>
              <div class="trade-details">
                <div class="trade-detail-row">
                  <span class="detail-label">Date</span>
                  <span class="mono">{{ r.shiftDate }}</span>
                </div>
                <div class="trade-detail-row">
                  <span class="detail-label">Time</span>
                  <span class="mono">{{ r.shiftTime }}</span>
                </div>
              </div>
              <button v-if="r.id_employeeRequester !== currentUser.id_employee"
                class="take-btn" @click="takeShift(r)">
                Take this shift
              </button>
              <p v-else class="your-post">Your post</p>
            </div>
            <div v-if="openTrades.length === 0" class="empty-card">
              <p class="empty-icon">🔄</p>
              <p class="empty-title">No open trades</p>
              <p class="empty-sub">Post a shift below to start a trade.</p>
            </div>
          </div>
        </div>

        <!-- My requests -->
        <div class="section">
          <h2 class="section-title">My Requests</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Shift Date</th><th>Requested To</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in myRequests" :key="r.id_swapRequest">
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td>{{ nameFor(r.id_employeeRequested) }}</td>
                  <td><span class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span></td>
                </tr>
                <tr v-if="myRequests.length === 0">
                  <td colspan="3" class="empty-row">You haven't posted any trades yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Post shift modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="modal.open = false">
        <div class="modal">
          <h3 class="modal-title">Post a Shift for Trade</h3>
          <div class="form-group">
            <label>Select your shift to trade</label>
            <select v-model="modal.id_shift">
              <option v-for="s in myShifts" :key="s.id_shiftAssignment" :value="s.id_shift">
                {{ s.date }} · {{ s.startLabel }}–{{ s.endLabel }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Request trade with <span class="optional">(optional — leave blank to open to anyone)</span></label>
            <select v-model="modal.id_employeeRequested">
              <option value="">Open to anyone</option>
              <option v-for="e in otherEmployees" :key="e.id_employee" :value="e.id_employee">
                {{ e.fName }} {{ e.lName }}
              </option>
            </select>
          </div>
          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="modal.open = false">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving" @click="postShift">
              {{ modal.saving ? 'Posting…' : 'Post Shift' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import { useDepartment } from "../composables/useDepartment.js";
import apiClient from "../services/services.js";
import { timeStrToHour, fmtHour } from "../services/employeeManagementService.js";

const router      = useRouter();
const currentUser = Utils.getStore("user") || {};
const isManager   = computed(() => currentUser.role === "Manager" || currentUser.role === "Admin");
const isEmployee  = computed(() => currentUser.role === "Employee" || isManager.value);

const loading  = ref(false);
const apiError = ref("");

const employees    = ref([]);
const swapRequests = ref([]);
const myShifts     = ref([]);

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
const empMap  = ref({});

function colorFor(id)   { return COLORS[(id || 0) % COLORS.length]; }
function nameFor(id)    { const e = empMap.value[id]; return e ? `${e.fName} ${e.lName}` : `Employee #${id}`; }
function initialsFor(id){ const e = empMap.value[id]; return e ? `${e.fName[0]}${e.lName[0]}` : "?"; }

async function loadAll() {
  loading.value = true; apiError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const deptQs = deptId ? `?id_department=${deptId}` : "";
    const [empRes, swapRes, shiftRes, assignRes] = await Promise.all([
      apiClient.get(`/employees${deptQs}`),
      apiClient.get("/swap-requests"),
      apiClient.get(`/shifts${deptQs}`),
      apiClient.get("/shift-assignments"),
    ]);

    employees.value = empRes.data;
    empMap.value = {};
    for (const e of empRes.data) empMap.value[e.id_employee] = e;

    // Join shifts for display (only dept-filtered shifts)
    const shiftById = {};
    for (const s of shiftRes.data) shiftById[s.id_shift] = s;
    const deptShiftIds = new Set(shiftRes.data.map(s => s.id_shift));

    // Enrich swap requests with shift info — only show trades for this dept's shifts
    swapRequests.value = swapRes.data.filter(r => deptShiftIds.has(r.id_shift)).map(r => {
      const s = shiftById[r.id_shift];
      return {
        ...r,
        shiftDate: s?.date || "—",
        shiftTime: s ? `${fmtHour(timeStrToHour(s.startTime))}–${fmtHour(timeStrToHour(s.endTime))}` : "—",
      };
    });

    // My shifts (for posting a trade) — only dept's shifts
    myShifts.value = assignRes.data
      .filter(a => a.id_employee === currentUser.id_employee && deptShiftIds.has(a.id_shift))
      .map(a => {
        const s = shiftById[a.id_shift];
        if (!s) return null;
        const startHour = timeStrToHour(s.startTime);
        const endHour   = timeStrToHour(s.endTime);
        return {
          id_shift: a.id_shift,
          id_shiftAssignment: a.id_shiftAssignment,
          date: a.date,
          startLabel: fmtHour(startHour),
          endLabel:   fmtHour(endHour),
        };
      }).filter(Boolean);

  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

const { selectedDeptId } = useDepartment();
watch(selectedDeptId, loadAll);
onMounted(loadAll);

const pendingRequests = computed(() => swapRequests.value.filter(r => r.status === "Pending"));
const allRequests     = computed(() => swapRequests.value);
const openTrades      = computed(() => swapRequests.value.filter(r => r.status === "Pending"));
const myRequests      = computed(() => swapRequests.value.filter(r => r.id_employeeRequester === currentUser.id_employee));
const otherEmployees  = computed(() => employees.value.filter(e => e.id_employee !== currentUser.id_employee));

// ── Post shift modal ──
const modal = ref({ open: false, id_shift: null, id_employeeRequested: "", saving: false, error: "" });

function openPostModal() {
  modal.value = { open: true, id_shift: myShifts.value[0]?.id_shift || null, id_employeeRequested: "", saving: false, error: "" };
}

async function postShift() {
  if (!modal.value.id_shift) { modal.value.error = "Please select a shift."; return; }
  modal.value.saving = true; modal.value.error = "";
  try {
    const payload = {
      id_shift:             modal.value.id_shift,
      id_employeeRequester: currentUser.id_employee,
      id_employeeRequested: modal.value.id_employeeRequested || currentUser.id_employee,
      status: "Pending",
    };
    const { data } = await apiClient.post("/swap-requests", payload);
    const shift = myShifts.value.find(s => s.id_shift === modal.value.id_shift);
    swapRequests.value.push({
      ...data,
      shiftDate: shift?.date || "—",
      shiftTime: shift ? `${shift.startLabel}–${shift.endLabel}` : "—",
    });
    modal.value.open = false;
  } catch (err) {
    modal.value.error = err.message || "Failed to post shift.";
  } finally {
    modal.value.saving = false;
  }
}

async function takeShift(r) {
  try {
    await apiClient.put(`/swap-requests/${r.id_swapRequest}`, {
      ...r,
      id_employeeRequested: currentUser.id_employee,
      status: "Pending",
    });
    await loadAll();
  } catch (err) {
    apiError.value = "Failed to take shift: " + err.message;
  }
}

async function updateStatus(r, status) {
  try {
    await apiClient.put(`/swap-requests/${r.id_swapRequest}`, { ...r, status });
    const idx = swapRequests.value.findIndex(s => s.id_swapRequest === r.id_swapRequest);
    if (idx !== -1) swapRequests.value[idx] = { ...swapRequests.value[idx], status };
  } catch (err) {
    apiError.value = "Failed to update request: " + err.message;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.nav-right { margin-left: auto; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); }
.primary-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.primary-btn:hover { background: var(--accent-hover); }

.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }

.content { flex: 1; overflow-y: auto; padding: 32px 36px; display: flex; flex-direction: column; gap: 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.section { max-width: 1000px; width: 100%; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: 700; color: var(--tx-heading); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.section-sub { font-size: 13px; color: var(--tx-faint); margin-bottom: 16px; margin-top: -10px; }
.badge { background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 100px; }

.table-wrap { border-radius: 12px; border: 1px solid var(--bdr-subtle); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-surface); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.empty-row { text-align: center; color: var(--tx-ghost); font-style: italic; padding: 32px 0 !important; }
.mono { font-family: 'DM Mono', monospace; font-size: 12px; }

.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }

.status-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
.status-badge.pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.denied   { background: var(--deny-bg);  color: var(--err-text); }

.action-btns { display: flex; gap: 6px; }
.approve-btn { background: var(--ok-bg); border: none; color: var(--ok-text); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.approve-btn:hover { background: var(--ok-bg-h); }
.deny-btn { background: var(--deny-bg); border: none; color: var(--err-text); padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.deny-btn:hover { background: var(--deny-bg-h); }

.trade-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.trade-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 18px; transition: border-color 0.15s; }
.trade-card:hover { border-color: var(--accent); }
.trade-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.trade-name { font-size: 14px; font-weight: 600; color: var(--tx-primary); }
.trade-label { font-size: 11px; color: var(--tx-faint); }
.trade-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.trade-detail-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--tx-muted); }
.detail-label { color: var(--tx-ghost); }
.take-btn { width: 100%; background: var(--accent-bg); border: 1px solid var(--accent-border); color: var(--accent); padding: 8px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.take-btn:hover { background: var(--accent-subtle); }
.your-post { font-size: 12px; color: var(--tx-ghost); text-align: center; font-style: italic; }

.empty-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 48px; text-align: center; }
.empty-icon { font-size: 32px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--tx-faint); margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: var(--tx-ghost); }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-group label { font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group select { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 100%; }
.form-group select:focus { border-color: var(--accent); }
.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.confirm-btn:hover { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>