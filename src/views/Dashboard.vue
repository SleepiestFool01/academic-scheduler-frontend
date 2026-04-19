<template>
  <div class="app" @mousemove="onGlobalMouseMove" @mouseup="onGlobalMouseUp" :style="{ '--cell-h': cellHeight + 'px' }">

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

    <!-- Navbar is in AppLayout -->

    <div class="layout">

      <!-- ── Sidebar ── (hidden on phone — its content lives in the agenda + drawer) -->
      <aside v-if="!isPhone" class="sidebar">
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

        <!-- ══ MANAGER SIDEBAR ══ -->
        <div v-if="isManager" class="sidebar-section">
          <div class="sidebar-sec-header clickable" @click="router.push('/tradeboard')">
            <span class="sidebar-sec-title">Tradeboard</span>
            <span v-if="managerTradeboardItems.length" class="sidebar-sec-count">{{ managerTradeboardItems.length }}</span>
          </div>
          <div v-if="managerTradeboardItems.length === 0" class="sidebar-empty">No pending requests</div>
          <div v-for="item in managerTradeboardItems" :key="item.id_swapRequest" class="sb-trade-item">
            <div class="sb-trade-row">
              <span class="sb-trade-name">{{ item.requesterName }}</span>
              <span class="sb-trade-time">{{ item.shiftTime }}</span>
            </div>
            <div class="sb-trade-meta">
              <span class="sb-trade-date">{{ item.shiftDate }}</span>
              <span v-if="item.positionName" class="sb-trade-pos">{{ item.positionName }}</span>
            </div>
            <div v-if="item.needsApproval" class="sb-trade-claim">
              <span class="sb-trade-claimer">← {{ item.requestedName }}</span>
              <div class="sb-trade-actions">
                <button class="sb-approve-btn" @click.stop="sidebarApproveDecline(item, 'Approved')">✓</button>
                <button class="sb-deny-btn"    @click.stop="sidebarApproveDecline(item, 'Denied')">✕</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isManager" class="sidebar-section">
          <div class="sidebar-sec-header clickable" @click="router.push('/requests')">
            <span class="sidebar-sec-title">Requests</span>
            <span v-if="managerRequestItems.length" class="sidebar-sec-count">{{ managerRequestItems.length }}</span>
          </div>
          <div v-if="managerRequestItems.length === 0" class="sidebar-empty">No pending requests</div>
          <div v-for="item in managerRequestItems" :key="item.id_personalAvailability" class="sb-req-item">
            <div class="sb-req-row">
              <span class="sb-req-name">{{ item.empName }}</span>
              <span class="sb-req-type">Time Off</span>
            </div>
            <div class="sb-req-dates">{{ item.startDate }} → {{ item.endDate }}</div>
            <div v-if="item.status === 'Pending'" class="sb-req-actions">
              <button class="sb-approve-btn" @click.stop="sidebarRequestAction(item, 'Approved')">✓ Approve</button>
              <button class="sb-deny-btn"    @click.stop="sidebarRequestAction(item, 'Denied')">✕ Deny</button>
            </div>
            <span v-else class="sb-req-status" :class="item.status.toLowerCase()">{{ item.status }}</span>
          </div>
        </div>

        <div v-if="isManager" class="sidebar-section">
          <div class="sidebar-sec-header">
            <span class="sidebar-sec-title">Open Shifts</span>
            <span class="sidebar-sec-sub">this week</span>
          </div>
          <div v-if="computedOpenShifts.length === 0" class="sidebar-empty">No open shifts this week</div>
          <div v-for="s in computedOpenShifts" :key="s.key" class="open-shift-item">
            <span class="open-shift-day">{{ s.dayLabel }}</span>
            <div class="open-shift-gaps">
              <div v-for="(gap, gi) in s.gaps" :key="gi" class="open-shift-gap-row">
                <span class="open-shift-gap">{{ gap.label }}<span v-if="gap.positionName" class="open-shift-pos">{{ gap.positionName }}</span></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isManager" class="sidebar-section">
          <div class="sidebar-sec-header">
            <span class="sidebar-sec-title">Today's Employees</span>
            <span v-if="todaysEmployees.length" class="sidebar-sec-count">{{ todaysEmployees.length }}</span>
          </div>
          <div v-for="emp in todaysEmployees" :key="emp.name" class="employee-chip" :style="{ background: emp.color }">{{ emp.name }}</div>
          <div v-if="todaysEmployees.length === 0" class="sidebar-empty">No shifts today</div>
        </div>

        <!-- ══ EMPLOYEE SIDEBAR ══ -->

        <!-- 1. My Shifts Today -->
        <div v-if="!isManager" class="sidebar-section">
          <div class="sidebar-sec-header">
            <span class="sidebar-sec-title">My Shifts Today</span>
            <span v-if="myTodayShifts.length" class="sidebar-sec-count">{{ myTodayShifts.length }}</span>
          </div>
          <div v-if="myTodayShifts.length === 0" class="sidebar-empty">No shifts today</div>
          <div v-for="s in myTodayShifts" :key="s.id" class="my-shift-item">
            <span class="my-shift-pos">{{ s.positionName || 'Shift' }}</span>
            <span class="my-shift-time">{{ s.startLabel }} – {{ s.endLabel }}</span>
          </div>
        </div>

        <!-- 2. Tasks -->
        <div v-if="!isManager" class="sidebar-section">
          <div class="sidebar-sec-header">
            <span class="sidebar-sec-title">Tasks</span>
            <span v-if="myShiftTasksTotal > 0" class="sidebar-sec-count">{{ myShiftTasksDone }}/{{ myShiftTasksTotal }}</span>
          </div>
          <div v-if="myShiftTasks.length === 0" class="sidebar-empty">No tasks for today's shifts</div>
          <template v-for="stl in myShiftTasks" :key="stl.shiftTaskListId">
            <div class="sb-tasklist-header">
              <span class="sb-tasklist-name">{{ stl.taskList.name }}</span>
              <span class="sb-tasklist-shift">{{ stl.shiftLabel }}</span>
            </div>
            <div v-for="status in stl.statuses" :key="status.id_shiftTaskListStatus" class="sb-task-row">
              <button class="sb-task-check" :class="{ done: status.isCompleted }" @click="toggleTaskStatus(status)" :title="status.isCompleted ? 'Mark incomplete' : 'Mark complete'">
                <svg v-if="status.isCompleted" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <span class="sb-task-label" :class="{ done: status.isCompleted }">{{ status.taskName }}</span>
            </div>
            <div class="sb-task-progress">
              <div class="my-task-bar">
                <div class="my-task-fill" :style="{ width: stl.totalCount ? (stl.completedCount / stl.totalCount * 100) + '%' : '0%' }"></div>
              </div>
              <span class="my-task-count">{{ stl.completedCount }}/{{ stl.totalCount }}</span>
            </div>
          </template>
        </div>

        <!-- 3. Tradeboard -->
        <div v-if="!isManager" class="sidebar-section">
          <div class="sidebar-sec-header clickable" @click="router.push('/tradeboard')">
            <span class="sidebar-sec-title">Tradeboard</span>
            <span v-if="tradeboardOpenShifts.length" class="sidebar-sec-count">{{ tradeboardOpenShifts.length }}</span>
          </div>
          <div v-if="tradeboardOpenShifts.length === 0" class="sidebar-empty">No open shifts</div>
          <div v-for="r in tradeboardOpenShifts" :key="r.id" class="trade-preview-item" @click="router.push('/tradeboard')">
            <div class="trade-preview-top">
              <span class="trade-preview-name">{{ r.employeeName }}</span>
              <span class="trade-preview-day">{{ r.dayLabel }}</span>
            </div>
            <span class="trade-preview-time">{{ r.startLabel }} – {{ r.endLabel }}</span>
          </div>
        </div>

        <!-- 4. Requests -->
        <div v-if="!isManager" class="sidebar-section">
          <div class="sidebar-sec-header clickable" @click="router.push('/requests')">
            <span class="sidebar-sec-title">My Requests</span>
            <span v-if="myRequestsUnified.length" class="sidebar-sec-count">{{ myRequestsUnified.length }}</span>
          </div>
          <div v-if="myRequestsUnified.length === 0" class="sidebar-empty">
            No active requests — submit time off or post a shift from the Tradeboard.
          </div>
          <div v-for="r in myRequestsVisible" :key="r.id" class="request-item">
            <span class="request-type-tag">{{ r.type }}</span>
            <span class="request-label">{{ r.label }}</span>
            <span class="request-status-pill" :class="'status--' + r.status.toLowerCase()">{{ r.status }}</span>
          </div>
          <div v-if="myRequestsOverflow > 0" class="sidebar-view-all" @click="router.push('/requests')">
            View all ({{ myRequestsOverflow }} more)
          </div>
        </div>
      </aside>

      <!-- ── Main Calendar ── -->
      <main class="cal-main" :class="{ 'cmd-create-mode': cmdHeld && isManager }">
        <div class="cal-toolbar">
          <div class="cal-nav-group">
            <button class="toolbar-btn" @click="navigate(-1)">‹</button>
            <span class="cal-range-label">{{ navLabel }}</span>
            <button class="toolbar-btn" @click="navigate(1)">›</button>
            <button class="today-btn" @click="goToday">Today</button>
          </div>
          <div v-if="isManager" class="tpl-dropdown-wrap" @click.stop>
            <button class="tpl-dropdown-btn" @click="toggleTemplateDropdown"
              :class="{ active: templateDropdownOpen }" title="Apply a template">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
                <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>Apply Templates</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                :style="{ transform: templateDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <Transition name="tpl-dd-pop">
              <div v-if="templateDropdownOpen" class="tpl-dd-menu" @click.stop>
                <div v-if="templatesLoading" class="tpl-dd-empty">Loading…</div>
                <div v-else-if="templates.length === 0" class="tpl-dd-empty">
                  No templates yet.
                  <button class="tpl-dd-link" @click="router.push('/templates')">Create one →</button>
                </div>
                <button v-for="tpl in templates" :key="tpl.id_template" class="tpl-dd-item"
                  @click="openApplyFromDashboard(tpl)">
                  <span class="tpl-dd-name">{{ tpl.name }}</span>
                  <span v-if="tpl.description" class="tpl-dd-desc">{{ tpl.description }}</span>
                </button>
              </div>
            </Transition>
          </div>
          <div class="cal-view-group" :class="{ 'push-right': !isManager }">
            <button v-for="v in (isPhone ? ['Day'] : ['Day','Week','Month'])" :key="v" class="view-btn"
              :class="{ active: calView === v }" @click="setView(v)">{{ v }}</button>
          </div>
          <div v-if="calView !== 'Month' && !isPhone" class="zoom-group">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="zoom-icon"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.6"/><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="4" y1="6.5" x2="9" y2="6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <input type="range" class="zoom-slider" min="20" max="160" step="4" :value="cellHeight" @input="cellHeight = +$event.target.value" title="Adjust zoom" />
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="zoom-icon"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.6"/><line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="4" y1="6.5" x2="9" y2="6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="6.5" y1="4" x2="6.5" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <button class="fit-btn" @click="fitToView" title="Fit business hours to screen">Fit</button>
          </div>
          <button v-if="isManager" class="add-shift-btn" @click="openBlankModal"><span>+</span> Add Shift</button>
        </div>

        <!-- ════════════════════════════════════
             DAY VIEW
        ════════════════════════════════════ -->
        <Transition name="view-fade" mode="out-in">
        <div v-if="calView === 'Day'" key="day" class="cal-grid-wrapper"
          @touchstart.passive="onDaySwipeStart" @touchend.passive="onDaySwipeEnd">
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
                :class="{ 'is-dragging-col': drag.active && drag.dayIndex === 0, 'paste-target': isPasteMode, 'no-edit': !isManager }"
                @mousedown.prevent="isPasteMode ? null : onColumnMouseDown($event, 0)"
                @click="isPasteMode ? pasteToDay(dayViewDate) : null">
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
                <!-- Unavailability overlay for the selected shift's assignee -->
                <div v-for="u in (selectedShift && selectedShift.id_employee
                    ? unavailabilityForEmployeeOnDate(selectedShift.id_employee, dateToKey(dayViewDate))
                    : [])"
                  :key="'unavail-' + u.id_employeeUnavailability"
                  class="unavailability-overlay"
                  :style="unavailabilityBlockStyle(u)"
                  :title="overlayTitle(u)">
                  <span class="unavailability-overlay-label">{{ u.label || 'Unavailable' }}</span>
                </div>
                <div v-for="shift in dayViewShifts" :key="shift.id"
                  class="shift-block"
                  :data-shift-id="String(shift.id)"
                  :style="shiftStyle(shift)"
                  :class="{ 'shift-block--multi-selected': selectedShiftIds.has(String(shift.id)) }"
                  @mousedown="onShiftBlockMouseDown($event, 0)" @click.stop="onShiftBlockClick(shift, $event)">
                  <div class="shift-employee">{{ shift.employee || 'Unassigned' }}</div>
                  <div class="shift-time">{{ shift.startLabel }} – {{ shift.endLabel }}</div>
                  <div v-if="shift.positionName || (isManager && shiftTaskBadge(shift))" class="shift-meta-row">
                    <span v-if="shift.positionName" class="shift-pos-badge">{{ shift.positionName }}</span>
                    <span v-if="isManager && shiftTaskBadge(shift)"
                      class="shift-task-status"
                      :class="{ 'shift-task-status--done': shiftTaskBadge(shift).allDone }">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.2L4 7.2L8 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>{{ shiftTaskBadge(shift).allDone ? 'Done' : shiftTaskBadge(shift).label }}</span>
                    </span>
                  </div>
                  <button v-if="canTakeShift(shift)" class="take-shift-btn"
                    @click.stop="takeShift(shift, $event)"
                    @mousedown.stop
                    title="Take this shift">Take</button>
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
              :class="{ today: isTodayDate(date), 'paste-target-header': isPasteMode }"
              @click="isPasteMode ? pasteToDay(date) : drillToDay(date)">
              <span class="day-letter">{{ dayLetters[i] }}</span>
              <span class="day-number">{{ date.getDate() }}</span>
            </div>
          </div>
            <div class="cal-inner">
              <div class="time-column">
                <div v-for="hour in hours" :key="hour" class="time-slot-label">{{ formatHour(hour) }}</div>
              </div>
              <div v-for="(date, colIdx) in weekDates" :key="colIdx" class="day-column"
                :class="{ 'is-dragging-col': drag.active && drag.dayIndex === colIdx, 'paste-target': isPasteMode, 'no-edit': !isManager }"
                @mousedown.prevent="isPasteMode ? null : onColumnMouseDown($event, colIdx)"
                @click="isPasteMode ? pasteToDay(date) : null">
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
                <!-- Unavailability overlay for the selected shift's assignee -->
                <div v-for="u in (selectedShift && selectedShift.id_employee
                    ? unavailabilityForEmployeeOnDate(selectedShift.id_employee, dateToKey(date))
                    : [])"
                  :key="'unavail-' + u.id_employeeUnavailability"
                  class="unavailability-overlay"
                  :style="unavailabilityBlockStyle(u)"
                  :title="overlayTitle(u)">
                  <span class="unavailability-overlay-label">{{ u.label || 'Unavailable' }}</span>
                </div>
                <div v-for="shift in shiftsForWeekDay(colIdx)" :key="shift.id"
                  class="shift-block"
                  :data-shift-id="String(shift.id)"
                  :style="shiftStyle(shift)"
                  :class="{ 'shift-block--multi-selected': selectedShiftIds.has(String(shift.id)) }"
                  @mousedown="onShiftBlockMouseDown($event, colIdx)" @click.stop="onShiftBlockClick(shift, $event)">
                  <div class="shift-employee">{{ shift.employee || 'Unassigned' }}</div>
                  <div class="shift-time">{{ shift.startLabel }} – {{ shift.endLabel }}</div>
                  <div v-if="shift.positionName || (isManager && shiftTaskBadge(shift))" class="shift-meta-row">
                    <span v-if="shift.positionName" class="shift-pos-badge">{{ shift.positionName }}</span>
                    <span v-if="isManager && shiftTaskBadge(shift)"
                      class="shift-task-status"
                      :class="{ 'shift-task-status--done': shiftTaskBadge(shift).allDone }">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.2L4 7.2L8 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span>{{ shiftTaskBadge(shift).allDone ? 'Done' : shiftTaskBadge(shift).label }}</span>
                    </span>
                  </div>
                  <button v-if="canTakeShift(shift)" class="take-shift-btn"
                    @click.stop="takeShift(shift, $event)"
                    @mousedown.stop
                    title="Take this shift">Take</button>
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
          <select v-model="quickCreate.id_position" @change="onQuickCreatePositionChange">
            <option :value="null" disabled>— Select a position —</option>
            <option v-for="p in positions" :key="p.id_position" :value="p.id_position">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Employee <span class="label-optional">(optional)</span></label>
          <EmployeePicker
            v-model="quickCreate.employee"
            value-field="name"
            :options="employeesForPosition(quickCreate.id_position, {
              date: quickCreate.date ? dateToKey(quickCreate.date) : null,
              startHour: fromTimeInput(quickCreate.startTime || '00:00'),
              endHour: fromTimeInput(quickCreate.endTime || '23:59'),
            })"
            :disabled="!quickCreate.id_position"
            empty-text="No available employees for this position and time." />
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
            <select v-model="newShift.id_position" @change="onNewShiftPositionChange">
              <option :value="null" disabled>— Select a position —</option>
              <option v-for="p in positions" :key="p.id_position" :value="p.id_position">{{ p.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Employee <span class="label-optional">(optional)</span></label>
            <EmployeePicker
              v-model="newShift.employee"
              value-field="name"
              :options="employeesForPosition(newShift.id_position, {
                date: dateKey(weekOffset, Number(newShift.dayIndex)),
                startHour: fromTimeInput(newShift.startTime || '00:00'),
                endHour: fromTimeInput(newShift.endTime || '23:59'),
              })"
              :disabled="!newShift.id_position"
              empty-text="No available employees for this position and time."
              @select="opt => newShift.id_employee = opt?.id_employee ?? null" />
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
          <button v-if="isManager" class="popover-edit" @click="editShift">Edit</button>
          <button
            v-if="isManager || selectedShift.id_employee === currentUser?.id_employee"
            class="popover-tasks"
            @click="openShiftTasksModal(selectedShift)">
            Tasks
          </button>
          <button v-if="isManager" class="popover-delete" @click="deleteShift(selectedShift.id)">Delete</button>
        </div>
      </div>
    </Transition>

  </div>

  <!-- ── Profile panel ── -->
  <!-- Profile panel is in AppLayout -->

  <!-- ── Rubber-band selection rect ── -->
  <div v-if="rubberBand.active" class="rubber-band-rect" :style="{
    left:   Math.min(rubberBand.startX, rubberBand.x) + 'px',
    top:    Math.min(rubberBand.startY, rubberBand.y) + 'px',
    width:  Math.abs(rubberBand.x - rubberBand.startX) + 'px',
    height: Math.abs(rubberBand.y - rubberBand.startY) + 'px',
  }"></div>

  <!-- ── Multi-select toolbar ── -->
  <Transition name="toolbar-anim">
    <div v-if="selectedShiftIds.size > 0 || isPasteMode" class="selection-toolbar" :class="{ 'paste-mode': isPasteMode }">
      <template v-if="isPasteMode">
        <span class="sel-count">Click a day to paste</span>
        <div class="sel-divider"></div>
        <button class="sel-btn sel-btn--clear" @click="isPasteMode = false" title="Cancel (Esc)">✕ Cancel</button>
      </template>
      <template v-else>
        <span class="sel-count">{{ selectedShiftIds.size }} shift{{ selectedShiftIds.size !== 1 ? 's' : '' }} selected</span>
        <div class="sel-divider"></div>
        <button class="sel-btn" @click="copySelectedShifts" title="Copy (⌘C / Ctrl+C)">Copy</button>
        <button class="sel-btn" @click="pasteDashShifts" :disabled="dashClipboard.length === 0" title="Paste (⌘V / Ctrl+V)">Paste</button>
        <button v-if="isManager" class="sel-btn sel-btn--delete" @click="deleteSelectedShifts" title="Delete (Del)">Delete</button>
        <button class="sel-btn sel-btn--clear" @click="clearSelection" title="Clear (Esc)">✕</button>
      </template>
    </div>
  </Transition>

  <!-- ── Apply Template Modal (Dashboard quick-apply) ── -->
  <Transition name="modal">
    <div v-if="applyModal.open" class="modal-overlay" @click.self="applyModal.open = false">
      <div class="modal tpl-apply-modal">
        <h3 class="modal-title">Apply Template</h3>
        <p class="tpl-apply-name">{{ applyModal.template?.name }}</p>

        <div class="tpl-form-group">
          <label>Period Length</label>
          <div class="tpl-period-options">
            <button
              v-for="opt in PERIOD_OPTIONS"
              :key="opt.value"
              class="tpl-period-opt"
              :class="{ active: applyModal.period === opt.value }"
              @click="applyModal.period = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div v-if="!isCustomPeriod" class="tpl-form-group">
          <label>Period Start</label>
          <div class="tpl-date-picker-wrap">
            <button class="tpl-date-trigger" @click.stop="openPicker('start', applyModal.startDate)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="tpl-date-trigger-icon">
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>{{ formatDateDisplay(applyModal.startDate) || 'Select date' }}</span>
            </button>
            <Transition name="tpl-dpc-pop">
              <div v-if="datePicker.open && datePicker.field === 'start'" class="tpl-dpc-dropdown" @click.stop>
                <div class="tpl-dpc-header">
                  <button class="tpl-dpc-nav" @click="prevPickerMonth">‹</button>
                  <span class="tpl-dpc-month-label">{{ pickerMonthLabel }}</span>
                  <button class="tpl-dpc-nav" @click="nextPickerMonth">›</button>
                </div>
                <div class="tpl-dpc-dow-row">
                  <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="tpl-dpc-dow">{{ d }}</span>
                </div>
                <div class="tpl-dpc-days">
                  <span v-for="p in pickerStartPad" :key="'p'+p" class="tpl-dpc-cell tpl-dpc-empty"></span>
                  <span v-for="day in pickerDaysInMonth" :key="day" class="tpl-dpc-cell"
                    :class="{ 'tpl-dpc-selected': isPickerDaySelected(day), 'tpl-dpc-today': isPickerDayToday(day) }"
                    @click="selectPickerDay(day)">{{ day }}</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div v-if="isCustomPeriod" class="tpl-form-row-dates">
          <div class="tpl-form-group">
            <label>Start Date</label>
            <div class="tpl-date-picker-wrap">
              <button class="tpl-date-trigger" @click.stop="openPicker('start', applyModal.startDate)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="tpl-date-trigger-icon">
                  <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ formatDateDisplay(applyModal.startDate) || 'Select date' }}</span>
              </button>
              <Transition name="tpl-dpc-pop">
                <div v-if="datePicker.open && datePicker.field === 'start'" class="tpl-dpc-dropdown" @click.stop>
                  <div class="tpl-dpc-header">
                    <button class="tpl-dpc-nav" @click="prevPickerMonth">‹</button>
                    <span class="tpl-dpc-month-label">{{ pickerMonthLabel }}</span>
                    <button class="tpl-dpc-nav" @click="nextPickerMonth">›</button>
                  </div>
                  <div class="tpl-dpc-dow-row">
                    <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="tpl-dpc-dow">{{ d }}</span>
                  </div>
                  <div class="tpl-dpc-days">
                    <span v-for="p in pickerStartPad" :key="'p'+p" class="tpl-dpc-cell tpl-dpc-empty"></span>
                    <span v-for="day in pickerDaysInMonth" :key="day" class="tpl-dpc-cell"
                      :class="{ 'tpl-dpc-selected': isPickerDaySelected(day), 'tpl-dpc-today': isPickerDayToday(day) }"
                      @click="selectPickerDay(day)">{{ day }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          <div class="tpl-date-range-arrow">→</div>
          <div class="tpl-form-group">
            <label>End Date</label>
            <div class="tpl-date-picker-wrap">
              <button class="tpl-date-trigger" @click.stop="openPicker('end', applyModal.endDate)">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" class="tpl-date-trigger-icon">
                  <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="1" y1="7" x2="15" y2="7" stroke="currentColor" stroke-width="1.5"/>
                  <line x1="5" y1="1" x2="5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <line x1="11" y1="1" x2="11" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ formatDateDisplay(applyModal.endDate) || 'Select date' }}</span>
              </button>
              <Transition name="tpl-dpc-pop">
                <div v-if="datePicker.open && datePicker.field === 'end'" class="tpl-dpc-dropdown" @click.stop>
                  <div class="tpl-dpc-header">
                    <button class="tpl-dpc-nav" @click="prevPickerMonth">‹</button>
                    <span class="tpl-dpc-month-label">{{ pickerMonthLabel }}</span>
                    <button class="tpl-dpc-nav" @click="nextPickerMonth">›</button>
                  </div>
                  <div class="tpl-dpc-dow-row">
                    <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="tpl-dpc-dow">{{ d }}</span>
                  </div>
                  <div class="tpl-dpc-days">
                    <span v-for="p in pickerStartPad" :key="'p'+p" class="tpl-dpc-cell tpl-dpc-empty"></span>
                    <span v-for="day in pickerDaysInMonth" :key="day" class="tpl-dpc-cell"
                      :class="{
                        'tpl-dpc-selected': isPickerDaySelected(day),
                        'tpl-dpc-today':    isPickerDayToday(day),
                        'tpl-dpc-disabled': isPickerDayBeforeStart(day)
                      }"
                      @click="!isPickerDayBeforeStart(day) && selectPickerDay(day)">{{ day }}</span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div v-if="applyRangeLabel" class="tpl-apply-range-preview">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="opacity:.5;flex-shrink:0">
            <rect x="1" y="3" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ applyRangeLabel }}</span>
        </div>

        <p v-if="applyModal.error" class="tpl-modal-error">{{ applyModal.error }}</p>
        <div class="modal-actions">
          <button class="modal-cancel" @click="applyModal.open = false">Cancel</button>
          <button
            class="modal-confirm"
            :disabled="applyModal.applying || !applyModal.startDate || (isCustomPeriod && !applyModal.endDate)"
            @click="applyTemplate"
          >
            {{ applyModal.applying ? 'Creating shifts…' : 'Apply Template' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Unavailability conflict confirmation — used by Take, quick-create,
       and the shift edit modal. Soft block; user can choose to proceed. -->
  <UnavailabilityConflictModal
    :open="conflictPrompt.open"
    :subject="conflictPrompt.subject"
    @confirm="onConflictConfirm"
    @cancel="onConflictCancel" />

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import { useBreakpoint } from "../composables/useBreakpoint.js";
import DeptSwitcher from "../components/DeptSwitcher.vue";
import EmployeePicker from "../components/EmployeePicker.vue";
import UnavailabilityConflictModal from "../components/UnavailabilityConflictModal.vue";

const { isDark, toggleTheme } = useTheme();
const { isPhone, isTouch } = useBreakpoint();
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
import { getUnavailability } from "../services/unavailabilityService.js";
import { getActiveSemester } from "../services/semesterService.js";
import { timeStrToHour } from "../services/employeeManagementService.js";
import { useUnavailabilityRefresh } from "../composables/useUnavailabilityRefresh.js";
import { getDepartment, getCalendarEntries, getEvents, getPositions, getSettingValues, getPositionEmployees, getDepartmentAccessRequests } from "../services/departmentService.js";
import {
  fetchTaskLists,
  fetchTasks,
  getShiftTaskLists,
  assignTaskListToShift,
  removeShiftTaskList,
  getTaskListStatuses,
  updateTaskComplete,
} from "../services/taskService.js";
import {
  fetchTemplates,
  fetchTemplateShifts,
  fetchTemplateShiftEmployees,
  fetchTemplateShiftTaskLists,
  createTemplateApplication,
  createTemplateApplicationShift,
} from "../services/templateService.js";
import apiClient from "../services/services.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const cellHeight     = ref(60);
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
    Templates:  "/templates",
    Department: "/department",
    Employees:  "/manage",
    Shifts:     "/shifts",
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
const activeTab      = ref("Dashboard");
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
  const role = currentUser.value?.role;
  if (role === "Manager" || role === "Admin") {
    return ["Dashboard", "Department", "Templates", "Tradeboard", "Tasks", "Shifts", "Requests"];
  }
  return ["Dashboard", "Department", "Tradeboard", "Tasks", "Shifts", "Requests"];
});
const dayLetters  = ["S","M","T","W","R","F","S"];
const hours = Array.from({ length: 24 }, (_, i) => i);

// ── Live data (populated from API on mount) ────────────────────────────────────
// employees: [{ id_employee, fName, lName, email, color, name }]
const employees    = ref([]);
// employeeMap: { [id_employee]: employee } — for fast lookups
const employeeMap  = ref({});

const shifts             = ref([]);
const pendingRequests    = ref([]);
const sidebarAvailability = ref([]);
const approvedAvailability = ref([]);
// Dept-wide EmployeeUnavailability rows — fuels dropdown conflict
// annotations in the shift modals and the hatched overlay on the calendar.
// Loaded in loadAll alongside other dept data.
const deptUnavailability = ref([]);
// Employee's own request history — drives the Requests sidebar preview on
// the employee dashboard. Swap requests come from `pendingRequests`
// filtered per-user in the `myRequestsUnified` computed below.
const myTimeOffRequests    = ref([]);
const myDeptAccessRequests = ref([]);
const calendarHours   = ref([]); // hours of operation from department calendar
const activeSeason    = ref(""); // currently active season name (empty = no filter) — used for hours-of-operation variants only
const activeSemester  = ref(""); // name of the Semester row whose [startDate, endDate] contains today — used for class-schedule conflict detection
const deptEvents      = ref([]); // department events
const deptName        = ref('');
const positions       = ref([]);
// Map of id_position → array of id_employee assigned to that position
const positionEmployeeIds = ref({});

function normalizeAvailabilityStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "denied") return "Denied";
  return "Pending";
}

// Returns the employees that may be assigned to a shift of the given position.
// If no position is selected, returns no employees (forces position-first).
function employeesForPosition(id_position, options = {}) {
  if (id_position == null || id_position === "") return [];
  const ids = positionEmployeeIds.value[id_position];
  if (!ids) return [];
  const idSet = new Set(ids);
  const eligible = employees.value.filter(e => idSet.has(e.id_employee));
  const { date, startHour, endHour } = options;
  if (!date || startHour == null || endHour == null) return eligible;
  // Hard filter: approved time off still excludes the employee from the
  // dropdown (they literally can't work that shift).
  // Soft annotation: recurring unavailability (class schedule, etc.) stays
  // in the dropdown with a `conflict` property so the option can show a
  // warning — managers can override when they need to.
  return eligible
    .filter((employee) => !employeeHasApprovedTimeOff(employee.id_employee, date, startHour, endHour))
    .map((employee) => ({
      ...employee,
      conflict: employeeUnavailabilityConflict(employee.id_employee, date, startHour, endHour),
    }));
}

function employeeHasApprovedTimeOff(id_employee, date, startHour, endHour) {
  return approvedAvailability.value.some((request) => {
    if (request.id_employee !== id_employee) return false;
    if (date < request.startDate || date > request.endDate) return false;
    const reqStart = timeStrToHour(request.startTime);
    const reqEnd = timeStrToHour(request.endTime);
    return startHour < reqEnd && reqStart < endHour;
  });
}

// Return the first conflicting unavailability row (or null) for the given
// employee on a specific shift date/time. Mirrors
// employeeHasApprovedTimeOff but honors both scope types: "season" rows
// apply only while the dept's activeSeason matches; "dateRange" rows apply
// only if `date` is inside [startDate, endDate].
const DAY_NAMES_FULL_UNAVAIL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Compare an activeSeason setting (e.g. "Fall", "Fall 2026") against a
// row's `season` field ("Spring 2026"). Matches on semester name + year,
// with either side allowed to omit the year. Falls back to "accept
// everything" when activeSeason is empty/unset so freshly-imported rows
// still count even before the dept owner has chosen a semester.
function seasonsMatch(activeSeason, rowSeason) {
  if (!activeSeason) return true;
  if (!rowSeason) return false;
  const [activeSem, activeYear] = String(activeSeason).trim().split(/\s+/);
  const [rowSem,    rowYear]    = String(rowSeason).trim().split(/\s+/);
  if (!activeSem || !rowSem) return false;
  if (activeSem.toLowerCase() !== rowSem.toLowerCase()) return false;
  if (activeYear && rowYear && activeYear !== rowYear) return false;
  return true;
}
function employeeUnavailabilityConflict(id_employee, date, startHour, endHour) {
  if (!date) return null;
  // Derive day name from the YYYY-MM-DD key without timezone skew.
  const [y, m, d] = date.split("-").map(Number);
  const dayName = DAY_NAMES_FULL_UNAVAIL[new Date(y, m - 1, d).getDay()];
  const targetId = Number(id_employee);
  for (const row of deptUnavailability.value) {
    // Coerce both sides — Sequelize occasionally returns integer FKs as
    // strings depending on driver config, which would silently miss every
    // match here with strict `!==`.
    if (Number(row.id_employee) !== targetId) continue;
    if (row.dayOfWeek !== dayName) continue;
    if (row.scopeType === "season") {
      if (!seasonsMatch(activeSemester.value, row.season)) continue;
    } else if (row.scopeType === "dateRange") {
      if (!row.startDate || !row.endDate) continue;
      if (date < row.startDate || date > row.endDate) continue;
    }
    const rowStart = timeStrToHour(row.startTime);
    const rowEnd   = timeStrToHour(row.endTime);
    if (startHour < rowEnd && rowStart < endHour) return row;
  }
  return null;
}

// All unavailability rows that apply to the given employee on the given
// YYYY-MM-DD date — used by the calendar overlay to paint hatched blocks
// behind the shift grid when a shift is selected. Skips rows missing
// startTime/endTime so a bad DB row can't crash the render.
function unavailabilityForEmployeeOnDate(id_employee, date) {
  if (!id_employee || !date) return [];
  const [y, m, d] = date.split("-").map(Number);
  const dayName = DAY_NAMES_FULL_UNAVAIL[new Date(y, m - 1, d).getDay()];
  const targetId = Number(id_employee);
  return deptUnavailability.value.filter(row => {
    if (Number(row.id_employee) !== targetId) return false;
    if (row.dayOfWeek !== dayName) return false;
    if (!row.startTime || !row.endTime) return false;
    if (row.scopeType === "season") {
      return seasonsMatch(activeSemester.value, row.season);
    }
    if (row.scopeType === "dateRange") {
      return row.startDate && row.endDate && date >= row.startDate && date <= row.endDate;
    }
    return false;
  });
}
// Safe title string for the overlay tooltip. A null startTime/endTime
// slipping through would throw during template render and blank the
// dashboard — better to degrade to just the label.
function overlayTitle(u) {
  const label = u.label || "Unavailable";
  const s = typeof u.startTime === "string" ? u.startTime.slice(0, 5) : "";
  const e = typeof u.endTime   === "string" ? u.endTime.slice(0, 5)   : "";
  return s && e ? `${label} — ${s}–${e}` : label;
}

// Absolute-position style for an unavailability block on the calendar,
// mirroring the shift-block positioning math (CAL_START_HOUR + cellHeight).
function unavailabilityBlockStyle(row) {
  const startH = timeStrToHour(row.startTime);
  const endH   = timeStrToHour(row.endTime);
  const top    = Math.max(0, (startH - CAL_START_HOUR) * cellHeight.value);
  const height = Math.max(18, (endH - startH) * cellHeight.value);
  return { top: top + "px", height: height + "px" };
}

// Can the current (employee) user claim this unassigned shift?
function canTakeShift(shift) {
  if (isManager.value) return false;
  if (!shift || shift.id_employee) return false;
  if (!shift.id_shift || !currentUser.value?.id_employee) return false;
  if (shift.id_position == null) return true;
  const ids = positionEmployeeIds.value[shift.id_position];
  return !!ids && ids.includes(currentUser.value.id_employee);
}

// ── Unavailability conflict confirmation (shared modal state) ─────────────────
// Promise-based — any caller can `await confirmConflict(subject)` and
// get back true (user confirmed) or false (cancelled). The modal always
// shows generic "unavailable" copy — it never exposes the underlying
// reason, so we only need the subject (employee's name or "You").
const conflictPrompt = ref({ open: false, subject: "", _resolve: null });

function confirmConflict(subject) {
  return new Promise((resolve) => {
    conflictPrompt.value = { open: true, subject, _resolve: resolve };
  });
}
function onConflictConfirm() {
  const resolve = conflictPrompt.value._resolve;
  conflictPrompt.value.open = false;
  resolve?.(true);
}
function onConflictCancel() {
  const resolve = conflictPrompt.value._resolve;
  conflictPrompt.value.open = false;
  resolve?.(false);
}

async function takeShift(shift, e) {
  e?.stopPropagation?.();
  const empId = currentUser.value?.id_employee;
  if (!empId || !shift?.id_shift) return;
  await tryTakeShift(shift, empId, false);
}

// Shared retry-with-confirm helper for any assignment POST. Returns the
// created assignment, or null if the user cancelled, or throws the error
// for anything non-overridable.
async function createAssignmentWithConfirm(id_shift, id_employee, date, subject) {
  try {
    return await apiCreateAssignment(id_shift, id_employee, date);
  } catch (err) {
    const body = err.response?.data;
    if (err.response?.status === 409 && body?.overridable && body?.code === "UNAVAILABILITY") {
      const ok = await confirmConflict(subject);
      if (!ok) return null;
      return await apiCreateAssignment(id_shift, id_employee, date, true);
    }
    throw err;
  }
}

async function tryTakeShift(shift, empId, force) {
  try {
    const assignment = await apiCreateAssignment(shift.id_shift, empId, shift.date, force);
    const emp = employeeMap.value[empId];
    const idx = shifts.value.findIndex(s => s.id === shift.id);
    if (idx !== -1) {
      shifts.value[idx] = {
        ...shifts.value[idx],
        id:                 assignment.id_shiftAssignment,
        id_shiftAssignment: assignment.id_shiftAssignment,
        id_employee:        empId,
        employee:           emp ? `${emp.fName} ${emp.lName}` : "",
      };
    }
  } catch (err) {
    const body = err.response?.data;
    // Soft conflict (class schedule / manual unavailability) — confirm
    // with the user and retry with force=true.
    if (err.response?.status === 409 && body?.overridable && body?.code === "UNAVAILABILITY") {
      const ok = await confirmConflict("You");
      if (ok) return tryTakeShift(shift, empId, true);
      return;
    }
    // Hard conflict (approved time off) or unknown — show the reason.
    const reason = body?.message || err.message || "Network error";
    alert("Couldn't take this shift: " + reason);
  }
}

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

// Employee sidebar: task lists for all of today's shifts
const myShiftTasks = ref([]); // [{ shiftTaskListId, id_shift, shiftLabel, taskList, statuses, completedCount, totalCount }]

// Manager: { [id_shift]: { completed, total } } for shifts that have any task lists
const shiftTaskSummary = ref({});

// Tracks the current local time in fractional hours; refreshes every minute for the time-line indicator
const currentTimeHour = ref(new Date().getHours() + new Date().getMinutes() / 60);

// Derived from logged-in user (placeholder until auth is wired up)
const currentUser = ref(Utils.getStore("user") || { fName: "?", lName: "?" });

const { myDepts, selectedDeptId, loadDepts } = useDepartment();
const userInitials = computed(() => {
  const u = currentUser.value;
  return `${u.fName?.[0] ?? ""}${u.lName?.[0] ?? ""}`.toUpperCase() || "??";
});

const newShift = ref({ employee: "", id_employee: null, id_position: null, dayIndex: 0, startTime: "09:00", endTime: "17:00", notes: "" });

// Drag state
const drag = ref({ active: false, dayIndex: null, startHour: null, currentHour: null, colEl: null });
const cmdHeld = ref(false);
let dragStartedFromShiftBlock = false;
const quickCreate = ref({ visible: false, dayIndex: null, date: null, startHour: null, endHour: null, startLabel: "", endLabel: "", startTime: "", endTime: "", dateLabel: "", id_position: null, employee: "", notes: "", style: {} });

// ── Multi-select state ─────────────────────────────────────────────────────────
const selectedShiftIds = ref(new Set()); // Set of String(shift.id) for type safety
const rubberBand       = ref({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
const dashClipboard    = ref([]); // [{ date, startHour, endHour, id_position, positionName, id_employee, notes }]
const isPasteMode      = ref(false);
const undoStack        = ref([]); // max 20; { type: 'create'|'delete'|'update', shifts: [...] | before/after }

function pushUndo(entry) {
  undoStack.value.push(entry);
  if (undoStack.value.length > 20) undoStack.value.shift();
}

async function undoLastAction() {
  if (undoStack.value.length === 0) return;
  const action = undoStack.value.pop();
  if (action.type === 'create') {
    for (const s of action.shifts) {
      try {
        await apiDeleteShift(s.id_shiftAssignment, s.id_shift);
        shifts.value = shifts.value.filter(sh => sh.id !== s.id);
      } catch (err) { console.error("Undo create failed:", err); }
    }
  } else if (action.type === 'delete') {
    for (const s of action.shifts) {
      try {
        const block = await apiCreateShift({
          id_employee:  s.id_employee,
          date:         s.date,
          startHour:    s.startHour,
          endHour:      s.endHour,
          notes:        s.notes || "",
          positionName: s.positionName,
          id_position:  s.id_position,
        });
        block.employee     = s.employee || "";
        block.positionName = s.positionName;
        shifts.value.push(block);
      } catch (err) { console.error("Undo delete failed:", err); }
    }
  } else if (action.type === 'update') {
    const before = action.before;
    try {
      await apiUpdateShift(before.id_shift, {
        startHour:   before.startHour,
        endHour:     before.endHour,
        notes:       before.notes,
        id_position: before.id_position,
      });
      const idx = shifts.value.findIndex(s => s.id_shift === before.id_shift);
      if (idx !== -1) shifts.value[idx] = { ...shifts.value[idx], startHour: before.startHour, endHour: before.endHour, startLabel: fmtHour(before.startHour), endLabel: fmtHour(before.endHour), notes: before.notes, id_position: before.id_position, positionName: before.positionName };
    } catch (err) { console.error("Undo update failed:", err); }
  }
}

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

function dateToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

const myTodayShifts = computed(() => {
  if (isManager.value) return [];
  const key  = dateToKey(new Date());
  const myId = currentUser.value?.id_employee;
  return shifts.value.filter(s => s.date === key && s.id_employee === myId);
});


const tradeboardOpenShifts = computed(() => {
  if (isManager.value) return [];
  return pendingRequests.value
    .filter(r => r.raw.id_employeeRequested == null)
    .map(r => {
      const shift = shifts.value.find(s => s.id_shift === r.raw.id_shift);
      return {
        id:           r.id,
        employeeName: r.name,
        dayLabel:     shift?.date ? DAY_ABBR[new Date(shift.date + 'T00:00:00').getDay()] : "—",
        startLabel:   shift?.startLabel || "—",
        endLabel:     shift?.endLabel   || "—",
        positionName: shift?.positionName || "",
      };
    })
    .slice(0, 5);
});

// Employee sidebar task summary
const myShiftTasksTotal = computed(() => myShiftTasks.value.reduce((acc, stl) => acc + stl.totalCount, 0));
const myShiftTasksDone  = computed(() => myShiftTasks.value.reduce((acc, stl) => acc + stl.completedCount, 0));

// Lookup: id_department → name for the sidebar Requests list. Populated
// from the user's myDepts list (already loaded by useDepartment) so we
// don't need an extra /departments fetch. Unknown dept IDs gracefully
// fall back to "Dept #N" in the template.
function deptNameById(id) {
  const d = myDepts.value.find(d => Number(d.id_department) === Number(id));
  return d?.name || `Dept #${id}`;
}

// Employee's request history for the sidebar — unified across time-off,
// swap posts, and department-access. Hides resolved items (approved/denied)
// that are older than 3 days so the box stays actionable.
const myRequestsUnified = computed(() => {
  if (isManager.value) return [];
  const myId = currentUser.value?.id_employee;
  if (!myId) return [];

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const isStale = (status, ts) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    if (s === "pending" || s === "open" || s === "claimed") return false;
    const t = ts ? new Date(ts).getTime() : 0;
    return t && now - t > THREE_DAYS_MS;
  };
  const fmtShort = (iso) => {
    if (!iso) return "";
    const d = typeof iso === "string" ? new Date(iso.replace(" ", "T")) : new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const items = [];

  // Time-off — one row per request with date range
  for (const a of myTimeOffRequests.value) {
    if (isStale(a.status, a.updatedAt || a.createdAt)) continue;
    const range = a.startDate === a.endDate
      ? fmtShort(a.startDate)
      : `${fmtShort(a.startDate)} → ${fmtShort(a.endDate)}`;
    items.push({
      id:     `to-${a.id_personalAvailability}`,
      type:   "Time Off",
      label:  range,
      status: a.status || "Pending",
      ts:     a.updatedAt || a.createdAt,
    });
  }

  // Swap requests this employee posted. `pendingRequests` only holds
  // still-pending items, so approved/denied rollups don't linger here —
  // that's fine, the Tradeboard page owns the long history view.
  for (const r of pendingRequests.value) {
    const raw = r.raw;
    if (raw.id_employeeRequester !== myId) continue;
    const shift = shifts.value.find(s => s.id_shift === raw.id_shift);
    const shiftDate = shift?.date ? fmtShort(shift.date) : "—";
    // Status shown reflects where the swap is in the workflow.
    const swapStatus = raw.id_employeeRequested ? "Claimed" : "Open";
    items.push({
      id:     `sw-${raw.id_swapRequest}`,
      type:   "Swap",
      label:  shiftDate,
      status: swapStatus,
      ts:     raw.updatedAt || raw.createdAt,
    });
  }

  // Department access
  for (const r of myDeptAccessRequests.value) {
    if (isStale(r.status, r.updatedAt || r.createdAt)) continue;
    items.push({
      id:     `da-${r.id_departmentAccessRequest}`,
      type:   "Dept Access",
      label:  deptNameById(r.id_department),
      status: r.status || "Pending",
      ts:     r.updatedAt || r.createdAt,
    });
  }

  // Newest first; cap to 5 rows in the sidebar, overflow surfaces via the
  // "View all" header click → /requests.
  items.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
  return items;
});

const myRequestsVisible = computed(() => myRequestsUnified.value.slice(0, 5));
const myRequestsOverflow = computed(() =>
  Math.max(0, myRequestsUnified.value.length - myRequestsVisible.value.length)
);

// Manager tradeboard sidebar — all pending swap requests enriched with shift + employee info
const managerTradeboardItems = computed(() => {
  if (!isManager.value) return [];
  return pendingRequests.value.map(r => {
    const raw      = r.raw;
    const shift    = shifts.value.find(s => s.id_shift === raw.id_shift);
    const reqsted  = raw.id_employeeRequested ? employeeMap.value[raw.id_employeeRequested] : null;
    return {
      id_swapRequest: raw.id_swapRequest,
      requesterName:  r.name,
      requestedName:  reqsted ? `${reqsted.fName} ${reqsted.lName}` : null,
      shiftDate:      shift?.date || '—',
      shiftTime:      shift ? `${shift.startLabel} – ${shift.endLabel}` : '—',
      positionName:   shift?.positionName || '',
      needsApproval:  raw.id_employeeRequested != null,
    };
  });
});

async function sidebarApproveDecline(item, status) {
  try {
    await apiClient.put(`/swap-requests/${item.id_swapRequest}`, { status });
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== item.id_swapRequest);
  } catch { /* silent */ }
}

// Manager Requests sidebar — pending time-off requests
const managerRequestItems = computed(() => {
  if (!isManager.value) return [];
  return sidebarAvailability.value.map(a => {
    const emp = employeeMap.value[a.id_employee];
    return {
      id_personalAvailability: a.id_personalAvailability,
      id_employee: a.id_employee,
      empName:   emp ? `${emp.fName} ${emp.lName}` : `Employee #${a.id_employee}`,
      startDate: a.startDate || '—',
      endDate:   a.endDate   || '—',
      status:    a.status,
    };
  });
});

function sidebarRequestAction(item, status) {
  apiClient.put(
    `/personal-availability/employees/${item.id_employee}/${item.id_personalAvailability}`,
    { status }
  ).then(() => {
    sidebarAvailability.value = sidebarAvailability.value.filter(
      a => a.id_personalAvailability !== item.id_personalAvailability
    );
  }).catch(() => {});
}

const currentTimePx = computed(() => {
  const now = new Date();
  return (now.getHours() + now.getMinutes() / 60 - CAL_START_HOUR) * cellHeight.value;
});

const ghostStyle = computed(() => {
  if (!drag.value.active) return {};
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return { position: "absolute", top: `${(s - CAL_START_HOUR) * cellHeight.value}px`, height: `${Math.max((e - s) * cellHeight.value - 2, 20)}px`, left: "3px", right: "3px", zIndex: 10 };
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
  const pool    = activeSeason.value
    ? calendarHours.value.filter(h => h.season === activeSeason.value)
    : calendarHours.value;
  const entry   = pool.find(h => h.dayOfWeek === dayName);
  if (!entry) return null;
  return { start: fromTimeInput(entry.startTime), end: fromTimeInput(entry.endTime) };
}

const computedOpenShifts = computed(() => {
  const result = [];
  const abbr   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  weekDates.value.forEach(date => {
    const biz = businessHoursForDate(date);
    if (!biz) return; // no business hours defined for this day — skip

    const key          = dateToKey(date);
    const dayShifts    = shifts.value.filter(s => s.date === key);
    const assigned     = dayShifts.filter(s => s.id_employee);
    const unassigned   = dayShifts.filter(s => !s.id_employee);

    // Build coverage from ALL shifts (assigned + unassigned), clamped to business hours
    // This prevents an unassigned shift from also showing up as a gap
    const allCoverage = [...assigned, ...unassigned];
    const merged = [];
    for (const iv of allCoverage
      .map(s => ({ start: Math.max(s.startHour, biz.start), end: Math.min(s.endHour, biz.end) }))
      .filter(iv => iv.start < iv.end)
      .sort((a, b) => a.start - b.start)) {
      if (!merged.length || iv.start > merged[merged.length - 1].end) merged.push({ ...iv });
      else merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
    }

    // Time gaps within business hours not covered by any shift
    const gapItems = [];
    let cursor = biz.start;
    for (const { start, end } of merged) {
      if (start > cursor) gapItems.push({ sortHour: cursor, label: `${fmtHour(cursor)} – ${fmtHour(start)}` });
      cursor = Math.max(cursor, end);
    }
    if (cursor < biz.end) gapItems.push({ sortHour: cursor, label: `${fmtHour(cursor)} – ${fmtHour(biz.end)}` });

    // Unassigned shifts shown as open shift entries
    const posMap = Object.fromEntries(positions.value.map(p => [p.id_position, p]));
    const unassignedItems = unassigned
      .filter(s => s.startHour < biz.end && s.endHour > biz.start)
      .map(s => ({
        sortHour: s.startHour,
        label: `${fmtHour(s.startHour)} – ${fmtHour(s.endHour)}`,
        positionName: posMap[s.id_position]?.name || '',
      }));

    const items = [
      ...gapItems.map(g => ({ ...g, positionName: '' })),
      ...unassignedItems,
    ].sort((a, b) => a.sortHour - b.sortHour);

    if (items.length > 0) {
      result.push({
        key,
        dayLabel: abbr[date.getDay()],
        gaps:     items.map(i => ({ label: i.label, positionName: i.positionName })),
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

// On phone there's no room for week or month view — force Day if a user
// resizes from tablet/desktop into phone width while viewing those.
watch(isPhone, (phone) => {
  if (phone && calView.value !== "Day") setView("Day");
}, { immediate: true });

// ── Touch swipe nav (phone only) ────────────────────────────────────────────
// Horizontal swipe on the day grid → previous/next day. Threshold tuned so
// vertical scrolling of the grid still works.
const swipe = { startX: 0, startY: 0, t: 0 };
function onDaySwipeStart(e) {
  if (!isTouch.value) return;
  const t = e.changedTouches?.[0];
  if (!t) return;
  swipe.startX = t.clientX;
  swipe.startY = t.clientY;
  swipe.t = Date.now();
}
function onDaySwipeEnd(e) {
  if (!isTouch.value || calView.value !== "Day") return;
  const t = e.changedTouches?.[0];
  if (!t) return;
  const dx = t.clientX - swipe.startX;
  const dy = t.clientY - swipe.startY;
  const dt = Date.now() - swipe.t;
  if (dt > 600) return;
  if (Math.abs(dx) < 60) return;
  if (Math.abs(dy) > 40) return;
  navigate(dx < 0 ? 1 : -1);
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
  const pool    = activeSeason.value
    ? calendarHours.value.filter(e => e.season === activeSeason.value)
    : calendarHours.value;
  return pool
    .filter(e => e.dayOfWeek === dayName)
    .map(e => ({
      key:        e.id_hours_of_operation,
      openPx:     parseTimeToHour(e.startTime) * cellHeight.value,
      closePx:    parseTimeToHour(e.endTime)   * cellHeight.value,
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
    top:    `${ev.startHour * cellHeight.value}px`,
    height: `${Math.max((ev.endHour - ev.startHour) * cellHeight.value - 3, 22)}px`,
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

// ── Overlap layout ─────────────────────────────────────────────────────────────
// Returns a map of entry.id → { colIndex, totalCols } for Google Calendar-style
// side-by-side rendering of concurrent shifts within a single day column.
// Uses entry.id (unique per assignment row) so multiple employees on the same
// shift definition each get their own tracked position.
function computeOverlapLayout(dayShifts) {
  const result = {};
  if (!dayShifts.length) return result;
  const sorted = [...dayShifts].sort((a, b) => a.startHour - b.startHour || String(a.id).localeCompare(String(b.id)));
  const colEnds = [];
  const assign  = {};
  for (const s of sorted) {
    let col = colEnds.findIndex(end => end <= s.startHour);
    if (col === -1) col = colEnds.length;
    colEnds[col] = s.endHour;
    assign[s.id] = col;
  }
  for (const s of sorted) {
    const concurrent = sorted.filter(o =>
      o.id !== s.id &&
      o.startHour < s.endHour &&
      o.endHour   > s.startHour
    );
    const maxCol = concurrent.reduce((m, o) => Math.max(m, assign[o.id]), assign[s.id]);
    result[s.id] = { colIndex: assign[s.id], totalCols: maxCol + 1 };
  }
  return result;
}

// Compute overlap layout for every date that has shifts loaded
const shiftLayoutMap = computed(() => {
  const byDate = {};
  for (const s of shifts.value) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  const result = {};
  for (const dayShifts of Object.values(byDate)) {
    Object.assign(result, computeOverlapLayout(dayShifts));
  }
  return result;
});

// ── Style helpers ──────────────────────────────────────────────────────────────
function shiftStyle(shift) {
  const color  = getEmployeeColor(shift.employee);
  const layout = shiftLayoutMap.value[shift.id] ?? { colIndex: 0, totalCols: 1 };
  const GAP    = 3;
  const pct    = 100 / layout.totalCols;
  return {
    position: "absolute",
    top:    `${(shift.startHour - CAL_START_HOUR) * cellHeight.value}px`,
    height: `${Math.max((shift.endHour - shift.startHour) * cellHeight.value - 3, 18)}px`,
    left:   `calc(${layout.colIndex * pct}% + ${GAP}px)`,
    width:  `calc(${pct}% - ${GAP * 2}px)`,
    right:  "unset",
    background: color,
    borderRadius: "6px", padding: "4px 6px", cursor: "pointer",
    overflow: "hidden", zIndex: layout.colIndex + 2,
    boxShadow: `0 2px 12px ${color}44`, transition: "filter 0.15s",
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
  return snap(CAL_START_HOUR + relY / cellHeight.value);
}

// ── Drag handlers ──────────────────────────────────────────────────────────────
function onColumnMouseDown(e, colIdx) {
  if (e.button !== 0) return;
  if (!isManager.value) return;
  if (e.metaKey || e.ctrlKey) {
    rubberBand.value = { active: true, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };
    return;
  }
  clearSelection();
  selectedShift.value       = null;
  quickCreate.value.visible = false;
  const startHour = getHourFromEvent(e, e.currentTarget);
  drag.value = { active: true, dayIndex: colIdx, startHour, currentHour: startHour, colEl: e.currentTarget };
}
// ── Drag-scroll (auto-scroll while dragging near edges) ────────────────────────
let dragScrollSpeed = 0;
let dragScrollRAF   = null;
function runDragScroll() {
  if (!calBody.value || dragScrollSpeed === 0) { dragScrollRAF = null; return; }
  calBody.value.scrollTop += dragScrollSpeed;
  dragScrollRAF = requestAnimationFrame(runDragScroll);
}
function setDragScroll(speed) {
  dragScrollSpeed = speed;
  if (speed !== 0 && !dragScrollRAF) dragScrollRAF = requestAnimationFrame(runDragScroll);
}
function stopDragScroll() { dragScrollSpeed = 0; if (dragScrollRAF) { cancelAnimationFrame(dragScrollRAF); dragScrollRAF = null; } }

function onGlobalMouseMove(e) {
  if (rubberBand.value.active) {
    rubberBand.value = { ...rubberBand.value, x: e.clientX, y: e.clientY };
    return;
  }
  if (!drag.value.active || !drag.value.colEl) { stopDragScroll(); return; }
  drag.value.currentHour = getHourFromEvent(e, drag.value.colEl);

  // Auto-scroll when cursor is within 60px of the top/bottom of calBody
  if (calBody.value) {
    const { top, bottom } = calBody.value.getBoundingClientRect();
    const ZONE = 60;
    const fromTop    = e.clientY - top;
    const fromBottom = bottom - e.clientY;
    if (fromTop < ZONE && fromTop >= 0)         setDragScroll(-Math.max(2, Math.round((ZONE - fromTop)    / 10)));
    else if (fromBottom < ZONE && fromBottom >= 0) setDragScroll( Math.max(2, Math.round((ZONE - fromBottom) / 10)));
    else                                           setDragScroll(0);
  }
}
function onGlobalMouseUp(e) {
  stopDragScroll();
  if (rubberBand.value.active) {
    finalizeDashRubberBand();
    return;
  }
  if (!drag.value.active) return;
  const startHour = Math.min(drag.value.startHour, drag.value.currentHour);
  const endHour   = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  const colIdx    = drag.value.dayIndex;
  drag.value.active = false;

  if (endHour - startHour < SNAP_MINUTES / 60 + 0.001) {
    // Too short to be a drag — was a click. Let the click handler handle it (e.g. multi-select).
    dragStartedFromShiftBlock = false;
    return;
  }

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

// Clear employee selection when the position changes if the currently
// selected employee is not assigned to the newly selected position.
function onQuickCreatePositionChange() {
  const allowed = employeesForPosition(quickCreate.value.id_position);
  if (!allowed.some(e => e.name === quickCreate.value.employee)) {
    quickCreate.value.employee = "";
  }
}

function onNewShiftPositionChange() {
  const allowed = employeesForPosition(newShift.value.id_position);
  if (!allowed.some(e => e.name === newShift.value.employee)) {
    newShift.value.employee    = "";
    newShift.value.id_employee = null;
  }
}

// ── Data loading ───────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = null;
  try {
    const deptId = selectedDeptId.value || currentUser.value?.id_department;
    const [empList, tlData, tData] = await Promise.all([
      fetchEmployees(deptId),
      fetchTaskLists(deptId).catch(() => []),
      fetchTasks(deptId).catch(() => []),
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
    // Load positions first so positionMap is ready for the shift JOIN
    if (deptId) {
      try { positions.value = (await getPositions(deptId)).data || []; } catch { /* non-critical */ }
      // Load which employees are assigned to each position so the
      // employee dropdowns can be filtered by the selected position.
      try {
        const peMap = {};
        await Promise.all(positions.value.map(async (p) => {
          try {
            const res = await getPositionEmployees(p.id_position);
            peMap[p.id_position] = (res.data || []).map(r => r.id_employee);
          } catch {
            peMap[p.id_position] = [];
          }
        }));
        positionEmployeeIds.value = peMap;
      } catch { /* non-critical */ }
    }
    const positionMap = Object.fromEntries(positions.value.map(p => [p.id_position, p]));
    shifts.value = await fetchShiftsWithAssignments(map, positionMap, deptId);
    pendingRequests.value = await fetchSwapRequests(map);
    // Load time-off requests for manager sidebar (non-blocking)
    if (isManager.value) {
      apiClient.get("/personal-availability").then(res => {
        const normalized = (res.data || []).map(a => ({
          ...a,
          status: normalizeAvailabilityStatus(a.status),
        }));
        approvedAvailability.value = normalized.filter(a => a.status === "Approved");
        const deptEmpIds = new Set(empList.map(e => e.id_employee));
        sidebarAvailability.value = normalized
          .filter(a => deptEmpIds.has(a.id_employee) && a.status === "Pending");
      }).catch(() => {});
    }

    // Load this employee's own request history (time-off + dept-access)
    // for the Requests sidebar preview. Swap requests are already in
    // pendingRequests and filtered per-user in myRequestsUnified below.
    if (!isManager.value && currentUser.value?.id_employee) {
      const myId = currentUser.value.id_employee;
      apiClient.get("/personal-availability").then(res => {
        myTimeOffRequests.value = (res.data || [])
          .filter(a => a.id_employee === myId)
          .map(a => ({ ...a, status: normalizeAvailabilityStatus(a.status) }));
      }).catch(() => { myTimeOffRequests.value = []; });

      getDepartmentAccessRequests({ id_employeeRequester: myId }).then(res => {
        myDeptAccessRequests.value = res.data || [];
      }).catch(() => { myDeptAccessRequests.value = []; });
    }
    // Load hours of operation + events for this user's department (non-blocking)
    if (deptId) {
      getDepartment(deptId).then(r => { deptName.value = r.data?.name || ''; }).catch(() => {});
      getCalendarEntries(deptId).then(r => { calendarHours.value = r.data || []; }).catch(() => {});
      getEvents(deptId).then(r => { deptEvents.value = r.data || []; }).catch(() => {});
      // Legacy "Active Season" setting — used for picking default
      // hours-of-operation variants. Keeps holding short values like
      // "Fall" that span multiple years, per dept's choice.
      getSettingValues(deptId).then(r => {
        const sv = (r.data || []).find(v => v.name === "Active Season" || v.key === "active_season");
        activeSeason.value = sv?.value || "";
      }).catch(() => {});
      // Active Semester — derived from the Semester table whose date
      // range contains today. Distinct from `activeSeason` above. This
      // is what class-schedule unavailability rows are matched against.
      getActiveSemester(deptId)
        .then(r => { activeSemester.value = r.data?.name || ""; })
        .catch(() => { activeSemester.value = ""; });
      // Unavailability for everyone in this dept — powers conflict warnings
      // in the employee dropdown and the hatched overlay on the calendar.
      getUnavailability({ id_department: deptId }).then(r => {
        deptUnavailability.value = r.data || [];
      }).catch(() => { deptUnavailability.value = []; });
    }
    loadMyTasks(); // async, non-blocking — populates employee sidebar
    loadShiftTaskSummaries(); // async, non-blocking — populates manager shift-block badges
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
  const args = {
    id_employee:   emp?.id_employee ?? null,
    date:          dateToKey(qc.date),
    startHour, endHour,
    notes:         qc.notes,
    positionName:  posName,
    id_position:   qc.id_position,
    id_department: selectedDeptId.value || currentUser.value?.id_department || null,
  };
  try {
    const block = await apiCreateShift(args);
    block.employee     = emp?.name || "";
    block.positionName = posName;
    shifts.value.push(block);
    pushUndo({ type: 'create', shifts: [block] });
    quickCreate.value.visible = false;
  } catch (err) {
    const body = err.response?.data;
    // Soft conflict — the shift was created; only the assignment failed.
    // Confirm with the user and retry just the assignment with force=true.
    if (err.response?.status === 409 && body?.overridable && body?.code === "UNAVAILABILITY" && err.pendingAssignment) {
      const ok = await confirmConflict(emp?.name || "This employee");
      if (ok) {
        try {
          const assignment = await apiCreateAssignment(
            err.pendingAssignment.id_shift,
            err.pendingAssignment.id_employee,
            err.pendingAssignment.date,
            true,
          );
          // Rebuild the block from the orphan shift + the new assignment so
          // it renders just like the happy-path return of apiCreateShift.
          const block = {
            id:                 assignment.id_shiftAssignment,
            id_shift:           err.orphanShift.id_shift,
            id_shiftAssignment: assignment.id_shiftAssignment,
            id_employee:        emp.id_employee,
            employee:           emp.name,
            date:               args.date,
            dayIndex:           err.shiftBuildArgs?.dowInt,
            startHour, endHour,
            startLabel:         fmtHour(startHour),
            endLabel:           fmtHour(endHour),
            notes:              qc.notes || "",
            id_position:        qc.id_position,
            positionName:       posName,
          };
          shifts.value.push(block);
          pushUndo({ type: 'create', shifts: [block] });
          quickCreate.value.visible = false;
          return;
        } catch (retryErr) {
          alert("Couldn't assign the shift: " + (retryErr.response?.data?.message || retryErr.message));
          return;
        }
      }
      // User cancelled — clean up the orphan shift so we don't leave an
      // unassigned row the manager didn't want.
      if (err.orphanShift?.id_shift) {
        try { await apiClient.delete(`/shifts/${err.orphanShift.id_shift}`); } catch (_) {}
      }
      return;
    }
    alert("Error saving shift: " + (body?.message || err.message));
  }
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
    pushUndo({ type: 'delete', shifts: [{ ...s }] });
    await apiDeleteShift(s.id_shiftAssignment, s.id_shift);
    shifts.value        = shifts.value.filter(sh => sh.id !== id);
    selectedShift.value = null;
  } catch (err) {
    undoStack.value.pop();
    alert("Error deleting shift: " + err.message);
  }
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
    pushUndo({ type: 'update', before: { ...existing } });
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
        const assignment = await createAssignmentWithConfirm(existing.id_shift, nextEmpId, existing.date, emp?.name || "This employee");
        if (!assignment) { undoStack.value.pop(); return; }
        updated = { ...updated, id: assignment.id_shiftAssignment, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: emp?.name || "" };
      } else if (prevEmpId && nextEmpId && prevEmpId !== nextEmpId) {
        // Switch employee: try the new assignment first so we don't orphan
        // the old one if the user cancels the conflict prompt.
        const emp = employees.value.find(e => e.id_employee === nextEmpId);
        // The old assignment still references the shift, so we need to
        // free it before creating the new one. If the new one fails we
        // re-create the old to preserve state.
        await apiDeleteAssignment(existing.id_shiftAssignment);
        const assignment = await createAssignmentWithConfirm(existing.id_shift, nextEmpId, existing.date, emp?.name || "This employee");
        if (!assignment) {
          // User cancelled — restore the prior assignment so the shift
          // isn't left hanging unassigned.
          try {
            await apiCreateAssignment(existing.id_shift, prevEmpId, existing.date, true);
          } catch (_) {}
          undoStack.value.pop();
          return;
        }
        updated = { ...updated, id: assignment.id_shiftAssignment, id_shiftAssignment: assignment.id_shiftAssignment, id_employee: nextEmpId, employee: emp?.name || "" };
      }
      shifts.value[idx] = updated;
    } catch (err) { undoStack.value.pop(); alert("Error updating shift: " + (err.response?.data?.message || err.message)); return; }
    editingShiftId.value = null;
  } else {
    const emp = employees.value.find(e => e.name === newShift.value.employee);
    const date = dateKey(weekOffset.value, Number(newShift.value.dayIndex));
    try {
      const block = await apiCreateShift({
        id_employee:   emp?.id_employee ?? null,
        date,
        startHour, endHour,
        notes:         newShift.value.notes,
        positionName:  posName,
        id_position:   newShift.value.id_position,
      });
      block.employee     = emp?.name || "";
      block.positionName = posName;
      shifts.value.push(block);
      pushUndo({ type: 'create', shifts: [block] });
    } catch (err) {
      // Same dance as confirmQuickCreate: shift already persisted; retry
      // just the assignment with force after user confirms.
      const body = err.response?.data;
      if (err.response?.status === 409 && body?.overridable && body?.code === "UNAVAILABILITY" && err.pendingAssignment) {
        const ok = await confirmConflict(emp?.name || "This employee");
        if (ok) {
          try {
            const assignment = await apiCreateAssignment(err.pendingAssignment.id_shift, err.pendingAssignment.id_employee, err.pendingAssignment.date, true);
            const block = {
              id:                 assignment.id_shiftAssignment,
              id_shift:           err.orphanShift.id_shift,
              id_shiftAssignment: assignment.id_shiftAssignment,
              id_employee:        emp.id_employee,
              employee:           emp.name,
              date,
              dayIndex:           err.shiftBuildArgs?.dowInt,
              startHour, endHour,
              startLabel:         fmtHour(startHour),
              endLabel:           fmtHour(endHour),
              notes:              newShift.value.notes || "",
              id_position:        newShift.value.id_position,
              positionName:       posName,
            };
            shifts.value.push(block);
            pushUndo({ type: 'create', shifts: [block] });
            showAddModal.value = false;
            return;
          } catch (retryErr) {
            alert("Couldn't assign the shift: " + (retryErr.response?.data?.message || retryErr.message));
            return;
          }
        }
        // Cancelled — clean up the orphan shift.
        if (err.orphanShift?.id_shift) {
          try { await apiClient.delete(`/shifts/${err.orphanShift.id_shift}`); } catch (_) {}
        }
        return;
      }
      alert("Error creating shift: " + (body?.message || err.message));
      return;
    }
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
    else refreshShiftTaskSummary(shiftTasksModal.value.shift?.id_shift);
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
    if (isManager.value) refreshShiftTaskSummary(shiftTasksModal.value.shift?.id_shift);
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
    // Update manager shift-block badge
    if (isManager.value && shiftTasksModal.value.shift?.id_shift) {
      refreshShiftTaskSummary(shiftTasksModal.value.shift.id_shift);
    }
  } catch (err) {
    shiftTasksModal.value.error = "Could not update task: " + (err.message || "Error");
  }
}

// Employee-only: load task lists for all of today's shifts (populates sidebar)
async function loadMyTasks() {
  if (isManager.value) return;
  const todayShifts = myTodayShifts.value;
  if (todayShifts.length === 0) {
    myShiftTasks.value = [];
    return;
  }
  const results = [];
  try {
    for (const shift of todayShifts) {
      const stls = await getShiftTaskLists(shift.id_shift);
      for (const stl of stls) {
        const statuses = await getTaskListStatuses(stl.id_shiftTaskList);
        const taskList = taskLists.value.find(l => l.id_taskList === stl.id_taskList);
        if (taskList) {
          const enriched = statuses.map(s => ({
            ...s,
            taskName: allTasks.value.find(t => t.id_task === s.id_task)?.name ?? `Task #${s.id_task}`,
          }));
          results.push({
            shiftTaskListId: stl.id_shiftTaskList,
            id_shift:        shift.id_shift,
            shiftLabel:      shift.positionName || `${shift.startLabel}–${shift.endLabel}`,
            taskList,
            statuses: enriched,
            completedCount: enriched.filter(s => s.isCompleted).length,
            totalCount:     enriched.length,
          });
        }
      }
    }
  } catch { /* silent — sidebar is non-critical */ }
  myShiftTasks.value = results;
}

// Manager-only: task completion summary per shift, shown on shift blocks
async function refreshShiftTaskSummary(id_shift) {
  if (!isManager.value || !id_shift) return;
  try {
    const stls = await getShiftTaskLists(id_shift);
    if (!stls.length) {
      const next = { ...shiftTaskSummary.value };
      delete next[id_shift];
      shiftTaskSummary.value = next;
      return;
    }
    let completed = 0, total = 0;
    await Promise.all(stls.map(async (stl) => {
      const statuses = await getTaskListStatuses(stl.id_shiftTaskList);
      total     += statuses.length;
      completed += statuses.filter(s => s.isCompleted).length;
    }));
    if (total === 0) {
      const next = { ...shiftTaskSummary.value };
      delete next[id_shift];
      shiftTaskSummary.value = next;
    } else {
      shiftTaskSummary.value = { ...shiftTaskSummary.value, [id_shift]: { completed, total } };
    }
  } catch { /* silent */ }
}

async function loadShiftTaskSummaries() {
  if (!isManager.value) return;
  const summary = {};
  await Promise.all(shifts.value.map(async (shift) => {
    try {
      const stls = await getShiftTaskLists(shift.id_shift);
      if (!stls.length) return;
      let completed = 0, total = 0;
      await Promise.all(stls.map(async (stl) => {
        const statuses = await getTaskListStatuses(stl.id_shiftTaskList);
        total     += statuses.length;
        completed += statuses.filter(s => s.isCompleted).length;
      }));
      if (total > 0) summary[shift.id_shift] = { completed, total };
    } catch { /* silent */ }
  }));
  shiftTaskSummary.value = summary;
}

function shiftTaskBadge(shift) {
  const sum = shiftTaskSummary.value[shift.id_shift];
  if (!sum || sum.total === 0) return null;
  const allDone = sum.completed >= sum.total;
  return {
    ...sum,
    allDone,
    label: allDone ? "Complete" : `${sum.completed}/${sum.total}`,
  };
}

// ── Multi-select helpers ───────────────────────────────────────────────────────
function toggleShiftSelection(id) {
  const key = String(id);
  const s = new Set(selectedShiftIds.value);
  if (s.has(key)) s.delete(key); else s.add(key);
  selectedShiftIds.value = s;
}

function clearSelection() {
  selectedShiftIds.value = new Set();
}

// Called on mousedown over a shift block.
// If Cmd/Ctrl is held: start a drag-to-create on the underlying column instead of selecting the shift.
function onShiftBlockMouseDown(e, colIdx) {
  if ((e.metaKey || e.ctrlKey) && isManager.value) {
    e.stopPropagation();
    dragStartedFromShiftBlock = true;
    const colEl = e.currentTarget.closest('.day-column');
    if (colEl) {
      clearSelection();
      selectedShift.value       = null;
      quickCreate.value.visible = false;
      const startHour = getHourFromEvent(e, colEl);
      drag.value = { active: true, dayIndex: colIdx, startHour, currentHour: startHour, colEl };
    }
    return;
  }
  dragStartedFromShiftBlock = false;
  e.stopPropagation();
}

function onShiftBlockClick(shift, e) {
  e.stopPropagation();
  if (dragStartedFromShiftBlock) {
    // The mousedown was the start of a drag-to-create; suppress this click
    dragStartedFromShiftBlock = false;
    return;
  }
  if (e.metaKey || e.ctrlKey) {
    toggleShiftSelection(shift.id);
    return;
  }
  clearSelection();
  selectShift(shift, e);
}

function finalizeDashRubberBand() {
  const r      = rubberBand.value;
  const left   = Math.min(r.startX, r.x);
  const top    = Math.min(r.startY, r.y);
  const right  = Math.max(r.startX, r.x);
  const bottom = Math.max(r.startY, r.y);
  if (right - left > 4 || bottom - top > 4) {
    const blocks = document.querySelectorAll("[data-shift-id]");
    const newSet = new Set(selectedShiftIds.value);
    blocks.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
        newSet.add(el.dataset.shiftId);
      }
    });
    selectedShiftIds.value = newSet;
  }
  rubberBand.value = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
}

function copySelectedShifts() {
  if (selectedShiftIds.value.size === 0) return;
  const selected = shifts.value.filter(s => selectedShiftIds.value.has(String(s.id)));
  dashClipboard.value = selected.map(s => ({
    date:         s.date,
    startHour:    s.startHour,
    endHour:      s.endHour,
    id_position:  s.id_position,
    positionName: s.positionName,
    id_employee:  s.id_employee,
    notes:        s.notes || "",
  }));
}

function pasteDashShifts() {
  if (dashClipboard.value.length === 0) return;
  isPasteMode.value = true;
}

function parseDateLocal(str) {
  // Avoid UTC offset shifting by parsing YYYY-MM-DD as local time
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function pasteToDay(targetDate) {
  if (dashClipboard.value.length === 0) return;
  isPasteMode.value = false;

  // Find the anchor: earliest date in clipboard (parse as local time)
  const anchorMs = Math.min(...dashClipboard.value.map(item => parseDateLocal(item.date).getTime()));
  // Strip time from targetDate so we're comparing day-only
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const offsetDays = Math.round((targetDay.getTime() - anchorMs) / 86400000);
  const pastedBlocks = [];

  for (const item of dashClipboard.value) {
    const shiftDay = parseDateLocal(item.date);
    const newDate = new Date(shiftDay.getFullYear(), shiftDay.getMonth(), shiftDay.getDate() + offsetDays);
    const yyyy = newDate.getFullYear();
    const mm   = String(newDate.getMonth() + 1).padStart(2, "0");
    const dd   = String(newDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    try {
      const block = await apiCreateShift({
        id_employee:  item.id_employee,
        date:         dateStr,
        startHour:    item.startHour,
        endHour:      item.endHour,
        notes:        item.notes,
        positionName: item.positionName,
        id_position:  item.id_position,
      });
      const emp = item.id_employee ? employees.value.find(e => e.id_employee === item.id_employee) : null;
      block.employee     = emp?.name || "";
      block.positionName = item.positionName;
      shifts.value.push(block);
      pastedBlocks.push(block);
    } catch (err) { console.error("Paste shift failed:", err); }
  }
  if (pastedBlocks.length > 0) pushUndo({ type: 'create', shifts: pastedBlocks });
}

async function deleteSelectedShifts() {
  const count = selectedShiftIds.value.size;
  if (count === 0) return;
  if (count > 1 && !window.confirm(`Delete ${count} selected shifts?`)) return;
  const ids = [...selectedShiftIds.value];
  // Snapshot all shifts before clearing selection (deleteShift also pushes individually,
  // so we batch them into one undo entry here instead)
  const toDelete = ids.map(idStr => shifts.value.find(s => String(s.id) === idStr)).filter(Boolean);
  if (toDelete.length > 1) {
    // Push one batch undo entry; suppress individual entries from deleteShift by temporarily
    // routing through the API directly
    pushUndo({ type: 'delete', shifts: toDelete.map(s => ({ ...s })) });
    clearSelection();
    for (const s of toDelete) {
      try {
        await apiDeleteShift(s.id_shiftAssignment, s.id_shift);
        shifts.value = shifts.value.filter(sh => sh.id !== s.id);
      } catch (err) { console.error("Delete failed:", err); }
    }
  } else {
    clearSelection();
    for (const idStr of ids) {
      const shift = shifts.value.find(s => String(s.id) === idStr);
      if (shift) await deleteShift(shift.id);
    }
  }
}

function onDashKeydown(e) {
  if (e.key === "Meta" || e.key === "Control") cmdHeld.value = true;
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key === "a") {
    // Only intercept if not in an input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    e.preventDefault();
    // Select all shifts visible in current view
    let visibleShifts = [];
    if (calView.value === "Day") visibleShifts = dayViewShifts.value;
    else if (calView.value === "Week") {
      visibleShifts = weekDates.value.flatMap((_, i) => shiftsForWeekDay(i));
    }
    selectedShiftIds.value = new Set(visibleShifts.map(s => String(s.id)));
    return;
  }
  if (meta && e.key === "c") {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    copySelectedShifts();
    return;
  }
  if (meta && e.key === "v") {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (dashClipboard.value.length > 0) isPasteMode.value = true;
    return;
  }
  if (meta && e.key === "z") {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    undoLastAction();
    return;
  }
  if ((e.key === "Delete" || e.key === "Backspace") && selectedShiftIds.value.size > 0 && isManager.value) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    e.preventDefault();
    deleteSelectedShifts();
    return;
  }
  if (e.key === "Escape") {
    if (isPasteMode.value) { isPasteMode.value = false; return; }
    if (selectedShiftIds.value.size > 0) { clearSelection(); return; }
  }
}

// ── Template quick-apply (dropdown above calendar) ─────────────────────────────
const PERIOD_OPTIONS = [
  { label: "1 Week",  value: "1w",  days: 7  },
  { label: "2 Weeks", value: "2w",  days: 14 },
  { label: "3 Weeks", value: "3w",  days: 21 },
  { label: "1 Month", value: "1m",  days: 28 },
  { label: "Custom",  value: "custom", days: null },
];
const DAY_ENUM = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

const templates = ref([]);
const templatesLoading = ref(false);
const templateDropdownOpen = ref(false);

async function loadTemplatesForDropdown() {
  if (!isManager.value) return;
  templatesLoading.value = true;
  try {
    templates.value = await fetchTemplates(selectedDeptId.value);
  } catch {
    templates.value = [];
  } finally {
    templatesLoading.value = false;
  }
}

function toggleTemplateDropdown() {
  templateDropdownOpen.value = !templateDropdownOpen.value;
  if (templateDropdownOpen.value) loadTemplatesForDropdown();
}

function hourToTimeStr(h) {
  const totalMin = Math.round(h * 60);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultApplyStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return localDateStr(monday);
}

const applyModal = ref({
  open: false,
  template: null,
  period: "2w",
  startDate: "",
  endDate: "",
  applying: false,
  error: "",
});

const isCustomPeriod = computed(() => applyModal.value.period === "custom");

const applyRangeLabel = computed(() => {
  const fmt = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (isCustomPeriod.value) {
    if (!applyModal.value.startDate || !applyModal.value.endDate) return "";
    const start = new Date(applyModal.value.startDate + "T00:00:00");
    const end   = new Date(applyModal.value.endDate   + "T00:00:00");
    if (end < start) return "";
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (!applyModal.value.startDate) return "";
  const opt = PERIOD_OPTIONS.find(o => o.value === applyModal.value.period);
  const days = opt?.days ?? 14;
  const start = new Date(applyModal.value.startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + days - 1);
  return `${fmt(start)} – ${fmt(end)}`;
});

function openApplyFromDashboard(tpl) {
  templateDropdownOpen.value = false;
  applyModal.value = {
    open: true,
    template: tpl,
    period: "2w",
    startDate: defaultApplyStartDate(),
    endDate: "",
    applying: false,
    error: "",
  };
}

async function applyTemplate() {
  if (!applyModal.value.startDate) {
    applyModal.value.error = "Please select a start date.";
    return;
  }
  if (isCustomPeriod.value && !applyModal.value.endDate) {
    applyModal.value.error = "Please select an end date.";
    return;
  }
  applyModal.value.applying = true;
  applyModal.value.error = "";
  try {
    const start = new Date(applyModal.value.startDate + "T00:00:00");
    let end;
    if (isCustomPeriod.value) {
      end = new Date(applyModal.value.endDate + "T00:00:00");
      if (end < start) {
        applyModal.value.error = "End date must be after start date.";
        applyModal.value.applying = false;
        return;
      }
    } else {
      const opt = PERIOD_OPTIONS.find(o => o.value === applyModal.value.period);
      end = new Date(start);
      end.setDate(start.getDate() + (opt?.days ?? 14) - 1);
    }

    const tShifts = await fetchTemplateShifts(applyModal.value.template.id_template);
    await Promise.all(tShifts.map(async ts => {
      const [emps, tls] = await Promise.all([
        fetchTemplateShiftEmployees(ts.id_templateShift).catch(() => []),
        fetchTemplateShiftTaskLists(ts.id_templateShift).catch(() => []),
      ]);
      ts._employees = emps;
      ts._taskLists = tls;
    }));

    let application = null;
    try {
      application = await createTemplateApplication({
        id_template: applyModal.value.template.id_template,
        startDate:   localDateStr(start),
        endDate:     localDateStr(end),
      });
    } catch { /* backend endpoint may be missing */ }

    const current = new Date(start);
    while (current <= end) {
      const dowInt  = current.getDay();
      const dateStr = localDateStr(current);
      for (const ts of tShifts) {
        if (ts.dayOfWeek !== dowInt) continue;
        const { data: newShift } = await apiClient.post("/shifts", {
          name:          ts.label || "Shift",
          description:   ts.notes || "",
          day:           DAY_ENUM[dowInt],
          date:          dateStr,
          startTime:     hourToTimeStr(ts.startHour),
          endTime:       hourToTimeStr(ts.endHour),
          id_position:   ts.id_position || null,
          id_department: selectedDeptId.value || null,
        });
        for (const emp of ts._employees) {
          await apiClient.post("/shift-assignments", {
            id_shift:    newShift.id_shift,
            id_employee: emp.id_employee,
            date:        dateStr,
          }).catch(() => {});
        }
        for (const tl of ts._taskLists) {
          await apiClient.post("/shift-task-lists", {
            id_shift:   newShift.id_shift,
            id_taskList: tl.id_taskList,
          }).catch(() => {});
        }
        if (application) {
          await createTemplateApplicationShift({
            id_templateApplication: application.id_templateApplication,
            id_templateShift:       ts.id_templateShift,
            id_shift:               newShift.id_shift,
            date:                   dateStr,
          }).catch(() => {});
        }
      }
      current.setDate(current.getDate() + 1);
    }

    applyModal.value.open = false;
    await loadAll();
  } catch (err) {
    applyModal.value.error = err.response?.data?.message || err.message || "Apply failed.";
  } finally {
    applyModal.value.applying = false;
  }
}

// ── Date picker for apply modal ────────────────────────────────────────────────
const datePicker = ref({
  open: false,
  field: null,
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
});

function openPicker(field, currentValue) {
  if (datePicker.value.open && datePicker.value.field === field) {
    datePicker.value.open = false;
    return;
  }
  const base = currentValue ? new Date(currentValue + "T00:00:00") : new Date();
  datePicker.value = {
    open: true,
    field,
    viewYear: base.getFullYear(),
    viewMonth: base.getMonth(),
  };
}

function closePicker() {
  datePicker.value.open = false;
  datePicker.value.field = null;
}

const pickerMonthLabel = computed(() => {
  const d = new Date(datePicker.value.viewYear, datePicker.value.viewMonth, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
});
const pickerDaysInMonth = computed(() =>
  new Date(datePicker.value.viewYear, datePicker.value.viewMonth + 1, 0).getDate()
);
const pickerStartPad = computed(() =>
  new Date(datePicker.value.viewYear, datePicker.value.viewMonth, 1).getDay()
);

function prevPickerMonth() {
  let m = datePicker.value.viewMonth - 1;
  let y = datePicker.value.viewYear;
  if (m < 0) { m = 11; y -= 1; }
  datePicker.value.viewMonth = m;
  datePicker.value.viewYear = y;
}
function nextPickerMonth() {
  let m = datePicker.value.viewMonth + 1;
  let y = datePicker.value.viewYear;
  if (m > 11) { m = 0; y += 1; }
  datePicker.value.viewMonth = m;
  datePicker.value.viewYear = y;
}
function pad2(n) { return String(n).padStart(2, "0"); }
function isPickerDaySelected(day) {
  const field = datePicker.value.field;
  const value = field === "end" ? applyModal.value.endDate : applyModal.value.startDate;
  if (!value) return false;
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  return value === iso;
}
function isPickerDayToday(day) {
  const today = new Date();
  return day === today.getDate()
    && datePicker.value.viewMonth === today.getMonth()
    && datePicker.value.viewYear === today.getFullYear();
}
function isPickerDayBeforeStart(day) {
  if (datePicker.value.field !== "end" || !applyModal.value.startDate) return false;
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  return iso < applyModal.value.startDate;
}
function selectPickerDay(day) {
  const iso = `${datePicker.value.viewYear}-${pad2(datePicker.value.viewMonth + 1)}-${pad2(day)}`;
  if (datePicker.value.field === "end") applyModal.value.endDate = iso;
  else applyModal.value.startDate = iso;
  closePicker();
}
function formatDateDisplay(iso) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Close dropdown / picker on outside click
function onDocClickForTemplate() {
  if (templateDropdownOpen.value) templateDropdownOpen.value = false;
  if (datePicker.value.open) closePicker();
}
watch(() => applyModal.value.open, v => { if (!v) closePicker(); });

// ── Lifecycle ──────────────────────────────────────────────────────────────────
watch(selectedDeptId, () => { loadAll(); loadTemplatesForDropdown(); });

// Reload sidebar tasks whenever today's shifts change (e.g. after loadAll)
watch(myTodayShifts, () => { loadMyTasks(); }, { deep: false });

// When any sync (auto, manual, or bulk) completes, pull fresh dept
// unavailability so the dropdown warnings + hatched overlay update
// without requiring a browser refresh.
const { lastSyncTimestamp: __unavailSyncTs } = useUnavailabilityRefresh();
watch(__unavailSyncTs, () => {
  const deptId = selectedDeptId.value || currentUser.value?.id_department;
  if (!deptId) return;
  getUnavailability({ id_department: deptId })
    .then(r => { deptUnavailability.value = r.data || []; })
    .catch(() => {});
});

let clockInterval = null;
onMounted(async () => {
  // Load department list for everyone — employees may belong to multiple
  // departments via the employeeDepartment junction and need the switcher.
  await loadDepts(currentUser.value);
  await loadAll();
  loadTemplatesForDropdown();
  window.addEventListener("click", onDocClickForTemplate);
  if (calBody.value) calBody.value.scrollTop = 7 * cellHeight.value; // scroll to 7am
  window.addEventListener("keydown", onDashKeydown);
  window.addEventListener("keyup", onDashKeyup);
  window.addEventListener("blur",  onDashBlur);
  // Tick every minute to keep the current-time line accurate
  clockInterval = setInterval(() => {
    currentTimeHour.value = new Date().getHours() + new Date().getMinutes() / 60;
  }, 60_000);
});
function onDashKeyup(e)  { if (e.key === "Meta" || e.key === "Control") cmdHeld.value = false; }
function onDashBlur()    { cmdHeld.value = false; } // window lost focus, key release won't fire

onUnmounted(() => {
  stopDragScroll();
  window.removeEventListener("keydown", onDashKeydown);
  window.removeEventListener("keyup",   onDashKeyup);
  window.removeEventListener("blur",    onDashBlur);
  window.removeEventListener("click",   onDocClickForTemplate);
  clearInterval(clockInterval);
});
watch(calView, () => { setTimeout(() => { if (calBody.value) calBody.value.scrollTop = 7 * cellHeight.value; }, 50); });

// ── Zoom / fit ─────────────────────────────────────────────────────────────────
function fitToView() {
  if (!calBody.value) return;

  // Subtract the sticky header height from available space
  const headerEl = calBody.value.querySelector('.cal-header-row');
  const headerH  = headerEl ? headerEl.offsetHeight : 0;
  const availableH = calBody.value.clientHeight - headerH;

  // Collect all defined business hour entries from calendarHours
  const pool = activeSeason.value
    ? calendarHours.value.filter(h => h.season === activeSeason.value)
    : calendarHours.value;

  let minHour = 24, maxHour = 0;
  for (const entry of pool) {
    const start = fromTimeInput(entry.startTime);
    const end   = fromTimeInput(entry.endTime);
    if (start < minHour) minHour = start;
    if (end   > maxHour) maxHour = end;
  }

  // Fallback: no business hours configured — infer from visible shifts
  if (maxHour <= minHour) {
    const dates   = calView.value === 'Day' ? [dayViewDate.value] : weekDates.value;
    const dateSet = new Set(dates.map(d => dateToKey(d)));
    const visible = shifts.value.filter(s => dateSet.has(s.date));
    if (visible.length) {
      minHour = Math.min(...visible.map(s => s.startHour));
      maxHour = Math.max(...visible.map(s => s.endHour));
    } else {
      minHour = 7; maxHour = 19;
    }
  }

  const spanHours = maxHour - minHour;
  cellHeight.value = Math.max(20, Math.min(160, Math.floor(availableH / spanHours)));
  nextTick(() => { if (calBody.value) calBody.value.scrollTop = minHour * cellHeight.value; });
}
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.app {
  font-family: 'Satoshi', sans-serif;
  background: var(--bg-page);
  color: var(--tx-primary);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

/* ── Loading / error ── */
.loading-overlay { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; z-index: 999; backdrop-filter: blur(4px); }
.loading-spinner { width: 36px; height: 36px; border: 3px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 16px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.api-error-banner { background: var(--err-bg); border-bottom: 1px solid var(--err-border); color: var(--err-text); font-size: 15px; padding: 8px 20px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.retry-btn { background: none; border: 1px solid var(--err-text); color: var(--err-text); padding: 2px 10px; border-radius: 4px; cursor: pointer; font-size: 14px; font-family: 'Satoshi', sans-serif; }
.retry-btn:hover { background: var(--err-text); color: #fff; }

/* ── Nav ── */
.topnav { display: flex; align-items: center; gap: 24px; padding: 0 24px; height: 56px; background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; z-index: 10; }
.nav-logo { display: flex; align-items: center; gap: 8px; }
.nav-logo-img { height: 44px; width: auto; object-fit: contain; }
.logo-icon { font-size: 23px; color: var(--accent); }
.logo-text { font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 500; letter-spacing: 0.05em; }
.nav-tabs { display: flex; gap: 4px; flex: 1; }
.nav-tab { position: relative; padding: 8px 16px; background: none; border: none; color: var(--tx-muted); font-family: 'Satoshi', sans-serif; font-size: 16px; cursor: pointer; border-radius: 0; transition: color 0.15s; }
.nav-tab::after { content: ''; position: absolute; bottom: -1px; left: 8px; right: 8px; height: 2px; background: transparent; border-radius: 2px; transition: background 0.15s; }
.nav-tab:hover  { color: var(--tx-secondary); }
.nav-tab:hover::after { background: var(--bdr-medium); }
.nav-tab.active { color: var(--accent); font-weight: 600; }
.nav-tab.active::after { background: var(--accent); }
.nav-divider { width: 1px; height: 20px; background: var(--bdr-subtle); flex-shrink: 0; }
.nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.icon-btn { position: relative; background: none; border: none; cursor: pointer; font-size: 19px; color: var(--tx-muted); }
.notif-dot { position: absolute; top: 0; right: 0; width: 7px; height: 7px; background: var(--err-text); border-radius: 50%; border: 1px solid var(--bg-surface); }
.avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #FF1744, #F0E6D3); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #000; cursor: pointer; }

/* ── Theme toggle ── */
.theme-toggle { background: none; border: 1px solid var(--bdr-subtle); color: var(--tx-muted); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; flex-shrink: 0; }
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

/* ── Layout ── */
.layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.sidebar { width: 220px; flex-shrink: 0; background: var(--bg-surface); border-right: 1px solid var(--bdr-subtle); overflow-y: auto; padding: 16px 8px; display: flex; flex-direction: column; gap: 8px; }
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.mini-cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 0 2px; }
.cal-nav-btn { background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 19px; padding: 2px 6px; border-radius: 4px; transition: color 0.15s; }
.cal-nav-btn:hover { color: var(--accent); }
.mini-cal-month { font-size: 14px; color: var(--tx-secondary); font-family: 'DM Mono', monospace; }
.mini-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--bdr-subtle); }
.mini-cal-day-label { text-align: center; font-size: 13px; color: var(--tx-label-dim); padding: 3px 0; font-family: 'DM Mono', monospace; }
.mini-cal-cell { text-align: center; font-size: 14px; padding: 3px 1px; border-radius: 4px; cursor: pointer; color: var(--tx-dim); font-family: 'DM Mono', monospace; transition: background 0.12s; }
.mini-cal-cell:hover { background: var(--bdr-subtle); color: var(--tx-secondary); }
.mini-cal-cell.in-week { background: var(--bg-active); color: var(--tasks-tx); }
.mini-cal-cell.selected-day { background: var(--accent-bg); color: var(--accent); font-weight: 600; outline: 1px solid var(--accent-border); }
.mini-cal-cell.today { background: var(--accent) !important; color: var(--today-badge-tx) !important; font-weight: 700; }
.mini-cal-cell.empty { cursor: default; }
.sidebar-section { margin-bottom: 0; padding: 0 10px 12px; background: var(--bg-card); border: 1px solid var(--bdr-faint); border-radius: 8px; }

/* Section header — used by both manager and employee sections */
.sidebar-sec-header { display: flex; align-items: center; justify-content: space-between; padding: 11px 0 9px; margin-bottom: 8px; border-bottom: 1px solid var(--bdr-faint); }
.sidebar-sec-title { font-size: 16px; font-weight: 700; color: var(--tx-primary); letter-spacing: 0.01em; font-family: 'Satoshi', sans-serif; }
.sidebar-sec-sub { font-size: 13px; color: var(--tx-faintest); font-style: italic; }
.sidebar-sec-count { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-ghost); background: var(--bg-hover); border: 1px solid var(--bdr-faint); border-radius: 10px; padding: 1px 7px; flex-shrink: 0; }
.sidebar-sec-header.clickable { cursor: pointer; }
.sidebar-sec-header.clickable:hover .sidebar-sec-title { color: var(--accent); }

/* Legacy sidebar label — kept for any remaining usages */
.sidebar-label { font-size: 14px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 8px; }
.sidebar-label.underline-link { cursor: pointer; color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.employee-chip { border-radius: 6px; padding: 6px 10px; font-size: 15px; font-weight: 600; color: #000; margin-bottom: 5px; text-align: center; cursor: pointer; transition: opacity 0.15s; }
.employee-chip:hover { opacity: 0.85; }
.sidebar-empty { font-size: 14px; color: var(--tx-faintest); font-style: italic; padding: 2px 0 4px; }
.open-shifts-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.open-shifts-header .sidebar-label { margin-bottom: 0; }
.open-shifts-week { font-size: 13px; color: var(--tx-faintest); font-style: italic; }

.open-shift-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--bdr-subtle);
  align-items: flex-start;
}
.open-shift-day {
  font-size: 14px;
  font-weight: 700;
  color: var(--tx-secondary);
  width: 28px;
  flex-shrink: 0;
  padding-top: 1px;
}
.open-shift-gaps { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.open-shift-gap-row { display: flex; }
.open-shift-gap {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-family: 'DM Mono', monospace;
  color: var(--tx-dim);
  background: var(--bg-hover);
  border: 1px solid var(--bdr-accent);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}
.open-shift-pos {
  font-size: 12px;
  font-family: 'Satoshi', sans-serif;
  color: var(--tx-faintest);
}

.request-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; padding: 8px 0;
  border-bottom: 1px solid var(--bdr-subtle);
  color: var(--tx-muted);
}
.request-type-tag {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--tx-faint);
  background: var(--bdr-subtle); border-radius: 4px;
  padding: 2px 6px; flex-shrink: 0; font-family: 'DM Mono', monospace;
}
.request-label {
  flex: 1; color: var(--tx-secondary); font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: 'DM Mono', monospace; font-size: 12px;
}
.request-status-pill {
  font-size: 10px; font-weight: 700; padding: 2px 8px;
  border-radius: 100px; flex-shrink: 0; text-transform: uppercase;
  letter-spacing: 0.05em;
}
.request-status-pill.status--pending  { background: var(--warn-bg); color: var(--warn-text); }
.request-status-pill.status--approved { background: var(--ok-bg); color: var(--ok-text); }
.request-status-pill.status--denied   { background: var(--deny-bg); color: var(--err-text); }
.request-status-pill.status--open     { background: var(--bdr-subtle); color: var(--tx-muted); }
.request-status-pill.status--claimed  { background: var(--accent-bg); color: var(--accent); }

.sidebar-view-all {
  font-size: 12px; color: var(--accent); cursor: pointer;
  padding: 8px 0 2px; text-align: center; font-weight: 600;
  letter-spacing: 0.02em;
}
.sidebar-view-all:hover { text-decoration: underline; }

/* Sidebar tradeboard items (manager) */
.sb-trade-item {
  padding: 7px 0;
  border-bottom: 1px solid var(--bdr-subtle);
  display: flex; flex-direction: column; gap: 2px;
}
.sb-trade-row { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.sb-trade-name { font-size: 15px; font-weight: 600; color: var(--tx-secondary); }
.sb-trade-time { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-dim); white-space: nowrap; }
.sb-trade-meta { display: flex; gap: 6px; align-items: center; }
.sb-trade-date { font-size: 13px; color: var(--tx-faintest); font-family: 'DM Mono', monospace; }
.sb-trade-pos  { font-size: 12px; color: var(--tx-faintest); background: var(--bg-hover); border-radius: 3px; padding: 0 4px; }
.sb-trade-claim { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
.sb-trade-claimer { font-size: 13px; color: var(--accent); }
.sb-trade-actions { display: flex; gap: 4px; }
.sb-approve-btn, .sb-deny-btn {
  font-size: 14px; font-weight: 700; border: none; border-radius: 4px; padding: 2px 7px; cursor: pointer; transition: opacity 0.15s;
}
.sb-approve-btn { background: #1a7a3a; color: #d6f5e0; }
.sb-approve-btn:hover { opacity: 0.85; }
.sb-deny-btn    { background: #6b1a1a; color: #f5d6d6; }
.sb-deny-btn:hover    { opacity: 0.85; }

/* Sidebar requests items (manager) */
.sb-req-item {
  padding: 7px 0;
  border-bottom: 1px solid var(--bdr-subtle);
  display: flex; flex-direction: column; gap: 2px;
}
.sb-req-row { display: flex; justify-content: space-between; align-items: baseline; }
.sb-req-name { font-size: 15px; font-weight: 600; color: var(--tx-secondary); }
.sb-req-type { font-size: 13px; color: var(--accent); }
.sb-req-dates { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-dim); }
.sb-req-actions { display: flex; gap: 4px; margin-top: 3px; }
.sb-req-status { font-size: 13px; font-weight: 600; margin-top: 2px; text-transform: capitalize; }
.sb-req-status.approved { color: #4caf50; }
.sb-req-status.denied   { color: var(--accent); }

.my-shift-item { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--bdr-subtle); }
.my-shift-pos { font-size: 15px; font-weight: 600; color: var(--tx-secondary); }
.my-shift-time { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-dim); }

.trade-preview-item { padding: 6px 0; border-bottom: 1px solid var(--bdr-subtle); cursor: pointer; transition: background 0.12s; border-radius: 4px; }
.trade-preview-item:hover { background: var(--bg-hover); }
.trade-preview-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
.trade-preview-name { font-size: 15px; font-weight: 600; color: var(--tx-secondary); }
.trade-preview-day { font-size: 13px; font-weight: 700; color: var(--tx-dim); }
.trade-preview-time { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--accent); }

/* ── Main ── */
.cal-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.dept-name-bar { padding: 10px 20px 0; font-size: 21px; font-weight: 700; letter-spacing: 0.02em; color: var(--tx-heading); font-family: 'Satoshi', sans-serif; flex-shrink: 0; }
.cal-toolbar { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.cal-nav-group { display: flex; align-items: center; gap: 8px; }
.toolbar-btn { background: var(--bdr-subtle); border: none; color: var(--tx-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 19px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
.toolbar-btn:hover { background: var(--bg-active); color: var(--accent); }
.cal-range-label { font-size: 17px; font-weight: 600; color: var(--tx-primary); font-family: 'DM Mono', monospace; white-space: nowrap; }
.today-btn { background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 4px 12px; border-radius: 6px; font-size: 15px; cursor: pointer; font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s; }
.today-btn:hover { border-color: var(--accent); color: var(--accent); }
.cal-view-group { display: flex; gap: 2px; background: var(--bdr-subtle); border-radius: 8px; padding: 3px; }
.cal-view-group.push-right { margin-left: auto; }
.view-btn { background: none; border: none; color: var(--tx-muted); padding: 4px 14px; border-radius: 6px; font-size: 15px; cursor: pointer; font-family: 'Satoshi', sans-serif; transition: background 0.15s, color 0.15s; }
.view-btn.active { background: var(--bg-active); color: var(--accent); font-weight: 600; }
.add-shift-btn { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: 'Satoshi', sans-serif; transition: background 0.15s, transform 0.12s; white-space: nowrap; }

.zoom-group { display: flex; align-items: center; gap: 6px; padding: 0 4px; }
.zoom-icon { color: var(--tx-dim); flex-shrink: 0; }
.zoom-slider {
  -webkit-appearance: none; appearance: none;
  width: 80px; height: 4px;
  background: var(--bdr-subtle); border-radius: 2px; outline: none; cursor: pointer;
}
.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 13px; height: 13px; border-radius: 50%;
  background: var(--accent); cursor: pointer; transition: transform 0.1s;
}
.zoom-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.fit-btn {
  background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted);
  padding: 3px 10px; border-radius: 6px; font-size: 14px; cursor: pointer;
  font-family: 'Satoshi', sans-serif; transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.fit-btn:hover { border-color: var(--accent); color: var(--accent); }
.add-shift-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Shared time-grid (Day + Week) ── */
.cal-grid-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.cal-body { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
.cal-header-row { display: flex; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; background: var(--bg-surface); position: sticky; top: 0; z-index: 20; }
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
.day-letter { font-size: 14px; color: var(--tx-dim); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.day-number { font-size: 21px; font-family: 'DM Mono', monospace; color: var(--tx-muted); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 500; }
.day-month-label { font-size: 14px; color: var(--tx-dim); font-style: italic; }
.day-header.today .day-letter { color: var(--accent); }
.day-header.today .day-number { background: var(--accent); color: var(--today-badge-tx); font-weight: 700; }

.cal-body::-webkit-scrollbar { width: 6px; }
.cal-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.cal-inner { display: flex; min-height: fit-content; }
.time-column { width: 60px; flex-shrink: 0; }
.time-slot-label { height: var(--cell-h, 60px); padding: 4px 8px 0; font-size: 13px; color: var(--tx-faintest); font-family: 'DM Mono', monospace; display: flex; align-items: flex-start; justify-content: flex-end; }

.day-column { flex: 1; position: relative; border-left: 1px solid var(--bdr-strong); cursor: crosshair; }
.day-column.is-dragging-col { background: var(--accent-drag); }
.day-column.no-edit { cursor: default; }
.hour-cell { height: var(--cell-h, 60px); border-bottom: 1px solid var(--bdr-faint); }
.hour-cell:nth-child(even) { background: var(--hour-even); }

.ghost-block { border: 2px solid var(--accent); background: var(--accent-bg); border-radius: 6px; display: flex; align-items: flex-start; padding: 4px 8px; pointer-events: none; }
.ghost-label { font-size: 14px; color: var(--accent); font-family: 'DM Mono', monospace; font-weight: 500; white-space: nowrap; }

.shift-block { position: absolute; border-radius: 6px; padding: 5px 8px; cursor: pointer; overflow: hidden; z-index: 2; transition: filter 0.15s; }

/* Hatched unavailability overlay — shown on the day column for the
   selected shift's assignee. Sits behind shift blocks (z-index 1) so the
   active shift still reads on top. */
.unavailability-overlay {
  position: absolute; left: 2px; right: 2px;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 23, 68, 0.14), rgba(255, 23, 68, 0.14) 6px,
    transparent 6px, transparent 12px
  );
  border: 1px dashed rgba(255, 23, 68, 0.45);
  border-radius: 5px;
  /* z-index 1 sits below shift-block (z-index 2). `!important` on
     pointer-events is deliberate — any future rule must not accidentally
     make this block mousedown, or drag-to-create / shift clicks break. */
  z-index: 1;
  pointer-events: none !important;
  display: flex; align-items: flex-start;
}
.unavailability-overlay-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.02em;
  color: rgba(255, 23, 68, 0.9);
  background: rgba(255,255,255,0.75);
  padding: 1px 6px; border-radius: 3px;
  margin: 3px 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: calc(100% - 8px);
  font-family: 'DM Mono', monospace;
  pointer-events: none !important;
}
.shift-block:hover { filter: brightness(1.12); }
.take-shift-btn {
  position: absolute; bottom: 4px; right: 4px;
  background: #fff; color: #111; border: none;
  font-size: 11px; font-weight: 700; font-family: 'Satoshi', sans-serif;
  padding: 3px 10px; border-radius: 6px; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  transition: background 0.12s, transform 0.08s;
}
.take-shift-btn:hover { background: #f0f0f0; transform: translateY(-1px); }
.take-shift-btn:active { transform: translateY(0); }
.cmd-create-mode .shift-block { cursor: crosshair !important; }
.shift-employee { font-size: 15px; font-weight: 700; color: rgba(0,0,0,0.85); line-height: 1.2; }
.shift-time { font-size: 13px; color: rgba(0,0,0,0.6); font-family: 'DM Mono', monospace; }
.shift-pos-badge { font-size: 12px; color: rgba(0,0,0,0.5); background: rgba(0,0,0,0.1); border-radius: 3px; padding: 1px 4px; display: inline-block; }
.shift-meta-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; flex-wrap: wrap; }
.shift-task-status {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 6px 2px 5px; border-radius: 100px;
  background: rgba(220, 38, 38, 0.28);
  color: #5a0f0f;
  font-family: 'DM Mono', monospace;
  letter-spacing: 0.02em;
}
.shift-task-status svg { flex-shrink: 0; }
.shift-task-status--done {
  background: rgba(22, 130, 70, 0.28);
  color: #0f3d23;
}

.event-block { position: absolute; left: 3px; right: 3px; border-radius: 6px; overflow: hidden; z-index: 1; }
.event-block-title { font-size: 14px; font-weight: 700; color: #4A90A4; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-block-time  { font-size: 12px; color: rgba(74,144,164,0.8); font-family: 'DM Mono', monospace; }

.month-event-pill {
  display: flex; align-items: center; gap: 5px;
  border-radius: 4px; padding: 2px 6px; overflow: hidden;
  background: rgba(74,144,164,0.15); border-left: 2px solid #4A90A4;
}
.month-event-dot  { width: 5px; height: 5px; border-radius: 50%; background: #4A90A4; flex-shrink: 0; }
.month-event-name { font-size: 14px; font-weight: 600; color: #4A90A4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }

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
  font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 600;
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
.month-dow { text-align: center; padding: 10px 0; font-size: 14px; font-weight: 600; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.08em; }

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
  font-size: 16px;
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
.pill-name { font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pill-time { font-size: 13px; color: rgba(0,0,0,0.6); font-family: 'DM Mono', monospace; white-space: nowrap; }

.month-shift-more { font-size: 14px; color: var(--tx-dim); padding: 2px 6px; cursor: pointer; }
.month-shift-more:hover { color: var(--accent); }

/* ── Shared form styles ── */
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }
.form-group label { font-size: 13px; color: var(--tx-dim); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.label-optional { font-weight: 400; text-transform: none; font-style: italic; letter-spacing: 0; color: var(--tx-faintest); }
.form-group select,
.form-group input[type="time"],
.form-group input[type="text"] { background: var(--bg-input); border: 1px solid var(--bdr-accent); color: var(--tx-primary); padding: 7px 10px; border-radius: 8px; font-size: 15px; font-family: 'Satoshi', sans-serif; outline: none; transition: border-color 0.15s; }
.form-group select:focus, .form-group input:focus { border-color: var(--accent); }

/* ── Quick-create popover ── */
.quick-create-popover { position: fixed; width: 290px; background: var(--bg-modal); border: 1px solid var(--bdr-pop); border-radius: 14px; padding: 18px 20px 20px; box-shadow: 0 20px 60px var(--bg-moverlay), 0 0 0 1px var(--accent-bg); z-index: 200; }
.qc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4px; }
.qc-time-badge { background: var(--accent-bg); color: var(--accent); font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 500; padding: 3px 10px; border-radius: 20px; border: 1px solid var(--accent-border); }
.qc-close { background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 16px; transition: color 0.15s; padding: 2px 4px; }
.qc-close:hover { color: var(--tx-secondary); }
.qc-date-label { font-size: 15px; color: var(--tx-dim); margin-bottom: 16px; font-style: italic; }
.qc-actions { display: flex; gap: 8px; margin-top: 4px; }
.qc-cancel { flex: 1; background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 8px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 16px; }
.qc-cancel:hover { border-color: var(--bdr-medium); color: var(--tx-secondary); }
.qc-confirm { flex: 2; background: var(--accent); border: none; color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s, transform 0.12s; }
.qc-confirm:hover { background: var(--accent-hover); transform: translateY(-1px); }

/* ── Full modal ── */
.modal-overlay { position: fixed; inset: 0; background: var(--bg-moverlay); display: flex; align-items: center; justify-content: center; z-index: 300; backdrop-filter: blur(4px); }
.modal { background: var(--bg-modal); border: 1px solid var(--bdr-accent); border-radius: 14px; padding: 28px; width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
.modal-title { font-size: 21px; font-weight: 700; color: var(--tx-primary); margin-bottom: 0; }
.modal:not(.stm-modal) .modal-title { margin-bottom: 20px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.modal-cancel { background: none; border: 1px solid var(--bdr-accent); color: var(--tx-muted); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 16px; }
.modal-confirm { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'Satoshi', sans-serif; font-size: 16px; font-weight: 700; transition: background 0.15s; }
.modal-confirm:hover { background: var(--accent-hover); }

/* ── Shift detail popover ── */
.shift-popover { position: fixed; background: var(--bg-modal); border: 1px solid var(--bdr-accent); border-radius: 12px; padding: 16px 18px; width: 220px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); z-index: 150; }
.popover-close { position: absolute; top: 10px; right: 12px; background: none; border: none; color: var(--tx-dim); cursor: pointer; font-size: 15px; }
.popover-dot { width: 10px; height: 10px; border-radius: 50%; margin-bottom: 8px; }
.popover-employee { font-size: 18px; font-weight: 700; color: var(--tx-primary); margin-bottom: 4px; }
.popover-time { font-size: 15px; color: var(--tx-muted); font-family: 'DM Mono', monospace; }
.popover-day { font-size: 15px; color: var(--tx-muted); margin-top: 2px; }
.popover-notes { font-size: 14px; color: var(--tx-secondary); font-style: italic; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--bdr-accent); }
.popover-actions { display: flex; gap: 8px; margin-top: 14px; }
.popover-edit { flex: 1; background: var(--bdr-accent); border: none; color: var(--tx-secondary); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
.popover-edit:hover { background: var(--bg-active); color: var(--accent); }
.popover-tasks { flex: 1; background: var(--tasks-bg); border: none; color: var(--tasks-tx); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
.popover-tasks:hover { background: var(--tasks-bg-h); color: var(--tasks-tx-h); }
.popover-delete { flex: 1; background: var(--err-bg); border: none; color: var(--err-text); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 15px; font-family: 'Satoshi', sans-serif; transition: background 0.15s; }
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
  font-size: 29px; font-weight: 700; color: #fff;
  margin: 0 auto;
  overflow: hidden;
  border: 2px solid var(--accent-border);
}
.profile-header { flex-direction: column; align-items: center; padding: 28px 20px 16px; position: relative; }
.profile-close {
  position: absolute; top: 16px; right: 16px;
  background: none; border: none; color: var(--tx-faint);
  font-size: 17px; cursor: pointer;
  transition: color 0.15s;
}
.profile-close:hover { color: var(--accent); }
.profile-body { padding: 0 24px 20px; text-align: center; }
.profile-name { font-size: 23px; font-weight: 700; color: var(--tx-heading); margin-bottom: 6px; }
.profile-email { font-size: 16px; color: var(--tx-faint); margin-bottom: 12px; font-family: 'DM Mono', monospace; }
.profile-role-badge {
  display: inline-block; padding: 3px 14px; border-radius: 100px;
  font-size: 14px; font-weight: 600;
}
.profile-role-badge.employee { background: rgba(255,23,68,0.1);  color: #FF4569; }
.profile-role-badge.manager  { background: rgba(240,230,211,0.1); color: #c8903a; }
.profile-role-badge.admin    { background: rgba(74,144,164,0.15); color: #4A90A4; }
.profile-divider { height: 1px; background: var(--bdr-subtle); margin: 0 24px; }
.profile-info { padding: 16px 24px; }
.profile-info-row { display: flex; justify-content: space-between; align-items: center; font-size: 16px; padding: 6px 0; }
.info-label { color: var(--tx-faint); }
.info-val { color: var(--tx-secondary); }
.mono { font-family: 'DM Mono', monospace; }
.logout-btn {
  margin: auto 24px 28px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  color: #EF4444;
  padding: 12px; border-radius: 10px;
  cursor: pointer;
  font-family: 'Satoshi', sans-serif;
  font-size: 17px; font-weight: 600;
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
  font-size: 15px; font-weight: 600; font-family: 'Satoshi', sans-serif;
  transition: background 0.15s, color 0.15s;
}
.manage-btn:hover { background: var(--accent); color: #fff; }

/* ── Shift Task Lists Modal ── */
.stm-modal { width: 480px; max-height: 80vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.stm-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 24px 16px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.stm-header .modal-title { margin-bottom: 4px; }
.stm-sub { font-size: 15px; color: var(--tx-faint); font-family: 'DM Mono', monospace; }
.stm-close { background: none; border: none; color: var(--tx-faint); font-size: 17px; cursor: pointer; padding: 4px 6px; border-radius: 6px; transition: color 0.15s, background 0.15s; flex-shrink: 0; margin-top: 2px; }
.stm-close:hover { color: var(--accent); background: var(--bg-active); }
.stm-error { margin: 12px 24px 0; padding: 8px 12px; background: var(--err-bg); border: 1px solid var(--err-border); border-radius: 8px; color: var(--err-text); font-size: 15px; }
.stm-loading { display: flex; align-items: center; gap: 10px; padding: 32px 24px; color: var(--tx-faint); font-size: 16px; }
.stm-spinner { width: 18px; height: 18px; border: 2px solid var(--bdr-subtle); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

.stm-lists { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.stm-lists::-webkit-scrollbar { width: 4px; }
.stm-lists::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }

.stm-list-card { background: var(--bg-surface); border: 1px solid var(--bdr-subtle); border-radius: 10px; overflow: hidden; }
.stm-list-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 8px; }
.stm-list-meta { display: flex; align-items: center; gap: 10px; min-width: 0; }
.stm-list-name { font-size: 16px; font-weight: 600; color: var(--tx-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stm-progress { font-size: 14px; font-weight: 600; font-family: 'DM Mono', monospace; color: var(--tx-faint); background: var(--bg-modal); border: 1px solid var(--bdr-medium); padding: 2px 8px; border-radius: 100px; flex-shrink: 0; }
.stm-remove-btn { background: none; border: none; color: var(--tx-ghost); font-size: 15px; cursor: pointer; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; flex-shrink: 0; }
.stm-remove-btn:hover { background: var(--err-bg); color: var(--err-text); }

.stm-prog-bar { height: 3px; background: var(--bdr-subtle); margin: 0 14px 10px; border-radius: 2px; overflow: hidden; }
.stm-prog-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }

.stm-tasks { display: flex; flex-direction: column; }
.stm-task-row { display: flex; align-items: center; gap: 10px; padding: 8px 14px; cursor: pointer; border-top: 1px solid var(--bdr-strong); transition: background 0.12s; }
.stm-task-row:hover:not(.stm-task-disabled) { background: var(--bg-card); }
.stm-task-disabled { cursor: default; }
.stm-checkbox { accent-color: var(--accent); width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }
.stm-task-disabled .stm-checkbox { cursor: default; }
.stm-task-name { font-size: 16px; color: var(--tx-secondary); flex: 1; }
.stm-task-name.done { color: var(--tx-ghost); text-decoration: line-through; }
.stm-no-tasks { padding: 10px 14px; font-size: 15px; color: var(--tx-ghost); font-style: italic; border-top: 1px solid var(--bdr-strong); }

.stm-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; gap: 6px; text-align: center; color: var(--tx-faint); font-size: 16px; }
.stm-empty-sub { font-size: 15px; color: var(--tx-ghost); }

.stm-assign-section { padding: 14px 24px 20px; border-top: 1px solid var(--bdr-subtle); flex-shrink: 0; background: var(--bg-surface); }
.stm-assign-label { font-size: 13px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
.stm-assign-row { display: flex; gap: 8px; }
.stm-select { flex: 1; background: var(--bg-input); border: 1px solid var(--bdr-medium); color: var(--tx-primary); padding: 8px 10px; border-radius: 8px; font-size: 16px; font-family: 'Satoshi', sans-serif; outline: none; transition: border-color 0.15s; }
.stm-select:focus { border-color: var(--accent); }
.stm-select option { background: var(--bg-modal); }
.stm-assign-btn { background: var(--accent); border: none; color: #fff; padding: 8px 18px; border-radius: 8px; font-size: 16px; font-weight: 600; font-family: 'Satoshi', sans-serif; cursor: pointer; transition: background 0.15s; flex-shrink: 0; }
.stm-assign-btn:hover { background: var(--accent-hover); }
.stm-assign-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.stm-hint { font-size: 14px; color: var(--tx-faint); margin-top: 8px; font-style: italic; }
.stm-link { color: var(--accent-hover); cursor: pointer; text-decoration: underline; }
.stm-link:hover { color: var(--accent); }

/* ── Sidebar task section ── */
.sb-tasklist-header { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; margin: 10px 0 5px; }
.sb-tasklist-name { font-size: 14px; font-weight: 700; color: var(--tx-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.sb-tasklist-shift { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-ghost); flex-shrink: 0; }
.sb-task-row { display: flex; align-items: center; gap: 7px; padding: 3px 0; }
.sb-task-check {
  width: 16px; height: 16px; flex-shrink: 0;
  border-radius: 4px;
  border: 1.5px solid var(--tx-muted);
  background: var(--bg-input);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: transparent;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  padding: 0;
}
.sb-task-check:hover { border-color: var(--accent); background: var(--accent-bg); }
.sb-task-check.done { background: var(--accent); border-color: var(--accent); color: #fff; }
.sb-task-label { font-size: 14px; color: var(--tx-muted); line-height: 1.35; flex: 1; }
.sb-task-label.done { color: var(--tx-faintest); text-decoration: line-through; }
.sb-task-progress { display: flex; align-items: center; gap: 6px; margin: 6px 0 4px; }

/* ── Shared progress bar (tasks) ── */
.my-task-progress { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
.my-task-bar { flex: 1; height: 3px; background: var(--bdr-subtle); border-radius: 2px; overflow: hidden; }
.my-task-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s ease; }
.my-task-count { font-size: 13px; font-family: 'DM Mono', monospace; color: var(--tx-ghost); flex-shrink: 0; }

/* ── Multi-selected shift block ── */
.shift-block--multi-selected {
  outline: 2px solid rgba(255,255,255,0.85);
  outline-offset: -1px;
}

/* ── Rubber-band selection rect ── */
.rubber-band-rect {
  position: fixed;
  border: 1.5px dashed var(--accent);
  background: rgba(255, 23, 68, 0.08);
  pointer-events: none;
  z-index: 999;
  border-radius: 3px;
}

/* ── Selection toolbar ── */
.selection-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 12px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 400;
  box-shadow: 0 8px 32px rgba(0,0,0,0.45);
  white-space: nowrap;
}
.sel-count { font-size: 16px; color: var(--tx-primary); font-weight: 600; }
.sel-divider { width: 1px; height: 16px; background: var(--bdr-faint); margin: 0 2px; }
.sel-btn {
  background: var(--bg-hover); border: 1px solid var(--bdr-faint); color: var(--tx-muted);
  border-radius: 6px; padding: 5px 12px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: 'Satoshi', sans-serif;
}
.sel-btn:disabled { opacity: .4; cursor: not-allowed; }
.sel-btn:not(:disabled):hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.sel-btn--delete { color: var(--accent); border-color: var(--accent-border); }
.sel-btn--delete:not(:disabled):hover { background: var(--accent-bg); border-color: var(--accent); }
.sel-btn--clear { background: none; border: none; color: var(--tx-faint); padding: 4px 8px; font-size: 18px; line-height: 1; }
.sel-btn--clear:hover { color: var(--tx-primary); }
.toolbar-anim-enter-active, .toolbar-anim-leave-active { transition: opacity .15s, transform .15s; }
.toolbar-anim-enter-from, .toolbar-anim-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* Paste mode */
.selection-toolbar.paste-mode { background: rgba(30, 80, 160, 0.92); border-color: #4a90e2; }
.selection-toolbar.paste-mode .sel-count { color: #c8deff; }
.day-column.paste-target { cursor: copy; }
.day-column.paste-target:hover { background: rgba(74, 144, 226, 0.08); }
.day-header.paste-target-header { cursor: copy; }
.day-header.paste-target-header:hover { background: rgba(74, 144, 226, 0.15); }

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

/* ── Template Quick-Apply Dropdown (toolbar) ── */
.tpl-dropdown-wrap { position: relative; display: flex; align-items: center; margin: 0 auto; }
.tpl-dropdown-btn {
  display: flex; align-items: center; gap: 7px;
  background: var(--accent-bg, rgba(255, 23, 68, 0.08));
  border: 1px solid var(--accent-border, rgba(255, 23, 68, 0.35));
  color: var(--accent);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 14px; font-weight: 600;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.tpl-dropdown-btn:hover,
.tpl-dropdown-btn.active {
  background: var(--accent-subtle, rgba(255, 23, 68, 0.15));
  border-color: var(--accent);
}
.tpl-dd-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  min-width: 260px;
  max-width: 320px;
  max-height: 340px;
  overflow-y: auto;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint, var(--bdr-accent));
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; gap: 2px;
}
.tpl-dd-empty {
  padding: 14px 12px;
  font-size: 14px;
  color: var(--tx-faint, var(--tx-dim));
  text-align: center;
  font-family: 'Satoshi', sans-serif;
}
.tpl-dd-link {
  display: block;
  margin-top: 6px;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  font-family: 'Satoshi', sans-serif;
}
.tpl-dd-link:hover { text-decoration: underline; }
.tpl-dd-item {
  background: none;
  border: none;
  color: var(--tx-primary);
  text-align: left;
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  display: flex; flex-direction: column; gap: 2px;
  font-family: 'Satoshi', sans-serif;
  transition: background 0.12s;
}
.tpl-dd-item:hover { background: var(--bg-hover, var(--bg-active)); }
.tpl-dd-name { font-size: 14px; font-weight: 600; color: var(--tx-primary); }
.tpl-dd-desc {
  font-size: 12px;
  color: var(--tx-faint, var(--tx-dim));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tpl-dd-pop-enter-active, .tpl-dd-pop-leave-active { transition: opacity 0.12s, transform 0.12s; }
.tpl-dd-pop-enter-from, .tpl-dd-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px) scale(0.97); }

/* ── Apply Template Modal ── */
.tpl-apply-modal { width: 460px; max-width: calc(100vw - 32px); display: flex; flex-direction: column; gap: 16px; }
.tpl-apply-name {
  font-size: 15px; color: var(--accent); font-weight: 600;
  margin: -8px 0 4px; font-family: 'DM Mono', monospace;
}
.tpl-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 0; }
.tpl-form-group label {
  font-size: 13px; font-weight: 600;
  color: var(--tx-muted);
  text-transform: uppercase; letter-spacing: .1em;
}
.tpl-period-options { display: flex; gap: 8px; flex-wrap: wrap; }
.tpl-period-opt {
  flex: 1; min-width: 70px;
  background: var(--bg-surface, var(--bg-input));
  border: 1px solid var(--bdr-faint, var(--bdr-accent));
  color: var(--tx-muted);
  border-radius: 7px; padding: 8px 10px; font-size: 14px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer; text-align: center;
  transition: color .15s, border-color .15s, background .15s;
}
.tpl-period-opt:hover { color: var(--tx-primary); border-color: var(--accent); background: var(--bg-hover, var(--bg-active)); }
.tpl-period-opt.active {
  background: var(--accent-bg, rgba(255, 23, 68, 0.08));
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.tpl-form-row-dates { display: flex; align-items: flex-end; gap: 10px; }
.tpl-form-row-dates .tpl-form-group { flex: 1; }
.tpl-date-range-arrow { font-size: 18px; color: var(--tx-faint, var(--tx-dim)); padding-bottom: 10px; flex-shrink: 0; }
.tpl-apply-range-preview {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-surface, var(--bg-input));
  border: 1px solid var(--bdr-subtle, var(--bdr-accent));
  border-radius: 7px; padding: 10px 14px;
  font-size: 14px; font-family: 'DM Mono', monospace;
  color: var(--tx-primary);
}
.tpl-modal-error { color: var(--accent); font-size: 14px; margin: 0; }

/* ── Date picker (apply modal) ── */
.tpl-date-picker-wrap { position: relative; width: 100%; }
.tpl-date-trigger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  background: var(--bg-surface, var(--bg-input));
  border: 1px solid var(--bdr-faint, var(--bdr-accent));
  border-radius: 7px;
  padding: 9px 12px;
  color: var(--tx-primary);
  font-size: 14px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s, background .15s;
}
.tpl-date-trigger:hover { border-color: var(--accent); background: var(--bg-hover, var(--bg-active)); }
.tpl-date-trigger-icon { color: var(--tx-secondary); flex-shrink: 0; }
.tpl-date-trigger:hover .tpl-date-trigger-icon { color: var(--accent); }

.tpl-dpc-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: 280px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint, var(--bdr-accent));
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; gap: 10px;
  font-family: 'Satoshi', sans-serif;
}
.tpl-dpc-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 0 2px 4px;
}
.tpl-dpc-nav {
  background: var(--bg-surface, var(--bg-input));
  border: 1px solid var(--bdr-subtle, var(--bdr-accent));
  color: var(--tx-secondary);
  border-radius: 6px;
  width: 26px; height: 26px;
  font-size: 18px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s, border-color .15s, background .15s;
}
.tpl-dpc-nav:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg, rgba(255, 23, 68, 0.08));
}
.tpl-dpc-month-label {
  font-size: 15px; font-weight: 600;
  color: var(--tx-primary);
  letter-spacing: .2px;
}
.tpl-dpc-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.tpl-dpc-dow {
  text-align: center;
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .5px;
  color: var(--tx-faint, var(--tx-dim));
  padding: 4px 0;
  font-family: 'DM Mono', monospace;
}
.tpl-dpc-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.tpl-dpc-cell {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  color: var(--tx-primary);
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .12s, color .12s, border-color .12s;
  user-select: none;
}
.tpl-dpc-cell:hover:not(.tpl-dpc-empty):not(.tpl-dpc-disabled) {
  background: var(--bg-hover, var(--bg-active));
}
.tpl-dpc-empty { cursor: default; }
.tpl-dpc-today {
  border-color: var(--bdr-accent);
  font-weight: 600;
}
.tpl-dpc-selected,
.tpl-dpc-selected:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  font-weight: 600;
}
.tpl-dpc-disabled {
  color: var(--tx-dim);
  cursor: not-allowed;
  opacity: .5;
}
.tpl-dpc-pop-enter-active, .tpl-dpc-pop-leave-active {
  transition: opacity .12s ease, transform .12s ease;
  transform-origin: top left;
}
.tpl-dpc-pop-enter-from, .tpl-dpc-pop-leave-to {
  opacity: 0;
  transform: scale(.96) translateY(-4px);
}

/* ── Mobile (phone) overrides ──
   Keep the desktop layout untouched; only override what breaks on a 375px
   viewport. Tablet sits between — it gets the desktop layout but with a
   narrower sidebar and gentler toolbar padding via the smaller breakpoint. */
@media (max-width: 599.98px) {
  .cal-toolbar {
    flex-wrap: wrap;
    padding: 8px 10px;
    gap: 8px;
  }
  .cal-nav-group { flex: 1 1 auto; }
  .cal-range-label {
    font-size: 13px;
    flex: 1;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .add-shift-btn { padding: 6px 10px; font-size: 13px; }
  .tpl-dropdown-btn { padding: 6px 10px; font-size: 13px; }
  .tpl-dropdown-btn span { display: none; }

  /* Week and Month views remain reachable on phone via direct navigation,
     but their dense grids would horizontally collapse — let them pan
     instead so users can still scroll across them. */
  .cal-grid-wrapper { overflow-x: auto; }
}

/* Tablet — narrower sidebar so the calendar gets more width. */
@media (min-width: 600px) and (max-width: 959.98px) {
  .sidebar { width: 180px; }
}
</style>
