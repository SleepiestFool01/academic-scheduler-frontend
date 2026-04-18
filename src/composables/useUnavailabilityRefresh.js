import { ref } from "vue";

// Module-scoped signal that bumps every time an import/sync completes.
// Views that display EmployeeUnavailability rows (Dashboard, TemplateEditor,
// Availability, AvailabilityViewerModal) watch this and re-fetch, so
// manual syncs, bulk syncs, and silent auto-sync on login all surface
// immediately without a browser refresh.
const lastSyncTimestamp = ref(0);

export function bumpUnavailabilityRefresh() {
    lastSyncTimestamp.value = Date.now();
}

export function useUnavailabilityRefresh() {
    return { lastSyncTimestamp };
}
