import nconf from "nconf";
import { resolve } from "path";
import { RingApi } from "ring-client-api";
import { fileURLToPath } from "url";
import { loadPhilipsHueOptions } from "./hue/index.js";
import { loadRingOptions } from "./ring/index.js";

const serverRootPath = fileURLToPath(new URL(".", import.meta.url));

nconf.file({ file: resolve(serverRootPath, "../config/config.json") });

const philipsHueOptions = loadPhilipsHueOptions(nconf.get("philipsHue"));
const ringOptions = loadRingOptions(nconf.get("ring"), philipsHueOptions);
if (philipsHueOptions === null) {
  console.error(`[WARNING] Missing Philips Hue configuration`);
  process.exitCode = 1;
} else if (philipsHueOptions.hueUsername === null) {
  console.error(`[WARNING] Missing Philips Hue API username`);
  process.exitCode = 1;
} else if (ringOptions === null) {
  console.error(`[WARNING] Missing Ring configuration`);
  process.exitCode = 1;
} else {
  // Create a client
  const ringApi = new RingApi({
    refreshToken: ringOptions.refreshToken,
  });

  // List devices
  try {
    const locations = await ringApi.getLocations();
    for (const location of locations) {
      console.log(
        `\nLocation "${location.name}" (id: ${location.locationId} - mode: ${await location.getAlarmMode()}):`
      );

      const devices = await location.getDevices();
      for (const device of devices) {
        console.log(`   - ${device.deviceType} (id: ${device.zid})`);
      }

      const cameras = await location.cameras;
      for (const camera of cameras) {
        console.log(`   - ${camera.deviceType} (id: ${camera.id})`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}
