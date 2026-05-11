import path from "node:path";
import { mergeConfig } from "vitest/config";
import baseConfig from "@internal/vitest-config";

export default mergeConfig(baseConfig, {
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
