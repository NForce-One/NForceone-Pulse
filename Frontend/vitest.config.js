import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.js",
    // the default "forks" pool hangs on Windows in this project
    pool: "threads",
    // pre-bundle the huge lucide-react barrel instead of transforming
    // thousands of icon modules per test worker
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: ["lucide-react"],
        },
      },
    },
  },
});
