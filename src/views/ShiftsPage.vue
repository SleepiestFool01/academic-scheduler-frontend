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
        <span class="page-title">Shifts</span>
        <span class="week-label">{{ weekLabel }}</span>
      </div>
      <div class="nav-right">
        <div v-if="currentUser" class="avatar" :title="`${currentUser.fName} ${currentUser.lName}`">
          <img v-if="currentUser.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </div>

    <!-- ── Loading / Error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading shifts…</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadShifts">Retry</button>
    </div>

    <!-- ── Content ── -->
    <div v-if="!loading" class="content">

      <!-- PAST -->
      <div class="section">
        <div class="section-header">
          <div class="section-title-row">
            <span class="section-dot section-dot--past"></span>
            <h2 class="section-title">Past</h2>
            <span class="section-badge">{{ pastShifts.length }}</span>
          </div>
          <span class="section-sub">{{ weekStart }} – {{ yesterday }}</span>
        </div>

        <div v-if="pastShifts.length === 0" class="empty-card">
          <p class="empty-text">No past shifts this week.</p>
        </div>
        <div v-else class="groups-list">
          <div v-for="group in groupByEmployee(pastShifts)" :key="group.employeeId" class="group-card group-card--past">
            <div class="group-header">
              <div class="emp-avatar" :style="{ background: avatarColor(group.employeeId) }">{{ group.initials }}</div>
              <span class="group-name">{{ group.employeeName }}</span>
              <span class="group-pill">{{ group.shifts.length }} shift{{ group.shifts.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="shift-table">
              <div v-for="shift in group.shifts" :key="shift.id" class="shift-row">
                <span class="col-day">{{ dayName(shift.date) }} <span class="col-date">{{ shortDate(shift.date) }}</span></span>
                <span class="col-time mono">{{ shift.startLabel }} – {{ shift.endLabel }}</span>
                <span class="col-pos"><span v-if="shift.positionName" class="pos-badge">{{ shift.positionName }}</span></span>
                <span class="col-notes">{{ shift.notes || '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TODAY -->
      <div class="section">
        <div class="section-header">
          <div class="section-title-row">
            <span class="section-dot section-dot--today"></span>
            <h2 class="section-title section-title--today">Today</h2>
            <span class="section-badge section-badge--today">{{ currentShifts.length }}</span>
          </div>
          <span class="section-sub">{{ todayKey }}</span>
        </div>

        <div v-if="currentShifts.length === 0" class="empty-card">
          <p class="empty-text">No shifts scheduled for today.</p>
        </div>
        <div v-else class="groups-list">
          <div v-for="group in groupByEmployee(currentShifts)" :key="group.employeeId" class="group-card">
            <div class="group-header">
              <div class="emp-avatar" :style="{ background: avatarColor(group.employeeId) }">{{ group.initials }}</div>
              <span class="group-name">{{ group.employeeName }}</span>
              <span class="group-pill">{{ group.shifts.length }} shift{{ group.shifts.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="shift-table">
              <div v-for="shift in group.shifts" :key="shift.id" class="shift-row"
                :class="{ 'shift-row--live': isActiveNow(shift) }">
                <span class="col-day">
                  Today
                  <span v-if="isActiveNow(shift)" class="live-chip">Live</span>
                </span>
                <span class="col-time mono">{{ shift.startLabel }} – {{ shift.endLabel }}</span>
                <span class="col-pos"><span v-if="shift.positionName" class="pos-badge">{{ shift.positionName }}</span></span>
                <span class="col-notes">{{ shift.notes || '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- UPCOMING -->
      <div class="section">
        <div class="section-header">
          <div class="section-title-row">
            <span class="section-dot section-dot--upcoming"></span>
            <h2 class="section-title">Upcoming</h2>
            <span class="section-badge">{{ upcomingShifts.length }}</span>
          </div>
          <span class="section-sub">{{ tomorrow }} – {{ weekEnd }}</span>
        </div>

        <div v-if="upcomingShifts.length === 0" class="empty-card">
          <p class="empty-text">No upcoming shifts this week.</p>
        </div>
        <div v-else class="groups-list">
          <div v-for="group in groupByEmployee(upcomingShifts)" :key="group.employeeId" class="group-card">
            <div class="group-header">
              <div class="emp-avatar" :style="{ background: avatarColor(group.employeeId) }">{{ group.initials }}</div>
              <span class="group-name">{{ group.employeeName }}</span>
              <span class="group-pill">{{ group.shifts.length }} shift{{ group.shifts.length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="shift-table">
              <div v-for="shift in group.shifts" :key="shift.id" class="shift-row">
                <span class="col-day">{{ dayName(shift.date) }} <span class="col-date">{{ shortDate(shift.date) }}</span></span>
                <span class="col-time mono">{{ shift.startLabel }} – {{ shift.endLabel }}</span>
                <span class="col-pos"><span v-if="shift.positionName" class="pos-badge">{{ shift.positionName }}</span></span>
                <span class="col-notes">{{ shift.notes || '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
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
import { fetchShiftsWithAssignments } from "../services/schedulingService.js";

useTheme();

const router      = useRouter();
const currentUser = ref(Utils.getStore("user"));
const loading     = ref(false);
const apiError    = ref("");

const { selectedDeptId, myDepts, loadDepts } = useDepartment();
const isManager = computed(() => currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin");

const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u?.fName?.[0] ?? ""}${u?.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

// ── Week bounds ────────────────────────────────────────────────────────────────
const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);
const todayKey = todayDate.toISOString().slice(0, 10);

function getWeekBounds() {
  const d   = new Date(todayDate);
  const dow = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

const { start: weekStart, end: weekEnd } = getWeekBounds();

const yesterdayDate = new Date(todayDate); yesterdayDate.setDate(todayDate.getDate() - 1);
const tomorrowDate  = new Date(todayDate); tomorrowDate.setDate(todayDate.getDate() + 1);
const yesterday = yesterdayDate.toISOString().slice(0, 10);
const tomorrow  = tomorrowDate.toISOString().slice(0, 10);

const weekLabel = computed(() => {
  const fmt = d => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
});

// ── Data ──────────────────────────────────────────────────────────────────────
const allShifts = ref([]);

async function loadShifts() {
  loading.value  = true;
  apiError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const deptQs = deptId ? `?id_department=${deptId}` : "";

    const [empRes, posRes] = await Promise.all([
      apiClient.get(`/employees${deptQs}`),
      deptId ? apiClient.get(`/position?id_department=${deptId}`) : Promise.resolve({ data: [] }),
    ]);

    const empMap = {};
    for (const e of empRes.data) empMap[e.id_employee] = e;
    const posMap = {};
    for (const p of posRes.data) posMap[p.id_position] = p;

    let shifts = await fetchShiftsWithAssignments(empMap, posMap, deptId);
    shifts = shifts.filter(s => s.date >= weekStart && s.date <= weekEnd);
    // Employees only see their own shifts
    if (!isManager.value) {
      shifts = shifts.filter(s => s.id_employee === currentUser.value.id_employee);
    }
    allShifts.value = shifts;
  } catch (err) {
    apiError.value = "Could not load shifts: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

watch(selectedDeptId, loadShifts);
onMounted(async () => {
  if (!myDepts.value.length) await loadDepts(currentUser.value);
  loadShifts();
});

// ── Sections ──────────────────────────────────────────────────────────────────
function sortChron(list) {
  return [...list].sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
}

const pastShifts     = computed(() => sortChron(allShifts.value.filter(s => s.date < todayKey)));
const currentShifts  = computed(() => sortChron(allShifts.value.filter(s => s.date === todayKey)));
const upcomingShifts = computed(() => sortChron(allShifts.value.filter(s => s.date > todayKey)));

function isActiveNow(shift) {
  const now = new Date();
  const h   = now.getHours() + now.getMinutes() / 60;
  return h >= shift.startHour && h < shift.endHour;
}

// ── Group by employee ─────────────────────────────────────────────────────────
const COLORS = ["#EF4444","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];

function avatarColor(id) {
  if (!id || typeof id !== "number") return "var(--tx-muted)";
  return COLORS[id % COLORS.length];
}

function groupByEmployee(shifts) {
  const map = new Map();
  for (const s of shifts) {
    const key  = s.id_employee ?? "unassigned";
    const name = s.employee   || "Unassigned";
    if (!map.has(key)) {
      const parts    = name.split(" ");
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      map.set(key, { employeeId: key, employeeName: name, initials, shifts: [] });
    }
    map.get(key).shifts.push(s);
  }
  return [...map.values()].sort((a, b) => {
    if (a.employeeId === "unassigned") return 1;
    if (b.employeeId === "unassigned") return -1;
    return a.employeeName.localeCompare(b.employeeName);
  });
}

// ── Display helpers ───────────────────────────────────────────────────────────
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function dayName(d)   { const [y,m,dd] = d.split("-").map(Number); return DAY_NAMES[new Date(y,m-1,dd).getDay()]; }
function shortDate(d) { const [,m,dd]  = d.split("-").map(Number); return `${m}/${dd}`; }
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
.nav-left  { display: flex; align-items: center; gap: 12px; }
.nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); }
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--tx-muted);
  font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s;
}
.back-btn:hover { color: var(--accent); }
.nav-logo { display: flex; align-items: center; }
.page-title { font-size: 15px; font-weight: 700; color: var(--tx-heading); }
.week-label { font-size: 12px; color: var(--tx-faint); font-family: 'DM Mono', monospace; padding-left: 4px; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

/* ── Loading / Error ── */
.loading-overlay {
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 16px;
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
  display: flex; flex-direction: column; gap: 36px;
}
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

/* ── Section ── */
.section { display: flex; flex-direction: column; gap: 14px; }

.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 12px; border-bottom: 1px solid var(--bdr-subtle);
}
.section-title-row { display: flex; align-items: center; gap: 10px; }
.section-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.section-dot--past     { background: var(--tx-faint); }
.section-dot--today    { background: var(--accent); }
.section-dot--upcoming { background: var(--ok-text); }

.section-title {
  font-size: 16px; font-weight: 700; color: var(--tx-heading); margin: 0;
}
.section-title--today { color: var(--accent); }

.section-badge {
  font-size: 11px; font-weight: 600; color: var(--tx-faint);
  background: var(--bg-input); border: 1px solid var(--bdr-subtle);
  padding: 1px 8px; border-radius: 100px;
}
.section-badge--today {
  background: var(--accent-bg); border-color: var(--accent-border);
  color: var(--accent);
}

.section-sub { font-size: 11px; color: var(--tx-faint); font-family: 'DM Mono', monospace; }

/* ── Empty ── */
.empty-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 10px; padding: 20px 24px;
}
.empty-text { font-size: 13px; color: var(--tx-faint); }

/* ── Group cards ── */
.groups-list { display: flex; flex-direction: column; gap: 10px; }

.group-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 10px; overflow: hidden;
}
.group-card--past { opacity: 0.6; }

.group-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  background: var(--bg-card); border-bottom: 1px solid var(--bdr-subtle);
}
.emp-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.group-name { font-size: 13px; font-weight: 600; color: var(--tx-primary); }
.group-pill {
  margin-left: auto; font-size: 11px; color: var(--tx-faint);
  background: var(--bg-active); padding: 1px 8px; border-radius: 100px;
}

/* ── Shift rows ── */
.shift-table { display: flex; flex-direction: column; }

.shift-row {
  display: grid;
  grid-template-columns: 110px 160px 1fr 1fr;
  align-items: center; gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--bdr-strong);
  transition: background 0.12s;
}
.shift-row:last-child { border-bottom: none; }
.shift-row:hover { background: var(--bg-hover); }

.shift-row--live {
  background: var(--accent-subtle) !important;
  border-left: 3px solid var(--accent);
  padding-left: 13px;
}

.col-day {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--tx-secondary);
}
.col-date { font-size: 11px; color: var(--tx-faint); font-family: 'DM Mono', monospace; font-weight: 400; }
.col-time { font-size: 13px; color: var(--tx-primary); font-weight: 500; }
.col-notes { font-size: 12px; color: var(--tx-faint); }

.mono { font-family: 'DM Mono', monospace; }

.pos-badge {
  display: inline-block; padding: 2px 9px;
  background: var(--bg-active); color: var(--tx-secondary);
  border: 1px solid var(--bdr-faint);
  border-radius: 100px; font-size: 11px; font-weight: 500;
}

.live-chip {
  display: inline-block; padding: 1px 7px;
  background: var(--accent); color: #fff;
  border-radius: 100px; font-size: 10px; font-weight: 700;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
</style>
