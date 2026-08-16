import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      /*
       * `server-only` is a build-time tripwire that throws when a bundler pulls it into a client
       * build. Under vitest there is no client graph for it to protect, and it otherwise makes any
       * route handler that touches lib/pricing/*-server impossible to unit test. Stubbed here only;
       * the Next build still enforces it.
       */
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
