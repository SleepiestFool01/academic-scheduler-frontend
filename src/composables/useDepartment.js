import { ref, watch } from "vue";
import { getManagerDepartments, getEmployeeDepartments, getAllDepartments, createManagerDepartment, createEmployeeDepartment, getDepartment } from "../services/departmentService.js";
import Utils from "../config/utils.js";

const STORAGE_KEY = "selectedDeptId";

// Module-level singletons — shared across all components and persist across
// route navigations because they live at module scope (not component scope).
const myDepts        = ref([]);
const selectedDeptId = ref(Number(Utils.getStore(STORAGE_KEY)) || null);

// Auto-persist any change to selectedDeptId so the user's current department
// survives page refreshes regardless of *how* it was changed (setDept, direct
// mutation, etc.). This is the source of truth for cross-page persistence.
watch(selectedDeptId, (id) => {
  if (id) Utils.setStore(STORAGE_KEY, Number(id));
  else    Utils.removeItem(STORAGE_KEY);
});

function setDept(id) {
  selectedDeptId.value = id ? Number(id) : null;
}

async function loadDepts(user) {
  if (!user) return;
  const empId     = user.id_employee;
  const primaryId = user.id_department;
  const role      = user.role;
  const isAdmin   = role === "Admin";
  const isManager = role === "Manager";
  // Anything that isn't Admin/Manager is treated as a regular Employee.
  const isEmployee = !isAdmin && !isManager;

  try {
    // Pick the right junction endpoint for the user's role.
    // Admins skip the junction entirely — they auto-get every department.
    let junctionPromise = Promise.resolve({ data: [] });
    if (!isAdmin && empId) {
      junctionPromise = isEmployee
        ? getEmployeeDepartments(empId)
        : getManagerDepartments(empId);
    }

    const [junctionRes, allDeptsRes] = await Promise.allSettled([
      junctionPromise,
      getAllDepartments(),
    ]);

    const allDepts    = allDeptsRes.status  === "fulfilled" ? (allDeptsRes.value.data  || []) : [];
    const junctionRows = junctionRes.status === "fulfilled" ? (junctionRes.value.data || []) : [];

    if (isAdmin) {
      // Admin: full access to every department in the system.
      myDepts.value = allDepts;
    } else {
      const junctionDeptIds = new Set(junctionRows.map(j => Number(j.id_department)));
      const deptIdSet = new Set(junctionDeptIds);
      if (primaryId) deptIdSet.add(Number(primaryId));

      // Backfill the junction row for the primary department so membership
      // is canonical regardless of which field callers read from. Managers
      // go to managerDepartment; everyone else to employeeDepartment. This
      // also makes "remove from department" work for the primary dept —
      // without the junction row there'd be nothing to delete.
      if (empId && primaryId && !junctionDeptIds.has(Number(primaryId))) {
        try {
          if (isManager) {
            await createManagerDepartment({ id_employee: empId, id_department: primaryId });
          } else if (isEmployee) {
            await createEmployeeDepartment({ id_employee: empId, id_department: primaryId });
          }
        } catch (_) { /* ignore duplicate / error */ }
      }

      // Filter the full dept list to the ones this user belongs to. We
      // coerce both sides to Number because Sequelize can return int
      // foreign keys as strings in some configurations, which would
      // otherwise make the Set lookup silently miss.
      myDepts.value = allDepts.filter(d => deptIdSet.has(Number(d.id_department)));

      // Safety net: if allDepts didn't contain any of the user's dept IDs
      // (possible after an incomplete initial fetch or if the user's
      // primary dept was just created), hydrate the missing entries by
      // fetching each dept individually. This prevents the pathological
      // state where the user has a valid id_department but myDepts is
      // empty, which makes /department show "not assigned to any".
      const haveIds = new Set(myDepts.value.map(d => Number(d.id_department)));
      const missingIds = [...deptIdSet].filter(id => !haveIds.has(Number(id)));
      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map(id => getDepartment(id).then(r => r.data).catch(() => null))
        );
        for (const d of fetched) {
          if (d && d.id_department != null) myDepts.value = [...myDepts.value, d];
        }
      }
    }

    // If stored selection is no longer valid, fall back to first.
    // Coerce to Number on both sides to avoid string/number mismatches
    // that could otherwise wipe out a perfectly good persisted selection.
    const currentId = selectedDeptId.value != null ? Number(selectedDeptId.value) : null;
    const valid = currentId != null && myDepts.value.some(d => Number(d.id_department) === currentId);
    if (!valid) setDept(myDepts.value[0]?.id_department || null);
    else if (currentId !== selectedDeptId.value) setDept(currentId);
  } catch (err) {
    console.error("useDepartment: failed to load departments", err);
  }
}

export function useDepartment() {
  return { myDepts, selectedDeptId, loadDepts, setDept };
}
