<template>
  <div class="mgmt-root">
    <!-- ── Top nav ── -->
    <div class="topnav">
      <div class="nav-left">
        <button class="back-btn" @click="router.push('/dashboard')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Dashboard
        </button>
        <div class="nav-logo">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="4" width="11" height="7" rx="2" fill="#FF1744"/>
            <rect x="15" y="4" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
            <rect x="2" y="14" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
            <rect x="15" y="14" width="11" height="7" rx="2" fill="#F0E6D3"/>
          </svg>
        </div>
        <div class="nav-divider"></div>
        <DeptSwitcher />
      </div>
      <div class="nav-tabs">
        <button v-for="tab in DEPT_TABS" :key="tab" class="nav-tab"
          :class="{ active: tab === 'Employees' }"
          @click="tab === 'Employees' ? null : router.push('/department')">{{ tab }}</button>
      </div>
      <div class="nav-right">
        <button class="primary-btn" @click="openCreateModal">
          + Add {{ activeTab === 'Employees' ? 'Employee' : 'Shift' }}
        </button>
        <div v-if="currentUser" class="avatar" :title="`${currentUser.fName} ${currentUser.lName}`">
          <img v-if="currentUser.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </div>

    <!-- ── Loading / error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <!-- ── Content ── -->
    <div class="content">

      <!-- ════ EMPLOYEES TAB ════ -->
      <div v-if="activeTab === 'Employees'" class="tab-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Employees</h2>
            <p class="panel-sub">{{ employees.length }} total members</p>
          </div>
          <input v-model="empSearch" class="search-input" placeholder="Search by name or email…" />
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in filteredEmployees" :key="emp.id_employee">
                <td>
                  <div class="emp-name-cell">
                    <div class="emp-avatar" :style="{ background: empColor(emp) }">
                      {{ initials(emp) }}
                    </div>
                    {{ emp.fName }} {{ emp.lName }}
                  </div>
                </td>
                <td class="muted">{{ emp.email }}</td>
                <td>
                  <span class="role-badge" :class="emp.role?.toLowerCase()">{{ emp.role }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="icon-action" title="Edit" @click="openEditEmployee(emp)">✎</button>
                    <button class="icon-action" title="Manage Positions" @click="openManagePositions(emp)">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                    <button class="icon-action danger" title="Delete" @click="confirmDelete('employee', emp)">✕</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredEmployees.length === 0">
                <td colspan="4" class="empty-row">No employees found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════ SHIFTS TAB ════ -->
      <div v-if="activeTab === 'Shifts'" class="tab-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Shifts</h2>
            <p class="panel-sub">{{ shifts.length }} shift assignments total</p>
          </div>
          <input v-model="shiftSearch" class="search-input" placeholder="Search by employee or date…" />
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Start</th>
                <th>End</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredShifts" :key="s.id_shiftAssignment ?? s.id_shift">
                <td class="muted small">{{ s.positionName || '—' }}</td>
                <td>
                  <div class="emp-name-cell">
                    <div class="emp-avatar" :style="{ background: empColorById(s.id_employee) }">
                      {{ initialsById(s.id_employee) }}
                    </div>
                    {{ s.employee || 'Unassigned' }}
                  </div>
                </td>
                <td class="mono">{{ s.date }}</td>
                <td class="mono">{{ s.startLabel }}</td>
                <td class="mono">{{ s.endLabel }}</td>
                <td class="muted small">{{ s.notes || '—' }}</td>
                <td>
                  <div class="action-btns">
                    <button class="icon-action" title="Edit" @click="openEditShift(s)">✎</button>
                    <button class="icon-action danger" title="Delete" @click="confirmDelete('shift', s)">✕</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredShifts.length === 0">
                <td colspan="7" class="empty-row">No shifts found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════
         MODALS
    ══════════════════════════════════════ -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">

          <!-- ── Create / Edit Employee ── -->
          <template v-if="modal.type === 'employee'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Employee' : 'Add Employee' }}</h3>
            <div class="form-group">
              <label>First Name</label>
              <input v-model="modal.data.fName" type="text" placeholder="Jane" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input v-model="modal.data.lName" type="text" placeholder="Smith" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="modal.data.email" type="text" placeholder="jane@example.com" />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select v-model="modal.data.role">
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label>Bio <span class="optional">(optional)</span></label>
              <input v-model="modal.data.bio" type="text" placeholder="Brief bio…" />
            </div>
            <div class="form-group">
              <label>Shift Color</label>
              <div class="color-picker-row">
                <button
                  v-for="c in COLOR_PRESETS" :key="c"
                  type="button"
                  class="color-swatch"
                  :class="{ active: modal.data.color === c }"
                  :style="{ background: c }"
                  @click="modal.data.color = c"
                />
                <input type="color" v-model="modal.data.color" class="color-native" title="Custom color" />
              </div>
              <div class="color-preview" v-if="modal.data.color">
                <div class="emp-avatar" :style="{ background: modal.data.color }">
                  {{ (modal.data.fName?.[0] || '?') + (modal.data.lName?.[0] || '') }}
                </div>
                <span class="color-hex">{{ modal.data.color }}</span>
              </div>
            </div>
          </template>

          <!-- ── Create / Edit Shift ── -->
          <template v-if="modal.type === 'shift'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Shift' : 'Add Shift' }}</h3>
            <div class="form-group">
              <label>Position</label>
              <select v-model="modal.data.id_position">
                <option :value="null" disabled>— Select a position —</option>
                <option v-for="p in positions" :key="p.id_position" :value="p.id_position">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Employee <span class="optional">(optional)</span></label>
              <select v-model="modal.data.id_employee">
                <option :value="null">— Unassigned —</option>
                <option v-for="e in employees" :key="e.id_employee" :value="e.id_employee">
                  {{ e.fName }} {{ e.lName }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="modal.data.date" type="date" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Time</label>
                <input v-model="modal.data.startTime" type="time" />
              </div>
              <div class="form-group">
                <label>End Time</label>
                <input v-model="modal.data.endTime" type="time" />
              </div>
            </div>
            <div class="form-group">
              <label>Notes <span class="optional">(optional)</span></label>
              <input v-model="modal.data.notes" type="text" placeholder="Shift notes…" />
            </div>
          </template>

          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>

          <div class="modal-actions">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving" @click="saveModal">
              {{ modal.saving ? 'Saving…' : modal.isEdit ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Manage Positions ── -->
    <Transition name="modal">
      <div v-if="posModal.open" class="modal-overlay" @click.self="posModal.open = false">
        <div class="modal modal-lg">
          <h3 class="modal-title">{{ posModal.employee?.fName }} {{ posModal.employee?.lName }} — Positions</h3>

          <div v-if="posModal.loading" class="pos-modal-loading">
            <div class="loading-spinner sm"></div>
          </div>

          <template v-else>
            <div v-if="posModal.assigned.length === 0" class="pos-empty">No positions assigned yet.</div>
            <div v-else class="assigned-pos-list">
              <div v-for="row in posModal.assigned" :key="row.id_positionEmployee" class="assigned-pos-row">
                <span class="pos-tag">{{ row.position?.name || `Position #${row.id_position}` }}</span>
                <span v-if="row.position?.avgPayRate" class="pos-tag-pay">${{ Number(row.position.avgPayRate).toFixed(2) }}/hr</span>
                <button class="icon-action danger sm" title="Remove" @click="removePosition(row)">✕</button>
              </div>
            </div>

            <div class="add-pos-row">
              <select v-model="posModal.selectedPosId" class="pos-select">
                <option value="">— Add a position —</option>
                <option v-for="pos in unassignedPositions" :key="pos.id_position" :value="pos.id_position">
                  {{ pos.name }}
                </option>
              </select>
              <button class="primary-btn" :disabled="!posModal.selectedPosId || posModal.assigning" @click="addPosition">
                {{ posModal.assigning ? 'Adding…' : 'Add' }}
              </button>
            </div>
            <p v-if="posModal.error" class="modal-error">{{ posModal.error }}</p>
          </template>

          <div class="modal-actions">
            <button class="cancel-btn" @click="posModal.open = false">Close</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete confirmation ── -->
    <Transition name="modal">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal modal-sm">
          <h3 class="modal-title">Delete {{ deleteConfirm.label }}?</h3>
          <p class="modal-body-text">This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="deleteConfirm.open = false">Cancel</button>
            <button class="confirm-btn danger" :disabled="deleteConfirm.saving" @click="executeDelete">
              {{ deleteConfirm.saving ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import Utils from "../config/utils.js";
import { useDepartment } from "../composables/useDepartment.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
import {
  employeeService,
  shiftService,
  timeStrToHour,
  fmtHour,
} from "../services/employeeManagementService.js";
import {
  getPositions,
  getEmployeePositions,
  assignPositionEmployee,
  removePositionEmployee,
} from "../services/departmentService.js";

const router      = useRouter();
const route       = useRoute();
const currentUser = ref(Utils.getStore("user"));
const activeTab   = ref(route.query.tab || "Employees");
const loading     = ref(false);
const apiError    = ref("");
const empSearch   = ref("");
const shiftSearch = ref("");

// ── Data ──────────────────────────────────────────────────────────────────────
const employees  = ref([]);
const shifts     = ref([]);
const positions  = ref([]);

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
const COLOR_PRESETS = ["#FF1744","#C0392B","#E8724A","#F0E6D3","#9B6B9B","#4A90A4","#22c55e","#f59e0b","#6366f1","#ec4899","#14b8a6","#D4756B"];
const empColorMap = ref({});

function assignColors(emps) {
  emps.forEach((e, i) => {
    if (!empColorMap.value[e.id_employee]) {
      empColorMap.value[e.id_employee] = COLORS[i % COLORS.length];
    }
  });
}
function empColor(emp)    { return emp.color || empColorMap.value[emp.id_employee] || COLORS[0]; }
function empColorById(id) {
  const emp = employees.value.find(e => e.id_employee === id);
  return emp?.color || empColorMap.value[id] || COLORS[0];
}
function initials(emp)    { return `${emp.fName?.[0] || ""}${emp.lName?.[0] || ""}`.toUpperCase(); }
function initialsById(id) {
  const e = employees.value.find(e => e.id_employee === id);
  return e ? initials(e) : "?";
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = "";
  try {
    const deptId = selectedDeptId.value || currentUser.value?.id_department;
    const [empRes, shiftRes, assignRes, posRes] = await Promise.all([
      employeeService.getAll(deptId),
      shiftService.getAll(deptId),
      shiftService.getAssignments(),
      deptId ? getPositions(deptId) : Promise.resolve({ data: [] }),
    ]);

    employees.value = empRes.data;
    positions.value = posRes.data || [];
    assignColors(empRes.data);

    const shiftMap = {};
    for (const s of shiftRes.data) shiftMap[s.id_shift] = s;
    const empMap = {};
    for (const e of empRes.data) empMap[e.id_employee] = e;
    const posMap = {};
    for (const p of (posRes.data || [])) posMap[p.id_position] = p;

    const assignedShiftIds = new Set();
    const joined = assignRes.data.map(a => {
      const s   = shiftMap[a.id_shift];
      const emp = empMap[a.id_employee];
      if (!s || !emp) return null;
      assignedShiftIds.add(s.id_shift);
      const startHour = timeStrToHour(s.startTime);
      const endHour   = timeStrToHour(s.endTime);
      return {
        id_shiftAssignment: a.id_shiftAssignment,
        id_shift:    s.id_shift,
        id_employee: a.id_employee,
        employee:    `${emp.fName} ${emp.lName}`,
        date:        a.date,
        startLabel:  fmtHour(startHour),
        endLabel:    fmtHour(endHour),
        startHour,
        endHour,
        notes:       s.description || "",
        startTime:   s.startTime?.slice(0, 5) || "09:00",
        endTime:     s.endTime?.slice(0, 5)   || "17:00",
        id_position: s.id_position || null,
        positionName: posMap[s.id_position]?.name || "",
      };
    }).filter(Boolean);

    // Include unassigned shifts
    const unassigned = shiftRes.data
      .filter(s => !assignedShiftIds.has(s.id_shift) && s.date)
      .map(s => {
        const startHour = timeStrToHour(s.startTime);
        const endHour   = timeStrToHour(s.endTime);
        return {
          id_shiftAssignment: null,
          id_shift:    s.id_shift,
          id_employee: null,
          employee:    "",
          date:        s.date,
          startLabel:  fmtHour(startHour),
          endLabel:    fmtHour(endHour),
          startHour,
          endHour,
          notes:       s.description || "",
          startTime:   s.startTime?.slice(0, 5) || "09:00",
          endTime:     s.endTime?.slice(0, 5)   || "17:00",
          id_position: s.id_position || null,
          positionName: posMap[s.id_position]?.name || "",
        };
      });

    shifts.value = [...joined, ...unassigned];

  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

const { selectedDeptId, myDepts, loadDepts } = useDepartment();
watch(selectedDeptId, loadAll);
onMounted(() => {
  if (!myDepts.value.length) loadDepts(currentUser.value);
  loadAll();
});

const DEPT_TABS   = ["Overview", "Positions", "Employees", "Hours", "Events", "Settings"];
const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u?.fName?.[0] ?? ""}${u?.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

// ── Filters ───────────────────────────────────────────────────────────────────
const filteredEmployees = computed(() => {
  const q = empSearch.value.toLowerCase();
  if (!q) return employees.value;
  return employees.value.filter(e =>
    `${e.fName} ${e.lName} ${e.email}`.toLowerCase().includes(q)
  );
});

const filteredShifts = computed(() => {
  const q = shiftSearch.value.toLowerCase();
  if (!q) return shifts.value;
  return shifts.value.filter(s =>
    `${s.positionName} ${s.employee} ${s.date}`.toLowerCase().includes(q)
  );
});

// ── Modal ─────────────────────────────────────────────────────────────────────
const modal = ref({
  open: false, type: "", isEdit: false,
  data: {}, editId: null, saving: false, error: "",
});

function openCreateModal() {
  const type = activeTab.value === "Employees" ? "employee" : "shift";
  modal.value = {
    open: true, type, isEdit: false, saving: false, error: "",
    data: type === "employee"
      ? { fName: "", lName: "", email: "", role: "Employee", bio: "", color: null, id_department: currentUser.value?.id_department ?? null }
      : { id_position: positions.value[0]?.id_position || null, id_employee: null, date: "", startTime: "09:00", endTime: "17:00", notes: "" },
    editId: null,
  };
}

function openEditEmployee(emp) {
  modal.value = {
    open: true, type: "employee", isEdit: true, saving: false, error: "",
    data: { fName: emp.fName, lName: emp.lName, email: emp.email, role: emp.role, bio: emp.bio || "", color: emp.color || null },
    editId: emp.id_employee,
  };
}

function openEditShift(s) {
  modal.value = {
    open: true, type: "shift", isEdit: true, saving: false, error: "",
    data: {
      id_position: s.id_position || null,
      id_employee: s.id_employee || null,
      date:        s.date,
      startTime:   s.startTime,
      endTime:     s.endTime,
      notes:       s.notes,
    },
    editId: { id_shift: s.id_shift, id_shiftAssignment: s.id_shiftAssignment },
  };
}

function closeModal() { modal.value.open = false; }

async function saveModal() {
  modal.value.saving = true;
  modal.value.error  = "";
  const { type, isEdit, data, editId } = modal.value;

  try {
    if (type === "employee") {
      if (!data.fName || !data.lName || !data.email)
        throw new Error("First name, last name and email are required.");
      if (isEdit) {
        await employeeService.update(editId, data);
        const idx = employees.value.findIndex(e => e.id_employee === editId);
        if (idx !== -1) employees.value[idx] = { ...employees.value[idx], ...data };
      } else {
        const res = await employeeService.create(data);
        employees.value.push(res.data);
        assignColors(employees.value);
      }
    } else if (type === "shift") {
      if (!data.id_position || !data.date || !data.startTime || !data.endTime)
        throw new Error("Position, date, start time and end time are required.");

      const toHour = t => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
      const startHour = toHour(data.startTime);
      const endHour   = toHour(data.endTime);
      if (endHour <= startHour) throw new Error("End time must be after start time.");

      const emp          = data.id_employee ? employees.value.find(e => e.id_employee == data.id_employee) : null;
      const employeeName = emp ? `${emp.fName} ${emp.lName}` : "";
      const pos          = positions.value.find(p => p.id_position == data.id_position);
      const positionName = pos?.name || "";

      if (isEdit) {
        await shiftService.update(editId.id_shift, { startHour, endHour, notes: data.notes, id_position: data.id_position });
        const idx = shifts.value.findIndex(s => s.id_shift === editId.id_shift);
        if (idx !== -1) {
          let updated = {
            ...shifts.value[idx],
            startHour, endHour,
            startLabel:   fmtHour(startHour),
            endLabel:     fmtHour(endHour),
            notes:        data.notes,
            startTime:    data.startTime,
            endTime:      data.endTime,
            id_position:  data.id_position,
            positionName,
          };
          const prevEmpId = shifts.value[idx].id_employee;
          const nextEmpId = data.id_employee ? Number(data.id_employee) : null;
          if (prevEmpId && !nextEmpId) {
            await shiftService.deleteAssignment(editId.id_shiftAssignment);
            updated = { ...updated, id_shiftAssignment: null, id_employee: null, employee: "" };
          } else if (!prevEmpId && nextEmpId) {
            const assignment = await shiftService.createAssignment(editId.id_shift, nextEmpId, data.date);
            updated = { ...updated, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: employeeName };
          } else if (prevEmpId && nextEmpId && prevEmpId !== nextEmpId) {
            await shiftService.deleteAssignment(editId.id_shiftAssignment);
            const assignment = await shiftService.createAssignment(editId.id_shift, nextEmpId, data.date);
            updated = { ...updated, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: employeeName };
          }
          shifts.value[idx] = updated;
        }
      } else {
        const { shift, assignment } = await shiftService.createAndAssign({
          id_employee:  data.id_employee ? Number(data.id_employee) : null,
          date:         data.date,
          startHour, endHour,
          notes:        data.notes,
          positionName,
          id_position:  data.id_position,
          id_department: selectedDeptId.value || null,
        });
        shifts.value.push({
          id_shiftAssignment: assignment?.id_shiftAssignment || null,
          id_shift:    shift.id_shift,
          id_employee: data.id_employee ? Number(data.id_employee) : null,
          employee:    employeeName,
          date:        data.date,
          startLabel:  fmtHour(startHour),
          endLabel:    fmtHour(endHour),
          startHour, endHour,
          notes:       data.notes || "",
          startTime:   data.startTime,
          endTime:     data.endTime,
          id_position: data.id_position,
          positionName,
        });
      }
    }

    closeModal();
  } catch (err) {
    modal.value.error = err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}

// ── Manage Positions modal ────────────────────────────────────────────────────
const posModal = ref({
  open: false, employee: null,
  assigned: [], selectedPosId: "", loading: false, assigning: false, error: "",
});

const unassignedPositions = computed(() => {
  const assignedIds = new Set(posModal.value.assigned.map(r => r.id_position));
  return positions.value.filter(p => !assignedIds.has(p.id_position));
});

async function openManagePositions(emp) {
  posModal.value = { open: true, employee: emp, assigned: [], selectedPosId: "", loading: true, assigning: false, error: "" };
  try {
    const res = await getEmployeePositions(emp.id_employee);
    posModal.value.assigned = res.data || [];
  } catch {
    posModal.value.error = "Could not load positions.";
  } finally {
    posModal.value.loading = false;
  }
}

async function addPosition() {
  const id_position = Number(posModal.value.selectedPosId);
  if (!id_position) return;
  posModal.value.assigning = true;
  posModal.value.error = "";
  try {
    const res = await assignPositionEmployee({ id_employee: posModal.value.employee.id_employee, id_position });
    const pos = positions.value.find(p => p.id_position === id_position);
    posModal.value.assigned.push({ ...res.data, position: pos || null });
    posModal.value.selectedPosId = "";
  } catch (err) {
    posModal.value.error = err.message || "Failed to assign position.";
  } finally {
    posModal.value.assigning = false;
  }
}

async function removePosition(row) {
  const id_position = row.id_position;
  try {
    await removePositionEmployee(posModal.value.employee.id_employee, id_position);
    posModal.value.assigned = posModal.value.assigned.filter(r => r.id_position !== id_position);
  } catch (err) {
    posModal.value.error = err.message || "Failed to remove.";
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteConfirm = ref({ open: false, type: "", item: null, label: "", saving: false });

function confirmDelete(type, item) {
  const label = type === "employee"
    ? `${item.fName} ${item.lName}`
    : `${item.employee}'s shift on ${item.date}`;
  deleteConfirm.value = { open: true, type, item, label, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  const { type, item } = deleteConfirm.value;
  try {
    if (type === "employee") {
      await employeeService.remove(item.id_employee);
      employees.value = employees.value.filter(e => e.id_employee !== item.id_employee);
    } else if (type === "shift") {
      await shiftService.remove(item.id_shiftAssignment, item.id_shift);
      shifts.value = shifts.value.filter(s => s.id_shiftAssignment !== item.id_shiftAssignment);
    }
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + (err.message || "Unknown error");
    deleteConfirm.value.open = false;
  } finally {
    deleteConfirm.value.saving = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.mgmt-root {
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column;
  height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden;
}

.topnav {
  display: flex; align-items: center; gap: 20px;
  padding: 0 24px; height: 56px;
  background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.nav-left  { display: flex; align-items: center; gap: 16px; }
.nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: #FF1744; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; overflow: hidden; flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--tx-muted);
  font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s;
}
.back-btn:hover { color: var(--accent); }
.nav-logo { display: flex; align-items: center; }
.nav-tabs { display: flex; gap: 2px; }
.nav-tab {
  padding: 6px 18px; background: transparent; border: none;
  color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px;
  cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.nav-tab:hover  { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.primary-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s, transform 0.12s;
}
.primary-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }

.loading-overlay {
  position: fixed; inset: 0; background: var(--bg-overlay);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; z-index: 999; backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 36px; height: 36px; border: 3px solid var(--bdr-subtle);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner {
  background: var(--err-bg); border-bottom: 1px solid var(--err-border);
  color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px;
}
.retry-btn {
  background: none; border: 1px solid var(--err-text); color: var(--err-text);
  padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
}
.retry-btn:hover { background: var(--err-text); color: #fff; }

.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.tab-panel { max-width: 1100px; margin: 0 auto; }
.panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
}
.panel-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub   { font-size: 13px; color: var(--tx-faint); }
.search-input {
  background: var(--bg-surface); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 8px 14px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; width: 260px; transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-ghost); }

.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--bdr-subtle); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-surface); }
.data-table th {
  text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600;
  color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle);
}
.data-table td {
  padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.emp-name-cell { display: flex; align-items: center; gap: 10px; color: var(--tx-primary); font-weight: 500; }
.emp-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.muted { color: var(--tx-faint); }
.mono  { font-family: 'DM Mono', monospace; font-size: 12px; }
.small { font-size: 12px; }
.role-badge {
  display: inline-block; padding: 2px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600; background: var(--bdr-subtle); color: var(--tx-muted);
}
.role-badge.employee { background: rgba(255,23,68,0.1);   color: #FF4569; }
.role-badge.manager  { background: rgba(240,230,211,0.1);  color: #c8903a; }
.role-badge.admin    { background: rgba(74,144,164,0.15);  color: #4A90A4; }
.action-btns { display: flex; gap: 6px; }
.icon-action {
  background: var(--bdr-subtle); border: none; color: var(--tx-muted);
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s;
}
.icon-action:hover        { background: var(--bg-active); color: var(--accent); }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }
.empty-row { text-align: center; color: var(--tx-ghost); font-style: italic; padding: 32px 0 !important; }

.modal-overlay {
  position: fixed; inset: 0; background: var(--bg-moverlay);
  display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-modal); border: 1px solid var(--bdr-medium);
  border-radius: 14px; padding: 28px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-sm { width: 320px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 20px; }
.modal-body-text { font-size: 14px; color: var(--tx-muted); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-row   { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.form-group label {
  font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
}
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group input,
.form-group select {
  background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 8px 10px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; width: 100%;
}
.form-group input:focus,
.form-group select:focus { border-color: var(--accent); }
.form-group select option { background: var(--bg-modal); }
.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; transition: border-color 0.15s;
}
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn {
  background: var(--accent); border: none; color: #fff;
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s;
}
.confirm-btn:hover    { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm-btn.danger   { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }

.modal-lg { width: 480px; }
.pos-modal-loading { display: flex; justify-content: center; padding: 20px 0; }
.loading-spinner.sm { width: 22px; height: 22px; border-width: 2px; }
.pos-empty { font-size: 13px; color: var(--tx-ghost); font-style: italic; padding: 12px 0; }
.assigned-pos-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.assigned-pos-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-input); border: 1px solid var(--bdr-subtle);
  border-radius: 8px; padding: 8px 12px;
}
.pos-tag { font-size: 13px; font-weight: 600; color: var(--tx-primary); flex: 1; }
.pos-tag-pay { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--tx-faint); }
.icon-action.sm { width: 22px; height: 22px; font-size: 11px; }
.add-pos-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
.pos-select {
  flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 8px 10px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none;
}
.pos-select:focus { border-color: var(--accent); }
.pos-select option { background: var(--bg-modal); }

.color-picker-row { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
.color-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; transition: transform 0.12s, border-color 0.12s; flex-shrink: 0; }
.color-swatch:hover { transform: scale(1.2); }
.color-swatch.active { border-color: var(--tx-primary); transform: scale(1.2); }
.color-native { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--bdr-medium); cursor: pointer; padding: 0; background: none; flex-shrink: 0; }
.color-preview { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.color-hex { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--tx-muted); }
</style>