<template>
  <div class="app" @mousemove="onGlobalMouseMove" @mouseup="onGlobalMouseUp">

    <!-- ── Loading overlay ── -->
    <Transition name="fade">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading schedule…</span>
      </div>
    </Transition>
    <div v-if="apiError" class="api-error-banner">
      ⚠ Could not connect to backend: {{ apiError }} —
      <button @click="loadAll" class="retry-btn">Retry</button>
    </div>

    <!-- ── Top Navigation ── -->
    <nav class="topnav">
      <div class="nav-logo">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="4" width="11" height="7" rx="2" fill="#FF1744"/>
          <rect x="15" y="4" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
          <rect x="2" y="14" width="11" height="7" rx="2" fill="#FF1744" opacity="0.45"/>
          <rect x="15" y="14" width="11" height="7" rx="2" fill="#F0E6D3"/>
        </svg>
      </div>
      <div class="nav-tabs">
        <button v-for="tab in tabs" :key="tab" class="nav-tab"
          :class="{ active: activeTab === tab }" @click="handleTabClick(tab)">{{ tab }}</button>
      </div>
      <div class="nav-right">
        <button v-if="currentUser?.role === 'Manager' || currentUser?.role === 'Admin'"
          class="manage-btn" @click="router.push('/manage')">
          ⚙ Manage
        </button>
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="isDark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
        <div class="avatar" @click="profileOpen = true" title="My Profile">
          <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
          <span v-else>{{ userInitials }}</span>
        </div>
      </div>
    </nav>

    <div class="layout">

      <!-- ── Sidebar ── -->
      <aside class="sidebar">
        <div class="mini-cal-header">
          <button class="cal-nav-btn" @click="navigate(-1)">‹</button>
          <span class="mini-cal-month">{{ miniCalMonth }}</span>
          <button class="cal-nav-btn" @click="navigate(1)">›</button>
        </div>
        <div class="mini-calendar">
          <div v-for="d in ['S','M','T','W','R','F','S']" :key="d" class="mini-cal-day-label">{{ d }}</div>
          <div v-for="pad in startPad" :key="'pad-' + pad" class="mini-cal-cell empty"></div>
          <div v-for="day in daysInMonth" :key="day" class="mini-cal-cell"
            :class="{ today: isToday(day), 'in-week': isInCurrentWeek(day), 'selected-day': isSelectedDay(day) }"
            @click="jumpToDay(day)">{{ day }}</div>
        </div>

        <div class="sidebar-section">
          <p class="sidebar-label">Today's Employees</p>
          <div v-for="emp in todaysEmployees" :key="emp.name" class="employee-chip" :style="{ background: emp.color }">{{ emp.name }}</div>
          <div v-if="todaysEmployees.length === 0" class="sidebar-empty">No shifts today</div>
        </div>
        <div class="sidebar-section">
          <div class="open-shifts-header">
            <p class="sidebar-label underline-link" @click="activeTab = 'Shifts'">Open Shifts</p>
            <span class="open-shifts-week">this week</span>
          </div>
          <div v-if="computedOpenShifts.length === 0" class="sidebar-empty">No open shifts this week</div>
          <div v-for="s in computedOpenShifts" :key="s.key" class="open-shift-item">
            <span class="open-shift-day">{{ s.dayLabel }}</span>
            <div class="open-shift-gaps">
              <span v-for="gap in s.gaps" :key="gap" class="open-shift-gap">{{ gap }}</span>
            </div>
          </div>
        </div>
        <div class="sidebar-section">
          <p class="sidebar-label underline-link" @click="activeTab = 'Requests'">Requests</p>
          <div v-if="pendingRequests.length === 0" class="sidebar-empty">No pending requests</div>
          <div v-for="r in pendingRequests" :key="r.id" class="request-item">
            <span class="request-name">{{ r.name }}</span>
            <span class="request-type">{{ r.type }}</span>
          </div>
        </div>

        <!-- My Tasks Today — Employee only -->
        <div v-if="!isManager && myShiftTasks.length > 0" class="sidebar-section">
          <p class="sidebar-label">My Tasks Today</p>
          <div v-for="stl in myShiftTasks" :key="stl.shiftTaskListId" class="my-task-item">
            <div class="my-task-list-name">{{ stl.taskList.name }}</div>
            <div class="my-task-progress">
              <div class="my-task-bar">
                <div
                  class="my-task-fill"
                  :style="{ width: stl.totalCount ? (stl.completedCount / stl.totalCount * 100) + '%' : '0%' }"
                ></div>
              </div>
              <span class="my-task-count">{{ stl.completedCount }}/{{ stl.totalCount }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Main Calendar ── -->
      <main class="cal-main">
        <div v-if="deptName" class="dept-name-bar">{{ deptName }}</div>
        <div class="cal-toolbar">
          <div class="cal-nav-group">
            <button class="toolbar-btn" @click="navigate(-1)">‹</button>
            <span class="cal-range-label">{{ navLabel }}</span>
            <button class="toolbar-btn" @click="navigate(1)">›</button>
            <button class="today-btn" @click="goToday">Today</button>
          </div>
          <div class="cal-view-group">
            <button v-for="v in ['Day','Week','Month']" :key="v" class="view-btn"
              :class="{ active: calView === v }" @click="setView(v)">{{ v }}</button>
          </div>
          <button class="add-shift-btn" @click="openBlankModal"><span>+</span> Add Shift</button>
        </div>

        <!-- ════════════════════════════════════
             DAY VIEW
        ════════════════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <div v-if="calView === 'Day'" key="day" class="cal-grid-wrapper">
          <div class="cal-body" ref="calBody">
          <div class="cal-header-row">
            <div class="time-gutter"></div>
            <div class="day-header single-day" :class="{ today: isTodayDate(dayViewDate) }">
              <span class="day-letter">{{ DAY_NAMES[dayViewDate.getDay()] }}</span>
              <span class="day-number">{{ dayViewDate.getDate() }}</span>
              <span class="day-month-label">{{ dayViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }}</span>
            </div>
          </div>
            <div class="cal-inner">
              <div class="time-column">
                <div v-for="hour in hours" :key="hour" class="time-slot-label">{{ formatHour(hour) }}</div>
              </div>
              <div class="day-column"
                :class="{ 'is-dragging-col': drag.active && drag.dayIndex === 0 }"
                @mousedown.prevent="onColumnMouseDown($event, 0)">
                <div v-for="hour in hours" :key="hour" class="hour-cell"></div>
                <!-- Hours of operation markers -->
                <template v-for="entry in hoursLinesForDate(dayViewDate)" :key="entry.key">
                  <div class="hours-op-line open" :style="{ top: entry.openPx + 'px' }">
                    <span class="hours-line-label">Open {{ entry.openLabel }}</span>
                  </div>
                  <div class="hours-op-line close" :style="{ top: entry.closePx + 'px' }">
                    <span class="hours-line-label">Close {{ entry.closeLabel }}</span>
                  </div>
                </template>
                <!-- Department event blocks -->
                <div v-for="ev in eventsForDate(dayViewDate)" :key="'ev-' + ev.id_event"
                  class="event-block" :style="eventBlockStyle(ev)">
                  <div class="event-block-title">{{ ev.title }}</div>
                  <div class="event-block-time">{{ fmtHour(ev.startHour) }} – {{ fmtHour(ev.endHour) }}</div>
                </div>
                <div v-if="drag.active && drag.dayIndex === 0" class="ghost-block" :style="ghostStyle">
                  <span class="ghost-label">{{ ghostLabel }}</span>
                </div>
                <div v-for="shift in dayViewShifts" :key="shift.id"
                  class="shift-block" :style="shiftStyle(shift)"
                  @mousedown.stop @click.stop="selectShift(shift, $event)">
                  <div class="shift-employee">{{ shift.positionName }}{{ shift.employee ? ' – ' + shift.employee : '' }}</div>
                  <div class="shift-time">{{ shift.startLabel }} – {{ shift.endLabel }}</div>
                </div>
                <div v-if="isTodayDate(dayViewDate)" class="current-time-line" :style="{ top: currentTimePx + 'px' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════
             WEEK VIEW
        ════════════════════════════════════ -->
        <div v-else-if="calView === 'Week'" key="week" class="cal-grid-wrapper">
          <div class="cal-body" ref="calBody">
          <div class="cal-header-row">
            <div class="time-gutter"></div>
            <div v-for="(date, i) in weekDates" :key="i" class="day-header"
              :class="{ today: isTodayDate(date) }"
              @click="drillToDay(date)">
              <span class="day-letter">{{ dayLetters[i] }}</span>
              <span class="day-number">{{ date.getDate() }}</span>
            </div>
          </div>
            <div class="cal-inner">
              <div class="time-column">
                <div v-for="hour in hours" :key="hour" class="time-slot-label">{{ formatHour(hour) }}</div>
              </div>
              <div v-for="(date, colIdx) in weekDates" :key="colIdx" class="day-column"
                :class="{ 'is-dragging-col': drag.active && drag.dayIndex === colIdx }"
                @mousedown.prevent="onColumnMouseDown($event, colIdx)">
                <div v-for="hour in hours" :key="hour" class="hour-cell"></div>
                <!-- Hours of operation markers -->
                <template v-for="entry in hoursLinesForDate(date)" :key="entry.key">
                  <div class="hours-op-line open" :style="{ top: entry.openPx + 'px' }">
                    <span class="hours-line-label">Open {{ entry.openLabel }}</span>
                  </div>
                  <div class="hours-op-line close" :style="{ top: entry.closePx + 'px' }">
                    <span class="hours-line-label">Close {{ entry.closeLabel }}</span>
                  </div>
                </template>
                <!-- Department event blocks -->
                <div v-for="ev in eventsForDate(date)" :key="'ev-' + ev.id_event"
                  class="event-block" :style="eventBlockStyle(ev)">
                  <div class="event-block-title">{{ ev.title }}</div>
                  <div class="event-block-time">{{ fmtHour(ev.startHour) }} – {{ fmtHour(ev.endHour) }}</div>
                </div>
                <div v-if="drag.active && drag.dayIndex === colIdx" class="ghost-block" :style="ghostStyle">
                  <span class="ghost-label">{{ ghostLabel }}</span>
                </div>
                <div v-for="shift in shiftsForWeekDay(colIdx)" :key="shift.id"
                  class="shift-block" :style="shiftStyle(shift)"
                  @mousedown.stop @click.stop="selectShift(shift, $event)">
                  <div class="shift-employee">{{ shift.positionName }}{{ shift.employee ? ' – ' + shift.employee : '' }}</div>
                  <div class="shift-time">{{ shift.startLabel }} – {{ shift.endLabel }}</div>
                </div>
                <div v-if="isTodayDate(date)" class="current-time-line" :style="{ top: currentTimePx + 'px' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════
             MONTH VIEW
        ════════════════════════════════════ -->
        <div v-else key="month" class="month-wrapper">
          <!-- Day-of-week headers -->
          <div class="month-dow-row">
            <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="month-dow">{{ d }}</div>
          </div>
          <!-- Calendar cells -->
          <div class="month-grid">
            <!-- Leading empty cells -->
            <div v-for="p in monthPadStart" :key="'pre-' + p" class="month-cell month-cell--faded">
              <span class="month-cell-num">{{ monthPadDates[p - 1] }}</span>
            </div>
            <!-- Real cells -->
            <div v-for="day in daysInCurrentMonth" :key="day" class="month-cell"
              :class="{ 'month-cell--today': isMonthToday(day), 'month-cell--selected': isMonthSelected(day) }"
              @click="drillToMonthDay(day)">
              <span class="month-cell-num" :class="{ 'today-badge': isMonthToday(day) }">{{ day }}</span>
              <div class="month-shifts">
                <div v-for="ev in eventsForMonthDay(day)" :key="'ev-' + ev.id_event"
                  class="month-event-pill">
                  <span class="month-event-dot"></span>
                  <span class="month-event-name">{{ ev.title }}</span>
                </div>
                <div v-for="shift in shiftsForMonthDay(day)" :key="shift.id"
                  class="month-shift-pill"
                  :style="{ background: getEmployeeColor(shift.employee) }"
                  @click.stop="selectShiftFromMonth(shift, day, $event)">
                  <span class="pill-dot"></span>
                  <span class="pill-name">{{ shift.positionName || shift.employee }}</span>
                  <span class="pill-time">{{ shift.startLabel }}</span>
                </div>
                <div v-if="extraShiftCount(day) > 0" class="month-shift-more">+{{ extraShiftCount(day) }} more</div>
              </div>
            </div>
            <!-- Trailing empty cells -->
            <div v-for="p in monthPadEnd" :key="'post-' + p" class="month-cell month-cell--faded">
              <span class="month-cell-num">{{ p }}</span>
            </div>
          </div>
        </div>
        </Transition>
      </main>
    </div>

    <!-- ── Quick-Create Popover (drag release) ── -->
    <Transition name="popover-anim">
      <div v-if="quickCreate.visible" class="quick-create-popover" :style="quickCreate.style" @mousedown.stop>
        <div class="qc-header">
          <div class="qc-time-badge">{{ quickCreate.startLabel }} – {{ quickCreate.endLabel }}</div>
          <button class="qc-close" @click="cancelQuickCreate">✕</button>
        </div>
        <div class="qc-date-label">{{ quickCreate.dateLabel }}</div>
        <div class="form-group">
          <label>Position</label>
          <select v-model="quickCreate.id_position">
            <option :value="null" disabled>— Select a position —</option>
            <option v-for="p in positions" :key="p.id_position" :value="p.id_position">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Employee <span class="label-optional">(optional)</span></label>
          <select v-model="quickCreate.employee">
            <option value="">— Unassigned —</option>
            <option v-for="e in employees" :key="e.name" :value="e.name">{{ e.name }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start</label><input type="time" v-model="quickCreate.startTime" /></div>
          <div class="form-group"><label>End</label><input type="time" v-model="quickCreate.endTime" /></div>
        </div>
        <div class="form-group">
          <label>Notes <span class="label-optional">(optional)</span></label>
          <input type="text" v-model="quickCreate.notes" placeholder="e.g. Cover front desk" />
        </div>
        <div class="qc-actions">
          <button class="qc-cancel" @click="cancelQuickCreate">Cancel</button>
          <button class="qc-confirm" @click="confirmQuickCreate"><span>✓</span> Save Shift</button>
        </div>
      </div>
    </Transition>

    <!-- ── Full Add / Edit Modal ── -->
    <Transition name="modal">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal">
          <h2 class="modal-title">{{ editingShiftId ? 'Edit Shift' : 'Add Shift' }}</h2>
          <div class="form-group">
            <label>Position</label>
            <select v-model="newShift.id_position">
              <option :value="null" disabled>— Select a position —</option>
              <option v-for="p in positions" :key="p.id_position" :value="p.id_position">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Employee <span class="label-optional">(optional)</span></label>
            <select v-model="newShift.employee" @change="newShift.id_employee = employees.find(e => e.name === newShift.employee)?.id_employee ?? null">
              <option value="">— Unassigned —</option>
              <option v-for="e in employees" :key="e.name" :value="e.name">{{ e.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Day</label>
            <select v-model="newShift.dayIndex">
              <option v-for="(date, i) in weekDates" :key="i" :value="i">{{ dayLetters[i] }} {{ date.getDate() }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Start</label><input type="time" v-model="newShift.startTime" /></div>
            <div class="form-group"><label>End</label><input type="time" v-model="newShift.endTime" /></div>
          </div>
          <div class="form-group">
            <label>Notes <span class="label-optional">(optional)</span></label>
            <input type="text" v-model="newShift.notes" placeholder="e.g. Cover front desk" />
          </div>
          <div class="modal-actions">
            <button class="modal-cancel" @click="showAddModal = false">Cancel</button>
            <button class="modal-confirm" @click="addShift">{{ editingShiftId ? 'Save Changes' : 'Add Shift' }}</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Shift Tasks Modal ── -->
    <Transition name="modal">
      <div v-if="shiftTasksModal.open" class="modal-overlay" @click.self="shiftTasksModal.open = false">
        <div class="modal stm-modal">
          <div class="stm-header">
            <div>
              <h2 class="modal-title">{{ isManager ? 'Shift Task Lists' : 'Your Tasks' }}</h2>
              <p class="stm-sub">
                {{ shiftTasksModal.shift?.employee }} ·
                {{ formatShiftDate(shiftTasksModal.shift?.date) }}
              </p>
            </div>
            <button class="stm-close" @click="shiftTasksModal.open = false">✕</button>
          </div>

          <p v-if="shiftTasksModal.error" class="stm-error">{{ shiftTasksModal.error }}</p>

          <div v-if="shiftTasksModal.loading" class="stm-loading">
            <div class="stm-spinner"></div>
            <span>Loading tasks…</span>
          </div>

          <!-- Assigned Task Lists -->
          <div v-if="!shiftTasksModal.loading" class="stm-lists">
            <div
              v-for="stl in shiftTasksModal.shiftTaskLists"
              :key="stl.id_shiftTaskList"
              class="stm-list-card">
              <div class="stm-list-header">
                <div class="stm-list-meta">
                  <span class="stm-list-name">{{ stl.taskList?.name || 'Unknown List' }}</span>
                  <span class="stm-progress">
                    {{ stl.statuses.filter(s => s.isCompleted).length }}/{{ stl.statuses.length }} done
                  </span>
                </div>
                <button v-if="isManager" class="stm-remove-btn" title="Remove from shift" @click="removeShiftTaskListItem(stl)">✕</button>
              </div>
              <!-- Progress bar -->
              <div class="stm-prog-bar">
                <div
                  class="stm-prog-fill"
                  :style="{ width: stl.statuses.length ? (stl.statuses.filter(s=>s.isCompleted).length / stl.statuses.length * 100) + '%' : '0%' }">
                </div>
              </div>
              <!-- Task rows -->
              <div class="stm-tasks">
                <label
                  v-for="status in stl.statuses"
                  :key="status.id_shiftTaskListStatus"
                  class="stm-task-row"
                  :class="{ 'stm-task-disabled': isManager }">
                  <input
                    type="checkbox"
                    class="stm-checkbox"
                    :checked="status.isCompleted"
                    :disabled="isManager"
                    @change="toggleTaskStatus(status)"
                  />
                  <span class="stm-task-name" :class="{ done: status.isCompleted }">
                    {{ taskNameById(status.id_task) }}
                  </span>
                </label>
                <div v-if="stl.statuses.length === 0" class="stm-no-tasks">
                  No tasks in this list.
                </div>
              </div>
            </div>

            <div v-if="shiftTasksModal.shiftTaskLists.length === 0" class="stm-empty-state">
              <p>No task lists assigned to this shift yet.</p>
              <p v-if="!isManager" class="stm-empty-sub">Ask your manager to assign tasks.</p>
            </div>
          </div>

          <!-- Manager: Assign Task List -->
          <div v-if="isManager && !shiftTasksModal.loading" class="stm-assign-section">
            <p class="stm-assign-label">Assign Task List to This Shift</p>
            <div class="stm-assign-row">
              <select v-model="shiftTasksModal.selectedTaskListId" class="stm-select">
                <option :value="null" disabled>Select a task list…</option>
                <option v-for="tl in taskLists" :key="tl.id_taskList" :value="tl.id_taskList">
                  {{ tl.name }}
                </option>
              </select>
              <button
                class="stm-assign-btn"
                :disabled="shiftTasksModal.saving || !shiftTasksModal.selectedTaskListId"
                @click="assignTaskListToCurrentShift">
                {{ shiftTasksModal.saving ? '…' : 'Assign' }}
              </button>
            </div>
            <p v-if="taskLists.length === 0" class="stm-hint">
              No task lists exist yet.
              <span class="stm-link" @click="$router.push('/tasks')">Create one in Tasks →</span>
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Shift Detail Popover ── -->
    <Transition name="fade">
      <div v-if="selectedShift" class="shift-popover" :style="popoverStyle" @mousedown.stop>
        <button class="popover-close" @click="selectedShift = null">✕</button>
        <div class="popover-dot" :style="{ background: getEmployeeColor(selectedShift.employee) }"></div>
        <div class="popover-employee">{{ [selectedShift.positionName, selectedShift.employee].filter(Boolean).join(' – ') }}</div>
        <div class="popover-time">{{ selectedShift.startLabel }} – {{ selectedShift.endLabel }}</div>
        <div class="popover-day">{{ selectedShiftDateLabel }}</div>
        <div v-if="selectedShift.notes" class="popover-notes">{{ selectedShift.notes }}</div>
        <div class="popover-actions">
          <button class="popover-edit" @click="editShift">Edit</button>
          <button
            v-if="isManager || selectedShift.id_employee === currentUser?.id_employee"
            class="popover-tasks"
            @click="openShiftTasksModal(selectedShift)">
            Tasks
          </button>
          <button class="popover-delete" @click="deleteShift(selectedShift.id)">Delete</button>
        </div>
      </div>
    </Transition>

  </div>

  <!-- ── Profile panel ── -->
  <Transition name="slide-right">
    <div v-if="profileOpen" class="profile-overlay" @click.self="profileOpen = false">
      <div class="profile-panel">
        <div class="profile-header">
          <div class="profile-avatar-lg">
            <img v-if="currentUser?.picture" :src="currentUser.picture" class="avatar-img" referrerpolicy="no-referrer" />
            <span v-else>{{ userInitials }}</span>
          </div>
          <button class="profile-close" @click="profileOpen = false">✕</button>
        </div>
        <div class="profile-body">
          <h2 class="profile-name">{{ currentUser?.fName }} {{ currentUser?.lName }}</h2>
          <p class="profile-email">{{ currentUser?.email }}</p>
          <span class="profile-role-badge" :class="currentUser?.role?.toLowerCase()">{{ currentUser?.role }}</span>
        </div>
        <div class="profile-divider"></div>
        <button class="profile-btn" @click="">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <!-- Profile icon body -->
            <path
              d="M4 21 A8 8 0 0 1 20 21"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
            />
            <!-- Profile icon head -->
            <circle
              cx="12"
              cy="7.5"
              r="5"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          Profile
        </button>
        <button class="settings-btn" @click="">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <!-- Gear icon teeth -->
            <path
              d="M19.4 12a7.4 7.4 0 0 0-.1-1l2-1.6-2-3.5-2.4 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.6a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.5 2.4-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.6c.07-.33.1-.66.1-1z"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              stroke-linejoin="round"
            />
            <!-- Gear icon hole -->
            <circle
              cx="12.75"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          Settings
        </button>
        <button class="logout-btn" @click="logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Log Out
        </button>
      </div>
    </div>
  </Transition>

</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import { useTheme } from "../composables/useTheme.js";

const { isDark, toggleTheme } = useTheme();
import {
  fetchEmployees,
  fetchShiftsWithAssignments,
  createShift      as apiCreateShift,
  updateShift      as apiUpdateShift,
  deleteShift      as apiDeleteShift,
  createAssignment  as apiCreateAssignment,
  deleteAssignment  as apiDeleteAssignment,
  fetchSwapRequests,
} from "../services/schedulingService.js";
import { getDepartment, getCalendarEntries, getEvents, getPositions } from "../services/departmentService.js";
import {
  fetchTaskLists,
  fetchTasks,
  getShiftTaskLists,
  assignTaskListToShift,
  removeShiftTaskList,
  getTaskListStatuses,
  updateTaskComplete,
} from "../services/taskService.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const CELL_HEIGHT    = 60;
const CAL_START_HOUR = 0;   // full 24-hour grid
const SNAP_MINUTES   = 15;
const MAX_PILLS      = 3;
const DAY_NAMES      = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_ABBR       = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// Palette cycles through these colors as employees are loaded from the DB
// Employee colors — warm palette complementing maroon + gold
const EMPLOYEE_COLORS = ["#F0E6D3","#C0392B","#FF1744","#E8724A","#9B6B9B","#4A90A4","#e2d5c3","#D4756B"];

// ── Core state ─────────────────────────────────────────────────────────────────
const router = useRouter();

function handleTabClick(tab) {
  const routes = {
    Department: "/department",
    Employees:  "/manage",
    Shifts:     "/manage?tab=Shifts",
    Tradeboard: "/tradeboard",
    Tasks:      "/tasks",
    Requests:   "/requests",
  };
  if (routes[tab]) {
    router.push(routes[tab]);
  } else {
    activeTab.value = tab;
  }
}

const profileOpen = ref(false);

async function logout() {
  try {
    const user = Utils.getStore("user");
    if (user?.token) {
      await AuthServices.logoutUser({ token: user.token });
    }
  } catch (e) {
    // proceed even if logout API fails
  }
  Utils.removeItem("user");
  router.push("/start");
}
const activeTab      = ref("Schedules");
const calView        = ref("Week");
const weekOffset     = ref(0);
const dayOffset      = ref(0);
const monthOffset    = ref(0);
const showAddModal   = ref(false);
const editingShiftId = ref(null);
const selectedShift  = ref(null);
const popoverStyle   = ref({});
const calBody        = ref(null);

// ── Loading / error state ──────────────────────────────────────────────────────
const loading = ref(true);
const apiError = ref(null);

const tabs = computed(() => {
  const base = ["Schedules", "Employees", "Shifts", "Tradeboard", "Tasks", "Requests"];
  if (currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin") {
    base.splice(1, 0, "Department");
  }
  return base;
});
const dayLetters  = ["S","M","T","W","R","F","S"];
const hours       = Array.from({ length: 24 }, (_, i) => i);

// ── Live data (populated from API on mount) ────────────────────────────────────
// employees: [{ id_employee, fName, lName, email, color, name }]
const employees    = ref([]);
// employeeMap: { [id_employee]: employee } — for fast lookups
const employeeMap  = ref({});

const shifts          = ref([]);
const pendingRequests = ref([]);
const calendarHours   = ref([]); // hours of operation from department calendar
const deptEvents      = ref([]); // department events
const deptName        = ref('');
const positions       = ref([]);

// ── Task state ─────────────────────────────────────────────────────────────────
const taskLists = ref([]);
const allTasks  = ref([]);

const isManager = computed(() =>
  currentUser.value?.role === "Manager" || currentUser.value?.role === "Admin"
);

const shiftTasksModal = ref({
  open: false,
  shift: null,
  shiftTaskLists: [],   // [{ id_shiftTaskList, id_taskList, taskList, statuses }]
  selectedTaskListId: null,
  loading: false,
  saving: false,
  error: "",
});

// Employee sidebar: task lists from today's shifts
const myShiftTasks = ref([]); // [{ shiftTaskListId, taskList, statuses, completedCount, totalCount }]

// Derived from logged-in user (placeholder until auth is wired up)
const currentUser = ref(Utils.getStore("user") || { fName: "?", lName: "?" });
const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u.fName?.[0] ?? ""}${u.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

const newShift = ref({ employee: "", id_employee: null, id_position: null, dayIndex: 0, startTime: "09:00", endTime: "17:00", notes: "" });

// Drag state
const drag = ref({ active: false, dayIndex: null, startHour: null, currentHour: null, colEl: null });
const quickCreate = ref({ visible: false, dayIndex: null, date: null, startHour: null, endHour: null, startLabel: "", endLabel: "", startTime: "", endTime: "", dateLabel: "", id_position: null, employee: "", notes: "", style: {} });

// ── Date helpers ───────────────────────────────────────────────────────────────
function dateKey(weekOff, dayIdx) {
  // Returns YYYY-MM-DD for a given week offset + day index
  const today  = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOff * 7);
  const d = new Date(sunday);
  d.setDate(sunday.getDate() + dayIdx);
  return d.toISOString().slice(0, 10);
}

function dateToKey(d) { return d.toISOString().slice(0, 10); }

function keyToDate(k) { const [y,m,d] = k.split("-").map(Number); return new Date(y, m-1, d); }

// ── Computed — navigation ──────────────────────────────────────────────────────
const weekDates = computed(() => {
  const today  = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset.value * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
});

const dayViewDate = computed(() => {
  const today = new Date();
  const d = new Date(today);
  d.setDate(today.getDate() + dayOffset.value);
  return d;
});

// Month view reference date
const monthViewDate = computed(() => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + monthOffset.value, 1);
});

const navLabel = computed(() => {
  if (calView.value === "Day") {
    return dayViewDate.value.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  if (calView.value === "Week") {
    const d = weekDates.value;
    const o = { month: "short", day: "numeric" };
    return `${d[0].toLocaleDateString("en-US", o)} – ${d[6].toLocaleDateString("en-US", { ...o, year: "numeric" })}`;
  }
  // Month
  return monthViewDate.value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
});

// For sidebar mini-cal, always track week
const miniCalMonth = computed(() => weekDates.value[0].toLocaleString("default", { month: "long", year: "numeric" }));
const startPad = computed(() => { const d = weekDates.value[0]; return new Date(d.getFullYear(), d.getMonth(), 1).getDay(); });
const daysInMonth = computed(() => { const d = weekDates.value[0]; return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); });

// ── Computed — month grid ──────────────────────────────────────────────────────
const monthPadStart = computed(() => {
  return monthViewDate.value.getDay(); // 0 = Sun
});

const daysInCurrentMonth = computed(() => {
  const d = monthViewDate.value;
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
});

// Dates from prev month to show in leading pads
const monthPadDates = computed(() => {
  const d   = monthViewDate.value;
  const dim = new Date(d.getFullYear(), d.getMonth(), 0).getDate(); // days in prev month
  return Array.from({ length: monthPadStart.value }, (_, i) => dim - monthPadStart.value + i + 1);
});

const monthPadEnd = computed(() => {
  const total = monthPadStart.value + daysInCurrentMonth.value;
  const rem   = total % 7;
  return rem === 0 ? 0 : 7 - rem;
});

// ── Computed — misc ────────────────────────────────────────────────────────────
const todaysEmployees = computed(() => {
  const key   = dateToKey(new Date());
  const names = [...new Set(shifts.value.filter(s => s.date === key).map(s => s.employee))];
  return names.map(n => employees.value.find(e => e.name === n)).filter(Boolean);
});

const currentTimePx = computed(() => {
  const now = new Date();
  return (now.getHours() + now.getMinutes() / 60 - CAL_START_HOUR) * CELL_HEIGHT;
});

const ghostStyle = computed(() => {
  if (!drag.value.active) return {};
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return { position: "absolute", top: `${(s - CAL_START_HOUR) * CELL_HEIGHT}px`, height: `${Math.max((e - s) * CELL_HEIGHT - 2, 20)}px`, left: "3px", right: "3px", zIndex: 10 };
});

const ghostLabel = computed(() => {
  if (!drag.value.active) return "";
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return `${fmtHour(s)} – ${fmtHour(e)}`;
});

const selectedShiftDateLabel = computed(() => {
  if (!selectedShift.value) return "";
  const d = keyToDate(selectedShift.value.date);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
});

// ── Computed open shifts — vacant time blocks across the current week ──────────
// Logic:
//  1. For each day in the visible week, collect all scheduled shifts
//  2. Sort by startHour, then merge overlapping intervals
//  3. The "gaps" are the holes between CAL_START_HOUR and CAL_END_HOUR not covered by any shift
//  4. Only emit days that actually have at least one gap
const CAL_END_HOUR = 24;

const DAY_NAMES_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function businessHoursForDate(date) {
  const dayName = DAY_NAMES_FULL[date.getDay()];
  const entry   = calendarHours.value.find(h => h.dayOfWeek === dayName);
  if (!entry) return null;
  return { start: fromTimeInput(entry.startTime), end: fromTimeInput(entry.endTime) };
}

const computedOpenShifts = computed(() => {
  const result = [];
  const abbr   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  weekDates.value.forEach(date => {
    const biz = businessHoursForDate(date);
    if (!biz) return; // no business hours defined for this day — skip

    const key        = dateToKey(date);
    const dayShifts  = shifts.value.filter(s => s.date === key);
    const assigned   = dayShifts.filter(s => s.id_employee);
    const unassigned = dayShifts.filter(s => !s.id_employee);

    // Build coverage from assigned shifts only, clamped to business hours
    const merged = [];
    for (const iv of assigned
      .map(s => ({ start: Math.max(s.startHour, biz.start), end: Math.min(s.endHour, biz.end) }))
      .filter(iv => iv.start < iv.end)
      .sort((a, b) => a.start - b.start)) {
      if (!merged.length || iv.start > merged[merged.length - 1].end) merged.push({ ...iv });
      else merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
    }

    // Time gaps within business hours only
    const gapItems = [];
    let cursor = biz.start;
    for (const { start, end } of merged) {
      if (start > cursor) gapItems.push({ sortHour: cursor, label: `${fmtHour(cursor)} – ${fmtHour(start)}` });
      cursor = Math.max(cursor, end);
    }
    if (cursor < biz.end) gapItems.push({ sortHour: cursor, label: `${fmtHour(cursor)} – ${fmtHour(biz.end)}` });

    // Unassigned shifts that fall within business hours
    const unassignedItems = unassigned
      .filter(s => s.startHour < biz.end && s.endHour > biz.start)
      .map(s => ({
        sortHour: s.startHour,
        label: s.positionName ? `${s.positionName}  ${fmtHour(s.startHour)} – ${fmtHour(s.endHour)}` : `${fmtHour(s.startHour)} – ${fmtHour(s.endHour)}`,
      }));

    const items = [...gapItems, ...unassignedItems].sort((a, b) => a.sortHour - b.sortHour);

    if (items.length > 0) {
      result.push({
        key,
        dayLabel: abbr[date.getDay()],
        gaps:     items.map(i => i.label),
        isToday:  isTodayDate(date),
      });
    }
  });

  return result;
});

// ── Shift queries ──────────────────────────────────────────────────────────────
function shiftsForWeekDay(colIdx) {
  const key = dateToKey(weekDates.value[colIdx]);
  return shifts.value.filter(s => s.date === key);
}

const dayViewShifts = computed(() => {
  const key = dateToKey(dayViewDate.value);
  return shifts.value.filter(s => s.date === key);
});

function shiftsForMonthDay(day) {
  const d   = monthViewDate.value;
  const key = dateToKey(new Date(d.getFullYear(), d.getMonth(), day));
  const all = shifts.value.filter(s => s.date === key);
  return all.slice(0, MAX_PILLS);
}

function extraShiftCount(day) {
  const d   = monthViewDate.value;
  const key = dateToKey(new Date(d.getFullYear(), d.getMonth(), day));
  const cnt = shifts.value.filter(s => s.date === key).length;
  return Math.max(0, cnt - MAX_PILLS);
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigate(dir) {
  if (calView.value === "Day")   dayOffset.value   += dir;
  if (calView.value === "Week")  weekOffset.value  += dir;
  if (calView.value === "Month") monthOffset.value += dir;
}

function goToday() {
  dayOffset.value   = 0;
  weekOffset.value  = 0;
  monthOffset.value = 0;
}

function setView(v) {
  calView.value = v;
  selectedShift.value       = null;
  quickCreate.value.visible = false;
}

// Click a day header in week view → drill to day
function drillToDay(date) {
  const today = new Date();
  dayOffset.value = Math.round((date - today) / 86400000);
  calView.value   = "Day";
}

// Click a month cell → drill to day
function drillToMonthDay(day) {
  const d     = monthViewDate.value;
  const target = new Date(d.getFullYear(), d.getMonth(), day);
  const today  = new Date();
  dayOffset.value = Math.round((target - today) / 86400000);
  calView.value   = "Day";
}

function jumpToDay(day) {
  const d      = weekDates.value[0];
  const target = new Date(d.getFullYear(), d.getMonth(), day);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  dayOffset.value  = Math.round((target - today) / 86400000);
  calView.value    = 'Day';
}

// ── Mini-cal helpers ───────────────────────────────────────────────────────────
function isToday(day) {
  const t = new Date(), d = weekDates.value[0];
  return t.getDate() === day && t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear();
}
function isSelectedDay(day) {
  if (calView.value !== 'Day') return false;
  const ref = weekDates.value[0];
  return dayViewDate.value.getDate() === day
    && dayViewDate.value.getMonth() === ref.getMonth()
    && dayViewDate.value.getFullYear() === ref.getFullYear();
}
function isInCurrentWeek(day) {
  return weekDates.value.some(d => d.getDate() === day && d.getMonth() === weekDates.value[0].getMonth());
}
function isTodayDate(date) {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
}
function isMonthToday(day) {
  const t = new Date(), d = monthViewDate.value;
  return t.getDate() === day && t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear();
}
function isMonthSelected(day) {
  if (calView.value !== "Month") return false;
  const d = monthViewDate.value;
  const sel = new Date(d.getFullYear(), d.getMonth(), day);
  return isTodayDate(sel) && monthOffset.value === 0;
}

// ── Formatting ─────────────────────────────────────────────────────────────────
function formatHour(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function parseTimeToHour(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

function hoursLinesForDate(date) {
  const dayName = DAY_NAMES[date.getDay()];
  return calendarHours.value
    .filter(e => e.dayOfWeek === dayName)
    .map(e => ({
      key:        e.id_hours_of_operation,
      openPx:     parseTimeToHour(e.startTime) * CELL_HEIGHT,
      closePx:    parseTimeToHour(e.endTime)   * CELL_HEIGHT,
      openLabel:  fmtHour(parseTimeToHour(e.startTime)),
      closeLabel: fmtHour(parseTimeToHour(e.endTime)),
    }));
}

function eventsForDate(date) {
  const dateStr = dateToKey(date);
  return deptEvents.value
    .filter(ev => ev.start_time && new Date(ev.start_time).toISOString().slice(0, 10) === dateStr)
    .map(ev => {
      const s = new Date(ev.start_time);
      const e = new Date(ev.end_time || ev.start_time);
      const startHour = s.getHours() + s.getMinutes() / 60;
      const endHour   = Math.max(e.getHours() + e.getMinutes() / 60, startHour + 0.5);
      return { ...ev, startHour, endHour };
    });
}

function eventBlockStyle(ev) {
  return {
    position: "absolute",
    top:    `${ev.startHour * CELL_HEIGHT}px`,
    height: `${Math.max((ev.endHour - ev.startHour) * CELL_HEIGHT - 3, 22)}px`,
    left: "3px", right: "3px",
    background: "rgba(74,144,164,0.18)",
    border: "1px solid rgba(74,144,164,0.5)",
    borderLeft: "3px solid #4A90A4",
    borderRadius: "6px",
    padding: "4px 8px",
    overflow: "hidden",
    zIndex: 1,
    pointerEvents: "none",
  };
}

function eventsForMonthDay(day) {
  const d   = monthViewDate.value;
  const key = dateToKey(new Date(d.getFullYear(), d.getMonth(), day));
  return deptEvents.value.filter(ev => ev.start_time && new Date(ev.start_time).toISOString().slice(0, 10) === key);
}
function fmtHour(h) {
  const total  = Math.round(h * 60);
  const hr     = Math.floor(total / 60);
  const min    = total % 60;
  const suffix = hr >= 12 ? "pm" : "am";
  const disp   = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return min === 0 ? `${disp}${suffix}` : `${disp}:${String(min).padStart(2,"0")}${suffix}`;
}
function toTimeInput(h) {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
}
function fromTimeInput(t) { const [h, m] = t.split(":").map(Number); return h + m / 60; }

// ── Style helpers ──────────────────────────────────────────────────────────────
function shiftStyle(shift) {
  const color = getEmployeeColor(shift.employee);
  return {
    position: "absolute",
    top:    `${(shift.startHour - CAL_START_HOUR) * CELL_HEIGHT}px`,
    height: `${Math.max((shift.endHour - shift.startHour) * CELL_HEIGHT - 3, 18)}px`,
    left: "3px", right: "3px", background: color,
    borderRadius: "6px", padding: "4px 8px", cursor: "pointer",
    overflow: "hidden", zIndex: 2, boxShadow: `0 2px 12px ${color}44`, transition: "filter 0.15s",
  };
}
function getEmployeeColor(name) { return employees.value.find(e => e.name === name)?.color || "#3b82f6"; }

// ── Snap / drag helpers ────────────────────────────────────────────────────────
function snap(rawHour) {
  const s = Math.round(rawHour / (SNAP_MINUTES / 60)) * (SNAP_MINUTES / 60);
  return Math.max(CAL_START_HOUR, Math.min(CAL_START_HOUR + hours.length, s));
}
function getHourFromEvent(e, colEl) {
  // getBoundingClientRect().top is already viewport-relative and accounts for scroll,
  // so e.clientY - colRect.top gives the exact pixel offset within the column directly.
  const colRect = colEl.getBoundingClientRect();
  const relY    = e.clientY - colRect.top;
  return snap(CAL_START_HOUR + relY / CELL_HEIGHT);
}

// ── Drag handlers ──────────────────────────────────────────────────────────────
function onColumnMouseDown(e, colIdx) {
  if (e.button !== 0) return;
  selectedShift.value       = null;
  quickCreate.value.visible = false;
  const startHour = getHourFromEvent(e, e.currentTarget);
  drag.value = { active: true, dayIndex: colIdx, startHour, currentHour: startHour, colEl: e.currentTarget };
}
function onGlobalMouseMove(e) {
  if (!drag.value.active || !drag.value.colEl) return;
  drag.value.currentHour = getHourFromEvent(e, drag.value.colEl);
}
function onGlobalMouseUp(e) {
  if (!drag.value.active) return;
  const startHour = Math.min(drag.value.startHour, drag.value.currentHour);
  const endHour   = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  const colIdx    = drag.value.dayIndex;
  drag.value.active = false;

  if (endHour - startHour < SNAP_MINUTES / 60 + 0.001) return;

  // Resolve actual date from view
  let date;
  if (calView.value === "Day")  date = dayViewDate.value;
  else                           date = weekDates.value[colIdx];

  const dateLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const px = Math.min(e.clientX + 14, window.innerWidth  - 300);
  const py = Math.min(e.clientY - 24, window.innerHeight - 430);

  quickCreate.value = {
    visible: true, dayIndex: colIdx, date,
    startHour, endHour,
    startLabel: fmtHour(startHour), endLabel: fmtHour(endHour),
    startTime:  toTimeInput(startHour), endTime: toTimeInput(endHour),
    dateLabel,
    id_position: positions.value[0]?.id_position ?? null,
    employee: "",
    notes: "",
    style: { left: `${px}px`, top: `${py}px` },
  };
}
function cancelQuickCreate() { quickCreate.value.visible = false; }

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = null;
  try {
    const [empList, tlData, tData] = await Promise.all([
      fetchEmployees(),
      fetchTaskLists().catch(() => []),
      fetchTasks().catch(() => []),
    ]);
    const map = {};
    empList.forEach((e, i) => {
      e.color = e.color || EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length];
      e.name  = `${e.fName} ${e.lName}`;
      map[e.id_employee] = e;
    });
    employees.value   = empList;
    employeeMap.value = map;
    taskLists.value   = tlData;
    allTasks.value    = tData;
    if (empList.length > 0) {
      newShift.value.employee    = empList[0].name;
      newShift.value.id_employee = empList[0].id_employee;
    }
    const deptId = currentUser.value?.id_department;
    // Load positions first so positionMap is ready for the shift JOIN
    if (deptId) {
      try { positions.value = (await getPositions(deptId)).data || []; } catch { /* non-critical */ }
    }
    const positionMap = Object.fromEntries(positions.value.map(p => [p.id_position, p]));
    shifts.value = await fetchShiftsWithAssignments(map, positionMap);
    pendingRequests.value = await fetchSwapRequests(map);
    // Load hours of operation + events for this user's department (non-blocking)
    if (deptId) {
      getDepartment(deptId).then(r => { deptName.value = r.data?.name || ''; }).catch(() => {});
      getCalendarEntries(deptId).then(r => { calendarHours.value = r.data || []; }).catch(() => {});
      getEvents(deptId).then(r => { deptEvents.value = r.data || []; }).catch(() => {});
    }
    loadMyTasks(); // async, non-blocking — populates employee sidebar
  } catch (err) {
    apiError.value = err.message;
    console.error("Dashboard load error:", err);
  } finally {
    loading.value = false;
  }
}

// ── Shift CRUD (API-backed) ────────────────────────────────────────────────────
async function confirmQuickCreate() {
  const qc = quickCreate.value;
  if (!qc.id_position) { alert("Please select a position."); return; }
  const startHour  = fromTimeInput(qc.startTime);
  const endHour    = fromTimeInput(qc.endTime);
  const emp        = employees.value.find(e => e.name === qc.employee);
  const posName    = positions.value.find(p => p.id_position === qc.id_position)?.name || "";
  try {
    const block = await apiCreateShift({
      id_employee:  emp?.id_employee ?? null,
      date:         dateToKey(qc.date),
      startHour, endHour,
      notes:        qc.notes,
      positionName: posName,
      id_position:  qc.id_position,
    });
    block.employee     = emp?.name || "";
    block.positionName = posName;
    shifts.value.push(block);
    quickCreate.value.visible = false;
  } catch (err) { alert("Error saving shift: " + err.message); }
}

function selectShift(shift, e) {
  quickCreate.value.visible = false;
  selectedShift.value       = shift;
  const px = Math.min(e.clientX + 16, window.innerWidth  - 230);
  const py = Math.min(e.clientY - 10, window.innerHeight - 240);
  popoverStyle.value = { left: `${px}px`, top: `${py}px` };
}
function selectShiftFromMonth(shift, day, e) {
  quickCreate.value.visible = false;
  selectedShift.value       = shift;
  const px = Math.min(e.clientX + 16, window.innerWidth  - 230);
  const py = Math.min(e.clientY - 10, window.innerHeight - 240);
  popoverStyle.value = { left: `${px}px`, top: `${py}px` };
}
function editShift() {
  const s = selectedShift.value;
  if (!s) return;
  editingShiftId.value = s.id;
  newShift.value = { employee: s.employee, id_employee: s.id_employee, id_position: s.id_position || null, dayIndex: s.dayIndex, startTime: toTimeInput(s.startHour), endTime: toTimeInput(s.endHour), notes: s.notes || "" };
  selectedShift.value = null;
  showAddModal.value  = true;
}
async function deleteShift(id) {
  const s = shifts.value.find(sh => sh.id === id);
  if (!s) return;
  try {
    await apiDeleteShift(s.id_shiftAssignment, s.id_shift);
    shifts.value        = shifts.value.filter(sh => sh.id !== id);
    selectedShift.value = null;
  } catch (err) { alert("Error deleting shift: " + err.message); }
}
function openBlankModal() {
  editingShiftId.value = null;
  newShift.value = { employee: "", id_employee: null, id_position: positions.value[0]?.id_position ?? null, dayIndex: 0, startTime: "09:00", endTime: "17:00", notes: "" };
  showAddModal.value = true;
}
async function addShift() {
  if (!newShift.value.id_position) { alert("Please select a position."); return; }
  const startHour    = fromTimeInput(newShift.value.startTime);
  const endHour      = fromTimeInput(newShift.value.endTime);
  const posName      = positions.value.find(p => p.id_position === newShift.value.id_position)?.name || "";

  if (editingShiftId.value) {
    const existing = shifts.value.find(s => s.id === editingShiftId.value);
    if (!existing) return;
    try {
      await apiUpdateShift(existing.id_shift, { startHour, endHour, notes: newShift.value.notes, id_position: newShift.value.id_position });
      const idx = shifts.value.findIndex(s => s.id === editingShiftId.value);
      let updated = { ...shifts.value[idx], startHour, endHour, startLabel: fmtHour(startHour), endLabel: fmtHour(endHour), notes: newShift.value.notes, id_position: newShift.value.id_position, positionName: posName };
      const prevEmpId = existing.id_employee;
      const nextEmpId = newShift.value.id_employee || null;
      if (prevEmpId && !nextEmpId) {
        // Unassign: delete the assignment row
        await apiDeleteAssignment(existing.id_shiftAssignment);
        updated = { ...updated, id: `shift-${existing.id_shift}`, id_shiftAssignment: null, id_employee: null, employee: "" };
      } else if (!prevEmpId && nextEmpId) {
        // Assign for the first time
        const emp = employees.value.find(e => e.id_employee === nextEmpId);
        const assignment = await apiCreateAssignment(existing.id_shift, nextEmpId, existing.date);
        updated = { ...updated, id: assignment.id_shiftAssignment, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: emp?.name || "" };
      } else if (prevEmpId && nextEmpId && prevEmpId !== nextEmpId) {
        // Switch employee: delete old assignment, create new one
        await apiDeleteAssignment(existing.id_shiftAssignment);
        const emp = employees.value.find(e => e.id_employee === nextEmpId);
        const assignment = await apiCreateAssignment(existing.id_shift, nextEmpId, existing.date);
        updated = { ...updated, id: assignment.id_shiftAssignment, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: emp?.name || "" };
      }
      shifts.value[idx] = updated;
    } catch (err) { alert("Error updating shift: " + err.message); return; }
    editingShiftId.value = null;
  } else {
    const emp = employees.value.find(e => e.name === newShift.value.employee);
    try {
      const block = await apiCreateShift({
        id_employee:  emp?.id_employee ?? null,
        date:         dateKey(weekOffset.value, Number(newShift.value.dayIndex)),
        startHour, endHour,
        notes:        newShift.value.notes,
        positionName: posName,
        id_position:  newShift.value.id_position,
      });
      block.employee     = emp?.name || "";
      block.positionName = posName;
      shifts.value.push(block);
    } catch (err) { alert("Error creating shift: " + err.message); return; }
  }
  showAddModal.value = false;
}

// ── Task helpers ───────────────────────────────────────────────────────────────

function formatShiftDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function taskNameById(id_task) {
  return allTasks.value.find(t => t.id_task === id_task)?.name || `Task #${id_task}`;
}

async function openShiftTasksModal(shift) {
  selectedShift.value = null;
  shiftTasksModal.value = {
    open: true,
    shift,
    shiftTaskLists: [],
    selectedTaskListId: taskLists.value[0]?.id_taskList ?? null,
    loading: true,
    saving: false,
    error: "",
  };
  try {
    const stls = await getShiftTaskLists(shift.id_shift);
    const enriched = await Promise.all(
      stls.map(async (stl) => {
        const statuses  = await getTaskListStatuses(stl.id_shiftTaskList);
        const taskList  = taskLists.value.find(l => l.id_taskList === stl.id_taskList);
        return { ...stl, taskList, statuses };
      })
    );
    shiftTasksModal.value.shiftTaskLists = enriched;
  } catch (err) {
    shiftTasksModal.value.error = "Could not load tasks: " + (err.message || "Network error");
  } finally {
    shiftTasksModal.value.loading = false;
  }
}

async function assignTaskListToCurrentShift() {
  const id_taskList = shiftTasksModal.value.selectedTaskListId;
  if (!id_taskList) return;
  // Prevent duplicate assignments
  if (shiftTasksModal.value.shiftTaskLists.some(s => s.id_taskList === id_taskList)) {
    shiftTasksModal.value.error = "This task list is already assigned to this shift.";
    return;
  }
  shiftTasksModal.value.saving = true;
  shiftTasksModal.value.error  = "";
  try {
    const newStl   = await assignTaskListToShift(shiftTasksModal.value.shift.id_shift, id_taskList);
    const taskList = taskLists.value.find(l => l.id_taskList === id_taskList);
    const statuses = await getTaskListStatuses(newStl.id_shiftTaskList);
    shiftTasksModal.value.shiftTaskLists.push({ ...newStl, taskList, statuses });
    // Refresh sidebar tasks if employee
    if (!isManager.value) loadMyTasks();
  } catch (err) {
    shiftTasksModal.value.error = err.message || "Assignment failed.";
  } finally {
    shiftTasksModal.value.saving = false;
  }
}

async function removeShiftTaskListItem(stl) {
  try {
    await removeShiftTaskList(stl.id_shiftTaskList);
    shiftTasksModal.value.shiftTaskLists = shiftTasksModal.value.shiftTaskLists.filter(
      s => s.id_shiftTaskList !== stl.id_shiftTaskList
    );
  } catch (err) {
    shiftTasksModal.value.error = err.message || "Could not remove task list.";
  }
}

async function toggleTaskStatus(status) {
  const newVal = !status.isCompleted;
  try {
    await updateTaskComplete(status.id_shiftTaskListStatus, newVal);
    status.isCompleted = newVal;
    // Refresh sidebar counts
    const stl = myShiftTasks.value.find(s => s.shiftTaskListId === status.id_shiftTaskList);
    if (stl) stl.completedCount = stl.statuses.filter(s => s.isCompleted).length;
  } catch (err) {
    shiftTasksModal.value.error = "Could not update task: " + (err.message || "Error");
  }
}

// Employee-only: load task lists for today's own shifts (populates sidebar)
async function loadMyTasks() {
  if (isManager.value) return;
  const myId     = currentUser.value?.id_employee;
  if (!myId) return;
  const todayKey = dateToKey(new Date());
  const todayShifts = shifts.value.filter(s => s.date === todayKey && s.id_employee === myId);
  const results = [];
  for (const shift of todayShifts) {
    try {
      const stls = await getShiftTaskLists(shift.id_shift);
      for (const stl of stls) {
        const statuses  = await getTaskListStatuses(stl.id_shiftTaskList);
        const taskList  = taskLists.value.find(l => l.id_taskList === stl.id_taskList);
        if (taskList) {
          results.push({
            shiftTaskListId: stl.id_shiftTaskList,
            taskList,
            statuses,
            completedCount: statuses.filter(s => s.isCompleted).length,
            totalCount:     statuses.length,
          });
        }
      }
    } catch { /* silent — sidebar is non-critical */ }
  }
  myShiftTasks.value = results;
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadAll();
  if (calBody.value) calBody.value.scrollTop = 7 * CELL_HEIGHT; // scroll to 7am
});
watch(calView, () => { setTimeout(() => { if (calBody.value) calBody.value.scrollTop = 7 * CELL_HEIGHT; }, 50); });
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.app {
  font-family: 'DM Sans', sans-serif;
  background: var(--bg-page);
  color: var(--tx-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

/* ── Loading / error ── */
.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 13px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.api-error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 12px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-family: 'DM Sans', sans-serif; }
.retry-btn:hover { background: var(--err-text); color: #fff; }

/* ── Nav ── */
.topnav { display: flex; align-items: center; gap: 24px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; z-index: 10; }
.nav-logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 20px; color: var(--accent); }
.logo-text { font-family: 'DM Mono', monospace; font-size: 15px; font-weight: 500; letter-spacing: 0.05em; }
.nav-tabs { display: flex; gap: 2px; flex: 1; }
.nav-tab { padding: 6px 16px; background: transparent; border: none; color: var(--tx-muted); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; }
.nav-tab:hover  { background: var(--bdr-subtle); color: var(--tx-secondary); }
.nav-tab.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.icon-btn { position: relative; background: none; border: none; cursor: pointer; font-size: 16px; color: var(--tx-muted); }
.notif-dot { position: absolute; top: 0; right: 0; width: 7px; height: 7px; background: var(--err-text); border-radius: 50%; border: 1px solid var(--bg-surface); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #FF1744, #F0E6D3); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #000; cursor: pointer; }

/* ── Theme toggle ── */
.theme-toggle { background: none; border: 1px solid var(--bdr-subtle); color: var(--tx-muted); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; flex-shrink: 0; }
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

/* ── Layout ── */
.layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.sidebar { width: 220px; flex-shrink: 0; background: var(--bg-surface); border-right: 1px solid var(--bdr-subtle); overflow-y: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.mini-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 2px; }
.cal-nav-btn { background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; transition: color 0.15s; }
.cal-nav-btn:hover { color: var(--accent); }
.mini-cal-month { font-size: 11px; color: var(--tx-secondary); font-family: 'DM Mono', monospace; }
.mini-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--bdr-subtle); }
.mini-cal-day-label { text-align: center; font-size: 10px; color: var(--tx-label-dim); padding: 3px 0; font-family: 'DM Mono', monospace; }
.mini-cal-cell { text-align: center; font-size: 11px; padding: 3px 1px; border-radius: 4px; cursor: pointer; color: var(--tx-dim); font-family: 'DM Mono', monospace; transition: background 0.12s; }
.mini-cal-cell:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.mini-cal-cell.in-week { background: var(--bg-active); color: var(--tasks-tx); }
.mini-cal-cell.selected-day { background: var(--accent-bg); color: var(--accent); font-weight: 600; outline: 1px solid var(--accent-border); }
.mini-cal-cell.today { background: var(--accent) !important; color: var(--today-badge-tx) !important; font-weight: 700; }
.mini-cal-cell.empty { cursor: default; }
.sidebar-section { margin-bottom: 20px; }
.sidebar-label { font-size: 11px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 8px; }
.sidebar-label.underline-link { cursor: pointer; color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.employee-chip { border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; color: #000; margin-bottom: 5px; text-align: center; cursor: pointer; transition: opacity 0.15s; }
.employee-chip:hover { opacity: 0.85; }
.sidebar-empty { font-size: 11px; color: var(--tx-faintest); font-style: italic; }
.open-shifts-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.open-shifts-header .sidebar-label { margin-bottom: 0; }
.open-shifts-week { font-size: 10px; color: var(--tx-faintest); font-style: italic; }

.open-shift-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--bdr-subtle);
  align-items: flex-start;
}
.open-shift-day {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx-secondary);
  width: 28px;
  flex-shrink: 0;
  padding-top: 1px;
}
.open-shift-gaps { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.open-shift-gap {
  font-size: 10px;
  font-family: 'DM Mono', monospace;
  color: var(--tx-dim);
  background: var(--bg-hover);
  border: 1px solid var(--bdr-accent);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}

.request-item { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid var(--bdr-subtle); color: var(--tx-muted); }
.request-name { color: var(--tx-secondary); font-weight: 500; }
.request-type { font-size: 11px; color: var(--accent); }

/* ── Main ── */
.cal-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.dept-name-bar { padding: 10px 20px 0; font-size: 18px; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-heading); font-family: 'DM Sans', sans-serif; flex-shrink: 0; }
.cal-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.cal-nav-group { display: flex; align-items: center; gap: 8px; flex: 1; }
.toolbar-btn { background: var(--bdr-subtle); border: none; color: var(--tx-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.toolbar-btn:hover { background: var(--bg-active); color: var(--accent); }
.cal-range-label { font-size: 14px; font-weight: 600; color: var(--tx-primary); font-family: 'DM Mono', monospace; white-space: nowrap; }
.today-btn { background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: border-color 0.15s, color 0.15s; }
.today-btn:hover { border-color: var(--accent); color: var(--accent); }
.cal-view-group { display: flex; gap: 2px; background: var(--bdr-subtle); border-radius: 8px; padding: 3px; }
.view-btn { background: none; border: none; color: var(--tx-muted); padding: 4px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s, color 0.15s; }
.view-btn.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.add-shift-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'DM Sans', sans-serif; transition: background 0.15s, transform 0.12s; white-space: nowrap; }
.add-shift-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Shared time-grid (Day + Week) ── */
.cal-grid-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.cal-body { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
.cal-header-row { display: flex; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; background: var(--bg-surface); position: sticky; top: 0; z-index: 2; }
.time-gutter { width: 60px; flex-shrink: 0; }

.day-header {
  flex: 1; text-align: center; padding: 10px 4px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  border-left: 1px solid var(--bdr-subtle);
  cursor: pointer; transition: background 0.15s;
}
.day-header:hover { background: var(--bg-hover); }
.day-header.single-day { cursor: default; }
.day-header.single-day:hover { background: transparent; }
.day-letter { font-size: 11px; color: var(--tx-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.day-number { font-size: 18px; font-family: 'DM Mono', monospace; color: var(--tx-muted); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 500; }
.day-month-label { font-size: 11px; color: var(--tx-dim); font-style: italic; }
.day-header.today .day-letter { color: var(--accent); }
.day-header.today .day-number { background: var(--accent); color: var(--today-badge-tx); font-weight: 700; }

.cal-body::-webkit-scrollbar { width: 6px; }
.cal-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.cal-inner { display: flex; min-height: fit-content; }
.time-column { width: 60px; flex-shrink: 0; }
.time-slot-label { height: 60px; padding: 4px 8px 0; font-size: 10px; color: var(--tx-faintest); font-family: 'DM Mono', monospace; display: flex; align-items: flex-start; justify-content: flex-end; }

.day-column { flex: 1; position: relative; border-left: 1px solid var(--bdr-strong); cursor: crosshair; }
.day-column.is-dragging-col { background: var(--accent-drag); }
.hour-cell { height: 60px; border-bottom: 1px solid var(--bdr-faint); }
.hour-cell:nth-child(even) { background: var(--hour-even); }

.ghost-block { border: 2px solid var(--accent); background: var(--accent-bg); border-radius: 6px; display: flex; align-items: flex-start; padding: 4px 8px; pointer-events: none; }
.ghost-label { font-size: 11px; color: var(--accent); font-family: 'DM Mono', monospace; font-weight: 500; white-space: nowrap; }

.shift-block { position: absolute; left: 3px; right: 3px; border-radius: 6px; padding: 5px 8px; cursor: pointer; overflow: hidden; z-index: 2; transition: filter 0.15s; }
.shift-block:hover { filter: brightness(1.12); }
.shift-employee { font-size: 12px; font-weight: 700; color: rgba(0,0,0,0.85); line-height: 1.2; }
.shift-time { font-size: 10px; color: rgba(0,0,0,0.6); font-family: 'DM Mono', monospace; }

.event-block { position: absolute; left: 3px; right: 3px; border-radius: 6px; overflow: hidden; z-index: 1; }
.event-block-title { font-size: 11px; font-weight: 700; color: #4A90A4; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-block-time  { font-size: 9px; color: rgba(74,144,164,0.8); font-family: 'DM Mono', monospace; }

.month-event-pill {
  display: flex; align-items: center; gap: 5px;
  border-radius: 4px; padding: 2px 6px; overflow: hidden;
  background: rgba(74,144,164,0.15); border-left: 2px solid #4A90A4;
}
.month-event-dot  { width: 5px; height: 5px; border-radius: 50%; background: #4A90A4; flex-shrink: 0; }
.month-event-name { font-size: 11px; font-weight: 600; color: #4A90A4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }

.current-time-line { position: absolute; left: 0; right: 0; height: 2px; background: #EF4444; z-index: 5; box-shadow: 0 0 8px #EF444488; pointer-events: none; }
.current-time-line::before { content: ''; position: absolute; left: -4px; top: -4px; width: 10px; height: 10px; background: #EF4444; border-radius: 50%; }

/* ── Hours of operation marker lines ── */
.hours-op-line {
  position: absolute; left: 0; right: 0; height: 2px;
  z-index: 4; pointer-events: none; overflow: visible;
}
.hours-op-line.open  { background: rgba(34, 197, 94, 0.65); box-shadow: 0 0 6px rgba(34,197,94,0.3); }
.hours-op-line.close { background: rgba(248, 113, 113, 0.65); box-shadow: 0 0 6px rgba(248,113,113,0.3); }
.hours-line-label {
  position: absolute; right: 6px; bottom: 4px;
  font-size: 9px; font-family: 'DM Mono', monospace; font-weight: 600;
  white-space: nowrap; padding: 1px 5px; border-radius: 3px;
  pointer-events: none; line-height: 13px;
}
.hours-op-line.open  .hours-line-label { color: rgb(34,197,94);   background: rgba(34,197,94,0.12); }
.hours-op-line.close .hours-line-label { color: rgb(248,113,113); background: rgba(248,113,113,0.12); }

/* ══════════════════════════════════
   MONTH VIEW
══════════════════════════════════ */
.month-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.month-dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle);
  flex-shrink: 0;
}
.month-dow { text-align: center; padding: 10px 0; font-size: 11px; font-weight: 600; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.08em; }

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
  overflow-y: auto;
  border-left: 1px solid var(--bdr-subtle);
}
.month-grid::-webkit-scrollbar { width: 6px; }
.month-grid::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.month-cell {
  min-height: 110px;
  border-right: 1px solid var(--bdr-subtle);
  border-bottom: 1px solid var(--bdr-subtle);
  padding: 8px 6px 6px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.month-cell:hover { background: var(--bg-hover); }
.month-cell--faded { background: var(--bg-card); cursor: default; }
.month-cell--faded:hover { background: var(--bg-card); }
.month-cell--today { background: var(--accent-subtle); }

.month-cell-num {
  display: inline-flex;
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: var(--tx-dim);
  line-height: 1;
  margin-bottom: 6px;
  width: 26px; height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.month-cell--faded .month-cell-num { color: var(--tx-faded); }
.month-cell-num.today-badge { background: var(--accent); color: var(--today-badge-tx); font-weight: 700; }

.month-shifts { display: flex; flex-direction: column; gap: 3px; }

.month-shift-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  overflow: hidden;
  transition: filter 0.15s;
}
.month-shift-pill:hover { filter: brightness(1.12); }
.pill-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(0,0,0,0.4); flex-shrink: 0; }
.pill-name { font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pill-time { font-size: 10px; color: rgba(0,0,0,0.6); font-family: 'DM Mono', monospace; white-space: nowrap; }

.month-shift-more { font-size: 11px; color: var(--tx-dim); padding: 2px 6px; cursor: pointer; }
.month-shift-more:hover { color: var(--accent); }

/* ── Shared form styles ── */
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }
.form-group label { font-size: 10px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.label-optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; color: var(--tx-faintest); }
.form-group select,
.form-group input[type="time"],
.form-group input[type="text"] { background: var(--bg-input); border: 1px solid var(--bdr-accent); color: var(--tx-primary); padding: 7px 10px; border-radius: 8px; font-size: 12px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; }
.form-group select:focus, .form-group input:focus { border-color: var(--accent); }

/* ── Quick-create popover ── */
.quick-create-popover { position: fixed; width: 290px; background: var(--bg-modal); border: 1px solid var(--bdr-pop); border-radius: 14px; padding: 18px 20px 20px; box-shadow: 0 20px 60px var(--bg-moverlay), 0 0 0 1px var(--accent-bg); z-index: 200; }
.qc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.qc-time-badge { background: var(--accent-bg); color: var(--accent); font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; padding: 3px 10px; border-radius: 20px; border: 1px solid var(--accent-border); }
.qc-close { background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 13px; transition: color 0.15s; padding: 2px 4px; }
.qc-close:hover { color: var(--tx-secondary); }
.qc-date-label { font-size: 12px; color: var(--tx-dim); margin-bottom: 16px; font-style: italic; }
.qc-actions { display: flex; gap: 8px; margin-top: 4px; }
.qc-cancel { flex: 1; background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 8px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.qc-cancel:hover { border-color: var(--bdr-medium); color: var(--tx-secondary); }
.qc-confirm { flex: 2; background: var(--accent); border: none; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s, transform 0.12s; }
.qc-confirm:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Full modal ── */
.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-accent); border-radius: 14px; padding: 28px; width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 0; }
.modal:not(.stm-modal) .modal-title { margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-cancel { background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; }
.modal-confirm { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; transition: background 0.15s; }
.modal-confirm:hover { background: var(--accent-hover); }

/* ── Shift detail popover ── */
.shift-popover { position: fixed; background: var(--bg-modal); border: 1px solid var(--bdr-accent); border-radius: 12px; padding: 16px 18px; width: 220px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); z-index: 150; }
.popover-close { position: absolute; top: 10px; right: 12px; background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 12px; }
.popover-dot { width: 10px; height: 10px; border-radius: 50%; margin-bottom: 8px; }
.popover-employee { font-size: 15px; font-weight: 700; color: var(--tx-primary); margin-bottom: 4px; }
.popover-time { font-size: 12px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.popover-day { font-size: 12px; color: var(--tx-muted); margin-top: 2px; }
.popover-notes { font-size: 11px; color: var(--tx-secondary); font-style: italic; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--bdr-accent); }
.popover-actions { display: flex; gap: 8px; margin-top: 14px; }
.popover-edit { flex: 1; background: var(--bdr-accent); border: none; color: var(--tx-secondary); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.popover-edit:hover { background: var(--bg-active); color: var(--accent); }
.popover-tasks { flex: 1; background: var(--tasks-bg); border: none; color: var(--tasks-tx); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.popover-tasks:hover { background: var(--tasks-bg-h); color: var(--tasks-tx-h); }
.popover-delete { flex: 1; background: var(--err-bg); border: none; color: var(--err-text); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.popover-delete:hover { background: var(--deny-bg-h); }

.avatar { cursor: pointer; transition: opacity 0.15s, transform 0.15s; }
.avatar:hover { opacity: 0.85; transform: scale(1.05); }
.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }

/* ── Profile panel ── */
.profile-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: var(--bg-soverlay);
  backdrop-filter: blur(2px);
}
.profile-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 300px;
  background: var(--bg-panel);
  border-left: 1px solid var(--bdr-subtle);
  display: flex; flex-direction: column;
  box-shadow: -20px 0 60px rgba(0,0,0,0.3);
  z-index: 501;
}
.profile-header {
  display: flex; align-items: flex-start;
  justify-content: flex-end;
  padding: 20px 20px 0;
}
.profile-avatar-lg {
  width: 80px; height: 80px; border-radius: 50%;
  background: linear-gradient(135deg, #FF1744, #F0E6D3);
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; font-weight: 700; color: #fff;
  margin: 0 auto;
  overflow: hidden;
  border: 2px solid var(--accent-border);
}
.profile-header { flex-direction: column; align-items: center; padding: 28px 20px 16px; position: relative; }
.profile-close {
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; color: var(--tx-faint);
  font-size: 14px; cursor: pointer;
  transition: color 0.15s;
}
.profile-close:hover { color: var(--accent); }
.profile-body { padding: 0 24px 20px; text-align: center; }
.profile-name { font-size: 20px; font-weight: 700; color: var(--tx-heading); margin-bottom: 6px; }
.profile-email { font-size: 13px; color: var(--tx-faint); margin-bottom: 12px; font-family: 'DM Mono', monospace; }
.profile-role-badge {
  display: inline-block; padding: 3px 14px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
}
.profile-role-badge.employee { background: rgba(255,23,68,0.1);  color: #FF4569; }
.profile-role-badge.manager  { background: rgba(240,230,211,0.1); color: #c8903a; }
.profile-role-badge.admin    { background: rgba(74,144,164,0.15); color: #4A90A4; }
.profile-divider { height: 1px; background: var(--bdr-subtle); margin: 0 24px; }
.profile-info { padding: 16px 24px; }
.profile-info-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; }
.info-label { color: var(--tx-faint); }
.info-val { color: var(--tx-secondary); }
.mono { font-family: 'DM Mono', monospace; }
.profile-btn {
  margin: 28px 24px 14px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: none;
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-muted);
  padding: 12px; border-radius: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  transition: background 0.15s, border-color 0.15s;
  width: calc(100% - 48px);
}
.profile-btn:hover { background: var(--bdr-subtle); border-color: var(--bdr-strong); }
.settings-btn {
  margin: 14px 24px auto;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: none;
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-muted);
  padding: 12px; border-radius: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  transition: background 0.15s, border-color 0.15s;
  width: calc(100% - 48px);
}
.settings-btn:hover { background: var(--bdr-subtle); border-color: var(--bdr-strong); }
.logout-btn {
  margin: auto 24px 28px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  color: #EF4444;
  padding: 12px; border-radius: 10px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  transition: background 0.15s, border-color 0.15s;
  width: calc(100% - 48px);
}
.logout-btn:hover { background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.45); }

/* ── Slide-right transition ── */
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease, opacity 0.25s; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0; }

.manage-btn {
  background: none; border: 1px solid var(--accent); color: var(--accent);
  padding: 5px 14px; border-radius: 8px; cursor: pointer;
  font-size: 12px; font-weight: 600; font-family: 'DM Sans', sans-serif;
  transition: background 0.15s, color 0.15s;
}
.manage-btn:hover { background: var(--accent); color: #fff; }

/* ── Shift Task Lists Modal ── */
.stm-modal { width: 480px; max-height: 80vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.stm-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 24px 16px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.stm-header .modal-title { margin-bottom: 4px; }
.stm-sub { font-size: 12px; color: var(--tx-faint); font-family: 'DM Mono', monospace; }
.stm-close { background: none; border: none; color: var(--tx-faint); font-size: 14px; cursor: pointer; padding: 4px 6px; border-radius: 6px; transition: color 0.15s, background 0.15s; flex-shrink: 0; margin-top: 2px; }
.stm-close:hover { color: var(--accent); background: var(--bg-active); }
.stm-error { margin: 12px 24px 0; padding: 8px 12px; background: var(--err-bg); border: 1px solid var(--err-border); border-radius: 8px; color: var(--err-text); font-size: 12px; }
.stm-loading { display: flex; align-items: center; gap: 10px; padding: 32px 24px; color: var(--tx-faint); font-size: 13px; }
.stm-spinner { width: 18px; height: 18px; border: 2px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

.stm-lists { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.stm-lists::-webkit-scrollbar { width: 4px; }
.stm-lists::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.stm-list-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 10px; overflow: hidden; }
.stm-list-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 8px; }
.stm-list-meta { display: flex; align-items: center; gap: 10px; min-width: 0; }
.stm-list-name { font-size: 13px; font-weight: 600; color: var(--tx-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stm-progress { font-size: 11px; font-weight: 600; font-family: 'DM Mono', monospace; color: var(--tx-faint); background: var(--bg-modal); border: 1px solid var(--bdr-medium); padding: 2px 8px; border-radius: 100px; flex-shrink: 0; }
.stm-remove-btn { background: none; border: none; color: var(--tx-ghost); font-size: 12px; cursor: pointer; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; flex-shrink: 0; }
.stm-remove-btn:hover { background: var(--err-bg); color: var(--err-text); }

.stm-prog-bar { height: 3px; background: var(--bdr-subtle); margin: 0 14px 10px; border-radius: 2px; overflow: hidden; }
.stm-prog-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }

.stm-tasks { display: flex; flex-direction: column; }
.stm-task-row { display: flex; align-items: center; gap: 10px; padding: 8px 14px; cursor: pointer; border-top: 1px solid var(--bdr-strong); transition: background 0.12s; }
.stm-task-row:hover:not(.stm-task-disabled) { background: var(--bg-card); }
.stm-task-disabled { cursor: default; }
.stm-checkbox { accent-color: var(--accent); width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }
.stm-task-disabled .stm-checkbox { cursor: default; }
.stm-task-name { font-size: 13px; color: var(--tx-secondary); flex: 1; }
.stm-task-name.done { color: var(--tx-ghost); text-decoration: line-through; }
.stm-no-tasks { padding: 10px 14px; font-size: 12px; color: var(--tx-ghost); font-style: italic; border-top: 1px solid var(--bdr-strong); }

.stm-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; gap: 6px; text-align: center; color: var(--tx-faint); font-size: 13px; }
.stm-empty-sub { font-size: 12px; color: var(--tx-ghost); }

.stm-assign-section { padding: 14px 24px 20px; border-top: 1px solid var(--bdr-subtle); flex-shrink: 0; background: var(--bg-surface); }
.stm-assign-label { font-size: 10px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
.stm-assign-row { display: flex; gap: 8px; }
.stm-select { flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; }
.stm-select:focus { border-color: var(--accent); }
.stm-select option { background: var(--bg-modal); }
.stm-assign-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background 0.15s; flex-shrink: 0; }
.stm-assign-btn:hover { background: var(--accent-hover); }
.stm-assign-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.stm-hint { font-size: 11px; color: var(--tx-faint); margin-top: 8px; font-style: italic; }
.stm-link { color: var(--accent-hover); cursor: pointer; text-decoration: underline; }
.stm-link:hover { color: var(--accent); }

/* ── My tasks sidebar ── */
.my-task-item { margin-bottom: 8px; }
.my-task-list-name { font-size: 11px; font-weight: 600; color: var(--tx-secondary); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.my-task-progress { display: flex; align-items: center; gap: 6px; }
.my-task-bar { flex: 1; height: 4px; background: var(--bdr-subtle); border-radius: 2px; overflow: hidden; }
.my-task-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }
.my-task-count { font-size: 10px; font-family: 'DM Mono', monospace; color: var(--tx-ghost); flex-shrink: 0; }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.96); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.popover-anim-enter-active { transition: opacity 0.18s, transform 0.18s; }
.popover-anim-leave-active { transition: opacity 0.12s; }
.popover-anim-enter-from { opacity: 0; transform: scale(0.94) translateY(6px); }
.popover-anim-leave-to { opacity: 0; }
.view-fade-enter-active, .view-fade-leave-active { transition: opacity 0.15s; }
.view-fade-enter-from, .view-fade-leave-to { opacity: 0; }
</style>