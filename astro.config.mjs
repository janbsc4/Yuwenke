import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://janbsc4.github.io",
  base: "/Yuwenke",
  trailingSlash: "always",
  integrations: [react()],
  vite: {
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 700,
    },
  },
});
