<template>
  <div class="page-root">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">{{ apiError }}<button class="retry-btn" @click="loadAll">Retry</button></div>

    <!-- ══ MANAGER VIEW ══ -->
    <div v-if="isManager" class="content">

      <!-- Page header with sub-tabs -->
      <div class="page-header">
        <h1 class="page-heading">Tasks</h1>
        <div class="sub-tabs">
          <button class="sub-tab" :class="{ active: activeTab === 'lists' }" @click="activeTab = 'lists'">Task Lists</button>
          <button class="sub-tab" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">All Tasks</button>
        </div>
        <button v-if="activeTab === 'lists'" class="primary-btn" @click="openCreateModal">+ New Task List</button>
        <button v-else class="primary-btn" @click="openCreateModal">+ New Task</button>
      </div>

      <!-- Task Lists Tab -->
      <div v-if="activeTab === 'lists'">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Task Lists</h2>
          </div>
        </div>

        <div v-if="taskLists.length === 0" class="empty-card">
          <p class="empty-icon">📋</p>
          <p class="empty-title">No task lists yet</p>
          <p class="empty-sub">Create a task list to group related tasks together.</p>
        </div>

        <div class="lists-grid">
          <div v-for="list in taskLists" :key="list.id_taskList" class="list-card">
            <div class="list-card-header">
              <div>
                <h3 class="list-name">{{ list.name }}</h3>
                <p class="list-desc">{{ list.description || 'No description' }}</p>
              </div>
              <div class="action-btns">
                <button class="icon-action" @click="openEditList(list)">✎</button>
                <button class="icon-action danger" @click="confirmDelete('list', list)">✕</button>
              </div>
            </div>

            <div class="list-tasks">
              <div v-for="task in tasksForList(list.id_taskList)" :key="task.id_task" class="task-row">
                <span class="task-bullet">·</span>
                <span class="task-name">{{ task.name }}</span>
                <span class="task-desc">{{ task.description }}</span>
                <div class="task-actions">
                  <button class="icon-action sm" @click="openEditTask(task)">✎</button>
                  <button class="icon-action sm danger" @click="confirmDelete('task', task)">✕</button>
                </div>
              </div>
              <div v-if="tasksForList(list.id_taskList).length === 0" class="no-tasks">No tasks in this list yet.</div>
            </div>

            <div class="list-btn-row">
              <button class="add-task-btn" @click="openCreateTaskInList(list)">+ New Task</button>
              <button class="add-task-btn" @click="openAddExisting(list)">+ Add Existing</button>
            </div>
            <div class="card-action-row">
              <button class="assign-shift-btn" @click="openAssignShift(list)">⟶ Assign to Shift</button>
              <button class="position-link-btn" @click="openPositionLink(list)">⊕ Link to Position</button>
            </div>
          </div>
        </div>
      </div>

      <!-- All Tasks Tab -->
      <div v-if="activeTab === 'tasks'">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">All Tasks</h2>
            <p class="panel-sub">{{ tasks.length }} tasks across all lists</p>
          </div>
          <input v-model="taskSearch" class="search-input" placeholder="Search tasks…" />
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Task</th><th>Description</th><th>Task List</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.id_task">
                <td class="task-name-cell">{{ task.name }}</td>
                <td class="muted">{{ task.description }}</td>
                <td><span class="list-badge">{{ listName(task.id_taskList) }}</span></td>
                <td>
                  <div class="action-btns">
                    <button class="icon-action" @click="openEditTask(task)">✎</button>
                    <button class="icon-action danger" @click="confirmDelete('task', task)">✕</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredTasks.length === 0">
                <td colspan="4" class="empty-row">No tasks found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══ EMPLOYEE VIEW ══ -->
    <div v-else class="content">

      <!-- Loading -->
      <div v-if="empLoading" class="emp-loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading your tasks…</span>
      </div>

      <!-- No active shift -->
      <div v-else-if="!empActiveShift" class="emp-empty-state">
        <div class="emp-empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2"/>
            <path d="M24 14V24L30 30" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="emp-empty-title">No Current Tasks</p>
        <p class="emp-empty-sub">You don't have an active shift right now. Your tasks will appear here once your shift begins.</p>
      </div>

      <!-- Active shift -->
      <template v-else>
        <!-- Shift banner -->
        <div class="emp-shift-banner">
          <div class="emp-shift-left">
            <span class="emp-live-badge">● Live</span>
            <span class="emp-shift-name">{{ empActiveShift.name || 'Current Shift' }}</span>
            <span class="emp-shift-time">{{ fmtHour(empActiveShift.startHour) }} – {{ fmtHour(empActiveShift.endHour) }}</span>
          </div>
          <div v-if="empTaskGroups.length" class="emp-overall-progress">
            <div class="emp-overall-bar">
              <div class="emp-overall-fill" :style="{ width: empTotalCount ? (empTotalDone / empTotalCount * 100) + '%' : '0%' }"></div>
            </div>
            <span class="emp-overall-count">{{ empTotalDone }}/{{ empTotalCount }} completed</span>
          </div>
        </div>

        <!-- No tasks on this shift -->
        <div v-if="empTaskGroups.length === 0" class="emp-empty-state">
          <div class="emp-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="10" y="8" width="28" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
              <path d="M17 18h14M17 24h14M17 30h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <p class="emp-empty-title">No Tasks Assigned</p>
          <p class="emp-empty-sub">No task lists have been assigned to your current shift.</p>
        </div>

        <!-- Task list cards -->
        <div v-else class="emp-lists-grid">
          <div v-for="group in empTaskGroups" :key="group.shiftTaskListId" class="emp-list-card">
            <div class="emp-list-header">
              <div class="emp-list-title-row">
                <h3 class="emp-list-name">{{ group.taskList.name }}</h3>
                <span class="emp-list-count" :class="{ complete: group.completedCount === group.totalCount && group.totalCount > 0 }">
                  {{ group.completedCount }}/{{ group.totalCount }}
                </span>
              </div>
              <div class="emp-list-bar">
                <div class="emp-list-fill" :style="{ width: group.totalCount ? (group.completedCount / group.totalCount * 100) + '%' : '0%' }"></div>
              </div>
              <p v-if="group.taskList.description" class="emp-list-desc">{{ group.taskList.description }}</p>
            </div>

            <div class="emp-task-list">
              <div
                v-for="status in group.statuses"
                :key="status.id_shiftTaskListStatus"
                class="emp-task-row"
                :class="{ done: status.isCompleted }"
                @click="toggleEmpTask(status)"
              >
                <button class="emp-check" :class="{ done: status.isCompleted }" @click.stop="toggleEmpTask(status)">
                  <svg v-if="status.isCompleted" width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <span class="emp-task-label" :class="{ done: status.isCompleted }">{{ status.taskName }}</span>
                <span v-if="status.isCompleted" class="emp-done-badge">Done</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══ MODALS ══ -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">

          <!-- Task List form -->
          <template v-if="modal.type === 'list'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Task List' : 'New Task List' }}</h3>
            <div class="form-group">
              <label>Name</label>
              <input v-model="modal.data.name" type="text" placeholder="Opening Checklist" />
            </div>
            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <input v-model="modal.data.description" type="text" placeholder="Tasks for opening the department" />
            </div>
          </template>

          <!-- Task form -->
          <template v-if="modal.type === 'task'">
            <h3 class="modal-title">{{ modal.isEdit ? 'Edit Task' : 'New Task' }}</h3>
            <div class="form-group">
              <label>Task Name</label>
              <input v-model="modal.data.name" type="text" placeholder="Wipe down equipment" />
            </div>
            <div class="form-group">
              <label>Description <span class="optional">(optional)</span></label>
              <input v-model="modal.data.description" type="text" placeholder="Short description of what to do" />
            </div>
            <div class="form-group">
              <label>Task List <span class="optional">(optional)</span></label>
              <select v-model="modal.data.id_taskList">
                <option :value="null">— None —</option>
                <option v-for="l in taskLists" :key="l.id_taskList" :value="l.id_taskList">{{ l.name }}</option>
              </select>
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

    <!-- Assign to Shift modal -->
    <Transition name="modal">
      <div v-if="assignModal.open" class="modal-overlay" @click.self="assignModal.open = false">
        <div class="modal modal-shift">
          <h3 class="modal-title">Assign "{{ assignModal.list?.name }}" to a Shift</h3>

          <!-- Week navigation -->
          <div class="spkr-nav">
            <button class="spkr-nav-btn" :disabled="!canPrevWeek" @click="assignModal.weekOffset--">‹</button>
            <span class="spkr-week-label">{{ assignWeekLabel }}</span>
            <button class="spkr-nav-btn" @click="assignModal.weekOffset++">›</button>
          </div>

          <!-- Shifts for the selected week -->
          <div class="spkr-body">
            <div v-if="assignWeekByDay.length === 0" class="spkr-empty">No shifts this week.</div>
            <template v-else>
              <div v-for="[date, dayShifts] in assignWeekByDay" :key="date" class="spkr-day-group">
                <div class="spkr-day-header">{{ formatDayHeader(date) }}</div>
                <div
                  v-for="s in dayShifts"
                  :key="s.id_shift"
                  class="spkr-shift-row"
                  :class="{ selected: assignModal.selectedShiftId === s.id_shift }"
                  @click="assignModal.selectedShiftId = s.id_shift; assignModal.error = ''"
                >
                  <div class="spkr-radio" :class="{ selected: assignModal.selectedShiftId === s.id_shift }"></div>
                  <div class="spkr-shift-info">
                    <span class="spkr-shift-name">{{ s.name }}</span>
                    <span class="spkr-shift-time">{{ fmtHour(timeStrToHour(s.startTime)) }} – {{ fmtHour(timeStrToHour(s.endTime)) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <p v-if="assignModal.error" class="modal-error">{{ assignModal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="assignModal.open = false">Cancel</button>
            <button class="confirm-btn" :disabled="assignModal.saving || !assignModal.selectedShiftId" @click="saveAssignShift">
              {{ assignModal.saving ? 'Assigning…' : 'Assign' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Position Link modal -->
    <Transition name="modal">
      <div v-if="posLinkModal.open" class="modal-overlay" @click.self="posLinkModal.open = false">
        <div class="modal modal-shift">
          <h3 class="modal-title">Position Links — "{{ posLinkModal.list?.name }}"</h3>
          <p class="modal-hint">Task lists linked to a position are automatically assigned to every new shift created with that position.</p>

          <!-- Currently linked positions -->
          <div class="pos-link-section">
            <p class="pos-link-label">Linked Positions</p>
            <div v-if="posLinkModal.links.length === 0" class="pos-link-empty">No positions linked yet.</div>
            <div v-for="link in posLinkModal.links" :key="link.id_positionTaskList" class="pos-link-row">
              <span class="pos-link-name">{{ link.positionName }}</span>
              <button class="pos-unlink-btn" :disabled="posLinkModal.saving" @click="unlinkPosition(link)">Remove</button>
            </div>
          </div>

          <!-- Add a new link -->
          <div class="pos-link-section">
            <p class="pos-link-label">Add Position</p>
            <div class="pos-link-add-row">
              <select v-model="posLinkModal.selectedPositionId" class="pos-link-select">
                <option :value="null" disabled>Select a position…</option>
                <option
                  v-for="p in availablePositions"
                  :key="p.id_position"
                  :value="p.id_position"
                >{{ p.name }}</option>
              </select>
              <button
                class="confirm-btn"
                style="flex-shrink:0"
                :disabled="!posLinkModal.selectedPositionId || posLinkModal.saving"
                @click="linkPosition"
              >{{ posLinkModal.saving ? 'Linking…' : 'Link' }}</button>
            </div>
            <p v-if="availablePositions.length === 0 && allPositions.length > 0" class="form-hint">All positions are already linked.</p>
            <p v-if="allPositions.length === 0" class="form-hint">No positions found for this department.</p>
          </div>

          <p v-if="posLinkModal.error" class="modal-error">{{ posLinkModal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="posLinkModal.open = false">Done</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add Existing Task modal -->
    <Transition name="modal">
      <div v-if="addExistingModal.open" class="modal-overlay" @click.self="addExistingModal.open = false">
        <div class="modal modal-lg">
          <h3 class="modal-title">Add Existing Tasks to "{{ addExistingModal.list?.name }}"</h3>
          <input v-model="addExistingModal.search" class="search-input" placeholder="Search tasks…" style="margin-bottom:14px;width:100%;" />
          <div class="existing-task-list">
            <div v-if="filteredAvailable.length === 0" class="no-tasks" style="padding:20px;text-align:center;">
              {{ addExistingModal.search ? 'No matching tasks.' : 'All tasks are already in this list.' }}
            </div>
            <label
              v-for="task in filteredAvailable"
              :key="task.id_task"
              class="existing-task-row"
              :class="{ selected: addExistingModal.selectedIds.includes(task.id_task) }"
            >
              <input
                type="checkbox"
                :value="task.id_task"
                v-model="addExistingModal.selectedIds"
                class="task-checkbox"
              />
              <div class="existing-task-info">
                <span class="task-name">{{ task.name }}</span>
                <span class="task-desc">{{ task.description }}</span>
              </div>
              <span v-if="task.id_taskList" class="list-badge" style="flex-shrink:0;">{{ listName(task.id_taskList) }}</span>
            </label>
          </div>
          <p v-if="addExistingModal.error" class="modal-error">{{ addExistingModal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="addExistingModal.open = false">Cancel</button>
            <button
              class="confirm-btn"
              :disabled="addExistingModal.saving || addExistingModal.selectedIds.length === 0"
              @click="saveAddExisting"
            >
              {{ addExistingModal.saving ? 'Adding…' : `Add ${addExistingModal.selectedIds.length || ''} Task${addExistingModal.selectedIds.length !== 1 ? 's' : ''}` }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete confirm -->
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useDepartment } from "../composables/useDepartment.js";
import { usePreferences } from "../composables/usePreferences.js";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import apiClient from "../services/services.js";
import { getShiftTaskLists, getTaskListStatuses, updateTaskComplete, getTaskListPositions, addPositionTaskList, removePositionTaskList } from "../services/taskService.js";
import { getPositions } from "../services/departmentService.js";

const router     = useRouter();
const currentUser = Utils.getStore("user") || {};
const isManager  = currentUser.role === "Manager" || currentUser.role === "Admin";
const loading    = ref(false);
const apiError   = ref("");
const activeTab  = ref("lists");
const taskSearch = ref("");

const taskLists = ref([]);
const tasks     = ref([]);

const { selectedDeptId } = useDepartment();

async function loadAll() {
  loading.value = true; apiError.value = "";
  try {
    const deptId = selectedDeptId.value;
    const qs = deptId ? `?id_department=${deptId}` : "";
    const [listsRes, tasksRes] = await Promise.all([
      apiClient.get(`/task-lists${qs}`),
      apiClient.get(`/tasks${qs}`),
    ]);
    taskLists.value = listsRes.data;
    tasks.value     = tasksRes.data;
  } catch (err) {
    apiError.value = "Could not load data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}
watch(selectedDeptId, () => {
  if (isManager) { loadAll(); loadShifts(); }
  else { loadEmployeeTasks(); }
});
onMounted(() => {
  if (isManager) {
    loadAll();
    loadShifts();
  } else {
    loadEmployeeTasks();
    clockInterval = setInterval(() => {
      const now = new Date();
      currentTimeHour.value = now.getHours() + now.getMinutes() / 60;
    }, 60_000);
  }
});
onUnmounted(() => clearInterval(clockInterval));

// ── Shifts (for task list assignment) ─────────────────────────────────────────
const allShifts  = ref([]);
const assignModal = ref({ open: false, list: null, selectedShiftId: null, saving: false, error: "", weekOffset: 0 });

const upcomingShifts = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return allShifts.value
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
});

// ── Week picker helpers ────────────────────────────────────────────────────────
function weekSunday(offset) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

const assignWeekStart = computed(() => weekSunday(assignModal.value.weekOffset));
const assignWeekEnd   = computed(() => {
  const d = new Date(assignWeekStart.value);
  d.setDate(d.getDate() + 6);
  return d;
});
const assignWeekLabel = computed(() => {
  const fmt = { month: 'short', day: 'numeric' };
  const s = assignWeekStart.value.toLocaleDateString('en-US', fmt);
  const e = assignWeekEnd.value.toLocaleDateString('en-US', fmt);
  return `${s} – ${e}, ${assignWeekEnd.value.getFullYear()}`;
});
const canPrevWeek = computed(() => assignModal.value.weekOffset > 0);

const assignWeekByDay = computed(() => {
  const today    = new Date().toISOString().slice(0, 10);
  const startKey = assignWeekStart.value.toISOString().slice(0, 10);
  const endKey   = assignWeekEnd.value.toISOString().slice(0, 10);
  const groups   = {};
  for (const s of upcomingShifts.value) {
    if (s.date < startKey || s.date > endKey || s.date < today) continue;
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
});

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

async function loadShifts() {
  try {
    const deptId = selectedDeptId.value;
    const qs = deptId ? `?id_department=${deptId}` : "";
    const res = await apiClient.get(`/shifts${qs}`);
    allShifts.value = res.data;
  } catch { /* non-critical */ }
}

function openAssignShift(list) {
  assignModal.value = {
    open: true,
    list,
    selectedShiftId: null,
    saving: false,
    error: "",
    weekOffset: 0,
  };
}

async function saveAssignShift() {
  if (!assignModal.value.selectedShiftId) {
    assignModal.value.error = "Please select a shift.";
    return;
  }
  // Check if already assigned
  try {
    const existing = await getShiftTaskLists(assignModal.value.selectedShiftId);
    if (existing.some(stl => stl.id_taskList === assignModal.value.list.id_taskList)) {
      assignModal.value.error = "This task list is already assigned to that shift.";
      return;
    }
  } catch { /* proceed anyway */ }

  assignModal.value.saving = true;
  assignModal.value.error = "";
  try {
    await apiClient.post("/shift-task-lists", {
      id_shift:    assignModal.value.selectedShiftId,
      id_taskList: assignModal.value.list.id_taskList,
    });
    assignModal.value.open = false;
  } catch (err) {
    assignModal.value.error = err.response?.data?.message || err.message || "Assignment failed.";
  } finally {
    assignModal.value.saving = false;
  }
}

// ── Add Existing Tasks ────────────────────────────────────────────────────────
const addExistingModal = ref({ open: false, list: null, selectedIds: [], search: "", saving: false, error: "" });

function openAddExisting(list) {
  addExistingModal.value = { open: true, list, selectedIds: [], search: "", saving: false, error: "" };
}

const filteredAvailable = computed(() => {
  const listId = addExistingModal.value.list?.id_taskList;
  const q = addExistingModal.value.search.toLowerCase();
  return tasks.value.filter(t => {
    if (t.id_taskList === listId) return false;
    if (q) return `${t.name} ${t.description}`.toLowerCase().includes(q);
    return true;
  });
});

async function saveAddExisting() {
  addExistingModal.value.saving = true;
  addExistingModal.value.error = "";
  const listId = addExistingModal.value.list.id_taskList;
  try {
    await Promise.all(
      addExistingModal.value.selectedIds.map(id => {
        const task = tasks.value.find(t => t.id_task === id);
        return apiClient.put(`/tasks/${id}`, { ...task, id_taskList: listId });
      })
    );
    // Update local state
    addExistingModal.value.selectedIds.forEach(id => {
      const idx = tasks.value.findIndex(t => t.id_task === id);
      if (idx !== -1) tasks.value[idx] = { ...tasks.value[idx], id_taskList: listId };
    });
    addExistingModal.value.open = false;
  } catch (err) {
    addExistingModal.value.error = err.response?.data?.message || err.message || "Failed to add tasks.";
  } finally {
    addExistingModal.value.saving = false;
  }
}

const tasksForList = (id) => tasks.value.filter(t => t.id_taskList === id);
const listName     = (id) => { const l = taskLists.value.find(l => l.id_taskList === id); return l?.name || "—"; };
const filteredTasks = computed(() => {
  const q = taskSearch.value.toLowerCase();
  return q ? tasks.value.filter(t => `${t.name} ${t.description}`.toLowerCase().includes(q)) : tasks.value;
});

// ── Modal ──
const modal = ref({ open: false, type: "", isEdit: false, data: {}, editId: null, saving: false, error: "" });

function openCreateModal() {
  if (activeTab.value === "lists") {
    modal.value = { open: true, type: "list", isEdit: false, data: { name: "", description: "" }, editId: null, saving: false, error: "" };
  } else {
    modal.value = { open: true, type: "task", isEdit: false, data: { name: "", description: "", id_taskList: taskLists.value[0]?.id_taskList || null }, editId: null, saving: false, error: "" };
  }
}
function openCreateTaskInList(list) {
  modal.value = { open: true, type: "task", isEdit: false, data: { name: "", description: "", id_taskList: list.id_taskList }, editId: null, saving: false, error: "" };
}
function openEditList(list) {
  modal.value = { open: true, type: "list", isEdit: true, data: { name: list.name, description: list.description || "" }, editId: list.id_taskList, saving: false, error: "" };
}
function openEditTask(task) {
  modal.value = { open: true, type: "task", isEdit: true, data: { name: task.name, description: task.description, id_taskList: task.id_taskList }, editId: task.id_task, saving: false, error: "" };
}
function closeModal() { modal.value.open = false; }

async function saveModal() {
  modal.value.saving = true; modal.value.error = "";
  const { type, isEdit, data, editId } = modal.value;
  try {
    if (type === "list") {
      if (!data.name) throw new Error("Name is required.");
      if (isEdit) {
        await apiClient.put(`/task-lists/${editId}`, data);
        const idx = taskLists.value.findIndex(l => l.id_taskList === editId);
        if (idx !== -1) taskLists.value[idx] = { ...taskLists.value[idx], ...data };
      } else {
        const res = await apiClient.post("/task-lists", { ...data, id_department: selectedDeptId.value || null });
        taskLists.value.push(res.data);
      }
    } else {
      if (!data.name) throw new Error("Name is required.");
      if (isEdit) {
        await apiClient.put(`/tasks/${editId}`, data);
        const idx = tasks.value.findIndex(t => t.id_task === editId);
        if (idx !== -1) tasks.value[idx] = { ...tasks.value[idx], ...data };
      } else {
        const res = await apiClient.post("/tasks", { ...data, id_department: selectedDeptId.value || null });
        tasks.value.push(res.data);
      }
    }
    closeModal();
  } catch (err) {
    modal.value.error = err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}

// ── Employee task view ─────────────────────────────────────────────────────────

function timeStrToHour(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

const { fmtHour } = usePreferences();

const empLoading    = ref(false);
const empActiveShift = ref(null);
const empTaskGroups  = ref([]);
const currentTimeHour = ref(new Date().getHours() + new Date().getMinutes() / 60);
let clockInterval = null;

const empTotalDone  = computed(() => empTaskGroups.value.reduce((acc, g) => acc + g.completedCount, 0));
const empTotalCount = computed(() => empTaskGroups.value.reduce((acc, g) => acc + g.totalCount, 0));

// Re-check active shift whenever the clock ticks
watch(currentTimeHour, () => { if (!isManager) loadEmployeeTasks(); });

async function loadEmployeeTasks() {
  empLoading.value = true;
  apiError.value = "";
  try {
    const deptId = selectedDeptId.value || currentUser.id_department;
    const deptQs = deptId ? `?id_department=${deptId}` : "";
    const today  = new Date().toISOString().slice(0, 10);
    const now    = currentTimeHour.value;
    const myId   = currentUser.id_employee;

    const [shiftsRes, assignRes, listsRes, tasksRes] = await Promise.all([
      apiClient.get(`/shifts${deptQs}`),
      apiClient.get("/shift-assignments"),
      apiClient.get(`/task-lists${deptQs}`),
      apiClient.get(`/tasks${deptQs}`),
    ]);

    taskLists.value = listsRes.data;
    tasks.value     = tasksRes.data;

    const todayShifts = shiftsRes.data.filter(s => s.date === today);
    const myAssigns   = assignRes.data.filter(a =>
      a.id_employee === myId && todayShifts.some(s => s.id_shift === a.id_shift)
    );

    // Find the shift currently in progress
    let active = null;
    for (const a of myAssigns) {
      const shift = todayShifts.find(s => s.id_shift === a.id_shift);
      if (!shift) continue;
      const startHour = timeStrToHour(shift.startTime);
      const endHour   = timeStrToHour(shift.endTime);
      if (startHour <= now && now < endHour) {
        active = { ...shift, startHour, endHour };
        break;
      }
    }

    empActiveShift.value = active;
    if (!active) { empTaskGroups.value = []; return; }

    // Load task lists assigned to this shift
    const stls    = await getShiftTaskLists(active.id_shift);
    const results = [];
    for (const stl of stls) {
      const statuses  = await getTaskListStatuses(stl.id_shiftTaskList);
      const taskList  = taskLists.value.find(l => l.id_taskList === stl.id_taskList);
      if (!taskList) continue;
      const enriched = statuses.map(s => ({
        ...s,
        taskName: tasks.value.find(t => t.id_task === s.id_task)?.name ?? `Task #${s.id_task}`,
      }));
      results.push({
        shiftTaskListId: stl.id_shiftTaskList,
        taskList,
        statuses:        enriched,
        completedCount:  enriched.filter(s => s.isCompleted).length,
        totalCount:      enriched.length,
      });
    }
    empTaskGroups.value = results;
  } catch (err) {
    apiError.value = "Could not load tasks: " + (err.message || "Network error");
  } finally {
    empLoading.value = false;
  }
}

async function toggleEmpTask(status) {
  const newVal = !status.isCompleted;
  try {
    await updateTaskComplete(status.id_shiftTaskListStatus, newVal);
    status.isCompleted = newVal;
    const group = empTaskGroups.value.find(g => g.shiftTaskListId === status.id_shiftTaskList);
    if (group) group.completedCount = group.statuses.filter(s => s.isCompleted).length;
  } catch { /* silent */ }
}

// ── Position Links ─────────────────────────────────────────────────────────────

const allPositions = ref([]);
const posLinkModal = ref({
  open: false,
  list: null,
  links: [],            // [{ id_positionTaskList, id_position, positionName }]
  selectedPositionId: null,
  saving: false,
  error: "",
});

// Positions not yet linked to this task list
const availablePositions = computed(() =>
  allPositions.value.filter(
    p => !posLinkModal.value.links.some(l => l.id_position === p.id_position)
  )
);

async function openPositionLink(list) {
  posLinkModal.value = {
    open: true,
    list,
    links: [],
    selectedPositionId: null,
    saving: false,
    error: "",
  };
  try {
    const deptId = selectedDeptId.value;
    const [posRes, linkRes] = await Promise.all([
      getPositions(deptId).catch(() => ({ data: [] })),
      getTaskListPositions(list.id_taskList).catch(() => []),
    ]);
    allPositions.value = posRes.data || [];
    // Enrich links with position name
    posLinkModal.value.links = linkRes.map(l => ({
      ...l,
      positionName: allPositions.value.find(p => p.id_position === l.id_position)?.name ?? `Position #${l.id_position}`,
    }));
    // Default selection to first available
    posLinkModal.value.selectedPositionId = availablePositions.value[0]?.id_position ?? null;
  } catch (err) {
    posLinkModal.value.error = "Could not load positions: " + (err.message || "Network error");
  }
}

async function linkPosition() {
  const { list, selectedPositionId } = posLinkModal.value;
  if (!selectedPositionId) return;
  posLinkModal.value.saving = true;
  posLinkModal.value.error  = "";
  try {
    const record = await addPositionTaskList(selectedPositionId, list.id_taskList);
    const pos = allPositions.value.find(p => p.id_position === selectedPositionId);
    posLinkModal.value.links.push({
      ...record,
      positionName: pos?.name ?? `Position #${selectedPositionId}`,
    });
    posLinkModal.value.selectedPositionId = availablePositions.value[0]?.id_position ?? null;
  } catch (err) {
    posLinkModal.value.error = err.response?.data?.message || err.message || "Could not link position.";
  } finally {
    posLinkModal.value.saving = false;
  }
}

async function unlinkPosition(link) {
  posLinkModal.value.saving = true;
  posLinkModal.value.error  = "";
  try {
    await removePositionTaskList(link.id_positionTaskList);
    posLinkModal.value.links = posLinkModal.value.links.filter(
      l => l.id_positionTaskList !== link.id_positionTaskList
    );
    if (!posLinkModal.value.selectedPositionId) {
      posLinkModal.value.selectedPositionId = availablePositions.value[0]?.id_position ?? null;
    }
  } catch (err) {
    posLinkModal.value.error = err.response?.data?.message || err.message || "Could not remove link.";
  } finally {
    posLinkModal.value.saving = false;
  }
}

// ── Delete ──
const deleteConfirm = ref({ open: false, type: "", item: null, label: "", saving: false });

function confirmDelete(type, item) {
  const label = type === "list" ? item.name : item.name;
  deleteConfirm.value = { open: true, type, item, label, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  const { type, item } = deleteConfirm.value;
  try {
    if (type === "list") {
      await apiClient.delete(`/task-lists/${item.id_taskList}`);
      taskLists.value = taskLists.value.filter(l => l.id_taskList !== item.id_taskList);
    } else {
      await apiClient.delete(`/tasks/${item.id_task}`);
      tasks.value = tasks.value.filter(t => t.id_task !== item.id_task);
    }
    deleteConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + err.message;
    deleteConfirm.value.open = false;
  } finally {
    deleteConfirm.value.saving = false;
  }
}
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'Satoshi', sans-serif; display: flex; flex-direction: column; flex: 1; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.nav-right { margin-left: auto; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 15px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 18px; font-weight: 600; color: var(--tx-heading); }
.nav-tabs { display: flex; gap: 2px; margin-left: 16px; }
.nav-tab { padding: 5px 14px; background: transparent; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 15px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; }
.nav-tab:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.primary-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
.primary-btn:hover { background: var(--accent-hover); }

.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 15px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 14px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; }

.page-header {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.page-heading { font-size: 24px; font-weight: 700; color: var(--tx-heading); }
.sub-tabs { display: flex; gap: 4px; margin-left: 8px; }
.sub-tab {
  padding: 6px 14px; background: none; border: 1px solid transparent;
  color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 15px;
  cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.sub-tab:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.sub-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.page-header .primary-btn { margin-left: auto; }

.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.panel-title { font-size: 24px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub { font-size: 15px; color: var(--tx-faint); }

.search-input { background: var(--bg-surface); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 14px; border-radius: 8px; font-size: 15px; font-family: 'Satoshi', sans-serif; outline: none; width: 260px; transition: border-color 0.15s; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-ghost); }

.lists-grid { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
.list-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 20px; }
.list-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.list-name { font-size: 18px; font-weight: 600; color: var(--tx-heading); margin-bottom: 4px; }
.list-desc { font-size: 14px; color: var(--tx-faint); }

.list-tasks { display: flex; flex-direction: column; gap: 1px; margin-bottom: 14px; border: 1px solid var(--bdr-strong); border-radius: 8px; overflow: hidden; }
.task-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-card); border-bottom: 1px solid var(--bdr-strong); transition: background 0.12s; }
.task-row:last-child { border-bottom: none; }
.task-row:hover { background: var(--bg-hover); }
.task-bullet { color: var(--accent); font-size: 20px; flex-shrink: 0; }
.task-name { font-size: 15px; font-weight: 500; color: var(--tx-primary); min-width: 160px; }
.task-desc { font-size: 14px; color: var(--tx-faint); flex: 1; }
.task-actions { display: flex; gap: 4px; margin-left: auto; }
.no-tasks { padding: 12px 14px; font-size: 14px; color: var(--tx-ghost); font-style: italic; background: var(--bg-card); }

.list-btn-row { display: flex; gap: 8px; margin-bottom: 0; }
.list-btn-row .add-task-btn { flex: 1; margin-bottom: 0; }
.add-task-btn { background: none; border: 1px dashed var(--bdr-medium); color: var(--tx-faint); width: 100%; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s; margin-bottom: 0; }
.add-task-btn:hover { border-color: var(--accent); color: var(--accent); }
.modal-lg { width: 520px; }
.existing-task-list { max-height: 300px; overflow-y: auto; border: 1px solid var(--bdr-medium); border-radius: 8px; margin-bottom: 14px; }
.existing-task-list::-webkit-scrollbar { width: 4px; }
.existing-task-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.existing-task-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--bdr-strong); transition: background 0.12s; }
.existing-task-row:last-child { border-bottom: none; }
.existing-task-row:hover { background: var(--bg-hover); }
.existing-task-row.selected { background: var(--bg-active); }
.task-checkbox { accent-color: var(--accent); width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
.existing-task-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.existing-task-info .task-name { font-size: 15px; font-weight: 500; color: var(--tx-primary); }
.existing-task-info .task-desc { font-size: 14px; color: var(--tx-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-action-row { display: flex; gap: 8px; margin-top: 8px; }
.card-action-row .assign-shift-btn,
.card-action-row .position-link-btn { margin-top: 0; flex: 1; }
.assign-shift-btn { background: none; border: 1px dashed var(--ok-text); color: var(--tx-ghost); width: 100%; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s; display: block; }
.assign-shift-btn:hover { border-color: var(--ok-text); color: var(--ok-text); }
.position-link-btn { background: none; border: 1px dashed var(--bdr-medium); color: var(--tx-ghost); width: 100%; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s; display: block; }
.position-link-btn:hover { border-color: var(--accent); color: var(--accent); }

/* ── Position link modal ── */
.modal-hint { font-size: 14px; color: var(--tx-faint); margin: -12px 0 18px; line-height: 1.5; }
.pos-link-section { margin-bottom: 20px; }
.pos-link-label { font-size: 12px; font-weight: 700; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
.pos-link-empty { font-size: 14px; color: var(--tx-ghost); font-style: italic; padding: 6px 0; }
.pos-link-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-card); border: 1px solid var(--bdr-strong); border-radius: 8px; margin-bottom: 6px; }
.pos-link-name { font-size: 15px; font-weight: 500; color: var(--tx-primary); }
.pos-unlink-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); font-size: 13px; padding: 3px 10px; border-radius: 6px; cursor: pointer; font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s; }
.pos-unlink-btn:hover:not(:disabled) { border-color: var(--err-text); color: var(--err-text); }
.pos-unlink-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pos-link-add-row { display: flex; gap: 8px; align-items: center; }
.pos-link-select { flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 15px; font-family: 'Satoshi', sans-serif; outline: none; transition: border-color 0.15s; }
.pos-link-select:focus { border-color: var(--accent); }
.pos-link-select option { background: var(--bg-modal); }
.form-hint { font-size: 13px; color: var(--tx-faint); font-style: italic; margin-top: 4px; }

.table-wrap { border-radius: 12px; border: 1px solid var(--bdr-subtle); overflow: hidden; max-width: 900px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.data-table thead { background: var(--bg-surface); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.task-name-cell { font-weight: 500; color: var(--tx-primary); }
.muted { color: var(--tx-faint); font-size: 14px; }
.empty-row { text-align: center; color: var(--tx-ghost); font-style: italic; padding: 32px 0 !important; }

.list-badge { background: var(--accent-bg); color: var(--accent-hover); font-size: 13px; font-weight: 600; padding: 2px 10px; border-radius: 100px; }

.action-btns { display: flex; gap: 6px; }
.icon-action { background: var(--bdr-subtle); border: none; color: var(--tx-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
.icon-action.sm { width: 24px; height: 24px; font-size: 13px; }
.icon-action:hover { background: var(--bg-active); color: var(--accent); }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.empty-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 48px; text-align: center; max-width: 900px; }
.empty-icon { font-size: 32px; margin-bottom: 12px; }
.empty-title { font-size: 18px; font-weight: 600; color: var(--tx-faint); margin-bottom: 6px; }
.empty-sub { font-size: 15px; color: var(--tx-ghost); }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-sm { width: 320px; }
.modal-title { font-size: 20px; font-weight: 700; color: var(--tx-primary); margin-bottom: 20px; }
.modal-body-text { font-size: 16px; color: var(--tx-muted); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-group label { font-size: 12px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group input, .form-group select { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 15px; font-family: 'Satoshi', sans-serif; outline: none; width: 100%; transition: border-color 0.15s; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }
.form-group select option { background: var(--bg-modal); }
.modal-error { font-size: 14px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 15px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 15px; font-weight: 600; transition: background 0.15s; }
.confirm-btn:hover { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm-btn.danger { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }

/* ── Shift picker modal ── */
.modal-shift { width: 480px; }

.spkr-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; background: var(--bg-panel); border: 1px solid var(--bdr-faint); border-radius: 8px; padding: 6px 8px; }
.spkr-nav-btn { background: none; border: none; color: var(--tx-muted); cursor: pointer; font-size: 20px; width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.12s, color 0.12s; }
.spkr-nav-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--accent); }
.spkr-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.spkr-week-label { font-size: 15px; font-weight: 600; color: var(--tx-primary); font-family: 'DM Mono', monospace; }

.spkr-body { max-height: 320px; overflow-y: auto; margin-bottom: 16px; display: flex; flex-direction: column; gap: 16px; }
.spkr-body::-webkit-scrollbar { width: 4px; }
.spkr-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.spkr-empty { text-align: center; padding: 32px 0; font-size: 15px; color: var(--tx-ghost); font-style: italic; }

.spkr-day-group { display: flex; flex-direction: column; gap: 4px; }
.spkr-day-header { font-size: 13px; font-weight: 700; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.08em; padding: 0 2px 6px; border-bottom: 1px solid var(--bdr-strong); margin-bottom: 2px; }

.spkr-shift-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--bdr-strong); background: var(--bg-card); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.spkr-shift-row:hover { border-color: var(--bdr-medium); background: var(--bg-hover); }
.spkr-shift-row.selected { border-color: var(--accent); background: var(--accent-subtle); }

.spkr-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--tx-muted); flex-shrink: 0; transition: border-color 0.15s, background 0.15s; position: relative; }
.spkr-radio.selected { border-color: var(--accent); background: var(--accent); }
.spkr-radio.selected::after { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: #fff; }

.spkr-shift-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.spkr-shift-name { font-size: 15px; font-weight: 600; color: var(--tx-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.spkr-shift-time { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-faint); }

/* ── Employee task view ── */
.emp-loading { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 80px 0; color: var(--tx-muted); }

.emp-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; text-align: center; max-width: 480px; margin: 0 auto; }
.emp-empty-icon { color: var(--tx-faint); margin-bottom: 20px; }
.emp-empty-title { font-size: 22px; font-weight: 700; color: var(--tx-secondary); margin-bottom: 10px; }
.emp-empty-sub { font-size: 16px; color: var(--tx-ghost); line-height: 1.6; }

.emp-shift-banner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; }
.emp-shift-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.emp-live-badge { background: var(--ok-bg); color: var(--ok-text); font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(34,197,94,0.3); letter-spacing: 0.04em; }
.emp-shift-name { font-size: 17px; font-weight: 600; color: var(--tx-heading); }
.emp-shift-time { font-size: 15px; font-family: 'DM Mono', monospace; color: var(--tx-faint); }
.emp-overall-progress { display: flex; align-items: center; gap: 10px; }
.emp-overall-bar { width: 140px; height: 6px; background: var(--bdr-subtle); border-radius: 3px; overflow: hidden; }
.emp-overall-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.4s ease; }
.emp-overall-count { font-size: 14px; font-family: 'DM Mono', monospace; color: var(--tx-faint); white-space: nowrap; }

.emp-lists-grid { display: flex; flex-direction: column; gap: 16px; max-width: 700px; }

.emp-list-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; overflow: hidden; }
.emp-list-header { padding: 16px 20px 14px; border-bottom: 1px solid var(--bdr-strong); }
.emp-list-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.emp-list-name { font-size: 17px; font-weight: 700; color: var(--tx-heading); }
.emp-list-count { font-size: 14px; font-family: 'DM Mono', monospace; color: var(--tx-ghost); background: var(--bg-hover); border: 1px solid var(--bdr-faint); border-radius: 10px; padding: 2px 9px; transition: color 0.2s, background 0.2s; }
.emp-list-count.complete { color: var(--ok-text); background: var(--ok-bg); border-color: rgba(34,197,94,0.3); }
.emp-list-bar { height: 5px; background: var(--bdr-subtle); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
.emp-list-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.4s ease; }
.emp-list-desc { font-size: 14px; color: var(--tx-faint); margin-top: 2px; }

.emp-task-list { display: flex; flex-direction: column; }
.emp-task-row { display: flex; align-items: center; gap: 12px; padding: 13px 20px; border-bottom: 1px solid var(--bdr-strong); cursor: pointer; transition: background 0.12s; }
.emp-task-row:last-child { border-bottom: none; }
.emp-task-row:hover { background: var(--bg-hover); }
.emp-task-row.done { background: var(--bg-card); }
.emp-check {
  width: 20px; height: 20px; flex-shrink: 0;
  border-radius: 6px;
  border: 2px solid var(--tx-muted);
  background: var(--bg-input);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  padding: 0;
}
.emp-task-row:hover .emp-check { border-color: var(--accent); }
.emp-check.done { background: var(--accent); border-color: var(--accent); color: #fff; }
.emp-task-label { font-size: 16px; color: var(--tx-primary); flex: 1; line-height: 1.4; }
.emp-task-label.done { color: var(--tx-faint); text-decoration: line-through; text-decoration-color: var(--tx-ghost); }
.emp-done-badge { font-size: 12px; font-weight: 600; color: var(--ok-text); background: var(--ok-bg); border-radius: 10px; padding: 2px 8px; border: 1px solid rgba(34,197,94,0.25); flex-shrink: 0; }
</style>