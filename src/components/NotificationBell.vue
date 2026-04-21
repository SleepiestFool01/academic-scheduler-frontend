<template>
  <div class="bell-wrap">
    <button class="bell-btn" @click="toggle" :title="`${totalCount} notification${totalCount === 1 ? '' : 's'}`">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="totalCount > 0" class="bell-badge">{{ totalCount > 99 ? "99+" : totalCount }}</span>
    </button>

    <Transition name="fade-pop">
      <div v-if="open" class="bell-overlay" @click.self="close">
        <div class="bell-panel" @click.stop>
          <div class="bell-header">
            <h3 class="bell-title">Notifications</h3>
            <button class="bell-close" @click="close">✕</button>
          </div>

          <div class="bell-body">
            <div v-if="totalCount === 0" class="bell-empty">
              <p class="empty-icon">✓</p>
              <p class="empty-title">You're all caught up</p>
              <p class="empty-sub">Nothing needs your attention right now.</p>
            </div>

            <!-- Swap requests -->
            <section v-if="swaps.length" class="bell-section">
              <div class="bell-section-head">
                <span class="bell-dot"></span>
                <h4>Swap Requests</h4>
                <span class="bell-count">{{ swaps.length }}</span>
              </div>
              <div v-for="s in swaps" :key="'swap-' + s.id_swapRequest" class="bell-item" @click="go('/tradeboard')">
                <div class="bell-item-top">
                  <div class="emp-avatar" :style="{ background: colorFor(s.id_employeeRequester) }">{{ initials(s._requester) }}</div>
                  <div class="bell-item-text">
                    <p class="bell-item-title">{{ nameOf(s._requester) }} → {{ nameOf(s._requested) }}</p>
                    <p class="bell-item-sub">Swap request awaiting approval</p>
                  </div>
                </div>
                <div class="bell-item-actions" @click.stop>
                  <button class="approve-btn" @click="handle(approveSwap, s)">Approve</button>
                  <button class="deny-btn" @click="handle(denySwap, s)">Deny</button>
                </div>
              </div>
            </section>

            <!-- Time-off -->
            <section v-if="timeOff.length" class="bell-section">
              <div class="bell-section-head">
                <span class="bell-dot"></span>
                <h4>Time-Off Requests</h4>
                <span class="bell-count">{{ timeOff.length }}</span>
              </div>
              <div v-for="t in timeOff" :key="'to-' + t.id_personalAvailability" class="bell-item" @click="go('/requests')">
                <div class="bell-item-top">
                  <div class="emp-avatar" :style="{ background: colorFor(t.id_employee) }">{{ initials(t._employee) }}</div>
                  <div class="bell-item-text">
                    <p class="bell-item-title">{{ nameOf(t._employee) }}</p>
                    <p class="bell-item-sub">{{ formatDateShort(t.startDate) }} → {{ formatDateShort(t.endDate) }}</p>
                  </div>
                </div>
                <div class="bell-item-actions" @click.stop>
                  <button class="approve-btn" @click="handle(approveTimeOff, t)">Approve</button>
                  <button class="deny-btn" @click="handle(denyTimeOff, t)">Deny</button>
                </div>
              </div>
            </section>

            <!-- Department access -->
            <section v-if="deptAccess.length" class="bell-section">
              <div class="bell-section-head">
                <span class="bell-dot"></span>
                <h4>Department Access</h4>
                <span class="bell-count">{{ deptAccess.length }}</span>
              </div>
              <div v-for="d in deptAccess" :key="'da-' + d.id_departmentAccessRequest" class="bell-item" @click="go('/requests')">
                <div class="bell-item-top">
                  <div class="emp-avatar" :style="{ background: colorFor(d.id_employeeRequester) }">{{ initials(d._requester) }}</div>
                  <div class="bell-item-text">
                    <p class="bell-item-title">{{ nameOf(d._requester) }}</p>
                    <p class="bell-item-sub">Wants access to {{ deptName(d.id_department) }}</p>
                  </div>
                </div>
                <div class="bell-item-actions" @click.stop>
                  <button class="approve-btn" @click="handle(approveDeptAccess, d)">Approve</button>
                  <button class="deny-btn" @click="handle(denyDeptAccess, d)">Deny</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotifications } from "../composables/useNotifications.js";
import { getAllDepartments } from "../services/departmentService.js";
import { formatDateShort } from "../utils/dateFormat.js";

const router = useRouter();
const {
  timeOff, swaps, deptAccess, totalCount,
  approveSwap, denySwap,
  approveDeptAccess, denyDeptAccess,
  approveTimeOff, denyTimeOff,
  refresh,
} = useNotifications();

const open = ref(false);
const allDepts = ref([]);

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
function colorFor(id) { return COLORS[(id || 0) % COLORS.length]; }
function nameOf(e)    { return e ? `${e.fName} ${e.lName}` : "Unknown"; }
function initials(e)  { return e ? `${e.fName?.[0] || ""}${e.lName?.[0] || ""}`.toUpperCase() : "?"; }
function deptName(id) { return allDepts.value.find(d => d.id_department === Number(id))?.name || `Dept #${id}`; }

function toggle() {
  open.value = !open.value;
  if (open.value) refresh();
}
function close() { open.value = false; }

function go(path) {
  close();
  router.push(path);
}

async function handle(fn, item) {
  await fn(item);
}

onMounted(async () => {
  try {
    const res = await getAllDepartments();
    allDepts.value = res.data || [];
  } catch { /* silent */ }
});
</script>

<style scoped>
.bell-wrap { position: relative; display: flex; align-items: center; }

.bell-btn {
  background: none; border: 1px solid var(--bdr-subtle); color: var(--tx-muted);
  width: 38px; height: 38px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; position: relative; flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.bell-btn svg { width: 20px; height: 20px; }
.bell-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

.bell-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 16px; height: 16px; padding: 0 4px;
  background: #FF1744; color: #fff;
  border-radius: 100px; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Mono', monospace;
}

.bell-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.25);
  z-index: 500; backdrop-filter: blur(2px);
}
.bell-panel {
  position: absolute; top: 72px; right: 28px;
  width: 380px; max-height: calc(100vh - 92px);
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  display: flex; flex-direction: column; overflow: hidden;
}

.bell-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.bell-title { font-size: 16px; font-weight: 700; color: var(--tx-heading); }
.bell-close {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center; transition: color 0.15s;
}
.bell-close:hover { color: var(--tx-primary); }

.bell-body { flex: 1; overflow-y: auto; padding: 8px 0; }
.bell-body::-webkit-scrollbar { width: 6px; }
.bell-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.bell-empty { padding: 48px 24px; text-align: center; }
.empty-icon { font-size: 32px; color: var(--tx-faint); margin-bottom: 8px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--tx-secondary); margin-bottom: 4px; }
.empty-sub { font-size: 13px; color: var(--tx-ghost); }

.bell-section { padding: 8px 0; }
.bell-section + .bell-section { border-top: 1px solid var(--bdr-subtle); }
.bell-section-head {
  display: flex; align-items: center; gap: 8px; padding: 6px 18px 8px;
}
.bell-section-head h4 {
  font-size: 12px; font-weight: 700; color: var(--tx-muted);
  text-transform: uppercase; letter-spacing: 0.08em; flex: 1;
}
.bell-dot { width: 6px; height: 6px; border-radius: 50%; background: #FF1744; }
.bell-count {
  background: var(--accent); color: #fff;
  font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 100px;
  font-family: 'DM Mono', monospace;
}

.bell-item {
  padding: 10px 18px; cursor: pointer;
  display: flex; flex-direction: column; gap: 8px;
  transition: background 0.12s;
}
.bell-item:hover { background: var(--bg-active); }

.bell-item-top { display: flex; align-items: center; gap: 10px; }
.emp-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.bell-item-text { flex: 1; min-width: 0; }
.bell-item-title {
  font-size: 14px; font-weight: 600; color: var(--tx-heading);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bell-item-sub { font-size: 12px; color: var(--tx-faint); }

.bell-item-actions { display: flex; gap: 6px; padding-left: 42px; }
.approve-btn {
  background: var(--ok-bg); border: none; color: var(--ok-text);
  padding: 4px 12px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-family: 'Satoshi', sans-serif; font-weight: 600;
  transition: background 0.15s;
}
.approve-btn:hover { background: var(--ok-bg-h); }
.deny-btn {
  background: var(--deny-bg); border: none; color: var(--err-text);
  padding: 4px 12px; border-radius: 6px; cursor: pointer;
  font-size: 12px; font-family: 'Satoshi', sans-serif; font-weight: 600;
  transition: background 0.15s;
}
.deny-btn:hover { background: var(--deny-bg-h); }

.fade-pop-enter-active, .fade-pop-leave-active { transition: opacity 0.15s; }
.fade-pop-enter-active .bell-panel, .fade-pop-leave-active .bell-panel {
  transition: transform 0.18s ease, opacity 0.15s;
}
.fade-pop-enter-from, .fade-pop-leave-to { opacity: 0; }
.fade-pop-enter-from .bell-panel, .fade-pop-leave-to .bell-panel {
  transform: translateY(-8px) scale(0.98); opacity: 0;
}
</style>
