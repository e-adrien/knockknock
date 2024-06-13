import { NextFunction, Request, Response, Router } from "express";

import { AwakableDevice, Device } from "../models/index.js";

const router = Router();

router.post("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const devices = Device.list();
    if (isNaN(id) || id < 0 || devices.length <= id) {
      res.sendStatus(404);
      return;
    }

    await devices[id].wakeup();

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const awakableDevices = await AwakableDevice.listAwakableDevices();

    res.render("devices", { devices: awakableDevices });
  } catch (err) {
    next(err);
  }
});

export default router;
