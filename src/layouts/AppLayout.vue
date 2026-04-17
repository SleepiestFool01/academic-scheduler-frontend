<template>
  <div class="app-layout">
    <nav class="topnav">
      <router-link to="/dashboard" class="nav-logo-link" aria-label="Go to dashboard">
        <img v-if="isDark" src="../assets/cowork_logo_dark.png" alt="CoWork" class="nav-logo-img" />
        <img v-else src="../assets/cowork_logo_light.png" alt="CoWork" class="nav-logo-img" />
      </router-link>
      <DeptSwitcher />
      <div class="nav-tabs">
        <router-link
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.route"
          class="nav-tab"
          :class="{ active: isActive(tab) }">
          {{ tab.label }}
        </router-link>
      </div>
      <div class="nav-right">
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="isDark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
        <div class="avatar" @click="profileOpen = true" title="My Profile">
          <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </nav>

    <!-- Profile slide-out panel -->
    <Transition name="slide-right">
      <div v-if="profileOpen" class="profile-overlay" @click.self="profileOpen = false">
        <div class="profile-panel">
          <div class="profile-header">
            <div class="profile-avatar-lg">
              <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
              <span v-else>{{ userInitials }}</span>
            </div>
            <button class="profile-close" @click="profileOpen = false">✕</button>
          </div>
          <div class="profile-body">
            <h2 class="profile-name">{{ currentUser?.fName }} {{ currentUser?.lName }}</h2>
            <p class="profile-email">{{ currentUser?.email }}</p>
            <span class="profile-role-badge" :class="currentUser?.role?.toLowerCase()">{{ currentUser?.role }}</span>
          </div>
          <div class="profile-divider"></div>
          <button class="logout-btn" @click="logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Log Out
          </button>
        </div>
      </div>
    </Transition>

    <div class="layout-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";

const router = useRouter();
const route  = useRoute();
const { isDark, toggleTheme } = useTheme();
const { myDepts, loadDepts } = useDepartment();

const currentUser = ref(Utils.getStore("user") || { fName: "?", lName: "?" });
const profileOpen = ref(false);

const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u.fName?.[0] ?? ""}${u.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);

const tabs = computed(() => {
  const role = currentUser.value?.role;
  if (role === "Manager" || role === "Admin") {
    return [
      { label: "Dashboard",  route: "/dashboard" },
      { label: "Department", route: "/department" },
      { label: "Templates",  route: "/templates" },
      { label: "Tradeboard", route: "/tradeboard" },
      { label: "Tasks",      route: "/tasks" },
      { label: "Shifts",     route: "/shifts" },
      { label: "Requests",   route: "/requests" },
    ];
  }
  return [
    { label: "Dashboard",  route: "/dashboard" },
    { label: "Department", route: "/department" },
    { label: "Tradeboard", route: "/tradeboard" },
    { label: "Tasks",      route: "/tasks" },
    { label: "Shifts",     route: "/shifts" },
    { label: "Requests",   route: "/requests" },
  ];
});

function isActive(tab) {
  return route.path === tab.route || route.path.startsWith(tab.route + "/");
}

async function logout() {
  try {
    const user = Utils.getStore("user");
    if (user?.token) {
      await AuthServices.logoutUser({ token: user.token });
    }
  } catch (e) { /* proceed */ }
  Utils.removeItem("user");
  router.push("/start");
}

onMounted(async () => {
  await loadDepts(currentUser.value);
});
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Satoshi', sans-serif;
  background: var(--bg-page);
  color: var(--tx-primary);
}

.topnav {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle);
  flex-shrink: 0;
  z-index: 100;
}

.nav-logo-link {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  padding: 4px;
  transition: background 0.15s, box-shadow 0.15s;
}

.nav-logo-link:hover {
  background: var(--accent-bg);
  box-shadow: inset 0 0 0 1px var(--accent-border);
}

.nav-logo-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.nav-logo-img { height: 44px; width: auto; object-fit: contain; display: block; }

.nav-tabs { display: flex; gap: 4px; flex: 1; }
.nav-tab {
  position: relative; padding: 8px 16px; background: none; border: none;
  color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 16px;
  cursor: pointer; border-radius: 0; transition: color 0.15s;
  text-decoration: none;
}
.nav-tab::after {
  content: ''; position: absolute; bottom: -1px; left: 8px; right: 8px;
  height: 2px; background: transparent; border-radius: 2px; transition: background 0.15s;
}
.nav-tab:hover { color: var(--tx-secondary); }
.nav-tab:hover::after { background: var(--bdr-medium); }
.nav-tab.active { color: var(--accent); font-weight: 600; }
.nav-tab.active::after { background: var(--accent); }

.nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }

.theme-toggle {
  background: none; border: 1px solid var(--bdr-subtle); color: var(--tx-muted);
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; flex-shrink: 0;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; cursor: pointer; overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.layout-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Profile panel ── */
.profile-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 500; display: flex; justify-content: flex-end;
  backdrop-filter: blur(4px);
}
.profile-panel {
  width: 320px; background: var(--bg-surface); border-left: 1px solid var(--bdr-subtle);
  padding: 28px 24px; display: flex; flex-direction: column; gap: 20px;
  box-shadow: -8px 0 30px rgba(0,0,0,0.3);
}
.profile-header { display: flex; align-items: flex-start; justify-content: space-between; }
.profile-avatar-lg {
  width: 56px; height: 56px; border-radius: 50%; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; overflow: hidden;
}
.profile-close {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center; transition: color 0.15s;
}
.profile-close:hover { color: var(--tx-primary); }
.profile-body { display: flex; flex-direction: column; gap: 6px; }
.profile-name { font-size: 20px; font-weight: 700; color: var(--tx-heading); }
.profile-email { font-size: 14px; color: var(--tx-faint); }
.profile-role-badge {
  display: inline-block; padding: 3px 12px; border-radius: 100px;
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  width: fit-content;
}
.profile-role-badge.manager  { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border); }
.profile-role-badge.admin    { background: rgba(240,230,211,0.1); color: #F0E6D3; border: 1px solid rgba(240,230,211,0.2); }
.profile-role-badge.employee { background: var(--bg-active); color: var(--tx-secondary); border: 1px solid var(--bdr-subtle); }
.profile-divider { height: 1px; background: var(--bdr-subtle); }
.logout-btn {
  display: flex; align-items: center; gap: 10px; background: none; border: 1px solid var(--bdr-medium);
  color: var(--tx-muted); padding: 10px 16px; border-radius: 8px; cursor: pointer;
  font-family: 'Satoshi', sans-serif; font-size: 14px; transition: color 0.15s, border-color 0.15s;
}
.logout-btn:hover { color: var(--accent); border-color: var(--accent); }

.slide-right-enter-active, .slide-right-leave-active { transition: opacity 0.25s, transform 0.25s; }
.slide-right-enter-from .profile-panel, .slide-right-leave-to .profile-panel { transform: translateX(100%); }
.slide-right-enter-from, .slide-right-leave-to { opacity: 0; }
</style>
