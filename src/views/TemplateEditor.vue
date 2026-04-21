<template>
  <div class="editor-root" @mousemove="onGlobalMouseMove" @mouseup="onGlobalMouseUp" :class="{ 'cmd-create-mode': cmdHeld }">

    <!-- ── Phone notice (editor is desktop-only) ── -->
    <div v-if="isPhone" class="phone-notice">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
        <rect x="2" y="4" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="18" x2="12" y2="21"/>
      </svg>
      <h2 class="phone-notice-title">Template Editor needs a larger screen</h2>
      <p class="phone-notice-body">
        The template editor uses click-and-drag to place shifts and a three-pane
        layout that doesn't fit a phone. Open this page on a tablet or desktop
        to edit templates.
      </p>
      <button class="phone-notice-back" @click="$router.push('/templates')">← Back to Templates</button>
    </div>

    <!-- ── Loading overlay ── -->
    <div v-if="!isPhone && loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading template…</span>
    </div>

    <!-- ── Template header bar ── -->
    <div v-if="!loading && !isPhone" class="template-header-bar">
      <button class="back-link" @click="$router.push('/templates')">← Templates</button>
      <input
        class="template-name-input"
        v-model="templateName"
        @blur="saveName"
        @keyup.enter="($event.target).blur()"
        placeholder="Template name…"
      />
      <span v-if="saveStatus" class="save-status">{{ saveStatus }}</span>

      <div class="header-chip-row">
        <!-- Readiness chip -->
        <div class="readiness-chip"
          :class="readinessState.kind === 'ok' ? 'readiness-chip--ok' : 'readiness-chip--warn'"
          :title="readinessState.issues.join('\n')">
          <span class="readiness-dot"></span>
          <span>{{ readinessState.label }}</span>
        </div>
        <!-- Applied instances chip -->
        <button v-if="appliedInstancesCount > 0"
          class="applied-chip"
          @click="goToFirstAppliedWeek"
          :title="`Jump to ${appliedInstancesCount} applied week${appliedInstancesCount === 1 ? '' : 's'} on the Dashboard`">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M1 7h14" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          Applied to {{ appliedInstancesCount }} week{{ appliedInstancesCount === 1 ? '' : 's' }} →
        </button>
      </div>
    </div>

    <!-- ── Error Banner ── -->
    <div v-if="apiError && !isPhone" class="error-banner">
      {{ apiError }}
      <button class="retry-btn" @click="loadAll">Retry</button>
    </div>

    <!-- ── Week Tab Bar (only shown for multi-week templates) ── -->
    <div v-if="!loading && !isPhone && durationWeeks > 1" class="week-tab-bar">
      <div class="week-tab-list">
        <button
          v-for="i in durationWeeks"
          :key="i - 1"
          class="week-tab"
          :class="{ active: activeWeek === i - 1 }"
          @click="setActiveWeek(i - 1)"
        >
          <span class="week-tab-label">Week {{ i }}</span>
          <span class="week-tab-count">{{ shiftsPerWeek[i - 1] || 0 }} shift{{ shiftsPerWeek[i - 1] === 1 ? '' : 's' }}</span>
        </button>
      </div>
      <div class="week-tab-actions">
        <div class="multi-week-menu-wrap">
          <button
            class="week-action-btn"
            :class="{ active: multiWeekMenuOpen }"
            :disabled="shiftsForWeek(activeWeek).length === 0"
            :title="shiftsForWeek(activeWeek).length === 0 ? 'Add some shifts to this week first' : 'Copy this week to other weeks'"
            @click.stop="multiWeekMenuOpen = !multiWeekMenuOpen"
          >
            Copy Week {{ activeWeek + 1 }} to…
          </button>
          <div v-if="multiWeekMenuOpen" class="multi-week-menu" @click.stop>
            <div class="multi-week-menu-label">Pick target weeks:</div>
            <div class="multi-week-menu-days">
              <label
                v-for="i in durationWeeks"
                :key="i - 1"
                v-show="i - 1 !== activeWeek"
                class="multi-week-check"
              >
                <input
                  type="checkbox"
                  :checked="copyWeekTargets.has(i - 1)"
                  @change="toggleCopyWeekTarget(i - 1)"
                />
                Week {{ i }}
              </label>
            </div>
            <div class="multi-week-menu-sep"></div>
            <button class="multi-week-menu-opt" @click="selectRemainingWeeks">Fill remaining weeks</button>
            <button class="multi-week-menu-opt" @click="selectAllOtherWeeks">All other weeks</button>
            <div class="multi-week-menu-sep"></div>
            <div class="multi-week-menu-foot">
              <button class="cancel-btn-sm" @click="cancelCopyWeek">Cancel</button>
              <button
                class="confirm-btn-sm"
                :disabled="copyWeekTargets.size === 0 || copyingWeek"
                @click="confirmCopyWeek"
              >
                {{ copyingWeek ? 'Copying…' : `Copy → ${copyWeekTargets.size} week${copyWeekTargets.size === 1 ? '' : 's'}` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Main body: hours sidebar + calendar + right panel ── -->
    <div v-if="!isPhone" class="editor-body">

      <!-- ── Left Sidebar: Hours of Operation + Employees ── -->
      <aside class="hours-sidebar">
        <div class="hours-sidebar-head">
          <span class="hours-sidebar-title">Hours of Operation</span>
          <span class="hours-sidebar-sub">Visual overlay only</span>
        </div>
        <div v-if="hoursOptions.length === 0" class="hours-sidebar-empty">
          No hours of operation set up for this department.
        </div>
        <div v-else class="hours-sidebar-list">
          <button
            v-for="opt in hoursOptions"
            :key="opt.key"
            class="hours-opt"
            :class="{ active: selectedHoursKey === opt.key }"
            @click="selectHoursOption(opt.key)"
          >
            <div class="hours-opt-row">
              <span class="hours-opt-name">{{ opt.label }}</span>
              <span v-if="opt.key === activeSeason" class="hours-opt-badge">Active</span>
            </div>
            <span class="hours-opt-meta">{{ opt.entries.length }} day{{ opt.entries.length !== 1 ? 's' : '' }}</span>
          </button>
        </div>
        <div v-if="selectedHoursKey" class="hours-sidebar-legend">
          <div class="legend-row"><span class="legend-swatch open"></span>Open</div>
          <div class="legend-row"><span class="legend-swatch close"></span>Close</div>
        </div>

        <!-- ── Employees: click to preview their unavailability on the grid ── -->
        <div class="emp-preview-section">
          <div class="hours-sidebar-head">
            <span class="hours-sidebar-title">Employees</span>
            <span class="hours-sidebar-sub">Click to preview availability</span>
          </div>
          <div class="emp-preview-search-wrap">
            <input
              v-model="empPreviewSearch"
              class="emp-preview-search"
              placeholder="Search employees…"
            />
          </div>
          <div v-if="filteredPreviewEmployees.length === 0" class="hours-sidebar-empty">
            {{ empPreviewSearch ? 'No matches.' : 'No employees in this department.' }}
          </div>
          <div v-else class="emp-preview-list">
            <button
              v-for="emp in filteredPreviewEmployees"
              :key="emp.id_employee"
              class="emp-preview-opt"
              :class="{ active: previewEmployeeId === emp.id_employee }"
              @click="togglePreviewEmployee(emp.id_employee)"
            >
              <span class="emp-preview-avatar" :style="{ background: empColor(emp.id_employee) }">
                {{ (emp.fName?.[0] || '') + (emp.lName?.[0] || '') }}
              </span>
              <span class="emp-preview-name">{{ emp.fName }} {{ emp.lName }}</span>
              <span
                v-if="unavailabilityCountForEmployee(emp.id_employee) > 0"
                class="emp-preview-count"
                :title="`${unavailabilityCountForEmployee(emp.id_employee)} unavailability block${unavailabilityCountForEmployee(emp.id_employee) === 1 ? '' : 's'}`"
              >
                {{ unavailabilityCountForEmployee(emp.id_employee) }}
              </span>
            </button>
          </div>
          <div v-if="previewEmployeeId" class="emp-preview-footer">
            <button class="emp-preview-clear" @click="previewEmployeeId = null">Clear preview</button>
          </div>
        </div>
      </aside>

      <!-- ── Calendar Grid ── -->
      <div class="cal-grid-wrapper">
        <div class="cal-body" ref="calBody">
          <div class="cal-header-row">
            <div class="time-gutter"></div>
            <div v-for="(day, i) in DAY_NAMES" :key="i" class="day-header"
              :class="{ 'paste-target-header': isPasteMode }"
              @click="isPasteMode ? pasteToDay(i) : null">
              <span class="day-letter">{{ day }}</span>
              <button
                v-if="!isPasteMode && shiftsForDay(i).length > 0"
                class="day-copy-btn"
                :class="{ 'day-copy-btn--open': copyMenuOpen === i }"
                title="Copy this day's shifts…"
                @click.stop="copyMenuOpen = copyMenuOpen === i ? null : i">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="4" y="4" width="9" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M3 11V3a1 1 0 0 1 1-1h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
              <div v-if="copyMenuOpen === i" class="day-copy-menu" @click.stop>
                <div class="day-copy-menu-label">Copy {{ day }}'s shifts to…</div>
                <button class="day-copy-menu-opt" @click="copyDayToWeekdays(i)">Weekdays (Mon–Fri)</button>
                <button class="day-copy-menu-opt" @click="copyDayToEveryday(i)">Every day</button>
                <div class="day-copy-menu-sep"></div>
                <div class="day-copy-menu-label">Or pick a single day:</div>
                <div class="day-copy-menu-days">
                  <button v-for="(d, di) in DAY_NAMES" :key="di"
                    v-show="di !== i"
                    class="day-copy-menu-day"
                    @click="copyDayToDay(i, di)">{{ d }}</button>
                </div>
              </div>
            </div>
          </div>
          <div class="cal-inner">
            <div class="time-column">
              <div class="coverage-strip" :title="`Peak staffing: ${coverageMax} concurrent shifts`">
                <div v-for="(count, i) in coverageByHour" :key="i"
                  class="coverage-seg"
                  :style="{
                    top: (i * CELL_HEIGHT) + 'px',
                    height: CELL_HEIGHT + 'px',
                    opacity: count / coverageMax,
                  }"
                ></div>
              </div>
              <div v-for="h in hours" :key="h" class="time-slot-label">{{ formatHour(h) }}</div>
            </div>
            <div
              v-for="(day, colIdx) in DAY_NAMES"
              :key="colIdx"
              class="day-column"
              :class="{ 'is-dragging-col': drag.active && drag.dayIndex === colIdx, 'paste-target': isPasteMode }"
              @mousedown.prevent="isPasteMode ? null : onColumnMouseDown($event, colIdx)"
              @click="isPasteMode ? pasteToDay(colIdx) : null"
            >
              <div v-for="h in hours" :key="h" class="hour-cell"></div>

              <!-- Hours of operation overlay lines (visual only) -->
              <template v-for="entry in hoursLinesForDayIdx(colIdx)" :key="entry.key">
                <div class="hours-op-line open" :style="{ top: entry.openPx + 'px' }">
                  <span class="hours-line-label">Open {{ entry.openLabel }}</span>
                </div>
                <div class="hours-op-line close" :style="{ top: entry.closePx + 'px' }">
                  <span class="hours-line-label">Close {{ entry.closeLabel }}</span>
                </div>
              </template>

              <!-- Employee unavailability overlay (only when previewing) -->
              <div
                v-for="u in previewUnavailabilityForDay(colIdx)"
                :key="'u' + u.id_employeeUnavailability"
                class="tpl-unavail-overlay"
                :style="unavailabilityBlockStyle(u)"
                :title="unavailabilityTitle(u)"
              >
                <span class="tpl-unavail-overlay-label">{{ u.label || 'Unavailable' }}</span>
              </div>

              <div v-if="drag.active && drag.dayIndex === colIdx" class="ghost-block" :style="ghostStyle">
                <span class="ghost-label">{{ ghostLabel }}</span>
              </div>

              <div
                v-for="shift in shiftsForDay(colIdx)"
                :key="shift.id_templateShift"
                class="shift-block"
                :data-shift-id="shift.id_templateShift"
                :style="shiftBlockStyle(shift)"
                :class="{
                  'shift-block--selected': selectedShift?.id_templateShift === shift.id_templateShift,
                  'shift-block--multi-selected': selectedShiftIds.has(shift.id_templateShift)
                }"
                @mousedown="onShiftBlockMouseDown($event, colIdx)"
                @click.stop="onShiftBlockClick(shift, $event)"
              >
                <div class="shift-label">
                  {{ shiftEmployeeMap[shift.id_templateShift]?.name || shift.label || positionNameForShift(shift) || 'Shift' }}
                </div>
                <div class="shift-time">{{ fmtHour(shift.startHour) }} – {{ fmtHour(shift.endHour) }}</div>
                <div v-if="shift.id_position" class="shift-pos-badge">{{ positionNameForShift(shift) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- ── Right Panel ── -->
      <div class="shift-panel">

        <!-- Empty state -->
        <div v-if="!selectedShift" class="panel-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="opacity:.2;margin-bottom:12px">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p class="panel-empty-title">No shift selected</p>
          <p class="panel-empty-sub">Click a shift block to configure positions, employees, and task lists</p>
        </div>

        <!-- Shift config -->
        <template v-else>
          <div class="panel-head">
            <div class="panel-shift-meta">
              <span class="panel-day-badge">{{ DAY_NAMES_FULL[selectedShift.dayOfWeek] }}</span>
              <span class="panel-time-display">{{ fmtHour(selectedShift.startHour) }} – {{ fmtHour(selectedShift.endHour) }}</span>
            </div>
            <button class="panel-close-btn" @click="selectedShift = null" title="Close">✕</button>
          </div>

          <div class="panel-body">

            <!-- Label -->
            <div class="panel-field">
              <label class="panel-field-label">Label <span class="optional-tag">(optional)</span></label>
              <input class="panel-input" v-model="panelEdit.label" placeholder="Morning, Opener, Closer…" />
            </div>

            <!-- Position (required) -->
            <div class="panel-field">
              <label class="panel-field-label">Position <span class="req-star">*</span></label>
              <SelectPicker
                :model-value="panelEdit.id_position"
                :options="positions.map(p => ({ value: p.id_position, label: p.name }))"
                placeholder="— Select position —"
                @update:model-value="v => panelEdit.id_position = v"
              />
              <p v-if="!panelEdit.id_position" class="panel-req-note">Required before applying template</p>
            </div>

            <div v-if="panelEdit.saving || panelEdit.saved || panelEdit.error" class="panel-autosave-row">
              <span v-if="panelEdit.saving" class="panel-autosave-note">Saving…</span>
              <span v-else-if="panelEdit.saved" class="panel-saved-flash">Saved ✓</span>
              <span v-if="panelEdit.error" class="panel-error-flash">{{ panelEdit.error }}</span>
            </div>

            <div class="panel-divider"></div>

            <!-- Employees -->
            <div class="panel-section">
              <div class="panel-section-head">
                <span class="panel-section-label">Employees</span>
                <span class="panel-optional-tag">optional</span>
              </div>

              <div v-if="panel.loadingEmployees" class="panel-loading-sm">Loading…</div>
              <template v-else>
                <div v-if="panel.employees.length === 0" class="panel-list-empty">No employees assigned — shifts will be unassigned</div>
                <div v-for="row in panel.employees" :key="row.id_templateShiftEmployee" class="panel-list-row">
                  <div class="panel-avatar" :style="{ background: empColor(row.id_employee) }">{{ empInitials(row) }}</div>
                  <span class="panel-list-name">{{ row.fName }} {{ row.lName }}</span>
                  <button class="panel-remove-btn" @click="removePanelEmployee(row)" title="Remove">✕</button>
                </div>
                <div v-if="panel.employees.length === 0" class="panel-add-row">
                  <EmployeePicker
                    v-model="panel.addEmpId"
                    value-field="id_employee"
                    :options="unassignedEmployees"
                    placeholder="Add employee…" />
                  <button class="panel-add-btn" :disabled="!panel.addEmpId || panel.addingEmp" @click="addPanelEmployee">
                    {{ panel.addingEmp ? '…' : 'Add' }}
                  </button>
                </div>
              </template>
            </div>

            <div class="panel-divider"></div>

            <!-- Task Lists -->
            <div class="panel-section">
              <div class="panel-section-head">
                <span class="panel-section-label">Task Lists</span>
                <span class="panel-optional-tag">optional</span>
              </div>

              <div v-if="panel.loadingTaskLists" class="panel-loading-sm">Loading…</div>
              <template v-else>
                <div v-if="panel.taskLists.length === 0" class="panel-list-empty">No task lists assigned</div>
                <div v-for="row in panel.taskLists" :key="row.id_templateShiftTaskList" class="panel-list-row">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;opacity:.5">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M5 8h6M5 5h6M5 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                  <span class="panel-list-name">{{ row.name }}</span>
                  <button class="panel-remove-btn" @click="removePanelTaskList(row)" title="Remove">✕</button>
                </div>
                <div class="panel-add-row">
                  <div class="panel-add-select-wrap">
                    <SelectPicker
                      :model-value="panel.addTaskListId || null"
                      :options="unassignedTaskLists.map(tl => ({ value: tl.id_taskList, label: tl.name }))"
                      placeholder="Add task list…"
                      empty-text="All task lists attached"
                      @update:model-value="v => panel.addTaskListId = v ?? ''"
                    />
                  </div>
                  <button class="panel-add-btn" :disabled="!panel.addTaskListId || panel.addingTaskList" @click="addPanelTaskList">
                    {{ panel.addingTaskList ? '…' : 'Add' }}
                  </button>
                </div>
              </template>
            </div>

            <div class="panel-divider"></div>

            <!-- Individual Tasks -->
            <div class="panel-section">
              <div class="panel-section-head">
                <span class="panel-section-label">Tasks</span>
                <span class="panel-optional-tag">optional</span>
              </div>
              <div v-if="panel.loadingTasks" class="panel-loading-sm">Loading…</div>
              <template v-else>
                <div v-if="panel.tasks.length === 0" class="panel-list-empty">No individual tasks attached</div>
                <div v-for="row in panel.tasks" :key="row.id_templateShiftTask" class="panel-list-row">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;opacity:.5">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M5.5 8.2l2 2L11 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="panel-list-name">{{ row.name }}</span>
                  <button class="panel-remove-btn" @click="removePanelTask(row)" title="Remove">✕</button>
                </div>
                <div class="panel-add-row">
                  <div class="panel-add-select-wrap">
                    <SelectPicker
                      :model-value="panel.addTaskId || null"
                      :options="unassignedTasks.map(t => ({ value: t.id_task, label: t.name }))"
                      placeholder="Add task…"
                      empty-text="All tasks attached"
                      @update:model-value="v => panel.addTaskId = v ?? ''"
                    />
                  </div>
                  <button class="panel-add-btn" :disabled="!panel.addTaskId || panel.addingTask" @click="addPanelTask">
                    {{ panel.addingTask ? '…' : 'Add' }}
                  </button>
                </div>
              </template>
            </div>

            <div v-if="panel.syncStatus" class="panel-sync-status">
              {{ panel.syncStatus }}
            </div>

          </div>

          <div class="panel-footer">
            <button class="panel-delete-btn" @click="deleteSelectedShift">Delete Shift</button>
          </div>
        </template>
      </div>
    </div>

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
          <button class="sel-btn" @click="copySelected" title="Copy (⌘C / Ctrl+C)">Copy</button>
          <button class="sel-btn" @click="pasteShifts" :disabled="clipboard.length === 0" title="Paste (⌘V / Ctrl+V)">Paste</button>
          <button class="sel-btn sel-btn--delete" @click="deleteSelectedShifts" title="Delete (Del)">Delete</button>
          <button class="sel-btn sel-btn--clear" @click="clearSelection" title="Clear (Esc)">✕</button>
        </template>
      </div>
    </Transition>

    <!-- ── Quick-Create Popover ── -->
    <Transition name="popover-anim">
      <div v-if="quickCreate.visible" class="quick-create-popover" :style="quickCreate.style" @mousedown.stop>
        <div class="qc-header">
          <div class="qc-time-badge">{{ quickCreate.startLabel }} – {{ quickCreate.endLabel }}</div>
          <button class="qc-close" @click="quickCreate.visible = false">✕</button>
        </div>
        <div class="qc-day-label">{{ DAY_NAMES_FULL[quickCreate.dayIndex] }}</div>
        <div class="form-group">
          <label>Position <span class="req-star">*</span></label>
          <select v-model="quickCreate.id_position" @change="onQuickCreatePositionChange">
            <option value="">— Select position —</option>
            <option v-for="pos in positions" :key="pos.id_position" :value="pos.id_position">
              {{ pos.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Label <span class="optional">(optional)</span></label>
          <input
            v-model="quickCreate.label"
            type="text"
            placeholder="e.g. Morning, Opener, Closer…"
            ref="qcLabelInput"
          />
        </div>
        <div class="form-group">
          <label>Employee <span class="optional">(optional)</span></label>
          <EmployeePicker
            v-model="quickCreate.id_employee"
            value-field="id_employee"
            :options="employeesForPosition(quickCreate.id_position, {
              dayIdx: quickCreate.dayIndex,
              startHour: quickCreate.startHour,
              endHour: quickCreate.endHour,
            }).map(e => ({ ...e, name: `${e.fName} ${e.lName}` }))"
            :disabled="!quickCreate.id_position"
            placeholder="— No employee —"
            empty-text="No employees assigned to this position." />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start</label>
            <input type="time" v-model="quickCreate.startTime" />
          </div>
          <div class="form-group">
            <label>End</label>
            <input type="time" v-model="quickCreate.endTime" />
          </div>
        </div>
        <div class="form-group">
          <label>Notes <span class="optional">(optional)</span></label>
          <input v-model="quickCreate.notes" type="text" placeholder="Optional notes…" />
        </div>
        <p v-if="quickCreate.error" class="qc-error">{{ quickCreate.error }}</p>
        <div class="qc-actions">
          <button class="qc-cancel" @click="quickCreate.visible = false">Cancel</button>
          <button class="qc-confirm" :disabled="quickCreate.saving || !quickCreate.id_position" @click="confirmQuickCreate">
            {{ quickCreate.saving ? '…' : '✓ Add Shift' }}
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTheme } from "../composables/useTheme.js";
import { useDepartment } from "../composables/useDepartment.js";
import { useBreakpoint } from "../composables/useBreakpoint.js";
import { usePreferences } from "../composables/usePreferences.js";
import EmployeePicker from "../components/EmployeePicker.vue";
import SelectPicker from "../components/SelectPicker.vue";
import Utils from "../config/utils.js";
import {
  getTemplate,
  updateTemplate,
  fetchTemplateShifts,
  createTemplateShift,
  updateTemplateShift,
  deleteTemplateShift,
  fetchTemplateShiftEmployees,
  addTemplateShiftEmployee,
  removeTemplateShiftEmployee,
  fetchTemplateShiftTaskLists,
  addTemplateShiftTaskList,
  removeTemplateShiftTaskList,
  getTemplateApplicationShifts,
  listTemplateApplications,
} from "../services/templateService.js";
import { getPositions, getEmployees, getCalendarEntries, getSettingValues, getPositionEmployees } from "../services/departmentService.js";
import { fetchTaskLists, fetchTasks, assignTaskListToShift, getShiftTaskLists, removeShiftTaskList, getPositionTaskLists, getTemplateShiftTasks, attachTaskToTemplateShift, removeTemplateShiftTask } from "../services/taskService.js";
import { getUnavailability } from "../services/unavailabilityService.js";
import { getActiveSemester, getSemesters } from "../services/semesterService.js";
import { useUnavailabilityRefresh } from "../composables/useUnavailabilityRefresh.js";
import apiClient from "../services/services.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const CELL_HEIGHT    = 60;
const CAL_START_HOUR = 0;
const SNAP_MINUTES   = 15;
const DAY_NAMES      = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hours          = Array.from({ length: 24 }, (_, i) => i);
const COLORS           = ["#FF1744","#C0392B","#E8724A","#9B6B9B","#4A90A4","#C8973A","#D4756B","#6C8EAD"];
const EMPLOYEE_COLORS  = ["#F0E6D3","#C0392B","#FF1744","#E8724A","#9B6B9B","#4A90A4","#e2d5c3","#D4756B"];

// ── State ─────────────────────────────────────────────────────────────────────
useTheme(); // ensures data-theme is applied on this page
const { selectedDeptId } = useDepartment();
const { isPhone } = useBreakpoint();
const router = useRouter();
const route  = useRoute();
const id     = computed(() => route.params.id);

const loading      = ref(true);
const apiError     = ref("");
const templateName = ref("");
const saveStatus   = ref("");

const templateShifts   = ref([]);
const durationWeeks    = ref(1);      // number of weeks this template spans
const activeWeek       = ref(0);      // 0-indexed — which week is visible in the editor
const multiWeekMenuOpen = ref(false); // "Copy week to…" dropdown state
const copyWeekTargets  = ref(new Set()); // week indices checked in the copy-to picker
const positions        = ref([]);
const allEmployees     = ref([]);
const allTaskLists     = ref([]);
const allTasks         = ref([]);
// Map of id_position → array of id_employee assigned to that position
const positionEmployeeIds = ref({});

// Dept-wide EmployeeUnavailability rows — annotates the template's
// employee dropdown with a ⚠ + reason when the shift time overlaps, and
// drives the manager's "preview employee availability" overlay below.
const deptUnavailability = ref([]);

// Left-sidebar preview state. When non-null, every day column paints a
// hatched overlay for that employee's recurring unavailability for the
// template's semester — lets a manager scan "can Parker cover Tuesday
// afternoons in Fall?" without opening the shift panel.
const previewEmployeeId = ref(null);
const empPreviewSearch  = ref("");
const DAY_NAMES_FULL_UNAVAIL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Compare activeSeason setting ("Fall" or "Fall 2026") to a row's season
// ("Spring 2026"). Matches on semester name + year, year optional on
// either side so "Fall" matches "Fall 2026" but not "Spring 2026".
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

// Returns the employees assigned to the given position. If no position is
// selected, returns no employees (forces position-first). When dayIdx +
// startHour/endHour are provided, each returned row is annotated with a
// `conflict` object (or null) so the dropdown can show a warning.
function employeesForPosition(id_position, opts = {}) {
  if (id_position == null || id_position === "") return [];
  const ids = positionEmployeeIds.value[id_position];
  if (!ids) return [];
  const idSet = new Set(ids);
  const eligible = allEmployees.value.filter(e => idSet.has(e.id_employee));
  const { dayIdx, startHour, endHour } = opts;
  if (dayIdx == null || startHour == null || endHour == null) return eligible;
  return eligible.map(emp => ({
    ...emp,
    conflict: templateConflictFor(emp.id_employee, dayIdx, startHour, endHour),
  }));
}

// Templates are abstract Mon–Sun patterns with no concrete date, so we
// match by dayOfWeek + time only. We still filter to rows that are
// "currently active" (season-scoped rows must match activeSeason; date
// range rows must contain today) so expired entries don't pollute the
// view.
function templateConflictFor(id_employee, dayIdx, startHour, endHour) {
  const dayName = DAY_NAMES_FULL_UNAVAIL[dayIdx];
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const targetId = Number(id_employee);
  for (const row of deptUnavailability.value) {
    // Coerce both sides — Sequelize can return integer FKs as strings
    // depending on driver config.
    if (Number(row.id_employee) !== targetId) continue;
    if (row.dayOfWeek !== dayName) continue;
    if (row.scopeType === "season") {
      // Prefer FK-based match when the row has an id_semester set — it's
      // authoritative. Fall back to string comparison for legacy rows
      // created before the FK existed.
      if (row.id_semester != null) {
        const targetId = templateSemester.value?.id_semester;
        if (!targetId || Number(row.id_semester) !== Number(targetId)) continue;
      } else {
        const targetSeason = templateSemester.value?.name || activeSemester.value;
        if (!seasonsMatch(targetSeason, row.season)) continue;
      }
    } else if (row.scopeType === "dateRange") {
      if (!row.startDate || !row.endDate) continue;
      if (todayKey < row.startDate || todayKey > row.endDate) continue;
    }
    const rowStart = parseTime(row.startTime);
    const rowEnd   = parseTime(row.endTime);
    if (startHour < rowEnd && rowStart < endHour) return row;
  }
  return null;
}
function parseTime(t) { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h + m / 60; }

// ── Employee unavailability preview ───────────────────────────────────────────
// Mirrors templateConflictFor's filtering rules so the overlay shows the
// exact set of rows the backend will enforce at apply time. Takes a day
// index (0=Sun..6=Sat) and returns rows for the currently-previewed
// employee on that day.
function previewUnavailabilityForDay(dayIdx) {
  const empId = previewEmployeeId.value;
  if (!empId) return [];
  const dayName = DAY_NAMES_FULL_UNAVAIL[dayIdx];
  const target = Number(empId);
  const out = [];
  for (const row of deptUnavailability.value) {
    if (Number(row.id_employee) !== target) continue;
    if (row.dayOfWeek !== dayName) continue;
    if (!row.startTime || !row.endTime) continue;
    if (row.scopeType === "season") {
      if (row.id_semester != null) {
        const tId = templateSemester.value?.id_semester;
        if (!tId || Number(row.id_semester) !== Number(tId)) continue;
      } else {
        const targetSeason = templateSemester.value?.name || activeSemester.value;
        if (!seasonsMatch(targetSeason, row.season)) continue;
      }
    } else if (row.scopeType === "dateRange") {
      // Templates are abstract — no concrete date — so date-range rows
      // only make sense to preview if the template is bound to a
      // semester whose window overlaps. Otherwise skip.
      const sem = templateSemester.value;
      if (!sem?.startDate || !sem?.endDate || !row.startDate || !row.endDate) continue;
      if (row.endDate < sem.startDate || row.startDate > sem.endDate) continue;
    }
    out.push(row);
  }
  return out;
}

// Total count for the current template's semester — shown as a chip on
// each employee in the preview list so managers can see at a glance who
// has conflicts without clicking.
function unavailabilityCountForEmployee(id_employee) {
  let count = 0;
  for (let d = 0; d < 7; d++) {
    // Temporarily look up "as if" this employee were previewed. Avoid
    // reusing the helper to keep its signature simple.
    const dayName = DAY_NAMES_FULL_UNAVAIL[d];
    for (const row of deptUnavailability.value) {
      if (Number(row.id_employee) !== Number(id_employee)) continue;
      if (row.dayOfWeek !== dayName) continue;
      if (!row.startTime || !row.endTime) continue;
      if (row.scopeType === "season") {
        if (row.id_semester != null) {
          const tId = templateSemester.value?.id_semester;
          if (!tId || Number(row.id_semester) !== Number(tId)) continue;
        } else {
          const targetSeason = templateSemester.value?.name || activeSemester.value;
          if (!seasonsMatch(targetSeason, row.season)) continue;
        }
      } else if (row.scopeType === "dateRange") {
        const sem = templateSemester.value;
        if (!sem?.startDate || !sem?.endDate || !row.startDate || !row.endDate) continue;
        if (row.endDate < sem.startDate || row.startDate > sem.endDate) continue;
      }
      count += 1;
    }
  }
  return count;
}

function togglePreviewEmployee(id_employee) {
  previewEmployeeId.value = previewEmployeeId.value === id_employee ? null : id_employee;
}

const filteredPreviewEmployees = computed(() => {
  const q = empPreviewSearch.value.trim().toLowerCase();
  const list = allEmployees.value || [];
  if (!q) return list;
  return list.filter(e => {
    const name = `${e.fName || ""} ${e.lName || ""}`.toLowerCase();
    return name.includes(q);
  });
});

function unavailabilityBlockStyle(row) {
  const startH = parseTime(row.startTime);
  const endH   = parseTime(row.endTime);
  const top    = Math.max(0, (startH - CAL_START_HOUR) * CELL_HEIGHT);
  const height = Math.max(18, (endH - startH) * CELL_HEIGHT);
  return { top: top + "px", height: height + "px" };
}

function unavailabilityTitle(row) {
  const label = row.label || "Unavailable";
  const s = typeof row.startTime === "string" ? row.startTime.slice(0, 5) : "";
  const e = typeof row.endTime   === "string" ? row.endTime.slice(0, 5)   : "";
  return s && e ? `${label} — ${s}–${e}` : label;
}

// ── Hours of Operation (visual overlay only — does not modify real HOO) ───────
const calendarHours      = ref([]); // raw rows from /calendar
const activeSeason       = ref("");  // currently saved active season for the dept (legacy — used for hours-of-operation variants)
const activeSemester     = ref("");  // Fallback — today's active semester, used only when the template has no id_semester linked
const templateSemester   = ref(null); // The semester this template is scoped to (if any) — drives unavailability filtering so, e.g., a Fall template only warns about Fall-scoped blocks
const selectedHoursKey   = ref(null); // key of the season the user is currently viewing
const HOURS_NONE_KEY     = "__none__";

// Group entries by season → [{ key, label, entries }]
const hoursOptions = computed(() => {
  const groups = new Map();
  for (const e of calendarHours.value) {
    const key = e.season || HOURS_NONE_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const list = [];
  for (const [key, entries] of groups.entries()) {
    list.push({
      key,
      label: key === HOURS_NONE_KEY ? "Default" : key,
      entries,
    });
  }
  // Sort: active season first, then alpha
  list.sort((a, b) => {
    if (a.key === activeSeason.value) return -1;
    if (b.key === activeSeason.value) return 1;
    return a.label.localeCompare(b.label);
  });
  return list;
});

const selectedHoursEntries = computed(() => {
  const opt = hoursOptions.value.find(o => o.key === selectedHoursKey.value);
  return opt ? opt.entries : [];
});

function parseTimeToHour(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

function hoursLinesForDayIdx(dayIdx) {
  const dayName = DAY_NAMES_FULL[dayIdx];
  return selectedHoursEntries.value
    .filter(e => e.dayOfWeek === dayName)
    .map(e => {
      const openH  = parseTimeToHour(e.startTime);
      const closeH = parseTimeToHour(e.endTime);
      return {
        key:        e.id_hours_of_operation || `${e.dayOfWeek}-${e.startTime}-${e.endTime}`,
        openPx:     (openH  - CAL_START_HOUR) * CELL_HEIGHT,
        closePx:    (closeH - CAL_START_HOUR) * CELL_HEIGHT,
        openLabel:  fmtHour(openH),
        closeLabel: fmtHour(closeH),
      };
    });
}

function selectHoursOption(key) {
  selectedHoursKey.value = key;
}
// Maps id_templateShift → first assigned employee obj (for block color/label)
const shiftEmployeeMap = ref({});
const calBody        = ref(null);
const qcLabelInput   = ref(null);

// ── Multi-select state ─────────────────────────────────────────────────────────
const selectedShiftIds = ref(new Set()); // Set of id_templateShift (numbers)
const rubberBand       = ref({ active: false, startX: 0, startY: 0, x: 0, y: 0 });
const clipboard        = ref([]); // [{ dayOfWeek, startHour, endHour, label, id_position, id_employee }]
const isPasteMode      = ref(false);
const undoStack        = ref([]); // max 20; { type: 'create'|'delete'|'update', ... }

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
        await deleteTemplateShift(s.id_templateShift);
        templateShifts.value = templateShifts.value.filter(ts => ts.id_templateShift !== s.id_templateShift);
        delete shiftEmployeeMap.value[s.id_templateShift];
      } catch (err) { console.error("Undo create failed:", err); }
    }
  } else if (action.type === 'delete') {
    for (const s of action.shifts) {
      try {
        const created = await createTemplateShift({
          id_template: id.value,
          dayOfWeek:   s.dayOfWeek,
          weekOffset:  s.weekOffset || 0,
          startHour:   s.startHour,
          endHour:     s.endHour,
          label:       s.label || "",
          id_position: s.id_position,
          notes:       s.notes || "",
        });
        templateShifts.value.push(created);
        if (s.id_employee) {
          try {
            await addTemplateShiftEmployee({ id_templateShift: created.id_templateShift, id_employee: s.id_employee });
            const emp = allEmployees.value.find(e => e.id_employee === s.id_employee);
            if (emp) shiftEmployeeMap.value[created.id_templateShift] = emp;
          } catch { /* non-critical */ }
        }
      } catch (err) { console.error("Undo delete failed:", err); }
    }
  } else if (action.type === 'update') {
    const before = action.before;
    try {
      await updateTemplateShift(before.id_templateShift, {
        label:       before.label,
        id_position: before.id_position,
        dayOfWeek:   before.dayOfWeek,
        weekOffset:  before.weekOffset || 0,
        startHour:   before.startHour,
        endHour:     before.endHour,
        notes:       before.notes || "",
      });
      const idx = templateShifts.value.findIndex(s => s.id_templateShift === before.id_templateShift);
      if (idx !== -1) templateShifts.value[idx] = { ...templateShifts.value[idx], ...before };
      if (selectedShift.value?.id_templateShift === before.id_templateShift) {
        selectedShift.value = templateShifts.value[idx];
      }
    } catch (err) { console.error("Undo update failed:", err); }
  }
}

// ── Drag ──────────────────────────────────────────────────────────────────────
const drag = ref({ active: false, dayIndex: 0, startHour: 0, currentHour: 0, colEl: null });
const cmdHeld = ref(false);
let dragStartedFromShiftBlock = false;

const quickCreate = ref({
  visible: false, dayIndex: 0, startHour: 0, endHour: 0,
  startLabel: "", endLabel: "", startTime: "", endTime: "",
  label: "", id_position: "", id_employee: "", notes: "", saving: false, error: "", style: {},
});

// ── Selected shift + panel ────────────────────────────────────────────────────
const selectedShift = ref(null);

const panel = ref({
  loadingEmployees: false,
  loadingTaskLists: false,
  loadingTasks:     false,
  employees:        [],   // { id_templateShiftEmployee, id_employee, fName, lName }
  taskLists:        [],   // { id_templateShiftTaskList, id_taskList, name }
  tasks:            [],   // { id_templateShiftTask, id_task, name }
  addEmpId:         "",
  addTaskListId:    "",
  addTaskId:        "",
  addingEmp:        false,
  addingTaskList:   false,
  addingTask:       false,
  syncStatus:       "",
});

const panelEdit = ref({
  label:       "",
  id_position: "",
  saving:      false,
  saved:       false,
  error:       "",
});

// ── Computed ──────────────────────────────────────────────────────────────────
const unassignedEmployees = computed(() => {
  const assigned = new Set(panel.value.employees.map(e => e.id_employee));
  // Restrict to employees assigned to the shift's position. If no position
  // is set on the panel yet, no employees are eligible. Passes the
  // selected shift's day/time so each row gets a `conflict` annotation.
  const sh = selectedShift.value;
  const eligible = employeesForPosition(panelEdit.value.id_position, sh ? {
    dayIdx:    sh.dayOfWeek,
    startHour: sh.startHour,
    endHour:   sh.endHour,
  } : {});
  // Synthesize `name` so the shared EmployeePicker (which expects a
  // `name` field) can render these without extra mapping at call sites.
  return eligible
    .filter(e => !assigned.has(e.id_employee))
    .map(e => ({ ...e, name: `${e.fName} ${e.lName}` }));
});

const unassignedTaskLists = computed(() => {
  const assigned = new Set(panel.value.taskLists.map(t => t.id_taskList));
  return allTaskLists.value.filter(t => !assigned.has(t.id_taskList));
});

const unassignedTasks = computed(() => {
  const assigned = new Set(panel.value.tasks.map(t => t.id_task));
  return allTasks.value.filter(t => !assigned.has(t.id_task));
});

const ghostStyle = computed(() => {
  if (!drag.value.active) return {};
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return {
    position: "absolute",
    top:    `${(s - CAL_START_HOUR) * CELL_HEIGHT}px`,
    height: `${Math.max((e - s) * CELL_HEIGHT - 2, 20)}px`,
    left: "3px", right: "3px", zIndex: 10,
  };
});

const ghostLabel = computed(() => {
  if (!drag.value.active) return "";
  const s = Math.min(drag.value.startHour, drag.value.currentHour);
  const e = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  return `${fmtHour(s)} – ${fmtHour(e)}`;
});

// ── Load ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  loading.value  = true;
  apiError.value = "";
  try {
    const currentUser   = Utils.getStore("user");
    const id_department = selectedDeptId.value || currentUser?.id_department || null;

    const [tpl, shifts, emps, tls, tks] = await Promise.all([
      getTemplate(id.value),
      fetchTemplateShifts(id.value),
      getEmployees(id_department).catch(() => ({ data: [] })),
      fetchTaskLists(id_department).catch(() => []),
      fetchTasks(id_department).catch(() => []),
    ]);

    templateName.value = tpl.name;
    durationWeeks.value = Math.max(1, Number(tpl.durationWeeks) || 1);
    activeWeek.value = Math.min(activeWeek.value, durationWeeks.value - 1);
    templateShifts.value = shifts;
    allTaskLists.value   = Array.isArray(tls) ? tls : (tls.data || []);
    allTasks.value       = Array.isArray(tks) ? tks : (tks.data || []);

    // Assign palette colors to employees (consistent with Dashboard)
    const empList = emps.data || emps || [];
    empList.forEach((e, i) => {
      e.color = e.color || EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length];
      e.name  = `${e.fName} ${e.lName}`;
    });
    allEmployees.value = empList;

    // Pre-load all template-shift-employee rows to show colors/names on blocks
    if (shifts.length > 0) {
      try {
        const { data: allShiftEmps } = await apiClient.get("/template-shift-employees");
        const shiftIds = new Set(shifts.map(s => s.id_templateShift));
        const empMap = {};
        for (const row of allShiftEmps) {
          if (!shiftIds.has(row.id_templateShift)) continue;
          if (!empMap[row.id_templateShift]) {
            const emp = empList.find(e => e.id_employee === row.id_employee);
            if (emp) empMap[row.id_templateShift] = emp;
          }
        }
        shiftEmployeeMap.value = empMap;
      } catch { /* non-critical */ }
    }

    if (id_department) {
      const posRes = await getPositions(id_department).catch(() => ({ data: [] }));
      positions.value = posRes.data || [];

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

      // Load hours of operation + active-season setting (visual overlay only)
      getCalendarEntries(id_department).then(r => {
        calendarHours.value = r.data || [];
        // Default selection: the currently active season, or first available group
        const opts = hoursOptions.value;
        const match = opts.find(o => o.key === activeSeason.value);
        selectedHoursKey.value = match ? match.key : (opts[0]?.key ?? null);
      }).catch(() => {});

      getSettingValues(id_department).then(r => {
        const sv = (r.data || []).find(v => v.name === "Active Season" || v.key === "active_season");
        activeSeason.value = sv?.value || "";
        // Re-resolve default once we know the active season (in case calendar loaded first)
        if (!selectedHoursKey.value || hoursOptions.value.find(o => o.key === activeSeason.value)) {
          const match = hoursOptions.value.find(o => o.key === activeSeason.value);
          if (match) selectedHoursKey.value = match.key;
        }
      }).catch(() => {});

      // Load unavailability for everyone in this dept — drives the same
      // conflict ⚠ annotation shown in Dashboard's employee dropdowns.
      getUnavailability({ id_department }).then(r => {
        deptUnavailability.value = r.data || [];
      }).catch(() => { deptUnavailability.value = []; });

      // Active Semester for class-schedule matching — distinct from the
      // `activeSeason` setting above which drives hours-of-operation.
      getActiveSemester(id_department)
        .then(r => { activeSemester.value = r.data?.name || ""; })
        .catch(() => { activeSemester.value = ""; });

      // If this template is linked to a specific semester, resolve it so
      // conflict checks filter season-scoped unavailability against *that*
      // semester (not today's).
      if (tpl.id_semester) {
        getSemesters(id_department)
          .then(r => {
            const list = r.data || [];
            templateSemester.value = list.find(s => s.id_semester === tpl.id_semester) || null;
          })
          .catch(() => { templateSemester.value = null; });
      } else {
        templateSemester.value = null;
      }
    }
  } catch (err) {
    apiError.value = "Could not load template: " + (err.message || "Network error");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadAll();
  loadTemplateApplications();
  if (calBody.value) calBody.value.scrollTop = 7 * CELL_HEIGHT;
});

// Re-fetch dept unavailability when any sync completes so the employee
// dropdown's ⚠ annotations update without a browser refresh.
const { lastSyncTimestamp: __unavailSyncTs } = useUnavailabilityRefresh();
watch(__unavailSyncTs, () => {
  const id_department = selectedDeptId.value || currentUser?.id_department || null;
  if (!id_department) return;
  getUnavailability({ id_department })
    .then(r => { deptUnavailability.value = r.data || []; })
    .catch(() => {});
});

// ── Save template name ────────────────────────────────────────────────────────
async function saveName() {
  if (!templateName.value.trim()) return;
  saveStatus.value = "Saving…";
  try {
    await updateTemplate(id.value, { name: templateName.value.trim() });
    saveStatus.value = "Saved";
    setTimeout(() => { saveStatus.value = ""; }, 2000);
  } catch {
    saveStatus.value = "Error saving";
  }
}

// ── Select shift → load panel data ───────────────────────────────────────────
async function selectShift(shift) {
  selectedShift.value = shift;
  panelEdit.value = {
    label:       shift.label       || "",
    id_position: shift.id_position ?? "",
    saving: false, saved: false, error: "",
  };
  panel.value = {
    ...panel.value,
    loadingEmployees: true,
    loadingTaskLists: true,
    loadingTasks:     true,
    employees:        [],
    taskLists:        [],
    tasks:            [],
    addEmpId:         "",
    addTaskListId:    "",
    addTaskId:        "",
    addingEmp:        false,
    addingTaskList:   false,
    addingTask:       false,
    syncStatus:       "",
  };

  try {
    const [rawEmps, rawTls, rawTks] = await Promise.all([
      fetchTemplateShiftEmployees(shift.id_templateShift).catch(() => []),
      fetchTemplateShiftTaskLists(shift.id_templateShift).catch(() => []),
      getTemplateShiftTasks(shift.id_templateShift).catch(() => []),
    ]);

    panel.value.employees = rawEmps.map(row => {
      const emp = allEmployees.value.find(e => e.id_employee === row.id_employee);
      return { ...row, fName: emp?.fName || "", lName: emp?.lName || "" };
    });
    panel.value.taskLists = rawTls.map(row => {
      const tl = allTaskLists.value.find(t => t.id_taskList === row.id_taskList);
      return { ...row, name: tl?.name || `Task List #${row.id_taskList}` };
    });
    panel.value.tasks = rawTks.map(row => {
      const t = allTasks.value.find(x => x.id_task === row.id_task);
      return { ...row, name: t?.name || `Task #${row.id_task}` };
    });
  } finally {
    panel.value.loadingEmployees = false;
    panel.value.loadingTaskLists = false;
    panel.value.loadingTasks     = false;
  }
}

// Clear the quick-create employee selection if the new position no
// longer includes them.
function onQuickCreatePositionChange() {
  const allowed = employeesForPosition(quickCreate.value.id_position);
  if (!allowed.some(e => e.id_employee === quickCreate.value.id_employee)) {
    quickCreate.value.id_employee = "";
  }
}

// ── Save panel basic (label + position) ──────────────────────────────────────
async function savePanelBasic() {
  if (!panelEdit.value.id_position) {
    panelEdit.value.error = "Position is required.";
    return;
  }
  panelEdit.value.saving = true;
  panelEdit.value.error  = "";
  panelEdit.value.saved  = false;
  const oldPosition = selectedShift.value.id_position;
  const newPosition = Number(panelEdit.value.id_position);
  pushUndo({ type: 'update', before: { ...selectedShift.value } });
  try {
    const payload = {
      label:       panelEdit.value.label,
      id_position: newPosition,
      dayOfWeek:   selectedShift.value.dayOfWeek,
      startHour:   selectedShift.value.startHour,
      endHour:     selectedShift.value.endHour,
      notes:       selectedShift.value.notes || "",
    };
    await updateTemplateShift(selectedShift.value.id_templateShift, payload);
    const idx = templateShifts.value.findIndex(s => s.id_templateShift === selectedShift.value.id_templateShift);
    if (idx !== -1) {
      templateShifts.value[idx] = { ...templateShifts.value[idx], ...payload };
      selectedShift.value = templateShifts.value[idx];
    }
    if (oldPosition !== newPosition) {
      await autoSyncPositionTaskListsOnPanel(oldPosition, newPosition);
    }
    panelEdit.value.saved = true;
    setTimeout(() => { panelEdit.value.saved = false; }, 2000);
  } catch (err) {
    undoStack.value.pop();
    panelEdit.value.error = err.response?.data?.message || err.message || "Save failed.";
    setTimeout(() => { panelEdit.value.error = ""; }, 4000);
  } finally {
    panelEdit.value.saving = false;
  }
}

// Auto-save when Position changes on the panel (no Save button). Skips the
// tick when the panel is first populated (values match the selected shift)
// and when the selection is cleared.
watch(() => panelEdit.value.id_position, (next) => {
  if (!selectedShift.value) return;
  if (!next) return;
  if (Number(next) === selectedShift.value.id_position) return;
  savePanelBasic();
});

// Label changes are debounced — text typing shouldn't fire a request on
// every keystroke.
let _labelSaveTimer = null;
watch(() => panelEdit.value.label, (next) => {
  if (!selectedShift.value) return;
  if ((next || "") === (selectedShift.value.label || "")) return;
  if (_labelSaveTimer) clearTimeout(_labelSaveTimer);
  _labelSaveTimer = setTimeout(() => {
    if (!selectedShift.value) return;
    savePanelBasic();
  }, 600);
});

// When the panel's position changes, sync the attached task lists to match
// the new position: remove task lists that were linked only to the old
// position, add task lists linked to the new position that aren't already
// attached. Manual attachments (not linked to either position) are preserved.
async function autoSyncPositionTaskListsOnPanel(oldPosition, newPosition) {
  if (!selectedShift.value) return;
  const id_templateShift = selectedShift.value.id_templateShift;
  let oldLinked = new Set();
  let newLinked = [];
  try {
    if (oldPosition) {
      const links = await getPositionTaskLists(oldPosition);
      oldLinked = new Set(links.map(l => l.id_taskList));
    }
    newLinked = await getPositionTaskLists(newPosition);
  } catch (_) { return; }
  const newLinkedIds = new Set(newLinked.map(l => l.id_taskList));

  // Remove: rows currently attached that came from old position only.
  const toRemove = panel.value.taskLists.filter(row =>
    oldLinked.has(row.id_taskList) && !newLinkedIds.has(row.id_taskList)
  );
  for (const row of toRemove) {
    try {
      await removeTemplateShiftTaskList(row.id_templateShiftTaskList);
      panel.value.taskLists = panel.value.taskLists.filter(
        t => t.id_templateShiftTaskList !== row.id_templateShiftTaskList
      );
      await syncRemoveTaskList(id_templateShift, row.id_taskList);
    } catch (_) { /* skip failed */ }
  }
  // Add: task lists linked to the new position that aren't already attached.
  const attachedIds = new Set(panel.value.taskLists.map(r => r.id_taskList));
  for (const link of newLinked) {
    if (attachedIds.has(link.id_taskList)) continue;
    try {
      const row = await addTemplateShiftTaskList({
        id_templateShift,
        id_taskList: link.id_taskList,
      });
      const tl = allTaskLists.value.find(t => t.id_taskList === link.id_taskList);
      panel.value.taskLists.push({ ...row, name: tl?.name || `Task List #${link.id_taskList}` });
      await syncAddTaskList(id_templateShift, link.id_taskList);
    } catch (_) { /* skip duplicates */ }
  }
}

// ── Keep shiftEmployeeMap in sync with panel changes ─────────────────────────
function refreshShiftBlockEmployee(id_templateShift) {
  const first = panel.value.employees[0];
  if (first) {
    const emp = allEmployees.value.find(e => e.id_employee === first.id_employee);
    shiftEmployeeMap.value[id_templateShift] = emp || null;
  } else {
    shiftEmployeeMap.value[id_templateShift] = null;
  }
}

// ── Add / remove employee ─────────────────────────────────────────────────────
async function addPanelEmployee() {
  const id_employee = Number(panel.value.addEmpId);
  if (!id_employee) return;
  panel.value.addingEmp = true;
  try {
    const row = await addTemplateShiftEmployee({
      id_templateShift: selectedShift.value.id_templateShift,
      id_employee,
    });
    const emp = allEmployees.value.find(e => e.id_employee === id_employee);
    panel.value.employees.push({ ...row, fName: emp?.fName || "", lName: emp?.lName || "" });
    panel.value.addEmpId = "";
    refreshShiftBlockEmployee(selectedShift.value.id_templateShift);
    await syncAddEmployee(selectedShift.value.id_templateShift, id_employee);
  } catch (err) {
    console.error("Add employee failed:", err);
  } finally {
    panel.value.addingEmp = false;
  }
}

async function removePanelEmployee(row) {
  try {
    await removeTemplateShiftEmployee(row.id_templateShiftEmployee);
    panel.value.employees = panel.value.employees.filter(
      e => e.id_templateShiftEmployee !== row.id_templateShiftEmployee
    );
    refreshShiftBlockEmployee(selectedShift.value.id_templateShift);
    await syncRemoveEmployee(selectedShift.value.id_templateShift, row.id_employee);
  } catch (err) {
    console.error("Remove employee failed:", err);
  }
}

// ── Add / remove task list ────────────────────────────────────────────────────
async function addPanelTaskList() {
  const id_taskList = Number(panel.value.addTaskListId);
  if (!id_taskList) return;
  panel.value.addingTaskList = true;
  try {
    const row = await addTemplateShiftTaskList({
      id_templateShift: selectedShift.value.id_templateShift,
      id_taskList,
    });
    const tl = allTaskLists.value.find(t => t.id_taskList === id_taskList);
    panel.value.taskLists.push({ ...row, name: tl?.name || `Task List #${id_taskList}` });
    panel.value.addTaskListId = "";
    await syncAddTaskList(selectedShift.value.id_templateShift, id_taskList);
  } catch (err) {
    console.error("Add task list failed:", err);
  } finally {
    panel.value.addingTaskList = false;
  }
}

async function removePanelTaskList(row) {
  try {
    await removeTemplateShiftTaskList(row.id_templateShiftTaskList);
    panel.value.taskLists = panel.value.taskLists.filter(
      t => t.id_templateShiftTaskList !== row.id_templateShiftTaskList
    );
    await syncRemoveTaskList(selectedShift.value.id_templateShift, row.id_taskList);
  } catch (err) {
    console.error("Remove task list failed:", err);
  }
}

async function addPanelTask() {
  const id_task = Number(panel.value.addTaskId);
  if (!id_task) return;
  panel.value.addingTask = true;
  try {
    const row = await attachTaskToTemplateShift(selectedShift.value.id_templateShift, id_task);
    const t = allTasks.value.find(x => x.id_task === id_task);
    panel.value.tasks.push({ ...row, name: t?.name || `Task #${id_task}` });
    panel.value.addTaskId = "";
  } catch (err) {
    console.error("Add task failed:", err);
  } finally {
    panel.value.addingTask = false;
  }
}

async function removePanelTask(row) {
  try {
    await removeTemplateShiftTask(row.id_templateShiftTask);
    panel.value.tasks = panel.value.tasks.filter(
      t => t.id_templateShiftTask !== row.id_templateShiftTask
    );
  } catch (err) {
    console.error("Remove task failed:", err);
  }
}

// ── Live sync: propagate changes to already-applied shifts ────────────────────
async function syncAddEmployee(id_templateShift, id_employee) {
  try {
    const appShifts = await getTemplateApplicationShifts(id_templateShift);
    if (!appShifts?.length) return;
    panel.value.syncStatus = "Syncing to calendar…";
    for (const as of appShifts) {
      await apiClient.post("/shift-assignments", { id_shift: as.id_shift, id_employee, date: as.date }).catch(() => {});
    }
    panel.value.syncStatus = "Calendar updated ✓";
    setTimeout(() => { panel.value.syncStatus = ""; }, 2500);
  } catch { panel.value.syncStatus = ""; }
}

async function syncRemoveEmployee(id_templateShift, id_employee) {
  try {
    const appShifts = await getTemplateApplicationShifts(id_templateShift);
    if (!appShifts?.length) return;
    panel.value.syncStatus = "Syncing to calendar…";
    const { data: allAssignments } = await apiClient.get("/shift-assignments");
    for (const as of appShifts) {
      const match = allAssignments.find(a => a.id_shift === as.id_shift && a.id_employee === id_employee);
      if (match) await apiClient.delete(`/shift-assignments/${match.id_shiftAssignment}`).catch(() => {});
    }
    panel.value.syncStatus = "Calendar updated ✓";
    setTimeout(() => { panel.value.syncStatus = ""; }, 2500);
  } catch { panel.value.syncStatus = ""; }
}

async function syncAddTaskList(id_templateShift, id_taskList) {
  try {
    const appShifts = await getTemplateApplicationShifts(id_templateShift);
    if (!appShifts?.length) return;
    panel.value.syncStatus = "Syncing to calendar…";
    for (const as of appShifts) {
      await assignTaskListToShift(as.id_shift, id_taskList).catch(() => {});
    }
    panel.value.syncStatus = "Calendar updated ✓";
    setTimeout(() => { panel.value.syncStatus = ""; }, 2500);
  } catch { panel.value.syncStatus = ""; }
}

async function syncRemoveTaskList(id_templateShift, id_taskList) {
  try {
    const appShifts = await getTemplateApplicationShifts(id_templateShift);
    if (!appShifts?.length) return;
    panel.value.syncStatus = "Syncing to calendar…";
    for (const as of appShifts) {
      const stls = await getShiftTaskLists(as.id_shift).catch(() => []);
      const match = stls.find(s => s.id_taskList === id_taskList);
      if (match) await removeShiftTaskList(match.id_shiftTaskList).catch(() => {});
    }
    panel.value.syncStatus = "Calendar updated ✓";
    setTimeout(() => { panel.value.syncStatus = ""; }, 2500);
  } catch { panel.value.syncStatus = ""; }
}

// ── Delete shift ──────────────────────────────────────────────────────────────
async function deleteSelectedShift() {
  if (!selectedShift.value) return;
  const snapshot = { ...selectedShift.value, id_employee: shiftEmployeeMap.value[selectedShift.value.id_templateShift]?.id_employee || null };
  const id_shift = selectedShift.value.id_templateShift;
  selectedShift.value = null;
  pushUndo({ type: 'delete', shifts: [snapshot] });
  try {
    await deleteTemplateShift(id_shift);
    templateShifts.value = templateShifts.value.filter(s => s.id_templateShift !== id_shift);
  } catch (err) {
    undoStack.value.pop();
    apiError.value = err.message || "Delete failed.";
  }
}

// ── Shift helpers ─────────────────────────────────────────────────────────────
function shiftsForDay(dayOfWeek) {
  return templateShifts.value.filter(
    s => s.dayOfWeek === dayOfWeek && (s.weekOffset || 0) === activeWeek.value
  );
}

// Shifts for an arbitrary week index (used by the copy-week action).
function shiftsForWeek(weekIdx) {
  return templateShifts.value.filter(s => (s.weekOffset || 0) === weekIdx);
}

// How many shifts live in each week — drives the "• N shifts" chip on each tab.
const shiftsPerWeek = computed(() => {
  const counts = new Array(durationWeeks.value).fill(0);
  for (const s of templateShifts.value) {
    const w = s.weekOffset || 0;
    if (w < counts.length) counts[w] += 1;
  }
  return counts;
});

// ── Copy-Day menu ────────────────────────────────────────────────────────────
const copyMenuOpen = ref(null); // day index with an open menu, or null
function onCopyMenuDocClick(e) {
  if (copyMenuOpen.value === null && !multiWeekMenuOpen.value) return;
  if (copyMenuOpen.value !== null &&
      !e.target.closest?.(".day-copy-menu") &&
      !e.target.closest?.(".day-copy-btn")) {
    copyMenuOpen.value = null;
  }
  if (multiWeekMenuOpen.value &&
      !e.target.closest?.(".multi-week-menu") &&
      !e.target.closest?.(".week-action-btn")) {
    multiWeekMenuOpen.value = false;
  }
}
onMounted(() => document.addEventListener("click", onCopyMenuDocClick));
onUnmounted(() => document.removeEventListener("click", onCopyMenuDocClick));

// ── Multi-week pagination + copy shortcuts ─────────────────────────────────────
function setActiveWeek(w) {
  const clamped = Math.max(0, Math.min(durationWeeks.value - 1, w));
  if (clamped === activeWeek.value) return;
  activeWeek.value = clamped;
  selectedShift.value = null;
  clearSelection();
  quickCreate.value.visible = false;
  multiWeekMenuOpen.value = false;
}

function toggleCopyWeekTarget(w) {
  const next = new Set(copyWeekTargets.value);
  if (next.has(w)) next.delete(w);
  else next.add(w);
  copyWeekTargets.value = next;
}

function selectRemainingWeeks() {
  // All week indices strictly *after* the active week — use case: fill out the
  // rest of the semester from whatever the manager built so far.
  const next = new Set();
  for (let w = activeWeek.value + 1; w < durationWeeks.value; w++) next.add(w);
  copyWeekTargets.value = next;
}

function selectAllOtherWeeks() {
  const next = new Set();
  for (let w = 0; w < durationWeeks.value; w++) {
    if (w !== activeWeek.value) next.add(w);
  }
  copyWeekTargets.value = next;
}

function cancelCopyWeek() {
  multiWeekMenuOpen.value = false;
  copyWeekTargets.value = new Set();
}

// Copy every shift from the active week to each checked target week. Reuses
// the undo stack so one undo rolls back the whole copy. Preserves employee +
// position-linked task lists on each new shift, same as the day-copy flow.
const copyingWeek = ref(false);
async function confirmCopyWeek() {
  if (copyWeekTargets.value.size === 0 || copyingWeek.value) return;
  const source = shiftsForWeek(activeWeek.value);
  if (!source.length) { cancelCopyWeek(); return; }
  copyingWeek.value = true;
  const createdBatch = [];
  try {
    for (const targetWeek of copyWeekTargets.value) {
      for (const s of source) {
        try {
          const created = await createTemplateShift({
            id_template: id.value,
            dayOfWeek:   s.dayOfWeek,
            weekOffset:  targetWeek,
            startHour:   s.startHour,
            endHour:     s.endHour,
            label:       s.label || "",
            id_position: s.id_position,
            notes:       s.notes || "",
          });
          templateShifts.value.push(created);
          createdBatch.push(created);

          const emp = shiftEmployeeMap.value[s.id_templateShift];
          if (emp?.id_employee) {
            try {
              await addTemplateShiftEmployee({ id_templateShift: created.id_templateShift, id_employee: emp.id_employee });
              shiftEmployeeMap.value[created.id_templateShift] = emp;
            } catch (_) { /* ignore */ }
          }
          await attachPositionTaskListsForTemplateShift(created.id_templateShift, Number(s.id_position));
        } catch (err) { console.error("Copy-week shift failed:", err); }
      }
    }
    if (createdBatch.length) pushUndo({ type: 'create', shifts: createdBatch });
  } finally {
    copyingWeek.value = false;
    cancelCopyWeek();
  }
}

// Duplicate every shift from sourceDay → each of the targetDays. Re-attaches
// each new shift's employee + position-linked task lists + individual tasks
// so the copies are complete. Reuses the existing undo stack.
async function copyDayToDays(sourceDay, targetDays) {
  copyMenuOpen.value = null;
  const source = shiftsForDay(sourceDay);
  if (!source.length) return;
  const createdBatch = [];
  for (const day of targetDays) {
    if (day === sourceDay) continue;
    for (const s of source) {
      try {
        const created = await createTemplateShift({
          id_template: id.value,
          dayOfWeek:   day,
          weekOffset:  activeWeek.value,
          startHour:   s.startHour,
          endHour:     s.endHour,
          label:       s.label || "",
          id_position: s.id_position,
          notes:       s.notes || "",
        });
        templateShifts.value.push(created);
        createdBatch.push(created);

        // Copy first-assigned employee to the new shift (if present)
        const emp = shiftEmployeeMap.value[s.id_templateShift];
        if (emp?.id_employee) {
          try {
            await addTemplateShiftEmployee({ id_templateShift: created.id_templateShift, id_employee: emp.id_employee });
            shiftEmployeeMap.value[created.id_templateShift] = emp;
          } catch (_) { /* ignore */ }
        }

        await attachPositionTaskListsForTemplateShift(created.id_templateShift, Number(s.id_position));
      } catch (err) { console.error("Copy shift failed:", err); }
    }
  }
  if (createdBatch.length) pushUndo({ type: 'create', shifts: createdBatch });
}
function copyDayToDay(sourceDay, targetDay)    { return copyDayToDays(sourceDay, [targetDay]); }
function copyDayToWeekdays(sourceDay)          { return copyDayToDays(sourceDay, [1, 2, 3, 4, 5]); }
function copyDayToEveryday(sourceDay)          { return copyDayToDays(sourceDay, [0, 1, 2, 3, 4, 5, 6]); }

// Coverage heatmap — peak concurrent shifts per hour across all 7 days.
// Fuels the accent-colored strip on the right edge of the time gutter.
const coverageByHour = computed(() => {
  const counts = new Array(hours.length).fill(0);
  for (let d = 0; d < 7; d++) {
    const dayShifts = templateShifts.value.filter(
      s => s.dayOfWeek === d && (s.weekOffset || 0) === activeWeek.value
    );
    for (let i = 0; i < hours.length; i++) {
      const h = hours[i];
      const count = dayShifts.filter(s => s.startHour <= h && s.endHour > h).length;
      if (count > counts[i]) counts[i] = count;
    }
  }
  return counts;
});
const coverageMax = computed(() => Math.max(1, ...coverageByHour.value));

// ── Readiness chip ────────────────────────────────────────────────────────────
// A shift is "outside open hours" if its time range isn't fully within any of
// the selected season's open intervals for that day. If no season is selected
// we skip that check so we don't false-warn.
function shiftOutsideHours(shift) {
  const lines = hoursLinesForDayIdx(shift.dayOfWeek);
  if (!lines.length) return false; // day has no defined open hours — don't flag
  return !lines.some(l => {
    const openH  = l.openPx  / CELL_HEIGHT + CAL_START_HOUR;
    const closeH = l.closePx / CELL_HEIGHT + CAL_START_HOUR;
    return shift.startHour >= openH && shift.endHour <= closeH;
  });
}
// Applied-instances chip: how many calendar weeks this template has been
// applied to. Counts only applications whose start date is today or later.
const templateApplications = ref([]);
async function loadTemplateApplications() {
  try {
    templateApplications.value = await listTemplateApplications(id.value);
  } catch (_) { templateApplications.value = []; }
}
const appliedInstancesCount = computed(() => {
  const todayKey = new Date().toISOString().slice(0, 10);
  return templateApplications.value.filter(a => (a.startDate || "") >= todayKey).length;
});
function goToFirstAppliedWeek() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = templateApplications.value
    .filter(a => (a.startDate || "") >= todayKey)
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  if (!upcoming.length) return;
  router.push({ path: "/dashboard", query: { week: upcoming[0].startDate } });
}

const readinessState = computed(() => {
  if (templateShifts.value.length === 0) {
    return { kind: "warn", label: "No shifts yet", issues: ["Drag on the grid to create your first shift."] };
  }
  const issues = [];
  const missingPos  = templateShifts.value.filter(s => !s.id_position).length;
  const outsideHrs  = templateShifts.value.filter(s => shiftOutsideHours(s)).length;
  if (missingPos) issues.push(`${missingPos} shift${missingPos === 1 ? '' : 's'} missing position`);
  if (outsideHrs) issues.push(`${outsideHrs} shift${outsideHrs === 1 ? '' : 's'} outside open hours`);
  if (issues.length === 0) {
    return { kind: "ok", label: "Ready to apply", issues: [] };
  }
  return { kind: "warn", label: `${issues.length} issue${issues.length === 1 ? '' : 's'}`, issues };
});

// ── Overlap layout ─────────────────────────────────────────────────────────────
function computeOverlapLayout(dayShifts) {
  const result = {};
  if (!dayShifts.length) return result;
  const sorted = [...dayShifts].sort((a, b) => a.startHour - b.startHour || a.id_templateShift - b.id_templateShift);
  const colEnds = [];
  const assign  = {};
  for (const s of sorted) {
    let col = colEnds.findIndex(end => end <= s.startHour);
    if (col === -1) col = colEnds.length;
    colEnds[col] = s.endHour;
    assign[s.id_templateShift] = col;
  }
  for (const s of sorted) {
    const concurrent = sorted.filter(o =>
      o.id_templateShift !== s.id_templateShift &&
      o.startHour < s.endHour &&
      o.endHour   > s.startHour
    );
    const maxCol = concurrent.reduce((m, o) => Math.max(m, assign[o.id_templateShift]), assign[s.id_templateShift]);
    result[s.id_templateShift] = { colIndex: assign[s.id_templateShift], totalCols: maxCol + 1 };
  }
  return result;
}

const templateShiftLayoutMap = computed(() => {
  const result = {};
  for (let day = 0; day < 7; day++) {
    Object.assign(result, computeOverlapLayout(shiftsForDay(day)));
  }
  return result;
});

// Stable palette for position colors — unlike the Dashboard (employee-colored),
// the Template Editor paints shift blocks by *position* so role balance is
// visible at a glance.
const POSITION_PALETTE = [
  "#B76E6E","#D08B6A","#C9A96E","#9DA66B",
  "#7BA37D","#6FA39C","#7B9CC2","#8B91C2",
  "#A088B8","#BE8AA8","#8F9299","#9C7B5F",
];
function getPositionColor(id_position) {
  if (!id_position) return "#5c5c6e"; // grey for unassigned position
  const idx = positions.value.findIndex(p => p.id_position === id_position);
  const key = idx >= 0 ? idx : Number(id_position) || 0;
  return POSITION_PALETTE[key % POSITION_PALETTE.length];
}

function shiftBlockStyle(shift) {
  const isSelected = selectedShift.value?.id_templateShift === shift.id_templateShift;
  const layout     = templateShiftLayoutMap.value[shift.id_templateShift] ?? { colIndex: 0, totalCols: 1 };
  const baseColor  = getPositionColor(shift.id_position);
  const GAP        = 3;
  const pct        = 100 / layout.totalCols;
  return {
    position:     "absolute",
    top:          `${(shift.startHour - CAL_START_HOUR) * CELL_HEIGHT}px`,
    height:       `${Math.max((shift.endHour - shift.startHour) * CELL_HEIGHT - 3, 18)}px`,
    left:         `calc(${layout.colIndex * pct}% + ${GAP}px)`,
    width:        `calc(${pct}% - ${GAP * 2}px)`,
    right:        "unset",
    background:   `linear-gradient(180deg, ${baseColor} 0%, ${baseColor}d9 100%)`,
    borderRadius: "6px",
    padding:      "4px 6px",
    cursor:       "pointer",
    overflow:     "hidden",
    zIndex:       layout.colIndex + 2,
    boxShadow:    isSelected
      ? `0 0 0 2px #fff, 0 2px 12px ${baseColor}88`
      : `0 2px 10px ${baseColor}55`,
  };
}

function positionNameForShift(shift) {
  if (!shift.id_position) return "";
  return positions.value.find(p => p.id_position === shift.id_position)?.name || "";
}

function empColor(id_employee) {
  return COLORS[(id_employee || 0) % COLORS.length];
}

function empInitials(row) {
  return `${row.fName?.[0] || ""}${row.lName?.[0] || ""}`.toUpperCase() || "?";
}

// ── Drag interaction ──────────────────────────────────────────────────────────
function snap(rawHour) {
  const s = Math.round(rawHour / (SNAP_MINUTES / 60)) * (SNAP_MINUTES / 60);
  return Math.max(CAL_START_HOUR, Math.min(CAL_START_HOUR + 24, s));
}

function getHourFromEvent(e, colEl) {
  const rect = colEl.getBoundingClientRect();
  const relY  = e.clientY - rect.top;
  return snap(CAL_START_HOUR + relY / CELL_HEIGHT);
}

function onColumnMouseDown(e, colIdx) {
  if (e.button !== 0) return;
  if (e.metaKey || e.ctrlKey) {
    // Start rubber-band selection instead of drag-to-create
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
    if (fromTop < ZONE && fromTop >= 0)            setDragScroll(-Math.max(2, Math.round((ZONE - fromTop)    / 10)));
    else if (fromBottom < ZONE && fromBottom >= 0) setDragScroll( Math.max(2, Math.round((ZONE - fromBottom) / 10)));
    else                                           setDragScroll(0);
  }
}

function onGlobalMouseUp(e) {
  stopDragScroll();
  if (rubberBand.value.active) {
    finalizeRubberBand();
    return;
  }
  if (!drag.value.active) return;
  const startHour = Math.min(drag.value.startHour, drag.value.currentHour);
  const endHour   = Math.max(drag.value.startHour, drag.value.currentHour) + SNAP_MINUTES / 60;
  const colIdx    = drag.value.dayIndex;
  drag.value.active = false;

  if (endHour - startHour < SNAP_MINUTES / 60 + 0.001) {
    dragStartedFromShiftBlock = false;
    return;
  }

  quickCreate.value = {
    visible:    true,
    dayIndex:   colIdx,
    startHour,  endHour,
    startLabel: fmtHour(startHour),
    endLabel:   fmtHour(endHour),
    startTime:  toTimeInput(startHour),
    endTime:    toTimeInput(endHour),
    label: "", id_position: "", id_employee: "", notes: "", saving: false, error: "",
    style: { left: "-9999px", top: "-9999px" }, // off-screen until clamped
  };

  nextTick(() => {
    qcLabelInput.value?.focus();
    // Center in the viewport using the actual rendered size
    const popover = document.querySelector(".quick-create-popover");
    if (!popover) return;
    const { width, height } = popover.getBoundingClientRect();
    const centeredLeft = Math.round((window.innerWidth  - width)  / 2);
    const centeredTop  = Math.round((window.innerHeight - height) / 2);
    quickCreate.value.style = { left: `${centeredLeft}px`, top: `${centeredTop}px` };
  });
}

// Window-level keyboard listener — handles quick-create and multi-select shortcuts
function onWindowKeyup(e)  { if (e.key === "Meta" || e.key === "Control") cmdHeld.value = false; }
function onWindowBlur()    { cmdHeld.value = false; }

function onWindowKeydown(e) {
  if (e.key === "Meta" || e.key === "Control") cmdHeld.value = true;
  // Quick-create popover has priority
  if (quickCreate.value.visible) {
    if (e.key === "Escape") { quickCreate.value.visible = false; return; }
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    confirmQuickCreate();
    return;
  }
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key === "a") {
    e.preventDefault();
    selectedShiftIds.value = new Set(templateShifts.value.map(s => s.id_templateShift));
    return;
  }
  if (meta && e.key === "c") {
    e.preventDefault();
    copySelected();
    return;
  }
  if (meta && e.key === "v") {
    e.preventDefault();
    if (clipboard.value.length > 0) isPasteMode.value = true;
    return;
  }
  if (meta && e.key === "z") {
    e.preventDefault();
    undoLastAction();
    return;
  }
  if ((e.key === "Delete" || e.key === "Backspace") && selectedShiftIds.value.size > 0) {
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
onMounted(() => {
  window.addEventListener("keydown", onWindowKeydown);
  window.addEventListener("keyup",   onWindowKeyup);
  window.addEventListener("blur",    onWindowBlur);
});
onUnmounted(() => {
  stopDragScroll();
  window.removeEventListener("keydown", onWindowKeydown);
  window.removeEventListener("keyup",   onWindowKeyup);
  window.removeEventListener("blur",    onWindowBlur);
});

// ── Multi-select helpers ───────────────────────────────────────────────────────
function toggleShiftSelection(id) {
  const s = new Set(selectedShiftIds.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selectedShiftIds.value = s;
}

function clearSelection() {
  selectedShiftIds.value = new Set();
}

function onShiftBlockMouseDown(e, colIdx) {
  if (e.metaKey || e.ctrlKey) {
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
    dragStartedFromShiftBlock = false;
    return;
  }
  if (e.metaKey || e.ctrlKey) {
    toggleShiftSelection(shift.id_templateShift);
    return;
  }
  clearSelection();
  selectShift(shift);
}

function finalizeRubberBand() {
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
        newSet.add(Number(el.dataset.shiftId));
      }
    });
    selectedShiftIds.value = newSet;
  }
  rubberBand.value = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
}

function copySelected() {
  if (selectedShiftIds.value.size === 0) return;
  const selected = templateShifts.value.filter(s => selectedShiftIds.value.has(s.id_templateShift));
  clipboard.value = selected.map(s => ({
    dayOfWeek:   s.dayOfWeek,
    weekOffset:  s.weekOffset || 0,
    startHour:   s.startHour,
    endHour:     s.endHour,
    label:       s.label || "",
    id_position: s.id_position,
    id_employee: shiftEmployeeMap.value[s.id_templateShift]?.id_employee || null,
  }));
}

function pasteShifts() {
  if (clipboard.value.length === 0) return;
  isPasteMode.value = true;
}

async function pasteToDay(targetColIdx) {
  if (clipboard.value.length === 0) return;
  isPasteMode.value = false;

  const anchorDay = Math.min(...clipboard.value.map(item => item.dayOfWeek));
  const offsetDays = targetColIdx - anchorDay;
  const pastedShifts = [];

  for (const item of clipboard.value) {
    const newDay = ((item.dayOfWeek + offsetDays) % 7 + 7) % 7;
    try {
      const created = await createTemplateShift({
        id_template: id.value,
        dayOfWeek:   newDay,
        weekOffset:  activeWeek.value,
        startHour:   item.startHour,
        endHour:     item.endHour,
        label:       item.label,
        id_position: item.id_position,
        notes:       "",
      });
      templateShifts.value.push(created);
      pastedShifts.push(created);
      if (item.id_employee) {
        try {
          await addTemplateShiftEmployee({ id_templateShift: created.id_templateShift, id_employee: item.id_employee });
          const emp = allEmployees.value.find(e => e.id_employee === item.id_employee);
          if (emp) shiftEmployeeMap.value[created.id_templateShift] = emp;
        } catch { /* non-critical */ }
      }
      await attachPositionTaskListsForTemplateShift(created.id_templateShift, Number(item.id_position));
    } catch (err) { console.error("Paste shift failed:", err); }
  }
  if (pastedShifts.length > 0) pushUndo({ type: 'create', shifts: pastedShifts });
}

async function deleteSelectedShifts() {
  const count = selectedShiftIds.value.size;
  if (count === 0) return;
  if (count > 1 && !window.confirm(`Delete ${count} selected shifts?`)) return;
  const ids = [...selectedShiftIds.value];
  const toDelete = ids.map(id => templateShifts.value.find(s => s.id_templateShift === id)).filter(Boolean);
  const snapshots = toDelete.map(s => ({ ...s, id_employee: shiftEmployeeMap.value[s.id_templateShift]?.id_employee || null }));
  pushUndo({ type: 'delete', shifts: snapshots });
  clearSelection();
  for (const shiftId of ids) {
    try {
      await deleteTemplateShift(shiftId);
      templateShifts.value = templateShifts.value.filter(s => s.id_templateShift !== shiftId);
      if (selectedShift.value?.id_templateShift === shiftId) selectedShift.value = null;
    } catch (err) { console.error("Delete shift failed:", shiftId, err); }
  }
}

// When a template-shift is created with a position, auto-attach every task
// list linked to that position via PositionTaskList — mirrors the backend's
// Dashboard shift-create behavior so templates feel consistent.
async function attachPositionTaskListsForTemplateShift(id_templateShift, id_position) {
  if (!id_position || !id_templateShift) return;
  try {
    const links = await getPositionTaskLists(id_position);
    for (const link of links) {
      try {
        await addTemplateShiftTaskList({ id_templateShift, id_taskList: link.id_taskList });
      } catch (_) { /* ignore individual failures — e.g. duplicate */ }
    }
  } catch (_) { /* non-critical — manager can still add manually */ }
}

async function confirmQuickCreate() {
  if (!quickCreate.value.id_position) {
    quickCreate.value.error = "Position is required.";
    return;
  }
  const startHour = fromTimeInput(quickCreate.value.startTime);
  const endHour   = fromTimeInput(quickCreate.value.endTime);
  if (endHour <= startHour) {
    quickCreate.value.error = "End time must be after start time.";
    return;
  }
  quickCreate.value.saving = true;
  quickCreate.value.error  = "";
  try {
    const created = await createTemplateShift({
      id_template:  id.value,
      dayOfWeek:    quickCreate.value.dayIndex,
      weekOffset:   activeWeek.value,
      startHour,    endHour,
      label:        quickCreate.value.label,
      id_position:  Number(quickCreate.value.id_position),
      notes:        quickCreate.value.notes,
    });
    templateShifts.value.push(created);
    pushUndo({ type: 'create', shifts: [created] });

    // Optionally assign an employee on creation
    const id_employee = Number(quickCreate.value.id_employee);
    if (id_employee) {
      try {
        await addTemplateShiftEmployee({ id_templateShift: created.id_templateShift, id_employee });
        const emp = allEmployees.value.find(e => e.id_employee === id_employee);
        if (emp) shiftEmployeeMap.value[created.id_templateShift] = emp;
      } catch { /* non-critical — shift was still created */ }
    }

    // Auto-attach task lists linked to the selected position
    await attachPositionTaskListsForTemplateShift(created.id_templateShift, Number(quickCreate.value.id_position));

    quickCreate.value.visible = false;
  } catch (err) {
    quickCreate.value.error = err.response?.data?.message || err.message || "Failed to create shift.";
  } finally {
    quickCreate.value.saving = false;
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const { fmtHour, preferences: userPrefs } = usePreferences();

// Hour-axis label on the calendar time gutter. 12h mode shows "12 AM / 6 AM /
// 12 PM"; 24h mode shows zero-padded "00 / 06 / 12".
function formatHour(h) {
  if (userPrefs.calendarDisplay?.timeFormat === "24h") {
    return String(h).padStart(2, "0");
  }
  if (h === 0)  return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function toTimeInput(h) {
  const total = Math.round(h * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function fromTimeInput(t) {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
</script>

<style scoped>
@import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }

.editor-root {
  flex: 1; display: flex; flex-direction: column;
  background: var(--bg-page); color: var(--tx-primary);
  font-family: 'Satoshi', sans-serif; overflow: hidden; user-select: none;
}

/* ── Loading ── */
.loading-overlay {
  position: fixed; inset: 0; background: var(--bg-overlay);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; z-index: 999;
}
.loading-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--bdr-subtle); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: 15px; color: var(--tx-faint); }

/* ── Template header bar ── */
.template-header-bar {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 24px; background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.back-link {
  background: none; border: none; color: var(--tx-muted);
  font-family: 'Satoshi', sans-serif; font-size: 14px;
  cursor: pointer; transition: color 0.15s; flex-shrink: 0;
}
.back-link:hover { color: var(--accent); }
.header-chip-row {
  display: flex; align-items: center; gap: 8px;
  margin-left: auto;
}
.readiness-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px; font-weight: 700;
  letter-spacing: -0.01em;
  font-family: 'Satoshi', 'Inter', sans-serif;
  border: 1px solid transparent;
  white-space: nowrap;
  cursor: default;
}
.readiness-chip--ok {
  background: rgba(34, 197, 94, 0.12);
  color: rgba(34, 197, 94, 1);
  border-color: rgba(34, 197, 94, 0.35);
}
.readiness-chip--warn {
  background: rgba(245, 158, 11, 0.14);
  color: rgba(245, 158, 11, 1);
  border-color: rgba(245, 158, 11, 0.4);
}
.readiness-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.applied-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px; font-weight: 600;
  letter-spacing: -0.01em;
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  font-family: 'Satoshi', 'Inter', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: background .12s, color .12s;
}
.applied-chip:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

.day-copy-btn {
  position: absolute; top: 4px; right: 4px;
  width: 20px; height: 20px;
  background: none; border: 1px solid transparent;
  border-radius: 5px; cursor: pointer;
  color: var(--tx-faint);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity .12s, color .12s, border-color .12s, background .12s;
}
.day-header:hover .day-copy-btn,
.day-copy-btn--open { opacity: 1; }
.day-copy-btn:hover,
.day-copy-btn--open {
  color: var(--accent);
  border-color: var(--bdr-medium);
  background: var(--bg-surface);
}
.day-copy-menu {
  position: absolute; top: calc(100% + 4px); right: 0;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-medium);
  border-radius: 10px;
  padding: 8px;
  width: 210px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.25);
  z-index: 100;
  font-family: 'Satoshi', 'Inter', sans-serif;
  display: flex; flex-direction: column; gap: 4px;
  text-align: left;
}
.day-copy-menu-label {
  font-size: 10px; font-weight: 700;
  color: var(--tx-faint);
  text-transform: uppercase; letter-spacing: .06em;
  font-family: 'DM Mono', monospace;
  padding: 4px 6px 2px;
}
.day-copy-menu-opt {
  background: none; border: none; padding: 7px 8px;
  border-radius: 6px; cursor: pointer;
  color: var(--tx-primary);
  font-family: inherit; font-size: 13px; font-weight: 500;
  text-align: left;
  transition: background .1s, color .1s;
}
.day-copy-menu-opt:hover { background: var(--bg-hover); color: var(--accent); }
.day-copy-menu-sep { height: 1px; background: var(--bdr-subtle); margin: 4px 0; }
.day-copy-menu-days {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px;
  padding: 0 4px 2px;
}
.day-copy-menu-day {
  background: var(--bg-surface); border: 1px solid var(--bdr-subtle);
  color: var(--tx-secondary);
  border-radius: 5px; padding: 5px 0;
  font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 700;
  cursor: pointer;
  transition: background .1s, color .1s, border-color .1s;
}
.day-copy-menu-day:hover { background: var(--accent-bg); color: var(--accent); border-color: var(--accent-border); }

.time-column { position: relative; }
.coverage-strip {
  position: absolute; top: 0; right: 0;
  width: 3px; height: 100%;
  pointer-events: none;
  z-index: 2;
  border-radius: 2px;
  overflow: hidden;
}
.coverage-seg {
  position: absolute; left: 0; right: 0;
  background: var(--accent);
  transition: opacity .2s ease;
}
.template-name-input {
  background: var(--bg-input); border: 1px solid var(--bdr-medium);
  color: var(--tx-primary); padding: 6px 12px; border-radius: 6px;
  font-size: 16px; font-weight: 600; font-family: 'Satoshi', sans-serif;
  outline: none; flex: 1; max-width: 320px; transition: border-color 0.15s;
}
.template-name-input:focus { border-color: var(--accent); }
.save-status { font-size: 13px; color: var(--tx-faint); font-family: 'DM Mono', monospace; }

/* ── Top Nav (legacy) ── */
.topnav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 56px;
  background: var(--bg-surface); border-bottom: 1px solid var(--bdr-subtle);
  flex-shrink: 0; z-index: 10;
}
.nav-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
.back-btn {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; color: var(--tx-faint);
  font-size: 15px; cursor: pointer; padding: 4px 8px;
  border-radius: 6px; transition: color .15s, background .15s; flex-shrink: 0;
}
.back-btn:hover { color: var(--tx-primary); background: var(--bg-hover); }
.name-group { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tpl-name-input {
  background: none; border: none; border-bottom: 1px solid transparent;
  color: var(--tx-heading); font-size: 19px; font-weight: 700; font-family: 'Satoshi', sans-serif;
  padding: 2px 4px; outline: none; min-width: 160px; max-width: 360px; transition: border-color .15s;
}
.tpl-name-input:hover  { border-bottom-color: var(--bdr-faint); }
.tpl-name-input:focus  { border-bottom-color: var(--accent); }
.tpl-name-input::placeholder { color: var(--tx-faded); }
.save-status { font-size: 14px; color: var(--tx-faint); white-space: nowrap; }
.save-status.error { color: var(--accent); }
.nav-hint { font-size: 14px; color: var(--tx-faded); font-style: italic; }

/* ── Error banner ── */
.error-banner {
  background: var(--err-bg); border-bottom: 1px solid var(--accent);
  color: var(--err-text); padding: 8px 20px; font-size: 15px;
  display: flex; align-items: center; gap: 12px; flex-shrink: 0;
}
.retry-btn {
  background: none; border: 1px solid var(--accent); color: var(--accent);
  border-radius: 5px; padding: 3px 10px; font-size: 14px; cursor: pointer;
}

/* ── Editor body ── */
.editor-body { flex: 1; display: flex; flex-direction: row; overflow: hidden; }

/* ── Hours of Operation Sidebar ── */
.hours-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-right: 1px solid var(--bdr-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.hours-sidebar-head {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--bdr-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.hours-sidebar-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--tx-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.hours-sidebar-sub {
  font-size: 12px;
  color: var(--tx-faded);
  font-style: italic;
}
.hours-sidebar-empty {
  padding: 16px;
  font-size: 14px;
  color: var(--tx-faded);
  font-style: italic;
  line-height: 1.5;
}
.hours-sidebar-list {
  flex: 0 1 auto;
  max-height: 40%;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hours-sidebar-list::-webkit-scrollbar { width: 4px; }
.hours-sidebar-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.hours-opt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-subtle);
  border-radius: 8px;
  padding: 9px 11px;
  cursor: pointer;
  text-align: left;
  font-family: 'Satoshi', sans-serif;
  transition: border-color .15s, background .15s, color .15s;
}
.hours-opt:hover {
  border-color: var(--bdr-medium);
  background: var(--bg-hover);
}
.hours-opt.active {
  border-color: var(--accent);
  background: var(--accent-bg);
}
.hours-opt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.hours-opt-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--tx-primary);
}
.hours-opt.active .hours-opt-name { color: var(--accent); }
.hours-opt-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--ok-text);
  background: var(--ok-bg);
  border-radius: 10px;
  padding: 2px 6px;
  flex-shrink: 0;
}
.hours-opt-meta {
  font-size: 12px;
  color: var(--tx-faded);
  font-family: 'DM Mono', monospace;
}
.hours-sidebar-legend {
  border-top: 1px solid var(--bdr-subtle);
  padding: 10px 16px;
  display: flex;
  gap: 14px;
  flex-shrink: 0;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--tx-faint);
  font-family: 'DM Mono', monospace;
}
.legend-swatch {
  width: 18px;
  height: 2px;
  border-radius: 1px;
}
.legend-swatch.open  { background: rgba(34, 197, 94, 0.85); }
.legend-swatch.close { background: rgba(248, 113, 113, 0.85); }

/* ── Employees preview panel (in the left sidebar) ── */
.emp-preview-section {
  border-top: 1px solid var(--bdr-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.emp-preview-search-wrap {
  padding: 10px 16px 4px;
}
.emp-preview-search {
  width: 100%;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 7px;
  padding: 6px 10px;
  color: var(--tx-primary);
  font-size: 13px;
  font-family: 'Satoshi', sans-serif;
  outline: none;
  transition: border-color .15s;
}
.emp-preview-search:focus { border-color: var(--accent); }
.emp-preview-search::placeholder { color: var(--tx-faded); }
.emp-preview-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.emp-preview-list::-webkit-scrollbar { width: 4px; }
.emp-preview-list::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.emp-preview-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: none;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--tx-secondary);
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  text-align: left;
  transition: background .12s, border-color .12s, color .12s;
}
.emp-preview-opt:hover {
  background: var(--bg-hover);
  color: var(--tx-primary);
}
.emp-preview-opt.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}
.emp-preview-avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #181820;
  font-family: 'DM Mono', monospace;
  letter-spacing: .3px;
}
.emp-preview-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.emp-preview-count {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  font-family: 'DM Mono', monospace;
  background: rgba(255, 23, 68, 0.14);
  color: rgba(255, 23, 68, 0.9);
  border-radius: 10px;
  padding: 1px 7px;
  min-width: 18px;
  text-align: center;
}
.emp-preview-opt.active .emp-preview-count {
  background: rgba(255,255,255,0.22);
  color: #fff;
}
.emp-preview-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--bdr-subtle);
}
.emp-preview-clear {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-family: 'DM Mono', monospace;
  cursor: pointer;
  width: 100%;
  transition: color .15s, border-color .15s, background .15s;
}
.emp-preview-clear:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg);
}

/* Hatched unavailability overlay on the day columns. Sits below shift
   blocks (shift-block z-index 2) and hours-op lines so shifts remain
   click-through. `pointer-events: none` is critical — any future rule
   must not shadow it or drag-to-create breaks. */
.tpl-unavail-overlay {
  position: absolute;
  left: 2px;
  right: 2px;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 23, 68, 0.14), rgba(255, 23, 68, 0.14) 6px,
    transparent 6px, transparent 12px
  );
  border: 1px dashed rgba(255, 23, 68, 0.45);
  border-radius: 5px;
  z-index: 1;
  pointer-events: none !important;
  display: flex;
  align-items: flex-start;
}
.tpl-unavail-overlay-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .02em;
  color: rgba(255, 23, 68, 0.9);
  background: rgba(255, 255, 255, 0.75);
  padding: 1px 6px;
  border-radius: 3px;
  margin: 3px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 8px);
  font-family: 'DM Mono', monospace;
  pointer-events: none !important;
}

/* ── Hours of operation overlay lines (calendar grid) ── */
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

/* ── Calendar grid ── */
.cal-grid-wrapper {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid var(--bdr-subtle);
}
.cal-header-row {
  display: flex; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
  background: var(--bg-surface);
  position: sticky; top: 0; z-index: 2;
}
.time-gutter { width: 60px; flex-shrink: 0; }
.day-header {
  flex: 1; text-align: center; padding: 14px 4px;
  display: flex; align-items: center; justify-content: center;
  border-left: 1px solid var(--bdr-subtle);
  position: relative;
}
.day-letter { font-size: 14px; color: var(--tx-faint); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
.cal-body { flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
.cal-body::-webkit-scrollbar { width: 6px; }
.cal-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.cal-inner { display: flex; min-height: fit-content; }
.time-column { width: 60px; flex-shrink: 0; }
.time-slot-label {
  height: 60px; padding: 4px 8px 0;
  font-size: 12px; color: var(--tx-faded); font-family: 'DM Mono', monospace;
  display: flex; align-items: flex-start; justify-content: flex-end;
}
.day-column { flex: 1; position: relative; border-left: 1px solid var(--bdr-subtle); cursor: crosshair; }
.day-column.is-dragging-col { background: var(--accent-drag); }
.hour-cell { height: 60px; border-bottom: 1px solid var(--bdr-subtle); }
.hour-cell:nth-child(even) { background: var(--hour-even); }

/* ── Ghost block ── */
.ghost-block {
  border: 2px solid var(--accent); background: var(--accent-bg);
  border-radius: 6px; display: flex; align-items: flex-start; padding: 4px 8px; pointer-events: none;
}
.ghost-label { font-size: 13px; color: var(--accent); font-family: 'DM Mono', monospace; font-weight: 500; white-space: nowrap; }

/* ── Shift blocks ── */
.shift-block { position: absolute; transition: filter .1s; }
.shift-block:hover { filter: brightness(1.12); }
.cmd-create-mode .shift-block { cursor: crosshair !important; }
.shift-label { font-size: 14px; font-weight: 700; color: rgba(0,0,0,.85); line-height: 1.2; }
.shift-time  { font-size: 12px; color: rgba(0,0,0,.6); font-family: 'DM Mono', monospace; }
.shift-pos-badge { font-size: 11px; color: rgba(0,0,0,.5); margin-top: 2px; background: rgba(0,0,0,.1); border-radius: 3px; padding: 1px 4px; display: inline-block; }

/* ── Right Panel ── */
.shift-panel { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--bg-surface); overflow: hidden; }
.panel-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; text-align: center; }
.panel-empty-title { font-size: 16px; font-weight: 600; color: var(--tx-faded); margin-bottom: 6px; }
.panel-empty-sub   { font-size: 14px; color: var(--tx-faded); line-height: 1.5; }
.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px; border-bottom: 1px solid var(--bdr-subtle); flex-shrink: 0;
}
.panel-shift-meta { display: flex; flex-direction: column; gap: 2px; }
.panel-day-badge  { font-size: 13px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: .06em; }
.panel-time-display { font-size: 15px; font-family: 'DM Mono', monospace; color: var(--tx-muted); }
.panel-close-btn { background: none; border: none; color: var(--tx-faint); font-size: 16px; cursor: pointer; padding: 4px; border-radius: 4px; transition: color .15s; }
.panel-close-btn:hover { color: var(--tx-primary); }
.panel-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
.panel-field { display: flex; flex-direction: column; gap: 5px; }
.panel-field-label { font-size: 12px; font-weight: 700; color: var(--tx-faint); text-transform: uppercase; letter-spacing: .06em; }
.optional-tag { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--tx-faded); font-size: 12px; }
.req-star { color: var(--accent); }
.panel-input, .panel-select {
  background: var(--bg-modal); border: 1px solid var(--bdr-faint); border-radius: 7px;
  padding: 8px 10px; color: var(--tx-primary); font-size: 15px;
  font-family: 'Satoshi', sans-serif; outline: none; transition: border-color .15s; width: 100%;
}
.panel-input:focus, .panel-select:focus { border-color: var(--accent); }
.panel-input::placeholder { color: var(--tx-faded); }
.panel-req-note { font-size: 13px; color: var(--tx-faint); font-style: italic; }
.panel-save-row { display: flex; align-items: center; gap: 10px; }
.panel-autosave-row {
  display: flex; align-items: center; gap: 10px;
  min-height: 16px;
  margin-top: -4px;
}
.panel-autosave-note { font-size: 12px; color: var(--tx-faint); font-style: italic; }
.panel-save-btn {
  background: var(--accent); color: #fff; border: none;
  border-radius: 7px; padding: 7px 20px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.panel-save-btn:disabled { opacity: .45; cursor: not-allowed; }
.panel-save-btn:not(:disabled):hover { opacity: .85; }
.panel-saved-flash { font-size: 14px; color: var(--ok-text); }
.panel-error-flash { font-size: 14px; color: var(--accent); }
.panel-divider { height: 1px; background: var(--bdr-subtle); margin: 0 -16px; }
.panel-section { display: flex; flex-direction: column; gap: 10px; }
.panel-section-head { display: flex; align-items: center; justify-content: space-between; }
.panel-section-label { font-size: 13px; font-weight: 700; color: var(--tx-muted); text-transform: uppercase; letter-spacing: .06em; }
.panel-optional-tag  { font-size: 12px; color: var(--tx-faded); font-style: italic; }
.panel-loading-sm { font-size: 14px; color: var(--tx-faded); }
.panel-list-empty { font-size: 14px; color: var(--tx-faded); font-style: italic; }
.panel-list-row {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-modal); border: 1px solid var(--bdr-subtle); border-radius: 7px; padding: 7px 10px;
}
.panel-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.panel-list-name { font-size: 15px; color: var(--tx-secondary); flex: 1; }
.panel-remove-btn { background: none; border: none; color: var(--tx-faint); font-size: 13px; cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: color .15s; flex-shrink: 0; }
.panel-remove-btn:hover { color: var(--accent); }
.panel-add-row { display: flex; gap: 6px; align-items: center; }
.panel-add-select-wrap { flex: 1; min-width: 0; }
.panel-add-select {
  flex: 1; background: var(--bg-modal); border: 1px solid var(--bdr-faint); border-radius: 7px;
  padding: 6px 8px; color: var(--tx-primary); font-size: 14px;
  font-family: 'Satoshi', sans-serif; outline: none; transition: border-color .15s;
}
.panel-add-select:focus { border-color: var(--accent); }
.panel-add-btn {
  background: var(--bg-hover); border: 1px solid var(--bdr-faint); color: var(--tx-muted);
  border-radius: 7px; padding: 6px 12px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: color .15s, border-color .15s, background .15s; flex-shrink: 0;
}
.panel-add-btn:disabled { opacity: .4; cursor: not-allowed; }
.panel-add-btn:not(:disabled):hover { color: var(--tx-primary); border-color: var(--bdr-medium); background: var(--bg-surface); }
.panel-sync-status { font-size: 13px; color: var(--ok-text); font-style: italic; text-align: center; }
.panel-footer { padding: 12px 16px; border-top: 1px solid var(--bdr-subtle); flex-shrink: 0; }
.panel-delete-btn {
  width: 100%; background: none; border: 1px solid var(--accent-border);
  color: var(--accent); border-radius: 7px; padding: 7px 0;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s, border-color .15s;
}
.panel-delete-btn:hover { background: var(--accent-bg); border-color: var(--accent); }

/* ── Quick-create popover ── */
.quick-create-popover {
  position: fixed; z-index: 500;
  background: var(--bg-modal); border: 1px solid var(--bdr-faint); border-radius: 12px;
  padding: 16px; width: 300px; box-shadow: 0 16px 48px rgba(0,0,0,.5);
  display: flex; flex-direction: column; gap: 12px;
}
.qc-header { display: flex; align-items: center; justify-content: space-between; }
.qc-time-badge {
  background: var(--accent-bg); border: 1px solid var(--accent-border);
  color: var(--accent); font-size: 14px; font-family: 'DM Mono', monospace;
  padding: 3px 10px; border-radius: 20px;
}
.qc-close { background: none; border: none; color: var(--tx-faint); font-size: 16px; cursor: pointer; line-height: 1; transition: color .15s; }
.qc-close:hover { color: var(--tx-primary); }
.qc-day-label { font-size: 14px; color: var(--tx-faint); margin-top: -4px; }
.qc-error { font-size: 14px; color: var(--accent); margin: 0; }
.qc-actions { display: flex; gap: 8px; justify-content: flex-end; }
.qc-cancel {
  background: none; border: 1px solid var(--bdr-faint); color: var(--tx-muted);
  border-radius: 7px; padding: 6px 14px; font-size: 15px; cursor: pointer; transition: color .15s, border-color .15s;
}
.qc-cancel:hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.qc-confirm {
  background: var(--accent); color: #fff; border: none;
  border-radius: 7px; padding: 6px 16px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: opacity .15s;
}
.qc-confirm:disabled { opacity: .45; cursor: not-allowed; }
.qc-confirm:not(:disabled):hover { opacity: .85; }

/* ── Shared form styles (quick-create) ── */
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 13px; font-weight: 600; color: var(--tx-faint); text-transform: uppercase; letter-spacing: .5px; }
.form-group input, .form-group select {
  background: var(--bg-surface); border: 1px solid var(--bdr-faint); border-radius: 7px;
  padding: 8px 10px; color: var(--tx-primary); font-size: 15px;
  font-family: 'Satoshi', sans-serif; outline: none; transition: border-color .15s;
}
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }
.form-group input::placeholder { color: var(--tx-faded); }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }
.optional { color: var(--tx-faded); font-weight: 400; text-transform: none; letter-spacing: 0; }

/* ── Week Tab Bar ── */
.week-tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--bdr-subtle);
}
.week-tab-list {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
}
.week-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 8px;
  padding: 6px 14px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
  white-space: nowrap;
}
.week-tab:hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.week-tab.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
}
.week-tab-label { font-size: 14px; font-weight: 600; }
.week-tab-count {
  font-size: 11px;
  font-family: 'DM Mono', monospace;
  opacity: .75;
  letter-spacing: .3px;
}
.week-tab-actions { flex-shrink: 0; position: relative; }
.multi-week-menu-wrap { position: relative; }
.week-action-btn {
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 7px;
  padding: 7px 14px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
}
.week-action-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg);
}
.week-action-btn.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg);
}
.week-action-btn:disabled { opacity: .4; cursor: not-allowed; }
.multi-week-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  width: 260px;
  background: var(--bg-modal);
  border: 1px solid var(--bdr-faint);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.multi-week-menu-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx-faint);
  text-transform: uppercase;
  letter-spacing: .4px;
  font-family: 'DM Mono', monospace;
}
.multi-week-menu-days {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
}
.multi-week-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--tx-primary);
  cursor: pointer;
  user-select: none;
}
.multi-week-check input { accent-color: var(--accent); }
.multi-week-menu-sep {
  height: 1px;
  background: var(--bdr-subtle);
  margin: 2px 0;
}
.multi-week-menu-opt {
  background: none;
  border: 1px solid var(--bdr-subtle);
  color: var(--tx-muted);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: 'Satoshi', sans-serif;
  cursor: pointer;
  text-align: left;
  transition: color .15s, border-color .15s, background .15s;
}
.multi-week-menu-opt:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-bg);
}
.multi-week-menu-foot {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}
.cancel-btn-sm {
  background: none;
  border: 1px solid var(--bdr-faint);
  color: var(--tx-muted);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 13px;
  cursor: pointer;
}
.cancel-btn-sm:hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.confirm-btn-sm {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.confirm-btn-sm:disabled { opacity: .4; cursor: not-allowed; }
.confirm-btn-sm:not(:disabled):hover { opacity: .85; }

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
.sel-count { font-size: 15px; color: var(--tx-primary); font-weight: 600; }
.sel-divider { width: 1px; height: 16px; background: var(--bdr-faint); margin: 0 2px; }
.sel-btn {
  background: var(--bg-hover); border: 1px solid var(--bdr-faint); color: var(--tx-muted);
  border-radius: 6px; padding: 5px 12px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; font-family: 'Satoshi', sans-serif;
}
.sel-btn:disabled { opacity: .4; cursor: not-allowed; }
.sel-btn:not(:disabled):hover { color: var(--tx-primary); border-color: var(--bdr-medium); }
.sel-btn--delete { color: var(--accent); border-color: var(--accent-border); }
.sel-btn--delete:not(:disabled):hover { background: var(--accent-bg); border-color: var(--accent); }
.sel-btn--clear { background: none; border: none; color: var(--tx-faint); padding: 4px 8px; font-size: 17px; line-height: 1; }
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
.popover-anim-enter-active, .popover-anim-leave-active { transition: opacity .12s, transform .12s; }
.popover-anim-enter-from, .popover-anim-leave-to { opacity: 0; transform: scale(.96) translateY(-4px); }

/* ── Phone notice ── */
.phone-notice {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  padding: 32px 22px;
  gap: 14px;
  color: var(--tx-secondary);
  max-width: 100%;
}
.phone-notice svg { color: var(--accent); opacity: 0.8; }
.phone-notice-title {
  font-size: 19px; font-weight: 700; color: var(--tx-heading);
  line-height: 1.25; max-width: 280px;
}
.phone-notice-body {
  font-size: 14px; color: var(--tx-faint);
  max-width: 320px; line-height: 1.5;
}
.phone-notice-back {
  margin-top: 8px;
  background: var(--bg-surface); border: 1px solid var(--bdr-medium);
  color: var(--tx-primary);
  padding: 10px 18px; border-radius: 9px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer;
  min-height: var(--tap-target-min);
}
.phone-notice-back:hover { border-color: var(--accent); color: var(--accent); }
</style>
