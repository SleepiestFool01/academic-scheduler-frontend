<template>
  <div class="tp-wrap" ref="rootRef">
    <button type="button" class="tp-trigger"
      :class="{ 'tp-trigger--open': open, 'tp-trigger--disabled': disabled }"
      :disabled="disabled"
      @click.stop="toggle">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="tp-icon">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
        <path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span class="tp-label" :class="{ 'tp-placeholder': !modelValue }">
        {{ modelValue ? formatDisplay(modelValue) : (placeholder || 'Select time') }}
      </span>
      <svg class="tp-caret" width="10" height="10" viewBox="0 0 10 10" fill="none"
        :style="{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Transition name="tp-pop">
      <div v-if="open" class="tp-panel" @click.stop>
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="tp-search"
          placeholder="Type a time…"
          @keydown.enter.prevent="applyQuery"
          @keydown.down.prevent="scrollBy(1)"
          @keydown.up.prevent="scrollBy(-1)"
        />
        <div class="tp-list" ref="listRef">
          <button
            v-for="t in filteredTimes" :key="t.value"
            type="button"
            class="tp-option"
            :class="{ 'tp-option--selected': isEqual(modelValue, t.value) }"
            :data-value="t.value"
            @click="pick(t.value)"
          >{{ t.label }}</button>
          <div v-if="filteredTimes.length === 0" class="tp-empty">
            No matches. Press Enter to apply "{{ query }}".
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },    // "HH:MM" 24-hour
  step:        { type: Number, default: 15 },    // minutes between options
  placeholder: { type: String, default: "" },
  disabled:    { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(null);
const inputRef = ref(null);
const listRef = ref(null);
const open = ref(false);
const query = ref("");

const allTimes = computed(() => {
  const out = [];
  for (let m = 0; m < 24 * 60; m += props.step) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const value = `${hh}:${mm}`;
    out.push({ value, label: formatDisplay(value) });
  }
  return out;
});

function formatDisplay(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

function parseInput(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  // Accept forms: "9", "9am", "9 am", "9:30", "9:30 pm", "14:30", "1430"
  let m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  const period = m[3]?.[0];
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  if (min < 0 || min > 59) return null;
  if (period) {
    if (h < 1 || h > 12) return null;
    if (period === "a" && h === 12) h = 0;
    if (period === "p" && h < 12)   h += 12;
  } else {
    // No AM/PM — accept 0-23 as 24h
    if (h < 0 || h > 23) return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function isEqual(a, b) { return a === b; }

const filteredTimes = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allTimes.value;
  return allTimes.value.filter(t =>
    t.label.toLowerCase().includes(q) || t.value.includes(q)
  );
});

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    query.value = "";
    nextTick(() => {
      inputRef.value?.focus();
      scrollSelectedIntoView();
    });
  }
}
function close() { open.value = false; }

function pick(value) {
  emit("update:modelValue", value);
  close();
}
function applyQuery() {
  const parsed = parseInput(query.value);
  if (parsed) pick(parsed);
}

function scrollSelectedIntoView() {
  const el = listRef.value?.querySelector(`[data-value="${props.modelValue}"]`);
  if (el) el.scrollIntoView({ block: "center" });
}
function scrollBy(delta) {
  const opts = filteredTimes.value;
  if (!opts.length) return;
  const currentIdx = opts.findIndex(o => o.value === props.modelValue);
  const next = Math.max(0, Math.min(opts.length - 1, (currentIdx < 0 ? 0 : currentIdx) + delta));
  emit("update:modelValue", opts[next].value);
  nextTick(scrollSelectedIntoView);
}

function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) close();
}
function onKeydown(e) {
  if (open.value && e.key === "Escape") { e.preventDefault(); close(); }
}

watch(open, (v) => { if (v) nextTick(scrollSelectedIntoView); });

onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.tp-wrap { position: relative; width: 100%; font-family: 'Satoshi', 'Inter', sans-serif; }

.tp-trigger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.tp-trigger:hover:not(:disabled)  { border-color: var(--bdr-medium); background: var(--bg-hover); }
.tp-trigger--open  { border-color: var(--accent); }
.tp-trigger--disabled, .tp-trigger:disabled { opacity: .55; cursor: not-allowed; }
.tp-icon { color: var(--tx-secondary); flex-shrink: 0; }
.tp-trigger:hover .tp-icon,
.tp-trigger--open .tp-icon { color: var(--accent); }
.tp-label {
  flex: 1; min-width: 0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  font-weight: 500;
}
.tp-placeholder { color: var(--tx-faint); font-weight: 400; }
.tp-caret { color: var(--tx-muted); transition: transform .15s; flex-shrink: 0; }

.tp-panel {
  position: absolute; top: calc(100% + 6px); left: 0;
  z-index: 50; width: 220px; max-width: calc(100vw - 32px);
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px;
  padding: 8px;
  display: flex; flex-direction: column; gap: 6px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25);
}

.tp-search {
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 7px;
  padding: 7px 10px;
  color: var(--tx-primary);
  font-family: inherit; font-size: 13px;
  outline: none; transition: border-color .15s;
}
.tp-search::placeholder { color: var(--tx-faint); }
.tp-search:focus { border-color: var(--accent); }

.tp-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 1px;
  padding-right: 2px;
}
.tp-list::-webkit-scrollbar { width: 6px; }
.tp-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.tp-option {
  text-align: left;
  padding: 7px 10px;
  border: none; background: none;
  border-radius: 6px;
  color: var(--tx-primary);
  font-family: inherit; font-size: 14px; font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background .1s, color .1s;
}
.tp-option:hover { background: var(--bg-hover); color: var(--tx-heading); }
.tp-option--selected {
  background: var(--accent);
  color: #fff;
}
.tp-option--selected:hover { background: var(--accent-hover); color: #fff; }

.tp-empty {
  padding: 16px 10px;
  color: var(--tx-faint);
  font-size: 13px;
  text-align: center;
}

.tp-pop-enter-active, .tp-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease; transform-origin: top left;
}
.tp-pop-enter-from, .tp-pop-leave-to {
  opacity: 0; transform: scale(.96) translateY(-4px);
}
</style>
