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
