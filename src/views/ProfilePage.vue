<template>
  <div class="page-root">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>
    <div v-if="apiError" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <div class="content">
      <!-- ── Profile view: see profile information ── -->
      <div class="profile-body">
        <div class="profile-avatar-lg">
          <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
        <h2 class="profile-name">{{ currentUser?.fName }} {{ currentUser?.lName }}</h2>
        <p class="profile-email">{{ currentUser?.email }}</p>
        <span class="profile-role-badge" :class="currentUser?.role?.toLowerCase()">{{ currentUser?.role }}</span>
        <button class="edit-profile-btn" @click="openEditProfile(currentUser)">Edit Profile</button>
        <p class="profile-bio">{{ currentUser?.bio }}</p>
      </div>
    </div>

    <!-- ── Profile edit modal ── -->
    <Transition name="modal">
      <div v-if="modal.open" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <h3 class="modal-title">Update Profile</h3>
          <div class="form-group">
            <label>First Name</label>
            <input v-model="modal.data.fName" type="string" placeholder="First Name" />
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input v-model="modal.data.lName" type="string" placeholder="Last Name" />
          </div>
          <div class="form-group">
            <label>Bio (Optional)</label>
            <input v-model="modal.data.bio" type="text" placeholder="Write something about yourself" />
          </div>
          <p v-if="modal.error" class="modal-error">{{ modal.error }}</p>
          <div class="modal-actions">
            <button class="cancel-btn" @click="closeModal">Cancel</button>
            <button class="confirm-btn" :disabled="modal.saving" @click="saveModal">
              {{ modal.saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import apiClient from "../services/services.js";

const router      = useRouter();
const currentUser = ref(Utils.getStore("user") || {});
const isManager   = computed(() => currentUser.value.role === "Manager" || currentUser.value.role === "Admin");
const isEmployee  = computed(() => currentUser.value.role === "Employee" || isManager.value);
const userInitials = computed(() => {
  if (currentUser.value?.fName && currentUser.value?.lName) {
    return `${currentUser.value.fName[0]}${currentUser.value.lName[0]}`;
  }
  return "?";
});



// ── Profile edit modal ──
const modal = ref({ open: false, data: {}, editId: null, saving: false, error: "" });

function openEditProfile(employee) {
  modal.value = {
    open: true,
    data: {
      fName: employee?.fName || "",
      lName: employee?.lName || "",
      bio: employee?.bio || "",
    },
    editId: employee?.id_employee || null,
    saving: false,
    error: "",
  };
}

function closeModal() { modal.value.open = false; }

async function saveModal() {
  modal.value.saving = true;
  modal.value.error = "";
  const { data, editId } = modal.value;
  try {
    // Throw error if first and last name fields are empty
    if (!data.fName || !data.lName)
      throw new Error("First and last name are required.");
    const payload = { ...data };
    await apiClient.put(`/employees/${editId}`, payload);
    // Fetch the updated employee data
    const updatedRes = await apiClient.get(`/employees/${editId}`);
    const updatedUser = updatedRes.data;
    // Preserve existing user fields like picture, token, etc.
    const mergedUser = { ...currentUser.value, ...updatedUser };
    // Update store and local ref
    Utils.setStore("user", mergedUser);
    currentUser.value = mergedUser;
    closeModal();
  } catch (err) {
    modal.value.error = err.message || "Save failed.";
  } finally {
    modal.value.saving = false;
  }
}


</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.page-root { font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; height: 100vh; background: var(--bg-page); color: var(--tx-primary); overflow: hidden; }

.content { flex: 1; overflow-y: auto; padding: 48px 36px; display: flex; flex-direction: column; align-items: center; }

.edit-profile-btn {
  display: flex; align-items: center; justify-content: center;
  margin: 16px auto 0;
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-family: 'Satoshi', 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.15s, transform 0.12s;
}
.edit-profile-btn:hover  { background: var(--accent-hover); transform: translateY(-1px); }
.edit-profile-btn:active { transform: translateY(0); }

.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

.profile-body { padding: 0 24px 20px; text-align: center; }
.profile-avatar-lg {
  width: 160px; height: 160px; border-radius: 50%;
  background: linear-gradient(135deg, #FF1744, #F0E6D3);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; color: #fff;
  margin: 0 auto;
  overflow: hidden;
  border: 2px solid var(--accent-border);
}
.profile-name { font-size: 28px; font-weight: 700; color: var(--tx-heading); margin-bottom: 6px; }
.profile-email { font-size: 18px; color: var(--tx-faint); margin-bottom: 12px; font-family: 'DM Mono', monospace; }
.profile-role-badge {
  display: inline-block; padding: 3px 14px; border-radius: 100px;
  font-size: 15px; font-weight: 600;
}
.profile-role-badge.employee { background: rgba(255,23,68,0.1);  color: #FF4569; }
.profile-role-badge.manager  { background: rgba(240,230,211,0.1); color: #c8903a; }
.profile-role-badge.admin    { background: rgba(74,144,164,0.15); color: #4A90A4; }
.profile-bio { font-size: 15px; font-weight: 600; color: var(--tx-secondary); margin-top: 24px; margin-bottom: 6px; }

.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-group label { font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.form-group input { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 8px 10px; border-radius: 8px; font-size: 13px;
  font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; width: 100%; }
.optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; }
.form-group select { background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 100%; }
.form-group select:focus { border-color: var(--accent); }
.modal-error { font-size: 12px; color: var(--err-text); margin-bottom: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: none; border: 1px solid var(--bdr-medium); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.cancel-btn:hover { border-color: var(--bdr-subtle); color: var(--tx-secondary); }
.confirm-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.confirm-btn:hover { background: var(--accent-hover); }
.confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
</style>