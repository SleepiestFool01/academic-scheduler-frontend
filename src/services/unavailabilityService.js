import apiClient from "./services.js";

// Fetch rows for one employee OR for all employees in a department. Both
// params are optional; calling with neither returns every row the caller
// can see (rarely useful — most callers pass one or the other).
export const getUnavailability = (params = {}) => {
    const qs = new URLSearchParams();
    if (params.id_employee)   qs.set("id_employee",   params.id_employee);
    if (params.id_department) qs.set("id_department", params.id_department);
    if (params.id_semester)   qs.set("id_semester",   params.id_semester);
    const tail = qs.toString();
    return apiClient.get(`/employee-unavailability${tail ? "?" + tail : ""}`);
};

export const createUnavailability = (data) => apiClient.post(`/employee-unavailability`, data);
export const updateUnavailability = (id, data) => apiClient.put(`/employee-unavailability/${id}`, data);
export const deleteUnavailability = (id) => apiClient.delete(`/employee-unavailability/${id}`);

// Backend proxies to stingray; frontend never hits stingray directly. The
// `semester` field is optional — if omitted, the backend derives it from
// the employee's dept active-season setting, falling back to a date-based
// guess. Pass the readable name ("Fall 2026"); backend maps to id_semester.
export const importUnavailabilityForEmployee = (id_employee, semester) =>
    apiClient.post(`/employee-unavailability/import`, { id_employee, semester });
export const importUnavailabilityForDepartment = (id_department, semester) =>
    apiClient.post(`/employee-unavailability/import-bulk`, { id_department, semester });
