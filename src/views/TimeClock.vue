<template>
  <div class="page-root">
    <div class="content time-page">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">{{ isManager ? "Worked Hours Report" : "Clock In For Today's Shift" }}</h2>
          <p class="panel-sub">
            {{ isManager
              ? "Review worked time by employee and compare it to scheduled shifts for the selected date range."
              : "Start and end your shift here. Only today's assigned shifts in the selected department can be clocked." }}
          </p>
        </div>
        <button class="refresh-btn" @click="refreshAll" :disabled="loading">
          {{ loading ? "Refreshing..." : "Refresh" }}
        </button>
      </div>

      <div class="hero-card">
        <div>
          <p class="eyebrow">{{ isManager ? "Manager Hours" : "Employee Time Clock" }}</p>
          <div class="hero-copy">
            {{ isManager
              ? "Use the report below to compare worked hours, scheduled hours, and missing clock-ins."
              : "Use this page during your shift to clock in, clock out, and confirm the time that has been logged." }}
          </div>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div v-if="!selectedDeptId" class="empty-card">
        <p class="empty-text">Select a department to use time tracking.</p>
      </div>

      <template v-else-if="isManager">
        <section class="report-toolbar">
          <label class="field">
            <span class="field-label">Start date</span>
            <input v-model="reportRange.startDate" type="date" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">End date</span>
            <input v-model="reportRange.endDate" type="date" class="field-input" />
          </label>
          <button class="primary-btn" @click="loadReport" :disabled="loading">Load hours</button>
        </section>

        <section class="summary-grid">
          <article class="stat-card">
            <span class="stat-label">Worked hours</span>
            <strong class="stat-value">{{ formatHours(totalWorkedMinutes) }}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Scheduled hours</span>
            <strong class="stat-value">{{ formatHours(totalScheduledMinutes) }}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Employees tracked</span>
            <strong class="stat-value">{{ report.summary.length }}</strong>
          </article>
        </section>

        <section class="section">
          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title">Employee Totals</h2>
            </div>
            <span class="section-sub">{{ report.startDate }} to {{ report.endDate }}</span>
          </div>
          <div v-if="!report.summary.length" class="empty-card">
            <p class="empty-text">No worked hours found for this range.</p>
          </div>
          <div v-else class="panel">
            <div class="summary-list">
              <div v-for="row in report.summary" :key="row.id_employee" class="summary-row">
                <div class="summary-person">
                  <span class="summary-dot" :style="{ background: row.color || 'var(--accent)' }"></span>
                  <div>
                    <div class="summary-name">{{ row.employeeName }}</div>
                    <div class="summary-meta">{{ row.email }}</div>
                  </div>
                </div>
                <div class="summary-metrics">
                  <span>{{ formatHours(row.totalWorkedMinutes) }} worked</span>
                  <span>{{ formatHours(row.totalScheduledMinutes) }} scheduled</span>
                  <span>{{ row.shiftCount }} entries</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title">Detailed Entries</h2>
              <span class="section-badge">{{ report.entries.length }}</span>
            </div>
          </div>
          <div v-if="!report.entries.length" class="empty-card">
            <p class="empty-text">No time entries to display.</p>
          </div>
          <div v-else class="panel table-wrap">
            <table class="hours-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Position</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Worked</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in report.entries" :key="entry.id_shiftAssignment || entry.id_timeEntry">
                  <td>{{ entry.employeeName }}</td>
                  <td>{{ entry.date }}</td>
                  <td>{{ entry.shiftName }}</td>
                  <td>{{ entry.positionName || "—" }}</td>
                  <td>{{ formatDateTime(entry.clockInAt) }}</td>
                  <td>{{ entry.clockOutAt ? formatDateTime(entry.clockOutAt) : "Open" }}</td>
                  <td>{{ formatHours(entry.workedMinutes) }}</td>
                  <td>{{ formatHours(entry.scheduledMinutes) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="employee-grid">
          <article v-for="shift in status.shifts" :key="shift.id_shiftAssignment" class="shift-card">
            <div class="shift-head">
              <div>
                <p class="shift-name">{{ shift.shiftName }}</p>
                <h2>{{ shift.positionName || "Assigned shift" }}</h2>
              </div>
              <span class="status-pill" :class="`status-pill--${shift.status}`">
                {{ statusLabel(shift.status) }}
              </span>
            </div>

            <div class="shift-meta">
              <span>{{ shift.date }}</span>
              <span>{{ formatTimeRange(shift.startTime, shift.endTime) }}</span>
              <span>{{ formatHours(shift.scheduledMinutes) }} scheduled</span>
            </div>

            <div class="entry-box">
              <div class="entry-line">
                <span>Clock in</span>
                <strong>{{ shift.latestEntry ? formatDateTime(shift.latestEntry.clockInAt) : "Not started" }}</strong>
              </div>
              <div class="entry-line">
                <span>Clock out</span>
                <strong>{{ shift.latestEntry?.clockOutAt ? formatDateTime(shift.latestEntry.clockOutAt) : "Open" }}</strong>
              </div>
              <div class="entry-line">
                <span>Worked</span>
                <strong>{{ shift.latestEntry ? formatHours(displayWorkedMinutes(shift.latestEntry)) : "0.00h" }}</strong>
              </div>
            </div>

            <button
              v-if="shift.status === 'not_started'"
              class="primary-btn"
              :disabled="loadingActionId === shift.id_shiftAssignment"
              @click="handleClockIn(shift.id_shiftAssignment)"
            >
              {{ loadingActionId === shift.id_shiftAssignment ? "Clocking in..." : "Clock In" }}
            </button>
            <button
              v-else-if="shift.status === 'clocked_in'"
              class="danger-btn"
              :disabled="loadingActionId === shift.latestEntry?.id_timeEntry"
              @click="handleClockOut(shift.latestEntry.id_timeEntry)"
            >
              {{ loadingActionId === shift.latestEntry?.id_timeEntry ? "Clocking out..." : "Clock Out" }}
            </button>
            <div v-else class="done-note">This shift has been clocked and completed.</div>
          </article>
        </section>

        <div v-if="!status.shifts.length && !loading" class="empty-card">
          <p class="empty-text">No assigned shifts for today in this department.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import Utils from "../config/utils.js";
import { useDepartment } from "../composables/useDepartment.js";
import { getHoursReport, getMyTimeStatus, clockInToShift, clockOutOfShift } from "../services/timeEntryService.js";

const currentUser = ref(Utils.getStore("user") || {});
const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);

const { selectedDeptId, myDepts, loadDepts } = useDepartment();

const loading = ref(false);
const error = ref("");
const loadingActionId = ref(null);

function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const endDate = localDateKey(today);
const startSeed = new Date(today);
startSeed.setDate(today.getDate() - 6);

const reportRange = reactive({
  startDate: localDateKey(startSeed),
  endDate,
});

const status = reactive({ date: endDate, shifts: [] });
const report = reactive({ startDate: reportRange.startDate, endDate: reportRange.endDate, summary: [], entries: [] });

const totalWorkedMinutes = computed(() =>
  report.summary.reduce((sum, row) => sum + Number(row.totalWorkedMinutes || 0), 0)
);
const totalScheduledMinutes = computed(() =>
  report.summary.reduce((sum, row) => sum + Number(row.totalScheduledMinutes || 0), 0)
);

function formatHours(minutes) {
  const safeMinutes = Number(minutes || 0);
  return `${(safeMinutes / 60).toFixed(2)}h`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(startTime, endTime) {
  const fmt = (raw) => {
    if (!raw) return "—";
    const [hour, minute] = String(raw).split(":");
    const d = new Date();
    d.setHours(Number(hour), Number(minute || 0), 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  return `${fmt(startTime)} - ${fmt(endTime)}`;
}

function displayWorkedMinutes(entry) {
  if (!entry) return 0;
  if (entry.workedMinutes != null) return entry.workedMinutes;
  if (!entry.clockInAt) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(entry.clockInAt).getTime()) / 60000));
}

function statusLabel(value) {
  return {
    not_started: "Not started",
    clocked_in: "Clocked in",
    completed: "Completed",
  }[value] || value;
}

async function loadStatus() {
  const { data } = await getMyTimeStatus(selectedDeptId.value);
  status.date = data.date;
  status.shifts = data.shifts || [];
}

async function loadReport() {
  const { data } = await getHoursReport({
    id_department: selectedDeptId.value,
    startDate: reportRange.startDate,
    endDate: reportRange.endDate,
  });
  report.startDate = data.startDate;
  report.endDate = data.endDate;
  report.summary = data.summary || [];
  report.entries = data.entries || [];
}

async function refreshAll() {
  if (!selectedDeptId.value) return;
  loading.value = true;
  error.value = "";
  try {
    if (isManager.value) await loadReport();
    else await loadStatus();
  } catch (err) {
    error.value = err?.response?.data?.message || err.message || "Could not load time tracking.";
  } finally {
    loading.value = false;
  }
}

async function handleClockIn(id_shiftAssignment) {
  loadingActionId.value = id_shiftAssignment;
  error.value = "";
  try {
    await clockInToShift(id_shiftAssignment);
    await loadStatus();
  } catch (err) {
    error.value = err?.response?.data?.message || err.message || "Clock in failed.";
  } finally {
    loadingActionId.value = null;
  }
}

async function handleClockOut(id_timeEntry) {
  loadingActionId.value = id_timeEntry;
  error.value = "";
  try {
    await clockOutOfShift(id_timeEntry);
    await loadStatus();
  } catch (err) {
    error.value = err?.response?.data?.message || err.message || "Clock out failed.";
  } finally {
    loadingActionId.value = null;
  }
}

watch(selectedDeptId, refreshAll);

onMounted(async () => {
  if (!myDepts.value.length) await loadDepts(currentUser.value);
  await refreshAll();
});
</script>

<style scoped>
.time-page {
  display: grid;
  gap: 20px;
}

.hero-card,
.panel,
.shift-card,
.stat-card {
  background: var(--bg-panel);
  border: 1px solid var(--bdr-subtle);
  border-radius: 18px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
}

.hero-card {
  padding: 18px 20px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tx-label-dim);
  font-weight: 700;
}

.hero-copy {
  max-width: 64ch;
  color: var(--tx-secondary);
  line-height: 1.55;
}

.report-toolbar,
.summary-grid,
.employee-grid {
  display: grid;
  gap: 16px;
}

.report-toolbar {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  align-items: end;
}

.summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.employee-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.field-label {
  color: var(--tx-secondary);
  font-size: 0.92rem;
  font-weight: 600;
}

.field-input,
.primary-btn,
.danger-btn,
.refresh-btn {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid var(--bdr-subtle);
  font: inherit;
}

.field-input {
  padding: 0 12px;
  background: var(--bg-input);
  color: var(--tx-primary);
}

.primary-btn,
.danger-btn,
.refresh-btn {
  padding: 0 16px;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.primary-btn {
  background: var(--accent);
  color: #fff;
}

.danger-btn {
  background: var(--danger-btn);
  color: #fff;
}

.refresh-btn {
  background: var(--bg-input);
  color: var(--tx-primary);
}

.primary-btn:disabled,
.danger-btn:disabled,
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.stat-card,
.panel,
.shift-card {
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.panel-title {
  margin: 0;
  color: var(--tx-heading);
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.panel-sub {
  margin: 6px 0 0;
  color: var(--tx-secondary);
  line-height: 1.55;
}

.stat-label {
  display: block;
  color: var(--tx-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.8rem;
  color: var(--tx-heading);
}

.panel-head,
.shift-head,
.summary-row,
.entry-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.panel-head {
  align-items: center;
  margin-bottom: 16px;
  color: var(--tx-secondary);
}

.panel-head h2,
.shift-head h2 {
  margin: 0;
  color: var(--tx-heading);
  font-size: 1.15rem;
}

.section {
  display: grid;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title {
  margin: 0;
  color: var(--tx-heading);
  font-size: 1.05rem;
}

.section-sub,
.section-badge {
  color: var(--tx-secondary);
}

.section-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--bg-input);
  border: 1px solid var(--bdr-subtle);
  font-size: 0.84rem;
}

.summary-list {
  display: grid;
  gap: 12px;
}

.summary-row {
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--bdr-subtle);
}

.summary-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.summary-person {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.summary-name {
  font-weight: 700;
  color: var(--tx-heading);
}

.summary-meta {
  color: var(--tx-secondary);
  font-size: 0.92rem;
}

.summary-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--tx-secondary);
}

.hours-table {
  width: 100%;
  border-collapse: collapse;
}

.hours-table th,
.hours-table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid var(--bdr-subtle);
  color: var(--tx-primary);
}

.hours-table th {
  color: var(--tx-label-dim);
  font-size: 0.84rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.table-wrap {
  overflow-x: auto;
}

.shift-name {
  margin: 0 0 4px;
  color: var(--tx-label-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

.shift-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 14px 0 18px;
  color: var(--tx-secondary);
}

.entry-box {
  display: grid;
  gap: 10px;
  padding: 14px;
  margin-bottom: 18px;
  border-radius: 16px;
  background: var(--bg-input);
  border: 1px solid var(--bdr-subtle);
}

.entry-line span {
  color: var(--tx-secondary);
}

.entry-line strong {
  color: var(--tx-heading);
}

.status-pill {
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.status-pill--not_started {
  background: var(--warn-bg);
  color: var(--warn-text);
}

.status-pill--clocked_in {
  background: var(--ok-bg);
  color: var(--ok-text);
}

.status-pill--completed {
  background: var(--bg-input);
  color: var(--tx-secondary);
  border: 1px solid var(--bdr-subtle);
}

.done-note,
.empty-card,
.error-banner {
  padding: 16px 18px;
  border-radius: 16px;
}

.done-note,
.empty-card {
  background: var(--bg-panel);
  color: var(--tx-secondary);
  border: 1px solid var(--bdr-subtle);
}

.empty-text {
  margin: 0;
}

.error-banner {
  background: var(--err-bg);
  color: var(--err-text);
  border: 1px solid var(--err-border);
}

@media (max-width: 700px) {
  .panel-header,
  .hero-card,
  .summary-row,
  .shift-head,
  .entry-line,
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
