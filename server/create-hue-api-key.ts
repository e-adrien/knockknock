import nconf from "nconf";
import { resolve } from "path";
import { Client } from "undici";
import { fileURLToPath } from "url";
import { PhilipsHueOptions, loadPhilipsHueOptions, philipsHueBridgeRootCA } from "./hue/index.js";
import { HueApiError, HueApiResponse, HueApiSuccess, parseHueApiResponseJson } from "./models/index.js";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));

nconf.file({ file: resolve(serverRootPath, "../config/config.json") });

function waitForKeyPressed(): Promise<string> {
  return new Promise((resolve) => {
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      process.stdin.setRawMode?.(wasRaw);
      resolve(data.toString("utf8"));
    });
  });
}

async function sendKeyCreationRequest(
  client: Client,
  philipsHueOptions: PhilipsHueOptions
): Promise<HueApiError | HueApiSuccess> {
  const responseData = await client.request({
    path: "/api",
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      devicetype: philipsHueOptions.deviceType,
      generateclientkey: true,
    }),
  });
  const response = parseHueApiResponseJson(await responseData.body.json());

  if (response instanceof HueApiResponse) {
    throw new Error("Unexpected API response");
  }

  return response;
}

const philipsHueOptions = loadPhilipsHueOptions(nconf.get("philipsHue"));
if (philipsHueOptions === null) {
  console.error(`[WARNING] Missing Philips Hue configuration`);
  process.exitCode = 1;
} else {
  // Create a client
  const client = new Client(`https://${philipsHueOptions.bridgeIpAddress}`, {
    connect: {
      ca: [philipsHueBridgeRootCA],
      rejectUnauthorized: false,
      servername: philipsHueOptions.bridgeDeviceId,
    },
  });

  // Get an API key
  try {
    let response = await sendKeyCreationRequest(client, philipsHueOptions);
    if (response instanceof HueApiError) {
      if (response.description !== "link button not pressed") {
        throw response;
      }

      console.log("Press the button on your Philips Hue Bridge and then press any key to continue... ");
      await waitForKeyPressed();
      response = await sendKeyCreationRequest(client, philipsHueOptions);
    }

    if (response instanceof HueApiError) {
      throw response;
    }

    console.log(`\nCreated key\n   username: ${response.username}\n   clientkey: ${response.clientkey}\n`);
  } catch (error) {
    console.error(error);
  }
}
