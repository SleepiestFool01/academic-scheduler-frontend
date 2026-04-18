import { ref, computed } from "vue";
import apiClient from "../services/services.js";
import Utils from "../config/utils.js";
import {
  getPendingTimeOff,
  getPendingSwaps,
  getPendingDeptAccess,
  updateSwapRequest,
  updateDeptAccess,
  updateTimeOffRequest,
} from "../services/notificationService.js";
import { useDepartment } from "./useDepartment.js";

const { myDepts, selectedDeptId } = useDepartment();

const timeOff    = ref([]);
const swaps      = ref([]);
const deptAccess = ref([]);

const loading  = ref(false);
const lastError = ref("");
// Bumped every time the bell resolves an item (approve / deny). Pages
// like Requests.vue and Tradeboard.vue watch this and re-fetch their
// own data, so a manager who acts from the bell while a page is open
// sees their page refresh without a manual reload.
const lastActionAt = ref(0);
function bumpAction() { lastActionAt.value = Date.now(); }

// Time-off has no persisted status in the backend — client-side dismissals
// are stored per-user in localStorage so approve/deny sticks across reloads.
function dismissKey() {
  const u = Utils.getStore("user");
  return u?.id_employee ? `dismissedTimeOff:${u.id_employee}` : null;
}
function loadDismissed() {
  const key = dismissKey();
  if (!key) return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveDismissed(set) {
  const key = dismissKey();
  if (key) localStorage.setItem(key, JSON.stringify([...set]));
}
function addDismissed(id) {
  const s = loadDismissed();
  s.add(id);
  saveDismissed(s);
}

async function refresh() {
  const user = Utils.getStore("user");
  if (!user || (user.role !== "Manager" && user.role !== "Admin")) return;
  loading.value = true;
  lastError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const deptQs = deptId ? `?id_department=${deptId}` : "";

    const [empRes, timeOffRes, swapRes, shiftRes, deptAccessRes, allEmpRes] = await Promise.all([
      apiClient.get(`/employees${deptQs}`),
      getPendingTimeOff(),
      getPendingSwaps(),
      apiClient.get(`/shifts${deptQs}`),
      getPendingDeptAccess(),
      apiClient.get("/employees"),
    ]);

    const empMap = {};
    for (const e of allEmpRes.data || []) empMap[e.id_employee] = e;

    const deptEmpIds = new Set((empRes.data || []).map(e => e.id_employee));
    const deptShiftIds = new Set((shiftRes.data || []).map(s => s.id_shift));

    const dismissed = loadDismissed();
    // Backend-status filter: only unresolved requests belong in the bell.
    // Normalize because the field may come back as any case ("Pending",
    // "pending", or empty for very old rows that predate the status
    // column).
    const isPending = (s) => {
      const v = String(s || "pending").toLowerCase();
      return v !== "approved" && v !== "denied";
    };
    timeOff.value = (timeOffRes.data || [])
      .filter(a => deptEmpIds.has(a.id_employee))
      .filter(a => isPending(a.status))
      .filter(a => !dismissed.has(a.id_personalAvailability))
      .map(a => ({ ...a, _employee: empMap[a.id_employee] }));

    swaps.value = (swapRes.data || [])
      .filter(r => r.status === "Pending" && r.id_employeeRequested != null)
      .filter(r => deptShiftIds.has(r.id_shift))
      .map(r => ({ ...r, _requester: empMap[r.id_employeeRequester], _requested: empMap[r.id_employeeRequested] }));

    const myDeptIds = new Set(myDepts.value.map(d => Number(d.id_department)));
    const isAdmin = user.role === "Admin";
    deptAccess.value = (deptAccessRes.data || [])
      .filter(r => r.status === "Pending")
      .filter(r => isAdmin || myDeptIds.has(Number(r.id_department)))
      .filter(r => {
        if (isAdmin) return true;
        const requesterRole = empMap[r.id_employeeRequester]?.role;
        return requesterRole && requesterRole !== "Manager" && requesterRole !== "Admin";
      })
      .map(r => ({ ...r, _requester: empMap[r.id_employeeRequester] }));
  } catch (err) {
    lastError.value = err?.message || "Failed to load notifications";
  } finally {
    loading.value = false;
  }
}

const totalCount = computed(() =>
  timeOff.value.length + swaps.value.length + deptAccess.value.length
);

const countsByRoute = computed(() => ({
  "/requests":   timeOff.value.length + deptAccess.value.length,
  "/tradeboard": swaps.value.length,
}));

async function approveSwap(item) {
  try {
    await updateSwapRequest(item.id_swapRequest, "Approved");
    swaps.value = swaps.value.filter(s => s.id_swapRequest !== item.id_swapRequest);
    bumpAction();
  } catch (err) { lastError.value = "Approve failed: " + err.message; }
}
async function denySwap(item) {
  try {
    await updateSwapRequest(item.id_swapRequest, "Denied");
    swaps.value = swaps.value.filter(s => s.id_swapRequest !== item.id_swapRequest);
    bumpAction();
  } catch (err) { lastError.value = "Deny failed: " + err.message; }
}
async function approveDeptAccess(item) {
  try {
    await updateDeptAccess(item.id_departmentAccessRequest, "Approved");
    deptAccess.value = deptAccess.value.filter(d => d.id_departmentAccessRequest !== item.id_departmentAccessRequest);
    bumpAction();
  } catch (err) { lastError.value = "Approve failed: " + err.message; }
}
async function denyDeptAccess(item) {
  try {
    await updateDeptAccess(item.id_departmentAccessRequest, "Denied");
    deptAccess.value = deptAccess.value.filter(d => d.id_departmentAccessRequest !== item.id_departmentAccessRequest);
    bumpAction();
  } catch (err) { lastError.value = "Deny failed: " + err.message; }
}
// Time-off now persists status on the backend (post-merge). The bell
// actually resolves the request instead of only dismissing it locally.
// `addDismissed` is kept as a belt-and-suspenders: if the PUT somehow
// doesn't stick the status, the local dismissed set still hides it from
// the bell's next poll.
async function approveTimeOff(item) {
  try {
    await updateTimeOffRequest(item, "Approved");
    addDismissed(item.id_personalAvailability);
    timeOff.value = timeOff.value.filter(t => t.id_personalAvailability !== item.id_personalAvailability);
    bumpAction();
  } catch (err) { lastError.value = "Approve failed: " + err.message; }
}
async function denyTimeOff(item) {
  try {
    await updateTimeOffRequest(item, "Denied");
    addDismissed(item.id_personalAvailability);
    timeOff.value = timeOff.value.filter(t => t.id_personalAvailability !== item.id_personalAvailability);
    bumpAction();
  } catch (err) { lastError.value = "Deny failed: " + err.message; }
}

// Remove a pending item from the shared notification state. Called by the
// source pages (Requests.vue, Tradeboard.vue) after they approve/deny/delete
// a request so the bell badge and nav-tab dots stay in sync with the page.
// For time-off (no backend status field) we also persist the dismissal so
// the next poll doesn't resurrect the item.
function dismiss(type, id) {
  if (id == null) return;
  if (type === "timeoff") {
    addDismissed(id);
    timeOff.value = timeOff.value.filter(t => t.id_personalAvailability !== id);
  } else if (type === "swap") {
    swaps.value = swaps.value.filter(s => s.id_swapRequest !== id);
  } else if (type === "deptaccess") {
    deptAccess.value = deptAccess.value.filter(d => d.id_departmentAccessRequest !== id);
  }
}

let pollHandle = null;
function startPolling(intervalMs = 60000) {
  stopPolling();
  refresh();
  pollHandle = setInterval(refresh, intervalMs);
}
function stopPolling() {
  if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
}

export function useNotifications() {
  return {
    timeOff, swaps, deptAccess,
    loading, lastError,
    totalCount, countsByRoute,
    lastActionAt,  // bumps after any approve/deny — pages watch to re-fetch
    refresh, startPolling, stopPolling,
    approveSwap, denySwap,
    approveDeptAccess, denyDeptAccess,
    approveTimeOff, denyTimeOff,
    dismiss,
  };
}
