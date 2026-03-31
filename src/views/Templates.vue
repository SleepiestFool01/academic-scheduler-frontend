<template>
  <div class="page-root">

    <!-- ── Top Nav ── -->
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
        <h1 class="page-title">Templates</h1>
      </div>
      <div class="nav-right">
        <button class="primary-btn" @click="openCreate">+ New Template</button>
      </div>
    </div>

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
            <input
              v-model="applyModal.startDate"
              type="date"
              class="date-input"
            />
          </div>

          <div v-if="isCustomPeriod" class="form-row-dates">
            <div class="form-group">
              <label>Start Date</label>
              <input
                v-model="applyModal.startDate"
                type="date"
                class="date-input"
              />
            </div>
            <div class="date-range-arrow">→</div>
            <div class="form-group">
              <label>End Date</label>
              <input
                v-model="applyModal.endDate"
                type="date"
                class="date-input"
                :min="applyModal.startDate || undefined"
              />
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
function defaultStartDate() {
  // Default to Monday of the current week
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
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
        startDate:   start.toISOString().slice(0, 10),
        endDate:     end.toISOString().slice(0, 10),
      });
    } catch { /* live-sync link unavailable until backend adds endpoint */ }

    // 4. Walk every date in the range
    const current = new Date(start);
    while (current <= end) {
      const dowInt  = current.getDay();
      const dateStr = current.toISOString().slice(0, 10);

      for (const ts of tShifts) {
        if (ts.dayOfWeek !== dowInt) continue;

        // Create the Shift row
        const { data: newShift } = await apiClient.post("/shifts", {
          name:        ts.label || "Shift",
          description: ts.notes || "",
          day:         DAY_ENUM[dowInt],
          date:        dateStr,
          startTime:   hourToTimeStr(ts.startHour),
          endTime:     hourToTimeStr(ts.endHour),
          id_position: ts.id_position || null,
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
</script>

<style scoped>
/* ── Root ── */
.page-root {
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--tx-primary);
  font-family: 'DM Sans', sans-serif;
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
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color .15s, background .15s;
}
.back-btn:hover { color: var(--tx-primary); background: var(--bg-hover); }
.page-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); margin: 0; letter-spacing: -.2px; }
.primary-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 13px;
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
.loading-text { color: var(--tx-faint); font-size: 13px; }
.error-banner {
  background: var(--err-bg);
  border: 1px solid var(--accent);
  color: var(--err-text);
  padding: 10px 20px;
  font-size: 13px;
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
  font-size: 12px;
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
.panel-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: var(--tx-heading); }
.panel-sub   { font-size: 13px; color: var(--tx-faint); margin: 0; }
.search-input {
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 7px 12px;
  color: var(--tx-primary);
  font-size: 13px;
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
.empty-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); margin: 0 0 6px; }
.empty-sub   { font-size: 13px; color: var(--tx-faint); margin: 0; }

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
.card-name { font-size: 15px; font-weight: 600; color: var(--tx-heading); margin: 0; line-height: 1.3; }
.card-desc { font-size: 12px; color: var(--tx-faint); margin: 0; line-height: 1.5; }
.card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.icon-action {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 5px;
  width: 28px; height: 28px;
  cursor: pointer;
  font-size: 13px;
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
  font-size: 11px; color: var(--tx-faint);
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
  border-radius: 7px; padding: 7px 0; font-size: 13px;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.outline-btn:hover { color: var(--tx-primary); border-color: var(--bdr-medium); background: var(--bg-hover); }
.apply-btn {
  width: 100%;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  border-radius: 7px; padding: 7px 0; font-size: 13px; font-weight: 600;
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
.modal-title { font-size: 16px; font-weight: 700; color: var(--tx-heading); margin: 0; }
.modal-body-text { font-size: 13px; color: var(--tx-secondary); margin: 0; line-height: 1.5; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
  font-size: 12px; font-weight: 600;
  color: var(--tx-muted);
  text-transform: uppercase; letter-spacing: .5px;
}
.form-group input,
.form-group textarea {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px; padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  outline: none; transition: border-color .15s; resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus { border-color: var(--accent); }
.form-group input::placeholder,
.form-group textarea::placeholder { color: var(--tx-faded); }
.optional { color: var(--tx-faint); font-weight: 400; text-transform: none; letter-spacing: 0; }
.modal-error { color: var(--accent); font-size: 12px; margin: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.cancel-btn {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px; padding: 7px 16px; font-size: 13px;
  cursor: pointer; transition: color .15s, border-color .15s;
}
.cancel-btn:hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.confirm-btn {
  background: var(--accent);
  color: #fff; border: none;
  border-radius: 7px; padding: 7px 18px; font-size: 13px; font-weight: 600;
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
  font-size: 13px; color: var(--accent); font-weight: 600;
  margin: -8px 0 4px; font-family: 'DM Mono', monospace;
}
.period-options { display: flex; gap: 8px; flex-wrap: wrap; }
.period-opt {
  flex: 1; min-width: 70px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px; padding: 8px 10px; font-size: 13px;
  font-family: 'DM Sans', sans-serif;
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
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  outline: none; transition: border-color .15s;
  width: 100%;
}
.date-input:focus { border-color: var(--accent); }
.form-row-dates { display: flex; align-items: flex-end; gap: 10px; }
.form-row-dates .form-group { flex: 1; }
.date-range-arrow { font-size: 16px; color: var(--tx-faint); padding-bottom: 10px; flex-shrink: 0; }
.apply-range-preview {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 7px; padding: 10px 14px;
  font-size: 13px; font-family: 'DM Mono', monospace;
  color: var(--tx-primary);
  margin-top: -4px;
}
</style>
