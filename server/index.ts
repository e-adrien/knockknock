import nconf from "nconf";
import path from "path";
import { fileURLToPath } from "url";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));

nconf.file({ file: path.resolve(serverRootPath, "../config/config.json") });

void (async () => {
  await import("./server.js");
})();
