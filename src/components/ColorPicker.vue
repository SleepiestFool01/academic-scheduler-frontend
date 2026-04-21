<template>
  <div class="cp-wrap" ref="rootRef">
    <button type="button" class="cp-trigger" :class="{ 'cp-trigger--open': open }" @click.stop="toggle">
      <span class="cp-swatch" :style="swatchStyle">
        <svg v-if="!modelValue" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="4"  y1="20" x2="20" y2="4"  stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </span>
      <span class="cp-label">{{ modelValue || 'No color' }}</span>
      <svg class="cp-caret" width="10" height="10" viewBox="0 0 10 10" fill="none"
        :style="{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }">
        <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <Transition name="cp-pop">
      <div v-if="open" class="cp-panel" @click.stop>
        <div class="cp-section">
          <div class="cp-section-label">Presets</div>
          <div class="cp-swatch-grid">
            <button v-for="c in presets" :key="c"
              type="button"
              class="cp-swatch cp-swatch--pick"
              :class="{ 'cp-swatch--selected': isEqual(modelValue, c) }"
              :style="{ background: c }"
              :aria-label="c"
              @click="pick(c)"
            />
          </div>
        </div>

        <div v-if="favorites.length" class="cp-section">
          <div class="cp-section-label">Favorites</div>
          <div class="cp-swatch-grid">
            <div v-for="c in favorites" :key="c" class="cp-fav">
              <button type="button"
                class="cp-swatch cp-swatch--pick"
                :class="{ 'cp-swatch--selected': isEqual(modelValue, c) }"
                :style="{ background: c }"
                :aria-label="c"
                @click="pick(c)"
              />
              <button type="button" class="cp-fav-remove" title="Remove favorite" @click="removeFavorite(c)">✕</button>
            </div>
          </div>
        </div>

        <div class="cp-section">
          <div class="cp-section-label">Custom</div>
          <div class="cp-custom-row">
            <label class="cp-native-wrap" :style="{ background: customInput || '#888' }">
              <input type="color" class="cp-native" :value="customInput || '#888888'" @input="onNativeInput" />
            </label>
            <input type="text" class="cp-hex-input" v-model="customInput"
              placeholder="#RRGGBB" maxlength="7" @keyup.enter="applyCustom" />
            <button type="button" class="cp-btn cp-btn--primary"
              :disabled="!isValidHex(customInput)"
              @click="applyCustom">Apply</button>
            <button type="button" class="cp-btn cp-btn--ghost"
              :disabled="!isValidHex(customInput) || isFavorite(customInput)"
              :title="isFavorite(customInput) ? 'Already saved' : 'Save to favorites'"
              @click="saveFavorite">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  :fill="isFavorite(customInput) ? 'currentColor' : 'none'"
                  stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="cp-footer">
          <button v-if="modelValue" type="button" class="cp-btn cp-btn--ghost cp-clear" @click="pick(null)">Clear color</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";

const FAVORITES_KEY = "emp-color-favorites";

const props = defineProps({
  modelValue: { type: String, default: null },
  presets:    { type: Array,  default: () => ["#B76E6E","#D08B6A","#C9A96E","#9DA66B","#7BA37D","#6FA39C","#7B9CC2","#8B91C2","#A088B8","#BE8AA8","#8F9299","#9C7B5F"] },
});
const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(null);
const open = ref(false);
const customInput = ref(props.modelValue || "");
const favorites = ref(loadFavorites());

watch(() => props.modelValue, (v) => { if (v) customInput.value = v; });

const swatchStyle = computed(() => props.modelValue
  ? { background: props.modelValue }
  : { background: "transparent", border: "1.5px dashed var(--bdr-medium)", color: "var(--tx-muted)" });

function normalize(v) { return v ? v.toLowerCase() : null; }
function isEqual(a, b) { return normalize(a) === normalize(b); }
function isValidHex(v) { return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(v || ""); }
function isFavorite(v) { return isValidHex(v) && favorites.value.some(f => isEqual(f, v)); }

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(isValidHex) : [];
  } catch { return []; }
}
function saveFavoritesToStorage() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value)); } catch (_) { /* ignore */ }
}

function toggle() {
  open.value = !open.value;
  if (open.value && props.modelValue) customInput.value = props.modelValue;
}
function close() { open.value = false; }

function pick(color) {
  emit("update:modelValue", color);
  close();
}
function onNativeInput(e) { customInput.value = e.target.value; }
function applyCustom() {
  if (!isValidHex(customInput.value)) return;
  pick(customInput.value.toLowerCase());
}
function saveFavorite() {
  if (!isValidHex(customInput.value)) return;
  const hex = customInput.value.toLowerCase();
  if (favorites.value.some(f => isEqual(f, hex))) return;
  favorites.value = [hex, ...favorites.value].slice(0, 18);
  saveFavoritesToStorage();
}
function removeFavorite(c) {
  favorites.value = favorites.value.filter(f => !isEqual(f, c));
  saveFavoritesToStorage();
}

function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) close();
}
onMounted(() => document.addEventListener("click", onDocClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));
</script>

<style scoped>
.cp-wrap { position: relative; width: 100%; font-family: 'Satoshi', sans-serif; }

.cp-trigger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--tx-primary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.cp-trigger:hover  { border-color: var(--bdr-medium); background: var(--bg-hover); }
.cp-trigger--open  { border-color: var(--accent); }
.cp-caret          { color: var(--tx-muted); transition: transform .15s; flex-shrink: 0; margin-left: auto; }

.cp-swatch {
  width: 20px; height: 20px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
}
.cp-label {
  font-family: 'DM Mono', monospace; font-size: 13px;
  color: var(--tx-secondary);
  text-transform: uppercase; letter-spacing: .03em;
}

/* ── Dropdown panel ── */
.cp-panel {
  position: absolute; top: calc(100% + 6px); left: 0;
  z-index: 60; width: 320px; max-width: calc(100vw - 32px);
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px; padding: 14px;
  display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25);
}
.cp-section { display: flex; flex-direction: column; gap: 8px; }
.cp-section-label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
}
.cp-swatch-grid {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
}
.cp-swatch--pick {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid transparent; padding: 0; cursor: pointer;
  transition: transform .12s, border-color .12s, box-shadow .12s;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.15);
}
.cp-swatch--pick:hover { transform: scale(1.1); }
.cp-swatch--selected {
  border-color: var(--tx-primary);
  box-shadow: inset 0 0 0 2px var(--bg-modal), 0 2px 8px rgba(0,0,0,0.25);
}

.cp-fav { position: relative; display: flex; align-items: center; justify-content: center; }
.cp-fav-remove {
  position: absolute; top: -5px; right: -5px;
  width: 17px; height: 17px; border-radius: 50%;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-medium);
  color: var(--tx-muted);
  font-size: 9px; line-height: 1; cursor: pointer;
  display: none; align-items: center; justify-content: center;
  padding: 0;
}
.cp-fav:hover .cp-fav-remove { display: flex; }
.cp-fav-remove:hover { color: var(--accent); border-color: var(--accent); }

/* ── Custom row ── */
.cp-custom-row { display: flex; align-items: center; gap: 8px; }
.cp-native-wrap {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid var(--bdr-medium);
  cursor: pointer; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cp-native {
  width: 200%; height: 200%; border: none; padding: 0;
  cursor: pointer; background: none;
}
.cp-hex-input {
  flex: 1; min-width: 0;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-faint);
  border-radius: 6px; padding: 7px 10px;
  color: var(--tx-primary);
  font-family: 'DM Mono', monospace; font-size: 13px;
  outline: none; transition: border-color .15s;
  text-transform: uppercase;
}
.cp-hex-input:focus { border-color: var(--accent); }

.cp-btn {
  border-radius: 6px; padding: 7px 12px;
  font-family: 'Satoshi', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background .12s, color .12s, border-color .12s, opacity .12s;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cp-btn:disabled { opacity: .45; cursor: not-allowed; }
.cp-btn--primary {
  background: var(--accent); color: #fff; border: 1px solid var(--accent);
}
.cp-btn--primary:not(:disabled):hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.cp-btn--ghost {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  width: 32px; height: 32px; padding: 0;
}
.cp-btn--ghost:not(:disabled):hover { color: var(--accent); border-color: var(--accent); }

.cp-footer { display: flex; justify-content: flex-end; }
.cp-clear {
  width: auto; padding: 6px 12px;
  font-size: 12px; text-transform: uppercase; letter-spacing: .05em;
}

/* ── Transitions ── */
.cp-pop-enter-active, .cp-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease; transform-origin: top left;
}
.cp-pop-enter-from, .cp-pop-leave-to {
  opacity: 0; transform: scale(.96) translateY(-4px);
}
</style>
