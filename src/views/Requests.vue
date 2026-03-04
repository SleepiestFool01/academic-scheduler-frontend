<template>
  <div class="page-root">
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
        <h1 class="page-title">Requests</h1>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
          Pending
          <span v-if="pendingRequests.length > 0" class="tab-badge">{{ pendingRequests.length }}</span>
        </button>
        <button class="nav-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">All</button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">{{ apiError }}<button class="retry-btn" @click="loadAll">Retry</button></div>

    <div class="content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">{{ activeTab === 'pending' ? 'Pending Requests' : 'All Requests' }}</h2>
          <p class="panel-sub">Employee time-off and availability requests</p>
        </div>
        <input v-model="search" class="search-input" placeholder="Search by employee…" />
      </div>

      <!-- Empty state -->
      <div v-if="displayedRequests.length === 0" class="empty-card">
        <p class="empty-icon">{{ activeTab === 'pending' ? '✓' : '📭' }}</p>
        <p class="empty-title">{{ activeTab === 'pending' ? 'No pending requests' : 'No requests yet' }}</p>
        <p class="empty-sub">{{ activeTab === 'pending' ? 'All caught up!' : 'Employee requests will appear here.' }}</p>
      </div>

      <!-- Requests list -->
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
            <span class="status-badge" :class="req.status">{{ req.status }}</span>
            <template v-if="req.status === 'pending'">
              <button class="approve-btn" @click="updateRequest(req, 'approved')">✓ Approve</button>
              <button class="deny-btn"    @click="updateRequest(req, 'denied')">✕ Deny</button>
            </template>
            <button class="icon-action danger" title="Delete" @click="confirmDelete(req)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import apiClient from "../services/services.js";
import { timeStrToHour, fmtHour } from "../services/employeeManagementService.js";

const router      = useRouter();
const loading     = ref(false);
const apiError    = ref("");
const activeTab   = ref("pending");
const search      = ref("");

const employees    = ref([]);
const availability = ref([]);
const empMap       = ref({});

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
function colorFor(id)    { return COLORS[(id || 0) % COLORS.length]; }
function nameFor(id)     { const e = empMap.value[id]; return e ? `${e.fName} ${e.lName}` : `Employee #${id}`; }
function initialsFor(id) { const e = empMap.value[id]; return e ? `${e.fName[0]}${e.lName[0]}` : "?"; }
function fmtTime(t)      { if (!t) return "—"; return fmtHour(timeStrToHour(t)); }

async function loadAll() {
  loading.value = true; apiError.value = "";
  try {
    const [empRes, availRes] = await Promise.all([
      apiClient.get("/employees"),
      apiClient.get("/personal-availability"),
    ]);
    employees.value = empRes.data;
    empMap.value = {};
    for (const e of empRes.data) empMap.value[e.id_employee] = e;

    // Add a local status field for manager approval workflow
    // (personalAvailability model doesn't have status — we track it locally
    // and could extend the model later to persist it)
    availability.value = availRes.data.map(a => ({ ...a, status: "pending" }));
  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}
onMounted(loadAll);

const pendingRequests = computed(() => availability.value.filter(r => r.status === "pending"));

const displayedRequests = computed(() => {
  let list = activeTab.value === "pending" ? pendingRequests.value : availability.value;
  const q = search.value.toLowerCase();
  if (q) list = list.filter(r => nameFor(r.id_employee).toLowerCase().includes(q));
  return list;
});

function updateRequest(req, status) {
  const idx = availability.value.findIndex(r => r.id_personalAvailability === req.id_personalAvailability);
  if (idx !== -1) availability.value[idx] = { ...availability.value[idx], status };
}

const deleteConfirm = ref({ open: false, item: null, saving: false });

function confirmDelete(req) {
  deleteConfirm.value = { open: true, item: req, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  try {
    await apiClient.delete(`/personal-availability/${deleteConfirm.value.item.id_personalAvailability}`);
    availability.value = availability.value.filter(
      r => r.id_personalAvailability !== deleteConfirm.value.item.id_personalAvailability
    );
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + err.message;
    deleteConfirm.value.open = false;
  } finally {
    deleteConfirm.value.saving = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); }
.nav-tabs { display: flex; gap: 2px; margin-left: 16px; }
.nav-tab { position: relative; padding: 5px 14px; background: transparent; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; display: flex; align-items: center; gap: 6px; }
.nav-tab:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.tab-badge { background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 100px; }

.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }

.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.panel-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub { font-size: 13px; color: var(--tx-faint); }
.search-input { background: var(--bg-surface); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 14px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 240px; transition: border-color 0.15s; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-ghost); }

.requests-list { display: flex; flex-direction: column; gap: 10px; max-width: 1000px; }

.request-card { display: flex; align-items: center; gap: 20px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 18px 20px; transition: border-color 0.15s; flex-wrap: wrap; }
.request-card:hover { border-color: var(--bdr-accent); }

.request-card-left { display: flex; align-items: center; gap: 12px; min-width: 180px; }
.emp-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.request-emp { font-size: 14px; font-weight: 600; color: var(--tx-heading); margin-bottom: 2px; }
.request-type { font-size: 11px; color: var(--tx-faint); }

.request-dates { display: flex; align-items: center; gap: 16px; flex: 1; }
.date-block { display: flex; flex-direction: column; gap: 2px; }
.date-label { font-size: 10px; color: var(--tx-ghost); text-transform: uppercase; letter-spacing: 0.08em; }
.date-val { font-size: 13px; color: var(--tx-primary); }
.time-val { font-size: 11px; color: var(--tx-muted); }
.date-arrow { font-size: 16px; color: var(--tx-ghost); }
.mono { font-family: 'DM Mono', monospace; }

.request-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.status-badge { display: inline-block; padding: 3px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.status-badge.pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.denied   { background: var(--deny-bg);  color: var(--err-text); }
.approve-btn { background: var(--ok-bg); border: none; color: var(--ok-text); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.approve-btn:hover { background: var(--ok-bg-h); }
.deny-btn { background: var(--deny-bg); border: none; color: var(--err-text); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.deny-btn:hover { background: var(--deny-bg-h); }
.icon-action { background: var(--bdr-subtle); border: none; color: var(--tx-muted); width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.empty-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 64px; text-align: center; max-width: 600px; }
.empty-icon { font-size: 36px; margin-bottom: 12px; }
.empty-title { font-size: 18px; font-weight: 600; color: var(--tx-faint); margin-bottom: 8px; }
.empty-sub { font-size: 13px; color: var(--tx-ghost); }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 12px; }
.modal-body-text { font-size: 14px; color: var(--tx-muted); margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; }
.confirm-btn.danger { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>