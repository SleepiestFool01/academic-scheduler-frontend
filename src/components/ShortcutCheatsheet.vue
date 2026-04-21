<template>
  <Transition name="sc-fade">
    <div v-if="open" class="sc-overlay" @click.self="close">
      <div class="sc-panel" @click.stop>
        <div class="sc-header">
          <h3 class="sc-title">Keyboard Shortcuts</h3>
          <button class="sc-close" @click="close" aria-label="Close">✕</button>
        </div>
        <div class="sc-body">
          <div v-for="group in groups" :key="group.label" class="sc-group">
            <div class="sc-group-label">{{ group.label }}</div>
            <div v-for="row in group.rows" :key="row.label" class="sc-row">
              <span class="sc-label">{{ row.label }}</span>
              <span class="sc-keys">
                <template v-for="(k, i) in row.keys" :key="k">
                  <kbd class="sc-kbd">{{ k }}</kbd>
                  <span v-if="i < row.keys.length - 1" class="sc-plus">+</span>
                </template>
              </span>
            </div>
          </div>
        </div>
        <div class="sc-footer">
          <span class="sc-hint">Press <kbd class="sc-kbd">?</kbd> anywhere to open this menu</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const open = ref(false);

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const groups = computed(() => [
  {
    label: "Global",
    rows: [
      { label: "Open command palette", keys: [mod, "K"] },
      { label: "Show this cheatsheet", keys: ["?"] },
      { label: "Close dialog / cancel",  keys: ["Esc"] },
    ],
  },
  {
    label: "Dashboard — Navigation",
    rows: [
      { label: "Previous week / day",  keys: ["←"] },
      { label: "Next week / day",      keys: ["→"] },
      { label: "Jump to today",        keys: ["T"] },
    ],
  },
  {
    label: "Dashboard — Shifts",
    rows: [
      { label: "Select multiple shifts", keys: [mod, "Click"] },
      { label: "Rubber-band select",     keys: [mod, "Drag"] },
      { label: "Copy selected shifts",   keys: [mod, "C"] },
      { label: "Paste to a day",         keys: [mod, "V"] },
      { label: "Delete selected",        keys: ["Delete"] },
      { label: "Undo last action",       keys: [mod, "Z"] },
      { label: "Clear selection",        keys: ["Esc"] },
    ],
  },
]);

function openCheatsheet() { open.value = true; }
function close() { open.value = false; }

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function onKeydown(e) {
  if (e.key === "?" && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target)) {
    e.preventDefault();
    openCheatsheet();
    return;
  }
  if (open.value && e.key === "Escape") { e.preventDefault(); close(); }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.sc-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 12vh;
  z-index: 2100;
}
.sc-panel {
  width: min(560px, calc(100vw - 32px));
  max-height: 76vh;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-medium);
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.3);
  display: flex; flex-direction: column;
  overflow: hidden;
  font-family: 'Satoshi', 'Inter', sans-serif;
}
.sc-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--bdr-subtle);
}
.sc-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--tx-heading); }
.sc-close {
  background: none; border: 1px solid var(--bdr-medium);
  color: var(--tx-muted);
  width: 28px; height: 28px; border-radius: 6px;
  cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
}
.sc-close:hover { color: var(--tx-primary); border-color: var(--bdr-subtle); }

.sc-body { overflow-y: auto; padding: 14px 18px; }
.sc-group { margin-bottom: 16px; }
.sc-group:last-child { margin-bottom: 0; }
.sc-group-label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
  margin-bottom: 8px;
}
.sc-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--bdr-subtle);
}
.sc-row:last-child { border-bottom: none; }
.sc-label { color: var(--tx-primary); font-size: 14px; }
.sc-keys { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
.sc-plus { color: var(--tx-faint); font-size: 11px; }

.sc-kbd {
  font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 5px;
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  color: var(--tx-secondary);
  min-width: 22px; text-align: center;
  letter-spacing: .04em;
}

.sc-footer {
  padding: 10px 18px;
  background: var(--bg-surface);
  border-top: 1px solid var(--bdr-subtle);
  font-size: 12px; color: var(--tx-faint);
  display: flex; justify-content: flex-end;
}
.sc-hint { display: inline-flex; align-items: center; gap: 6px; }

.sc-fade-enter-active, .sc-fade-leave-active { transition: opacity .15s; }
.sc-fade-enter-from,   .sc-fade-leave-to     { opacity: 0; }
.sc-fade-enter-active .sc-panel, .sc-fade-leave-active .sc-panel { transition: transform .18s ease; }
.sc-fade-enter-from .sc-panel, .sc-fade-leave-to .sc-panel { transform: scale(.97) translateY(-6px); }
</style>
