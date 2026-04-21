<template>
  <div class="date-picker-wrap" ref="rootRef">
    <button type="button" class="date-trigger" :class="{ 'date-trigger--open': open }" @click.stop="toggle">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="date-trigger-icon">
        <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
        <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span :class="{ 'date-trigger-placeholder': !modelValue }">
        {{ modelValue ? formatDisplay(modelValue) : (placeholder || 'Select date') }}
      </span>
    </button>
    <Transition name="dpc-pop">
      <div v-if="open" class="dpc-dropdown" @click.stop>
        <div class="dpc-header">
          <button type="button" class="dpc-nav" @click="prevMonth">‹</button>
          <span class="dpc-month-label">{{ monthLabel }}</span>
          <button type="button" class="dpc-nav" @click="nextMonth">›</button>
        </div>
        <div class="dpc-dow-row">
          <span v-for="d in DOWS" :key="d" class="dpc-dow">{{ d }}</span>
        </div>
        <div class="dpc-days">
          <span v-for="p in startPad" :key="'p'+p" class="dpc-cell dpc-empty"></span>
          <span v-for="day in daysInMonth" :key="day" class="dpc-cell"
            :class="{
              'dpc-selected': isSelected(day),
              'dpc-today':    isToday(day),
              'dpc-disabled': isDisabled(day),
            }"
            @click="pick(day)">{{ day }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },  // ISO "YYYY-MM-DD"
  min:         { type: String, default: "" },  // ISO; disables dates before
  placeholder: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const DOWS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const rootRef = ref(null);
const open = ref(false);
const today = new Date();
const viewYear  = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

function pad2(n) { return String(n).padStart(2, "0"); }
function toIso(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

function toggle() {
  if (open.value) { open.value = false; return; }
  const base = props.modelValue
    ? new Date(props.modelValue + "T00:00:00")
    : new Date();
  viewYear.value  = base.getFullYear();
  viewMonth.value = base.getMonth();
  open.value = true;
}

function close() { open.value = false; }

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1)
    .toLocaleDateString(undefined, { month: "long", year: "numeric" })
);
const daysInMonth = computed(() =>
  new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
);
const startPad = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).getDay()
);

function prevMonth() {
  let m = viewMonth.value - 1, y = viewYear.value;
  if (m < 0) { m = 11; y -= 1; }
  viewMonth.value = m; viewYear.value = y;
}
function nextMonth() {
  let m = viewMonth.value + 1, y = viewYear.value;
  if (m > 11) { m = 0; y += 1; }
  viewMonth.value = m; viewYear.value = y;
}

function isSelected(day) {
  return props.modelValue === toIso(viewYear.value, viewMonth.value, day);
}
function isToday(day) {
  const t = new Date();
  return day === t.getDate()
    && viewMonth.value === t.getMonth()
    && viewYear.value  === t.getFullYear();
}
function isDisabled(day) {
  if (!props.min) return false;
  return toIso(viewYear.value, viewMonth.value, day) < props.min;
}
function pick(day) {
  if (isDisabled(day)) return;
  emit("update:modelValue", toIso(viewYear.value, viewMonth.value, day));
  close();
}

function formatDisplay(iso) {
  return new Date(iso + "T00:00:00")
    .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) close();
}
onMounted(() => document.addEventListener("click", onDocClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));
</script>

<style scoped>
.date-picker-wrap { position: relative; width: 100%; }
.date-trigger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 15px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.date-trigger:hover { border-color: var(--bdr-medium); background: var(--bg-hover); }
.date-trigger:focus { outline: none; border-color: var(--accent); }
.date-trigger--open { border-color: var(--accent); }
.date-trigger-icon { color: var(--tx-secondary); flex-shrink: 0; }
.date-trigger:hover .date-trigger-icon,
.date-trigger--open .date-trigger-icon { color: var(--accent); }
.date-trigger-placeholder { color: var(--tx-faint); }

.dpc-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: 280px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45),
              0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; gap: 10px;
  font-family: 'Satoshi', sans-serif;
}
.dpc-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 0 2px 4px;
}
.dpc-nav {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-secondary);
  border-radius: 6px;
  width: 26px; height: 26px;
  font-size: 18px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, border-color .15s, background .15s;
}
.dpc-nav:hover {
  color: var(--accent); border-color: var(--accent); background: var(--accent-bg);
}
.dpc-month-label {
  font-size: 15px; font-weight: 600;
  color: var(--tx-heading);
  letter-spacing: .2px;
}
.dpc-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dpc-dow {
  text-align: center;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .5px;
  color: var(--tx-faint);
  padding: 4px 0;
  font-family: 'DM Mono', monospace;
}
.dpc-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dpc-cell {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  color: var(--tx-primary);
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s, color .12s, border-color .12s;
  user-select: none;
}
.dpc-cell:hover:not(.dpc-empty):not(.dpc-disabled) {
  background: var(--bg-hover); color: var(--tx-heading);
}
.dpc-empty { cursor: default; }
.dpc-today {
  border-color: var(--bdr-medium);
  color: var(--tx-heading);
  font-weight: 600;
}
.dpc-selected,
.dpc-selected:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.dpc-disabled {
  color: var(--tx-faded);
  cursor: not-allowed;
  opacity: .5;
}

.dpc-pop-enter-active, .dpc-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease;
  transform-origin: top left;
}
.dpc-pop-enter-from, .dpc-pop-leave-to {
  opacity: 0; transform: scale(.96) translateY(-4px);
}
</style>
