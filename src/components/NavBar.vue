<template>
  <v-app-bar ref="appBar" app color="primary" dark elevate-on-scroll>
    <v-container fluid class="nav-container">
    
      <!-- Left -->
      <div ref="left" class="nav-left">
        <v-btn variant="text" class="text-white text-h6" @click="goHome">
          <v-avatar size="32" class="mr-2" v-if="user.picture">
            <img :src="user.picture" />
          </v-avatar>
          <v-icon start v-else>mdi-dumbbell</v-icon>
          Academic Scheduler
        </v-btn>
      </div>

      <!-- Visible nav items -->
      <div ref="nav" class="nav-items">
        <v-btn
          v-for="item in visibleItems"
          :key="item.id"
          variant="text"
          class="text-white nav-btn"
          @click="go(item.route)"
        >
          <v-icon start>{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>

        <v-btn v-if="!overflowItems.length" icon color="white" @click="logout">
          <v-icon>mdi-cog</v-icon>
        </v-btn>

        <v-btn v-if="!overflowItems.length" icon color="white" @click="logout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </div>

      <!-- Hamburger (only if needed) -->
      <div v-if="overflowItems.length" class="nav-hamburger">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn icon v-bind="props">
              <v-icon>mdi-menu</v-icon>
            </v-btn>
          </template>

          <v-list>
            <v-list-item
              v-for="item in overflowItems"
              :key="item.id"
              @click="go(item.route)"
            >
              <v-icon start>{{ item.icon }}</v-icon>
              {{ item.title }}
            </v-list-item>

            <v-divider />

            <v-list-item @click="logout">
              <v-icon start>mdi-cog</v-icon>
              Settings
            </v-list-item>
            <v-list-item @click="logout">
              <v-icon start>mdi-logout</v-icon>
              Logout
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- Measures exact widths -->
      <div ref="measure" class="measure-container">
        <v-btn
          v-for="item in navItems"
          :key="item.id"
          class="nav-btn"
        >
          <v-icon start>{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>
      </div>


    </v-container>
  </v-app-bar>

</template>

<script>
  import { useDisplay } from "vuetify";
  import Utils from "../config/utils";
  
  export default {
    name: "NavBar",
    setup() {
      const display = useDisplay();
      return {
        isMobile: display.mbAndDown, 
      };
    },
    data() {
      const user = Utils.getStore("user");
      return {
        user,
        visibleItems: [],
        overflowItems: [],
        navItems: [
          { id: 1, title: "Schedules", icon: "mdi-calendar-blank", route: "/schedules" },
          { id: 2, title: "Employees", icon: "mdi-account-group", route: "/employees" },
          { id: 3, title: "Shifts", icon: "mdi-briefcase", route: "/shifts" },
          { id: 4, title: "Tradeboard", icon: "mdi-swap-horizontal-bold", route: "/tradeboard" },
          { id: 5, title: "Tasks", icon: "mdi-clipboard-check-outline", route: "/tasks" },
          { id: 6, title: "Requests", icon: "mdi-calendar-question", route: "/requests" },
          { id: 7, title: "Timesheets", icon: "mdi-clipboard-clock-outline", route: "/timesheets" },
          { id: 8, title: "Payroll", icon: "mdi-cash-multiple", route: "/payroll" },
        ],
      };
    },
    mounted() {
      this.$nextTick(() => {
        this.calculateItems();

        this.resizeObserver = new ResizeObserver(() => {
          this.calculateItems();
        });

        this.resizeObserver.observe(this.$refs.appBar.$el);
      });
    },
    beforeUnmount() {
        this.resizeObserver?.disconnect();
    },
    methods: {
      calculateItems() {
        if (!this.$refs.measure || !this.$refs.left) return;

        const appBarWidth = this.$refs.appBar.$el.clientWidth;
        const leftWidth = this.$refs.left.offsetWidth;
        const hamburgerWidth = 48;
        const padding = 32;

        const available = appBarWidth - leftWidth - hamburgerWidth - padding;

        const buttons = [...this.$refs.measure.children];

        let used = 0;
        this.visibleItems = [];
        this.overflowItems = [];

        buttons.forEach((btn, index) => {
          const width = btn.offsetWidth;

          if (used + width <= available) {
            used += width;
            this.visibleItems.push(this.navItems[index]);
          } else {
            this.overflowItems.push(this.navItems[index]);
          }
        });
      },

      go(route) {
        this.$router.push(route);
      },
      goHome() {
        const role = Utils.getStore("user")?.role;
        this.$router.push(role === "coach" ? "/coach" : "/athlete");
      },
      logout() {
        Utils.removeItem("user");
        Utils.removeItem("selectedRole");
        this.$router.push("/start");
      },
    },
  };
</script>

<style scoped>
  /* Wrap items properly in the navigation bar container */
  .nav-container {
    display: flex;
    align-items: center;
    width: 100%;
    overflow: hidden;
  }

  .nav-left {
    flex-shrink: 0;
  }

  /* Stop the nav items from wrapping and clipping */
  .nav-items {
    white-space: nowrap;
    margin-left: auto;
  }

  .nav-hamburger {
    margin-left: 8px;
  }

  /* Measurement container */
  .measure-container {
    position: absolute;
    visibility: hidden;
    height: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .nav-btn {
    flex-shrink: 0;
  }
</style>