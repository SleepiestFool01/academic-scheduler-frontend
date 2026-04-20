import { computed } from "vue";
import { useDisplay } from "vuetify";

// Single source of truth for responsive layout decisions. Wraps Vuetify's
// useDisplay so individual components don't ad-hoc check window.innerWidth.
//
// Thresholds match Vuetify defaults: phone < 600, tablet 600-959, desktop >= 960.
// `isTouch` is the common phone-or-tablet check (mouseless input assumed).
export function useBreakpoint() {
    const display = useDisplay();
    const isPhone   = computed(() => display.xs.value);
    const isTablet  = computed(() => display.sm.value);
    const isDesktop = computed(() => display.mdAndUp.value);
    const isTouch   = computed(() => display.smAndDown.value);
    return { isPhone, isTablet, isDesktop, isTouch };
}
