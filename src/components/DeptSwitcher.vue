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
  gap: 8px;
  position: relative;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border, rgba(255, 23, 68, 0.25));
  border-radius: 10px;
  padding: 8px 16px;
  transition: border-color 0.15s, background 0.15s;
}

.dept-switcher:hover {
  border-color: var(--accent);
}

.dept-switcher-select {
  appearance: none;
  background: transparent;
  border: none;
  color: var(--tx-heading);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.01em;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding-right: 4px;
}

.dept-switcher-select:hover {
  color: var(--accent);
}

.dept-switcher-chevron {
  color: var(--tx-muted);
  pointer-events: none;
  flex-shrink: 0;
}

.dept-switcher--single {
  cursor: default;
}

.dept-switcher-name {
  font-size: 21px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--tx-heading);
}
</style>
