<template>
  <Transition name="modal">
    <div v-if="open" class="modal-overlay" @click.self="close">
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3 class="modal-title">{{ employeeName }}'s availability</h3>
            <p class="modal-sub">Recurring class schedule and other weekly commitments</p>
          </div>
          <button class="close-btn" @click="close">✕</button>
        </div>

        <div v-if="loading" class="inline-loading">Loading…</div>
        <div v-else-if="error" class="inline-error">{{ error }}</div>

        <div v-else class="grid-wrap">
          <div class="cal-header-row">
            <div class="time-gutter"></div>
            <div v-for="(d, i) in DAY_NAMES" :key="i" class="day-header">{{ d }}</div>
          </div>
          <div class="cal-inner" :style="{ height: (HOURS.length * HOUR_PX) + 'px' }">
            <div class="time-column">
              <div v-for="h in HOURS" :key="h" class="time-slot-label" :style="{ height: HOUR_PX + 'px' }">
                {{ fmtHour(h) }}
              </div>
            </div>
            <div v-for="(d, colIdx) in DAY_NAMES" :key="colIdx" class="day-column">
              <div v-for="h in HOURS" :key="h" class="hour-cell" :style="{ height: HOUR_PX + 'px' }"></div>
              <div v-for="row in rowsForDay(colIdx)" :key="row.id_employeeUnavailability"
                class="avail-block"
                :class="{ 'avail-block--imported': row.source === 'imported' }"
                :style="blockStyle(row)">
                <div class="avail-block-title">{{ blockTitle(row) }}</div>
                <div class="avail-block-time">{{ fmtTimeRange(row.startTime, row.endTime) }}</div>
                <span v-if="row.source === 'imported'" class="avail-block-badge">Imported</span>
              </div>
            </div>
          </div>
        </div>

        <p v-if="!loading && !error && rows.length === 0" class="empty-note">
          This employee has no unavailability on record.
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { getUnavailability } from "../services/unavailabilityService.js";
import { useUnavailabilityRefresh } from "../composables/useUnavailabilityRefresh.js";
import { usePreferences } from "../composables/usePreferences.js";

const props = defineProps({
  open:     { type: Boolean, default: false },
  employee: { type: Object,  default: null }, // { id_employee, fName, lName }
});
const emit = defineEmits(["close"]);

const DAY_NAMES      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const HOURS          = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_PX        = 38;

const rows    = ref([]);
const loading = ref(false);
const error   = ref("");

const employeeName = computed(() => {
  const e = props.employee;
  return e ? `${e.fName || ""} ${e.lName || ""}`.trim() || `Employee #${e.id_employee}` : "";
});

const { fmtHour } = usePreferences();
function timeStrToHour(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
function fmtTimeRange(s, e) { return `${fmtHour(timeStrToHour(s))} – ${fmtHour(timeStrToHour(e))}`; }
function dayIdx(name) { return DAY_NAMES_FULL.indexOf(name); }
function rowsForDay(colIdx) { return rows.value.filter(r => dayIdx(r.dayOfWeek) === colIdx); }
function blockStyle(row) {
  const start = timeStrToHour(row.startTime);
  const end   = timeStrToHour(row.endTime);
  const gridStart = HOURS[0];
  return {
    top:    Math.max(0, (start - gridStart) * HOUR_PX) + "px",
    height: Math.max(18, (end - start) * HOUR_PX) + "px",
  };
}
function blockTitle(row) { return row.label || "Unavailable"; }

function close() { emit("close"); }

async function load() {
  if (!props.employee?.id_employee) return;
  loading.value = true; error.value = "";
  try {
    const res = await getUnavailability({ id_employee: props.employee.id_employee });
    rows.value = res.data || [];
  } catch (err) {
    error.value = err.response?.data?.message || err.message || "Failed to load availability";
  } finally {
    loading.value = false;
  }
}

// Reload whenever the modal is opened for a new employee so a manager
// clicking through several people in EmployeeManagement always sees fresh
// data.
watch(() => [props.open, props.employee?.id_employee], ([nowOpen]) => {
  if (nowOpen) load();
}, { immediate: true });

// Also re-fetch while the modal is already open if a sync completes
// somewhere else (e.g. the manager clicks Bulk Sync with the modal open).
const { lastSyncTimestamp } = useUnavailabilityRefresh();
watch(lastSyncTimestamp, () => { if (props.open) load(); });
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }

.modal-overlay {
  position: fixed; inset: 0; background: var(--bg-moverlay, rgba(0,0,0,0.5));
  display: flex; align-items: center; justify-content: center;
  z-index: 300; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px;
  padding: 24px; width: 760px; max-width: 92vw; max-height: 90vh;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); }
.modal-sub { font-size: 13px; color: var(--tx-faint); margin-top: 3px; }
.close-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.close-btn:hover { color: var(--tx-primary); }

.inline-loading, .inline-error, .empty-note {
  padding: 28px 12px; text-align: center; color: var(--tx-faint); font-size: 14px;
}
.inline-error { color: var(--err-text); }

.grid-wrap {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 10px;
  overflow: auto; flex: 1;
}
.cal-header-row {
  display: grid; grid-template-columns: 54px repeat(7, 1fr);
  background: var(--bg-active); border-bottom: 1px solid var(--bdr-subtle);
  position: sticky; top: 0; z-index: 2;
}
.day-header {
  padding: 8px 0; text-align: center;
  font-size: 12px; font-weight: 600; color: var(--tx-secondary);
  border-left: 1px solid var(--bdr-subtle);
  font-family: 'DM Mono', monospace; letter-spacing: 0.05em;
}

.cal-inner {
  display: grid; grid-template-columns: 54px repeat(7, 1fr); position: relative;
}
.time-column { border-right: 1px solid var(--bdr-subtle); }
.time-slot-label {
  padding-right: 6px; text-align: right; font-size: 10px; color: var(--tx-faint);
  font-family: 'DM Mono', monospace; border-bottom: 1px solid var(--bdr-subtle);
  display: flex; align-items: flex-start; justify-content: flex-end; padding-top: 3px;
}
.day-column { position: relative; border-left: 1px solid var(--bdr-subtle); }
.hour-cell { border-bottom: 1px solid var(--bdr-subtle); }

.avail-block {
  position: absolute; left: 2px; right: 2px;
  background: var(--accent-bg); border: 1px solid var(--accent-border, rgba(255,23,68,0.3));
  border-radius: 5px; padding: 3px 5px; overflow: hidden;
  font-size: 11px; color: var(--tx-primary);
}
.avail-block--imported {
  background: rgba(74, 144, 164, 0.18);
  border-color: rgba(74, 144, 164, 0.5);
}
.avail-block-title { font-weight: 600; line-height: 1.2; }
.avail-block-time { font-size: 10px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.avail-block-badge {
  display: inline-block; margin-top: 2px; font-size: 9px; font-weight: 700;
  padding: 1px 5px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em;
  background: rgba(74, 144, 164, 0.3); color: #4A90A4;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>
