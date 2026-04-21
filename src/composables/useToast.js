import { ref } from "vue";

// Singleton toast queue shared across the app.
const toasts = ref([]);
let nextId = 1;

/**
 * Show a toast.
 * @param {Object} opts
 * @param {string} opts.message
 * @param {string} [opts.action]       Label for the action button (e.g. "Undo")
 * @param {Function} [opts.onAction]   Handler invoked when action is clicked
 * @param {number} [opts.duration=5000]
 * @param {"info"|"success"|"error"} [opts.type="info"]
 */
function showToast({ message, action, onAction, duration = 5000, type = "info" } = {}) {
  const id = nextId++;
  const toast = { id, message, action, onAction, type };
  toasts.value = [...toasts.value, toast];
  if (duration > 0) {
    toast._timer = setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

function dismissToast(id) {
  const t = toasts.value.find(x => x.id === id);
  if (t?._timer) clearTimeout(t._timer);
  toasts.value = toasts.value.filter(x => x.id !== id);
}

function runToastAction(id) {
  const t = toasts.value.find(x => x.id === id);
  if (t?.onAction) t.onAction();
  dismissToast(id);
}

export function useToast() {
  return { toasts, showToast, dismissToast, runToastAction };
}
