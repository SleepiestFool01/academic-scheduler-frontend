<template>
  <Transition name="cp-fade">
    <div v-if="open" class="cmd-palette-overlay" @click.self="close" @keydown.esc="close">
      <div class="cmd-palette" @click.stop>
        <div class="cmd-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="cmd-search-icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/>
            <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            class="cmd-input"
            type="text"
            placeholder="Type a command or search…"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="runActive"
          />
          <kbd class="cmd-hint">ESC</kbd>
        </div>

        <div v-if="filtered.length" class="cmd-list" ref="listRef">
          <template v-for="(group, gi) in grouped" :key="group.label">
            <div class="cmd-group-label">{{ group.label }}</div>
            <button
              v-for="item in group.items" :key="item.id"
              class="cmd-item"
              :class="{ active: item.__idx === activeIndex }"
              @mouseenter="activeIndex = item.__idx"
              @click="run(item)"
            >
              <span class="cmd-icon" v-html="item.icon || defaultIcon"></span>
              <span class="cmd-label">{{ item.label }}</span>
              <span v-if="item.sub" class="cmd-sub">{{ item.sub }}</span>
            </button>
          </template>
        </div>
        <div v-else class="cmd-empty">No results.</div>

        <div class="cmd-footer">
          <span class="cmd-footer-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span class="cmd-footer-hint"><kbd>↵</kbd> select</span>
          <span class="cmd-footer-hint"><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import { useTheme } from "../composables/useTheme.js";

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

const open = ref(false);
const query = ref("");
const activeIndex = ref(0);
const inputRef = ref(null);
const listRef = ref(null);

const currentUser = ref(Utils.getStore("user") || { role: "" });
const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);

const defaultIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`;

const ICONS = {
  dashboard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.6"/></svg>`,
  building: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l9-6 9 6v12" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 21v-8h6v8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  template: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.6"/><path d="M9 9v11" stroke="currentColor" stroke-width="1.6"/></svg>`,
  users: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="17" cy="10" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M15 20c0-2.2 2-3.8 4-3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inbox: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 13h5l1 3h6l1-3h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 13l3-8h12l3 8v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  sun: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  moon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  logout: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
};

const allItems = computed(() => {
  const nav = [
    { id: "nav-dashboard",  label: "Dashboard",   group: "Navigation", icon: ICONS.dashboard, action: () => router.push("/dashboard") },
    { id: "nav-department", label: "Department",  group: "Navigation", icon: ICONS.building,  action: () => router.push("/department") },
    ...(isManager.value ? [
      { id: "nav-templates", label: "Templates", group: "Navigation", icon: ICONS.template, action: () => router.push("/templates") },
    ] : []),
    { id: "nav-tradeboard", label: "Tradeboard",  group: "Navigation", icon: ICONS.inbox,     action: () => router.push("/tradeboard") },
    { id: "nav-tasks",      label: "Tasks",       group: "Navigation", icon: ICONS.check,     action: () => router.push("/tasks") },
    { id: "nav-shifts",     label: "Shifts",      group: "Navigation", icon: ICONS.calendar,  action: () => router.push("/shifts") },
    { id: "nav-time",       label: "Time",        group: "Navigation", icon: ICONS.calendar,  action: () => router.push("/time") },
    { id: "nav-requests",   label: "Requests",    group: "Navigation", icon: ICONS.inbox,     action: () => router.push("/requests") },
    ...(!isManager.value ? [
      { id: "nav-availability", label: "Availability", group: "Navigation", icon: ICONS.calendar, action: () => router.push("/availability") },
    ] : []),
  ];

  const actions = [
    ...(isManager.value ? [
      { id: "act-new-dept", label: "Add New Department", group: "Actions", icon: ICONS.building, action: () => router.push({ path: "/department", query: { create: "1" } }) },
    ] : []),
    {
      id: "act-theme",
      label: isDark.value ? "Switch to Light Mode" : "Switch to Dark Mode",
      group: "Actions",
      icon: isDark.value ? ICONS.sun : ICONS.moon,
      action: () => toggleTheme(),
      keepOpen: true,
    },
    { id: "act-logout", label: "Log Out", group: "Actions", icon: ICONS.logout, action: logout },
  ];

  return [...nav, ...actions];
});

function fuzzyMatch(haystack, needle) {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h.includes(n)) return true;
  // simple subsequence match
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return true;
  }
  return false;
}

const filtered = computed(() => {
  const q = query.value.trim();
  return allItems.value.filter(it => fuzzyMatch(it.label, q));
});

const grouped = computed(() => {
  const byGroup = {};
  filtered.value.forEach((it, idx) => {
    const withIdx = { ...it, __idx: idx };
    (byGroup[it.group] ||= []).push(withIdx);
  });
  return Object.entries(byGroup).map(([label, items]) => ({ label, items }));
});

watch(query, () => { activeIndex.value = 0; });
watch(filtered, (f) => { if (activeIndex.value >= f.length) activeIndex.value = Math.max(0, f.length - 1); });
watch(activeIndex, scrollActiveIntoView);

function move(delta) {
  if (!filtered.value.length) return;
  const len = filtered.value.length;
  activeIndex.value = (activeIndex.value + delta + len) % len;
}
function runActive() {
  const item = filtered.value[activeIndex.value];
  if (item) run(item);
}
function run(item) {
  item.action?.();
  if (!item.keepOpen) close();
}
function scrollActiveIntoView() {
  nextTick(() => {
    const el = listRef.value?.querySelector(".cmd-item.active");
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  });
}

async function logout() {
  try {
    const user = Utils.getStore("user");
    if (user?.token) await AuthServices.logoutUser({ token: user.token });
  } catch (_) { /* proceed */ }
  Utils.removeItem("user");
  Utils.removeItem("selectedDeptId");
  router.push("/start");
}

function openPalette() {
  currentUser.value = Utils.getStore("user") || currentUser.value;
  open.value = true;
  query.value = "";
  activeIndex.value = 0;
  nextTick(() => inputRef.value?.focus());
}
function close() { open.value = false; }

function onKeydown(e) {
  const isMod = e.metaKey || e.ctrlKey;
  if (isMod && e.key.toLowerCase() === "k") {
    e.preventDefault();
    open.value ? close() : openPalette();
    return;
  }
  if (open.value && e.key === "Escape") close();
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));

defineExpose({ openPalette });
</script>

<style scoped>
.cmd-palette-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 14vh;
  z-index: 2000;
}
.cmd-palette {
  width: min(560px, calc(100vw - 32px));
  max-height: 70vh;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-medium);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.3);
  display: flex; flex-direction: column;
  overflow: hidden;
  font-family: 'Satoshi', sans-serif;
}

.cmd-input-row {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--bdr-subtle);
}
.cmd-search-icon { color: var(--tx-muted); flex-shrink: 0; }
.cmd-input {
  flex: 1; min-width: 0;
  background: none; border: none; outline: none;
  color: var(--tx-primary);
  font-size: 16px; font-family: inherit;
}
.cmd-input::placeholder { color: var(--tx-faint); }

.cmd-hint, kbd {
  font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700;
  padding: 2px 6px; border-radius: 4px;
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  color: var(--tx-muted);
  letter-spacing: .05em;
}

.cmd-list {
  overflow-y: auto;
  padding: 6px;
  min-height: 40px;
}
.cmd-group-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
  padding: 10px 10px 4px;
}
.cmd-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 9px 10px; border: none;
  background: none;
  border-radius: 8px; cursor: pointer;
  color: var(--tx-primary);
  font-family: inherit; font-size: 14px;
  text-align: left;
  transition: background .08s, color .08s;
}
.cmd-item.active {
  background: var(--accent-bg);
  color: var(--accent);
}
.cmd-icon { color: var(--tx-muted); flex-shrink: 0; display: flex; align-items: center; }
.cmd-item.active .cmd-icon { color: var(--accent); }
.cmd-label { flex: 1; }
.cmd-sub { color: var(--tx-faint); font-size: 12px; }

.cmd-empty {
  padding: 24px; text-align: center;
  color: var(--tx-faint); font-size: 14px;
}

.cmd-footer {
  display: flex; gap: 12px; justify-content: flex-end;
  padding: 8px 14px;
  border-top: 1px solid var(--bdr-subtle);
  background: var(--bg-surface);
}
.cmd-footer-hint {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
}

/* Transitions */
.cp-fade-enter-active, .cp-fade-leave-active { transition: opacity .15s; }
.cp-fade-enter-from,   .cp-fade-leave-to     { opacity: 0; }
.cp-fade-enter-active .cmd-palette,
.cp-fade-leave-active .cmd-palette { transition: transform .18s ease; }
.cp-fade-enter-from   .cmd-palette,
.cp-fade-leave-to     .cmd-palette { transform: scale(.97) translateY(-6px); }
</style>
