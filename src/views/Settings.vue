<template>
  <div class="page-root">
    <div class="content">

      <div class="page-header">
        <div>
          <h1 class="page-heading">Settings</h1>
          <p v-if="selectedDeptName" class="page-sub">
            Configuring preferences for <span class="dept-pill">{{ selectedDeptName }}</span>.
            Each department has its own settings — switch departments in the nav to configure another.
          </p>
        </div>
        <span v-if="prefsSaved" class="save-chip">Saved</span>
      </div>

      <div v-if="loading" class="info-banner">Loading your preferences…</div>
      <div v-if="loadError" class="error-banner">{{ loadError }}</div>
      <div v-if="!selectedDeptId && !loading" class="info-banner">
        Select a department to configure your preferences.
      </div>

      <!-- ══ ACCOUNT ══ -->
      <section class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Account</h2>
          <p class="section-sub">Your profile is managed through Google sign-in and can't be edited here.</p>
        </div>
        <div class="account-row">
          <div class="account-avatar">
            <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
            <span v-else>{{ userInitials }}</span>
          </div>
          <div class="account-info">
            <div class="account-name">{{ currentUser?.fName }} {{ currentUser?.lName }}</div>
            <div class="account-email">{{ currentUser?.email }}</div>
            <span class="account-role-badge" :class="currentUser?.role?.toLowerCase()">{{ currentUser?.role }}</span>
          </div>
        </div>
      </section>

      <!-- ══ APPEARANCE ══ -->
      <section class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Appearance</h2>
          <p class="section-sub">Choose how the app looks to you.</p>
        </div>
        <div class="setting-row">
          <div class="setting-label-group">
            <div class="setting-label">Theme</div>
            <div class="setting-desc">Switch between light and dark mode.</div>
          </div>
          <div class="setting-control">
            <button class="segmented-btn" :class="{ active: !isDark }" @click="setTheme('light')">Light</button>
            <button class="segmented-btn" :class="{ active: isDark }" @click="setTheme('dark')">Dark</button>
          </div>
        </div>
      </section>

      <template v-if="selectedDeptId">

      <!-- ══ SHIFT REMINDERS (all roles) ══ -->
      <section class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Shift Reminders</h2>
          <p class="section-sub">Heads-up notifications before your shifts start.</p>
        </div>

        <div class="toggle-row">
          <div class="setting-label-group">
            <div class="setting-label">Enable shift reminders</div>
            <div class="setting-desc">Get a reminder before each of your shifts begins.</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="shiftReminders.enabled" @change="savePrefs" />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <div class="setting-label-group">
            <div class="setting-label">Remind me before</div>
            <div class="setting-desc">How far in advance to send the reminder.</div>
          </div>
          <div class="setting-control">
            <select v-model.number="shiftReminders.minutesBefore" class="setting-select" :disabled="!shiftReminders.enabled" @change="savePrefs">
              <option :value="15">15 minutes</option>
              <option :value="30">30 minutes</option>
              <option :value="60">1 hour</option>
              <option :value="120">2 hours</option>
            </select>
          </div>
        </div>

      </section>

      <!-- ══ CALENDAR DISPLAY (all roles) ══ -->
      <section class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Calendar Display</h2>
          <p class="section-sub">How your calendar looks by default.</p>
        </div>

        <div class="setting-row">
          <div class="setting-label-group">
            <div class="setting-label">Default view</div>
            <div class="setting-desc">Which view the calendar opens to.</div>
          </div>
          <div class="setting-control">
            <button class="segmented-btn" :class="{ active: calendarDisplay.defaultView === 'day' }"   @click="setCalendarView('day')">Day</button>
            <button class="segmented-btn" :class="{ active: calendarDisplay.defaultView === 'week' }"  @click="setCalendarView('week')">Week</button>
            <button class="segmented-btn" :class="{ active: calendarDisplay.defaultView === 'month' }" @click="setCalendarView('month')">Month</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-label-group">
            <div class="setting-label">Time format</div>
            <div class="setting-desc">12-hour (2:30 pm) or 24-hour (14:30).</div>
          </div>
          <div class="setting-control">
            <button class="segmented-btn" :class="{ active: calendarDisplay.timeFormat === '12h' }" @click="setTimeFormat('12h')">12h</button>
            <button class="segmented-btn" :class="{ active: calendarDisplay.timeFormat === '24h' }" @click="setTimeFormat('24h')">24h</button>
          </div>
        </div>

      </section>

      <!-- ══ AVAILABILITY (employee only) ══ -->
      <section v-if="!isManager" class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Availability</h2>
          <p class="section-sub">How your weekly availability is managed.</p>
        </div>

        <div class="toggle-row">
          <div class="setting-label-group">
            <div class="setting-label">Auto-sync class schedule</div>
            <div class="setting-desc">Pull your class schedule in as unavailability blocks automatically at the start of each semester.</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="availabilityPrefs.autoSyncClassSchedule" @change="savePrefs" />
            <span class="slider"></span>
          </label>
        </div>

      </section>

      <!-- ══ TRADEBOARD PREFERENCES (employee only) ══ -->
      <section v-if="!isManager" class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Tradeboard Preferences</h2>
          <p class="section-sub">How the tradeboard behaves for you.</p>
        </div>

        <div class="toggle-row">
          <div class="setting-label-group">
            <div class="setting-label">Hide declined trades</div>
            <div class="setting-desc">Don't show me trades I've already declined.</div>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="tradeboardPrefs.hideDeclined" @change="savePrefs" />
            <span class="slider"></span>
          </label>
        </div>
      </section>

      <!-- ══ NOTIFICATIONS ══ -->
      <section class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Notifications</h2>
          <p class="section-sub">Choose which emails you want to receive.</p>
        </div>

        <template v-if="!isManager">
          <div class="subsection-label">For Me</div>
          <div class="toggle-row" v-for="pref in personalPrefs" :key="pref.key">
            <div class="setting-label-group">
              <div class="setting-label">{{ pref.label }}</div>
              <div class="setting-desc">{{ pref.desc }}</div>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="notificationPrefs[pref.key]" @change="savePrefs" />
              <span class="slider"></span>
            </label>
          </div>
        </template>

        <template v-if="isManager">
          <div class="subsection-label">For My Team</div>
          <div class="toggle-row" v-for="pref in managerPrefs" :key="pref.key">
            <div class="setting-label-group">
              <div class="setting-label">{{ pref.label }}</div>
              <div class="setting-desc">{{ pref.desc }}</div>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="notificationPrefs[pref.key]" @change="savePrefs" />
              <span class="slider"></span>
            </label>
          </div>

        </template>

        <template v-if="isAdmin">
          <div class="subsection-label">Admin</div>
          <div class="toggle-row" v-for="pref in adminPrefs" :key="pref.key">
            <div class="setting-label-group">
              <div class="setting-label">{{ pref.label }}</div>
              <div class="setting-desc">{{ pref.desc }}</div>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="notificationPrefs[pref.key]" @change="savePrefs" />
              <span class="slider"></span>
            </label>
          </div>
        </template>

      </section>

      <!-- ══ DEFAULTS (Manager/Admin) ══ -->
      <section v-if="isManager" class="settings-card">
        <div class="settings-card-head">
          <h2 class="section-title">Scheduling Defaults</h2>
          <p class="section-sub">Defaults used when creating new shifts.</p>
        </div>

        <div class="setting-row">
          <div class="setting-label-group">
            <div class="setting-label">Default shift duration</div>
            <div class="setting-desc">The duration pre-filled when creating a new shift.</div>
          </div>
          <div class="setting-control">
            <input v-model.number="managerPrefsLocal.defaultShiftMinutes"
                   type="number" min="15" max="720" step="15"
                   class="setting-input"
                   @change="savePrefs" />
            <span class="setting-unit">min</span>
          </div>
        </div>

      </section>

      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils.js";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import { usePreferences } from "../composables/usePreferences.js";

const { isDark, toggleTheme } = useTheme();
const { myDepts, selectedDeptId, loadDepts } = useDepartment();
const { preferences, loading, loadError, savePreferences } = usePreferences();

// Expose group objects under the same names the template already uses.
const notificationPrefs = preferences.notifications;
const managerPrefsLocal = preferences.managerPrefs;
const shiftReminders    = preferences.shiftReminders;
const calendarDisplay   = preferences.calendarDisplay;
const availabilityPrefs = preferences.availabilityPrefs;
const tradeboardPrefs   = preferences.tradeboardPrefs;

const currentUser = ref(Utils.getStore("user") || {});

const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u?.fName?.[0] ?? ""}${u?.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);
const isAdmin = computed(() => currentUser.value?.role === "Admin");

const selectedDeptName = computed(() => {
  const id = Number(selectedDeptId.value);
  return myDepts.value.find(d => Number(d.id_department) === id)?.name || "";
});

const personalPrefs = [
  { key: "timeOffDecision",   label: "Time-off request decisions",  desc: "Email me when my time-off request is approved or denied." },
  { key: "swapDecision",      label: "Swap request decisions",      desc: "Email me when my swap request is approved or denied." },
  { key: "shiftAssigned",     label: "New shift assignments",       desc: "Email me when I'm assigned to a shift." },
  { key: "taskAssigned",      label: "Task assignments",            desc: "Email me when tasks are assigned to my shift." },
];

const managerPrefs = [
  { key: "newTimeOffRequest", label: "New time-off requests",       desc: "Email me when someone on my team requests time off." },
  { key: "newSwapRequest",    label: "New swap requests",           desc: "Email me when a new swap request is submitted." },
  { key: "newAccessRequest",  label: "New department access requests", desc: "Email me when someone requests access to my department." },
];

const adminPrefs = [
  { key: "crossDeptAccess",   label: "Cross-department access requests", desc: "Email me on any department access request across the system." },
];

const prefsSaved = ref(false);

// Brief "Saved" chip after a successful save. The composable's saveTimer
// fires the request 400ms after the last change; we just poll by wrapping.
function savePrefs() {
  savePreferences();
  prefsSaved.value = true;
  setTimeout(() => { prefsSaved.value = false; }, 1500);
}

function setTheme(mode) {
  const wantDark = mode === "dark";
  if (wantDark !== isDark.value) toggleTheme();
}

function setCalendarView(view)   { calendarDisplay.defaultView = view;   savePrefs(); }
function setTimeFormat(fmt)      { calendarDisplay.timeFormat = fmt;     savePrefs(); }

// Hard refresh to /settings needs to hydrate myDepts before the composable
// can resolve the current department.
onMounted(async () => {
  if (myDepts.value.length === 0) {
    await loadDepts(currentUser.value);
  }
});
</script>

<style scoped>
.page-root {
  font-family: 'Satoshi', sans-serif;
  display: flex; flex-direction: column; flex: 1;
  background: var(--bg-page); color: var(--tx-primary);
  overflow: hidden;
}

.content {
  flex: 1; overflow-y: auto;
  padding: 32px 36px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
}
.page-heading { font-size: 28px; font-weight: 700; color: var(--tx-heading); }
.page-sub     { font-size: 14px; color: var(--tx-faint); margin: 6px 0 0 0; max-width: 640px; line-height: 1.4; }
.dept-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 100px;
  background: var(--accent-bg); color: var(--accent);
  border: 1px solid var(--accent-border);
  font-weight: 600; font-size: 12.5px;
}
.save-chip {
  padding: 4px 12px; border-radius: 100px;
  background: rgba(74,222,128,0.12); color: #4ade80;
  border: 1px solid rgba(74,222,128,0.4);
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  white-space: nowrap; flex-shrink: 0;
}

.info-banner, .error-banner {
  padding: 12px 16px; border-radius: 10px; margin-bottom: 18px;
  font-size: 14px; border: 1px solid;
}
.info-banner  { background: var(--bg-active);                color: var(--tx-secondary); border-color: var(--bdr-subtle); }
.error-banner { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.35); }

.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 12px;
  padding: 24px 26px;
  margin-bottom: 20px;
}

.settings-card-head { margin-bottom: 18px; }
.section-title { font-size: 17px; font-weight: 700; color: var(--tx-heading); margin: 0 0 4px 0; }
.section-sub   { font-size: 13px; color: var(--tx-faint); margin: 0; }

.subsection-label {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--tx-faint); margin: 18px 0 6px 0;
}

.setting-row, .toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid var(--bdr-subtle);
}
.setting-row:first-of-type, .toggle-row:first-of-type { border-top: none; }

.setting-label-group { flex: 1; min-width: 0; }
.setting-label { font-size: 14px; font-weight: 600; color: var(--tx-primary); }
.setting-desc  { font-size: 13px; color: var(--tx-faint); margin-top: 2px; }

.setting-control { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.setting-input {
  width: 90px; padding: 8px 10px;
  border: 1px solid var(--bdr-medium); border-radius: 8px;
  background: var(--bg-active); color: var(--tx-primary);
  font-family: 'DM Mono', monospace; font-size: 14px;
  text-align: right;
}
.setting-input:focus { outline: none; border-color: var(--accent); }
.setting-input:disabled { opacity: 0.5; cursor: not-allowed; }
.setting-unit { font-size: 13px; color: var(--tx-muted); }

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--bdr-medium); border-radius: 8px;
  background: var(--bg-active); color: var(--tx-primary);
  font-family: 'Satoshi', sans-serif; font-size: 14px;
  cursor: pointer;
}
.setting-select:focus { outline: none; border-color: var(--accent); }
.setting-select:disabled { opacity: 0.5; cursor: not-allowed; }

/* Segmented (Light / Dark) */
.segmented-btn {
  padding: 7px 16px; border: 1px solid var(--bdr-medium);
  background: var(--bg-active); color: var(--tx-muted);
  font-family: 'Satoshi', sans-serif; font-size: 13px;
  cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.segmented-btn:first-child { border-radius: 8px 0 0 8px; }
.segmented-btn:last-child  { border-radius: 0 8px 8px 0; border-left: none; }
.segmented-btn.active {
  background: var(--accent-bg); color: var(--accent); border-color: var(--accent-border);
}

/* Switch */
.switch { position: relative; display: inline-block; width: 42px; height: 24px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0; cursor: pointer;
  background: var(--bdr-medium); border-radius: 24px;
  transition: background 0.2s;
}
.slider::before {
  content: ""; position: absolute;
  width: 18px; height: 18px; left: 3px; top: 3px;
  background: #fff; border-radius: 50%;
  transition: transform 0.2s;
}
.switch input:checked + .slider { background: var(--accent); }
.switch input:checked + .slider::before { transform: translateX(18px); }

/* Account block */
.account-row { display: flex; align-items: center; gap: 16px; }
.account-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.account-info { display: flex; flex-direction: column; gap: 4px; }
.account-name { font-size: 16px; font-weight: 700; color: var(--tx-heading); }
.account-email { font-size: 13px; color: var(--tx-faint); }
.account-role-badge {
  display: inline-block; padding: 3px 12px; border-radius: 100px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
  width: fit-content; margin-top: 4px;
}
.account-role-badge.manager  { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border); }
.account-role-badge.admin    { background: rgba(240,230,211,0.1); color: #F0E6D3; border: 1px solid rgba(240,230,211,0.2); }
.account-role-badge.employee { background: var(--bg-active); color: var(--tx-secondary); border: 1px solid var(--bdr-subtle); }

.save-success {
  margin-top: 14px; font-size: 13px; color: #4ade80;
}

/* Mobile: tighten the settings card padding and let the page header wrap. */
@media (max-width: 599.98px) {
  .content { padding: 20px 14px 40px; }
  .page-header { flex-wrap: wrap; }
  .page-heading { font-size: 22px; }
  .settings-card { padding: 18px 16px; }
  .account-row { flex-wrap: wrap; }
}
</style>
