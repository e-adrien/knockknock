import { NextFunction, Request, Response, Router } from "express";
import { isArray } from "lodash";
import nconf from "nconf";
import { findLocalDevices } from "../helpers/local-devices";
import { wake } from "../helpers/wakeonlan";

type Device = { mac: string; name: string; link: string };

const kDevices = Object.freeze((nconf.get("devices") as Array<Device>).map((el) => Object.freeze(el)));

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

    await wake(kDevices[id].mac);

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
