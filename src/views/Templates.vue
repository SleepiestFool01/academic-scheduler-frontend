<template>
  <div class="page-root">

    <!-- ── Loading / Error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading templates…</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadTemplates">Retry</button>
    </div>

    <!-- ── Content ── -->
    <div class="content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Schedule Templates</h2>
          <p class="panel-sub">
            Build reusable schedule templates filled with shifts, then apply them to any week.
          </p>
        </div>
        <input v-model="search" class="search-input" placeholder="Search templates…" />
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredTemplates.length === 0 && !apiError" class="empty-card">
        <p class="empty-icon">🗓</p>
        <p class="empty-title">{{ search ? 'No templates match your search.' : 'No templates yet' }}</p>
        <p v-if="!search" class="empty-sub">
          Create a template to define a reusable schedule — add shifts, assign employees, and apply it any week.
        </p>
        <button v-if="!search" class="primary-btn" style="margin-top:16px;" @click="openCreate">
          + New Template
        </button>
      </div>

      <!-- Template cards grid -->
      <div class="templates-grid">
        <div v-for="tpl in filteredTemplates" :key="tpl.id_template" class="template-card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-name">{{ tpl.name }}</h3>
              <div class="card-actions">
                <button class="icon-action" title="Edit" @click="openEdit(tpl)">✎</button>
                <button class="icon-action danger" title="Delete" @click="confirmDelete(tpl)">✕</button>
              </div>
            </div>
            <p class="card-desc">{{ tpl.description || 'No description' }}</p>
          </div>
          <div class="card-meta">
            <span class="meta-chip">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="opacity:.6">
                <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Created {{ formatDate(tpl.createdAt) }}
            </span>
          </div>
          <div class="card-footer">
            <button class="outline-btn" @click="router.push('/templates/' + tpl.id_template)">
              Open Editor
            </button>
            <button class="apply-btn" @click="openApply(tpl)">
              Apply Template
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create / Edit Modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3 class="modal-title">{{ modal.isEdit ? 'Edit Template' : 'New Template' }}</h3>

          <div class="form-group">
            <label>Name</label>
            <input
              v-model="modal.data.name"
              type="text"
              placeholder="e.g. Standard Week, Summer Schedule"
              @keyup.enter="saveModal"
            />
          </div>
          <div class="form-group">
            <label>Description <span class="optional">(optional)</span></label>
            <textarea
              v-model="modal.data.description"
              placeholder="Describe when or how this template is used…"
              rows="3"
            />
          </div>

          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving || !modal.data.name.trim()" @click="saveModal">
              {{ modal.saving ? 'Saving…' : modal.isEdit ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Apply Template Modal ── -->
    <Transition name="modal">
      <div v-if="applyModal.open" class="modal-overlay" @click.self="applyModal.open = false">
        <div class="modal modal-apply">
          <h3 class="modal-title">Apply Template</h3>
          <p class="apply-tpl-name">{{ applyModal.template?.name }}</p>

          <div class="form-group">
            <label>Period Length</label>
            <div class="period-options">
              <button
                v-for="opt in PERIOD_OPTIONS"
                :key="opt.value"
                class="period-opt"
                :class="{ active: applyModal.period === opt.value }"
                @click="applyModal.period = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>

          <div v-if="!isCustomPeriod" class="form-group">
            <label>Period Start</label>
            <div class="date-picker-wrap">
              <button class="date-trigger" @click.stop="openPicker('start', applyModal.startDate)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="date-trigger-icon">
                  <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ formatDateDisplay(applyModal.startDate) || 'Select date' }}</span>
              </button>
              <Transition name="dpc-pop">
                <div v-if="datePicker.open && datePicker.field === 'start'" class="dpc-dropdown" @click.stop>
                  <div class="dpc-header">
                    <button class="dpc-nav" @click="prevPickerMonth">‹</button>
                    <span class="dpc-month-label">{{ pickerMonthLabel }}</span>
                    <button class="dpc-nav" @click="nextPickerMonth">›</button>
                  </div>
                  <div class="dpc-dow-row">
                    <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="dpc-dow">{{ d }}</span>
                  </div>
                  <div class="dpc-days">
                    <span v-for="p in pickerStartPad" :key="'p'+p" class="dpc-cell dpc-empty"></span>
                    <span v-for="day in pickerDaysInMonth" :key="day" class="dpc-cell"
                      :class="{ 'dpc-selected': isPickerDaySelected(day), 'dpc-today': isPickerDayToday(day) }"
                      @click="selectPickerDay(day)">{{ day }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <div v-if="isCustomPeriod" class="form-row-dates">
            <div class="form-group">
              <label>Start Date</label>
              <div class="date-picker-wrap">
                <button class="date-trigger" @click.stop="openPicker('start', applyModal.startDate)">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="date-trigger-icon">
                    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span>{{ formatDateDisplay(applyModal.startDate) || 'Select date' }}</span>
                </button>
                <Transition name="dpc-pop">
                  <div v-if="datePicker.open && datePicker.field === 'start'" class="dpc-dropdown" @click.stop>
                    <div class="dpc-header">
                      <button class="dpc-nav" @click="prevPickerMonth">‹</button>
                      <span class="dpc-month-label">{{ pickerMonthLabel }}</span>
                      <button class="dpc-nav" @click="nextPickerMonth">›</button>
                    </div>
                    <div class="dpc-dow-row">
                      <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="dpc-dow">{{ d }}</span>
                    </div>
                    <div class="dpc-days">
                      <span v-for="p in pickerStartPad" :key="'p'+p" class="dpc-cell dpc-empty"></span>
                      <span v-for="day in pickerDaysInMonth" :key="day" class="dpc-cell"
                        :class="{ 'dpc-selected': isPickerDaySelected(day), 'dpc-today': isPickerDayToday(day) }"
                        @click="selectPickerDay(day)">{{ day }}</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            <div class="date-range-arrow">→</div>
            <div class="form-group">
              <label>End Date</label>
              <div class="date-picker-wrap">
                <button class="date-trigger" @click.stop="openPicker('end', applyModal.endDate)">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="date-trigger-icon">
                    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                    <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span>{{ formatDateDisplay(applyModal.endDate) || 'Select date' }}</span>
                </button>
                <Transition name="dpc-pop">
                  <div v-if="datePicker.open && datePicker.field === 'end'" class="dpc-dropdown" @click.stop>
                    <div class="dpc-header">
                      <button class="dpc-nav" @click="prevPickerMonth">‹</button>
                      <span class="dpc-month-label">{{ pickerMonthLabel }}</span>
                      <button class="dpc-nav" @click="nextPickerMonth">›</button>
                    </div>
                    <div class="dpc-dow-row">
                      <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="dpc-dow">{{ d }}</span>
                    </div>
                    <div class="dpc-days">
                      <span v-for="p in pickerStartPad" :key="'p'+p" class="dpc-cell dpc-empty"></span>
                      <span v-for="day in pickerDaysInMonth" :key="day" class="dpc-cell"
                        :class="{
                          'dpc-selected': isPickerDaySelected(day),
                          'dpc-today':    isPickerDayToday(day),
                          'dpc-disabled': isPickerDayBeforeStart(day)
                        }"
                        @click="!isPickerDayBeforeStart(day) && selectPickerDay(day)">{{ day }}</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <div v-if="applyRangeLabel" class="apply-range-preview">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity:.5;flex-shrink:0">
              <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>{{ applyRangeLabel }}</span>
          </div>

          <p v-if="applyModal.error" class="modal-error">{{ applyModal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="applyModal.open = false">Cancel</button>
            <button
              class="confirm-btn"
              :disabled="applyModal.applying || !applyModal.startDate || (isCustomPeriod && !applyModal.endDate)"
              @click="applyTemplate"
            >
              {{ applyModal.applying ? 'Creating shifts…' : 'Apply Template' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete Confirm ── -->
    <Transition name="modal">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal modal-sm">
          <h3 class="modal-title">Delete "{{ deleteConfirm.template?.name }}"?</h3>
          <p class="modal-body-text">This template and all its shifts will be permanently removed. This cannot be undone.</p>
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
import { useRouter } from "vue-router";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
import Utils from "../config/utils.js";
import {
  fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
  fetchTemplateShifts,
  fetchTemplateShiftEmployees, fetchTemplateShiftTaskLists,
  createTemplateApplication, createTemplateApplicationShift,
} from "../services/templateService.js";
import apiClient from "../services/services.js";

const PERIOD_OPTIONS = [
  { label: "1 Week",  value: "1w",  days: 7  },
  { label: "2 Weeks", value: "2w",  days: 14 },
  { label: "3 Weeks", value: "3w",  days: 21 },
  { label: "1 Month", value: "1m",  days: 28 },
  { label: "Custom",  value: "custom", days: null },
];

const DAY_ENUM = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

function hourToTimeStr(h) {
  const totalMin = Math.round(h * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

useTheme(); // ensures data-theme is applied on this page
const router   = useRouter();
const loading  = ref(false);
const apiError = ref("");
const search   = ref("");

const templates = ref([]);

const filteredTemplates = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.description || "").toLowerCase().includes(q)
  );
});

const { selectedDeptId, myDepts, loadDepts } = useDepartment();

async function loadTemplates() {
  loading.value = true;
  apiError.value = "";
  try {
    templates.value = await fetchTemplates(selectedDeptId.value);
  } catch (err) {
    apiError.value = "Could not load templates: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

watch(selectedDeptId, loadTemplates);
onMounted(async () => {
  if (!myDepts.value.length) await loadDepts(Utils.getStore("user"));
  loadTemplates();
});

// ── Modal ──────────────────────────────────────────────────────────────────────
const modal = ref({
  open: false,
  isEdit: false,
  id: null,
  data: { name: "", description: "" },
  saving: false,
  error: "",
});

function openCreate() {
  modal.value = { open: true, isEdit: false, id: null, data: { name: "", description: "" }, saving: false, error: "" };
}

function openEdit(tpl) {
  modal.value = {
    open: true,
    isEdit: true,
    id: tpl.id_template,
    data: { name: tpl.name, description: tpl.description || "" },
    saving: false,
    error: "",
  };
}

function closeModal() {
  modal.value.open = false;
}

async function saveModal() {
  if (!modal.value.data.name.trim()) {
    modal.value.error = "Name is required.";
    return;
  }
  modal.value.saving = true;
  modal.value.error = "";
  try {
    if (modal.value.isEdit) {
      const updated = await updateTemplate(modal.value.id, modal.value.data);
      const idx = templates.value.findIndex(t => t.id_template === modal.value.id);
      if (idx !== -1) templates.value[idx] = updated;
    } else {
      const created = await createTemplate({ ...modal.value.data, id_department: selectedDeptId.value || null });
      router.push('/templates/' + created.id_template);
      return;
    }
    closeModal();
  } catch (err) {
    modal.value.error = err.response?.data?.message || err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────────
const deleteConfirm = ref({ open: false, template: null, saving: false });

function confirmDelete(tpl) {
  deleteConfirm.value = { open: true, template: tpl, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  try {
    await deleteTemplate(deleteConfirm.value.template.id_template);
    templates.value = templates.value.filter(t => t.id_template !== deleteConfirm.value.template.id_template);
    deleteConfirm.value.open = false;
  } catch (err) {
    // Show error inline if needed — for now just close
    deleteConfirm.value.open = false;
    apiError.value = err.response?.data?.message || err.message || "Delete failed.";
  } finally {
    deleteConfirm.value.saving = false;
  }
}

// ── Apply Template ─────────────────────────────────────────────────────────────

// Returns "YYYY-MM-DD" in local time (not UTC) — avoids UTC-midnight off-by-one
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultStartDate() {
  // Default to Monday of the current week
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return localDateStr(monday);
}

const applyModal = ref({
  open: false,
  template: null,
  period: "2w",
  startDate: "",
  endDate: "",
  applying: false,
  error: "",
});

const isCustomPeriod = computed(() => applyModal.value.period === "custom");

const applyRangeLabel = computed(() => {
  const fmt = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (isCustomPeriod.value) {
    if (!applyModal.value.startDate || !applyModal.value.endDate) return "";
    const start = new Date(applyModal.value.startDate + "T00:00:00");
    const end   = new Date(applyModal.value.endDate   + "T00:00:00");
    if (end < start) return "";
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (!applyModal.value.startDate) return "";
  const opt = PERIOD_OPTIONS.find(o => o.value === applyModal.value.period);
  const days = opt?.days ?? 14;
  const start = new Date(applyModal.value.startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + days - 1);
  return `${fmt(start)} – ${fmt(end)}`;
});

function openApply(tpl) {
  applyModal.value = {
    open: true,
    template: tpl,
    period: "2w",
    startDate: defaultStartDate(),
    endDate: "",
    applying: false,
    error: "",
  };
}

async function applyTemplate() {
  if (!applyModal.value.startDate) {
    applyModal.value.error = "Please select a start date.";
    return;
  }
  if (isCustomPeriod.value && !applyModal.value.endDate) {
    applyModal.value.error = "Please select an end date.";
    return;
  }
  applyModal.value.applying = true;
  applyModal.value.error = "";
  try {
    // 1. Resolve date range
    const start = new Date(applyModal.value.startDate + "T00:00:00");
    let end;
    if (isCustomPeriod.value) {
      end = new Date(applyModal.value.endDate + "T00:00:00");
      if (end < start) {
        applyModal.value.error = "End date must be after start date.";
        applyModal.value.applying = false;
        return;
      }
    } else {
      const opt = PERIOD_OPTIONS.find(o => o.value === applyModal.value.period);
      end = new Date(start);
      end.setDate(start.getDate() + (opt?.days ?? 14) - 1);
    }

    // 2. Fetch template shifts + their employees and task lists
    const tShifts = await fetchTemplateShifts(applyModal.value.template.id_template);
    await Promise.all(tShifts.map(async ts => {
      const [emps, tls] = await Promise.all([
        fetchTemplateShiftEmployees(ts.id_templateShift).catch(() => []),
        fetchTemplateShiftTaskLists(ts.id_templateShift).catch(() => []),
      ]);
      ts._employees = emps;
      ts._taskLists = tls;
    }));

    // 3. Create application record (best-effort — backend may not have endpoint yet)
    let application = null;
    try {
      application = await createTemplateApplication({
        id_template: applyModal.value.template.id_template,
        startDate:   localDateStr(start),
        endDate:     localDateStr(end),
      });
    } catch { /* live-sync link unavailable until backend adds endpoint */ }

    // 4. Walk every date in the range
    const current = new Date(start);
    while (current <= end) {
      const dowInt  = current.getDay();
      const dateStr = localDateStr(current);

      for (const ts of tShifts) {
        if (ts.dayOfWeek !== dowInt) continue;

        // Create the Shift row
        const { data: newShift } = await apiClient.post("/shifts", {
          name:          ts.label || "Shift",
          description:   ts.notes || "",
          day:           DAY_ENUM[dowInt],
          date:          dateStr,
          startTime:     hourToTimeStr(ts.startHour),
          endTime:       hourToTimeStr(ts.endHour),
          id_position:   ts.id_position || null,
          id_department: selectedDeptId.value || null,
        });

        // Create ShiftAssignments for each employee (if any)
        for (const emp of ts._employees) {
          await apiClient.post("/shift-assignments", {
            id_shift:    newShift.id_shift,
            id_employee: emp.id_employee,
            date:        dateStr,
          }).catch(() => {});
        }

        // Assign task lists (if any)
        for (const tl of ts._taskLists) {
          await apiClient.post("/shift-task-lists", {
            id_shift:   newShift.id_shift,
            id_taskList: tl.id_taskList,
          }).catch(() => {});
        }

        // Link shift to application so future edits can sync
        if (application) {
          await createTemplateApplicationShift({
            id_templateApplication: application.id_templateApplication,
            id_templateShift:       ts.id_templateShift,
            id_shift:               newShift.id_shift,
            date:                   dateStr,
          }).catch(() => {});
        }
      }

      current.setDate(current.getDate() + 1);
    }

    applyModal.value.open = false;
  } catch (err) {
    applyModal.value.error = err.response?.data?.message || err.message || "Apply failed.";
  } finally {
    applyModal.value.applying = false;
  }
}

// ── Date Picker ────────────────────────────────────────────────────────────────
const datePicker = ref({
  open: false,
  field: null,        // 'start' | 'end'
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-11
});

function openPicker(field, currentValue) {
  // Toggle if already open on the same field
  if (datePicker.value.open && datePicker.value.field === field) {
    datePicker.value.open = false;
    return;
  }
  const base = currentValue ? new Date(currentValue + "T00:00:00") : new Date();
  datePicker.value = {
    open: true,
    field,
    viewYear: base.getFullYear(),
    viewMonth: base.getMonth(),
  };
}

function closePicker() {
  datePicker.value.open = false;
  datePicker.value.field = null;
}

const pickerMonthLabel = computed(() => {
  const d = new Date(datePicker.value.viewYear, datePicker.value.viewMonth, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
});

const pickerDaysInMonth = computed(() => {
  return new Date(datePicker.value.viewYear, datePicker.value.viewMonth + 1, 0).getDate();
});

const pickerStartPad = computed(() => {
  // Sunday-first calendar
  return new Date(datePicker.value.viewYear, datePicker.value.viewMonth, 1).getDay();
});

function prevPickerMonth() {
  let m = datePicker.value.viewMonth - 1;
  let y = datePicker.value.viewYear;
  if (m < 0) { m = 11; y -= 1; }
  datePicker.value.viewMonth = m;
  datePicker.value.viewYear = y;
}

function nextPickerMonth() {
  let m = datePicker.value.viewMonth + 1;
  let y = datePicker.value.viewYear;
  if (m > 11) { m = 0; y += 1; }
  datePicker.value.viewMonth = m;
  datePicker.value.viewYear = y;
}

function pad2(n) { return String(n).padStart(2, "0"); }

function isPickerDaySelected(day) {
  const field = datePicker.value.field;
  const value = field === "end" ? applyModal.value.endDate : applyModal.value.startDate;
  if (!value) return false;
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  return value === iso;
}

function isPickerDayToday(day) {
  const today = new Date();
  return (
    day === today.getDate() &&
    datePicker.value.viewMonth === today.getMonth() &&
    datePicker.value.viewYear === today.getFullYear()
  );
}

function isPickerDayBeforeStart(day) {
  if (datePicker.value.field !== "end" || !applyModal.value.startDate) return false;
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  return iso < applyModal.value.startDate;
}

function selectPickerDay(day) {
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  if (datePicker.value.field === "end") {
    applyModal.value.endDate = iso;
  } else {
    applyModal.value.startDate = iso;
  }
  closePicker();
}

function formatDateDisplay(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Close picker when clicking outside or closing the apply modal
if (typeof window !== "undefined") {
  window.addEventListener("click", () => {
    if (datePicker.value.open) closePicker();
  });
}
watch(() => applyModal.value.open, (v) => { if (!v) closePicker(); });

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
/* ── Root ── */
.page-root {
  flex: 1;
  background: var(--bg-page);
  color: var(--tx-primary);
  font-family: 'Satoshi', sans-serif;
}

/* ── Top Nav ── */
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-left { display: flex; align-items: center; gap: 12px; }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); }
.nav-right { display: flex; align-items: center; gap: 10px; }
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--tx-muted);
  font-size: 15px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color .15s, background .15s;
}
.back-btn:hover { color: var(--tx-primary); background: var(--bg-hover); }
.page-title { font-size: 18px; font-weight: 600; color: var(--tx-heading); margin: 0; letter-spacing: -.2px; }
.primary-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.primary-btn:hover { opacity: .85; }

/* ── Loading / Error ── */
.loading-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 14px; }
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid var(--bdr-subtle);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: var(--tx-faint); font-size: 15px; }
.error-banner {
  background: var(--err-bg);
  border: 1px solid var(--accent);
  color: var(--err-text);
  padding: 10px 20px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.retry-btn {
  background: none;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 14px;
  cursor: pointer;
}

/* ── Content ── */
.content { max-width: 1100px; margin: 0 auto; padding: 32px 24px 60px; }
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.panel-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: var(--tx-heading); }
.panel-sub   { font-size: 15px; color: var(--tx-faint); margin: 0; }
.search-input {
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 7px 12px;
  color: var(--tx-primary);
  font-size: 15px;
  width: 220px;
  outline: none;
  transition: border-color .15s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-faded); }

/* ── Empty State ── */
.empty-card {
  text-align: center;
  padding: 64px 24px;
  background: var(--bg-surface);
  border: 1px dashed var(--bdr-faint);
  border-radius: 12px;
}
.empty-icon  { font-size: 40px; margin: 0 0 12px; }
.empty-title { font-size: 18px; font-weight: 600; color: var(--tx-heading); margin: 0 0 6px; }
.empty-sub   { font-size: 15px; color: var(--tx-faint); margin: 0; }

/* ── Templates Grid ── */
.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.template-card {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.template-card:hover { border-color: var(--bdr-faint); box-shadow: 0 4px 20px rgba(0,0,0,.25); }
.card-header { display: flex; flex-direction: column; gap: 6px; }
.card-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.card-name { font-size: 17px; font-weight: 600; color: var(--tx-heading); margin: 0; line-height: 1.3; }
.card-desc { font-size: 14px; color: var(--tx-faint); margin: 0; line-height: 1.5; }
.card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.icon-action {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 5px;
  width: 28px; height: 28px;
  cursor: pointer;
  font-size: 15px;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, border-color .15s, background .15s;
}
.icon-action:hover { color: var(--tx-primary); border-color: var(--bdr-medium); background: var(--bg-hover); }
.icon-action.danger:hover { color: var(--accent); border-color: var(--accent); background: var(--bg-active); }

.card-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.meta-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-subtle);
  border-radius: 20px; padding: 3px 10px;
  font-size: 13px; color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
}
.card-footer {
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px solid var(--bdr-subtle);
  display: flex; flex-direction: column; gap: 8px;
}
.outline-btn {
  width: 100%;
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px; padding: 7px 0; font-size: 15px;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.outline-btn:hover { color: var(--tx-primary); border-color: var(--bdr-medium); background: var(--bg-hover); }
.apply-btn {
  width: 100%;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  border-radius: 7px; padding: 7px 0; font-size: 15px; font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.apply-btn:hover { background: var(--accent-subtle); border-color: var(--accent); }

/* ── Modals ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: var(--bg-moverlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal {
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px; padding: 28px;
  width: 420px; max-width: calc(100vw - 32px);
  display: flex; flex-direction: column; gap: 16px;
}
.modal.modal-sm { width: 340px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-heading); margin: 0; }
.modal-body-text { font-size: 15px; color: var(--tx-secondary); margin: 0; line-height: 1.5; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
  font-size: 14px; font-weight: 600;
  color: var(--tx-muted);
  text-transform: uppercase; letter-spacing: .5px;
}
.form-group input,
.form-group textarea {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px; padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 15px; font-family: 'Satoshi', sans-serif;
  outline: none; transition: border-color .15s; resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus { border-color: var(--accent); }
.form-group input::placeholder,
.form-group textarea::placeholder { color: var(--tx-faded); }
.optional { color: var(--tx-faint); font-weight: 400; text-transform: none; letter-spacing: 0; }
.modal-error { color: var(--accent); font-size: 14px; margin: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.cancel-btn {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px; padding: 7px 16px; font-size: 15px;
  cursor: pointer; transition: color .15s, border-color .15s;
}
.cancel-btn:hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.confirm-btn {
  background: var(--accent);
  color: #fff; border: none;
  border-radius: 7px; padding: 7px 18px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.confirm-btn:disabled { opacity: .45; cursor: not-allowed; }
.confirm-btn:not(:disabled):hover { opacity: .85; }
.confirm-btn.danger { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity .15s, transform .15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.97); }

/* ── Apply Template Modal ── */
.modal-apply { width: 460px; }
.apply-tpl-name {
  font-size: 15px; color: var(--accent); font-weight: 600;
  margin: -8px 0 4px; font-family: 'DM Mono', monospace;
}
.period-options { display: flex; gap: 8px; flex-wrap: wrap; }
.period-opt {
  flex: 1; min-width: 70px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px; padding: 8px 10px; font-size: 15px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer; text-align: center;
  transition: color .15s, border-color .15s, background .15s;
}
.period-opt:hover { color: var(--tx-primary); border-color: var(--bdr-medium); background: var(--bg-hover); }
.period-opt.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.date-input {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px; padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 15px; font-family: 'Satoshi', sans-serif;
  outline: none; transition: border-color .15s;
  width: 100%;
}
.date-input:focus { border-color: var(--accent); }
.form-row-dates { display: flex; align-items: flex-end; gap: 10px; }
.form-row-dates .form-group { flex: 1; }
.date-range-arrow { font-size: 18px; color: var(--tx-faint); padding-bottom: 10px; flex-shrink: 0; }
.apply-range-preview {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 7px; padding: 10px 14px;
  font-size: 15px; font-family: 'DM Mono', monospace;
  color: var(--tx-primary);
  margin-top: -4px;
}

/* ── Date Picker ── */
.date-picker-wrap { position: relative; width: 100%; }
.date-trigger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 15px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.date-trigger:hover { border-color: var(--bdr-medium); background: var(--bg-hover); }
.date-trigger:focus { outline: none; border-color: var(--accent); }
.date-trigger-icon {
  color: var(--tx-secondary);
  flex-shrink: 0;
}
.date-trigger:hover .date-trigger-icon { color: var(--accent); }

.dpc-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: 280px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45),
              0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; gap: 10px;
  font-family: 'Satoshi', sans-serif;
}
.dpc-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
  padding: 0 2px 4px;
}
.dpc-nav {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-secondary);
  border-radius: 6px;
  width: 26px; height: 26px;
  font-size: 18px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, border-color .15s, background .15s;
}
.dpc-nav:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg);
}
.dpc-month-label {
  font-size: 15px; font-weight: 600;
  color: var(--tx-heading);
  letter-spacing: .2px;
}
.dpc-dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dpc-dow {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--tx-faint);
  padding: 4px 0;
  font-family: 'DM Mono', monospace;
}
.dpc-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dpc-cell {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  color: var(--tx-primary);
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s, color .12s, border-color .12s;
  user-select: none;
}
.dpc-cell:hover:not(.dpc-empty):not(.dpc-disabled) {
  background: var(--bg-hover);
  color: var(--tx-heading);
}
.dpc-empty { cursor: default; }
.dpc-today {
  border-color: var(--bdr-medium);
  color: var(--tx-heading);
  font-weight: 600;
}
.dpc-selected,
.dpc-selected:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.dpc-disabled {
  color: var(--tx-faded);
  cursor: not-allowed;
  opacity: .5;
}

.dpc-pop-enter-active, .dpc-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease;
  transform-origin: top left;
}
.dpc-pop-enter-from, .dpc-pop-leave-to {
  opacity: 0;
  transform: scale(.96) translateY(-4px);
}
</style>
