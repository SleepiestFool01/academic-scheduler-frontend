<template>
  <div class="avail-root" @mousemove="onGlobalMouseMove" @mouseup="onGlobalMouseUp">
    <!-- ── Loading / Error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading availability…</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <div class="content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">My Availability</h2>
          <p class="panel-sub">
            Class schedule and other recurring commitments. Managers see this when building schedules —
            turn on <strong>Hide reason</strong> on any block you'd rather keep private.
          </p>
        </div>
        <div class="header-actions">
          <button class="secondary-btn" :disabled="syncing" @click="syncClassSchedule">
            <svg v-if="!syncing" width="14" height="14" viewBox="0 0 16 16" fill="none" style="margin-right:6px">
              <path d="M3 8a5 5 0 0 1 8.5-3.5M13 8a5 5 0 0 1-8.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M11 2v3h-3M5 14v-3h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else class="sync-spinner"></span>
            {{ syncing ? 'Syncing…' : 'Sync class schedule' }}
          </button>
          <button class="primary-btn" @click="openAddModal">+ Add Unavailability</button>
        </div>
      </div>
      <p v-if="syncMessage" class="sync-status" :class="{ 'sync-status--error': syncMessage.startsWith('Sync') && syncMessage.includes('fail') || syncMessage.startsWith('Sync unavailable') }">
        {{ syncMessage }}
      </p>

      <!-- ── Phone-only single-day view ── -->
      <div v-if="isPhone" class="phone-day-view">
        <div class="phone-day-chips" role="tablist">
          <button
            v-for="(d, i) in DAY_NAMES_FULL"
            :key="i"
            class="phone-day-chip"
            :class="{ active: selectedDayIdx === i }"
            role="tab"
            :aria-selected="selectedDayIdx === i"
            @click="selectedDayIdx = i">
            {{ DAY_NAMES[i] }}
            <span class="phone-day-chip-num">{{ d.slice(0, 3) }}</span>
          </button>
        </div>
        <div v-if="rowsForDay(selectedDayIdx).length === 0" class="phone-day-empty">
          No unavailability for {{ DAY_NAMES_FULL[selectedDayIdx] }}.
        </div>
        <div v-else class="phone-day-list">
          <div
            v-for="row in rowsForDay(selectedDayIdx)"
            :key="row.id_employeeUnavailability"
            class="phone-day-row"
            :class="{ 'phone-day-row--imported': row.source === 'imported' }"
            @click="row.source === 'manual' ? openEditModal(row) : null">
            <div class="phone-day-row-main">
              <div class="phone-day-row-time mono">{{ fmtTimeRange(row.startTime, row.endTime) }}</div>
              <div class="phone-day-row-title">{{ blockTitle(row) }}</div>
            </div>
            <span v-if="row.source === 'imported'" class="phone-day-row-badge">Imported</span>
            <button
              v-if="row.source === 'manual'"
              class="icon-action danger phone-day-row-delete"
              title="Delete"
              @click.stop="confirmDelete(row)">✕</button>
          </div>
        </div>
        <button class="phone-fab" type="button" aria-label="Add unavailability" @click="openAddModalForSelectedDay">+</button>
      </div>

      <!-- ── Weekly grid (tablet/desktop only) ── -->
      <div v-else class="grid-wrap">
        <div class="cal-header-row">
          <div class="time-gutter"></div>
          <div v-for="(d, i) in DAY_NAMES" :key="i" class="day-header">
            <span class="day-letter">{{ d }}</span>
          </div>
        </div>
        <div class="cal-inner" :style="{ height: (HOURS.length * HOUR_PX) + 'px' }">
          <div class="time-column">
            <div v-for="h in HOURS" :key="h" class="time-slot-label" :style="{ height: HOUR_PX + 'px' }">
              {{ fmtHour(h) }}
            </div>
          </div>
          <div v-for="(d, colIdx) in DAY_NAMES" :key="colIdx"
            class="day-column"
            :class="{ 'is-dragging-col': drag.active && drag.dayIndex === colIdx }"
            @mousedown.prevent="isTouch ? null : onColumnMouseDown($event, colIdx)">
            <div v-for="h in HOURS" :key="h" class="hour-cell" :style="{ height: HOUR_PX + 'px' }"></div>
            <!-- Ghost block while the user drags to create -->
            <div v-if="drag.active && drag.dayIndex === colIdx" class="ghost-block" :style="ghostStyle">
              <span class="ghost-label">{{ ghostLabel }}</span>
            </div>
            <div v-for="row in rowsForDay(colIdx)" :key="row.id_employeeUnavailability"
              class="avail-block"
              :class="{ 'avail-block--imported': row.source === 'imported' }"
              :style="blockStyle(row)"
              :title="row.source === 'imported' ? 'Imported — read only' : 'Click to edit'"
              @mousedown.stop
              @click="row.source === 'manual' ? openEditModal(row) : null">
              <div class="avail-block-title">{{ blockTitle(row) }}</div>
              <div class="avail-block-time">{{ fmtTimeRange(row.startTime, row.endTime) }}</div>
              <span v-if="row.source === 'imported'" class="avail-block-badge">Imported</span>
              <span v-else-if="row.hideReason" class="avail-block-badge avail-block-badge--hidden">Hidden</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Entry list (for editing/deleting) ── -->
      <div v-if="rows.length === 0" class="empty-card">
        <p class="empty-title">No unavailability yet</p>
        <p class="empty-sub">
          Your class schedule will appear here automatically once imports are set up.
          Meanwhile, add any other recurring commitments manually.
        </p>
      </div>

      <div v-else-if="!isPhone" class="row-list">
        <h3 class="row-list-title">All entries</h3>
        <div v-for="row in sortedRows" :key="row.id_employeeUnavailability" class="row-item">
          <span class="row-source" :class="'row-source--' + row.source">
            {{ row.source === 'imported' ? 'Imported' : 'Manual' }}
          </span>
          <span class="row-day">{{ row.dayOfWeek }}</span>
          <span class="row-time mono">{{ fmtTimeRange(row.startTime, row.endTime) }}</span>
          <span class="row-label">{{ blockTitle(row) }}</span>
          <span class="row-scope mono">{{ scopeLabel(row) }}</span>
          <div class="row-actions">
            <button v-if="row.source === 'manual'" class="icon-action" title="Edit" @click="openEditModal(row)">✎</button>
            <button v-if="row.source === 'manual'" class="icon-action danger" title="Delete" @click="confirmDelete(row)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Add / Edit Modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3 class="modal-title">{{ modal.isEdit ? 'Edit Unavailability' : 'Add Unavailability' }}</h3>

          <div class="form-row">
            <div class="form-group">
              <label>Day</label>
              <select v-model="modal.data.dayOfWeek">
                <option v-for="d in DAY_NAMES_FULL" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Start</label>
              <input type="time" v-model="modal.data.startTime" />
            </div>
            <div class="form-group">
              <label>End</label>
              <input type="time" v-model="modal.data.endTime" />
            </div>
          </div>

          <div class="form-group">
            <label>Label <span class="optional">(what is this for?)</span></label>
            <input type="text" v-model="modal.data.label" placeholder="e.g. BIOL 101, Gym, Work Study" />
          </div>

          <div class="form-group">
            <label>Scope</label>
            <div class="scope-radio-row">
              <label class="scope-opt">
                <input type="radio" value="season" v-model="modal.data.scopeType" />
                <span>This semester ({{ activeSeason || 'no season set' }})</span>
              </label>
              <label class="scope-opt">
                <input type="radio" value="dateRange" v-model="modal.data.scopeType" />
                <span>Custom date range</span>
              </label>
            </div>
          </div>

          <div v-if="modal.data.scopeType === 'dateRange'" class="form-row">
            <div class="form-group">
              <label>Start date</label>
              <input type="date" v-model="modal.data.startDate" />
            </div>
            <div class="form-group">
              <label>End date</label>
              <input type="date" v-model="modal.data.endDate" />
            </div>
          </div>

          <label class="hide-reason-row">
            <input type="checkbox" v-model="modal.data.hideReason" />
            <span>Hide reason from managers (they'll see "Unavailable" instead of the label)</span>
          </label>

          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving" @click="saveModal">
              {{ modal.saving ? 'Saving…' : modal.isEdit ? 'Save Changes' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete confirm ── -->
    <Transition name="modal">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal modal-sm">
          <h3 class="modal-title">Delete this entry?</h3>
          <p class="modal-body-text">This only removes the block from your availability.</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="deleteConfirm.open = false">Cancel</button>
            <button class="confirm-btn danger" :disabled="deleteConfirm.saving" @click="executeDelete">
              {{ deleteConfirm.saving ? 'Deleting…' : 'Delete' }}
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
import { useBreakpoint } from "../composables/useBreakpoint.js";
import apiClient from "../services/services.js";
import { getSettingValues } from "../services/departmentService.js";
import { getActiveSemester } from "../services/semesterService.js";
import {
  getUnavailability,
  createUnavailability,
  updateUnavailability,
  deleteUnavailability,
  importUnavailabilityForEmployee,
} from "../services/unavailabilityService.js";
import { bumpUnavailabilityRefresh, useUnavailabilityRefresh } from "../composables/useUnavailabilityRefresh.js";

const DAY_NAMES      = ["S","M","T","W","T","F","S"];
const DAY_NAMES_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const HOURS          = Array.from({ length: 16 }, (_, i) => i + 6); // 6am – 10pm
const HOUR_PX        = 42;

const currentUser = ref(Utils.getStore("user"));
const { selectedDeptId, loadDepts } = useDepartment();
const { isPhone, isTouch } = useBreakpoint();

// On phone the grid is replaced by a single-day list + chip picker. Default
// to today's weekday so the list opens to something useful.
const selectedDayIdx = ref(new Date().getDay());

const loading   = ref(false);
const apiError  = ref("");
const rows      = ref([]);
const activeSeason = ref("");

const modal = ref({ open: false, isEdit: false, saving: false, error: "", data: {}, editId: null });
const deleteConfirm = ref({ open: false, saving: false, item: null });
const syncing     = ref(false);
const syncMessage = ref("");

// ── Click-and-drag to create ───────────────────────────────────────────────
// Drag state mirrors the Dashboard's model: user presses on a day column,
// moves vertically, releases. On release we open the Add modal with the
// day + times pre-filled.
const SNAP_MINUTES = 15;
const drag = ref({ active: false, dayIndex: null, startHour: null, currentHour: null, colEl: null });

// ── Helpers ──
function fmtHour(h) {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const suffix = hr >= 12 ? "pm" : "am";
  const disp = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0 ? `${disp}${suffix}` : `${disp}:${String(min).padStart(2,"0")}${suffix}`;
}
function timeStrToHour(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function fmtTimeRange(start, end) {
  return `${fmtHour(timeStrToHour(start))} – ${fmtHour(timeStrToHour(end))}`;
}
function blockTitle(row) {
  if (row.label) return row.label;
  return row.hideReason ? "Unavailable" : "Unavailable";
}
function scopeLabel(row) {
  if (row.scopeType === "season") return row.season || "(no season)";
  return `${row.startDate || "?"} → ${row.endDate || "?"}`;
}

// ── Weekly grid layout ──
function dayIdx(name) { return DAY_NAMES_FULL.indexOf(name); }
function rowsForDay(colIdx) {
  return rows.value.filter(r => dayIdx(r.dayOfWeek) === colIdx);
}
function blockStyle(row) {
  const start = timeStrToHour(row.startTime);
  const end   = timeStrToHour(row.endTime);
  const gridStart = HOURS[0];
  const top   = Math.max(0, (start - gridStart) * HOUR_PX);
  const height = Math.max(20, (end - start) * HOUR_PX);
  return { top: top + "px", height: height + "px" };
}

// Convert a mouseevent's clientY inside a .day-column into a fractional
// hour snapped to the nearest SNAP_MINUTES, clamped to the grid.
function getHourFromEvent(e, colEl) {
  const rect = colEl.getBoundingClientRect();
  const relY = e.clientY - rect.top;
  const rawHour = HOURS[0] + relY / HOUR_PX;
  const snap = SNAP_MINUTES / 60;
  const snapped = Math.round(rawHour / snap) * snap;
  return Math.max(HOURS[0], Math.min(HOURS[0] + HOURS.length, snapped));
}

function onColumnMouseDown(e, colIdx) {
  if (e.button !== 0) return;
  const colEl = e.currentTarget;
  const startHour = getHourFromEvent(e, colEl);
  drag.value = { active: true, dayIndex: colIdx, startHour, currentHour: startHour, colEl };
}

function onGlobalMouseMove(e) {
  if (!drag.value.active || !drag.value.colEl) return;
  drag.value.currentHour = getHourFromEvent(e, drag.value.colEl);
}

function onGlobalMouseUp() {
  if (!drag.value.active) return;
  const { dayIndex, startHour, currentHour } = drag.value;
  const lo = Math.min(startHour, currentHour);
  const hi = Math.max(startHour, currentHour) + SNAP_MINUTES / 60;
  drag.value.active = false;

  // Anything shorter than one snap step is a click, not a drag — ignore.
  if (hi - lo < SNAP_MINUTES / 60 + 0.001) return;

  // Open the Add modal pre-filled with the dragged range. Employee can
  // still edit anything, pick a label, toggle hideReason, switch scope.
  openAddModal();
  modal.value.data.dayOfWeek = DAY_NAMES_FULL[dayIndex];
  modal.value.data.startTime = toTimeInput(lo);
  modal.value.data.endTime   = toTimeInput(hi);
}

function toTimeInput(h) {
  const total = Math.round(h * 60);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Ghost-block styling + label while dragging.
const ghostStyle = computed(() => {
  if (!drag.value.active) return { top: 0, height: 0 };
  const lo = Math.min(drag.value.startHour, drag.value.currentHour);
  const hi = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return {
    top: ((lo - HOURS[0]) * HOUR_PX) + "px",
    height: Math.max(18, (hi - lo) * HOUR_PX) + "px",
  };
});
const ghostLabel = computed(() => {
  if (!drag.value.active) return "";
  const lo = Math.min(drag.value.startHour, drag.value.currentHour);
  const hi = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return `${fmtHour(lo)} – ${fmtHour(hi)}`;
});

const sortedRows = computed(() => {
  const copy = rows.value.slice();
  copy.sort((a, b) => {
    const da = dayIdx(a.dayOfWeek) - dayIdx(b.dayOfWeek);
    if (da !== 0) return da;
    return timeStrToHour(a.startTime) - timeStrToHour(b.startTime);
  });
  return copy;
});

// ── Load ──
async function loadAll() {
  loading.value = true;
  apiError.value = "";
  const empId = currentUser.value?.id_employee;
  if (!empId) { loading.value = false; return; }
  try {
    const res = await getUnavailability({ id_employee: empId });
    rows.value = res.data || [];
    // Pull the active semester for the selected dept so the modal can
    // label the "this semester" option with e.g. "Spring 2026". Falls
    // back to the legacy Active Season setting when the dept hasn't yet
    // configured Semester rows — that way the modal still works on
    // departments that never set up the new model.
    const deptId = selectedDeptId.value || currentUser.value?.id_department;
    if (deptId) {
      try {
        const sem = await getActiveSemester(deptId);
        activeSeason.value = sem.data?.name || "";
      } catch {
        try {
          const sv = await getSettingValues(deptId);
          const active = (sv.data || []).find(v => v.name === "Active Season" || v.key === "active_season");
          activeSeason.value = active?.value || "";
        } catch { /* non-critical */ }
      }
    }
  } catch (err) {
    apiError.value = "Could not load availability: " + (err.response?.data?.message || err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!currentUser.value) return;
  await loadDepts(currentUser.value);
  await loadAll();
});

// Re-load whenever ANY sync (auto, manual, or manager bulk) completes
// anywhere in the app — the composable's bump signal is shared.
const { lastSyncTimestamp } = useUnavailabilityRefresh();
watch(lastSyncTimestamp, () => { if (currentUser.value) loadAll(); });

// ── Modal ──
function defaultModalData() {
  return {
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime:   "10:00",
    label:     "",
    scopeType: activeSeason.value ? "season" : "dateRange",
    startDate: "",
    endDate:   "",
    hideReason: false,
  };
}
function openAddModal() {
  modal.value = { open: true, isEdit: false, saving: false, error: "", editId: null, data: defaultModalData() };
}
// Phone FAB pre-fills the day picker's current selection so users don't
// have to repick what they're already looking at.
function openAddModalForSelectedDay() {
  openAddModal();
  modal.value.data.dayOfWeek = DAY_NAMES_FULL[selectedDayIdx.value];
}
function openEditModal(row) {
  modal.value = {
    open: true, isEdit: true, saving: false, error: "", editId: row.id_employeeUnavailability,
    data: {
      dayOfWeek: row.dayOfWeek,
      startTime: (row.startTime || "").slice(0, 5),
      endTime:   (row.endTime   || "").slice(0, 5),
      label:     row.label || "",
      scopeType: row.scopeType,
      startDate: row.startDate || "",
      endDate:   row.endDate   || "",
      hideReason: !!row.hideReason,
    },
  };
}
function closeModal() { modal.value.open = false; }

async function saveModal() {
  const d = modal.value.data;
  if (!d.dayOfWeek || !d.startTime || !d.endTime) {
    modal.value.error = "Day, start, and end are required.";
    return;
  }
  if (timeStrToHour(d.endTime) <= timeStrToHour(d.startTime)) {
    modal.value.error = "End time must be after start time.";
    return;
  }
  if (d.scopeType === "season" && !activeSeason.value) {
    modal.value.error = "No active season is set for your department — use a custom date range instead.";
    return;
  }
  if (d.scopeType === "dateRange" && (!d.startDate || !d.endDate)) {
    modal.value.error = "Date range requires both a start and end date.";
    return;
  }

  modal.value.saving = true;
  modal.value.error = "";
  const payload = {
    id_employee: currentUser.value.id_employee,
    dayOfWeek:   d.dayOfWeek,
    startTime:   d.startTime,
    endTime:     d.endTime,
    scopeType:   d.scopeType,
    season:      d.scopeType === "season"    ? activeSeason.value : null,
    startDate:   d.scopeType === "dateRange" ? d.startDate : null,
    endDate:     d.scopeType === "dateRange" ? d.endDate   : null,
    label:       d.label || null,
    hideReason:  !!d.hideReason,
  };
  try {
    if (modal.value.isEdit) {
      const res = await updateUnavailability(modal.value.editId, payload);
      const idx = rows.value.findIndex(r => r.id_employeeUnavailability === modal.value.editId);
      if (idx !== -1) rows.value[idx] = res.data;
    } else {
      const res = await createUnavailability(payload);
      rows.value.push(res.data);
    }
    modal.value.open = false;
  } catch (err) {
    modal.value.error = err.response?.data?.message || err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}

function confirmDelete(row) {
  deleteConfirm.value = { open: true, saving: false, item: row };
}
async function executeDelete() {
  const row = deleteConfirm.value.item;
  if (!row) return;
  deleteConfirm.value.saving = true;
  try {
    await deleteUnavailability(row.id_employeeUnavailability);
    rows.value = rows.value.filter(r => r.id_employeeUnavailability !== row.id_employeeUnavailability);
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + (err.response?.data?.message || err.message);
    deleteConfirm.value.open = false;
  } finally {
    deleteConfirm.value.saving = false;
  }
}

// ── Sync class schedule from stingray ────────────────────────────────────────
async function syncClassSchedule() {
  const empId = currentUser.value?.id_employee;
  if (!empId || syncing.value) return;
  syncing.value = true;
  syncMessage.value = "";
  try {
    const res = await importUnavailabilityForEmployee(empId);
    // Backend returns { inserted, semester } — refresh the grid so the
    // new rows show immediately, then flash a success note.
    await loadAll();
    // Remember when we last synced so the auto-on-login trigger can
    // suppress a re-run within the same semester.
    const semester = res.data?.semester || "";
    if (semester) localStorage.setItem(`lastScheduleSync:${empId}:${semester}`, String(Date.now()));
    syncMessage.value = `Synced ${res.data?.inserted ?? 0} class time${res.data?.inserted === 1 ? '' : 's'} for ${semester || 'the current semester'}.`;
    // Signal other views (Dashboard calendar, TemplateEditor dropdowns,
    // the manager's viewer modal) that they should re-fetch too.
    bumpUnavailabilityRefresh();
  } catch (err) {
    syncMessage.value = err.response?.data?.message || err.message || "Sync failed.";
  } finally {
    syncing.value = false;
  }
}
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }

.avail-root {
  font-family: 'Satoshi', sans-serif;
  display: flex; flex-direction: column; flex: 1;
  background: var(--bg-page); color: var(--tx-primary); overflow: hidden;
}

.content { flex: 1; overflow-y: auto; padding: 28px 36px; }

.panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
}
.panel-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub   { font-size: 14px; color: var(--tx-faint); max-width: 640px; line-height: 1.5; }
.primary-btn {
  background: var(--accent); border: none; color: #fff; padding: 9px 18px;
  border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600;
}
.primary-btn:hover { opacity: 0.9; }

.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.secondary-btn {
  background: var(--bg-surface); border: 1px solid var(--bdr-medium);
  color: var(--tx-secondary); padding: 9px 16px; border-radius: 8px;
  cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600;
  display: inline-flex; align-items: center;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.secondary-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
.secondary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.sync-spinner {
  width: 12px; height: 12px; margin-right: 8px;
  border: 2px solid var(--bdr-subtle); border-top-color: currentColor;
  border-radius: 50%; animation: spin 0.7s linear infinite;
  display: inline-block;
}

.sync-status {
  margin: -10px 0 18px; font-size: 13px;
  color: var(--tx-secondary); font-family: 'DM Mono', monospace;
}
.sync-status--error { color: var(--err-text); }

/* ── Weekly grid ── */
.grid-wrap {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px;
  overflow: hidden; margin-bottom: 24px;
}
.cal-header-row {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  background: var(--bg-active);
  border-bottom: 1px solid var(--bdr-subtle);
}
.time-gutter { }
.day-header {
  padding: 10px 0; text-align: center;
  font-size: 13px; font-weight: 600; color: var(--tx-secondary);
  border-left: 1px solid var(--bdr-subtle);
}
.day-letter { font-family: 'DM Mono', monospace; letter-spacing: 0.05em; }

.cal-inner {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  position: relative;
}
.time-column { border-right: 1px solid var(--bdr-subtle); }
.time-slot-label {
  padding-right: 8px; text-align: right; font-size: 11px; color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
  border-bottom: 1px solid var(--bdr-subtle);
  display: flex; align-items: flex-start; justify-content: flex-end;
  padding-top: 4px;
}
.day-column {
  position: relative;
  border-left: 1px solid var(--bdr-subtle);
  cursor: crosshair;
  user-select: none;
}
.day-column.is-dragging-col { background: var(--accent-bg); }
.hour-cell { border-bottom: 1px solid var(--bdr-subtle); }

.ghost-block {
  position: absolute; left: 2px; right: 2px;
  border: 2px solid var(--accent);
  background: var(--accent-bg);
  border-radius: 6px;
  display: flex; align-items: flex-start; padding: 4px 8px;
  pointer-events: none;
  z-index: 3;
}
.ghost-label {
  font-size: 12px; font-weight: 600; color: var(--accent);
  font-family: 'DM Mono', monospace;
}

.avail-block {
  position: absolute; left: 2px; right: 2px;
  background: var(--accent-bg); border: 1px solid var(--accent-border, rgba(255,23,68,0.3));
  border-radius: 6px; padding: 4px 6px; overflow: hidden;
  cursor: pointer; transition: filter 0.15s;
  font-size: 12px; color: var(--tx-primary);
}
.avail-block:hover { filter: brightness(1.1); }
.avail-block--imported {
  background: rgba(74, 144, 164, 0.18);
  border-color: rgba(74, 144, 164, 0.5);
  cursor: not-allowed;
}
.avail-block-title { font-weight: 600; line-height: 1.2; }
.avail-block-time { font-size: 11px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.avail-block-badge {
  display: inline-block; margin-top: 3px; font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em;
  background: rgba(74, 144, 164, 0.3); color: #4A90A4;
}
.avail-block-badge--hidden { background: var(--bdr-subtle); color: var(--tx-muted); }

/* ── Row list ── */
.row-list-title {
  font-size: 13px; font-weight: 700; color: var(--tx-muted);
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;
}
.row-item {
  display: grid; grid-template-columns: 80px 100px 140px 1fr 180px 80px;
  align-items: center; gap: 12px;
  padding: 10px 14px; background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle); border-radius: 8px; margin-bottom: 6px;
  font-size: 14px;
}
.row-source {
  font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 100px;
  text-transform: uppercase; letter-spacing: 0.05em; text-align: center;
}
.row-source--imported { background: rgba(74, 144, 164, 0.2); color: #4A90A4; }
.row-source--manual   { background: var(--accent-bg); color: var(--accent); }
.row-day { font-weight: 600; color: var(--tx-primary); }
.row-time { color: var(--tx-secondary); }
.row-label { color: var(--tx-primary); font-weight: 500; }
.row-scope { color: var(--tx-faint); font-size: 12px; }
.row-actions { display: flex; gap: 6px; justify-content: flex-end; }
.mono { font-family: 'DM Mono', monospace; }

.icon-action {
  background: var(--bdr-subtle); border: none; color: var(--tx-muted);
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s;
}
.icon-action:hover { color: var(--tx-primary); }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.empty-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px;
  padding: 48px; text-align: center; max-width: 600px; margin: 0 auto;
}
.empty-title { font-size: 18px; font-weight: 600; color: var(--tx-secondary); margin-bottom: 8px; }
.empty-sub { font-size: 14px; color: var(--tx-faint); max-width: 440px; margin: 0 auto; line-height: 1.5; }

/* ── Loading / error ── */
.loading-overlay {
  position: fixed; inset: 0; background: var(--bg-overlay, rgba(0,0,0,0.5));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; z-index: 999; backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 36px; height: 36px; border: 3px solid var(--bdr-subtle);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 15px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner {
  background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text);
  font-size: 14px; padding: 8px 20px; display: flex; align-items: center; gap: 10px;
}
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: var(--bg-moverlay, rgba(0,0,0,0.5));
  display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px;
  padding: 28px; width: 520px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-sm { width: 380px; }
.modal-title { font-size: 20px; font-weight: 700; color: var(--tx-primary); margin-bottom: 16px; }
.modal-body-text { font-size: 15px; color: var(--tx-muted); margin-bottom: 20px; }

.form-row { display: flex; gap: 12px; }
.form-row > .form-group { flex: 1; }
.form-group { margin-bottom: 14px; }
.form-group label {
  display: block; font-size: 12px; font-weight: 600; color: var(--tx-muted);
  margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em;
}
.form-group input,
.form-group select {
  width: 100%; background: var(--bg-surface); border: 1px solid var(--bdr-medium);
  color: var(--tx-primary); padding: 8px 10px; border-radius: 7px; font-size: 14px;
  outline: none; font-family: inherit;
}
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }
.optional { color: var(--tx-faint); font-weight: 400; text-transform: none; letter-spacing: 0; }

.scope-radio-row { display: flex; flex-direction: column; gap: 8px; }
.scope-opt {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--tx-secondary); cursor: pointer;
  padding: 8px 10px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 7px;
}
.scope-opt input { margin: 0; }

.hide-reason-row {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
  font-size: 13px; color: var(--tx-secondary); cursor: pointer;
}

.modal-error { color: var(--err-text); font-size: 14px; margin: 6px 0 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.cancel-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 14px;
}
.cancel-btn:hover { color: var(--tx-secondary); }
.confirm-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600;
}
.confirm-btn:hover { opacity: 0.9; }
.confirm-btn.danger { background: var(--danger-btn, var(--accent)); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }

/* ── Phone-only single-day view ── */
.phone-day-view {
  display: flex; flex-direction: column;
  margin-bottom: 24px;
  position: relative;
}

.phone-day-chips {
  display: flex; gap: 6px;
  overflow-x: auto;
  padding: 4px 2px 12px;
  scrollbar-width: none;
}
.phone-day-chips::-webkit-scrollbar { display: none; }

.phone-day-chip {
  flex: 1 0 auto;
  min-width: 56px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-secondary);
  padding: 8px 10px;
  border-radius: 10px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.phone-day-chip-num { font-size: 10px; color: var(--tx-faint); font-family: 'DM Mono', monospace; letter-spacing: 0.04em; }
.phone-day-chip:hover { color: var(--tx-primary); }
.phone-day-chip.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}
.phone-day-chip.active .phone-day-chip-num { color: var(--accent); }

.phone-day-empty {
  background: var(--bg-surface);
  border: 1px dashed var(--bdr-subtle);
  border-radius: 10px;
  padding: 28px 16px;
  text-align: center;
  color: var(--tx-faint);
  font-size: 14px;
}

.phone-day-list { display: flex; flex-direction: column; gap: 8px; }
.phone-day-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  min-height: var(--tap-target-min);
}
.phone-day-row--imported {
  border-left-color: #4A90A4;
  cursor: default;
}
.phone-day-row-main { flex: 1; min-width: 0; }
.phone-day-row-time { font-size: 12px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.phone-day-row-title { font-size: 14px; font-weight: 600; color: var(--tx-primary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.phone-day-row-badge {
  font-size: 10px; font-weight: 700;
  padding: 3px 8px; border-radius: 100px;
  text-transform: uppercase; letter-spacing: 0.05em;
  background: rgba(74, 144, 164, 0.2); color: #4A90A4;
}
.phone-day-row-delete { width: var(--tap-target-min); height: var(--tap-target-min); }

.phone-fab {
  position: fixed;
  right: 18px;
  bottom: 22px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 28px; font-weight: 300; line-height: 1;
  box-shadow: 0 8px 22px rgba(0,0,0,0.35);
  cursor: pointer;
  z-index: 50;
  display: flex; align-items: center; justify-content: center;
}
.phone-fab:active { transform: scale(0.96); }

@media (max-width: 599.98px) {
  .content { padding: 18px 14px; }
  .panel-header { gap: 10px; margin-bottom: 14px; }
  .panel-title { font-size: 19px; }
  .panel-sub { font-size: 13px; }
  .header-actions .primary-btn { display: none; } /* phone uses the FAB instead */
}
</style>
