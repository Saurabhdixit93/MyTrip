import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // shadcn/ui generated primitives keep their upstream style.
    files: ["components/ui/**"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "db/generated/**", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
