<template>
  <div v-if="myDepts.length > 1" class="dept-switcher">
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
    <span class="dept-switcher-name">{{ myDepts.find(d => d.id_department === selectedDeptId)?.name || myDepts[0]?.name }}</span>
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
  gap: 6px;
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--bdr-subtle);
  border-radius: 8px;
  padding: 8px 16px;
  transition: border-color 0.15s;
}

.dept-switcher:hover {
  border-color: var(--bdr-medium);
}

.dept-switcher-select {
  appearance: none;
  background: transparent;
  border: none;
  color: var(--tx-primary);
  font-size: 18px;
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
  font-size: 18px;
  font-weight: 600;
  color: var(--tx-primary);
}
</style>
