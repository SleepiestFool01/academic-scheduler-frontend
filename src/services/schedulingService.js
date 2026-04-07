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
export function fmtHour(h) {
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
export async function fetchEmployees(id_department = null) {
  const qs = id_department ? `?id_department=${id_department}` : "";
  const { data } = await apiClient.get(`${EMPLOYEES}/employees${qs}`);
  return data;
}

// ── Shift API ──────────────────────────────────────────────────────────────────

/**
 * Fetch all shifts and all shift assignments, then JOIN them client-side
 * into the flat shape Dashboard.vue uses for rendering calendar blocks.
 *
 * Unassigned shifts (no ShiftAssignment row) are also included, using
 * the shift's own date field, with employee = "" and id_employee = null.
 *
 * @param {Object} employeeMap   { [id_employee]: employeeObject }
 * @param {Object} positionMap   { [id_position]: positionObject }  (optional)
 */
export async function fetchShiftsWithAssignments(employeeMap, positionMap = {}, id_department = null) {
  const qs = id_department ? `?id_department=${id_department}` : "";
  const [shiftsRes, assignRes] = await Promise.all([
    apiClient.get(`${SHIFTS}${qs}`),
    apiClient.get(ASSIGNMENTS),
  ]);

  const shiftDefs   = shiftsRes.data;   // [{ id_shift, name, description, day, date, startTime, endTime, id_position }]
  const assignments = assignRes.data;   // [{ id_shiftAssignment, id_shift, id_employee, date }]

  // Fast lookup for shift definitions
  const shiftById = {};
  for (const s of shiftDefs) shiftById[s.id_shift] = s;

  const result = [];
  const assignedShiftIds = new Set();

  for (const a of assignments) {
    const s   = shiftById[a.id_shift];
    const emp = employeeMap[a.id_employee];
    if (!s || !emp) continue;   // orphaned rows — skip gracefully

    assignedShiftIds.add(s.id_shift);

    const startHour    = timeStrToHour(s.startTime);
    const endHour      = timeStrToHour(s.endTime);
    const [y, mo, d]   = a.date.split("-").map(Number);
    const dayIndex     = new Date(y, mo - 1, d).getDay();
    const positionName = positionMap[s.id_position]?.name || "";

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
      id_position:        s.id_position || null,
      positionName,
    });
  }

  // Include unassigned shifts (no ShiftAssignment row)
  for (const s of shiftDefs) {
    if (assignedShiftIds.has(s.id_shift) || !s.date) continue;

    const startHour    = timeStrToHour(s.startTime);
    const endHour      = timeStrToHour(s.endTime);
    const [y, mo, d]   = s.date.split("-").map(Number);
    const dayIndex     = new Date(y, mo - 1, d).getDay();
    const positionName = positionMap[s.id_position]?.name || "";

    result.push({
      id:                 `shift-${s.id_shift}`,
      id_shift:           s.id_shift,
      id_shiftAssignment: null,
      id_employee:        null,
      employee:           "",
      date:               s.date,
      dayIndex,
      startHour,
      endHour,
      startLabel:         fmtHour(startHour),
      endLabel:           fmtHour(endHour),
      notes:              s.description || "",
      id_position:        s.id_position || null,
      positionName,
    });
  }

  return result;
}

/**
 * Create a new shift, optionally assigning it to an employee.
 * If id_employee is omitted the shift is saved unassigned.
 *
 * @param {Object} params
 * @param {number|null} params.id_employee   null = unassigned
 * @param {string}      params.date          "YYYY-MM-DD"
 * @param {number}      params.startHour     fractional hour
 * @param {number}      params.endHour       fractional hour
 * @param {string}      params.notes         optional description
 * @param {string}      params.positionName  used in the shift name label
 * @param {number|null} params.id_position
 */
export async function createShift({
  id_employee = null,
  date,
  startHour,
  endHour,
  notes,
  positionName = "",
  id_position = null,
  id_department = null,
}) {
  const [y, mo, d] = date.split("-").map(Number);
  const dowInt     = new Date(y, mo - 1, d).getDay();

  const label = positionName || "Shift";

  // 1. Create Shift row
  const { data: newShift } = await apiClient.post(SHIFTS, {
    name:        `${label} – ${fmtHour(startHour)}`,
    description: notes || "",
    day:         DAY_ENUM[dowInt],
    date,
    startTime:   hourToTimeStr(startHour),
    endTime:     hourToTimeStr(endHour),
    id_position,
    id_department,
  });

  // 2. Optionally create ShiftAssignment
  if (id_employee) {
    const { data: newAssignment } = await apiClient.post(ASSIGNMENTS, {
      id_employee,
      id_shift: newShift.id_shift,
      date,
    });
    return {
      id:                 newAssignment.id_shiftAssignment,
      id_shift:           newShift.id_shift,
      id_shiftAssignment: newAssignment.id_shiftAssignment,
      id_employee,
      employee:           "",   // caller supplies display name
      date,
      dayIndex:           dowInt,
      startHour,
      endHour,
      startLabel:         fmtHour(startHour),
      endLabel:           fmtHour(endHour),
      notes:              notes || "",
      id_position,
      positionName,
    };
  }

  // Unassigned
  return {
    id:                 `shift-${newShift.id_shift}`,
    id_shift:           newShift.id_shift,
    id_shiftAssignment: null,
    id_employee:        null,
    employee:           "",
    date,
    dayIndex:           dowInt,
    startHour,
    endHour,
    startLabel:         fmtHour(startHour),
    endLabel:           fmtHour(endHour),
    notes:              notes || "",
    id_position,
    positionName,
  };
}

/**
 * Create a ShiftAssignment (assign an employee to an existing shift).
 */
export async function createAssignment(id_shift, id_employee, date) {
  const { data } = await apiClient.post(ASSIGNMENTS, { id_shift, id_employee, date });
  return data;
}

/**
 * Delete a ShiftAssignment without deleting the Shift itself.
 */
export async function deleteAssignment(id_shiftAssignment) {
  await apiClient.delete(`${ASSIGNMENTS}/${id_shiftAssignment}`);
}

/**
 * Update an existing shift's time window, description, and/or position.
 *
 * @param {number} id_shift
 * @param {Object} fields  { startHour, endHour, notes, id_position? }
 */
export async function updateShift(id_shift, { startHour, endHour, notes, id_position }) {
  await apiClient.put(`${SHIFTS}/${id_shift}`, {
    startTime:   hourToTimeStr(startHour),
    endTime:     hourToTimeStr(endHour),
    description: notes || "",
    ...(id_position !== undefined && { id_position }),
  });
}

/**
 * Delete a shift from the calendar.
 * Deletes the ShiftAssignment first if present, then the Shift definition.
 *
 * @param {number|null} id_shiftAssignment  null for unassigned shifts
 * @param {number}      id_shift
 */
export async function deleteShift(id_shiftAssignment, id_shift) {
  if (id_shiftAssignment) {
    await apiClient.delete(`${ASSIGNMENTS}/${id_shiftAssignment}`);
  }
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
    .filter((r) => r.status === "Pending" && employeeMap[r.id_employeeRequester])
    .map((r) => {
      const emp = employeeMap[r.id_employeeRequester];
      return {
        id:   r.id_swapRequest,
        name: `${emp.fName} ${emp.lName}`,
        type: "Shift Swap",
        raw:  r,
      };
    });
}
