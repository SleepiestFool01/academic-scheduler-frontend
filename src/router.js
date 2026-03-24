import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

import LoginStart  from "./views/LoginStart.vue";
import SelectRole  from "./views/SelectRole.vue";
import GoogleAuth  from "./views/GoogleAuth.vue";
import Dashboard   from "./views/Dashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

    // ── Auth ─────────────────────────────────────────────────────────────────
    { path: "/",            redirect: "/start" },
    { path: "/start",       component: LoginStart },
    { path: "/select-role", component: SelectRole },
    { path: "/google-auth", component: GoogleAuth },

    // ── App ──────────────────────────────────────────────────────────────────
    { path: "/dashboard",   component: Dashboard },
    { path: "/manage",      component: () => import("./views/EmployeeManagement.vue") },
    { path: "/tradeboard",  component: () => import("./views/Tradeboard.vue") },
    { path: "/tasks",       component: () => import("./views/Tasks.vue") },
    { path: "/requests",    component: () => import("./views/Requests.vue") },
    { path: "/templates",        component: () => import("./views/Templates.vue") },
    { path: "/templates/:id",    component: () => import("./views/TemplateEditor.vue") },
    { path: "/department",  component: () => import("./views/DepartmentPage.vue") },
    { path: "/shifts",      component: () => import("./views/ShiftsPage.vue") },

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