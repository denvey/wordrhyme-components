import { defineConfig } from "tsdown";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  resolve: {
    alias: {
      "@": path.resolve(dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
  tsconfig: "tsconfig.json",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "zod",
    "@wordrhyme/shadcn",
    "@wordrhyme/shadcn-ui",
    "@formily/core",
    "@formily/react",
    "@formily/reactive",
    "@formily/json-schema",
    "@tanstack/react-table",
    "@tanstack/react-virtual",
    "lucide-react",
    "sonner",
    "vaul",
    "cmdk",
    "date-fns",
    "react-day-picker",
    "clsx",
    "tailwind-merge",
    "class-variance-authority",
  ],
});
