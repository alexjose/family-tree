import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

const CORE_BOUNDARY_MESSAGE =
  "packages/core is the framework-free domain layer (ADR-005). It must not import " +
  "frameworks, database clients, I/O, or other workspace packages. Depend on a " +
  "repository interface defined in core and implement it in packages/db or adapters.";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // CLI scripts report to stdout by design.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
  {
    // ADR-005: the domain layer must stay free of frameworks and I/O so that federation,
    // plugins, and API extraction remain possible without a rewrite.
    files: ["packages/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "node:fs", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:fs/promises", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:http", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:https", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:net", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:dns", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:child_process", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:worker_threads", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:cluster", message: CORE_BOUNDARY_MESSAGE },
            { name: "node:process", message: CORE_BOUNDARY_MESSAGE },
            { name: "fs", message: CORE_BOUNDARY_MESSAGE },
            { name: "http", message: CORE_BOUNDARY_MESSAGE },
            { name: "https", message: CORE_BOUNDARY_MESSAGE },
            { name: "net", message: CORE_BOUNDARY_MESSAGE },
            { name: "dns", message: CORE_BOUNDARY_MESSAGE },
            { name: "child_process", message: CORE_BOUNDARY_MESSAGE },
          ],
          patterns: [
            {
              group: [
                "next",
                "next/*",
                "react",
                "react-dom",
                "react/*",
                "@supabase/*",
                "hono",
                "hono/*",
                "drizzle-orm",
                "drizzle-orm/*",
                "postgres",
                "pg",
                "@family-tree/db",
                "@family-tree/adapters",
                "@family-tree/ui",
                "@family-tree/api-contract",
                "@family-tree/gedcom",
              ],
              message: CORE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  prettier,
);
