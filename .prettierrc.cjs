module.exports = {
  plugins: ["@prettier/plugin-pug"],
  printWidth: 120,
  trailingComma: "es5",
  overrides: [
    {
      files: [".eslintrc.*", ".prettierrc.*", "*.json", "*.md"],
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
  ],
  pugExplicitDiv: true,
  pugAttributeSeparator: "always",
  pugIdNotation: "as-is",
  pugClassNotation: "attribute",
};
