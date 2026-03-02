<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const user   = ref({});
const error  = ref("");

const loginWithGoogle = () => {
  window.handleCredentialResponse = handleCredentialResponse;
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  console.log("Client ID Loaded:", client);

  window.google.accounts.id.initialize({
    client_id:            client,
    cancel_on_tap_outside: false,
    auto_select:          true,
    callback:             window.handleCredentialResponse,
  });

  window.google.accounts.id.renderButton(
    document.getElementById("parent_id"),
    { type: "standard", theme: "outline", size: "large", text: "signin_with", width: 400 }
  );
};

const handleCredentialResponse = async (response) => {
  error.value = "";
  try {
    const res = await AuthServices.loginUser({ credential: response.credential });
    console.log("Login response:", res.data);
    user.value = res.data;
    Utils.setStore("user", user.value);
    console.log("Logged in as:", user.value);

    console.log("Logged in:", user.value);

    // New users → select their role first
    // Returning users → straight to dashboard
    if (user.value.isNewUser) {
      router.push("/select-role");
    } else {
      router.push("/dashboard");
    }
  } catch (err) {
    console.error("Login error:", err);
    error.value = "Login failed. Please try again.";
  }
};

onMounted(() => {
  loginWithGoogle();
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <div display="flex" id="parent_id"></div>
    </v-row>
    <v-row v-if="error" justify="center" class="mt-2">
      <span style="color: #EF4444; font-size: 13px;">{{ error }}</span>
    </v-row>
  </div>
</template>