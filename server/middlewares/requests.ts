// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../@types/express/index.d.ts" />
import { NextFunction, Request, Response } from "express";
import methodOverride from "method-override";
import { createColors } from "picocolors";
import { Logger } from "winston";

const { gray } = createColors(true); // Force colors activation

export function overrideHttpMethod(): (req: Request, res: Response, next: NextFunction) => void {
  return methodOverride(
    function (req: Request) {
      if (typeof req.query === "object" && "_method" in req.query && typeof req.query._method === "string") {
        const method = req.query._method;
        delete req.query._method;
        return method;
      }

      if (typeof req.body === "object" && "_method" in req.body && typeof req.body._method === "string") {
        const method = req.body._method;
        delete req.body._method;
        return method;
      }
    },
    { methods: ["GET", "POST"] }
  );
}

export function logRequest(logger: Logger): (req: Request, res: Response, next: NextFunction) => void {
  return function (req: Request, res: Response, next: NextFunction): void {
    // Save the current time
    req._startTime = Date.now();

    // Replace the res.end function
    const end = res.end;
    res.end = function (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunk?: any | (() => void),
      encoding?: BufferEncoding | (() => void),
      cb?: () => void
    ): Response {
      // Send the response
      res.end = end;
      if (typeof encoding === "string") {
        res.end(chunk, encoding, cb);
      } else {
        res.end(chunk, encoding);
      }

      // Save the end time
      res.responseTimeMs = Date.now() - req._startTime;

      // Log the request
      logger.info(
        gray(`${req.method} ${req.originalUrl ?? req.url}`) + ` ${res.statusCode} ` + gray(`${res.responseTimeMs}ms`)
      );

      // return
      return res;
    };

    // Call the next middleware
    next();
  };
}
