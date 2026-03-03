import { ref } from 'vue';

const STORAGE_KEY = 'scheduler-theme';

// Singleton state shared across all component instances
const isDark = ref(localStorage.getItem(STORAGE_KEY) !== 'light');

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
}

// Apply immediately on first import (before any component mounts)
applyTheme(isDark.value);

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
  }

  return { isDark, toggleTheme };
}
