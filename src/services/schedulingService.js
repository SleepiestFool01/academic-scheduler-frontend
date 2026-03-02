/**
 * src/services/schedulingService.js
 *
 * All API calls needed by Dashboard.vue, built on top of the existing
 * apiClient from services.js.  That client already handles:
 *   - Base URL  (http://localhost/workerscheduling-t9 in dev)
 *   - Authorization header  (reads token from Utils.getStore("user"))
 *   - 401 / expired-session auto-logout
 *
 * Route prefixes match whatever your Express app.js mounts them under.
 * If your server mounts employee routes at /users, keep "/users/employees".
 * Adjust the prefix constants at the top if your mount paths differ.
 */

import apiClient from "./services.js";

// ── Route prefix constants — matched to app/routes/index.js ──────────────────
const EMPLOYEES    = "/employees";         // router.use("/employees", EmployeeRoutes)
const SHIFTS       = "/shifts";            // router.use("/shifts", ShiftRoutes)
const ASSIGNMENTS  = "/shift-assignments"; // router.use("/shift-assignments", ShiftAssignmentRoutes)
const SWAP_REQS    = "/swap-requests";     // router.use("/swap-requests", SwapRequestRoutes)

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a fractional hour (9.5) → MySQL TIME string ("09:30:00")
 */
function hourToTimeStr(h) {
  const totalMin = Math.round(h * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

/**
 * Convert a MySQL TIME string ("09:30:00" or "09:30") → fractional hour (9.5)
 */
function timeStrToHour(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

/**
 * Format a fractional hour → display label ("9:30am")
 */
function fmtHour(h) {
  const total  = Math.round(h * 60);
  const hr     = Math.floor(total / 60);
  const min    = total % 60;
  const suffix = hr >= 12 ? "pm" : "am";
  const disp   = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0
    ? `${disp}${suffix}`
    : `${disp}:${String(min).padStart(2, "0")}${suffix}`;
}

/**
 * Day-of-week integer → Shift.day ENUM value
 * Matches your model: "Sun"|"Mon"|"Tue"|"Wed"|"Thur"|"Fri"|"Sat"
 */
const DAY_ENUM = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

// ── Employee API ───────────────────────────────────────────────────────────────

/**
 * Fetch all users with role = "Employee".
 * Hits: GET /users/employees
 * Returns: [{ id_employee, fName, lName, email, role, bio }]
 */
export async function fetchEmployees() {
  const { data } = await apiClient.get(`${EMPLOYEES}/employees`);
  return data;
}

// ── Shift API ──────────────────────────────────────────────────────────────────

/**
 * Fetch all shifts and all shift assignments, then JOIN them client-side
 * into the flat shape Dashboard.vue uses for rendering calendar blocks.
 *
 * Returned shape per block:
 * {
 *   id,                  — id_shiftAssignment  (unique key per calendar block)
 *   id_shift,            — for update / delete of the Shift row
 *   id_shiftAssignment,  — for delete of the ShiftAssignment row
 *   id_employee,
 *   employee,            — "fName lName"
 *   date,                — "YYYY-MM-DD"
 *   dayIndex,            — 0–6 (day of week, derived from date)
 *   startHour,           — fractional hour e.g. 9.5
 *   endHour,
 *   startLabel,          — "9:30am"
 *   endLabel,
 *   notes,               — shift.description
 * }
 *
 * @param {Object} employeeMap  { [id_employee]: employeeObject }
 */
export async function fetchShiftsWithAssignments(employeeMap) {
  const [shiftsRes, assignRes] = await Promise.all([
    apiClient.get(SHIFTS),
    apiClient.get(ASSIGNMENTS),
  ]);

  const shiftDefs   = shiftsRes.data;   // [{ id_shift, name, description, day, date, startTime, endTime }]
  const assignments = assignRes.data;   // [{ id_shiftAssignment, id_shift, id_employee, date }]

  // Fast lookup for shift definitions
  const shiftById = {};
  for (const s of shiftDefs) shiftById[s.id_shift] = s;

  const result = [];

  for (const a of assignments) {
    const s   = shiftById[a.id_shift];
    const emp = employeeMap[a.id_employee];
    if (!s || !emp) continue;   // orphaned rows — skip gracefully

    const startHour = timeStrToHour(s.startTime);
    const endHour   = timeStrToHour(s.endTime);

    // Derive dayIndex from the assignment's concrete date (not the shift template day)
    const [y, mo, d] = a.date.split("-").map(Number);
    const dayIndex   = new Date(y, mo - 1, d).getDay();

    result.push({
      id:                 a.id_shiftAssignment,
      id_shift:           s.id_shift,
      id_shiftAssignment: a.id_shiftAssignment,
      id_employee:        a.id_employee,
      employee:           `${emp.fName} ${emp.lName}`,
      date:               a.date,
      dayIndex,
      startHour,
      endHour,
      startLabel:         fmtHour(startHour),
      endLabel:           fmtHour(endHour),
      notes:              s.description || "",
    });
  }

  return result;
}

/**
 * Create a new shift + immediately assign it to an employee.
 *
 * Steps:
 *  1. POST /shifts        — create the Shift definition
 *  2. POST /shiftAssignments — assign the employee to it with the specific date
 *
 * Returns the fully normalized calendar block ready to push into shifts.value.
 *
 * @param {Object} params
 * @param {number} params.id_employee
 * @param {string} params.date          "YYYY-MM-DD"
 * @param {number} params.startHour     fractional hour
 * @param {number} params.endHour       fractional hour
 * @param {string} params.notes         optional description
 * @param {string} params.employeeName  used as the shift name label
 */
export async function createShift({
  id_employee,
  date,
  startHour,
  endHour,
  notes,
  employeeName,
}) {
  const [y, mo, d] = date.split("-").map(Number);
  const dowInt     = new Date(y, mo - 1, d).getDay();

  // 1. Create Shift row
  const shiftPayload = {
    name:        `${employeeName} – ${fmtHour(startHour)}`,
    description: notes || "",
    day:         DAY_ENUM[dowInt],
    date,
    startTime:   hourToTimeStr(startHour),
    endTime:     hourToTimeStr(endHour),
  };
  const { data: newShift } = await apiClient.post(SHIFTS, shiftPayload);

  // 2. Create ShiftAssignment row
  const assignPayload = {
    id_employee,
    id_shift: newShift.id_shift,
    date,
  };
  const { data: newAssignment } = await apiClient.post(ASSIGNMENTS, assignPayload);

  // 3. Return normalized block
  return {
    id:                 newAssignment.id_shiftAssignment,
    id_shift:           newShift.id_shift,
    id_shiftAssignment: newAssignment.id_shiftAssignment,
    id_employee,
    employee:           employeeName,
    date,
    dayIndex:           dowInt,
    startHour,
    endHour,
    startLabel:         fmtHour(startHour),
    endLabel:           fmtHour(endHour),
    notes:              notes || "",
  };
}

/**
 * Update an existing shift's time window and/or description.
 * Only the Shift row is updated — the assignment (employee + date) stays.
 *
 * @param {number} id_shift
 * @param {Object} fields  { startHour, endHour, notes }
 */
export async function updateShift(id_shift, { startHour, endHour, notes }) {
  await apiClient.put(`${SHIFTS}/${id_shift}`, {
    startTime:   hourToTimeStr(startHour),
    endTime:     hourToTimeStr(endHour),
    description: notes || "",
  });
}

/**
 * Delete a shift from the calendar.
 * Deletes the ShiftAssignment first (FK constraint), then the Shift definition.
 *
 * @param {number} id_shiftAssignment
 * @param {number} id_shift
 */
export async function deleteShift(id_shiftAssignment, id_shift) {
  await apiClient.delete(`${ASSIGNMENTS}/${id_shiftAssignment}`);
  await apiClient.delete(`${SHIFTS}/${id_shift}`);
}

// ── Swap requests ──────────────────────────────────────────────────────────────

/**
 * Fetch all swap requests with status = "Pending", normalized for the sidebar.
 *
 * Returns: [{ id, name, type, raw }]
 *
 * @param {Object} employeeMap  { [id_employee]: employeeObject }
 */
export async function fetchSwapRequests(employeeMap) {
  const { data } = await apiClient.get(SWAP_REQS);
  return data
    .filter((r) => r.status === "Pending")
    .map((r) => {
      const emp = employeeMap[r.id_employeeRequester];
      return {
        id:   r.id_swapRequest,
        name: emp ? `${emp.fName} ${emp.lName}` : `Employee #${r.id_employeeRequester}`,
        type: "Shift Swap",
        raw:  r,
      };
    });
}