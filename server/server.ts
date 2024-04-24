import nconf from "nconf";
import path from "path";
import { fileURLToPath } from "url";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));
const publicRootPath =
  process.env.TS_NODE_PROJECT !== undefined ? path.resolve(serverRootPath, "../dist") : serverRootPath;

import { ensureLoggedIn } from "connect-ensure-login";
import express from "express";
import controllers from "./controllers/index.js";
import { createDiscordBot, loadDiscordBotOptions } from "./discord/index.js";
import { createLogger } from "./helpers/index.js";
import { listenPhilipsHueEvents, loadPhilipsHueOptions } from "./hue/index.js";
import {
  authentication,
  kUrlLoginPage,
  logError,
  logRequest,
  overrideHttpMethod,
  sessions,
} from "./middlewares/index.js";

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

const discordOptions = loadDiscordBotOptions(nconf.get("discord"));
if (discordOptions !== null) {
  createDiscordBot(serverRootPath, discordOptions);
}

const philipsHueOptions = loadPhilipsHueOptions(nconf.get("philipsHue"));
if (
  philipsHueOptions !== null &&
  philipsHueOptions.hueApiKey !== null &&
  philipsHueOptions.hueUsername !== null &&
  philipsHueOptions.buttons !== null
) {
  listenPhilipsHueEvents(philipsHueOptions);
}
