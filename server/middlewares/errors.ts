import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";

export function logError(logger: Logger): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function (err: Error, req: Request, res: Response, next: NextFunction) {
    // Log the error
    logger.error(err.message, { error: err });

    // Check if it's an AJAX Request
    if (req.xhr === true) {
      // Send the Error Status
      res.status(500).json({ error: err.message }).end();
    } else {
      // Render the Error Page
      res.status(500).render("error", { code: 500, message: err.message });
    }
  };
}
