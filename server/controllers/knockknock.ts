import { NextFunction, Request, Response, Router } from "express";
import nconf from "nconf";
import { Neighbour, NeighbourState, deepFreeze, pingDevice, scanDevices, wake } from "../helpers/index.js";

type RequiredDevice = { device: string; delay: number };
type Device = { mac: string; name: string; link: string; staticIpAddress?: string; require?: RequiredDevice };

const kDevices = Object.freeze((nconf.get("devices") as Array<Device>).map((el) => deepFreeze(el)));

const router = Router();

type AwakableDevice = {
  mac: string;
  name: string;
  link: string;
  awake: boolean;
};

async function checkDevice(neighbours: Array<Neighbour>, device: Device): Promise<AwakableDevice> {
  // Check the device status in neighbours
  const neighbour = neighbours.find((neighbour) => device.mac === neighbour.macAddress);

  // Check if the device is awake
  if (neighbour?.state === NeighbourState.reachable) {
    // The device is on
    return { ...device, awake: true };
  }

  // Check if we can ping the device
  const knownIpAddress = neighbour?.ipAddress ?? device.staticIpAddress;
  if (knownIpAddress === undefined) {
    // The device is off
    return { ...device, awake: false };
  }

  // Try to ping the device
  const pingResult = await pingDevice(knownIpAddress);
  return { ...device, awake: pingResult.succeeded() };
}

async function listAwakableDevices(): Promise<Array<AwakableDevice>> {
  // Scan neighbours
  const neighbours = await scanDevices();

  // Check which device can be woken up
  const awakableDevices: Array<AwakableDevice> = await Promise.all(
    kDevices.map((device) => checkDevice(neighbours, device))
  );

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
