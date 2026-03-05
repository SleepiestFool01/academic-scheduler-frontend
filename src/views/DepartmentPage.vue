<template>
  <div class="dept-root">

    <!-- ── Access denied ── -->
    <div v-if="!isManager" class="full-center">
      <div class="centered-box">
        <span class="big-icon">🔒</span>
        <h2>Access Restricted</h2>
        <p>The Department page is only available to Managers and Admins.</p>
        <button class="primary-btn" @click="router.push('/dashboard')">Back to Dashboard</button>
      </div>
    </div>

    <template v-else>

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
        <div v-if="!noDeptsYet" class="nav-tabs">
          <button v-for="tab in TABS" :key="tab" class="nav-tab"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab">{{ tab }}</button>
        </div>
        <div class="nav-right">
          <div v-if="currentUser" class="avatar" :title="`${currentUser.fName} ${currentUser.lName}`">
            <img v-if="currentUser.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
            <span v-else>{{ userInitials }}</span>
          </div>
        </div>
      </div>

      <!-- ── Init loading ── -->
      <div v-if="initLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading departments…</span>
      </div>

      <!-- ════════════════════════════════════════
           CREATE DEPARTMENT — blank state
      ════════════════════════════════════════ -->
      <div v-else-if="noDeptsYet" class="full-center">
        <div class="create-dept-box">
          <div class="create-dept-icon">🏢</div>
          <h2 class="create-dept-title">Create Your Department</h2>
          <p class="create-dept-sub">Set up your department to start managing schedules, positions, hours, and events.</p>

          <div class="form-group">
            <label>Department Name <span class="req">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="e.g. Fitness Center" autofocus />
          </div>
          <div class="form-group">
            <label>Description <span class="optional">(optional)</span></label>
            <input v-model="createForm.description" type="text" placeholder="Brief description of your department…" />
          </div>

          <p v-if="createError" class="form-error">{{ createError }}</p>

          <button class="primary-btn wide-btn" :disabled="creating" @click="submitCreateDepartment">
            {{ creating ? 'Creating…' : 'Create Department' }}
          </button>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           DEPARTMENT CONTENT
      ════════════════════════════════════════ -->
      <template v-else>
        <!-- ── Error ── -->
        <div v-if="apiError" class="error-banner">
          {{ apiError }}
          <button class="retry-btn" @click="loadDeptData(selectedDeptId)">Retry</button>
        </div>

        <!-- ── Department header ── -->
        <div class="dept-header">
          <!-- Department selector (multiple depts) -->
          <div class="dept-selector-row" v-if="myDepts.length > 1">
            <span class="dept-selector-label">Department:</span>
            <select v-model="selectedDeptId" class="dept-selector" @change="onDeptChange">
              <option v-for="d in myDepts" :key="d.id_department" :value="d.id_department">
                {{ d.name }}
              </option>
            </select>
          </div>

          <div class="dept-name-row">
            <div class="dept-color-dot"></div>
            <template v-if="!editingName">
              <h1 class="dept-name">{{ department.name || 'Unnamed Department' }}</h1>
              <button class="inline-edit-btn" @click="startEditName" title="Edit name">✎</button>
            </template>
            <template v-else>
              <input v-model="nameEdit" class="inline-input" @keyup.enter="saveName" @keyup.escape="cancelEditName" autofocus />
              <button class="save-inline-btn" @click="saveName" :disabled="savingName">✓</button>
              <button class="cancel-inline-btn" @click="cancelEditName">✕</button>
            </template>
          </div>

          <div class="dept-desc-row">
            <template v-if="!editingDesc">
              <p class="dept-desc">{{ department.description || 'No description' }}</p>
              <button class="inline-edit-btn" @click="startEditDesc" title="Edit description">✎</button>
            </template>
            <template v-else>
              <input v-model="descEdit" class="inline-input wide" @keyup.enter="saveDesc" @keyup.escape="cancelEditDesc" autofocus />
              <button class="save-inline-btn" @click="saveDesc" :disabled="savingDesc">✓</button>
              <button class="cancel-inline-btn" @click="cancelEditDesc">✕</button>
            </template>
          </div>

          <div class="dept-header-bottom">
            <div class="dept-chips">
              <span class="dept-chip">{{ employees.length }} Employees</span>
              <span class="dept-chip">{{ positions.length }} Positions</span>
            </div>
            <button class="request-access-btn" @click="openRequestModal" title="Request access to manage another department">
              + Request Another Department
            </button>
          </div>
        </div>

        <!-- ── Content loading ── -->
        <div v-if="loading" class="content-loading">
          <div class="loading-spinner sm"></div>
        </div>

        <!-- ── Tab content ── -->
        <div v-else class="content">

          <!-- ════ OVERVIEW TAB ════ -->
          <div v-if="activeTab === 'Overview'" class="tab-panel">
            <div class="panel-header">
              <h2 class="panel-title">Overview</h2>
            </div>
            <div class="overview-grid">
              <div class="overview-card">
                <div class="ov-label">Department Name</div>
                <div class="ov-value">{{ department.name || '—' }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Description</div>
                <div class="ov-value">{{ department.description || '—' }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Employees</div>
                <div class="ov-value ov-big">{{ employees.length }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Positions</div>
                <div class="ov-value ov-big">{{ positions.length }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Hours of Operation</div>
                <div class="ov-value ov-big">{{ calendarEntries.length }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Upcoming Events</div>
                <div class="ov-value ov-big">{{ events.length }}</div>
              </div>
            </div>

            <!-- Pending access requests sent by this manager -->
            <div v-if="myPendingRequests.length > 0" class="my-requests-section">
              <h3 class="section-title">Your Pending Department Requests</h3>
              <div v-for="req in myPendingRequests" :key="req.id_departmentAccessRequest" class="my-request-row">
                <span class="my-request-dept">{{ deptNameById(req.id_department) }}</span>
                <span class="status-badge Pending">Pending</span>
                <button class="icon-action danger" title="Cancel request" @click="cancelAccessRequest(req)">✕</button>
              </div>
            </div>
          </div>

          <!-- ════ POSITIONS TAB ════ -->
          <div v-else-if="activeTab === 'Positions'" class="tab-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Positions</h2>
                <p class="panel-sub">{{ positions.length }} position{{ positions.length !== 1 ? 's' : '' }}</p>
              </div>
              <button class="primary-btn" @click="openCreatePosition">+ Add Position</button>
            </div>
            <div v-if="positions.length === 0" class="empty-state">No positions yet. Add one to get started.</div>
            <div v-else class="positions-grid">
              <div v-for="pos in positions" :key="pos.id_position" class="position-card">
                <div class="pos-card-header">
                  <span class="pos-name">{{ pos.name }}</span>
                  <div class="action-btns">
                    <button class="icon-action" title="Edit" @click="openEditPosition(pos)">✎</button>
                    <button class="icon-action danger" title="Delete" @click="confirmDeletePosition(pos)">✕</button>
                  </div>
                </div>
                <div v-if="pos.avgPayRate" class="pos-meta">
                  <span class="pos-pay">${{ Number(pos.avgPayRate).toFixed(2) }}/hr</span>
                </div>
                <div v-if="pos.description" class="pos-desc">{{ pos.description }}</div>
                <button class="manage-emp-btn" @click="openManageEmployees(pos)">
                  Manage Employees
                </button>
              </div>
            </div>
          </div>

          <!-- ════ HOURS TAB ════ -->
          <div v-else-if="activeTab === 'Hours'" class="tab-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Hours of Operation</h2>
                <p class="panel-sub">{{ calendarEntries.length }} entr{{ calendarEntries.length !== 1 ? 'ies' : 'y' }}</p>
              </div>
              <button class="primary-btn" @click="openCreateHours">+ Add Hours</button>
            </div>
            <div v-if="calendarEntries.length === 0" class="empty-state">No hours configured yet.</div>
            <div v-else class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Day</th><th>Season</th><th>Open</th><th>Close</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in calendarEntries" :key="entry.id_hours_of_operation">
                    <td>{{ entry.name || '—' }}</td>
                    <td><span class="day-badge">{{ entry.dayOfWeek }}</span></td>
                    <td>{{ entry.season || '—' }}</td>
                    <td class="mono">{{ fmtTime(entry.startTime) }}</td>
                    <td class="mono">{{ fmtTime(entry.endTime) }}</td>
                    <td>
                      <div class="action-btns">
                        <button class="icon-action" @click="openEditHours(entry)">✎</button>
                        <button class="icon-action danger" @click="confirmDeleteHours(entry)">✕</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ════ EVENTS TAB ════ -->
          <div v-else-if="activeTab === 'Events'" class="tab-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Events</h2>
                <p class="panel-sub">{{ events.length }} event{{ events.length !== 1 ? 's' : '' }}</p>
              </div>
              <button class="primary-btn" @click="openCreateEvent">+ Add Event</button>
            </div>
            <div v-if="events.length === 0" class="empty-state">No events yet.</div>
            <div v-else class="events-list">
              <div v-for="ev in sortedEvents" :key="ev.id_event" class="event-card">
                <div class="event-card-left">
                  <div class="event-date-block">
                    <span class="event-month">{{ eventMonth(ev.start_time) }}</span>
                    <span class="event-day-num">{{ eventDay(ev.start_time) }}</span>
                  </div>
                </div>
                <div class="event-card-body">
                  <div class="event-title-row">
                    <span class="event-title">{{ ev.title }}</span>
                    <div class="action-btns">
                      <button class="icon-action" @click="openEditEvent(ev)">✎</button>
                      <button class="icon-action danger" @click="confirmDeleteEvent(ev)">✕</button>
                    </div>
                  </div>
                  <div class="event-meta">
                    <span v-if="ev.start_time" class="event-meta-item">{{ eventStartTime(ev) }}</span>
                    <span v-if="ev.location" class="event-meta-item">📍 {{ ev.location }}</span>
                  </div>
                  <p v-if="ev.description" class="event-desc">{{ ev.description }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ════ SETTINGS TAB ════ -->
          <div v-else-if="activeTab === 'Settings'" class="tab-panel">
            <div class="panel-header">
              <h2 class="panel-title">Settings</h2>
            </div>
            <div class="settings-section">
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-label">Student Buffer Time</div>
                  <div class="setting-desc">Minutes of buffer time to add between student employee shifts.</div>
                </div>
                <div class="setting-control">
                  <input v-model.number="bufferTime" type="number" min="0" max="60" class="setting-input" placeholder="0" />
                  <span class="setting-unit">min</span>
                  <button class="primary-btn" @click="saveBufferTime" :disabled="savingBuffer">
                    {{ savingBuffer ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </div>
              <p v-if="bufferSaved"  class="save-success">Settings saved.</p>
              <p v-if="bufferError"  class="save-error">{{ bufferError }}</p>
            </div>
          </div>

        </div>
      </template>

      <!-- ══════════════════════════════════════
           REQUEST ANOTHER DEPARTMENT MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="requestModal.open" class="modal-overlay" @click.self="requestModal.open = false">
          <div class="modal">
            <h3 class="modal-title">Request Department Access</h3>
            <p class="modal-desc">Select a department you'd like to manage. An Admin will review your request.</p>
            <div class="form-group">
              <label>Department</label>
              <select v-model="requestModal.id_department">
                <option value="">— Select a department —</option>
                <option v-for="d in availableDepts" :key="d.id_department" :value="d.id_department">
                  {{ d.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Message <span class="optional">(optional)</span></label>
              <input v-model="requestModal.message" type="text" placeholder="Why do you need access?" />
            </div>
            <p v-if="requestModal.error" class="modal-error">{{ requestModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="requestModal.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="requestModal.saving" @click="submitRequest">
                {{ requestModal.saving ? 'Sending…' : 'Send Request' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           MANAGE EMPLOYEES MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="empModal.open" class="modal-overlay" @click.self="empModal.open = false">
          <div class="modal modal-lg">
            <h3 class="modal-title">{{ empModal.positionName }} — Employees</h3>

            <!-- Loading -->
            <div v-if="empModal.loading" class="emp-modal-loading">
              <div class="loading-spinner sm"></div>
            </div>

            <template v-else>
              <!-- Assigned employees list -->
              <div v-if="empModal.assigned.length === 0" class="emp-empty">No employees assigned yet.</div>
              <div v-else class="assigned-list">
                <div v-for="row in empModal.assigned" :key="row.id_positionEmployee" class="assigned-row">
                  <div class="assigned-avatar" :style="{ background: empColor(row.employee || row) }">
                    {{ empInitials(row.employee || row) }}
                  </div>
                  <span class="assigned-name">
                    {{ row.employee ? `${row.employee.fName} ${row.employee.lName}` : empNameById(row.id_employee) }}
                  </span>
                  <button class="icon-action danger sm" title="Remove" @click="removeEmp(row)">✕</button>
                </div>
              </div>

              <!-- Add employee -->
              <div class="add-emp-row">
                <select v-model="empModal.selectedEmpId" class="emp-select">
                  <option value="">— Add an employee —</option>
                  <option
                    v-for="emp in unassignedEmployees"
                    :key="emp.id_employee"
                    :value="emp.id_employee">
                    {{ emp.fName }} {{ emp.lName }}
                  </option>
                </select>
                <button class="primary-btn" :disabled="!empModal.selectedEmpId || empModal.assigning" @click="addEmp">
                  {{ empModal.assigning ? 'Adding…' : 'Add' }}
                </button>
              </div>
              <p v-if="empModal.error" class="modal-error">{{ empModal.error }}</p>
            </template>

            <div class="modal-actions">
              <button class="cancel-btn" @click="empModal.open = false">Close</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           POSITION MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="posModal.open" class="modal-overlay" @click.self="posModal.open = false">
          <div class="modal">
            <h3 class="modal-title">{{ posModal.isEdit ? 'Edit Position' : 'Add Position' }}</h3>
            <div class="form-group">
              <label>Name</label>
              <input v-model="posModal.data.name" type="text" placeholder="e.g. Trainer" />
            </div>
            <div class="form-group">
              <label>Avg Pay Rate <span class="optional">(optional)</span></label>
              <input v-model="posModal.data.avgPayRate" type="number" step="0.01" min="0" placeholder="15.00" />
            </div>
            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <input v-model="posModal.data.description" type="text" placeholder="Brief description…" />
            </div>
            <p v-if="posModal.error" class="modal-error">{{ posModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="posModal.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="posModal.saving" @click="savePosition">
                {{ posModal.saving ? 'Saving…' : posModal.isEdit ? 'Save Changes' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           HOURS MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="hoursModal.open" class="modal-overlay" @click.self="hoursModal.open = false">
          <div class="modal">
            <h3 class="modal-title">{{ hoursModal.isEdit ? 'Edit Hours' : 'Add Hours' }}</h3>
            <div class="form-group">
              <label>Name <span class="optional">(optional)</span></label>
              <input v-model="hoursModal.data.name" type="text" placeholder="e.g. Regular Hours" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Day</label>
                <select v-model="hoursModal.data.dayOfWeek">
                  <option v-for="d in DAYS" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Season <span class="optional">(optional)</span></label>
                <select v-model="hoursModal.data.season">
                  <option value="">— None —</option>
                  <option v-for="s in SEASONS" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Open</label>
                <input v-model="hoursModal.data.startTime" type="time" />
              </div>
              <div class="form-group">
                <label>Close</label>
                <input v-model="hoursModal.data.endTime" type="time" />
              </div>
            </div>
            <p v-if="hoursModal.error" class="modal-error">{{ hoursModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="hoursModal.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="hoursModal.saving" @click="saveHours">
                {{ hoursModal.saving ? 'Saving…' : hoursModal.isEdit ? 'Save Changes' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           EVENT MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="eventModal.open" class="modal-overlay" @click.self="eventModal.open = false">
          <div class="modal">
            <h3 class="modal-title">{{ eventModal.isEdit ? 'Edit Event' : 'Add Event' }}</h3>
            <div class="form-group">
              <label>Title</label>
              <input v-model="eventModal.data.title" type="text" placeholder="Event title" />
            </div>
            <div class="form-group">
              <label>Date <span class="req">*</span></label>
              <input v-model="eventModal.data.date" type="date" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Time <span class="optional">(optional)</span></label>
                <input v-model="eventModal.data.startTime" type="time" />
              </div>
              <div class="form-group">
                <label>End Time <span class="optional">(optional)</span></label>
                <input v-model="eventModal.data.endTime" type="time" />
              </div>
            </div>
            <div class="form-group">
              <label>Location <span class="optional">(optional)</span></label>
              <input v-model="eventModal.data.location" type="text" placeholder="Room 201…" />
            </div>
            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <input v-model="eventModal.data.description" type="text" placeholder="Brief description…" />
            </div>
            <p v-if="eventModal.error" class="modal-error">{{ eventModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="eventModal.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="eventModal.saving" @click="saveEvent">
                {{ eventModal.saving ? 'Saving…' : eventModal.isEdit ? 'Save Changes' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           DELETE CONFIRM
      ══════════════════════════════════════ -->
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

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import {
  getAllDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  getEmployees,
  getCalendarEntries,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getSettingValues,
  getSettings,
  createSetting,
  createSettingValue,
  updateSettingValue,
  getManagerDepartments,
  createManagerDepartment,
  createDepartmentAccessRequest,
  getDepartmentAccessRequests,
  deleteDepartmentAccessRequest,
  getPositionEmployees,
  assignPositionEmployee,
  removePositionEmployee,
} from "../services/departmentService.js";
import apiClient from "../services/services.js";

const router      = useRouter();
const currentUser = ref(Utils.getStore("user"));

const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);
const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u?.fName?.[0] ?? ""}${u?.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

// ── Constants ──────────────────────────────────────────────────────────────────
const TABS    = ["Overview", "Positions", "Hours", "Events", "Settings"];
const DAYS    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SEASONS = ["Fall","Winter","Spring","Summer","Finals"];

// ── State ─────────────────────────────────────────────────────────────────────
const activeTab      = ref("Overview");
const initLoading    = ref(false);
const loading        = ref(false);
const apiError       = ref("");
const noDeptsYet     = ref(false);

// All departments this manager can access
const myDepts        = ref([]); // [{ id_department, name, description }]
const selectedDeptId = ref(null);
const allDepts       = ref([]); // all departments in system (for request modal)

const department      = ref({});
const positions       = ref([]);
const employees       = ref([]);
const calendarEntries = ref([]);
const events          = ref([]);

// Pending access requests from this manager
const myPendingRequests = ref([]);

// ── Create department form ────────────────────────────────────────────────────
const createForm  = ref({ name: "", description: "" });
const creating    = ref(false);
const createError = ref("");

async function submitCreateDepartment() {
  if (!createForm.value.name.trim()) { createError.value = "Department name is required."; return; }
  creating.value    = true;
  createError.value = "";
  try {
    // 1. Create department
    const deptRes = await createDepartment({
      name:        createForm.value.name.trim(),
      description: createForm.value.description.trim() || "Student Scheduling System",
    });
    const newDept = deptRes.data;

    // 2. Link employee to new department
    await apiClient.put(`/employees/${currentUser.value.id_employee}`, {
      id_department: newDept.id_department,
    });

    // 3. Update localStorage
    const updated = { ...currentUser.value, id_department: newDept.id_department };
    Utils.setStore("user", updated);
    currentUser.value = updated;

    // 4. Show the new department
    myDepts.value = [newDept];
    selectedDeptId.value = newDept.id_department;
    noDeptsYet.value = false;
    await loadDeptData(newDept.id_department);
  } catch (err) {
    createError.value = err.message || "Failed to create department.";
  } finally {
    creating.value = false;
  }
}

// ── Init: load all depts for this manager ────────────────────────────────────
async function initLoad() {
  if (!isManager.value) return;
  initLoading.value = true;
  try {
    const empId    = currentUser.value?.id_employee;
    const primaryId = currentUser.value?.id_department ?? null;

    // Load junction table + all depts in parallel
    const [junctionRes, allDeptsRes] = await Promise.allSettled([
      empId ? getManagerDepartments(empId) : Promise.resolve({ data: [] }),
      getAllDepartments(),
    ]);

    allDepts.value = allDeptsRes.status === "fulfilled" ? (allDeptsRes.value.data || []) : [];

    const junctionRows = junctionRes.status === "fulfilled" ? (junctionRes.value.data || []) : [];
    const deptIdSet = new Set(junctionRows.map(j => Number(j.id_department)));
    if (primaryId) deptIdSet.add(Number(primaryId));

    myDepts.value = allDepts.value.filter(d => deptIdSet.has(d.id_department));

    if (myDepts.value.length === 0) {
      noDeptsYet.value = true;
    } else {
      noDeptsYet.value = false;
      selectedDeptId.value = myDepts.value[0].id_department;
      await loadDeptData(selectedDeptId.value);
    }

    // Load this manager's pending access requests
    if (empId) {
      const reqRes = await getDepartmentAccessRequests({ id_employeeRequester: empId, status: "Pending" });
      myPendingRequests.value = reqRes.data || [];
    }
  } catch (err) {
    apiError.value = "Could not load department info: " + (err.message || "Network error");
  } finally {
    initLoading.value = false;
  }
}

async function loadDeptData(id) {
  if (!id) return;
  loading.value  = true;
  apiError.value = "";
  try {
    const [deptRes, posRes, empRes, calRes, evtRes] = await Promise.allSettled([
      getDepartment(id),
      getPositions(id),
      getEmployees(),
      getCalendarEntries(id),
      getEvents(id),
    ]);

    if (deptRes.status === "fulfilled") department.value      = deptRes.value.data || {};
    if (posRes.status  === "fulfilled") positions.value       = posRes.value.data  || [];
    if (empRes.status  === "fulfilled") employees.value       = empRes.value.data  || [];
    if (calRes.status  === "fulfilled") calendarEntries.value = calRes.value.data  || [];
    if (evtRes.status  === "fulfilled") events.value          = evtRes.value.data  || [];
  } catch (err) {
    apiError.value = "Could not load department data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
  await loadBufferTime(id);
}

function onDeptChange() {
  activeTab.value = "Overview";
  loadDeptData(selectedDeptId.value);
}

onMounted(initLoad);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const disp   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${disp}${suffix}` : `${disp}:${String(m).padStart(2,"0")}${suffix}`;
}

const sortedEvents = computed(() =>
  [...events.value].sort((a, b) => (a.start_time || "") > (b.start_time || "") ? 1 : -1)
);
function eventMonth(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}
function eventDay(dt) {
  if (!dt) return "—";
  return new Date(dt).getDate();
}
function eventStartTime(ev) {
  if (!ev.start_time) return null;
  const dt = new Date(ev.start_time);
  const h = dt.getHours(), m = dt.getMinutes();
  if (h === 0 && m === 0) return null; // midnight default → hide
  const suffix = h >= 12 ? "pm" : "am";
  const disp   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${disp}${suffix}` : `${disp}:${String(m).padStart(2,"0")}${suffix}`;
}
function deptNameById(id) {
  return allDepts.value.find(d => d.id_department === Number(id))?.name || `Dept #${id}`;
}

// ── Inline edit: name ─────────────────────────────────────────────────────────
const editingName = ref(false);
const nameEdit    = ref("");
const savingName  = ref(false);

function startEditName()  { nameEdit.value = department.value.name || ""; editingName.value = true; }
function cancelEditName() { editingName.value = false; }
async function saveName() {
  if (!nameEdit.value.trim()) return;
  savingName.value = true;
  try {
    await updateDepartment(selectedDeptId.value, { name: nameEdit.value.trim() });
    department.value.name = nameEdit.value.trim();
    const idx = myDepts.value.findIndex(d => d.id_department === selectedDeptId.value);
    if (idx !== -1) myDepts.value[idx].name = nameEdit.value.trim();
    editingName.value = false;
  } catch { /* silent */ } finally { savingName.value = false; }
}

// ── Inline edit: description ──────────────────────────────────────────────────
const editingDesc = ref(false);
const descEdit    = ref("");
const savingDesc  = ref(false);

function startEditDesc()  { descEdit.value = department.value.description || ""; editingDesc.value = true; }
function cancelEditDesc() { editingDesc.value = false; }
async function saveDesc() {
  savingDesc.value = true;
  try {
    await updateDepartment(selectedDeptId.value, { description: descEdit.value.trim() });
    department.value.description = descEdit.value.trim();
    editingDesc.value = false;
  } catch { /* silent */ } finally { savingDesc.value = false; }
}

// ── Request another department ────────────────────────────────────────────────
const requestModal = ref({ open: false, id_department: "", message: "", saving: false, error: "" });

const availableDepts = computed(() =>
  allDepts.value.filter(d => !myDepts.value.some(m => m.id_department === d.id_department))
);

function openRequestModal() {
  requestModal.value = { open: true, id_department: "", message: "", saving: false, error: "" };
}

async function submitRequest() {
  if (!requestModal.value.id_department) { requestModal.value.error = "Please select a department."; return; }
  requestModal.value.saving = true;
  requestModal.value.error  = "";
  try {
    const res = await createDepartmentAccessRequest({
      id_employeeRequester: currentUser.value.id_employee,
      id_department:        Number(requestModal.value.id_department),
      message:              requestModal.value.message || null,
    });
    myPendingRequests.value.push(res.data);
    requestModal.value.open = false;
  } catch (err) {
    requestModal.value.error = err.message || "Failed to send request.";
  } finally {
    requestModal.value.saving = false;
  }
}

async function cancelAccessRequest(req) {
  try {
    await deleteDepartmentAccessRequest(req.id_departmentAccessRequest);
    myPendingRequests.value = myPendingRequests.value.filter(
      r => r.id_departmentAccessRequest !== req.id_departmentAccessRequest
    );
  } catch { /* silent */ }
}

// ── Positions CRUD ────────────────────────────────────────────────────────────
const posModal = ref({ open: false, isEdit: false, data: {}, editId: null, saving: false, error: "" });

function openCreatePosition() {
  posModal.value = { open: true, isEdit: false, data: { name: "", avgPayRate: "", description: "" }, editId: null, saving: false, error: "" };
}
function openEditPosition(pos) {
  posModal.value = {
    open: true, isEdit: true, saving: false, error: "",
    data: { name: pos.name, avgPayRate: pos.avgPayRate || "", description: pos.description || "" },
    editId: pos.id_position,
  };
}
async function savePosition() {
  const { isEdit, data, editId } = posModal.value;
  if (!data.name?.trim()) { posModal.value.error = "Name is required."; return; }
  posModal.value.saving = true; posModal.value.error = "";
  try {
    const payload = { name: data.name.trim(), avgPayRate: data.avgPayRate || null, description: data.description || "", id_department: selectedDeptId.value };
    if (isEdit) {
      await updatePosition(editId, payload);
      const idx = positions.value.findIndex(p => p.id_position === editId);
      if (idx !== -1) positions.value[idx] = { ...positions.value[idx], ...payload };
    } else {
      const res = await createPosition(payload);
      positions.value.push(res.data);
    }
    posModal.value.open = false;
  } catch (err) {
    posModal.value.error = err.message || "Save failed.";
  } finally { posModal.value.saving = false; }
}

// ── Manage Employees modal ────────────────────────────────────────────────────
const empModal = ref({
  open: false, positionName: "", positionId: null,
  assigned: [], selectedEmpId: "", loading: false, assigning: false, error: "",
});

const COLORS = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
function empColor(emp)    { return emp?.color || COLORS[(emp?.id_employee || 0) % COLORS.length]; }
function empInitials(emp) { return `${emp?.fName?.[0] || ""}${emp?.lName?.[0] || ""}`.toUpperCase() || "?"; }
function empNameById(id)  { const e = employees.value.find(e => e.id_employee === id); return e ? `${e.fName} ${e.lName}` : `Employee #${id}`; }

const unassignedEmployees = computed(() => {
  const assignedIds = new Set(empModal.value.assigned.map(r => r.id_employee ?? r.employee?.id_employee));
  return employees.value.filter(e => !assignedIds.has(e.id_employee));
});

async function openManageEmployees(pos) {
  empModal.value = { open: true, positionName: pos.name, positionId: pos.id_position, assigned: [], selectedEmpId: "", loading: true, assigning: false, error: "" };
  try {
    const res = await getPositionEmployees(pos.id_position);
    empModal.value.assigned = res.data || [];
  } catch { empModal.value.error = "Could not load employees."; }
  finally { empModal.value.loading = false; }
}

async function addEmp() {
  const id_employee = Number(empModal.value.selectedEmpId);
  if (!id_employee) return;
  empModal.value.assigning = true; empModal.value.error = "";
  try {
    const res = await assignPositionEmployee({ id_employee, id_position: empModal.value.positionId });
    // Attach employee details for display
    const emp = employees.value.find(e => e.id_employee === id_employee);
    empModal.value.assigned.push({ ...res.data, employee: emp || null });
    empModal.value.selectedEmpId = "";
  } catch (err) { empModal.value.error = err.message || "Failed to assign employee."; }
  finally { empModal.value.assigning = false; }
}

async function removeEmp(row) {
  const id_employee = row.id_employee ?? row.employee?.id_employee;
  try {
    await removePositionEmployee(id_employee, empModal.value.positionId);
    empModal.value.assigned = empModal.value.assigned.filter(r => {
      const rid = r.id_employee ?? r.employee?.id_employee;
      return rid !== id_employee;
    });
  } catch (err) { empModal.value.error = err.message || "Failed to remove."; }
}

// ── Hours CRUD ────────────────────────────────────────────────────────────────
const hoursModal = ref({ open: false, isEdit: false, data: {}, editId: null, saving: false, error: "" });

function openCreateHours() {
  hoursModal.value = { open: true, isEdit: false, saving: false, error: "", editId: null,
    data: { name: "", dayOfWeek: "Monday", season: "", startTime: "08:00", endTime: "17:00" } };
}
function openEditHours(entry) {
  hoursModal.value = {
    open: true, isEdit: true, saving: false, error: "",
    data: { name: entry.name || "", dayOfWeek: entry.dayOfWeek || "Monday", season: entry.season || "", startTime: entry.startTime?.slice(0,5) || "08:00", endTime: entry.endTime?.slice(0,5) || "17:00" },
    editId: entry.id_hours_of_operation,
  };
}
async function saveHours() {
  const { isEdit, data, editId } = hoursModal.value;
  if (!data.name?.trim()) { hoursModal.value.error = "Name is required."; return; }
  if (!data.dayOfWeek) { hoursModal.value.error = "Day is required."; return; }
  hoursModal.value.saving = true; hoursModal.value.error = "";
  try {
    const payload = { name: data.name.trim(), dayOfWeek: data.dayOfWeek, season: data.season || null, startTime: data.startTime, endTime: data.endTime };
    if (isEdit) {
      await updateCalendarEntry(editId, payload);
      const idx = calendarEntries.value.findIndex(e => e.id_hours_of_operation === editId);
      if (idx !== -1) calendarEntries.value[idx] = { ...calendarEntries.value[idx], ...payload };
    } else {
      const res = await createCalendarEntry(payload);
      calendarEntries.value.push(res.data);
    }
    hoursModal.value.open = false;
  } catch (err) {
    hoursModal.value.error = err.message || "Save failed.";
  } finally { hoursModal.value.saving = false; }
}

// ── Events CRUD ───────────────────────────────────────────────────────────────
const eventModal = ref({ open: false, isEdit: false, data: {}, editId: null, saving: false, error: "" });

function openCreateEvent() {
  eventModal.value = { open: true, isEdit: false, saving: false, error: "", editId: null,
    data: { title: "", date: "", startTime: "", endTime: "", location: "", description: "" } };
}
function openEditEvent(ev) {
  const dtStart = ev.start_time ? new Date(ev.start_time) : null;
  const dtEnd   = ev.end_time   ? new Date(ev.end_time)   : null;
  const pad = n => String(n).padStart(2, "0");
  eventModal.value = {
    open: true, isEdit: true, saving: false, error: "",
    data: {
      title:       ev.title,
      date:        dtStart ? dtStart.toISOString().slice(0, 10) : "",
      startTime:   dtStart ? `${pad(dtStart.getHours())}:${pad(dtStart.getMinutes())}` : "",
      endTime:     dtEnd   ? `${pad(dtEnd.getHours())}:${pad(dtEnd.getMinutes())}`     : "",
      location:    ev.location    || "",
      description: ev.description || "",
    },
    editId: ev.id_event,
  };
}
async function saveEvent() {
  const { isEdit, data, editId } = eventModal.value;
  if (!data.title?.trim()) { eventModal.value.error = "Title is required."; return; }
  if (!data.date)          { eventModal.value.error = "Date is required."; return; }
  eventModal.value.saving = true; eventModal.value.error = "";
  try {
    const startDT = data.startTime
      ? `${data.date}T${data.startTime}:00`
      : `${data.date}T00:00:00`;
    const endDT = data.endTime
      ? `${data.date}T${data.endTime}:00`
      : new Date(new Date(startDT).getTime() + 3_600_000).toISOString();
    const payload = {
      title:        data.title.trim(),
      start_time:   startDT,
      end_time:     endDT,
      location:     data.location    || null,
      description:  data.description || null,
      id_department: selectedDeptId.value,
    };
    if (isEdit) {
      await updateEvent(editId, payload);
      const idx = events.value.findIndex(e => e.id_event === editId);
      if (idx !== -1) events.value[idx] = { ...events.value[idx], ...payload };
    } else {
      const res = await createEvent(payload);
      events.value.push(res.data);
    }
    eventModal.value.open = false;
  } catch (err) {
    eventModal.value.error = err.message || "Save failed.";
  } finally { eventModal.value.saving = false; }
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteConfirm = ref({ open: false, type: "", item: null, label: "", saving: false });

function confirmDeletePosition(pos) { deleteConfirm.value = { open: true, type: "position", item: pos, label: `position "${pos.name}"`, saving: false }; }
function confirmDeleteHours(entry)  { deleteConfirm.value = { open: true, type: "hours",    item: entry, label: `hours entry "${entry.name || entry.dayOfWeek}"`, saving: false }; }
function confirmDeleteEvent(ev)     { deleteConfirm.value = { open: true, type: "event",    item: ev, label: `event "${ev.title}"`, saving: false }; }

async function executeDelete() {
  deleteConfirm.value.saving = true;
  const { type, item } = deleteConfirm.value;
  try {
    if (type === "position") {
      await deletePosition(item.id_position);
      positions.value = positions.value.filter(p => p.id_position !== item.id_position);
    } else if (type === "hours") {
      await deleteCalendarEntry(item.id_hours_of_operation);
      calendarEntries.value = calendarEntries.value.filter(e => e.id_hours_of_operation !== item.id_hours_of_operation);
    } else if (type === "event") {
      await deleteEvent(item.id_event);
      events.value = events.value.filter(e => e.id_event !== item.id_event);
    }
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + (err.message || "Unknown error");
    deleteConfirm.value.open = false;
  } finally { deleteConfirm.value.saving = false; }
}

// ── Settings: Buffer Time ─────────────────────────────────────────────────────
const bufferTime    = ref(0);
const bufferSaved   = ref(false);
const bufferError   = ref("");
const savingBuffer  = ref(false);
let   bufferValueId = null;
let   bufferSettingId = null;
const BUFFER_KEY = "Student Buffer Time";

async function loadBufferTime(id) {
  if (!id) return;
  try {
    const valRes = await getSettingValues(id);
    const values = valRes.data || [];
    const bv = values.find(v => v.name === BUFFER_KEY || v.key === "buffer_time");
    if (bv) { bufferValueId = bv.id_settingValue; bufferSettingId = bv.id_setting; bufferTime.value = Number(bv.value) || 0; return; }

    const settingsRes = await getSettings();
    let setting = (settingsRes.data || []).find(s => s.name === BUFFER_KEY || s.key === "buffer_time");
    if (!setting) {
      const nr = await createSetting({ name: BUFFER_KEY, key: "buffer_time", type: "integer" });
      setting = nr.data;
    }
    bufferSettingId = setting?.id_setting;
    if (bufferSettingId) {
      const nvr = await createSettingValue({ id_setting: bufferSettingId, id_department: id, value: "0" });
      bufferValueId = nvr.data?.id_settingValue;
    }
    bufferTime.value = 0;
  } catch { bufferTime.value = 0; }
}

async function saveBufferTime() {
  savingBuffer.value = true; bufferError.value = ""; bufferSaved.value = false;
  try {
    if (bufferValueId) {
      await updateSettingValue(bufferValueId, String(bufferTime.value));
    } else if (bufferSettingId) {
      const res = await createSettingValue({ id_setting: bufferSettingId, id_department: selectedDeptId.value, value: String(bufferTime.value) });
      bufferValueId = res.data?.id_settingValue;
    }
    bufferSaved.value = true;
    setTimeout(() => { bufferSaved.value = false; }, 3000);
  } catch (err) {
    bufferError.value = err.message || "Save failed.";
  } finally { savingBuffer.value = false; }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.dept-root {
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column;
  height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden;
}

/* ── Full-page centered states ── */
.full-center { flex: 1; display: flex; align-items: center; justify-content: center; }
.centered-box {
  text-align: center; padding: 48px; background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle); border-radius: 16px; max-width: 400px;
}
.big-icon { font-size: 40px; display: block; margin-bottom: 16px; }
.centered-box h2 { font-size: 20px; font-weight: 700; margin-bottom: 10px; color: var(--tx-heading); }
.centered-box p  { font-size: 14px; color: var(--tx-muted); margin-bottom: 24px; }

/* ── Create Department box ── */
.create-dept-box {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 16px; padding: 48px; width: 480px; max-width: 95vw; text-align: center;
}
.create-dept-icon  { font-size: 48px; margin-bottom: 16px; }
.create-dept-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); margin-bottom: 8px; }
.create-dept-sub   { font-size: 14px; color: var(--tx-muted); margin-bottom: 28px; }
.create-dept-box .form-group { text-align: left; }
.form-error { font-size: 12px; color: var(--err-text); margin: 8px 0; }
.wide-btn   { width: 100%; margin-top: 8px; }

/* ── Top nav ── */
.topnav {
  display: flex; align-items: center; gap: 20px;
  padding: 0 24px; height: 56px;
  background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.nav-left  { display: flex; align-items: center; gap: 16px; }
.nav-right { margin-left: auto; }
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

.avatar {
  width: 30px; height: 30px; border-radius: 50%; background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

/* ── Loading ── */
.loading-overlay {
  position: fixed; inset: 0; background: var(--bg-overlay);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; z-index: 999; backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 36px; height: 36px; border: 3px solid var(--bdr-subtle);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite;
}
.loading-spinner.sm { width: 20px; height: 20px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.content-loading { display: flex; justify-content: center; padding: 48px; }
.error-banner {
  background: var(--err-bg); border-bottom: 1px solid var(--err-border);
  color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px;
}
.retry-btn {
  background: none; border: 1px solid var(--err-text); color: var(--err-text);
  padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
}

/* ── Department header ── */
.dept-header {
  padding: 20px 36px 16px;
  background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.dept-selector-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.dept-selector-label { font-size: 12px; color: var(--tx-muted); font-weight: 500; }
.dept-selector {
  background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 5px 10px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s;
}
.dept-selector:focus { border-color: var(--accent); }

.dept-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.dept-color-dot { width: 12px; height: 12px; border-radius: 2px; background: var(--accent); flex-shrink: 0; }
.dept-name { font-size: 22px; font-weight: 700; color: var(--tx-heading); }

.dept-desc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.dept-desc { font-size: 14px; color: var(--tx-muted); }

.inline-edit-btn {
  background: none; border: none; color: var(--tx-ghost);
  font-size: 14px; cursor: pointer; padding: 2px 6px; border-radius: 4px; transition: color 0.15s, background 0.15s;
}
.inline-edit-btn:hover { color: var(--accent); background: var(--bg-active); }
.inline-input {
  background: var(--bg-input); border: 1px solid var(--accent);
  color: var(--tx-primary); padding: 4px 10px; border-radius: 6px;
  font-size: 20px; font-weight: 700; font-family: 'DM Sans', sans-serif;
  outline: none; min-width: 200px;
}
.inline-input.wide { font-size: 14px; font-weight: 400; min-width: 300px; }
.save-inline-btn, .cancel-inline-btn {
  background: none; border: none; cursor: pointer; font-size: 16px;
  width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.save-inline-btn   { color: #22c55e; }
.save-inline-btn:hover   { background: rgba(34,197,94,0.1); }
.cancel-inline-btn { color: var(--tx-muted); }
.cancel-inline-btn:hover { background: var(--bdr-subtle); }
.save-inline-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dept-header-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dept-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.dept-chip {
  padding: 3px 12px; background: var(--bg-active); border: 1px solid var(--bdr-subtle);
  border-radius: 100px; font-size: 12px; color: var(--tx-secondary); font-weight: 500;
}
.request-access-btn {
  background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted);
  padding: 5px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;
  font-family: 'DM Sans', sans-serif; transition: border-color 0.15s, color 0.15s;
}
.request-access-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Content ── */
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
.empty-state {
  text-align: center; padding: 48px; color: var(--tx-ghost); font-style: italic; font-size: 14px;
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px;
}

/* ── Overview ── */
.overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.overview-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 20px 22px; }
.ov-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--tx-faint); margin-bottom: 8px; }
.ov-value { font-size: 14px; color: var(--tx-secondary); word-break: break-word; }
.ov-big   { font-size: 28px; font-weight: 700; color: var(--accent); font-family: 'DM Mono', monospace; }

.my-requests-section { margin-top: 28px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--tx-heading); margin-bottom: 12px; }
.my-request-row {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 10px;
  padding: 12px 16px; margin-bottom: 8px;
}
.my-request-dept { font-size: 14px; font-weight: 500; color: var(--tx-primary); flex: 1; }

/* ── Positions ── */
.positions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.position-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 18px 20px; transition: border-color 0.15s; }
.position-card:hover { border-color: var(--bdr-medium); }
.pos-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pos-name  { font-size: 15px; font-weight: 600; color: var(--tx-primary); }
.pos-meta  { margin-bottom: 6px; }
.pos-pay   { font-size: 12px; font-family: 'DM Mono', monospace; color: #22c55e; }
.pos-desc  { font-size: 12px; color: var(--tx-muted); margin-bottom: 10px; }
.manage-emp-btn {
  width: 100%; margin-top: 10px; padding: 6px 0;
  background: var(--bg-active); border: 1px solid var(--bdr-subtle); border-radius: 7px;
  color: var(--tx-secondary); font-family: 'DM Sans', sans-serif; font-size: 12px;
  cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.manage-emp-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Manage Employees modal ── */
.modal-lg { width: 480px; }
.emp-modal-loading { display: flex; justify-content: center; padding: 24px; }
.emp-empty { font-size: 13px; color: var(--tx-ghost); font-style: italic; margin-bottom: 16px; }
.assigned-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 260px; overflow-y: auto; }
.assigned-list::-webkit-scrollbar { width: 4px; }
.assigned-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.assigned-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg-input); border-radius: 8px; padding: 8px 12px;
}
.assigned-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.assigned-name { font-size: 13px; color: var(--tx-primary); flex: 1; font-weight: 500; }
.icon-action.sm { width: 24px; height: 24px; font-size: 11px; }
.add-emp-row { display: flex; gap: 10px; align-items: center; margin-bottom: 4px; }
.emp-select {
  flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 8px 10px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s;
}
.emp-select:focus { border-color: var(--accent); }
.emp-select option { background: var(--bg-modal); }

/* ── Hours table ── */
.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--bdr-subtle); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-surface); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.day-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; background: var(--bg-active); color: var(--tx-secondary); }
.mono { font-family: 'DM Mono', monospace; font-size: 12px; }

/* ── Events ── */
.events-list { display: flex; flex-direction: column; gap: 12px; }
.event-card { display: flex; gap: 16px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 16px 20px; transition: border-color 0.15s; }
.event-card:hover { border-color: var(--bdr-medium); }
.event-card-left { flex-shrink: 0; }
.event-date-block { width: 48px; display: flex; flex-direction: column; align-items: center; background: var(--bg-active); border-radius: 8px; padding: 6px 0; }
.event-month   { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; }
.event-day-num { font-size: 20px; font-weight: 700; color: var(--tx-primary); font-family: 'DM Mono', monospace; }
.event-card-body { flex: 1; }
.event-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.event-title { font-size: 15px; font-weight: 600; color: var(--tx-primary); }
.event-meta  { display: flex; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
.event-meta-item { font-size: 12px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.event-desc  { font-size: 13px; color: var(--tx-secondary); }

/* ── Settings ── */
.settings-section { max-width: 600px; }
.setting-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 20px 24px; margin-bottom: 12px; flex-wrap: wrap; }
.setting-info { flex: 1; }
.setting-label { font-size: 15px; font-weight: 600; color: var(--tx-primary); margin-bottom: 4px; }
.setting-desc  { font-size: 13px; color: var(--tx-muted); }
.setting-control { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.setting-input { width: 80px; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 7px 10px; border-radius: 8px; font-size: 14px; font-family: 'DM Mono', monospace; outline: none; text-align: center; transition: border-color 0.15s; }
.setting-input:focus { border-color: var(--accent); }
.setting-unit { font-size: 13px; color: var(--tx-muted); }
.save-success { font-size: 12px; color: #22c55e; margin-top: 4px; }
.save-error   { font-size: 12px; color: var(--err-text); margin-top: 4px; }

/* ── Shared ── */
.action-btns { display: flex; gap: 6px; }
.icon-action { background: var(--bdr-subtle); border: none; color: var(--tx-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
.icon-action:hover        { background: var(--bg-active); color: var(--accent); }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.status-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
.status-badge.Pending  { background: var(--warn-bg);  color: var(--warn-text); }
.status-badge.Approved { background: var(--ok-bg);    color: var(--ok-text); }
.status-badge.Denied   { background: var(--deny-bg);  color: var(--err-text); }

/* ── Buttons ── */
.primary-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s, transform 0.12s; }
.primary-btn:hover    { background: var(--accent-hover); transform: translateY(-1px); }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ── Modals ── */
.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-sm { width: 320px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 8px; }
.modal-desc  { font-size: 13px; color: var(--tx-muted); margin-bottom: 20px; }
.modal-body-text { font-size: 14px; color: var(--tx-muted); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-row   { display: flex; gap: 12px; }
.form-row .form-group { flex: 1; }
.form-group label { font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.req { color: var(--accent); }
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group input,
.form-group select { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; width: 100%; }
.form-group input:focus,
.form-group select:focus { border-color: var(--accent); }
.form-group select option { background: var(--bg-modal); }
.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; transition: border-color 0.15s; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.confirm-btn:hover    { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm-btn.danger   { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>
