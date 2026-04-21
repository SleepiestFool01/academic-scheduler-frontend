<template>
  <div class="sp-wrap" :class="{ 'sp-wrap--disabled': disabled }" ref="rootRef">
    <button type="button"
      class="sp-trigger"
      :class="{ 'sp-trigger--open': open, 'sp-trigger--placeholder': !selected }"
      :disabled="disabled"
      @click.stop="toggle">
      <span class="sp-label">{{ selected ? selected.label : (placeholder || 'Select…') }}</span>
      <svg class="sp-caret" width="10" height="10" viewBox="0 0 10 10" fill="none"
        :style="{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Transition name="sp-pop">
      <div v-if="open" class="sp-panel" @click.stop>
        <div class="sp-list" ref="listRef">
          <button v-if="allowClear"
            type="button"
            class="sp-option sp-option--clear"
            @click="pick(null)">
            {{ clearLabel || '— None —' }}
          </button>
          <button
            v-for="opt in options" :key="opt.value"
            type="button"
            class="sp-option"
            :class="{ 'sp-option--selected': opt.value === modelValue }"
            @click="pick(opt.value)">
            {{ opt.label }}
          </button>
          <div v-if="options.length === 0" class="sp-empty">{{ emptyText || 'No options' }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options:    { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: "" },
  disabled:    { type: Boolean, default: false },
  allowClear:  { type: Boolean, default: false },
  clearLabel:  { type: String, default: "" },
  emptyText:   { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(null);
const listRef = ref(null);
const open = ref(false);

const selected = computed(() => props.options.find(o => o.value === props.modelValue) || null);

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}
function close() { open.value = false; }
function pick(value) {
  emit("update:modelValue", value);
  close();
}

function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) close();
}
function onKeydown(e) {
  if (open.value && e.key === "Escape") { e.preventDefault(); close(); }
}

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
.sp-wrap { position: relative; width: 100%; font-family: 'Satoshi', 'Inter', sans-serif; }
.sp-wrap--disabled { opacity: .6; }

.sp-trigger {
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
.sp-trigger:hover:not(:disabled)  { border-color: var(--bdr-medium); background: var(--bg-hover); }
.sp-trigger--open                 { border-color: var(--accent); }
.sp-trigger:disabled              { cursor: not-allowed; }
.sp-trigger--placeholder .sp-label { color: var(--tx-faint); }

.sp-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-caret { color: var(--tx-muted); transition: transform .15s; flex-shrink: 0; }

.sp-panel {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  z-index: 60;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25);
}
.sp-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 1px;
}
.sp-list::-webkit-scrollbar { width: 6px; }
.sp-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.sp-option {
  text-align: left;
  padding: 8px 10px;
  border: none; background: none;
  border-radius: 6px;
  color: var(--tx-primary);
  font-family: inherit; font-size: 14px; font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background .1s, color .1s;
}
.sp-option:hover { background: var(--bg-hover); color: var(--tx-heading); }
.sp-option--selected {
  background: var(--accent);
  color: #fff;
}
.sp-option--selected:hover { background: var(--accent-hover); color: #fff; }
.sp-option--clear { color: var(--tx-faint); font-style: italic; }
.sp-option--clear:hover { color: var(--tx-secondary); }

.sp-empty {
  padding: 14px 10px;
  color: var(--tx-faint);
  font-size: 13px;
  text-align: center;
}

.sp-pop-enter-active, .sp-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease; transform-origin: top left;
}
.sp-pop-enter-from, .sp-pop-leave-to {
  opacity: 0; transform: scale(.98) translateY(-4px);
}
</style>
