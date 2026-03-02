<template>
  <div class="role-root">

    <!-- Ambient background -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="grid-overlay"></div>

    <!-- Brand mark -->
    <div class="brand">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="4" width="11" height="7" rx="2" fill="#FF1744"/>
          <rect x="15" y="4" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
          <rect x="2" y="14" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
          <rect x="15" y="14" width="11" height="7" rx="2" fill="#F0E6D3"/>
        </svg>
      </div>
      <span class="brand-name">Scheduler</span>
    </div>

    <!-- Center content -->
    <div class="center">
      <div class="hero">
        <p class="eyebrow">Welcome aboard</p>
        <h1 class="headline">Hi, {{ firstName }}<span class="dot">.</span></h1>
        <p class="subline">How will you be using Scheduler? You can always change this later.</p>
      </div>

      <div class="cards">
        <!-- Employee -->
        <button class="role-card" @click="chooseRole('Employee')">
          <div class="card-icon-wrap employee-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7" r="4" fill="#FF1744"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#FF1744" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="card-body">
            <p class="card-title">Employee</p>
            <p class="card-desc">I work shifts at my department</p>
          </div>
          <div class="card-arrow">→</div>
        </button>

        <!-- Manager -->
        <button class="role-card" @click="chooseRole('Manager')">
          <div class="card-icon-wrap manager-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="3" fill="#F0E6D3"/>
              <circle cx="17" cy="5" r="2" fill="#F0E6D3" opacity="0.6"/>
              <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#F0E6D3" stroke-width="2" stroke-linecap="round"/>
              <path d="M19 11v6M16 14h6" stroke="#F0E6D3" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="card-body">
            <p class="card-title">Manager</p>
            <p class="card-desc">I manage my department's schedule</p>
          </div>
          <div class="card-arrow">→</div>
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";
import selectRoleServices from "../services/selectRoleServices.js";

const router   = useRouter();
const error    = ref("");

const user      = computed(() => Utils.getStore("user"));
const firstName = computed(() => user.value?.fName ?? "");

const chooseRole = async (role) => {
  error.value = "";
  const u = user.value;
  if (!u) { router.push("/start"); return; }

  try {
    await selectRoleServices.updateRole(u.id_employee, role);
    Utils.setStore("user", { ...u, role });
    Utils.setStore(`roleSelected_${u.id_employee}`, true);
    router.push("/dashboard");
  } catch (err) {
    console.error("Failed to update role:", err);
    error.value = "Could not save your role. Please try again.";
  }
};

onMounted(() => {
  if (!user.value) router.push("/start");
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Playfair+Display:ital,wght@1,700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.role-root {
  font-family: 'DM Sans', sans-serif;
  min-height: 100vh;
  background: #08060a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* ── Ambient background ── */
.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.blob-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,23,68,0.14) 0%, transparent 70%);
  top: -120px; left: -80px;
  animation: drift 14s ease-in-out infinite alternate;
}
.blob-2 {
  width: 360px; height: 360px;
  background: radial-gradient(circle, rgba(240,230,211,0.05) 0%, transparent 70%);
  bottom: -60px; right: -60px;
  animation: drift 18s ease-in-out infinite alternate-reverse;
}
@keyframes drift {
  from { transform: translate(0, 0); }
  to   { transform: translate(40px, 30px); }
}
.grid-overlay {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,23,68,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,23,68,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}

/* ── Brand ── */
.brand {
  position: fixed;
  top: 28px; left: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
}
.brand-icon {
  width: 38px; height: 38px;
  background: #130508;
  border: 1px solid rgba(255,23,68,0.35);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-name {
  font-family: 'DM Mono', monospace;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

/* ── Center content ── */
.center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 560px;
  padding: 0 24px;
}

.hero {
  text-align: center;
  margin-bottom: 48px;
}
.eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #FF1744;
  text-transform: uppercase;
  margin-bottom: 14px;
}
.headline {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 14px;
  line-height: 1.1;
}
.dot { color: #F0E6D3; }
.subline {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  font-weight: 300;
}

/* ── Role cards ── */
.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.role-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 18px;
  background: rgba(18, 10, 13, 0.7);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 20px 24px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
  backdrop-filter: blur(12px);
  font-family: 'DM Sans', sans-serif;
}
.role-card:hover {
  background: rgba(30, 12, 18, 0.9);
  border-color: rgba(255,23,68,0.4);
  transform: translateY(-2px);
}
.role-card:hover .card-arrow {
  color: #FF1744;
  transform: translateX(4px);
}

.card-icon-wrap {
  width: 52px; height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.employee-icon { background: rgba(255,23,68,0.12); border: 1px solid rgba(255,23,68,0.2); }
.manager-icon  { background: rgba(240,230,211,0.07); border: 1px solid rgba(240,230,211,0.12); }

.card-body { flex: 1; }
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}
.card-desc {
  font-size: 13px;
  color: #475569;
  font-weight: 300;
}

.card-arrow {
  font-size: 18px;
  color: #2d3748;
  transition: color 0.2s, transform 0.2s;
}

/* ── Error ── */
.error-msg {
  margin-top: 20px;
  font-size: 13px;
  color: #EF4444;
  text-align: center;
}
</style>