import { createRouter, createWebHashHistory } from "vue-router";
import Utils from "./config/utils";

import LoginStart  from "./views/LoginStart.vue";
import SelectRole  from "./views/SelectRole.vue";
import GoogleAuth  from "./views/GoogleAuth.vue";
import AppLayout   from "./layouts/AppLayout.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [

    // ── Auth ─────────────────────────────────────────────────────────────────
    { path: "/",            redirect: "/start" },
    { path: "/start",       component: LoginStart },
    { path: "/select-role", component: SelectRole },
    { path: "/google-auth", component: GoogleAuth },

    // ── App (shared navbar via AppLayout) ────────────────────────────────────
    {
      path: "/",
      component: AppLayout,
      children: [
        { path: "dashboard",       component: () => import("./views/Dashboard.vue") },
        { path: "department",      component: () => import("./views/DepartmentPage.vue") },
        { path: "manage",          component: () => import("./views/EmployeeManagement.vue") },
        { path: "tradeboard",      component: () => import("./views/Tradeboard.vue") },
        { path: "tasks",           component: () => import("./views/Tasks.vue") },
        { path: "requests",        component: () => import("./views/Requests.vue") },
        { path: "availability",    component: () => import("./views/Availability.vue") },
        { path: "templates",       component: () => import("./views/Templates.vue") },
        { path: "templates/:id",   component: () => import("./views/TemplateEditor.vue") },
        { path: "shifts",          component: () => import("./views/ShiftsPage.vue") },
        { path: "settings",        component: () => import("./views/Settings.vue") },
      ],
    },

    // ── Unknown paths → login ─────────────────────────────────────────────────
    { path: "/:pathMatch(.*)*", redirect: "/start" },
  ],
});

// Navigation guard — protect routes that require login
router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  const publicPaths = ["/start", "/select-role", "/google-auth"];

  if (!user && !publicPaths.includes(to.path)) {
    return next("/start");
  }
  next();
});

export default router;
