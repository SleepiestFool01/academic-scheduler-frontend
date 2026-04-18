<template>
  <Transition name="modal">
    <div v-if="open" class="modal-overlay" @click.self="cancel">
      <div class="modal modal-sm">
        <div class="conflict-head">
          <div class="conflict-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 21h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M12 9v5M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="modal-title">Scheduling conflict</h3>
        </div>

        <p class="modal-body-text">
          <strong>{{ subject || 'This employee' }}</strong>
          {{ verb }}
          <span class="conflict-label-pill">
            <span class="conflict-label-dot"></span>{{ label || 'Unavailable' }}
          </span>
          during this shift. Continue anyway?
        </p>

        <div class="modal-actions">
          <button class="cancel-btn" @click="cancel">Cancel</button>
          <button class="confirm-btn conflict-confirm" @click="confirm">Assign anyway</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  open:     { type: Boolean, default: false },
  subject:  { type: String,  default: "" },      // e.g. "Sarah Smith" or "You"
  verb:     { type: String,  default: "is marked" }, // "is marked" / "are marked"
  label:    { type: String,  default: "" },
});
const emit = defineEmits(["confirm", "cancel"]);
function confirm() { emit("confirm"); }
function cancel()  { emit("cancel"); }
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: var(--bg-moverlay, rgba(0,0,0,0.55));
  display: flex; align-items: center; justify-content: center;
  z-index: 800; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-modal); border: 1px solid var(--bdr-medium);
  border-radius: 14px; padding: 24px; width: 440px; max-width: 92vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}

.conflict-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.conflict-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(255, 23, 68, 0.14);
  color: rgba(255, 23, 68, 0.9);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin: 0; }
.modal-body-text { font-size: 15px; color: var(--tx-secondary); line-height: 1.55; margin-bottom: 22px; }

.conflict-label-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 700;
  padding: 2px 9px 2px 7px;
  background: rgba(255, 23, 68, 0.13);
  border: 1px solid rgba(255, 23, 68, 0.35);
  color: rgba(255, 23, 68, 0.95);
  border-radius: 100px;
  font-family: 'DM Mono', monospace;
  vertical-align: baseline;
  margin: 0 2px;
}
.conflict-label-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255, 23, 68, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 23, 68, 0.18);
}

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.cancel-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  padding: 9px 18px; border-radius: 8px; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 500;
}
.cancel-btn:hover { color: var(--tx-primary); border-color: var(--bdr-subtle); }
.confirm-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 9px 18px; border-radius: 8px; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600;
}
.confirm-btn.conflict-confirm { background: rgba(255, 23, 68, 0.88); }
.confirm-btn.conflict-confirm:hover { background: rgba(255, 23, 68, 1); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>
