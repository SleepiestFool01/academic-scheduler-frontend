import apiClient from "./services.js";

const BASE = "/user-department-preferences";

// Returns { id_employee, id_department, preferences }.
// `preferences` is an object (already parsed server-side). If no row exists
// for this user+dept yet, the server returns an empty object — callers
// should overlay defaults.
export function getMyPreferences(id_department) {
  return apiClient.get(BASE, { params: { id_department } });
}

// Upserts the full preferences blob for the current user + dept.
export function saveMyPreferences(id_department, preferences) {
  return apiClient.put(BASE, { id_department, preferences });
}

export default { getMyPreferences, saveMyPreferences };
