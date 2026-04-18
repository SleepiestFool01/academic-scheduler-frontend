<template>
  <div class="emp-picker" :class="{ 'emp-picker--disabled': disabled }" ref="rootRef">
    <button type="button" class="emp-picker-trigger"
      :disabled="disabled"
      @click.stop="toggle">
      <span class="emp-picker-trigger-text" :class="{ 'emp-picker-placeholder': !selectedOption }">
        {{ selectedOption ? selectedOption.name : (placeholder || '— Unassigned —') }}
      </span>
      <span v-if="selectedOption && selectedOption.conflict" class="emp-picker-conflict-pill">
        <span class="emp-picker-conflict-dot"></span>
        {{ selectedOption.conflict.label || 'Unavailable' }}
      </span>
      <svg class="emp-picker-caret" width="10" height="10" viewBox="0 0 10 10" fill="none"
        :style="{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Transition name="emp-picker-pop">
      <div v-if="open" class="emp-picker-menu" @click.stop>
        <button type="button" class="emp-picker-option" :class="{ selected: !selectedValue }"
          @click="pick(null)">
          <span class="emp-picker-option-name">— Unassigned —</span>
        </button>
        <button v-for="opt in options"
          type="button"
          :key="opt.id_employee"
          class="emp-picker-option"
          :class="{ selected: isSelected(opt) }"
          @click="pick(opt)">
          <span class="emp-picker-option-name">{{ opt.name }}</span>
          <span v-if="opt.conflict" class="emp-picker-conflict-pill">
            <span class="emp-picker-conflict-dot"></span>
            {{ opt.conflict.label || 'Unavailable' }}
          </span>
        </button>
        <div v-if="!options.length" class="emp-picker-empty">{{ emptyText || 'No employees available.' }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  // Controlled value. String or Number — whatever the parent tracks.
  modelValue: { type: [String, Number, null], default: null },
  // Field of the option object to bind as the value. Two modes:
  //   "id_employee" — parent stores the id_employee (TemplateEditor style)
  //   "name"        — parent stores the employee's full name (Dashboard style)
  valueField:  { type: String, default: "id_employee" },
  // Each option: { id_employee, name, conflict? }. `conflict` is either
  // null/undefined or { label } — the picker doesn't care what else is on
  // the conflict object.
  options:     { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
  emptyText:   { type: String, default: "" },
  disabled:    { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue", "select"]);

const open    = ref(false);
const rootRef = ref(null);

const selectedValue = computed(() => props.modelValue);
const selectedOption = computed(() => {
  if (selectedValue.value == null || selectedValue.value === "") return null;
  return props.options.find(o => valueOf(o) === selectedValue.value) || null;
});

function valueOf(opt) {
  return opt?.[props.valueField] ?? null;
}
function isSelected(opt) {
  const v = valueOf(opt);
  return v != null && v === selectedValue.value;
}

function toggle() { if (!props.disabled) open.value = !open.value; }
function close()  { open.value = false; }

function pick(opt) {
  const v = opt ? valueOf(opt) : (props.valueField === "name" ? "" : null);
  emit("update:modelValue", v);
  emit("select", opt);
  close();
}

// Click-outside to dismiss — scoped to the picker root so the parent
// modal overlay can stay open.
function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) close();
}
onMounted(()   => window.addEventListener("click", onDocClick));
onBeforeUnmount(() => window.removeEventListener("click", onDocClick));
</script>

<style scoped>
.emp-picker { position: relative; width: 100%; }
.emp-picker--disabled { opacity: 0.55; cursor: not-allowed; }

.emp-picker-trigger {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-surface, #13131f);
  border: 1px solid var(--bdr-medium, #2a2a3a);
  color: var(--tx-primary, #f0e6d3);
  padding: 8px 12px; border-radius: 8px;
  font-family: inherit; font-size: 14px;
  cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s;
  min-height: 38px;
}
.emp-picker-trigger:hover:not(:disabled) { border-color: var(--accent, #FF1744); }
.emp-picker-trigger:focus { outline: none; border-color: var(--accent, #FF1744); }
.emp-picker-trigger:disabled { cursor: not-allowed; }

.emp-picker-trigger-text {
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.emp-picker-placeholder { color: var(--tx-ghost, #6a6a7a); }

.emp-picker-caret { color: var(--tx-muted, #8a8a9a); flex-shrink: 0; }

.emp-picker-menu {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-modal, #13131f);
  border: 1px solid var(--bdr-medium, #2a2a3a);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  z-index: 1000;
  max-height: 280px; overflow-y: auto;
  padding: 4px;
}

.emp-picker-option {
  width: 100%;
  display: flex; align-items: center; gap: 10px;
  background: transparent; border: none;
  padding: 8px 10px; border-radius: 6px;
  color: var(--tx-primary, #f0e6d3);
  font-family: inherit; font-size: 14px;
  cursor: pointer; text-align: left;
  transition: background 0.12s;
}
.emp-picker-option:hover { background: var(--bg-active, rgba(255, 23, 68, 0.08)); }
.emp-picker-option.selected {
  background: var(--accent-bg, rgba(255, 23, 68, 0.12));
  color: var(--accent, #FF1744);
  font-weight: 600;
}

.emp-picker-option-name {
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.emp-picker-conflict-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 9px 3px 7px;
  background: rgba(255, 23, 68, 0.13);
  border: 1px solid rgba(255, 23, 68, 0.35);
  color: rgba(255, 23, 68, 0.95);
  border-radius: 100px;
  flex-shrink: 0;
  font-family: 'DM Mono', monospace, inherit;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.emp-picker-conflict-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255, 23, 68, 0.95);
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 23, 68, 0.18);
}

.emp-picker-empty {
  padding: 16px 10px; text-align: center;
  color: var(--tx-ghost, #6a6a7a); font-size: 13px;
  font-style: italic;
}

.emp-picker-pop-enter-active, .emp-picker-pop-leave-active { transition: opacity 0.12s, transform 0.12s; }
.emp-picker-pop-enter-from, .emp-picker-pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
