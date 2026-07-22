import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: true,
    environmentOptions: {
      jsdom: {
        url: "http://localhost/Yuwenke/",
      },
    },
  },
});
