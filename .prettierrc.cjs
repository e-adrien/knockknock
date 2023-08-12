module.exports = {
  plugins: ["@prettier/plugin-pug"],
  printWidth: 120,
  trailingComma: "es5",
  overrides: [
    {
      files: [".eslintrc.cjs", ".prettierrc.cjs", "*.json"],
      options: {
        printWidth: 80,
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
