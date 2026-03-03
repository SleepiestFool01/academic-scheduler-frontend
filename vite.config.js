import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

import dns from "dns";
dns.setDefaultResultOrder("verbatim");

export default () => {
  const baseURL =
    process.env.APP_ENV === "development" ? "/" : "/sev2026/t9/";

  return defineConfig({
    plugins: [vue(), vuetify({ autoImport: true })],

    server: {
      host: "localhost",
      port: 8081,

      // ── Dev proxy ─────────────────────────────────────────────────────────
      // In services.js, DEV baseURL is "http://localhost/workerscheduling-t9".
      // Vite intercepts those requests here and forwards them to Express on
      // port 3129, stripping the prefix so your Express routes work as-is.
      // No CORS config needed on the backend for local development.
      proxy: {
        "/workerscheduling-t9": {
          target: "http://localhost:3129",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/workerscheduling-t9/, ""),
        },
      },
    },

    base: baseURL,
  });
};