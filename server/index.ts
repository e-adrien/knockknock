import nconf from "nconf";
import path from "path";

const serverRootPath = path.resolve(__dirname);
const publicRootPath =
  process.env.TS_NODE_PROJECT !== undefined ? path.resolve(serverRootPath, "../dist") : serverRootPath;

nconf.file({ file: path.resolve(serverRootPath, "../config/config.json") });

import { ensureLoggedIn } from "connect-ensure-login";
import express from "express";
import controllers from "./controllers/index";
import { createLogger } from "./helpers";
import { authentication, kUrlLoginPage, logError, logRequest, overrideHttpMethod, sessions } from "./middlewares";

const logger = createLogger("Express");

const app = express();
app
  .set("view engine", "pug")
  .set("views", path.resolve(serverRootPath, "views"))
  .use(express.static(path.resolve(publicRootPath, "assets"), { etag: false }))
  .use(express.urlencoded({ extended: true }))
  .use(overrideHttpMethod())
  .use(logRequest(logger))
  .use(sessions())
  .use(authentication())
  .use(ensureLoggedIn({ redirectTo: kUrlLoginPage, setReturnTo: false }))
  .use(controllers)
  .use(logError(logger));

const port = nconf.get("port") ?? 3000;
app.listen(port, () => {
  console.log("serverListens on " + port);
});
