import { ref } from "vue";
import { getManagerDepartments, getAllDepartments } from "../services/departmentService.js";
import Utils from "../config/utils.js";

const STORAGE_KEY = "selectedDeptId";

// Module-level singletons — shared across all components
const myDepts       = ref([]);
const selectedDeptId = ref(Number(Utils.getStore(STORAGE_KEY)) || null);

function setDept(id) {
  selectedDeptId.value = id ? Number(id) : null;
  if (id) Utils.setStore(STORAGE_KEY, id);
}

async function loadDepts(user) {
  if (!user) return;
  const empId     = user.id_employee;
  const primaryId = user.id_department;

  try {
    const [junctionRes, allDeptsRes] = await Promise.allSettled([
      empId ? getManagerDepartments(empId) : Promise.resolve({ data: [] }),
      getAllDepartments(),
    ]);

    const allDepts    = allDeptsRes.status  === "fulfilled" ? (allDeptsRes.value.data  || []) : [];
    const junctionRows = junctionRes.status === "fulfilled" ? (junctionRes.value.data || []) : [];

    const deptIdSet = new Set(junctionRows.map(j => Number(j.id_department)));
    if (primaryId) deptIdSet.add(Number(primaryId));

    myDepts.value = allDepts.filter(d => deptIdSet.has(d.id_department));

    // If stored selection is no longer valid, fall back to first
    const valid = myDepts.value.some(d => d.id_department === selectedDeptId.value);
    if (!valid) setDept(myDepts.value[0]?.id_department || null);
  } catch (err) {
    console.error("useDepartment: failed to load departments", err);
  }
}

export function useDepartment() {
  return { myDepts, selectedDeptId, loadDepts, setDept };
}
