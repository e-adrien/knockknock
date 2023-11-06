import { NextFunction, Request, Response, Router } from "express";
import nconf from "nconf";
import { NeighbourState, deepFreeze, pingDevice, scanDevices, wake } from "../helpers/index.js";

type RequiredDevice = { device: string; delay: number };
type Device = { mac: string; name: string; link: string; require?: RequiredDevice };

const kDevices = Object.freeze((nconf.get("devices") as Array<Device>).map((el) => deepFreeze(el)));

const router = Router();

type AwakableDevice = {
  mac: string;
  name: string;
  link: string;
  awake: boolean;
};

async function listAwakableDevices(): Promise<Array<AwakableDevice>> {
  // Scan neighbours
  const neighbours = await scanDevices();

  // Check which device can be woken up
  const awakableDevices: Array<AwakableDevice> = [];
  for (const device of kDevices) {
    // Check the device status in neighbours
    const neighbour = neighbours.find((neighbour) => device.mac === neighbour.macAddress);

    // Check if the device is in the neighbours list
    if (neighbour === undefined) {
      // The device can be woken up
      awakableDevices.push({ ...device, awake: false });
      continue;
    }

    // Check if the device is awake
    if (neighbour.state === NeighbourState.reachable) {
      // The device is on
      awakableDevices.push({ ...device, awake: true });
      continue;
    }

    // Try to ping the device
    const pingResult = await pingDevice(neighbour.ipAddress);
    awakableDevices.push({ ...device, awake: pingResult.succeeded() });
  }

  // Return the list of awakable devices
  return awakableDevices;
}

router.post("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 0 || kDevices.length <= id) {
      res.sendStatus(404);
      return;
    }

    if (kDevices[id].require !== undefined) {
      await wake(kDevices[id].require!.device);
      setTimeout(() => wake(kDevices[id].mac), kDevices[id].require!.delay * 1000);
    } else {
      await wake(kDevices[id].mac);
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const awakableDevices = await listAwakableDevices();

    res.render("devices", { devices: awakableDevices });
  } catch (err) {
    next(err);
  }
});

export default router;
