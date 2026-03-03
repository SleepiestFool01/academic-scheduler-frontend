/**
 * src/services/employeeManagementService.js
 *
 * API calls for the Employee Management page.
 * Uses the existing apiClient from services.js (handles auth token automatically).
 */
import apiClient from "./services.js";

// ── Employees ──────────────────────────────────────────────────────────────────

export const employeeService = {
  /** GET /employees — all users regardless of role */
  getAll() {
    return apiClient.get("/employees");
  },

  /** POST /employees/create-employee — create a new employee record */
  create(payload) {
    // payload: { fName, lName, email, role?, bio? }
    return apiClient.post("/employees/create-employee", payload);
  },

  /** PUT /employees/:id — update employee fields */
  update(id_employee, payload) {
    return apiClient.put(`/employees/${id_employee}`, payload);
  },

  /** PUT /employees/role/:id — update role only */
  updateRole(id_employee, role) {
    return apiClient.put(`/employees/role/${id_employee}`, { role });
  },

  /** DELETE /employees/:id */
  remove(id_employee) {
    return apiClient.delete(`/employees/${id_employee}`);
  },
};

// ── Shifts ─────────────────────────────────────────────────────────────────────

// Helpers
export function hourToTimeStr(h) {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}
export function timeStrToHour(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
export function fmtHour(h) {
  const total = Math.round(h * 60);
  const hr = Math.floor(total / 60);
  const min = total % 60;
  const suffix = hr >= 12 ? "pm" : "am";
  const disp = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0 ? `${disp}${suffix}` : `${disp}:${String(min).padStart(2, "0")}${suffix}`;
}
const DAY_ENUM = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

export const shiftService = {
  /** GET /shifts */
  getAll() {
    return apiClient.get("/shifts");
  },

  /** GET /shift-assignments */
  getAssignments() {
    return apiClient.get("/shift-assignments");
  },

  /**
   * Create a shift definition + assignment atomically.
   * @param {{ id_employee, date, startHour, endHour, notes, employeeName }} p
   */
  async createAndAssign({ id_employee, date, startHour, endHour, notes, employeeName }) {
    const [y, mo, d] = date.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();

    const { data: shift } = await apiClient.post("/shifts", {
      name:        `${employeeName} – ${fmtHour(startHour)}`,
      description: notes || "",
      day:         DAY_ENUM[dow],
      date,
      startTime:   hourToTimeStr(startHour),
      endTime:     hourToTimeStr(endHour),
    });

    const { data: assignment } = await apiClient.post("/shift-assignments", {
      id_employee,
      id_shift: shift.id_shift,
      date,
    });

    return { shift, assignment };
  },

  /** PUT /shifts/:id */
  update(id_shift, { startHour, endHour, notes }) {
    return apiClient.put(`/shifts/${id_shift}`, {
      startTime:   hourToTimeStr(startHour),
      endTime:     hourToTimeStr(endHour),
      description: notes || "",
    });
  },

  /** DELETE assignment then shift */
  async remove(id_shiftAssignment, id_shift) {
    await apiClient.delete(`/shift-assignments/${id_shiftAssignment}`);
    await apiClient.delete(`/shifts/${id_shift}`);
  },
};