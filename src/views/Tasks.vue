<template>
  <div class="page-root">
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
        <h1 class="page-title">Tasks</h1>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab" :class="{ active: activeTab === 'lists' }" @click="activeTab = 'lists'">Task Lists</button>
        <button class="nav-tab" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">All Tasks</button>
      </div>
      <div class="nav-right">
        <button v-if="isManager" class="primary-btn" @click="openCreateModal">
          + {{ activeTab === 'lists' ? 'New Task List' : 'New Task' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">{{ apiError }}<button class="retry-btn" @click="loadAll">Retry</button></div>

    <div class="content">

      <!-- ══ TASK LISTS TAB ══ -->
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
              <div v-if="isManager" class="action-btns">
                <button class="icon-action" @click="openEditList(list)">✎</button>
                <button class="icon-action danger" @click="confirmDelete('list', list)">✕</button>
              </div>
            </div>

            <div class="list-tasks">
              <div v-for="task in tasksForList(list.id_taskList)" :key="task.id_task" class="task-row">
                <span class="task-bullet">·</span>
                <span class="task-name">{{ task.name }}</span>
                <span class="task-desc">{{ task.description }}</span>
                <div v-if="isManager" class="task-actions">
                  <button class="icon-action sm" @click="openEditTask(task)">✎</button>
                  <button class="icon-action sm danger" @click="confirmDelete('task', task)">✕</button>
                </div>
              </div>
              <div v-if="tasksForList(list.id_taskList).length === 0" class="no-tasks">No tasks in this list yet.</div>
            </div>

            <template v-if="isManager">
              <div class="list-btn-row">
                <button class="add-task-btn" @click="openCreateTaskInList(list)">+ New Task</button>
                <button class="add-task-btn" @click="openAddExisting(list)">+ Add Existing</button>
              </div>
              <button class="assign-shift-btn" @click="openAssignShift(list)">⟶ Assign to Shift</button>
            </template>
          </div>
        </div>
      </div>

      <!-- ══ ALL TASKS TAB ══ -->
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
                <th>Task</th><th>Description</th><th>Task List</th>
                <th v-if="isManager">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.id_task">
                <td class="task-name-cell">{{ task.name }}</td>
                <td class="muted">{{ task.description }}</td>
                <td><span class="list-badge">{{ listName(task.id_taskList) }}</span></td>
                <td v-if="isManager">
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
              <label>Description</label>
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
        <div class="modal">
          <h3 class="modal-title">Assign "{{ assignModal.list?.name }}" to a Shift</h3>
          <div class="form-group">
            <label>Select Shift</label>
            <select v-model="assignModal.selectedShiftId">
              <option :value="null" disabled>Pick a shift…</option>
              <option v-for="s in upcomingShifts" :key="s.id_shift" :value="s.id_shift">
                {{ s.date }} — {{ s.name }}
              </option>
            </select>
            <p v-if="upcomingShifts.length === 0" class="form-hint">No upcoming shifts found.</p>
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
import { ref, computed, onMounted, watch } from "vue";
import { useDepartment } from "../composables/useDepartment.js";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import apiClient from "../services/services.js";
import { getShiftTaskLists } from "../services/taskService.js";

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
watch(selectedDeptId, () => { loadAll(); loadShifts(); });
onMounted(() => { loadAll(); loadShifts(); });

// ── Shifts (for task list assignment) ─────────────────────────────────────────
const allShifts  = ref([]);
const assignModal = ref({ open: false, list: null, selectedShiftId: null, saving: false, error: "" });

const upcomingShifts = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return allShifts.value
    .filter(s => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
});

async function loadShifts() {
  try {
    const res = await apiClient.get("/shifts");
    allShifts.value = res.data;
  } catch { /* non-critical */ }
}

function openAssignShift(list) {
  assignModal.value = {
    open: true,
    list,
    selectedShiftId: upcomingShifts.value[0]?.id_shift ?? null,
    saving: false,
    error: "",
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
      if (!data.name || !data.description) throw new Error("Name and description are required.");
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
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.topnav { display: flex; align-items: center; gap: 16px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.nav-left { display: flex; align-items: center; gap: 12px; }
.nav-right { margin-left: auto; }
.back-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: color 0.15s; }
.back-btn:hover { color: var(--accent); }
.page-title { font-size: 16px; font-weight: 600; color: var(--tx-heading); }
.nav-tabs { display: flex; gap: 2px; margin-left: 16px; }
.nav-tab { padding: 5px 14px; background: transparent; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; }
.nav-tab:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.primary-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.primary-btn:hover { background: var(--accent-hover); }

.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }

.content { flex: 1; overflow-y: auto; padding: 32px 36px; }
.content::-webkit-scrollbar { width: 6px; }
.content::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.panel-title { font-size: 22px; font-weight: 700; color: var(--tx-heading); margin-bottom: 4px; }
.panel-sub { font-size: 13px; color: var(--tx-faint); }

.search-input { background: var(--bg-surface); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 14px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 260px; transition: border-color 0.15s; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--tx-ghost); }

.lists-grid { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
.list-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 20px; }
.list-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.list-name { font-size: 16px; font-weight: 600; color: var(--tx-heading); margin-bottom: 4px; }
.list-desc { font-size: 12px; color: var(--tx-faint); }

.list-tasks { display: flex; flex-direction: column; gap: 1px; margin-bottom: 14px; border: 1px solid var(--bdr-strong); border-radius: 8px; overflow: hidden; }
.task-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-card); border-bottom: 1px solid var(--bdr-strong); transition: background 0.12s; }
.task-row:last-child { border-bottom: none; }
.task-row:hover { background: var(--bg-hover); }
.task-bullet { color: var(--accent); font-size: 18px; flex-shrink: 0; }
.task-name { font-size: 13px; font-weight: 500; color: var(--tx-primary); min-width: 160px; }
.task-desc { font-size: 12px; color: var(--tx-faint); flex: 1; }
.task-actions { display: flex; gap: 4px; margin-left: auto; }
.no-tasks { padding: 12px 14px; font-size: 12px; color: var(--tx-ghost); font-style: italic; background: var(--bg-card); }

.list-btn-row { display: flex; gap: 8px; margin-bottom: 0; }
.list-btn-row .add-task-btn { flex: 1; margin-bottom: 0; }
.add-task-btn { background: none; border: 1px dashed var(--bdr-medium); color: var(--tx-faint); width: 100%; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; transition: border-color 0.15s, color 0.15s; margin-bottom: 0; }
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
.existing-task-info .task-name { font-size: 13px; font-weight: 500; color: var(--tx-primary); }
.existing-task-info .task-desc { font-size: 12px; color: var(--tx-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.assign-shift-btn { background: none; border: 1px dashed var(--ok-text); color: var(--tx-ghost); width: 100%; padding: 8px; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; margin-top: 8px; transition: border-color 0.15s, color 0.15s; display: block; }
.assign-shift-btn:hover { border-color: var(--ok-text); color: var(--ok-text); }
.form-hint { font-size: 11px; color: var(--tx-faint); font-style: italic; margin-top: 4px; }

.table-wrap { border-radius: 12px; border: 1px solid var(--bdr-subtle); overflow: hidden; max-width: 900px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-surface); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.task-name-cell { font-weight: 500; color: var(--tx-primary); }
.muted { color: var(--tx-faint); font-size: 12px; }
.empty-row { text-align: center; color: var(--tx-ghost); font-style: italic; padding: 32px 0 !important; }

.list-badge { background: var(--accent-bg); color: var(--accent-hover); font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 100px; }

.action-btns { display: flex; gap: 6px; }
.icon-action { background: var(--bdr-subtle); border: none; color: var(--tx-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
.icon-action.sm { width: 24px; height: 24px; font-size: 11px; }
.icon-action:hover { background: var(--bg-active); color: var(--accent); }
.icon-action.danger:hover { background: var(--err-bg); color: var(--err-text); }

.empty-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 48px; text-align: center; max-width: 900px; }
.empty-icon { font-size: 32px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: var(--tx-faint); margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: var(--tx-ghost); }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-sm { width: 320px; }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 20px; }
.modal-body-text { font-size: 14px; color: var(--tx-muted); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-group label { font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group input, .form-group select { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 100%; transition: border-color 0.15s; }
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }
.form-group select option { background: var(--bg-modal); }
.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.confirm-btn:hover { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm-btn.danger { background: var(--danger-btn); }
.confirm-btn.danger:hover { background: var(--danger-btn-h); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>