import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import * as espree from "espree";
import globals from "globals";
import { join } from "path";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: [
      "package.json",
      "package-lock.json",
      "eslint.config.js",
      "prettier.config.js",
      "node_modules/*",
      ".yarn/*",
      "dist/*",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [],
          defaultProject: join(import.meta.dirname, "server/tsconfig.json"),
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        globals: {
          ...globals.es2022,
          ...globals.node,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["public/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        globals: {
          ...globals.es2022,
          ...globals.browser,
        },
      },
    },
  },
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
    languageOptions: {
      parser: espree,
      sourceType: "commonjs",
      ecmaVersion: 2022,
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
    },
  }
);
