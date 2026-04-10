import apiClient from "./services.js";

// ── Department ─────────────────────────────────────────────────────────────────
export const getAllDepartments   = ()          => apiClient.get(`/departments`);
export const getDepartment      = (id)        => apiClient.get(`/departments/${id}`);
export const createDepartment   = (data)      => apiClient.post(`/departments`, data);
export const updateDepartment   = (id, data)  => apiClient.put(`/departments/${id}`, data);

// ── Positions ──────────────────────────────────────────────────────────────────
export const getPositions       = (id_department) => apiClient.get(`/position?id_department=${id_department}`);
export const createPosition     = (data)          => apiClient.post(`/position`, data);
export const updatePosition     = (id, data)      => apiClient.put(`/position/${id}`, data);
export const deletePosition     = (id)            => apiClient.delete(`/position/${id}`);

// ── Employees (all) ────────────────────────────────────────────────────────────
export const getEmployees       = (id_department = null) => apiClient.get(`/employees${id_department ? `?id_department=${id_department}` : ''}`);

// ── Calendar entries (hours of operation) ─────────────────────────────────────
export const getCalendarEntries    = (id_department) => apiClient.get(`/calendar?id_department=${id_department}`);
export const createCalendarEntry   = (data)          => apiClient.post(`/calendar`, data);
export const updateCalendarEntry   = (id, data)      => apiClient.put(`/calendar/${id}`, data);
export const deleteCalendarEntry   = (id)            => apiClient.delete(`/calendar/${id}`);

// ── Events ────────────────────────────────────────────────────────────────────
export const getEvents       = (id_department) => apiClient.get(`/events?id_department=${id_department}`);
export const createEvent     = (data)          => apiClient.post(`/events`, data);
export const updateEvent     = (id, data)      => apiClient.put(`/events/${id}`, data);
export const deleteEvent     = (id)            => apiClient.delete(`/events/${id}`);

// ── Settings / Setting Values ─────────────────────────────────────────────────
export const getSettings          = ()              => apiClient.get(`/settings`);
export const createSetting        = (data)          => apiClient.post(`/settings`, data);
export const getSettingValues     = (id_department) => apiClient.get(`/setting-values?id_department=${id_department}`);
export const createSettingValue   = (data)          => apiClient.post(`/setting-values`, data);
export const updateSettingValue   = (id, value)     => apiClient.put(`/setting-values/${id}`, { value });

// ── Manager ↔ Department (multi-dept junction) ────────────────────────────────
export const getManagerDepartments  = (id_employee)            => apiClient.get(`/manager-departments?id_employee=${id_employee}`);
export const getDeptManagers        = (id_department)          => apiClient.get(`/manager-departments?id_department=${id_department}`);
export const createManagerDepartment = (data)                  => apiClient.post(`/manager-departments`, data);
export const deleteManagerDepartment = (id_managerDepartment)  => apiClient.delete(`/manager-departments/${id_managerDepartment}`);

// ── Employee ↔ Department (multi-dept junction for non-manager staff) ────────
export const getEmployeeDepartments  = (id_employee)            => apiClient.get(`/employee-departments?id_employee=${id_employee}`);
export const createEmployeeDepartment = (data)                  => apiClient.post(`/employee-departments`, data);
export const deleteEmployeeDepartment = (id_employeeDepartment) => apiClient.delete(`/employee-departments/${id_employeeDepartment}`);

// ── Position ↔ Employee assignments ──────────────────────────────────────────
export const getPositionEmployees   = (id_position) => apiClient.get(`/position-employees/position/${id_position}`);
export const getEmployeePositions   = (id_employee) => apiClient.get(`/position-employees/employee/${id_employee}`);
export const assignPositionEmployee = (data)        => apiClient.post(`/position-employees`, data);
export const removePositionEmployee = (id_employee, id_position) => apiClient.delete(`/position-employees/${id_employee}/${id_position}`);

// ── Department Access Requests ────────────────────────────────────────────────
export const createDepartmentAccessRequest  = (data)     => apiClient.post(`/department-access-requests`, data);
export const getDepartmentAccessRequests    = (params)   => {
    const qs = new URLSearchParams(params || {}).toString();
    return apiClient.get(`/department-access-requests${qs ? "?" + qs : ""}`);
};
export const updateDepartmentAccessRequest  = (id, data) => apiClient.put(`/department-access-requests/${id}`, data);
export const deleteDepartmentAccessRequest  = (id)       => apiClient.delete(`/department-access-requests/${id}`);
