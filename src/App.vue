<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
import { onMounted } from "vue";
import { useTheme } from "./composables/useTheme.js";

// Initialize theme from localStorage on app mount
const { isDark } = useTheme();
onMounted(() => {
  document.documentElement.setAttribute("data-theme", isDark.value ? "dark" : "light");
});
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  font-family: "Roboto", sans-serif;
}
</style>

