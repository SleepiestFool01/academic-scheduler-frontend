<template>
    <v-app-bar app color="primary" dark elevate-on-scroll>
      <v-container>
        <v-row align="center" justify="space-between">
          <!-- Left: App title -->
          <v-col cols="auto">
          <v-btn variant="text" class="text-white text-h6" @click="goHome">
            <v-avatar size="32" class="mr-2" v-if="user.picture">
             <img :src="user.picture" />
            </v-avatar>
            <v-icon left v-else>mdi-dumbbell</v-icon>
            Academic Scheduler
          </v-btn>
        </v-col>
  
          <!-- Right: Navigation links -->
          <v-col cols="auto">
            <v-btn
              v-for="item in navItems"
              :key="item.title"
              text
              class="text-white"
              @click="go(item.route)"
            >
              <v-icon left>{{ item.icon }}</v-icon>
              {{ item.title }}
            </v-btn>

            <v-btn icon color="white" @click="logout">
              <v-icon>mdi-cog</v-icon>
            </v-btn>
  
            <v-btn icon color="white" @click="logout">
              <v-icon>mdi-logout</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>
  </template>
  
  <script>
  import Utils from "../config/utils";
  
  export default {
    name: "NavBar",
    data() {
      const user = Utils.getStore("user");
      return {
        user,
        navItems: [
          { title: "Schedules", icon: "mdi-account-circle", route: "/schedules" },
          { title: "Employees", icon: "mdi-account-group", route: "/employees" },
          { title: "Shifts", icon: "mdi-dumbbell", route: "/shifts" },
          { title: "Tradeboard", icon: "mdi-dumbbell", route: "/tradeboard" },
          { title: "Tasks", icon: "mdi-target", route: "/tasks" },
          { title: "Requests", icon: "mdi-chart-line", route: "/requests" },
          { title: "Timesheets", icon: "mdi-chart-line", route: "/timesheets" },
          { title: "Payroll", icon: "mdi-chart-line", route: "/payroll" },
        ],
      };
    },
    methods: {
      go(route) {
        this.$router.push(route);
      },
      goHome() {
        const user = Utils.getStore("user");
        const role = user.role;       
        if (role === "coach") this.$router.push("/coach");
        else this.$router.push("/athlete");
      },
      logout() {
        Utils.removeItem("user");
        Utils.removeItem("selectedRole");
        this.$router.push("/start");
      },
    },
  };
  </script>