import nconf from "nconf";
import { resolve } from "path";
import { fileURLToPath } from "url";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));
const publicRootPath = process.env.TS_NODE_PROJECT !== undefined ? resolve(serverRootPath, "../dist") : serverRootPath;

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
import { listenRingEvents, loadRingOptions } from "./ring/index.js";

const logger = createLogger("express");

const app = express();
app
  .disable("x-powered-by")
  .set("trust proxy", "loopback")
  .set("view engine", "pug")
  .set("views", resolve(serverRootPath, "views"))
  .use(express.static(resolve(publicRootPath, "assets"), { etag: false }))
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
  logger.info(`Server listens on ${port}`);
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

  const ringOptions = loadRingOptions(nconf.get("ring"), philipsHueOptions);
  if (ringOptions !== null && ringOptions.contactSensors !== null) {
    listenRingEvents(ringOptions, resolve(serverRootPath, "../config/config.json"));
  }
}
