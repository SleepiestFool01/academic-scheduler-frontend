<template>
  <div class="page-root">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">{{ apiError }}<button class="retry-btn" @click="loadAll">Retry</button></div>

    <div class="content">

      <template v-if="isAdminOrManager">
        <div class="sub-nav-bar">
          <div class="nav-tabs">
            <template v-if="requestType === 'timeoff'">
              <button class="nav-tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
                Pending
                <span v-if="pendingRequests.length > 0" class="tab-badge">{{ pendingRequests.length }}</span>
              </button>
              <button class="nav-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All</button>
            </template>
            <template v-else>
              <button class="nav-tab" :class="{ active: deptTab === 'pending' }" @click="deptTab = 'pending'">
                Pending
                <span v-if="pendingDeptRequests.length > 0" class="tab-badge">{{ pendingDeptRequests.length }}</span>
              </button>
              <button class="nav-tab" :class="{ active: deptTab === 'all' }" @click="deptTab = 'all'">All</button>
            </template>
          </div>
          <div class="nav-type-switch">
            <button class="type-btn" :class="{ active: requestType === 'timeoff' }" @click="requestType = 'timeoff'">Time Off</button>
            <button class="type-btn" :class="{ active: requestType === 'deptaccess' }" @click="loadDeptRequests(); requestType = 'deptaccess'">Dept Access</button>
          </div>
        </div>

        <template v-if="requestType === 'timeoff'">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">{{ activeTab === 'pending' ? 'Pending Time-Off Requests' : 'All Time-Off Requests' }}</h2>
              <p class="panel-sub">Review employee time-off requests for the selected department.</p>
            </div>
            <input v-model="search" class="search-input" placeholder="Search by employee…" />
          </div>

          <div v-if="displayedRequests.length === 0" class="empty-card">
            <p class="empty-icon">{{ activeTab === 'pending' ? '✓' : '📭' }}</p>
            <p class="empty-title">{{ activeTab === 'pending' ? 'No pending requests' : 'No requests yet' }}</p>
            <p class="empty-sub">{{ activeTab === 'pending' ? 'All caught up!' : 'Employee requests will appear here.' }}</p>
          </div>

          <div v-else class="requests-list">
            <div v-for="req in displayedRequests" :key="req.id_personalAvailability" class="request-card">
              <div class="request-card-left">
                <div class="emp-avatar" :style="{ background: colorFor(req.id_employee) }">
                  {{ initialsFor(req.id_employee) }}
                </div>
                <div class="request-info">
                  <p class="request-emp">{{ nameFor(req.id_employee) }}</p>
                  <p class="request-type">Time Off Request</p>
                </div>
              </div>

              <div class="request-dates">
                <div class="date-block">
                  <span class="date-label">From</span>
                  <span class="date-val mono">{{ req.startDate }}</span>
                  <span class="time-val mono">{{ fmtTime(req.startTime) }}</span>
                </div>
                <div class="date-arrow">→</div>
                <div class="date-block">
                  <span class="date-label">To</span>
                  <span class="date-val mono">{{ req.endDate }}</span>
                  <span class="time-val mono">{{ fmtTime(req.endTime) }}</span>
                </div>
              </div>

              <div class="request-actions">
                <span class="status-badge" :class="statusClass(req.status)">{{ displayStatus(req.status) }}</span>
                <template v-if="displayStatus(req.status) === 'Pending'">
                  <button class="approve-btn" @click="updateRequest(req, 'Approved')">✓ Approve</button>
                  <button class="deny-btn"    @click="updateRequest(req, 'Denied')">✕ Deny</button>
                </template>
                <button class="icon-action danger" title="Delete" @click="confirmDelete(req)">✕</button>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="panel-header">
            <div>
              <h2 class="panel-title">{{ deptTab === 'pending' ? 'Pending Department Requests' : 'All Department Requests' }}</h2>
              <p class="panel-sub">Manager requests to access additional departments</p>
            </div>
            <input v-model="deptSearch" class="search-input" placeholder="Search by manager…" />
          </div>

          <div v-if="deptLoading" class="loading-inline">
            <div class="loading-spinner"></div>
          </div>

          <div v-else-if="displayedDeptRequests.length === 0" class="empty-card">
            <p class="empty-icon">{{ deptTab === 'pending' ? '✓' : '📭' }}</p>
            <p class="empty-title">{{ deptTab === 'pending' ? 'No pending requests' : 'No requests yet' }}</p>
            <p class="empty-sub">{{ deptTab === 'pending' ? 'All caught up!' : 'Department access requests will appear here.' }}</p>
          </div>

          <div v-else class="requests-list">
            <div v-for="req in displayedDeptRequests" :key="req.id_departmentAccessRequest" class="request-card">
              <div class="request-card-left">
                <div class="emp-avatar" :style="{ background: colorFor(req.id_employeeRequester) }">
                  {{ initialsFor(req.id_employeeRequester) }}
                </div>
                <div class="request-info">
                  <p class="request-emp">{{ nameFor(req.id_employeeRequester) }}</p>
                  <p class="request-type">Department Access Request</p>
                </div>
              </div>

              <div class="dept-req-info">
                <span class="dept-req-label">Department</span>
                <span class="dept-req-name">{{ deptNameById(req.id_department) }}</span>
                <span v-if="req.message" class="dept-req-message">"{{ req.message }}"</span>
              </div>

              <div class="request-actions">
                <span class="status-badge" :class="req.status">{{ req.status }}</span>
                <template v-if="canApproveDeptRequest(req) && req.status === 'Pending'">
                  <button class="approve-btn" @click="approveDeptRequest(req)">✓ Approve</button>
                  <button class="deny-btn"    @click="denyDeptRequest(req)">✕ Deny</button>
                </template>
                <button v-if="canApproveDeptRequest(req)" class="icon-action danger" title="Delete" @click="confirmDeleteDeptReq(req)">✕</button>
              </div>
            </div>
          </div>
        </template>
      </template>

      <template v-else>
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Employee Requests</h2>
            <p class="panel-sub">Submit time off and track the status of your requests.</p>
          </div>
          <div class="nav-tabs employee-tabs">
            <button class="nav-tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
              Pending
              <span v-if="pendingRequests.length > 0" class="tab-badge">{{ pendingRequests.length }}</span>
            </button>
            <button class="nav-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All</button>
          </div>
        </div>

        <div class="request-form-card">
          <div class="request-form-header">
            <div>
              <h3 class="request-form-title">Submit Time Off</h3>
              <p class="request-form-sub">Approved requests will block scheduling conflicts and move overlapping shifts to the tradeboard.</p>
            </div>
            <label class="full-day-toggle">
              <input v-model="requestForm.fullDay" type="checkbox" />
              <span>Full day</span>
            </label>
          </div>

          <div class="request-form-grid">
            <label class="field-block">
              <span class="field-label">Start date</span>
              <input v-model="requestForm.startDate" class="field-input" type="date" />
            </label>
            <label class="field-block">
              <span class="field-label">End date</span>
              <input v-model="requestForm.endDate" class="field-input" type="date" />
            </label>
            <label class="field-block">
              <span class="field-label">Start time</span>
              <input v-model="requestForm.startTime" class="field-input" type="time" :disabled="requestForm.fullDay" />
            </label>
            <label class="field-block">
              <span class="field-label">End time</span>
              <input v-model="requestForm.endTime" class="field-input" type="time" :disabled="requestForm.fullDay" />
            </label>
          </div>

          <div v-if="requestForm.error" class="form-error">{{ requestForm.error }}</div>

          <div class="request-form-actions">
            <button class="approve-btn" :disabled="requestForm.saving" @click="submitTimeOffRequest">
              {{ requestForm.saving ? "Submitting..." : "Request Time Off" }}
            </button>
          </div>
        </div>

        <div v-if="displayedRequests.length === 0" class="empty-card">
          <p class="empty-icon">{{ activeTab === 'pending' ? '✓' : '📭' }}</p>
          <p class="empty-title">{{ activeTab === 'pending' ? 'No pending requests' : 'No requests yet' }}</p>
          <p class="empty-sub">Your submitted requests will appear here.</p>
        </div>

        <div v-else class="requests-list">
          <div v-for="req in displayedRequests" :key="req.id_personalAvailability" class="request-card">
            <div class="request-card-left">
              <div class="emp-avatar" :style="{ background: colorFor(req.id_employee) }">
                {{ initialsFor(req.id_employee) }}
              </div>
              <div class="request-info">
                <p class="request-emp">{{ nameFor(req.id_employee) }}</p>
                <p class="request-type">Time Off Request</p>
              </div>
            </div>

            <div class="request-dates">
              <div class="date-block">
                <span class="date-label">From</span>
                <span class="date-val mono">{{ req.startDate }}</span>
                <span class="time-val mono">{{ fmtTime(req.startTime) }}</span>
              </div>
              <div class="date-arrow">→</div>
              <div class="date-block">
                <span class="date-label">To</span>
                <span class="date-val mono">{{ req.endDate }}</span>
                <span class="time-val mono">{{ fmtTime(req.endTime) }}</span>
              </div>
            </div>

            <div class="request-actions">
              <span class="status-badge" :class="statusClass(req.status)">{{ displayStatus(req.status) }}</span>
              <button class="icon-action danger" title="Delete" @click="confirmDelete(req)">✕</button>
            </div>
          </div>
        </div>
      </template>

    </div>

    <!-- Delete confirm (time off) -->
    <Transition name="modal">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal">
          <h3 class="modal-title">Delete this request?</h3>
          <p class="modal-body-text">This will permanently remove the request from the system.</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="deleteConfirm.open = false">Cancel</button>
            <button class="confirm-btn danger" :disabled="deleteConfirm.saving" @click="executeDelete">
              {{ deleteConfirm.saving ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete confirm (dept access) -->
    <Transition name="modal">
      <div v-if="deleteDeptConfirm.open" class="modal-overlay" @click.self="deleteDeptConfirm.open = false">
        <div class="modal">
          <h3 class="modal-title">Delete this request?</h3>
          <p class="modal-body-text">This will permanently remove the department access request.</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="deleteDeptConfirm.open = false">Cancel</button>
            <button class="confirm-btn danger" :disabled="deleteDeptConfirm.saving" @click="executeDeptDelete">
              {{ deleteDeptConfirm.saving ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import Utils from "../config/utils.js";
import { useDepartment } from "../composables/useDepartment.js";
import { useNotifications } from "../composables/useNotifications.js";
import apiClient from "../services/services.js";
import { timeStrToHour, fmtHour } from "../services/employeeManagementService.js";
import {
  getDepartmentAccessRequests,
  updateDepartmentAccessRequest,
  deleteDepartmentAccessRequest,
  getAllDepartments,
} from "../services/departmentService.js";

const { dismiss: dismissNotification } = useNotifications();

const loading     = ref(false);
const apiError    = ref("");
const activeTab   = ref("pending");
const search      = ref("");
const requestType = ref("timeoff"); // "timeoff" | "deptaccess"

const currentUser       = ref(Utils.getStore("user"));
const isAdminOrManager  = computed(() =>
  currentUser.value?.role === "Admin" || currentUser.value?.role === "Manager"
);
const canReviewTimeOff = computed(() => isAdminOrManager.value);
const isAdmin = computed(() => currentUser.value?.role === "Admin");

const employees    = ref([]);
const availability = ref([]);
const empMap       = ref({});
const allDepts     = ref([]);
const requestForm  = ref({
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "17:00",
  fullDay: true,
  saving: false,
  error: "",
});

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
function colorFor(id)    { return COLORS[(id || 0) % COLORS.length]; }
function nameFor(id)     { const e = empMap.value[id]; return e ? `${e.fName} ${e.lName}` : `Employee #${id}`; }
function initialsFor(id) { const e = empMap.value[id]; return e ? `${e.fName[0]}${e.lName[0]}` : "?"; }
function fmtTime(t)      { if (!t) return "—"; return fmtHour(timeStrToHour(t)); }
function deptNameById(id) { return allDepts.value.find(d => d.id_department === Number(id))?.name || `Dept #${id}`; }
function displayStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "denied") return "Denied";
  return "Pending";
}
function statusClass(status) {
  return displayStatus(status).toLowerCase();
}
function toApiTime(value, fallback) {
  const time = value || fallback;
  return time && time.length === 5 ? `${time}:00` : time;
}
function resetRequestForm() {
  const today = new Date().toISOString().slice(0, 10);
  requestForm.value = {
    startDate: today,
    endDate: today,
    startTime: "09:00",
    endTime: "17:00",
    fullDay: true,
    saving: false,
    error: "",
  };
}

async function loadAll() {
  loading.value = true; apiError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const deptQs = deptId ? `?id_department=${deptId}` : "";
    const [empRes, availRes, deptRes] = await Promise.all([
      apiClient.get(`/employees${deptQs}`),
      apiClient.get("/personal-availability"),
      getAllDepartments(),
    ]);
    employees.value = empRes.data;
    empMap.value = {};
    for (const e of empRes.data) empMap.value[e.id_employee] = e;
    allDepts.value = deptRes.data || [];

    const deptEmpIds = new Set(empRes.data.map(e => e.id_employee));
    const allAvailability = (availRes.data || []).map(a => ({
      ...a,
      status: displayStatus(a.status),
    }));

    availability.value = canReviewTimeOff.value
      ? allAvailability.filter(a => deptEmpIds.has(a.id_employee))
      : allAvailability.filter(a => a.id_employee === currentUser.value?.id_employee);
  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}
const { selectedDeptId, myDepts, loadDepts } = useDepartment();
watch(selectedDeptId, loadAll);
watch(
  () => requestForm.value.fullDay,
  (isFullDay) => {
    if (isFullDay) {
      requestForm.value.startTime = "00:00";
      requestForm.value.endTime = "23:59";
    } else if (requestForm.value.startTime === "00:00" && requestForm.value.endTime === "23:59") {
      requestForm.value.startTime = "09:00";
      requestForm.value.endTime = "17:00";
    }
  }
);
onMounted(async () => {
  resetRequestForm();
  // Ensure myDepts is populated so we can filter dept-access requests
  // for managers who haven't visited a page that loads departments yet.
  if (!myDepts.value.length) await loadDepts(currentUser.value);
  loadAll();
});

const pendingRequests = computed(() => availability.value.filter(r => displayStatus(r.status) === "Pending"));

const displayedRequests = computed(() => {
  let list = activeTab.value === "pending" ? pendingRequests.value : availability.value;
  const q = search.value.toLowerCase();
  if (canReviewTimeOff.value && q) {
    list = list.filter(r => nameFor(r.id_employee).toLowerCase().includes(q));
  }
  return list;
});

async function submitTimeOffRequest() {
  requestForm.value.error = "";

  if (!currentUser.value?.id_employee) {
    requestForm.value.error = "Missing employee record.";
    return;
  }
  if (!requestForm.value.startDate || !requestForm.value.endDate) {
    requestForm.value.error = "Start and end dates are required.";
    return;
  }
  if (requestForm.value.endDate < requestForm.value.startDate) {
    requestForm.value.error = "End date cannot be before start date.";
    return;
  }

  const startTime = requestForm.value.fullDay ? "00:00:00" : toApiTime(requestForm.value.startTime, "09:00");
  const endTime = requestForm.value.fullDay ? "23:59:00" : toApiTime(requestForm.value.endTime, "17:00");
  if (!requestForm.value.fullDay && startTime >= endTime) {
    requestForm.value.error = "End time must be after start time.";
    return;
  }

  requestForm.value.saving = true;
  try {
    const { data } = await apiClient.post(
      `/personal-availability/employees/${currentUser.value.id_employee}`,
      {
        startDate: requestForm.value.startDate,
        endDate: requestForm.value.endDate,
        startTime,
        endTime,
        status: "Pending",
      }
    );
    availability.value = [{ ...data, status: displayStatus(data.status) }, ...availability.value];
    resetRequestForm();
  } catch (err) {
    requestForm.value.error = err.response?.data?.message || err.message || "Request failed.";
  } finally {
    requestForm.value.saving = false;
  }
}

async function updateRequest(req, status) {
  try {
    const { data } = await apiClient.put(
      `/personal-availability/employees/${req.id_employee}/${req.id_personalAvailability}`,
      { status }
    );
    const nextStatus = displayStatus(data?.data?.status || status);
    const idx = availability.value.findIndex(r => r.id_personalAvailability === req.id_personalAvailability);
    if (idx !== -1) availability.value[idx] = { ...availability.value[idx], status: nextStatus };
    // Keep the bell badge + nav-tab dot in sync with this action.
    dismissNotification("timeoff", req.id_personalAvailability);
  } catch (err) {
    apiError.value = "Update failed: " + (err.response?.data?.message || err.message || "Unknown error");
  }
}

const deleteConfirm = ref({ open: false, item: null, saving: false });

function confirmDelete(req) {
  deleteConfirm.value = { open: true, item: req, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  try {
    const removedId = deleteConfirm.value.item.id_personalAvailability;
    await apiClient.delete(`/personal-availability/${removedId}`);
    availability.value = availability.value.filter(
      r => r.id_personalAvailability !== removedId
    );
    dismissNotification("timeoff", removedId);
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + err.message;
    deleteConfirm.value.open = false;
  } finally {
    deleteConfirm.value.saving = false;
  }
}

// ── Department Access Requests ─────────────────────────────────────────────────
const deptRequests  = ref([]);
const deptLoading   = ref(false);
const deptTab       = ref("pending");
const deptSearch    = ref("");

// Map of every employee in the system, used to look up the requester's
// role when deciding whether a manager can approve a given request.
const allEmpRoles = ref({}); // { [id_employee]: role }

async function loadDeptRequests() {
  deptLoading.value = true;
  try {
    const [reqRes, empRes] = await Promise.all([
      getDepartmentAccessRequests({}),
      apiClient.get("/employees"),
    ]);
    deptRequests.value = reqRes.data || [];
    const map = {};
    for (const e of empRes.data || []) map[e.id_employee] = e.role;
    allEmpRoles.value = map;
  } catch { /* silent */ } finally {
    deptLoading.value = false;
  }
}

// Returns true if the current user is allowed to approve / deny the given
// dept-access request. Mirrors the backend authorization rules so the UI
// stays in sync.
function canApproveDeptRequest(req) {
  if (isAdmin.value) return true;
  if (currentUser.value?.role !== "Manager") return false;
  // Manager can only act on requests targeting their managed departments…
  const myDeptIds = new Set(myDepts.value.map(d => Number(d.id_department)));
  if (!myDeptIds.has(Number(req.id_department))) return false;
  // …and only when the requester is a regular Employee, not a Manager/Admin.
  const requesterRole = allEmpRoles.value[req.id_employeeRequester];
  return requesterRole && requesterRole !== "Manager" && requesterRole !== "Admin";
}

// Managers only see requests targeting departments they manage. Admins see
// all requests across the system.
const visibleDeptRequests = computed(() => {
  if (isAdmin.value) return deptRequests.value;
  const myDeptIds = new Set(myDepts.value.map(d => Number(d.id_department)));
  return deptRequests.value.filter(r => myDeptIds.has(Number(r.id_department)));
});

const pendingDeptRequests = computed(() =>
  visibleDeptRequests.value.filter(r => r.status === "Pending")
);

const displayedDeptRequests = computed(() => {
  let list = deptTab.value === "pending" ? pendingDeptRequests.value : visibleDeptRequests.value;
  const q = deptSearch.value.toLowerCase();
  if (q) list = list.filter(r => nameFor(r.id_employeeRequester).toLowerCase().includes(q));
  return list;
});

async function approveDeptRequest(req) {
  try {
    await updateDepartmentAccessRequest(req.id_departmentAccessRequest, { status: "Approved" });
    const idx = deptRequests.value.findIndex(r => r.id_departmentAccessRequest === req.id_departmentAccessRequest);
    if (idx !== -1) deptRequests.value[idx] = { ...deptRequests.value[idx], status: "Approved" };
    dismissNotification("deptaccess", req.id_departmentAccessRequest);
  } catch (err) {
    apiError.value = "Approve failed: " + (err.message || "Unknown error");
  }
}

async function denyDeptRequest(req) {
  try {
    await updateDepartmentAccessRequest(req.id_departmentAccessRequest, { status: "Denied" });
    const idx = deptRequests.value.findIndex(r => r.id_departmentAccessRequest === req.id_departmentAccessRequest);
    if (idx !== -1) deptRequests.value[idx] = { ...deptRequests.value[idx], status: "Denied" };
    dismissNotification("deptaccess", req.id_departmentAccessRequest);
  } catch (err) {
    apiError.value = "Deny failed: " + (err.message || "Unknown error");
  }
}

const deleteDeptConfirm = ref({ open: false, item: null, saving: false });

function confirmDeleteDeptReq(req) {
  deleteDeptConfirm.value = { open: true, item: req, saving: false };
}

async function executeDeptDelete() {
  deleteDeptConfirm.value.saving = true;
  try {
    const removedId = deleteDeptConfirm.value.item.id_departmentAccessRequest;
    await deleteDepartmentAccessRequest(removedId);
    deptRequests.value = deptRequests.value.filter(
      r => r.id_departmentAccessRequest !== removedId
    );
    dismissNotification("deptaccess", removedId);
    deleteDeptConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + err.message;
    deleteDeptConfirm.value.open = false;
  } finally {
    deleteDeptConfirm.value.saving = false;
  }
}
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'Satoshi', sans-serif; display: flex; flex-direction: column; flex: 1; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 15px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 18px; font-weight: 600; color: var(--tx-heading); }
.nav-tabs { display: flex; gap: 2px; margin-left: 16px; }
.nav-tab { position: relative; padding: 5px 14px; background: transparent; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 15px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; display: flex; align-items: center; gap: 6px; }
.nav-tab:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.tab-badge { background: var(--accent); color: #fff; font-size: 12px; font-weight: 700; padding: 1px 6px; border-radius: 100px; }

.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 15px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 14px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; }

.sub-nav-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--bdr-subtle); }
.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.panel-title { font-size: 24px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub { font-size: 15px; color: var(--tx-faint); }
.search-input { background: var(--bg-surface); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 14px; border-radius: 8px; font-size: 15px; font-family: 'Satoshi', sans-serif; outline: none; width: 240px; transition: border-color 0.15s; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-ghost); }
.request-form-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 14px; padding: 20px; margin-bottom: 18px; max-width: 1000px; }
.request-form-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.request-form-title { font-size: 18px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.request-form-sub { font-size: 14px; color: var(--tx-faint); max-width: 680px; }
.request-form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.field-block { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; color: var(--tx-ghost); text-transform: uppercase; letter-spacing: 0.08em; }
.field-input { background: var(--bg-page); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 10px 12px; border-radius: 8px; font-size: 14px; font-family: 'Satoshi', sans-serif; outline: none; }
.field-input:focus { border-color: var(--accent); }
.field-input:disabled { opacity: 0.6; cursor: not-allowed; }
.full-day-toggle { display: inline-flex; align-items: center; gap: 8px; color: var(--tx-muted); font-size: 14px; }
.request-form-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
.form-error { margin-top: 12px; color: var(--err-text); font-size: 14px; }

.requests-list { display: flex; flex-direction: column; gap: 10px; max-width: 1000px; }

.request-card { display: flex; align-items: center; gap: 20px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 18px 20px; transition: border-color 0.15s; flex-wrap: wrap; }
.request-card:hover { border-color: var(--bdr-accent); }

.request-card-left { display: flex; align-items: center; gap: 12px; min-width: 180px; }
.emp-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.request-emp { font-size: 16px; font-weight: 600; color: var(--tx-heading); margin-bottom: 2px; }
.request-type { font-size: 13px; color: var(--tx-faint); }

.request-dates { display: flex; align-items: center; gap: 16px; flex: 1; }
.date-block { display: flex; flex-direction: column; gap: 2px; }
.date-label { font-size: 12px; color: var(--tx-ghost); text-transform: uppercase; letter-spacing: 0.08em; }
.date-val { font-size: 15px; color: var(--tx-primary); }
.time-val { font-size: 13px; color: var(--tx-muted); }
.date-arrow { font-size: 18px; color: var(--tx-ghost); }
.mono { font-family: 'DM Mono', monospace; }

.request-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.status-badge { display: inline-block; padding: 3px 12px; border-radius: 100px; font-size: 13px; font-weight: 600; text-transform: capitalize; }
.status-badge.pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.denied   { background: var(--deny-bg);  color: var(--err-text); }
.approve-btn { background: var(--ok-bg); border: none; color: var(--ok-text); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
.approve-btn:hover { background: var(--ok-bg-h); }
.deny-btn { background: var(--deny-bg); border: none; color: var(--err-text); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
.deny-btn:hover { background: var(--deny-bg-h); }
.icon-action { background: var(--bdr-subtle); border: none; color: var(--tx-muted); width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.empty-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 64px; text-align: center; max-width: 600px; }
.empty-icon { font-size: 36px; margin-bottom: 12px; }
.empty-title { font-size: 20px; font-weight: 600; color: var(--tx-faint); margin-bottom: 8px; }
.empty-sub { font-size: 15px; color: var(--tx-ghost); }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 20px; font-weight: 700; color: var(--tx-primary); margin-bottom: 12px; }
.modal-body-text { font-size: 16px; color: var(--tx-muted); margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 15px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 15px; font-weight: 600; }
.confirm-btn.danger { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }

/* ── Request type switch ── */
.nav-type-switch { margin-left: auto; display: flex; gap: 2px; background: var(--bg-page); border: 1px solid var(--bdr-subtle); border-radius: 8px; padding: 3px; }
.type-btn { padding: 4px 14px; background: transparent; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 14px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; }
.type-btn:hover  { background: var(--bdr-subtle); color: var(--tx-secondary); }
.type-btn.active { background: var(--bg-surface); color: var(--accent); font-weight: 600; }

/* ── Dept request info ── */
.dept-req-info { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.dept-req-label { font-size: 12px; color: var(--tx-ghost); text-transform: uppercase; letter-spacing: 0.08em; }
.dept-req-name  { font-size: 16px; font-weight: 600; color: var(--tx-primary); }
.dept-req-message { font-size: 14px; color: var(--tx-muted); font-style: italic; }

/* ── Status badge ── */
.status-badge.Pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.Approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.Denied   { background: var(--deny-bg);  color: var(--err-text); }

/* ── Loading inline ── */
.loading-inline { display: flex; justify-content: center; padding: 40px; }

@media (max-width: 900px) {
  .request-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .request-form-header { flex-direction: column; }
  .request-form-grid { grid-template-columns: 1fr; }
}
</style>
