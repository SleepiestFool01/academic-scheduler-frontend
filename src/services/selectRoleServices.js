import apiClient from "./services.js";

export default {
  // PUT /workerscheduling-t9/employees/role/:id_employee
  updateRole(id_employee, role) {
    return apiClient.put(`/employees/role/${id_employee}`, { role });
  },
};