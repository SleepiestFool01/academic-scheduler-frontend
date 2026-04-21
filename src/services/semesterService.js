import apiClient from "./services.js";

// Per-department academic semester bounds. The "active" semester is
// whichever row's [startDate, endDate] range contains today; that
// semester's `name` is what EmployeeUnavailability.season is matched
// against for conflict detection.

export const getSemesters = (id_department) =>
    apiClient.get(`/semesters${id_department ? `?id_department=${id_department}` : ""}`);

export const getActiveSemester = (id_department) =>
    apiClient.get(`/semesters/active?id_department=${id_department}`);

export const createSemester = (data) => apiClient.post(`/semesters`, data);
export const updateSemester = (id, data) => apiClient.put(`/semesters/${id}`, data);
export const deleteSemester = (id) => apiClient.delete(`/semesters/${id}`);

// Compute today's active semester client-side from a pre-loaded list,
// using the same rule the backend uses. Returns the row or null.
export function pickActiveSemester(semesters) {
    if (!Array.isArray(semesters) || !semesters.length) return null;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return semesters.find(s => s.startDate <= today && today <= s.endDate) || null;
}
