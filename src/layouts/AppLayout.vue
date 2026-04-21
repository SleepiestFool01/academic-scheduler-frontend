<template>
  <div class="app-layout">
    <nav class="topnav" :class="{ 'topnav--mobile': isTouch }">
      <button v-if="isTouch" class="nav-hamburger" @click="navOpen = true" aria-label="Open navigation">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="4" y1="7"  x2="20" y2="7"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
      </button>
      <router-link to="/dashboard" class="nav-logo-link" aria-label="Go to dashboard">
        <img v-if="isDark" src="../assets/cowork_logo_dark.png" alt="CoWork" class="nav-logo-img" />
        <img v-else src="../assets/cowork_logo_light.png" alt="CoWork" class="nav-logo-img" />
      </router-link>
      <DeptSwitcher v-if="!isTouch" />
      <div v-if="!isTouch" class="nav-tabs">
        <router-link
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.route"
          class="nav-tab"
          :class="{ active: isActive(tab) }">
          {{ tab.label }}
          <span v-if="isManager && (countsByRoute[tab.route] || 0) > 0" class="nav-dot"></span>
        </router-link>
      </div>
      <div class="nav-right">
        <button v-if="!isTouch" class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
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
        <NotificationBell v-if="isManager" />
        <div class="avatar" @click="profileOpen = true" title="My Profile">
          <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </nav>

    <!-- Mobile nav drawer (slides in from the left on phone/tablet) -->
    <Transition name="slide-left">
      <div v-if="navOpen && isTouch" class="nav-overlay" @click.self="navOpen = false">
        <aside class="nav-drawer" role="navigation">
          <div class="nav-drawer-header">
            <img v-if="isDark" src="../assets/cowork_logo_dark.png" alt="CoWork" class="nav-logo-img" />
            <img v-else src="../assets/cowork_logo_light.png" alt="CoWork" class="nav-logo-img" />
            <button class="nav-drawer-close" @click="navOpen = false" aria-label="Close navigation">✕</button>
          </div>
          <div class="nav-drawer-dept">
            <DeptSwitcher />
          </div>
          <div class="nav-drawer-tabs">
            <router-link
              v-for="tab in tabs"
              :key="tab.label"
              :to="tab.route"
              class="nav-drawer-tab"
              :class="{ active: isActive(tab) }"
              @click="navOpen = false">
              {{ tab.label }}
              <span v-if="isManager && (countsByRoute[tab.route] || 0) > 0" class="nav-dot nav-dot--drawer"></span>
            </router-link>
          </div>
          <div class="nav-drawer-footer">
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
              <span class="theme-toggle-label">{{ isDark ? "Light mode" : "Dark mode" }}</span>
            </button>
          </div>
        </aside>
      </div>
    </Transition>

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
            <div v-if="currentDeptName" class="profile-dept">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 21V9l9-6 9 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 21v-8h6v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ currentDeptName }}</span>
            </div>
          </div>
          <div class="profile-divider"></div>
          <button v-if="isManager" class="profile-action-btn" @click="goCreateDepartment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Add New Department
          </button>
          <button class="profile-action-btn" @click="goToSettings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Settings
          </button>
          <button class="profile-action-btn" @click="logout">
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

    <CommandPalette />
    <ShortcutCheatsheet />
    <ToastHost />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import { useNotifications } from "../composables/useNotifications.js";
import { useBreakpoint } from "../composables/useBreakpoint.js";
import { usePreferences } from "../composables/usePreferences.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
import NotificationBell from "../components/NotificationBell.vue";
import CommandPalette from "../components/CommandPalette.vue";
import ToastHost from "../components/ToastHost.vue";
import ShortcutCheatsheet from "../components/ShortcutCheatsheet.vue";

const router = useRouter();
const route  = useRoute();
const { isDark, toggleTheme } = useTheme();
const { myDepts, selectedDeptId, loadDepts } = useDepartment();
const currentDeptName = computed(() =>
  myDepts.value.find(d => d.id_department === selectedDeptId.value)?.name || ""
);
const { countsByRoute, startPolling, stopPolling } = useNotifications();
const { isTouch } = useBreakpoint();
const { preferences: userPrefs, ready: prefsReady } = usePreferences();

const currentUser = ref(Utils.getStore("user") || { fName: "?", lName: "?" });
const profileOpen = ref(false);
const navOpen     = ref(false);

// Auto-close the drawer if the viewport widens past mobile (e.g. user
// rotates a tablet or resizes the dev tools); otherwise it stays in DOM
// hidden behind the desktop nav.
watch(isTouch, (touch) => { if (!touch) navOpen.value = false; });

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
    { label: "Dashboard",    route: "/dashboard" },
    { label: "Department",   route: "/department" },
    { label: "Tradeboard",   route: "/tradeboard" },
    { label: "Tasks",        route: "/tasks" },
    { label: "Shifts",       route: "/shifts" },
    { label: "Requests",     route: "/requests" },
    { label: "Availability", route: "/availability" },
  ];
});

function isActive(tab) {
  return route.path === tab.route || route.path.startsWith(tab.route + "/");
}

function goCreateDepartment() {
  profileOpen.value = false;
  router.push({ path: "/department", query: { create: "1" } });
}

function goToSettings() {
  profileOpen.value = false;
  router.push("/settings");
}

async function logout() {
  try {
    const user = Utils.getStore("user");
    if (user?.token) {
      await AuthServices.logoutUser({ token: user.token });
    }
  } catch (e) { /* proceed */ }
  Utils.removeItem("user");
  // Drop the previous user's department selection so the next sign-in
  // doesn't inherit it and end up with a dept ID they don't belong to.
  Utils.removeItem("selectedDeptId");
  router.push("/start");
}

onMounted(async () => {
  await loadDepts(currentUser.value);
  if (isManager.value) startPolling();
  // Silent class-schedule sync for employees — runs once per semester.
  // `lastScheduleSync:<id>:<semester>` in localStorage prevents re-runs.
  // We can't compute the semester code client-side cheaply (it lives on
  // the dept's settings), so we just fire the request and let the backend
  // pick the right semester; the response tells us which one was used and
  // we remember it so we don't re-hit stingray on every page load.
  maybeAutoSync();
});

async function maybeAutoSync() {
  const user = currentUser.value;
  if (!user || !user.id_employee) return;
  if (user.role !== "Employee") return;
  // Respect the user's per-department auto-sync preference. Wait for the
  // prefs to arrive first so we don't fall back to the (true) default and
  // fire a sync the user intentionally disabled.
  await prefsReady();
  if (userPrefs.availabilityPrefs?.autoSyncClassSchedule === false) return;
  // Heuristic pre-check: we don't know the semester yet, but we can skip
  // the network call if we've synced ANYTHING recently (last 6 hours).
  // The backend is the real source of truth and will rate-limit if we're
  // over-eager.
  const recentKey = `lastScheduleSyncAny:${user.id_employee}`;
  const recent = Number(localStorage.getItem(recentKey) || 0);
  if (recent && Date.now() - recent < 6 * 60 * 60 * 1000) return;

  try {
    const { importUnavailabilityForEmployee } = await import("../services/unavailabilityService.js");
    const { bumpUnavailabilityRefresh } = await import("../composables/useUnavailabilityRefresh.js");
    const res = await importUnavailabilityForEmployee(user.id_employee);
    const semester = res.data?.semester;
    if (semester) {
      localStorage.setItem(`lastScheduleSync:${user.id_employee}:${semester}`, String(Date.now()));
    }
    localStorage.setItem(recentKey, String(Date.now()));
    // Any view already mounted (Availability, Dashboard, etc.) re-fetches
    // unavailability when this signal bumps — no manual refresh needed.
    bumpUnavailabilityRefresh();
  } catch (_) {
    // Silent — the sync button on /availability will surface errors.
    // Auto-sync shouldn't pop UI on failure.
  }
}

onBeforeUnmount(() => {
  stopPolling();
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
  gap: 18px;
  padding: 0 28px;
  height: 68px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle);
  flex-shrink: 0;
  z-index: 100;
}

.topnav--mobile {
  gap: 12px;
  padding: 0 12px;
  height: 60px;
}

.nav-hamburger {
  background: none;
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-primary);
  width: 40px;
  height: 40px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.nav-hamburger:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

.topnav--mobile .nav-logo-img { height: 36px; }
.topnav--mobile .nav-right    { gap: 10px; }

.nav-logo-img { height: 52px; width: auto; object-fit: contain; }
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

.nav-tabs { display: flex; gap: 6px; flex: 1; }
.nav-tab {
  position: relative; padding: 10px 18px; background: none; border: none;
  color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 17px;
  cursor: pointer; border-radius: 0; transition: color 0.15s;
  text-decoration: none;
}
.nav-tab::after {
  content: ''; position: absolute; bottom: -1px; left: 10px; right: 10px;
  height: 2px; background: transparent; border-radius: 2px; transition: background 0.15s;
}
.nav-tab:hover { color: var(--tx-secondary); }
.nav-tab:hover::after { background: var(--bdr-medium); }
.nav-tab.active { color: var(--accent); font-weight: 600; }
.nav-tab.active::after { background: var(--accent); }

.nav-dot {
  position: absolute; top: 6px; right: 6px;
  width: 9px; height: 9px; border-radius: 50%;
  background: #FF1744;
  box-shadow: 0 0 0 2px var(--bg-surface);
}

.nav-right { display: flex; align-items: center; gap: 14px; margin-left: auto; }

.theme-toggle {
  background: none; border: 1px solid var(--bdr-subtle); color: var(--tx-muted);
  width: 38px; height: 38px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; flex-shrink: 0;
}
.theme-toggle svg { width: 17px; height: 17px; }
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 600; cursor: pointer; overflow: hidden; flex-shrink: 0;
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
  width: min(320px, 100vw); background: var(--bg-surface); border-left: 1px solid var(--bdr-subtle);
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
.profile-dept {
  display: flex; align-items: center; gap: 6px;
  margin-top: 6px;
  font-size: 13px; color: var(--tx-secondary);
  font-family: 'DM Mono', monospace;
}
.profile-dept svg { color: var(--tx-muted); flex-shrink: 0; }
.profile-divider { height: 1px; background: var(--bdr-subtle); }
.profile-action-btn {
  display: flex; align-items: center; gap: 10px; background: none; border: 1px solid var(--bdr-medium);
  color: var(--tx-muted); padding: 10px 16px; border-radius: 8px; cursor: pointer;
  font-family: 'Satoshi', sans-serif; font-size: 14px; transition: color 0.15s, border-color 0.15s;
}
.logout-btn:hover { color: var(--accent); border-color: var(--accent); }
.profile-action-btn:hover { color: var(--accent); border-color: var(--accent); }
.profile-action-btn + .profile-action-btn { margin-top: 8px; }

.slide-right-enter-active, .slide-right-leave-active { transition: opacity 0.25s, transform 0.25s; }
.slide-right-enter-from .profile-panel, .slide-right-leave-to .profile-panel { transform: translateX(100%); }
.slide-right-enter-from, .slide-right-leave-to { opacity: 0; }

/* ── Mobile nav drawer ── */
.nav-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45);
  z-index: 500; display: flex; justify-content: flex-start;
  backdrop-filter: blur(4px);
}
.nav-drawer {
  width: min(300px, 86vw); height: 100%;
  background: var(--bg-surface); border-right: 1px solid var(--bdr-subtle);
  padding: 22px 18px; display: flex; flex-direction: column; gap: 16px;
  box-shadow: 8px 0 30px rgba(0,0,0,0.3);
  overflow-y: auto;
}
.nav-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
}
.nav-drawer-header .nav-logo-img { height: 38px; }
.nav-drawer-close {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center; transition: color 0.15s;
}
.nav-drawer-close:hover { color: var(--tx-primary); }

.nav-drawer-dept { padding: 4px 0; }

.nav-drawer-tabs { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
.nav-drawer-tab {
  position: relative;
  display: flex; align-items: center;
  padding: 12px 14px; border-radius: 8px;
  color: var(--tx-secondary); font-family: 'Satoshi', sans-serif; font-size: 16px;
  text-decoration: none; transition: background 0.15s, color 0.15s;
  min-height: var(--tap-target-min);
}
.nav-drawer-tab:hover { background: var(--bg-hover); color: var(--tx-primary); }
.nav-drawer-tab.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }

.nav-dot--drawer {
  position: static; margin-left: auto;
  box-shadow: none;
}

.nav-drawer-footer { margin-top: auto; padding-top: 14px; border-top: 1px solid var(--bdr-subtle); }
.nav-drawer-footer .theme-toggle {
  width: 100%;
  height: auto;
  padding: 10px 14px;
  border-radius: 9px;
  gap: 10px;
  font-family: 'Satoshi', sans-serif; font-size: 14px; color: var(--tx-secondary);
}
.theme-toggle-label { font-size: 14px; }

.slide-left-enter-active, .slide-left-leave-active { transition: opacity 0.25s, transform 0.25s; }
.slide-left-enter-from .nav-drawer, .slide-left-leave-to .nav-drawer { transform: translateX(-100%); }
.slide-left-enter-from, .slide-left-leave-to { opacity: 0; }
</style>
