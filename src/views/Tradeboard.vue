<template>
  <div class="page-root">

    <!-- ── Nav ── -->
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
        <div class="nav-divider"></div>
        <DeptSwitcher />
        <span class="page-title">Tradeboard</span>
      </div>
      <div class="nav-right">
        <button v-if="!isManager" class="primary-btn" @click="openPostModal">
          + Post Shift
        </button>
        <div v-if="currentUser" class="avatar" :title="`${currentUser.fName} ${currentUser.lName}`">
          <img v-if="currentUser.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer"/>
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </div>

    <!-- ── Loading / Error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading…</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <!-- ── Content ── -->
    <div v-if="!loading" class="content">

      <!-- ════════════════ MANAGER VIEW ════════════════ -->
      <template v-if="isManager">

        <!-- Needs Approval -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot" :class="needsApproval.length ? 'dot--warn' : 'dot--faint'"></span>
              <h2 class="section-title">Needs Approval</h2>
              <span v-if="needsApproval.length" class="section-badge badge--warn">{{ needsApproval.length }}</span>
              <span v-else class="section-badge">0</span>
            </div>
            <span class="section-sub">Claimed shifts awaiting your decision.</span>
          </div>

          <div v-if="needsApproval.length === 0" class="empty-card">
            <p class="empty-icon">✓</p>
            <p class="empty-title">All clear</p>
            <p class="empty-sub">No claimed shifts waiting for approval.</p>
          </div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Original Employee</th>
                  <th>New Employee</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Position</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in needsApproval" :key="r.id_swapRequest">
                  <td>
                    <div class="emp-cell">
                      <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>
                      {{ nameFor(r.id_employeeRequester) }}
                    </div>
                  </td>
                  <td>
                    <div class="emp-cell">
                      <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequested) }">{{ initialsFor(r.id_employeeRequested) }}</div>
                      {{ nameFor(r.id_employeeRequested) }}
                    </div>
                  </td>
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td class="mono">{{ r.shiftTime }}</td>
                  <td><span v-if="r.positionName" class="pos-badge">{{ r.positionName }}</span><span v-else class="tx-ghost">—</span></td>
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

        <!-- Open Board -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot dot--faint"></span>
              <h2 class="section-title">Open Board</h2>
              <span class="section-badge">{{ openBoard.length }}</span>
            </div>
            <span class="section-sub">Shifts posted but not yet claimed by anyone.</span>
          </div>

          <div v-if="openBoard.length === 0" class="empty-card">
            <p class="empty-text">No unclaimed shifts on the board.</p>
          </div>
          <div v-else class="trade-grid">
            <div v-for="r in openBoard" :key="r.id_swapRequest" class="trade-card">
              <div class="trade-card-top">
                <div class="emp-cell">
                  <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>
                  <div>
                    <p class="trade-name">{{ nameFor(r.id_employeeRequester) }}</p>
                    <p class="trade-label">posted this shift</p>
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
                <div v-if="r.positionName" class="trade-detail-row">
                  <span class="detail-label">Position</span>
                  <span class="pos-badge">{{ r.positionName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- History -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot dot--faint"></span>
              <h2 class="section-title">History</h2>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Original Employee</th>
                  <th>New Employee</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in allRequests" :key="r.id_swapRequest">
                  <td>{{ nameFor(r.id_employeeRequester) }}</td>
                  <td>{{ r.id_employeeRequested ? nameFor(r.id_employeeRequested) : '—' }}</td>
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td class="mono">{{ r.shiftTime }}</td>
                  <td><span class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span></td>
                </tr>
                <tr v-if="allRequests.length === 0">
                  <td colspan="5" class="empty-row">No trade requests yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>

      <!-- ════════════════ EMPLOYEE VIEW ════════════════ -->
      <template v-else>

        <!-- Open Trades -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot dot--accent"></span>
              <h2 class="section-title">Open Trades</h2>
              <span class="section-badge badge--accent">{{ openTrades.length }}</span>
            </div>
            <span class="section-sub">Shifts posted by coworkers. Claim one to take it — a manager will then approve or deny.</span>
          </div>

          <div v-if="openTrades.length === 0" class="empty-card">
            <p class="empty-icon"></p>
            <p class="empty-title">Nothing on the board</p>
            <p class="empty-sub">No shifts available right now.</p>
          </div>
          <div v-else class="trade-grid">
            <div v-for="r in openTrades" :key="r.id_swapRequest" class="trade-card"
              :class="{ 'trade-card--mine': r.id_employeeRequester === currentUser.id_employee }">
              <div class="trade-card-top">
                <div class="emp-cell">
                  <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>
                  <div>
                    <p class="trade-name">{{ nameFor(r.id_employeeRequester) }}</p>
                    <p class="trade-label">{{ r.id_employeeRequester === currentUser.id_employee ? 'Your post' : 'wants to trade' }}</p>
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
                <div v-if="r.positionName" class="trade-detail-row">
                  <span class="detail-label">Position</span>
                  <span class="pos-badge">{{ r.positionName }}</span>
                </div>
              </div>
              <button
                v-if="r.id_employeeRequester !== currentUser.id_employee"
                class="take-btn"
                @click="claimShift(r)">
                Take this shift
              </button>
              <button
                v-else
                class="withdraw-btn"
                @click="withdrawPost(r)">
                Withdraw post
              </button>
            </div>
          </div>
        </div>

        <!-- Awaiting Approval (shifts I've claimed) -->
        <div v-if="myClaims.length > 0" class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot dot--warn"></span>
              <h2 class="section-title">Awaiting Approval</h2>
              <span class="section-badge badge--warn">{{ myClaims.length }}</span>
            </div>
            <span class="section-sub">You've claimed these shifts. A manager will approve or deny.</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Original Employee</th><th>Date</th><th>Time</th><th>Position</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in myClaims" :key="r.id_swapRequest">
                  <td>
                    <div class="emp-cell">
                      <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequester) }">{{ initialsFor(r.id_employeeRequester) }}</div>
                      {{ nameFor(r.id_employeeRequester) }}
                    </div>
                  </td>
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td class="mono">{{ r.shiftTime }}</td>
                  <td><span v-if="r.positionName" class="pos-badge">{{ r.positionName }}</span><span v-else class="tx-ghost">—</span></td>
                  <td><span class="status-badge pending">Pending</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- My Posts history -->
        <div class="section">
          <div class="section-header">
            <div class="section-title-row">
              <span class="section-dot dot--faint"></span>
              <h2 class="section-title">My Posts</h2>
            </div>
            <span class="section-sub">Shifts you've put on the board.</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Date</th><th>Time</th><th>Position</th><th>Claimed By</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in myPosts" :key="r.id_swapRequest">
                  <td class="mono">{{ r.shiftDate }}</td>
                  <td class="mono">{{ r.shiftTime }}</td>
                  <td><span v-if="r.positionName" class="pos-badge">{{ r.positionName }}</span><span v-else class="tx-ghost">—</span></td>
                  <td>
                    <div v-if="r.id_employeeRequested" class="emp-cell">
                      <div class="emp-avatar" :style="{ background: colorFor(r.id_employeeRequested) }">{{ initialsFor(r.id_employeeRequested) }}</div>
                      {{ nameFor(r.id_employeeRequested) }}
                    </div>
                    <span v-else class="tx-ghost">Not yet claimed</span>
                  </td>
                  <td><span class="status-badge" :class="r.status.toLowerCase()">{{ r.status }}</span></td>
                </tr>
                <tr v-if="myPosts.length === 0">
                  <td colspan="5" class="empty-row">You haven't posted any shifts yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>

    <!-- ── Post Shift Modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="modal.open = false">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Post a Shift</h3>
            <button class="modal-close" @click="modal.open = false">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <p class="modal-desc">Select one of your shifts to post to the board. Coworkers can claim it and a manager will approve the swap.</p>
          <div class="form-group">
            <label>Your shift</label>
            <select v-model="modal.id_shift">
              <option disabled value="">Select a shift…</option>
              <option v-for="s in availableMyShifts" :key="s.id_shiftAssignment" :value="s.id_shift">
                {{ s.date }} · {{ s.startLabel }} – {{ s.endLabel }}{{ s.positionName ? ' · ' + s.positionName : '' }}
              </option>
            </select>
            <p v-if="availableMyShifts.length === 0" class="form-hint">You have no unposted upcoming shifts.</p>
          </div>
          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="modal.open = false">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving || !modal.id_shift" @click="postShift">
              {{ modal.saving ? 'Posting…' : 'Post to Tradeboard' }}
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
import { useTheme } from "../composables/useTheme.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
import apiClient from "../services/services.js";
import { timeStrToHour, fmtHour } from "../services/employeeManagementService.js";

useTheme();

const router      = useRouter();
const currentUser = ref(Utils.getStore("user") || {});
const isManager   = computed(() => currentUser.value.role === "Manager" || currentUser.value.role === "Admin");

const loading  = ref(false);
const apiError = ref("");

const employees    = ref([]);
const swapRequests = ref([]);
const myShifts     = ref([]);   // all shifts assigned to me (for posting)
const positions    = ref([]);

const empMap = ref({});
const posMap = ref({});

const { selectedDeptId, myDepts, loadDepts } = useDepartment();

const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u?.fName?.[0] ?? ""}${u?.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = ["#EF4444","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
function colorFor(id)    { return COLORS[(id || 0) % COLORS.length]; }
function nameFor(id)     { const e = empMap.value[id]; return e ? `${e.fName} ${e.lName}` : `Employee #${id}`; }
function initialsFor(id) { const e = empMap.value[id]; return e ? `${e.fName[0]}${e.lName[0]}` : "?"; }

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const deptQs = deptId ? `?id_department=${deptId}` : "";

    const [empRes, swapRes, shiftRes, assignRes, posRes] = await Promise.all([
      apiClient.get(`/employees${deptQs}`),
      apiClient.get("/swap-requests"),
      apiClient.get(`/shifts${deptQs}`),
      apiClient.get("/shift-assignments"),
      deptId ? apiClient.get(`/position?id_department=${deptId}`) : Promise.resolve({ data: [] }),
    ]);

    employees.value = empRes.data;
    empMap.value    = {};
    for (const e of empRes.data) empMap.value[e.id_employee] = e;

    positions.value = posRes.data;
    posMap.value    = {};
    for (const p of posRes.data) posMap.value[p.id_position] = p;

    const shiftById  = {};
    for (const s of shiftRes.data) shiftById[s.id_shift] = s;
    const deptShiftIds = new Set(shiftRes.data.map(s => s.id_shift));

    // Enrich swap requests — only show requests for this dept's shifts
    swapRequests.value = swapRes.data
      .filter(r => deptShiftIds.has(r.id_shift))
      .map(r => {
        const s = shiftById[r.id_shift];
        return {
          ...r,
          shiftDate:    s?.date || "—",
          shiftTime:    s ? `${fmtHour(timeStrToHour(s.startTime))} – ${fmtHour(timeStrToHour(s.endTime))}` : "—",
          positionName: s?.id_position ? posMap.value[s.id_position]?.name || "" : "",
        };
      });

    // My shifts: assigned to me, upcoming, not already posted to the board
    const postedShiftIds = new Set(
      swapRequests.value
        .filter(r => r.id_employeeRequester === currentUser.value.id_employee && r.status === "Pending")
        .map(r => r.id_shift)
    );

    myShifts.value = assignRes.data
      .filter(a => a.id_employee === currentUser.value.id_employee && deptShiftIds.has(a.id_shift) && a.date >= today)
      .map(a => {
        const s = shiftById[a.id_shift];
        if (!s) return null;
        return {
          id_shift:         a.id_shift,
          id_shiftAssignment: a.id_shiftAssignment,
          date:             a.date,
          startLabel:       fmtHour(timeStrToHour(s.startTime)),
          endLabel:         fmtHour(timeStrToHour(s.endTime)),
          positionName:     s.id_position ? posMap.value[s.id_position]?.name || "" : "",
          alreadyPosted:    postedShiftIds.has(a.id_shift),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));

  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

watch(selectedDeptId, loadAll);
onMounted(async () => {
  if (!myDepts.value.length) await loadDepts(currentUser.value);
  loadAll();
});

// ── Computed sections ─────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const isUpcoming = r => r.shiftDate >= today;

// Manager
const needsApproval = computed(() =>
  swapRequests.value.filter(r => isUpcoming(r) && r.status === "Pending" && r.id_employeeRequested != null)
);
const openBoard = computed(() =>
  swapRequests.value.filter(r => isUpcoming(r) && r.status === "Pending" && r.id_employeeRequested == null)
);
const allRequests = computed(() => swapRequests.value);

// Employee
const openTrades = computed(() =>
  // Unclaimed shifts: no claimer yet, still pending, upcoming only
  swapRequests.value.filter(r => isUpcoming(r) && r.status === "Pending" && r.id_employeeRequested == null)
);
const myClaims = computed(() =>
  // Shifts I've claimed, awaiting approval, upcoming only
  swapRequests.value.filter(r => isUpcoming(r) && r.status === "Pending" && r.id_employeeRequested === currentUser.value.id_employee)
);
const myPosts = computed(() =>
  swapRequests.value.filter(r => r.id_employeeRequester === currentUser.value.id_employee)
);

// Shifts I can post: assigned to me, not already on the board as pending
const availableMyShifts = computed(() =>
  myShifts.value.filter(s => !s.alreadyPosted)
);

// ── Post modal ────────────────────────────────────────────────────────────────
const modal = ref({ open: false, id_shift: "", saving: false, error: "" });

function openPostModal() {
  modal.value = { open: true, id_shift: availableMyShifts.value[0]?.id_shift || "", saving: false, error: "" };
}

async function postShift() {
  if (!modal.value.id_shift) { modal.value.error = "Please select a shift."; return; }
  modal.value.saving = true;
  modal.value.error  = "";
  try {
    const { data } = await apiClient.post("/swap-requests", {
      id_shift:             modal.value.id_shift,
      id_employeeRequester: currentUser.value.id_employee,
      id_employeeRequested: null,
      status:               "Pending",
    });
    const shift = myShifts.value.find(s => s.id_shift === modal.value.id_shift);
    swapRequests.value.push({
      ...data,
      shiftDate:    shift?.date || "—",
      shiftTime:    shift ? `${shift.startLabel} – ${shift.endLabel}` : "—",
      positionName: shift?.positionName || "",
    });
    // Mark as posted in myShifts so it disappears from the modal
    const ms = myShifts.value.find(s => s.id_shift === modal.value.id_shift);
    if (ms) ms.alreadyPosted = true;
    modal.value.open = false;
  } catch (err) {
    modal.value.error = err.response?.data?.message || err.message || "Failed to post shift.";
  } finally {
    modal.value.saving = false;
  }
}

// ── Claim a shift ─────────────────────────────────────────────────────────────
async function claimShift(r) {
  try {
    await apiClient.put(`/swap-requests/${r.id_swapRequest}`, {
      id_employeeRequested: currentUser.value.id_employee,
      status: "Pending",
    });
    // Update local state
    const idx = swapRequests.value.findIndex(s => s.id_swapRequest === r.id_swapRequest);
    if (idx !== -1) swapRequests.value[idx] = { ...swapRequests.value[idx], id_employeeRequested: currentUser.value.id_employee };
  } catch (err) {
    apiError.value = "Failed to claim shift: " + (err.message || "Network error");
  }
}

// ── Withdraw a post ───────────────────────────────────────────────────────────
async function withdrawPost(r) {
  try {
    await apiClient.delete(`/swap-requests/${r.id_swapRequest}`);
    swapRequests.value = swapRequests.value.filter(s => s.id_swapRequest !== r.id_swapRequest);
    const ms = myShifts.value.find(s => s.id_shift === r.id_shift);
    if (ms) ms.alreadyPosted = false;
  } catch (err) {
    apiError.value = "Failed to withdraw post: " + (err.message || "Network error");
  }
}

// ── Manager approve / deny ────────────────────────────────────────────────────
async function updateStatus(r, status) {
  try {
    await apiClient.put(`/swap-requests/${r.id_swapRequest}`, { status });
    const idx = swapRequests.value.findIndex(s => s.id_swapRequest === r.id_swapRequest);
    if (idx !== -1) swapRequests.value[idx] = { ...swapRequests.value[idx], status };
  } catch (err) {
    apiError.value = "Failed to update request: " + (err.message || "Network error");
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root {
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column;
  height: 100vh; overflow: hidden;
  background: var(--bg-page); color: var(--tx-primary);
}

/* ── Nav ── */
.topnav {
  display: flex; align-items: center; gap: 16px;
  padding: 0 24px; height: 56px; flex-shrink: 0;
  background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle);
}
.nav-left  { display: flex; align-items: center; gap: 12px; flex: 1; }
.nav-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); }
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--tx-muted);
  font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s;
}
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 15px; font-weight: 700; color: var(--tx-heading); }
.primary-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s;
}
.primary-btn:hover { background: var(--accent-hover); }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

/* ── Loading / Error ── */
.loading-overlay {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
}
.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--bdr-subtle); border-top-color: var(--accent);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner {
  background: var(--err-bg); border-bottom: 1px solid var(--err-border);
  color: var(--err-text); font-size: 12px; padding: 8px 24px;
  display: flex; align-items: center; gap: 12px;
}
.retry-btn {
  background: none; border: 1px solid var(--err-text); color: var(--err-text);
  padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
}

/* ── Content ── */
.content {
  flex: 1; overflow-y: auto;
  padding: 32px 36px;
  display: flex; flex-direction: column; gap: 40px;
}
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

/* ── Sections ── */
.section { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; }
.section-header { display: flex; flex-direction: column; gap: 4px; padding-bottom: 12px; border-bottom: 1px solid var(--bdr-subtle); }
.section-title-row { display: flex; align-items: center; gap: 10px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--tx-heading); }
.section-sub { font-size: 12px; color: var(--tx-faint); }

.section-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot--accent  { background: var(--accent); }
.dot--warn    { background: var(--warn-text); }
.dot--faint   { background: var(--tx-faint); }

.section-badge {
  font-size: 11px; font-weight: 600; color: var(--tx-faint);
  background: var(--bg-input); border: 1px solid var(--bdr-subtle);
  padding: 1px 8px; border-radius: 100px;
}
.badge--accent { background: var(--accent-bg); border-color: var(--accent-border); color: var(--accent); }
.badge--warn   { background: var(--warn-bg);   border-color: var(--warn-text);   color: var(--warn-text); }

/* ── Tables ── */
.table-wrap { border-radius: 12px; border: 1px solid var(--bdr-subtle); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-card); }
.data-table th {
  text-align: left; padding: 11px 16px;
  font-size: 10px; font-weight: 600; color: var(--tx-faint);
  text-transform: uppercase; letter-spacing: 0.08em;
  border-bottom: 1px solid var(--bdr-subtle);
}
.data-table td {
  padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong);
  color: var(--tx-secondary); vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-hover); }
.empty-row { text-align: center; color: var(--tx-ghost); font-style: italic; padding: 32px 0 !important; }

.mono { font-family: 'DM Mono', monospace; font-size: 12px; }

/* ── Employee cells ── */
.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
}

/* ── Badges ── */
.status-badge {
  display: inline-block; padding: 2px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
}
.status-badge.pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.denied   { background: var(--deny-bg);  color: var(--err-text); }

.pos-badge {
  display: inline-block; padding: 2px 9px;
  background: var(--bg-active); color: var(--tx-secondary);
  border: 1px solid var(--bdr-faint);
  border-radius: 100px; font-size: 11px; font-weight: 500;
}
.tx-ghost { color: var(--tx-ghost); font-style: italic; font-size: 12px; }

/* ── Action buttons ── */
.action-btns { display: flex; gap: 6px; }
.approve-btn {
  background: var(--ok-bg); border: none; color: var(--ok-text);
  padding: 5px 12px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s;
}
.approve-btn:hover { opacity: 0.8; }
.deny-btn {
  background: var(--deny-bg); border: none; color: var(--err-text);
  padding: 5px 12px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s;
}
.deny-btn:hover { opacity: 0.8; }

/* ── Trade cards ── */
.trade-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

.trade-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 12px; padding: 18px; transition: border-color 0.15s;
  display: flex; flex-direction: column; gap: 14px;
}
.trade-card:hover { border-color: var(--accent); }
.trade-card--mine { opacity: 0.75; }

.trade-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.trade-name  { font-size: 14px; font-weight: 600; color: var(--tx-primary); }
.trade-label { font-size: 11px; color: var(--tx-faint); margin-top: 2px; }

.trade-details { display: flex; flex-direction: column; gap: 6px; }
.trade-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
.detail-label { color: var(--tx-ghost); }

.take-btn {
  width: 100%; background: var(--accent-bg); border: 1px solid var(--accent-border);
  color: var(--accent); padding: 8px; border-radius: 8px;
  cursor: pointer; font-size: 13px; font-weight: 600;
  font-family: 'DM Sans', sans-serif; transition: background 0.15s;
}
.take-btn:hover { background: var(--accent-subtle); }

.withdraw-btn {
  width: 100%; background: none; border: 1px solid var(--bdr-medium);
  color: var(--tx-muted); padding: 8px; border-radius: 8px;
  cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: border-color 0.15s;
}
.withdraw-btn:hover { border-color: var(--err-text); color: var(--err-text); }

/* ── Empty cards ── */
.empty-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 12px; padding: 48px; text-align: center;
}
.empty-icon  { font-size: 28px; margin-bottom: 10px; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--tx-faint); margin-bottom: 6px; }
.empty-sub   { font-size: 12px; color: var(--tx-ghost); }
.empty-text  { font-size: 13px; color: var(--tx-faint); }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: var(--bg-moverlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-modal); border: 1px solid var(--bdr-medium);
  border-radius: 14px; padding: 28px; width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.modal-title  { font-size: 18px; font-weight: 700; color: var(--tx-primary); }
.modal-close  {
  background: none; border: none; color: var(--tx-muted); cursor: pointer; padding: 4px;
  border-radius: 6px; transition: color 0.15s;
}
.modal-close:hover { color: var(--tx-primary); }
.modal-desc { font-size: 12px; color: var(--tx-faint); margin-bottom: 20px; line-height: 1.5; }

.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-group label {
  font-size: 10px; color: var(--tx-dim); text-transform: uppercase;
  letter-spacing: 0.1em; font-weight: 600;
}
.form-group select {
  background: var(--bg-input); border: 1px solid var(--bdr-medium);
  color: var(--tx-primary); padding: 8px 10px; border-radius: 8px;
  font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 100%;
}
.form-group select:focus { border-color: var(--accent); }
.form-hint { font-size: 11px; color: var(--tx-ghost); font-style: italic; }

.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; transition: border-color 0.15s;
}
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s;
}
.confirm-btn:hover { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>
