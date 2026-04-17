import apiClient from "./services.js";

export default {
  loginUser(user) {
    // POST /workerscheduling-t9/login
    return apiClient.post("/login", user);
  },
  authorizeUser(id_user, code) {
    return apiClient.post(`/authorize/${id_user}`, code);
  },
  logoutUser(token) {
    return apiClient.post("/logout", token);
  },
};
