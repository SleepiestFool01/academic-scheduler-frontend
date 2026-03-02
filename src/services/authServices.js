import apiClient from "./services.js";

export default {
  loginUser(user) {
    // POST /workerscheduling-t9/login
    return apiClient.post("/login", user);
  },
  authorizeUser(code) {
    return apiClient.post("/authorize", code);
  },
  logoutUser(token) {
    return apiClient.post("/logout", token);
  },
};