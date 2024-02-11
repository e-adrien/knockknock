import nconf from "nconf";
import { resolve } from "path";
import { Client } from "undici";
import { fileURLToPath } from "url";
import { loadPhilipsHueOptions, philipsHueBridgeRootCA } from "./hue/index.js";
import { HueApiError, HueApiSuccess, HueDevice, parseHueApiResponseJson } from "./models/index.js";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));

nconf.file({ file: resolve(serverRootPath, "../config/config.json") });

const philipsHueOptions = loadPhilipsHueOptions(nconf.get("philipsHue"));
if (philipsHueOptions === null) {
  console.error(`[WARNING] Missing Philips Hue configuration`);
  process.exitCode = 1;
} else if (philipsHueOptions.hueUsername === null) {
  console.error(`[WARNING] Missing Philips Hue API username`);
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

  // List devices
  try {
    const responseData = await client.request({
      path: "/clip/v2/resource/device",
      method: "GET",
      headers: {
        "hue-application-key": philipsHueOptions.hueUsername!,
      },
    });
    const response = parseHueApiResponseJson(await responseData.body.json());
    if (response instanceof HueApiError) {
      throw response;
    }
    if (response instanceof HueApiSuccess) {
      throw new Error("Unexpected API response");
    }

    for (const device of response.data as Array<HueDevice>) {
      console.log(`\nDevice "${device.metadata.name}" (id: ${device.id}):`);
      for (const service of device.services) {
        console.log(`   - ${service.rtype} (id: ${service.rid})`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}
