/**
 * src/services/taskService.js
 *
 * API calls for the Tasks module:
 *   - Task lists and tasks (CRUD helpers used by Dashboard)
 *   - Shift ↔ Task List assignments (ShiftTaskList bridge table)
 *   - Per-task completion status (ShiftTaskListStatus bridge table)
 */

import apiClient from "./services.js";

// ── Task Lists & Tasks ──────────────────────────────────────────────────────────

export async function fetchTaskLists(id_department = null) {
  const qs = id_department ? `?id_department=${id_department}` : "";
  const { data } = await apiClient.get(`/task-lists${qs}`);
  return data;
}

export async function fetchTasks(id_department = null) {
  const qs = id_department ? `?id_department=${id_department}` : "";
  const { data } = await apiClient.get(`/tasks${qs}`);
  return data;
}

// ── Shift ↔ Task List assignments ──────────────────────────────────────────────

/**
 * Fetch all task list assignments for a given shift.
 * Returns: [{ id_shiftTaskList, id_shift, id_taskList, ... }]
 */
export async function getShiftTaskLists(id_shift) {
  const { data } = await apiClient.get(`/shift-task-lists?id_shift=${id_shift}`);
  return data;
}

/**
 * Assign a task list to a shift.
 * The backend should auto-create ShiftTaskListStatus rows for each task in the list.
 * Returns the new ShiftTaskList record.
 */
export async function assignTaskListToShift(id_shift, id_taskList) {
  const { data } = await apiClient.post("/shift-task-lists", { id_shift, id_taskList });
  return data;
}

/**
 * Remove a task list from a shift (deletes ShiftTaskList row + its status rows).
 */
export async function removeShiftTaskList(id_shiftTaskList) {
  await apiClient.delete(`/shift-task-lists/${id_shiftTaskList}`);
}

// ── Task completion status ──────────────────────────────────────────────────────

/**
 * Fetch all task status records for a ShiftTaskList.
 * Returns: [{ id_shiftTaskListStatus, id_shiftTaskList, id_task, isCompleted }]
 */
export async function getTaskListStatuses(id_shiftTaskList) {
  const { data } = await apiClient.get(
    `/shift-task-list-status?id_shiftTaskList=${id_shiftTaskList}`
  );
  return data;
}

// ── Position ↔ TaskList links ───────────────────────────────────────────────────

/**
 * Get all PositionTaskList entries for a given task list.
 * Returns: [{ id_positionTaskList, id_position, id_taskList }]
 */
export async function getTaskListPositions(id_taskList) {
  const { data } = await apiClient.get(`/position-task-lists?id_taskList=${id_taskList}`);
  return data;
}

/**
 * Get all PositionTaskList entries for a given position.
 * Used to auto-attach position-linked task lists when a position is chosen
 * on shift creation.
 * Returns: [{ id_positionTaskList, id_position, id_taskList }]
 */
export async function getPositionTaskLists(id_position) {
  const { data } = await apiClient.get(`/position-task-lists?id_position=${id_position}`);
  return data;
}

/**
 * Link a task list to a position.
 */
export async function addPositionTaskList(id_position, id_taskList) {
  const { data } = await apiClient.post("/position-task-lists", { id_position, id_taskList });
  return data;
}

/**
 * Unlink a task list from a position.
 */
export async function removePositionTaskList(id_positionTaskList) {
  await apiClient.delete(`/position-task-lists/${id_positionTaskList}`);
}

/**
 * Toggle a single task's completion status.
 */
export async function updateTaskComplete(id_shiftTaskListStatus, isCompleted) {
  const { data } = await apiClient.put(
    `/shift-task-list-status/${id_shiftTaskListStatus}`,
    { isCompleted }
  );
  return data;
}

// ── Individual tasks attached to a shift (ShiftTask bridge) ─────────────────

export async function getShiftTasks(id_shift) {
  const { data } = await apiClient.get(`/shift-tasks?id_shift=${id_shift}`);
  return data; // [{ id_shiftTask, id_shift, id_task, isCompleted }]
}
export async function attachTaskToShift(id_shift, id_task) {
  const { data } = await apiClient.post("/shift-tasks", { id_shift, id_task });
  return data;
}
export async function removeShiftTask(id_shiftTask) {
  await apiClient.delete(`/shift-tasks/${id_shiftTask}`);
}
export async function updateShiftTaskComplete(id_shiftTask, isCompleted) {
  const { data } = await apiClient.put(`/shift-tasks/${id_shiftTask}`, { isCompleted });
  return data;
}

// ── Individual tasks attached to a template shift (TemplateShiftTask) ───────

export async function getTemplateShiftTasks(id_templateShift) {
  const { data } = await apiClient.get(`/template-shift-tasks?id_templateShift=${id_templateShift}`);
  return data; // [{ id_templateShiftTask, id_templateShift, id_task }]
}
export async function attachTaskToTemplateShift(id_templateShift, id_task) {
  const { data } = await apiClient.post("/template-shift-tasks", { id_templateShift, id_task });
  return data;
}
export async function removeTemplateShiftTask(id_templateShiftTask) {
  await apiClient.delete(`/template-shift-tasks/${id_templateShiftTask}`);
}
