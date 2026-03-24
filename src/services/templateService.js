import apiClient from "./services.js";

// ── Templates ─────────────────────────────────────────────────────────────────
export async function fetchTemplates(id_department = null) {
  const qs = id_department ? `?id_department=${id_department}` : "";
  const res = await apiClient.get(`/templates${qs}`);
  return res.data;
}

export async function getTemplate(id) {
  const res = await apiClient.get(`/templates/${id}`);
  return res.data;
}

export async function createTemplate(payload) {
  const res = await apiClient.post("/templates", payload);
  return res.data;
}

export async function updateTemplate(id, payload) {
  const res = await apiClient.put(`/templates/${id}`, payload);
  return res.data;
}

export async function deleteTemplate(id) {
  await apiClient.delete(`/templates/${id}`);
}

// ── Template Shifts ───────────────────────────────────────────────────────────
export async function fetchTemplateShifts(id_template) {
  const res = await apiClient.get(`/template-shifts?id_template=${id_template}`);
  return res.data;
}

export async function createTemplateShift(payload) {
  const res = await apiClient.post("/template-shifts", payload);
  return res.data;
}

export async function updateTemplateShift(id, payload) {
  const res = await apiClient.put(`/template-shifts/${id}`, payload);
  return res.data;
}

export async function deleteTemplateShift(id) {
  await apiClient.delete(`/template-shifts/${id}`);
}

// ── Template Shift Employees ──────────────────────────────────────────────────
export async function fetchTemplateShiftEmployees(id_templateShift) {
  const res = await apiClient.get(`/template-shift-employees?id_templateShift=${id_templateShift}`);
  return res.data;
}
export async function addTemplateShiftEmployee(payload) {
  const res = await apiClient.post(`/template-shift-employees`, payload);
  return res.data;
}
export async function removeTemplateShiftEmployee(id) {
  await apiClient.delete(`/template-shift-employees/${id}`);
}

// ── Template Shift Task Lists ─────────────────────────────────────────────────
export async function fetchTemplateShiftTaskLists(id_templateShift) {
  const res = await apiClient.get(`/template-shift-task-lists?id_templateShift=${id_templateShift}`);
  return res.data;
}
export async function addTemplateShiftTaskList(payload) {
  const res = await apiClient.post(`/template-shift-task-lists`, payload);
  return res.data;
}
export async function removeTemplateShiftTaskList(id) {
  await apiClient.delete(`/template-shift-task-lists/${id}`);
}

// ── Template Applications (tracks which shifts were created from a template) ──
export async function createTemplateApplication(payload) {
  const res = await apiClient.post(`/template-applications`, payload);
  return res.data;
}
export async function getTemplateApplicationShifts(id_templateShift) {
  const res = await apiClient.get(`/template-application-shifts?id_templateShift=${id_templateShift}`);
  return res.data;
}
export async function createTemplateApplicationShift(payload) {
  const res = await apiClient.post(`/template-application-shifts`, payload);
  return res.data;
}
