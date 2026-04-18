import apiClient from "./services.js";
import {
  getDepartmentAccessRequests,
  updateDepartmentAccessRequest,
} from "./departmentService.js";

export const getPendingTimeOff    = ()           => apiClient.get("/personal-availability");
export const getPendingSwaps      = ()           => apiClient.get("/swap-requests");
export const getPendingDeptAccess = ()           => getDepartmentAccessRequests({});

export const updateSwapRequest    = (id, status) => apiClient.put(`/swap-requests/${id}`, { status });
export const updateDeptAccess     = (id, status) => updateDepartmentAccessRequest(id, { status });

// Time-off uses the employee-scoped path: /personal-availability/employees/:id_employee/:id_personalAvailability
// Backend now persists status (Pending / Approved / Denied) so the bell can
// actually resolve the request instead of merely dismissing it client-side.
export const updateTimeOffRequest = (item, status) =>
    apiClient.put(`/personal-availability/employees/${item.id_employee}/${item.id_personalAvailability}`, { status });
