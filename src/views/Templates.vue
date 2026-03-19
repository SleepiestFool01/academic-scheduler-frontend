<template>
  <div class="page-root">

    <!-- ── Top Nav ── -->
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
        <h1 class="page-title">Templates</h1>
      </div>
      <div class="nav-right">
        <button class="primary-btn" @click="openCreate">+ New Template</button>
      </div>
    </div>

    <!-- ── Loading / Error ── -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading templates…</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadTemplates">Retry</button>
    </div>

    <!-- ── Content ── -->
    <div class="content">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Schedule Templates</h2>
          <p class="panel-sub">
            Build reusable schedule templates filled with shifts, then apply them to any week.
          </p>
        </div>
        <input v-model="search" class="search-input" placeholder="Search templates…" />
      </div>

      <!-- Empty state -->
      <div v-if="!loading && filteredTemplates.length === 0 && !apiError" class="empty-card">
        <p class="empty-icon">🗓</p>
        <p class="empty-title">{{ search ? 'No templates match your search.' : 'No templates yet' }}</p>
        <p v-if="!search" class="empty-sub">
          Create a template to define a reusable schedule — add shifts, assign employees, and apply it any week.
        </p>
        <button v-if="!search" class="primary-btn" style="margin-top:16px;" @click="openCreate">
          + New Template
        </button>
      </div>

      <!-- Template cards grid -->
      <div class="templates-grid">
        <div v-for="tpl in filteredTemplates" :key="tpl.id_template" class="template-card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-name">{{ tpl.name }}</h3>
              <div class="card-actions">
                <button class="icon-action" title="Edit" @click="openEdit(tpl)">✎</button>
                <button class="icon-action danger" title="Delete" @click="confirmDelete(tpl)">✕</button>
              </div>
            </div>
            <p class="card-desc">{{ tpl.description || 'No description' }}</p>
          </div>
          <div class="card-meta">
            <span class="meta-chip">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="opacity:.6">
                <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Created {{ formatDate(tpl.createdAt) }}
            </span>
          </div>
          <div class="card-footer">
            <button class="outline-btn" @click="router.push('/templates/' + tpl.id_template)">
              Open Editor
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create / Edit Modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3 class="modal-title">{{ modal.isEdit ? 'Edit Template' : 'New Template' }}</h3>

          <div class="form-group">
            <label>Name</label>
            <input
              v-model="modal.data.name"
              type="text"
              placeholder="e.g. Standard Week, Summer Schedule"
              @keyup.enter="saveModal"
            />
          </div>
          <div class="form-group">
            <label>Description <span class="optional">(optional)</span></label>
            <textarea
              v-model="modal.data.description"
              placeholder="Describe when or how this template is used…"
              rows="3"
            />
          </div>

          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving || !modal.data.name.trim()" @click="saveModal">
              {{ modal.saving ? 'Saving…' : modal.isEdit ? 'Save Changes' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete Confirm ── -->
    <Transition name="modal">
      <div v-if="deleteConfirm.open" class="modal-overlay" @click.self="deleteConfirm.open = false">
        <div class="modal modal-sm">
          <h3 class="modal-title">Delete "{{ deleteConfirm.template?.name }}"?</h3>
          <p class="modal-body-text">This template and all its shifts will be permanently removed. This cannot be undone.</p>
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
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from "../services/templateService.js";

const router   = useRouter();
const loading  = ref(false);
const apiError = ref("");
const search   = ref("");

const templates = ref([]);

const filteredTemplates = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.description || "").toLowerCase().includes(q)
  );
});

async function loadTemplates() {
  loading.value = true;
  apiError.value = "";
  try {
    templates.value = await fetchTemplates();
  } catch (err) {
    apiError.value = "Could not load templates: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

onMounted(loadTemplates);

// ── Modal ──────────────────────────────────────────────────────────────────────
const modal = ref({
  open: false,
  isEdit: false,
  id: null,
  data: { name: "", description: "" },
  saving: false,
  error: "",
});

function openCreate() {
  modal.value = { open: true, isEdit: false, id: null, data: { name: "", description: "" }, saving: false, error: "" };
}

function openEdit(tpl) {
  modal.value = {
    open: true,
    isEdit: true,
    id: tpl.id_template,
    data: { name: tpl.name, description: tpl.description || "" },
    saving: false,
    error: "",
  };
}

function closeModal() {
  modal.value.open = false;
}

async function saveModal() {
  if (!modal.value.data.name.trim()) {
    modal.value.error = "Name is required.";
    return;
  }
  modal.value.saving = true;
  modal.value.error = "";
  try {
    if (modal.value.isEdit) {
      const updated = await updateTemplate(modal.value.id, modal.value.data);
      const idx = templates.value.findIndex(t => t.id_template === modal.value.id);
      if (idx !== -1) templates.value[idx] = updated;
    } else {
      const created = await createTemplate(modal.value.data);
      router.push('/templates/' + created.id_template);
      return;
    }
    closeModal();
  } catch (err) {
    modal.value.error = err.response?.data?.message || err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────────
const deleteConfirm = ref({ open: false, template: null, saving: false });

function confirmDelete(tpl) {
  deleteConfirm.value = { open: true, template: tpl, saving: false };
}

async function executeDelete() {
  deleteConfirm.value.saving = true;
  try {
    await deleteTemplate(deleteConfirm.value.template.id_template);
    templates.value = templates.value.filter(t => t.id_template !== deleteConfirm.value.template.id_template);
    deleteConfirm.value.open = false;
  } catch (err) {
    // Show error inline if needed — for now just close
    deleteConfirm.value.open = false;
    apiError.value = err.response?.data?.message || err.message || "Delete failed.";
  } finally {
    deleteConfirm.value.saving = false;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
</script>

<style scoped>
/* ── Root ── */
.page-root {
  min-height: 100vh;
  background: #07070d;
  color: #f0e6d3;
  font-family: 'DM Sans', sans-serif;
}

/* ── Top Nav ── */
.topnav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #0d0d14;
  border-bottom: 1px solid #1e1e2e;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color .15s, background .15s;
}
.back-btn:hover { color: #f0e6d3; background: #1a1a2e; }
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #f0e6d3;
  margin: 0;
  letter-spacing: -.2px;
}
.primary-btn {
  background: #FF1744;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.primary-btn:hover { opacity: .85; }

/* ── Loading / Error ── */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: 14px;
}
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid #1e1e2e;
  border-top-color: #FF1744;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #666; font-size: 13px; }
.error-banner {
  background: #2a0a10;
  border: 1px solid #FF1744;
  color: #ff6b7a;
  padding: 10px 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.retry-btn {
  background: none;
  border: 1px solid #FF1744;
  color: #FF1744;
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}

/* ── Content ── */
.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 60px;
}
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.panel-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #f0e6d3;
}
.panel-sub {
  font-size: 13px;
  color: #666;
  margin: 0;
}
.search-input {
  background: #13131f;
  border: 1px solid #2a2a3e;
  border-radius: 7px;
  padding: 7px 12px;
  color: #f0e6d3;
  font-size: 13px;
  width: 220px;
  outline: none;
  transition: border-color .15s;
}
.search-input:focus { border-color: #FF1744; }
.search-input::placeholder { color: #444; }

/* ── Empty State ── */
.empty-card {
  text-align: center;
  padding: 64px 24px;
  background: #0d0d14;
  border: 1px dashed #2a2a3e;
  border-radius: 12px;
}
.empty-icon { font-size: 40px; margin: 0 0 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: #f0e6d3; margin: 0 0 6px; }
.empty-sub   { font-size: 13px; color: #555; margin: 0; }

/* ── Templates Grid ── */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.template-card {
  background: #0d0d14;
  border: 1px solid #1e1e2e;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.template-card:hover {
  border-color: #2a2a3e;
  box-shadow: 0 4px 20px rgba(0,0,0,.4);
}
.card-header { display: flex; flex-direction: column; gap: 6px; }
.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #f0e6d3;
  margin: 0;
  line-height: 1.3;
}
.card-desc {
  font-size: 12px;
  color: #555;
  margin: 0;
  line-height: 1.5;
}
.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.icon-action {
  background: none;
  border: 1px solid #2a2a3e;
  color: #888;
  border-radius: 5px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color .15s, border-color .15s, background .15s;
}
.icon-action:hover { color: #f0e6d3; border-color: #555; background: #1a1a2e; }
.icon-action.danger:hover { color: #FF1744; border-color: #FF1744; background: #1a000a; }

.card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #13131f;
  border: 1px solid #1e1e2e;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  color: #555;
  font-family: 'DM Mono', monospace;
}
.card-footer {
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px solid #1a1a2a;
}
.outline-btn {
  width: 100%;
  background: none;
  border: 1px solid #2a2a3e;
  color: #888;
  border-radius: 7px;
  padding: 7px 0;
  font-size: 13px;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.outline-btn:hover { color: #f0e6d3; border-color: #555; background: #13131f; }

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #13131f;
  border: 1px solid #2a2a3e;
  border-radius: 12px;
  padding: 28px;
  width: 420px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal.modal-sm { width: 340px; }
.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #f0e6d3;
  margin: 0;
}
.modal-body-text {
  font-size: 13px;
  color: #777;
  margin: 0;
  line-height: 1.5;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.form-group input,
.form-group textarea {
  background: #0d0d14;
  border: 1px solid #2a2a3e;
  border-radius: 7px;
  padding: 9px 12px;
  color: #f0e6d3;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  transition: border-color .15s;
  resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus { border-color: #FF1744; }
.form-group input::placeholder,
.form-group textarea::placeholder { color: #444; }
.optional { color: #555; font-weight: 400; text-transform: none; letter-spacing: 0; }
.modal-error { color: #FF1744; font-size: 12px; margin: 0; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}
.cancel-btn {
  background: none;
  border: 1px solid #2a2a3e;
  color: #888;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: color .15s, border-color .15s;
}
.cancel-btn:hover { color: #f0e6d3; border-color: #555; }
.confirm-btn {
  background: #FF1744;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.confirm-btn:disabled { opacity: .45; cursor: not-allowed; }
.confirm-btn:not(:disabled):hover { opacity: .85; }
.confirm-btn.danger { background: #c0392b; }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity .15s, transform .15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.97); }
</style>
