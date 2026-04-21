import apiClient from "./services.js";

export const getMyTimeStatus = (id_department) =>
  apiClient.get(`/time-entries/my-status${id_department ? `?id_department=${id_department}` : ""}`);

export const clockInToShift = (id_shiftAssignment) =>
  apiClient.post("/time-entries/clock-in", { id_shiftAssignment });

export const clockOutOfShift = (id_timeEntry) =>
  apiClient.post(`/time-entries/${id_timeEntry}/clock-out`);

export const getHoursReport = ({ id_department, startDate, endDate }) => {
  const params = new URLSearchParams();
  if (id_department) params.set("id_department", id_department);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();
  return apiClient.get(`/time-entries/report${qs ? `?${qs}` : ""}`);
};
