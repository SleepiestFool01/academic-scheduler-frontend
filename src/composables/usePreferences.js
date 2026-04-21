import { ref, reactive, watch } from "vue";
import { getMyPreferences, saveMyPreferences } from "../services/preferencesService.js";
import { useDepartment } from "./useDepartment.js";

// Defaults mirror the server-side shape. Any view that reads a pref can
// safely assume these are defined because applyPrefs() overlays defaults
// over whatever the server returned (including {}).
export const DEFAULT_PREFS = {
  notifications: {
    timeOffDecision: true,
    swapDecision: true,
    shiftAssigned: true,
    taskAssigned: true,
    newTimeOffRequest: true,
    newSwapRequest: true,
    newAccessRequest: true,
    crossDeptAccess: false,
  },
  managerPrefs: {
    defaultShiftMinutes: 240,
  },
  shiftReminders: {
    enabled: true,
    minutesBefore: 30,
  },
  calendarDisplay: {
    defaultView: "week",
    timeFormat: "12h",
  },
  availabilityPrefs: {
    autoSyncClassSchedule: true,
  },
  tradeboardPrefs: {
    hideDeclined: true,
  },
};

// Module-level singleton state. Views share the same reactive object so a
// preference change made in Settings.vue is visible to Dashboard.vue etc.
// without a refresh.
const preferences = reactive(clone(DEFAULT_PREFS));
const loading     = ref(false);
const loadError   = ref("");
const loadedDeptId = ref(null);

let inflight = null;
let initialized = false;
let applying = false;
let saveTimer = null;

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function applyFromServer(raw) {
  applying = true;
  try {
    for (const group of Object.keys(DEFAULT_PREFS)) {
      Object.assign(preferences[group], DEFAULT_PREFS[group], raw?.[group] || {});
    }
  } finally {
    applying = false;
  }
}

async function loadFor(id_department) {
  if (!id_department) {
    loadedDeptId.value = null;
    applyFromServer({});
    return;
  }
  loading.value = true;
  loadError.value = "";
  inflight = (async () => {
    try {
      const { data } = await getMyPreferences(id_department);
      applyFromServer(data?.preferences || {});
      loadedDeptId.value = Number(id_department);
    } catch (err) {
      loadError.value = err?.response?.data?.message || err?.message || "Couldn't load preferences.";
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();
  return inflight;
}

// Call this once (the composable auto-initializes on first use) to start
// watching selectedDeptId. Safe to call multiple times.
function init() {
  if (initialized) return;
  initialized = true;
  const { selectedDeptId } = useDepartment();
  if (selectedDeptId.value) loadFor(selectedDeptId.value);
  watch(selectedDeptId, (id) => {
    if (id && Number(id) !== loadedDeptId.value) loadFor(id);
  });
}

// Debounced save. Pushes the full blob because the server always expects
// a complete replacement (simpler than partial merges server-side).
function savePreferences() {
  if (applying) return;
  if (!loadedDeptId.value) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const snapshot = JSON.parse(JSON.stringify(preferences));
      await saveMyPreferences(loadedDeptId.value, snapshot);
    } catch (err) {
      loadError.value = err?.response?.data?.message || err?.message || "Couldn't save preferences.";
    }
  }, 400);
}

// Force-await the current fetch (so views that need prefs at mount can
// avoid a first-render flash of defaults).
async function ready() {
  if (inflight) return inflight;
}

// Shared time formatter driven by calendarDisplay.timeFormat. Reads the
// pref at call time so Vue templates re-render on change. `h` is a
// fractional hour (e.g. 9.5 for 9:30).
export function fmtHour(h) {
  const total = Math.round(h * 60);
  const hr = Math.floor(total / 60);
  const min = total % 60;
  if (preferences.calendarDisplay?.timeFormat === "24h") {
    return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const suffix = hr >= 12 ? "pm" : "am";
  const disp = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0 ? `${disp}${suffix}` : `${disp}:${String(min).padStart(2, "0")}${suffix}`;
}

// Format a "HH:MM" or "HH:MM:SS" time string using the same pref.
export function fmtTimeStr(timeStr) {
  if (!timeStr) return "";
  const [hh, mm] = String(timeStr).split(":").map(Number);
  if (Number.isNaN(hh)) return timeStr;
  return fmtHour(hh + (mm || 0) / 60);
}

export function usePreferences() {
  init();
  return {
    preferences,
    loading,
    loadError,
    loadedDeptId,
    savePreferences,
    ready,
    reload: loadFor,
    fmtHour,
    fmtTimeStr,
  };
}
