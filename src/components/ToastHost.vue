<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.type}`">
        <span class="toast-message">{{ t.message }}</span>
        <button v-if="t.action" class="toast-action" @click="runToastAction(t.id)">{{ t.action }}</button>
        <button class="toast-close" aria-label="Dismiss" @click="dismissToast(t.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from "../composables/useToast.js";
const { toasts, dismissToast, runToastAction } = useToast();
</script>

<style scoped>
.toast-host {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 8px;
  z-index: 3000;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 14px;
  min-width: 280px; max-width: 480px;
  padding: 12px 14px 12px 18px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-medium);
  border-radius: 10px;
  color: var(--tx-primary);
  font-family: 'Satoshi', 'Inter', sans-serif; font-size: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
}
.toast--success { border-left: 3px solid var(--ok-text); }
.toast--error   { border-left: 3px solid var(--accent); }
.toast--info    { border-left: 3px solid var(--tasks-tx); }

.toast-message { flex: 1; }
.toast-action {
  background: none; border: 1px solid var(--bdr-medium);
  color: var(--accent);
  padding: 4px 12px; border-radius: 6px;
  font: inherit; font-weight: 600;
  cursor: pointer; transition: border-color .12s, background .12s;
}
.toast-action:hover { border-color: var(--accent); background: var(--accent-bg); }
.toast-close {
  background: none; border: none; color: var(--tx-faint);
  cursor: pointer; font-size: 14px; padding: 2px 4px; line-height: 1;
}
.toast-close:hover { color: var(--tx-primary); }

.toast-enter-active, .toast-leave-active { transition: opacity .2s, transform .2s; }
.toast-enter-from  { opacity: 0; transform: translateY(12px); }
.toast-leave-to    { opacity: 0; transform: translateY(4px); }
</style>
