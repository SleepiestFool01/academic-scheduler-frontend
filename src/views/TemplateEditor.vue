<template>
  <div class="editor-root" @mousemove="onGlobalMouseMove" @mouseup="onGlobalMouseUp">

    <!-- ── Loading overlay ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading template…</span>
    </div>

    <!-- ── Top Nav ── -->
    <nav class="topnav">
      <div class="nav-left">
        <button class="back-btn" @click="router.push('/templates')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Templates
        </button>
        <div class="name-group">
          <input
            class="tpl-name-input"
            v-model="templateName"
            placeholder="Template name…"
            @blur="saveName"
            @keyup.enter="$event.target.blur()"
          />
          <span class="save-status" :class="{ error: saveStatus === 'Error saving' }">{{ saveStatus }}</span>
        </div>
      </div>
      <div class="nav-hint">Drag on any column to create a shift</div>
    </nav>

    <!-- ── Error Banner ── -->
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <!-- ── Calendar Grid ── -->
    <div class="cal-grid-wrapper">
      <!-- Sticky day-header row -->
      <div class="cal-header-row">
        <div class="time-gutter"></div>
        <div v-for="(day, i) in DAY_NAMES" :key="i" class="day-header">
          <span class="day-letter">{{ day }}</span>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="cal-body" ref="calBody">
        <div class="cal-inner">
          <!-- Time labels -->
          <div class="time-column">
            <div v-for="h in hours" :key="h" class="time-slot-label">{{ formatHour(h) }}</div>
          </div>

          <!-- Day columns -->
          <div
            v-for="(day, colIdx) in DAY_NAMES"
            :key="colIdx"
            class="day-column"
            :class="{ 'is-dragging-col': drag.active && drag.dayIndex === colIdx }"
            @mousedown.prevent="onColumnMouseDown($event, colIdx)"
          >
            <div v-for="h in hours" :key="h" class="hour-cell"></div>

            <!-- Ghost block while dragging -->
            <div v-if="drag.active && drag.dayIndex === colIdx" class="ghost-block" :style="ghostStyle">
              <span class="ghost-label">{{ ghostLabel }}</span>
            </div>

            <!-- Template shift blocks -->
            <div
              v-for="shift in shiftsForDay(colIdx)"
              :key="shift.id_templateShift"
              class="shift-block"
              :style="shiftBlockStyle(shift)"
              @mousedown.stop
              @click.stop="selectShift(shift, $event)"
            >
              <div class="shift-label">{{ shift.label || 'Shift' }}</div>
              <div class="shift-time">{{ fmtHour(shift.startHour) }} – {{ fmtHour(shift.endHour) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Quick-Create Popover (after drag) ── -->
    <Transition name="popover-anim">
      <div v-if="quickCreate.visible" class="quick-create-popover" :style="quickCreate.style" @mousedown.stop>
        <div class="qc-header">
          <div class="qc-time-badge">{{ quickCreate.startLabel }} – {{ quickCreate.endLabel }}</div>
          <button class="qc-close" @click="quickCreate.visible = false">✕</button>
        </div>
        <div class="qc-day-label">{{ DAY_NAMES_FULL[quickCreate.dayIndex] }}</div>
        <div class="form-group">
          <label>Label <span class="optional">(optional)</span></label>
          <input
            v-model="quickCreate.label"
            type="text"
            placeholder="e.g. Morning, Opener, Closer…"
            @keyup.enter="confirmQuickCreate"
            ref="qcLabelInput"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start</label>
            <input type="time" v-model="quickCreate.startTime" />
          </div>
          <div class="form-group">
            <label>End</label>
            <input type="time" v-model="quickCreate.endTime" />
          </div>
        </div>
        <div class="form-group">
          <label>Notes <span class="optional">(optional)</span></label>
          <input v-model="quickCreate.notes" type="text" placeholder="Optional notes…" />
        </div>
        <p v-if="quickCreate.error" class="qc-error">{{ quickCreate.error }}</p>
        <div class="qc-actions">
          <button class="qc-cancel" @click="quickCreate.visible = false">Cancel</button>
          <button class="qc-confirm" :disabled="quickCreate.saving" @click="confirmQuickCreate">
            {{ quickCreate.saving ? '…' : '✓ Add Shift' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Shift Detail Popover (click on block) ── -->
    <Transition name="fade">
      <div v-if="selectedShift" class="shift-popover" :style="popoverStyle" @mousedown.stop>
        <button class="popover-close" @click="selectedShift = null">✕</button>
        <div class="popover-label">{{ selectedShift.label || 'Shift' }}</div>
        <div class="popover-time">{{ fmtHour(selectedShift.startHour) }} – {{ fmtHour(selectedShift.endHour) }}</div>
        <div class="popover-day">{{ DAY_NAMES_FULL[selectedShift.dayOfWeek] }}</div>
        <div v-if="selectedShift.notes" class="popover-notes">{{ selectedShift.notes }}</div>
        <div class="popover-actions">
          <button class="popover-edit" @click="openEditShift(selectedShift)">Edit</button>
          <button class="popover-delete" @click="deleteSelectedShift">Delete</button>
        </div>
      </div>
    </Transition>

    <!-- ── Edit Shift Modal ── -->
    <Transition name="modal">
      <div v-if="editModal.open" class="modal-overlay" @click.self="editModal.open = false">
        <div class="modal">
          <h3 class="modal-title">Edit Shift</h3>

          <div class="form-group">
            <label>Label <span class="optional">(optional)</span></label>
            <input v-model="editModal.data.label" type="text" placeholder="Morning, Opener, Closer…" />
          </div>
          <div class="form-group">
            <label>Day</label>
            <select v-model="editModal.data.dayOfWeek">
              <option v-for="(name, i) in DAY_NAMES_FULL" :key="i" :value="i">{{ name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Start</label>
              <input type="time" v-model="editModal.data.startTime" />
            </div>
            <div class="form-group">
              <label>End</label>
              <input type="time" v-model="editModal.data.endTime" />
            </div>
          </div>
          <div class="form-group">
            <label>Notes <span class="optional">(optional)</span></label>
            <input v-model="editModal.data.notes" type="text" placeholder="Optional notes…" />
          </div>

          <p v-if="editModal.error" class="modal-error">{{ editModal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="editModal.open = false">Cancel</button>
            <button class="confirm-btn" :disabled="editModal.saving" @click="saveEditShift">
              {{ editModal.saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  getTemplate,
  updateTemplate,
  fetchTemplateShifts,
  createTemplateShift,
  updateTemplateShift,
  deleteTemplateShift,
} from "../services/templateService.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const CELL_HEIGHT    = 60;
const CAL_START_HOUR = 0;
const SNAP_MINUTES   = 15;
const DAY_NAMES      = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours          = Array.from({ length: 24 }, (_, i) => i);

// ── State ─────────────────────────────────────────────────────────────────────
const router = useRouter();
const route  = useRoute();
const id     = computed(() => route.params.id);

const loading      = ref(true);
const apiError     = ref("");
const templateName = ref("");
const saveStatus   = ref("");

const templateShifts = ref([]);
const calBody        = ref(null);
const qcLabelInput   = ref(null);

// ── Drag ──────────────────────────────────────────────────────────────────────
const drag = ref({ active: false, dayIndex: 0, startHour: 0, currentHour: 0, colEl: null });

const quickCreate = ref({
  visible: false, dayIndex: 0, startHour: 0, endHour: 0,
  startLabel: "", endLabel: "", startTime: "", endTime: "",
  label: "", notes: "", saving: false, error: "", style: {},
});

// ── Selected shift popover ────────────────────────────────────────────────────
const selectedShift = ref(null);
const popoverStyle  = ref({});

// ── Edit modal ────────────────────────────────────────────────────────────────
const editModal = ref({
  open: false, id: null,
  data: { label: "", dayOfWeek: 0, startTime: "", endTime: "", notes: "" },
  saving: false, error: "",
});

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value = true;
  apiError.value = "";
  try {
    const [tpl, shifts] = await Promise.all([
      getTemplate(id.value),
      fetchTemplateShifts(id.value),
    ]);
    templateName.value   = tpl.name;
    templateShifts.value = shifts;
  } catch (err) {
    apiError.value = "Could not load template: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadAll();
  if (calBody.value) calBody.value.scrollTop = 7 * CELL_HEIGHT;
});

// ── Save template name ────────────────────────────────────────────────────────
async function saveName() {
  if (!templateName.value.trim()) return;
  saveStatus.value = "Saving…";
  try {
    await updateTemplate(id.value, { name: templateName.value.trim() });
    saveStatus.value = "Saved";
    setTimeout(() => { saveStatus.value = ""; }, 2000);
  } catch {
    saveStatus.value = "Error saving";
  }
}

// ── Shift helpers ─────────────────────────────────────────────────────────────
function shiftsForDay(dayOfWeek) {
  return templateShifts.value.filter(s => s.dayOfWeek === dayOfWeek);
}

function shiftBlockStyle(shift) {
  return {
    position:    "absolute",
    top:         `${(shift.startHour - CAL_START_HOUR) * CELL_HEIGHT}px`,
    height:      `${Math.max((shift.endHour - shift.startHour) * CELL_HEIGHT - 3, 18)}px`,
    left:        "3px",
    right:       "3px",
    background:  "#FF1744",
    borderRadius:"6px",
    padding:     "4px 8px",
    cursor:      "pointer",
    overflow:    "hidden",
    zIndex:      2,
    boxShadow:   "0 2px 12px rgba(255,23,68,0.3)",
  };
}

function selectShift(shift, e) {
  selectedShift.value = shift;
  const px = Math.min(e.clientX + 14, window.innerWidth  - 240);
  const py = Math.min(e.clientY - 24, window.innerHeight - 200);
  popoverStyle.value  = { left: `${px}px`, top: `${py}px` };
}

async function deleteSelectedShift() {
  if (!selectedShift.value) return;
  const id_shift = selectedShift.value.id_templateShift;
  selectedShift.value = null;
  try {
    await deleteTemplateShift(id_shift);
    templateShifts.value = templateShifts.value.filter(s => s.id_templateShift !== id_shift);
  } catch (err) {
    apiError.value = err.message || "Delete failed.";
  }
}

function openEditShift(shift) {
  editModal.value = {
    open: true,
    id:   shift.id_templateShift,
    data: {
      label:     shift.label    || "",
      dayOfWeek: shift.dayOfWeek,
      startTime: toTimeInput(shift.startHour),
      endTime:   toTimeInput(shift.endHour),
      notes:     shift.notes    || "",
    },
    saving: false,
    error:  "",
  };
  selectedShift.value = null;
}

async function saveEditShift() {
  const { label, dayOfWeek, startTime, endTime, notes } = editModal.value.data;
  const startHour = fromTimeInput(startTime);
  const endHour   = fromTimeInput(endTime);
  if (endHour <= startHour) {
    editModal.value.error = "End time must be after start time.";
    return;
  }
  editModal.value.saving = true;
  editModal.value.error  = "";
  try {
    const payload = { label, dayOfWeek, startHour, endHour, notes };
    await updateTemplateShift(editModal.value.id, payload);
    const idx = templateShifts.value.findIndex(s => s.id_templateShift === editModal.value.id);
    if (idx !== -1) templateShifts.value[idx] = { ...templateShifts.value[idx], ...payload };
    editModal.value.open = false;
  } catch (err) {
    editModal.value.error = err.response?.data?.message || err.message || "Save failed.";
  } finally {
    editModal.value.saving = false;
  }
}

// ── Drag interaction ──────────────────────────────────────────────────────────
function snap(rawHour) {
  const s = Math.round(rawHour / (SNAP_MINUTES / 60)) * (SNAP_MINUTES / 60);
  return Math.max(CAL_START_HOUR, Math.min(CAL_START_HOUR + 24, s));
}

function getHourFromEvent(e, colEl) {
  const rect = colEl.getBoundingClientRect();
  const relY  = e.clientY - rect.top;
  return snap(CAL_START_HOUR + relY / CELL_HEIGHT);
}

function onColumnMouseDown(e, colIdx) {
  if (e.button !== 0) return;
  selectedShift.value       = null;
  quickCreate.value.visible = false;
  const startHour = getHourFromEvent(e, e.currentTarget);
  drag.value = { active: true, dayIndex: colIdx, startHour, currentHour: startHour, colEl: e.currentTarget };
}

function onGlobalMouseMove(e) {
  if (!drag.value.active || !drag.value.colEl) return;
  drag.value.currentHour = getHourFromEvent(e, drag.value.colEl);
}

function onGlobalMouseUp(e) {
  if (!drag.value.active) return;
  const startHour = Math.min(drag.value.startHour, drag.value.currentHour);
  const endHour   = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  const colIdx    = drag.value.dayIndex;
  drag.value.active = false;

  if (endHour - startHour < SNAP_MINUTES / 60 + 0.001) return;

  const px = Math.min(e.clientX + 14, window.innerWidth  - 310);
  const py = Math.min(e.clientY - 24, window.innerHeight - 330);

  quickCreate.value = {
    visible:    true,
    dayIndex:   colIdx,
    startHour,  endHour,
    startLabel: fmtHour(startHour),
    endLabel:   fmtHour(endHour),
    startTime:  toTimeInput(startHour),
    endTime:    toTimeInput(endHour),
    label: "", notes: "", saving: false, error: "",
    style: { left: `${px}px`, top: `${py}px` },
  };

  nextTick(() => { qcLabelInput.value?.focus(); });
}

async function confirmQuickCreate() {
  const startHour = fromTimeInput(quickCreate.value.startTime);
  const endHour   = fromTimeInput(quickCreate.value.endTime);
  if (endHour <= startHour) {
    quickCreate.value.error = "End time must be after start time.";
    return;
  }
  quickCreate.value.saving = true;
  quickCreate.value.error  = "";
  try {
    const created = await createTemplateShift({
      id_template: id.value,
      dayOfWeek:   quickCreate.value.dayIndex,
      startHour,   endHour,
      label:       quickCreate.value.label,
      notes:       quickCreate.value.notes,
    });
    templateShifts.value.push(created);
    quickCreate.value.visible = false;
  } catch (err) {
    quickCreate.value.error = err.response?.data?.message || err.message || "Failed to create shift.";
  } finally {
    quickCreate.value.saving = false;
  }
}

// ── Computed ──────────────────────────────────────────────────────────────────
const ghostStyle = computed(() => {
  if (!drag.value.active) return {};
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return {
    position: "absolute",
    top:    `${(s - CAL_START_HOUR) * CELL_HEIGHT}px`,
    height: `${Math.max((e - s) * CELL_HEIGHT - 2, 20)}px`,
    left: "3px", right: "3px", zIndex: 10,
  };
});

const ghostLabel = computed(() => {
  if (!drag.value.active) return "";
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return `${fmtHour(s)} – ${fmtHour(e)}`;
});

// ── Formatters ────────────────────────────────────────────────────────────────
function formatHour(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function fmtHour(h) {
  const total  = Math.round(h * 60);
  const hr     = Math.floor(total / 60);
  const min    = total % 60;
  const suffix = hr >= 12 ? "pm" : "am";
  const disp   = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0 ? `${disp}${suffix}` : `${disp}:${String(min).padStart(2, "0")}${suffix}`;
}

function toTimeInput(h) {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fromTimeInput(t) {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.editor-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #07070d;
  color: #f0e6d3;
  font-family: 'DM Sans', sans-serif;
  overflow: hidden;
  user-select: none;
}

/* ── Loading ── */
.loading-overlay {
  position: fixed; inset: 0; background: rgba(7,7,13,.85);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; z-index: 999;
}
.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid #1e1e2e; border-top-color: #FF1744;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #555; }

/* ── Top Nav ── */
.topnav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 56px;
  background: #0d0d14; border-bottom: 1px solid #1e1e2e;
  flex-shrink: 0; z-index: 10;
}
.nav-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: #666;
  font-size: 13px; cursor: pointer; padding: 4px 8px;
  border-radius: 6px; transition: color .15s, background .15s; flex-shrink: 0;
}
.back-btn:hover { color: #f0e6d3; background: #1a1a2e; }
.name-group { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tpl-name-input {
  background: none; border: none; border-bottom: 1px solid transparent;
  color: #f0e6d3; font-size: 17px; font-weight: 700; font-family: 'DM Sans', sans-serif;
  padding: 2px 4px; outline: none; min-width: 160px; max-width: 360px;
  transition: border-color .15s;
}
.tpl-name-input:hover  { border-bottom-color: #2a2a3e; }
.tpl-name-input:focus  { border-bottom-color: #FF1744; }
.tpl-name-input::placeholder { color: #333; }
.save-status { font-size: 12px; color: #555; white-space: nowrap; }
.save-status.error { color: #FF1744; }
.nav-hint { font-size: 12px; color: #333; font-style: italic; }

/* ── Error banner ── */
.error-banner {
  background: #2a0a10; border-bottom: 1px solid #FF1744;
  color: #ff6b7a; padding: 8px 20px; font-size: 13px;
  display: flex; align-items: center; gap: 12px; flex-shrink: 0;
}
.retry-btn {
  background: none; border: 1px solid #FF1744; color: #FF1744;
  border-radius: 5px; padding: 3px 10px; font-size: 12px; cursor: pointer;
}

/* ── Calendar grid ── */
.cal-grid-wrapper {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
.cal-header-row {
  display: flex; border-bottom: 1px solid #1e1e2e; flex-shrink: 0;
  background: #0d0d14; position: sticky; top: 0; z-index: 2;
}
.time-gutter { width: 60px; flex-shrink: 0; }
.day-header {
  flex: 1; text-align: center; padding: 14px 4px;
  display: flex; align-items: center; justify-content: center;
  border-left: 1px solid #1a1a2a;
}
.day-letter {
  font-size: 12px; color: #666; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
}

.cal-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column;
}
.cal-body::-webkit-scrollbar { width: 6px; }
.cal-body::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }

.cal-inner { display: flex; min-height: fit-content; }

.time-column { width: 60px; flex-shrink: 0; }
.time-slot-label {
  height: 60px; padding: 4px 8px 0;
  font-size: 10px; color: #2a2a3a; font-family: 'DM Mono', monospace;
  display: flex; align-items: flex-start; justify-content: flex-end;
}

.day-column {
  flex: 1; position: relative;
  border-left: 1px solid #141420; cursor: crosshair;
}
.day-column.is-dragging-col { background: rgba(255,23,68,.04); }
.hour-cell { height: 60px; border-bottom: 1px solid #101018; }
.hour-cell:nth-child(even) { background: rgba(255,255,255,.008); }

/* ── Ghost block ── */
.ghost-block {
  border: 2px solid #FF1744; background: rgba(255,23,68,.12);
  border-radius: 6px; display: flex; align-items: flex-start;
  padding: 4px 8px; pointer-events: none;
}
.ghost-label {
  font-size: 11px; color: #FF1744; font-family: 'DM Mono', monospace;
  font-weight: 500; white-space: nowrap;
}

/* ── Shift blocks ── */
.shift-block { position: absolute; left: 3px; right: 3px; }
.shift-block:hover { filter: brightness(1.15); }
.shift-label { font-size: 12px; font-weight: 700; color: rgba(0,0,0,.85); line-height: 1.2; }
.shift-time  { font-size: 10px; color: rgba(0,0,0,.6); font-family: 'DM Mono', monospace; }

/* ── Quick-create popover ── */
.quick-create-popover {
  position: fixed; z-index: 500;
  background: #13131f; border: 1px solid #2a2a3e; border-radius: 12px;
  padding: 16px; width: 290px;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  display: flex; flex-direction: column; gap: 12px;
}
.qc-header { display: flex; align-items: center; justify-content: space-between; }
.qc-time-badge {
  background: rgba(255,23,68,.15); border: 1px solid rgba(255,23,68,.3);
  color: #FF1744; font-size: 12px; font-family: 'DM Mono', monospace;
  padding: 3px 10px; border-radius: 20px;
}
.qc-close {
  background: none; border: none; color: #555; font-size: 14px;
  cursor: pointer; line-height: 1; transition: color .15s;
}
.qc-close:hover { color: #f0e6d3; }
.qc-day-label { font-size: 12px; color: #555; margin-top: -4px; }
.qc-error { font-size: 12px; color: #FF1744; margin: 0; }
.qc-actions { display: flex; gap: 8px; justify-content: flex-end; }
.qc-cancel {
  background: none; border: 1px solid #2a2a3e; color: #888;
  border-radius: 7px; padding: 6px 14px; font-size: 13px; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.qc-cancel:hover { color: #f0e6d3; border-color: #555; }
.qc-confirm {
  background: #FF1744; color: #fff; border: none;
  border-radius: 7px; padding: 6px 16px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.qc-confirm:disabled { opacity: .45; cursor: not-allowed; }
.qc-confirm:not(:disabled):hover { opacity: .85; }

/* ── Shift detail popover ── */
.shift-popover {
  position: fixed; z-index: 500;
  background: #13131f; border: 1px solid #2a2a3e; border-radius: 12px;
  padding: 16px; width: 220px;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  display: flex; flex-direction: column; gap: 6px;
}
.popover-close {
  position: absolute; top: 10px; right: 10px;
  background: none; border: none; color: #555; font-size: 13px;
  cursor: pointer; line-height: 1;
}
.popover-close:hover { color: #f0e6d3; }
.popover-label  { font-size: 14px; font-weight: 700; color: #f0e6d3; padding-right: 20px; }
.popover-time   { font-size: 12px; color: #FF1744; font-family: 'DM Mono', monospace; }
.popover-day    { font-size: 12px; color: #666; }
.popover-notes  { font-size: 12px; color: #555; font-style: italic; }
.popover-actions { display: flex; gap: 6px; margin-top: 6px; }
.popover-edit, .popover-delete {
  flex: 1; border: none; border-radius: 6px; padding: 6px 0;
  font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.popover-edit   { background: #1e1e2e; color: #888; }
.popover-edit:hover   { background: #2a2a3e; color: #f0e6d3; }
.popover-delete { background: rgba(255,23,68,.15); color: #FF1744; }
.popover-delete:hover { background: rgba(255,23,68,.25); }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #13131f; border: 1px solid #2a2a3e; border-radius: 12px;
  padding: 28px; width: 400px; max-width: calc(100vw - 32px);
  display: flex; flex-direction: column; gap: 16px;
}
.modal-title { font-size: 16px; font-weight: 700; color: #f0e6d3; }
.modal-error { font-size: 12px; color: #FF1744; margin: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* ── Shared form styles ── */
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label {
  font-size: 11px; font-weight: 600; color: #666;
  text-transform: uppercase; letter-spacing: .5px;
}
.form-group input, .form-group select {
  background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 7px;
  padding: 8px 10px; color: #f0e6d3; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color .15s;
}
.form-group input:focus, .form-group select:focus { border-color: #FF1744; }
.form-group input::placeholder { color: #333; }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }
.optional { color: #333; font-weight: 400; text-transform: none; letter-spacing: 0; }

.cancel-btn {
  background: none; border: 1px solid #2a2a3e; color: #888;
  border-radius: 7px; padding: 7px 16px; font-size: 13px; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.cancel-btn:hover { color: #f0e6d3; border-color: #555; }
.confirm-btn {
  background: #FF1744; color: #fff; border: none;
  border-radius: 7px; padding: 7px 18px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.confirm-btn:disabled { opacity: .45; cursor: not-allowed; }
.confirm-btn:not(:disabled):hover { opacity: .85; }

/* ── Transitions ── */
.popover-anim-enter-active, .popover-anim-leave-active { transition: opacity .12s, transform .12s; }
.popover-anim-enter-from, .popover-anim-leave-to { opacity: 0; transform: scale(.96) translateY(-4px); }

.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.modal-enter-active, .modal-leave-active { transition: opacity .15s, transform .15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.97); }
</style>
