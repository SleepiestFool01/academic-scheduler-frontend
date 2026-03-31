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
          <div v-if="!noDeptsYet" class="nav-dept-switcher">
            <div class="nav-divider"></div>
            <DeptSwitcher />
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
            <button class="request-access-btn" style="margin-left: auto;" @click="openRequestModal" title="Request access to manage another department">
              + Request Another Department
            </button>
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
                <div class="ov-label">Employees</div>
                <div class="ov-value ov-big">{{ employees.length }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Positions</div>
                <div class="ov-value ov-big">{{ positions.length }}</div>
              </div>
              <div class="overview-card">
                <div class="ov-label">Open Today</div>
                <template v-if="!activeSeason">
                  <div class="ov-value ov-faint">No active season</div>
                </template>
                <template v-else-if="todayEntry">
                  <div class="ov-open-badge">Open</div>
                  <div class="ov-today-hours">{{ fmtTime(todayEntry.startTime) }} – {{ fmtTime(todayEntry.endTime) }}</div>
                </template>
                <template v-else>
                  <div class="ov-closed-badge">Closed</div>
                </template>
              </div>
            </div>

            <div class="overview-wide-grid">
              <!-- Hours of Operation -->
              <div class="overview-card">
                <div class="ov-label">
                  Hours of Operation
                  <span v-if="activeSeason" class="ov-season-badge">{{ activeSeason }}</span>
                  <span v-else class="ov-no-season">No active season</span>
                </div>
                <div v-if="activeSeason" class="ov-hours-list">
                  <div v-for="day in DAYS" :key="day" class="ov-hours-row">
                    <span class="ov-hours-day">{{ day.slice(0, 3) }}</span>
                    <span v-if="getEntryForSeasonDay(activeSeason, day)" class="ov-hours-time">
                      {{ fmtTime(getEntryForSeasonDay(activeSeason, day).startTime) }} – {{ fmtTime(getEntryForSeasonDay(activeSeason, day).endTime) }}
                    </span>
                    <span v-else class="ov-hours-closed">Closed</span>
                  </div>
                </div>
                <div v-else class="ov-empty-hint">Go to Hours to configure and activate a season.</div>
              </div>

              <!-- Upcoming Events + Next Event highlight -->
              <div class="overview-card">
                <div class="ov-label">
                  Upcoming Events
                  <span class="ov-count-badge">{{ upcomingEvents.length }}</span>
                </div>
                <div v-if="upcomingEvents.length === 0" class="ov-empty-hint">No upcoming events scheduled.</div>
                <template v-else>
                  <!-- Next Event highlight -->
                  <div class="ov-next-event" v-if="nextEvent">
                    <div class="ov-next-label">Next Up</div>
                    <div class="ov-next-body">
                      <div class="ov-event-date">
                        <span class="ov-event-month">{{ eventMonth(nextEvent.start_time) }}</span>
                        <span class="ov-event-day">{{ eventDay(nextEvent.start_time) }}</span>
                      </div>
                      <div class="ov-event-info">
                        <span class="ov-event-title ov-next-title">{{ nextEvent.title }}</span>
                        <span v-if="nextEvent.start_time" class="ov-event-time">{{ eventStartTime(nextEvent) }}</span>
                        <span v-if="nextEvent.location" class="ov-event-time">📍 {{ nextEvent.location }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- Full list -->
                  <div v-if="upcomingEvents.length > 1" class="ov-events-list ov-events-rest">
                    <div v-for="ev in upcomingEvents.slice(1)" :key="ev.id_event" class="ov-event-row">
                      <div class="ov-event-date ov-event-date-sm">
                        <span class="ov-event-month">{{ eventMonth(ev.start_time) }}</span>
                        <span class="ov-event-day">{{ eventDay(ev.start_time) }}</span>
                      </div>
                      <div class="ov-event-info">
                        <span class="ov-event-title">{{ ev.title }}</span>
                        <span v-if="ev.start_time" class="ov-event-time">{{ eventStartTime(ev) }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Managers -->
            <div class="overview-card ov-managers-card">
              <div class="ov-label">Managers</div>
              <div v-if="deptManagers.length === 0" class="ov-empty-hint">No managers assigned.</div>
              <div v-else class="ov-managers-list">
                <span v-for="name in deptManagers" :key="name" class="ov-manager-chip">{{ name }}</span>
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

          <!-- ════ EMPLOYEES TAB ════ -->
          <div v-else-if="activeTab === 'Employees'" class="tab-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Employees</h2>
                <p class="panel-sub">{{ employees.length }} member{{ employees.length !== 1 ? 's' : '' }}</p>
              </div>
              <div style="display:flex;gap:10px;align-items:center;">
                <input v-model="empSearch" class="search-input" placeholder="Search by name or email…" />
                <button class="primary-btn" @click="openCreateEmployee">+ Add Employee</button>
              </div>
            </div>
            <div v-if="employees.length === 0" class="empty-state">No employees yet. Add one to get started.</div>
            <div v-else class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  <tr v-for="emp in filteredEmployees" :key="emp.id_employee">
                    <td>
                      <div class="emp-name-cell">
                        <div class="emp-avatar" :style="{ background: empColor(emp) }">{{ empInitials(emp) }}</div>
                        {{ emp.fName }} {{ emp.lName }}
                      </div>
                    </td>
                    <td class="muted">{{ emp.email }}</td>
                    <td><span class="role-badge" :class="emp.role?.toLowerCase()">{{ emp.role }}</span></td>
                    <td>
                      <div class="action-btns">
                        <button class="icon-action" title="Edit" @click="openEditEmployee(emp)">✎</button>
                        <button class="icon-action danger" title="Remove" @click="confirmDeleteEmployee(emp)">✕</button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="filteredEmployees.length === 0">
                    <td colspan="4" class="empty-row">No employees match your search.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ════ HOURS TAB ════ -->
          <div v-else-if="activeTab === 'Hours'" class="tab-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Hours of Operation</h2>
                <p class="panel-sub">
                  {{ groupedBySeasons.length }} season{{ groupedBySeasons.length !== 1 ? 's' : '' }}
                  <span v-if="activeSeason" class="active-season-badge">{{ activeSeason }} active</span>
                </p>
              </div>
              <button class="primary-btn" @click="openCreateSeason">+ Create Season</button>
            </div>
            <div v-if="groupedBySeasons.length === 0" class="empty-state">No seasons configured yet. Create a season to set your hours of operation.</div>
            <div v-else class="seasons-grid">
              <div v-for="group in groupedBySeasons" :key="group.name" class="season-card"
                :class="{ 'season-card--active': group.name === activeSeason }">
                <div class="season-card-header">
                  <div class="season-name-row">
                    <span class="season-name">{{ group.name }}</span>
                    <span v-if="group.name === activeSeason" class="active-chip">Active</span>
                  </div>
                  <div class="action-btns">
                    <button class="icon-action" title="Edit Hours" @click="openSeasonHoursModal(group.name)">✎</button>
                    <button class="icon-action danger" title="Delete Season" @click="confirmDeleteSeason(group.name)">✕</button>
                  </div>
                </div>
                <div class="season-days">
                  <div v-for="day in DAYS" :key="day" class="season-day-row">
                    <span class="season-day-label">{{ day.slice(0, 3) }}</span>
                    <span v-if="getEntryForSeasonDay(group.name, day)" class="season-day-hours mono">
                      {{ fmtTime(getEntryForSeasonDay(group.name, day).startTime) }} – {{ fmtTime(getEntryForSeasonDay(group.name, day).endTime) }}
                    </span>
                    <span v-else class="season-day-closed">Closed</span>
                  </div>
                </div>
                <div class="season-card-footer">
                  <button v-if="group.name !== activeSeason" class="set-active-btn" @click="setActiveSeason(group.name)">Set Active</button>
                  <button v-else class="set-active-btn active-set" @click="setActiveSeason('')">Deactivate</button>
                </div>
              </div>
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

            <!-- Managers -->
            <div class="settings-section">
              <div class="setting-row mgr-setting-row">
                <div class="setting-info">
                  <div class="setting-label">Managers</div>
                  <div class="setting-desc">Employees who can manage this department.</div>
                </div>
                <div class="mgr-setting-body">
                  <div v-for="link in deptManagerLinks" :key="link.id_managerDepartment" class="mgr-setting-item">
                    <span class="mgr-setting-name">{{ managerName(link.id_employee) }}</span>
                    <span v-if="link.id_employee === currentUser.id_employee" class="mgr-you-badge">You</span>
                    <button v-else class="icon-action danger" title="Remove" @click="removeManager(link)">✕</button>
                  </div>
                  <div class="mgr-add-row">
                    <select v-model="addManagerId" class="mgr-select">
                      <option value="">— Add a manager —</option>
                      <option v-for="emp in assignableManagers" :key="emp.id_employee" :value="emp.id_employee">
                        {{ emp.fName }} {{ emp.lName }}
                      </option>
                    </select>
                    <button class="primary-btn" :disabled="!addManagerId || addingManager" @click="addManager">
                      {{ addingManager ? 'Adding…' : 'Add' }}
                    </button>
                  </div>
                  <p v-if="managerError" class="save-error">{{ managerError }}</p>
                </div>
              </div>
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
           CREATE SEASON MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="createSeasonModal.open" class="modal-overlay" @click.self="createSeasonModal.open = false">
          <div class="modal">
            <h3 class="modal-title">Create Season</h3>
            <div class="form-group">
              <label>Season Name</label>
              <input v-model="createSeasonModal.name" type="text" placeholder="e.g. Fall 2024, Summer, Finals Week" @keyup.enter="submitCreateSeason" />
            </div>
            <p v-if="createSeasonModal.error" class="modal-error">{{ createSeasonModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="createSeasonModal.open = false">Cancel</button>
              <button class="confirm-btn" @click="submitCreateSeason">Next: Set Hours</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           SEASON HOURS MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="seasonHoursModal.open" class="modal-overlay" @click.self="seasonHoursModal.open = false">
          <div class="modal modal-wide">
            <h3 class="modal-title">{{ seasonHoursModal.seasonName }} — Hours</h3>
            <div class="season-hours-table">
              <div class="season-hours-header">
                <span>Day</span><span>Open</span><span>Opens</span><span>Closes</span>
              </div>
              <div v-for="row in seasonHoursModal.days" :key="row.day" class="season-hours-row">
                <span class="shm-day">{{ row.day }}</span>
                <label class="shm-toggle">
                  <input type="checkbox" v-model="row.open" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
                <input v-model="row.startTime" type="time" :disabled="!row.open" class="shm-time" />
                <input v-model="row.endTime" type="time" :disabled="!row.open" class="shm-time" />
              </div>
            </div>
            <p v-if="seasonHoursModal.error" class="modal-error">{{ seasonHoursModal.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="seasonHoursModal.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="seasonHoursModal.saving" @click="saveSeasonHours">
                {{ seasonHoursModal.saving ? 'Saving…' : 'Save Hours' }}
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
           EMPLOYEE MODAL
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="empModal2.open" class="modal-overlay" @click.self="empModal2.open = false">
          <div class="modal">
            <h3 class="modal-title">{{ empModal2.isEdit ? 'Edit Employee' : 'Add Employee' }}</h3>
            <div class="form-group">
              <label>First Name</label>
              <input v-model="empModal2.data.fName" type="text" placeholder="Jane" />
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input v-model="empModal2.data.lName" type="text" placeholder="Smith" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="empModal2.data.email" type="text" placeholder="jane@example.com" />
            </div>
            <div class="form-group">
              <label>Role</label>
              <select v-model="empModal2.data.role">
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <p v-if="empModal2.error" class="modal-error">{{ empModal2.error }}</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="empModal2.open = false">Cancel</button>
              <button class="confirm-btn" :disabled="empModal2.saving" @click="saveEmployee">
                {{ empModal2.saving ? 'Saving…' : empModal2.isEdit ? 'Save Changes' : 'Add Employee' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ══════════════════════════════════════
           DELETE EMPLOYEE CONFIRM
      ══════════════════════════════════════ -->
      <Transition name="modal">
        <div v-if="deleteEmpConfirm.open" class="modal-overlay" @click.self="deleteEmpConfirm.open = false">
          <div class="modal modal-sm">
            <h3 class="modal-title">Remove {{ deleteEmpConfirm.emp?.fName }} {{ deleteEmpConfirm.emp?.lName }}?</h3>
            <p class="modal-body-text">This will permanently delete the employee.</p>
            <div class="modal-actions">
              <button class="cancel-btn" @click="deleteEmpConfirm.open = false">Cancel</button>
              <button class="confirm-btn danger" :disabled="deleteEmpConfirm.saving" @click="executeDeleteEmployee">
                {{ deleteEmpConfirm.saving ? 'Deleting…' : 'Delete' }}
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
import { useDepartment } from "../composables/useDepartment.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
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
  deleteManagerDepartment,
  getDeptManagers,
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
const TABS    = ["Overview", "Positions", "Employees", "Hours", "Events", "Settings"];
const DAYS    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── State ─────────────────────────────────────────────────────────────────────
const activeTab      = ref("Overview");
const initLoading    = ref(false);
const loading        = ref(false);
const apiError       = ref("");
const noDeptsYet     = ref(false);

// Department switcher — shared composable
const { myDepts, selectedDeptId, loadDepts } = useDepartment();
const allDepts = ref([]); // all departments in system (for request modal)

const department      = ref({});
const positions       = ref([]);
const employees       = ref([]);
const allStaff        = ref([]); // unfiltered — used for manager name lookups
const calendarEntries = ref([]);
const events          = ref([]);
const deptManagerLinks = ref([]);

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

    // 2. Link employee to new department (primary field + junction table)
    await Promise.all([
      apiClient.put(`/employees/${currentUser.value.id_employee}`, {
        id_department: newDept.id_department,
      }),
      createManagerDepartment({
        id_employee:   currentUser.value.id_employee,
        id_department: newDept.id_department,
      }),
    ]);

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
    const empId = currentUser.value?.id_employee;

    // Delegate dept list loading to shared composable; also load allDepts for request modal
    const [, allDeptsRes] = await Promise.allSettled([
      loadDepts(currentUser.value),
      getAllDepartments(),
    ]);
    allDepts.value = allDeptsRes.status === "fulfilled" ? (allDeptsRes.value.data || []) : [];

    if (myDepts.value.length === 0) {
      noDeptsYet.value = true;
    } else {
      noDeptsYet.value = false;
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
  // Clear dept-specific data immediately so stale data from the previous dept never shows
  calendarEntries.value = [];
  events.value          = [];
  positions.value       = [];
  employees.value       = [];
  try {
    const [deptRes, posRes, empRes, allStaffRes, calRes, evtRes, mgrRes] = await Promise.allSettled([
      getDepartment(id),
      getPositions(id),
      getEmployees(id),
      getEmployees(),
      getCalendarEntries(id),
      getEvents(id),
      getDeptManagers(id),
    ]);

    if (deptRes.status      === "fulfilled") department.value       = deptRes.value.data      || {};
    if (posRes.status       === "fulfilled") positions.value        = posRes.value.data       || [];
    if (empRes.status       === "fulfilled") employees.value        = empRes.value.data       || [];
    if (allStaffRes.status  === "fulfilled") allStaff.value         = allStaffRes.value.data  || [];
    if (calRes.status       === "fulfilled") calendarEntries.value  = calRes.value.data       || [];
    if (evtRes.status       === "fulfilled") events.value           = evtRes.value.data       || [];
    if (mgrRes.status       === "fulfilled") deptManagerLinks.value = mgrRes.value.data       || [];
  } catch (err) {
    apiError.value = "Could not load department data: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
  await Promise.all([loadBufferTime(id), loadActiveSeason(id)]);
}


watch(selectedDeptId, (id) => {
  if (!id || noDeptsYet.value) return;
  activeTab.value = "Overview";
  loadDeptData(id);
});

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
const upcomingEvents = computed(() =>
  [...events.value]
    .filter(e => e.start_time && new Date(e.start_time) >= new Date())
    .sort((a, b) => a.start_time > b.start_time ? 1 : -1)
    .slice(0, 5)
);
const nextEvent = computed(() => upcomingEvents.value[0] || null);

const todayEntry = computed(() => {
  if (!activeSeason.value) return null;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = dayNames[new Date().getDay()];
  return getEntryForSeasonDay(activeSeason.value, today);
});

const deptManagers = computed(() => {
  const links = deptManagerLinks.value;
  return links.map(link => {
    const emp = allStaff.value.find(e => e.id_employee === link.id_employee);
    return emp ? `${emp.fName} ${emp.lName}` : null;
  }).filter(Boolean);
});

// ── Manager assignment (Settings tab) ─────────────────────────────────────────
const addManagerId   = ref("");
const addingManager  = ref(false);
const managerError   = ref("");

const assignableManagers = computed(() => {
  const linked = new Set(deptManagerLinks.value.map(l => l.id_employee));
  return employees.value.filter(e =>
    (e.role === 'Manager' || e.role === 'Admin') && !linked.has(e.id_employee)
  );
});

function managerName(id_employee) {
  const emp = allStaff.value.find(e => e.id_employee === id_employee);
  return emp ? `${emp.fName} ${emp.lName}` : `Employee #${id_employee}`;
}

async function addManager() {
  if (!addManagerId.value) return;
  addingManager.value = true;
  managerError.value  = "";
  try {
    const res = await createManagerDepartment({
      id_employee:   addManagerId.value,
      id_department: selectedDeptId.value,
    });
    deptManagerLinks.value.push(res.data);
    addManagerId.value = "";
  } catch (err) {
    managerError.value = err.message || "Failed to add manager.";
  } finally {
    addingManager.value = false;
  }
}

async function removeManager(link) {
  managerError.value = "";
  try {
    await deleteManagerDepartment(link.id_managerDepartment);
    deptManagerLinks.value = deptManagerLinks.value.filter(
      l => l.id_managerDepartment !== link.id_managerDepartment
    );
  } catch (err) {
    managerError.value = err.message || "Failed to remove manager.";
  }
}
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

// ── Employee tab ───────────────────────────────────────────────────────────────
const empSearch = ref("");
const filteredEmployees = computed(() => {
  const q = empSearch.value.toLowerCase();
  if (!q) return employees.value;
  return employees.value.filter(e =>
    `${e.fName} ${e.lName} ${e.email}`.toLowerCase().includes(q)
  );
});

const empModal2 = ref({ open: false, isEdit: false, editId: null, data: {}, saving: false, error: "" });
const deleteEmpConfirm = ref({ open: false, emp: null, saving: false });

function openCreateEmployee() {
  empModal2.value = {
    open: true, isEdit: false, editId: null,
    data: { fName: "", lName: "", email: "", role: "Employee" },
    saving: false, error: "",
  };
}
function openEditEmployee(emp) {
  empModal2.value = {
    open: true, isEdit: true, editId: emp.id_employee,
    data: { fName: emp.fName, lName: emp.lName, email: emp.email, role: emp.role },
    saving: false, error: "",
  };
}
function confirmDeleteEmployee(emp) {
  deleteEmpConfirm.value = { open: true, emp, saving: false };
}

async function saveEmployee() {
  const { isEdit, editId, data } = empModal2.value;
  if (!data.fName || !data.lName || !data.email) {
    empModal2.value.error = "First name, last name, and email are required.";
    return;
  }
  empModal2.value.saving = true;
  empModal2.value.error  = "";
  try {
    if (isEdit) {
      await apiClient.put(`/employees/${editId}`, data);
      const idx = employees.value.findIndex(e => e.id_employee === editId);
      if (idx !== -1) employees.value[idx] = { ...employees.value[idx], ...data };
    } else {
      const res = await apiClient.post("/employees/create-employee", {
        ...data,
        id_department: selectedDeptId.value || null,
      });
      employees.value.push(res.data);
    }
    empModal2.value.open = false;
  } catch (err) {
    empModal2.value.error = err.response?.data?.message || err.message || "Save failed.";
  } finally {
    empModal2.value.saving = false;
  }
}

async function executeDeleteEmployee() {
  deleteEmpConfirm.value.saving = true;
  try {
    await apiClient.delete(`/employees/${deleteEmpConfirm.value.emp.id_employee}`);
    employees.value = employees.value.filter(e => e.id_employee !== deleteEmpConfirm.value.emp.id_employee);
    deleteEmpConfirm.value.open = false;
  } catch (err) {
    apiError.value = "Delete failed: " + err.message;
    deleteEmpConfirm.value.open = false;
  } finally {
    deleteEmpConfirm.value.saving = false;
  }
}
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

// ── Season Hours ───────────────────────────────────────────────────────────────
const groupedBySeasons = computed(() => {
  const groups = {};
  calendarEntries.value.forEach(entry => {
    const s = entry.season || "Unassigned";
    if (!groups[s]) groups[s] = [];
    groups[s].push(entry);
  });
  return Object.entries(groups).map(([name, entries]) => ({ name, entries }));
});

function getEntryForSeasonDay(seasonName, dayName) {
  return calendarEntries.value.find(e =>
    (e.season || "Unassigned") === seasonName && e.dayOfWeek === dayName
  ) || null;
}

// ── Create Season Modal ────────────────────────────────────────────────────────
const createSeasonModal = ref({ open: false, name: "", error: "" });

function openCreateSeason() {
  createSeasonModal.value = { open: true, name: "", error: "" };
}
function submitCreateSeason() {
  const name = createSeasonModal.value.name.trim();
  if (!name) { createSeasonModal.value.error = "Season name is required."; return; }
  if (groupedBySeasons.value.some(g => g.name === name)) {
    createSeasonModal.value.error = "A season with that name already exists."; return;
  }
  createSeasonModal.value.open = false;
  openSeasonHoursModal(name);
}

// ── Season Hours Modal ─────────────────────────────────────────────────────────
const seasonHoursModal = ref({ open: false, seasonName: "", saving: false, error: "", days: [] });

function openSeasonHoursModal(seasonName) {
  seasonHoursModal.value = {
    open: true, seasonName, saving: false, error: "",
    days: DAYS.map(day => {
      const existing = getEntryForSeasonDay(seasonName, day);
      return {
        day,
        open: !!existing,
        startTime: existing?.startTime?.slice(0, 5) || "08:00",
        endTime:   existing?.endTime?.slice(0, 5)   || "17:00",
        existingId: existing?.id_hours_of_operation || null,
      };
    }),
  };
}

async function saveSeasonHours() {
  const { seasonName, days } = seasonHoursModal.value;
  seasonHoursModal.value.saving = true;
  seasonHoursModal.value.error  = "";
  try {
    for (const d of days) {
      const seasonVal = seasonName === "Unassigned" ? null : seasonName;
      if (d.open) {
        const payload = {
          name:          `${seasonName} – ${d.day}`,
          dayOfWeek:     d.day,
          season:        seasonVal,
          startTime:     d.startTime,
          endTime:       d.endTime,
          id_department: selectedDeptId.value,
        };
        if (d.existingId) {
          await updateCalendarEntry(d.existingId, payload);
          const idx = calendarEntries.value.findIndex(e => e.id_hours_of_operation === d.existingId);
          if (idx !== -1) calendarEntries.value[idx] = { ...calendarEntries.value[idx], ...payload };
        } else {
          const res = await createCalendarEntry(payload);
          calendarEntries.value.push(res.data);
          d.existingId = res.data.id_hours_of_operation;
        }
      } else if (d.existingId) {
        await deleteCalendarEntry(d.existingId);
        calendarEntries.value = calendarEntries.value.filter(e => e.id_hours_of_operation !== d.existingId);
        d.existingId = null;
      }
    }
    seasonHoursModal.value.open = false;
  } catch (err) {
    seasonHoursModal.value.error = err.message || "Save failed.";
  } finally {
    seasonHoursModal.value.saving = false;
  }
}

function confirmDeleteSeason(seasonName) {
  const entries = calendarEntries.value.filter(e => (e.season || "Unassigned") === seasonName);
  deleteConfirm.value = {
    open: true, type: "season", item: { seasonName, entries },
    label: `season "${seasonName}" and all its hours`, saving: false,
  };
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
function confirmDeleteEvent(ev)     { deleteConfirm.value = { open: true, type: "event",    item: ev, label: `event "${ev.title}"`, saving: false }; }

async function executeDelete() {
  deleteConfirm.value.saving = true;
  const { type, item } = deleteConfirm.value;
  try {
    if (type === "position") {
      await deletePosition(item.id_position);
      positions.value = positions.value.filter(p => p.id_position !== item.id_position);
    } else if (type === "season") {
      for (const entry of item.entries) {
        await deleteCalendarEntry(entry.id_hours_of_operation);
      }
      const ids = new Set(item.entries.map(e => e.id_hours_of_operation));
      calendarEntries.value = calendarEntries.value.filter(e => !ids.has(e.id_hours_of_operation));
      if (activeSeason.value === item.seasonName) await setActiveSeason("");
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

// ── Settings: Active Season ───────────────────────────────────────────────────
const ACTIVE_SEASON_KEY   = "Active Season";
const activeSeason        = ref("");
let   activeSeasonValueId = null;
let   activeSeasonSettingId = null;

async function loadActiveSeason(id) {
  if (!id) return;
  try {
    const valRes = await getSettingValues(id);
    const values = valRes.data || [];
    const sv = values.find(v => v.name === ACTIVE_SEASON_KEY || v.key === "active_season");
    if (sv) { activeSeasonValueId = sv.id_settingValue; activeSeasonSettingId = sv.id_setting; activeSeason.value = sv.value || ""; return; }
    const settingsRes = await getSettings();
    let setting = (settingsRes.data || []).find(s => s.name === ACTIVE_SEASON_KEY || s.key === "active_season");
    if (!setting) {
      const nr = await createSetting({ name: ACTIVE_SEASON_KEY, key: "active_season", type: "string" });
      setting = nr.data;
    }
    activeSeasonSettingId = setting?.id_setting;
    if (activeSeasonSettingId) {
      const nvr = await createSettingValue({ id_setting: activeSeasonSettingId, id_department: id, value: "" });
      activeSeasonValueId = nvr.data?.id_settingValue;
    }
    activeSeason.value = "";
  } catch { activeSeason.value = ""; }
}

async function setActiveSeason(seasonName) {
  try {
    if (activeSeasonValueId) {
      await updateSettingValue(activeSeasonValueId, seasonName);
    } else if (activeSeasonSettingId) {
      const res = await createSettingValue({ id_setting: activeSeasonSettingId, id_department: selectedDeptId.value, value: seasonName });
      activeSeasonValueId = res.data?.id_settingValue;
    }
    activeSeason.value = seasonName;
  } catch (err) { console.error("Failed to set active season:", err); }
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
.nav-dept-switcher { display: flex; align-items: center; gap: 12px; }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); flex-shrink: 0; }
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

.dept-header-bottom { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
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
.overview-wide-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.overview-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 12px; padding: 20px 22px; }
.ov-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--tx-faint); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.ov-value { font-size: 14px; color: var(--tx-secondary); word-break: break-word; }
.ov-big   { font-size: 28px; font-weight: 700; color: var(--accent); font-family: 'DM Mono', monospace; }
.ov-season-badge { background: var(--accent); color: #fff; border-radius: 4px; padding: 1px 7px; font-size: 10px; text-transform: none; letter-spacing: 0; font-weight: 600; }
.ov-no-season { color: var(--tx-faint); font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; }
.ov-count-badge { background: var(--bg-elevated); color: var(--tx-secondary); border-radius: 10px; padding: 1px 8px; font-size: 11px; text-transform: none; letter-spacing: 0; font-weight: 600; }
.ov-empty-hint { color: var(--tx-faint); font-size: 13px; font-style: italic; }
.ov-hours-list { display: flex; flex-direction: column; gap: 7px; }
.ov-hours-row { display: flex; align-items: center; gap: 14px; }
.ov-hours-day { width: 34px; font-size: 12px; font-weight: 600; color: var(--tx-secondary); flex-shrink: 0; }
.ov-hours-time { font-size: 13px; color: var(--tx-primary); font-family: 'DM Mono', monospace; }
.ov-hours-closed { font-size: 12px; color: var(--tx-faint); font-style: italic; }
.ov-events-list { display: flex; flex-direction: column; gap: 10px; }
.ov-event-row { display: flex; align-items: center; gap: 12px; }
.ov-event-date { display: flex; flex-direction: column; align-items: center; background: var(--bg-elevated); border-radius: 6px; padding: 5px 9px; min-width: 40px; flex-shrink: 0; }
.ov-event-month { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; color: var(--accent); text-transform: uppercase; line-height: 1.2; }
.ov-event-day { font-size: 17px; font-weight: 700; color: var(--tx-primary); line-height: 1.1; font-family: 'DM Mono', monospace; }
.ov-event-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ov-event-title { font-size: 13px; font-weight: 600; color: var(--tx-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ov-event-time { font-size: 11px; color: var(--tx-faint); }

/* Open Today */
.ov-faint { font-size: 13px; color: var(--tx-faint); font-style: italic; margin-top: 2px; }
.ov-open-badge { display: inline-block; background: #16a34a22; color: #4ade80; border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
.ov-closed-badge { display: inline-block; background: #ff174422; color: var(--accent); border-radius: 4px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
.ov-today-hours { font-size: 13px; color: var(--tx-primary); font-family: 'DM Mono', monospace; }

/* Next Event highlight */
.ov-next-event { background: var(--bg-elevated); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
.ov-next-label { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.ov-next-body { display: flex; align-items: center; gap: 12px; }
.ov-next-title { font-size: 14px !important; }
.ov-events-rest { border-top: 1px solid var(--bdr-subtle); padding-top: 10px; }
.ov-event-date-sm .ov-event-day { font-size: 14px !important; }

/* Managers */
.ov-managers-card { margin-top: 16px; }
.ov-managers-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ov-manager-chip { background: var(--bg-elevated); border: 1px solid var(--bdr-subtle); border-radius: 20px; padding: 4px 14px; font-size: 13px; color: var(--tx-primary); font-weight: 500; }

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

/* ── Seasons grid ── */
.seasons-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.season-card {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;
  transition: border-color 0.15s;
}
.season-card:hover { border-color: var(--bdr-medium); }
.season-card--active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.season-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.season-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.season-name { font-size: 16px; font-weight: 700; color: var(--tx-primary); }
.active-chip { display: inline-block; padding: 2px 9px; border-radius: 100px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: var(--accent); color: #fff; }
.active-season-badge { display: inline-flex; align-items: center; gap: 4px; margin-left: 10px; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; background: var(--accent); color: #fff; }
.season-days { display: flex; flex-direction: column; gap: 4px; }
.season-day-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.season-day-label { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 600; color: var(--tx-muted); width: 30px; flex-shrink: 0; text-transform: uppercase; }
.season-day-hours { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--tx-secondary); }
.season-day-closed { font-size: 12px; color: var(--tx-ghost, #444); font-style: italic; }
.season-card-footer { margin-top: auto; }
.set-active-btn {
  width: 100%; padding: 7px 0; border-radius: 8px;
  border: 1px solid var(--bdr-medium); background: transparent;
  color: var(--tx-secondary); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.set-active-btn:hover { border-color: var(--accent); color: var(--accent); }
.set-active-btn.active-set { border-color: var(--accent); color: var(--accent); background: rgba(255,23,68,0.06); }
.set-active-btn.active-set:hover { background: rgba(255,23,68,0.12); }

/* ── Season Hours Modal ── */
.modal-wide { width: 620px !important; max-width: 96vw !important; }
.season-hours-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--bdr-subtle); border-radius: 10px; overflow: visible; }
.season-hours-header {
  display: grid; grid-template-columns: 100px 52px 1fr 1fr;
  padding: 8px 14px; background: var(--bg-input); border-radius: 10px 10px 0 0;
  font-size: 11px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.07em;
}
.season-hours-row {
  display: grid; grid-template-columns: 100px 52px 1fr 1fr;
  align-items: center; padding: 10px 14px; gap: 10px;
  border-top: 1px solid var(--bdr-subtle);
}
.shm-day { font-size: 13px; color: var(--tx-primary); font-weight: 500; }
.shm-time {
  background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary);
  padding: 5px 8px; border-radius: 7px; font-size: 13px; font-family: 'DM Mono', monospace;
  outline: none; width: 100%; transition: border-color 0.15s;
}
.shm-time:focus { border-color: var(--accent); }
.shm-time:disabled { opacity: 0.35; cursor: not-allowed; }

/* Toggle switch */
.shm-toggle { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
.shm-toggle input { opacity: 0; width: 0; height: 0; }
.toggle-track {
  position: absolute; inset: 0; background: var(--bdr-medium); border-radius: 20px; transition: background 0.2s;
}
.shm-toggle input:checked + .toggle-track { background: var(--accent); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.shm-toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }

/* ── Hours table (kept for back-compat if used elsewhere) ── */
.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--bdr-subtle); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead { background: var(--bg-surface); }
.data-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid var(--bdr-subtle); }
.data-table td { padding: 12px 16px; border-bottom: 1px solid var(--bdr-strong); color: var(--tx-secondary); vertical-align: middle; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-input); }
.empty-row { text-align: center; color: var(--tx-faint); padding: 32px 0 !important; }
.emp-name-cell { display: flex; align-items: center; gap: 10px; }
.emp-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.role-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; background: var(--bg-active); color: var(--tx-secondary); }
.role-badge.manager, .role-badge.admin { background: rgba(255,23,68,0.15); color: #FF1744; }
.search-input { background: var(--bg-input); border: 1px solid var(--bdr-subtle); border-radius: 8px; padding: 8px 14px; color: var(--tx-primary); font-family: inherit; font-size: 13px; outline: none; width: 220px; }
.search-input:focus { border-color: var(--accent); }
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

/* ── Manager settings ── */
.mgr-setting-row { align-items: flex-start; flex-direction: column; gap: 16px; }
.mgr-setting-body { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.mgr-setting-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-elevated); border-radius: 8px; }
.mgr-setting-name { flex: 1; font-size: 14px; color: var(--tx-primary); }
.mgr-you-badge { font-size: 11px; font-weight: 600; color: var(--tx-faint); background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 10px; padding: 1px 8px; }
.mgr-add-row { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
.mgr-select { flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 14px; outline: none; }

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
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-medium); border-radius: 14px; padding: 28px; width: 420px; max-width: 96vw; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
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
