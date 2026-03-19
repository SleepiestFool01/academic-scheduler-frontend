import apiClient from "./services.js";

// ── Templates ─────────────────────────────────────────────────────────────────
export async function fetchTemplates() {
  const res = await apiClient.get("/templates");
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
