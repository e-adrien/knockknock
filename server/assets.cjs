const { pathExistsSync, ensureDirSync, emptyDirSync, copySync } = require("fs-extra");
const { resolve } = require("path");
const tsConfig = require("./tsconfig.json");

const rootDir = resolve(__dirname, tsConfig.compilerOptions.rootDir);
const outDir = resolve(__dirname, tsConfig.compilerOptions.outDir);

function copyAssets(fromDir, toDir) {
  if (pathExistsSync(toDir)) {
    emptyDirSync(toDir);
  } else {
    ensureDirSync(toDir, { mode: 0o775 });
  }

  copySync(fromDir, toDir);
}

copyAssets(resolve(rootDir, "views"), resolve(outDir, "views"));
