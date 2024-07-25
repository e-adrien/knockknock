const config = {
  plugins: ["@prettier/plugin-pug"],
  printWidth: 120,
  trailingComma: "es5",
  overrides: [
    {
      files: ["eslint.config.js", "prettier.config.js", "*.json", "*.md"],
      options: {
        printWidth: 80,
      },
    },
    {
      files: ["tsconfig.json"],
      options: {
        trailingComma: "none",
      },
    },
    {
      files: ["*.pug"],
      options: {
        printWidth: 240,
      },
    },
    {
      files: ["*.scss"],
      options: {
        singleQuote: true,
      },
    },
  ],
  pugExplicitDiv: true,
  pugAttributeSeparator: "always",
  pugIdNotation: "as-is",
  pugClassNotation: "attribute",
};

export default config;
