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

export async function fetchTaskLists() {
  const { data } = await apiClient.get("/task-lists");
  return data;
}

export async function fetchTasks() {
  const { data } = await apiClient.get("/tasks");
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
