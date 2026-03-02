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
      </div>
      <div class="nav-tabs">
        <button v-for="tab in ['Employees', 'Departments', 'Shifts']" :key="tab"
          class="nav-tab" :class="{ active: activeTab === tab }"
          @click="activeTab = tab">{{ tab }}</button>
      </div>
      <div class="nav-right">
        <button class="primary-btn" @click="openCreateModal">
          + Add {{ activeTab === 'Employees' ? 'Employee' : activeTab === 'Departments' ? 'Department' : 'Shift' }}
        </button>
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
            <p class="panel-sub">{{ employees.length }} total members across all departments</p>
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

      <!-- ════ DEPARTMENTS TAB ════ -->
      <div v-if="activeTab === 'Departments'" class="tab-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Departments</h2>
            <p class="panel-sub">{{ departments.length }} departments on campus</p>
          </div>
        </div>

        <div class="dept-grid">
          <div v-for="dept in departments" :key="dept.id_department" class="dept-card">
            <div class="dept-card-header">
              <div class="dept-icon">🏢</div>
              <div class="action-btns">
                <button class="icon-action" title="Edit" @click="openEditDepartment(dept)">✎</button>
                <button class="icon-action danger" title="Delete" @click="confirmDelete('department', dept)">✕</button>
              </div>
            </div>
            <h3 class="dept-name">{{ dept.name }}</h3>
            <p class="dept-desc">{{ dept.description || 'No description' }}</p>
          </div>
          <div v-if="departments.length === 0" class="empty-row">No departments yet.</div>
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
                <th>Employee</th>
                <th>Date</th>
                <th>Start</th>
                <th>End</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredShifts" :key="s.id_shiftAssignment">
                <td>
                  <div class="emp-name-cell">
                    <div class="emp-avatar" :style="{ background: empColorById(s.id_employee) }">
                      {{ initialsById(s.id_employee) }}
                    </div>
                    {{ s.employee }}
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
                <td colspan="6" class="empty-row">No shifts found.</td>
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
          </template>

          <!-- ── Create / Edit Department ── -->
          <template v-if="modal.type === 'department'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Department' : 'Add Department' }}</h3>
            <div class="form-group">
              <label>Department Name</label>
              <input v-model="modal.data.name" type="text" placeholder="Fitness Center" />
            </div>
            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <input v-model="modal.data.description" type="text" placeholder="Brief description…" />
            </div>
          </template>

          <!-- ── Create / Edit Shift ── -->
          <template v-if="modal.type === 'shift'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Shift' : 'Add Shift' }}</h3>
            <div class="form-group">
              <label>Employee</label>
              <select v-model="modal.data.id_employee">
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
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  employeeService,
  departmentService,
  shiftService,
  timeStrToHour,
  fmtHour,
} from "../services/employeeManagementService.js";

const router     = useRouter();
const activeTab  = ref("Employees");
const loading    = ref(false);
const apiError   = ref("");
const empSearch  = ref("");
const shiftSearch = ref("");

// ── Data ──────────────────────────────────────────────────────────────────────
const employees   = ref([]);
const departments = ref([]);
const shifts      = ref([]);   // normalized shift+assignment join

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
const empColorMap = ref({});   // id_employee → color

function assignColors(emps) {
  emps.forEach((e, i) => {
    if (!empColorMap.value[e.id_employee]) {
      empColorMap.value[e.id_employee] = COLORS[i % COLORS.length];
    }
  });
}
function empColor(emp)     { return empColorMap.value[emp.id_employee] || COLORS[0]; }
function empColorById(id)  { return empColorMap.value[id] || COLORS[0]; }
function initials(emp)     { return `${emp.fName?.[0] || ""}${emp.lName?.[0] || ""}`.toUpperCase(); }
function initialsById(id) {
  const e = employees.value.find(e => e.id_employee === id);
  return e ? initials(e) : "?";
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = "";
  try {
    const [empRes, deptRes, shiftRes, assignRes] = await Promise.all([
      employeeService.getAll(),
      departmentService.getAll(),
      shiftService.getAll(),
      shiftService.getAssignments(),
    ]);

    employees.value   = empRes.data;
    departments.value = deptRes.data;
    assignColors(empRes.data);

    // Join shifts + assignments
    const shiftMap = {};
    for (const s of shiftRes.data) shiftMap[s.id_shift] = s;
    const empMap   = {};
    for (const e of empRes.data) empMap[e.id_employee] = e;

    shifts.value = assignRes.data.map(a => {
      const s   = shiftMap[a.id_shift];
      const emp = empMap[a.id_employee];
      if (!s || !emp) return null;
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
      };
    }).filter(Boolean);

  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

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
    `${s.employee} ${s.date}`.toLowerCase().includes(q)
  );
});

// ── Modal ─────────────────────────────────────────────────────────────────────
const modal = ref({
  open: false, type: "", isEdit: false,
  data: {}, editId: null, saving: false, error: "",
});

function openCreateModal() {
  const type = activeTab.value === "Employees" ? "employee"
             : activeTab.value === "Departments" ? "department" : "shift";
  modal.value = {
    open: true, type, isEdit: false, saving: false, error: "",
    data: type === "employee"   ? { fName: "", lName: "", email: "", role: "Employee", bio: "" }
        : type === "department" ? { name: "", description: "" }
        : { id_employee: employees.value[0]?.id_employee || null, date: "", startTime: "09:00", endTime: "17:00", notes: "" },
    editId: null,
  };
}

function openEditEmployee(emp) {
  modal.value = {
    open: true, type: "employee", isEdit: true, saving: false, error: "",
    data: { fName: emp.fName, lName: emp.lName, email: emp.email, role: emp.role, bio: emp.bio || "" },
    editId: emp.id_employee,
  };
}

function openEditDepartment(dept) {
  modal.value = {
    open: true, type: "department", isEdit: true, saving: false, error: "",
    data: { name: dept.name, description: dept.description || "" },
    editId: dept.id_department,
  };
}

function openEditShift(s) {
  modal.value = {
    open: true, type: "shift", isEdit: true, saving: false, error: "",
    data: {
      id_employee: s.id_employee,
      date:        s.date,
      startTime:   s.startTime,
      endTime:     s.endTime,
      notes:       s.notes,
    },
    editId: { id_shift: s.id_shift, id_shiftAssignment: s.id_shiftAssignment },
  };
}

function closeModal() {
  modal.value.open = false;
}

async function saveModal() {
  modal.value.saving = true;
  modal.value.error  = "";
  const { type, isEdit, data, editId } = modal.value;

  try {
    if (type === "employee") {
      if (!data.fName || !data.lName || !data.email) throw new Error("First name, last name and email are required.");
      if (isEdit) {
        await employeeService.update(editId, data);
        const idx = employees.value.findIndex(e => e.id_employee === editId);
        if (idx !== -1) employees.value[idx] = { ...employees.value[idx], ...data };
      } else {
        const res = await employeeService.create(data);
        employees.value.push(res.data);
        assignColors(employees.value);
      }
    }

    else if (type === "department") {
      if (!data.name) throw new Error("Department name is required.");
      if (isEdit) {
        await departmentService.update(editId, data);
        const idx = departments.value.findIndex(d => d.id_department === editId);
        if (idx !== -1) departments.value[idx] = { ...departments.value[idx], ...data };
      } else {
        const res = await departmentService.create(data);
        departments.value.push(res.data);
      }
    }

    else if (type === "shift") {
      if (!data.id_employee || !data.date || !data.startTime || !data.endTime)
        throw new Error("Employee, date, start time and end time are required.");

      // Convert HH:MM string → fractional hour
      const toHour = t => { const [h, m] = t.split(":").map(Number); return h + m / 60; };
      const startHour = toHour(data.startTime);
      const endHour   = toHour(data.endTime);
      if (endHour <= startHour) throw new Error("End time must be after start time.");

      const emp = employees.value.find(e => e.id_employee == data.id_employee);
      const employeeName = emp ? `${emp.fName} ${emp.lName}` : "Employee";

      if (isEdit) {
        await shiftService.update(editId.id_shift, { startHour, endHour, notes: data.notes });
        const idx = shifts.value.findIndex(s => s.id_shift === editId.id_shift);
        if (idx !== -1) {
          shifts.value[idx] = {
            ...shifts.value[idx],
            startHour, endHour,
            startLabel: fmtHour(startHour),
            endLabel:   fmtHour(endHour),
            notes:      data.notes,
            startTime:  data.startTime,
            endTime:    data.endTime,
          };
        }
      } else {
        const { shift, assignment } = await shiftService.createAndAssign({
          id_employee: Number(data.id_employee),
          date:        data.date,
          startHour, endHour,
          notes:       data.notes,
          employeeName,
        });
        shifts.value.push({
          id_shiftAssignment: assignment.id_shiftAssignment,
          id_shift:    shift.id_shift,
          id_employee: Number(data.id_employee),
          employee:    employeeName,
          date:        data.date,
          startLabel:  fmtHour(startHour),
          endLabel:    fmtHour(endHour),
          startHour, endHour,
          notes:       data.notes || "",
          startTime:   data.startTime,
          endTime:     data.endTime,
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

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteConfirm = ref({ open: false, type: "", item: null, label: "", saving: false });

function confirmDelete(type, item) {
  const label = type === "employee"   ? `${item.fName} ${item.lName}`
              : type === "department" ? item.name
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
    } else if (type === "department") {
      await departmentService.remove(item.id_department);
      departments.value = departments.value.filter(d => d.id_department !== item.id_department);
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #07070d;
  color: #e2e8f0;
  overflow: hidden;
}

/* ── Nav ── */
.topnav {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
  height: 56px;
  background: #0d0d14;
  border-bottom: 1px solid #1a1a2e;
  flex-shrink: 0;
}
.nav-left  { display: flex; align-items: center; gap: 16px; }
.nav-right { margin-left: auto; }

.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none;
  color: #64748b; font-family: 'DM Sans', sans-serif;
  font-size: 13px; cursor: pointer;
  transition: color 0.15s;
}
.back-btn:hover { color: #FF1744; }

.nav-logo { display: flex; align-items: center; }

.nav-tabs  { display: flex; gap: 2px; }
.nav-tab {
  padding: 6px 18px;
  background: transparent; border: none;
  color: #64748b; font-family: 'DM Sans', sans-serif;
  font-size: 13px; cursor: pointer;
  border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.nav-tab:hover  { background: #1a1a2e; color: #94a3b8; }
.nav-tab.active { background: #1a0508; color: #FF1744; font-weight: 600; }

.primary-btn {
  background: #FF1744; border: none; color: #fff;
  padding: 7px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: background 0.15s, transform 0.12s;
}
.primary-btn:hover { background: #FF4569; transform: translateY(-1px); }

/* ── Loading / error ── */
.loading-overlay {
  position: fixed; inset: 0;
  background: rgba(10,10,15,0.85);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px; z-index: 999; backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid #1a1a2e;
  border-top-color: #FF1744;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: #64748b; font-family: 'DM Mono', monospace; }

.error-banner {
  background: #2a1515; border-bottom: 1px solid #3a2020;
  color: #EF4444; font-size: 12px;
  padding: 8px 20px; display: flex; align-items: center; gap: 10px;
}
.retry-btn {
  background: none; border: 1px solid #EF4444; color: #EF4444;
  padding: 2px 10px; border-radius: 4px; cursor: pointer;
  font-size: 11px; font-family: 'DM Sans', sans-serif;
}
.retry-btn:hover { background: #EF4444; color: #000; }

/* ── Content ── */
.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 4px; }

.tab-panel { max-width: 1100px; margin: 0 auto; }

.panel-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; margin-bottom: 24px;
  flex-wrap: wrap; gap: 16px;
}
.panel-title { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
.panel-sub   { font-size: 13px; color: #475569; }

.search-input {
  background: #0d0d14; border: 1px solid #1e2a3a;
  color: #e2e8f0; padding: 8px 14px; border-radius: 8px;
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  outline: none; width: 260px; transition: border-color 0.15s;
}
.search-input:focus { border-color: #FF1744; }
.search-input::placeholder { color: #334155; }

/* ── Table ── */
.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #1a1a2e; }
.data-table {
  width: 100%; border-collapse: collapse;
  font-size: 13px;
}
.data-table thead { background: #0d0d14; }
.data-table th {
  text-align: left; padding: 12px 16px;
  font-size: 11px; font-weight: 600;
  color: #475569; text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid #1a1a2e;
}
.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #111827;
  color: #94a3b8; vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: #0a0a14; }

.emp-name-cell {
  display: flex; align-items: center; gap: 10px;
  color: #e2e8f0; font-weight: 500;
}
.emp-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.muted  { color: #475569; }
.mono   { font-family: 'DM Mono', monospace; font-size: 12px; }
.small  { font-size: 12px; }

.role-badge {
  display: inline-block; padding: 2px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
  background: #1a1a2e; color: #64748b;
}
.role-badge.employee { background: rgba(255,23,68,0.1);  color: #FF4569; }
.role-badge.manager  { background: rgba(240,230,211,0.1); color: #F0E6D3; }
.role-badge.admin    { background: rgba(74,144,164,0.15); color: #4A90A4; }

.action-btns { display: flex; gap: 6px; }
.icon-action {
  background: #1a1a2e; border: none; color: #64748b;
  width: 28px; height: 28px; border-radius: 6px;
  cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.icon-action:hover       { background: #1a0508; color: #FF1744; }
.icon-action.danger:hover{ background: #2a1515; color: #EF4444; }

.empty-row { text-align: center; color: #334155; font-style: italic; padding: 32px 0 !important; }

/* ── Dept grid ── */
.dept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.dept-card {
  background: #0d0d14; border: 1px solid #1a1a2e;
  border-radius: 12px; padding: 20px;
  transition: border-color 0.15s;
}
.dept-card:hover { border-color: #FF1744; }
.dept-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.dept-icon { font-size: 24px; }
.dept-name { font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 6px; }
.dept-desc { font-size: 12px; color: #475569; line-height: 1.5; }

/* ── Modals ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 300; backdrop-filter: blur(4px);
}
.modal {
  background: #13131f; border: 1px solid #1e2a3a;
  border-radius: 14px; padding: 28px; width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.modal-sm { width: 320px; }
.modal-title { font-size: 18px; font-weight: 700; color: #e2e8f0; margin-bottom: 20px; }
.modal-body-text { font-size: 14px; color: #64748b; margin-bottom: 20px; }

.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-row   { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.form-group label {
  font-size: 10px; color: #4a5568;
  text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;
}
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group input,
.form-group select {
  background: #0a0a14; border: 1px solid #1e2a3a;
  color: #e2e8f0; padding: 8px 10px; border-radius: 8px;
  font-size: 13px; font-family: 'DM Sans', sans-serif;
  outline: none; transition: border-color 0.15s;
  width: 100%;
}
.form-group input:focus,
.form-group select:focus { border-color: #FF1744; }
.form-group select option { background: #13131f; }

.modal-error { font-size: 12px; color: #EF4444; margin-bottom: 12px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn {
  background: none; border: 1px solid #1e2a3a; color: #64748b;
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  transition: border-color 0.15s;
}
.cancel-btn:hover { border-color: #2d3a4a; color: #94a3b8; }
.confirm-btn {
  background: #FF1744; border: none; color: #fff;
  padding: 8px 18px; border-radius: 8px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  transition: background 0.15s;
}
.confirm-btn:hover   { background: #FF4569; }
.confirm-btn:disabled{ opacity: 0.6; cursor: not-allowed; }
.confirm-btn.danger  { background: #7f1d1d; }
.confirm-btn.danger:hover { background: #991b1b; }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>