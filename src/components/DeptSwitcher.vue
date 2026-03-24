<template>
  <div v-if="myDepts.length > 1" class="dept-switcher">
    <div class="dept-color-dot"></div>
    <select class="dept-switcher-select" :value="selectedDeptId" @change="onChange">
      <option v-for="d in myDepts" :key="d.id_department" :value="d.id_department">
        {{ d.name }}
      </option>
    </select>
    <svg class="dept-switcher-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div v-else-if="myDepts.length === 1" class="dept-switcher dept-switcher--single">
    <div class="dept-color-dot"></div>
    <span class="dept-switcher-name">{{ myDepts[0].name }}</span>
  </div>
</template>

<script setup>
import { useDepartment } from "../composables/useDepartment.js";

const { myDepts, selectedDeptId, setDept } = useDepartment();

function onChange(e) {
  setDept(Number(e.target.value));
}
</script>

<style scoped>
.dept-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.dept-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: #FF1744;
  flex-shrink: 0;
}

.dept-switcher-select {
  appearance: none;
  background: transparent;
  border: none;
  color: var(--tx-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding-right: 4px;
}

.dept-switcher-select:hover {
  color: var(--accent);
}

.dept-switcher-chevron {
  color: var(--tx-faint);
  pointer-events: none;
  flex-shrink: 0;
}

.dept-switcher--single {
  cursor: default;
}

.dept-switcher-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx-primary);
}
</style>
