import { NextFunction, Request, Response, Router } from "express";
import { isArray } from "lodash";
import nconf from "nconf";
import { deepFreeze, findLocalDevices, wake } from "../helpers";

type RequiredDevice = { device: string; delay: number };
type Device = { mac: string; name: string; link: string; require?: RequiredDevice };

const kDevices = Object.freeze((nconf.get("devices") as Array<Device>).map((el) => deepFreeze(el)));

const router = Router();

function alwaysAsArray<T>(input: Array<T> | T | undefined): Array<T> {
  if (input === undefined) {
    return [];
  }

  return isArray(input) ? input : [input];
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
    const localDevices = alwaysAsArray(await findLocalDevices());
    const awakableDevices = kDevices.map((device) => {
      return {
        ...device,
        awake: localDevices.some((visible) => visible.mac === device.mac),
      };
    });

    res.render("devices", { devices: awakableDevices, localDevices: localDevices });
  } catch (err) {
    next(err);
  }
});

export default router;
