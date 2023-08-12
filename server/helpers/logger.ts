import nconf from "nconf";
import os from "os";
import { createColors } from "picocolors";
import { inspect } from "util";
import { createLogger as createWinstonLogger, format, Logger, transports } from "winston";
const { combine, colorize, label, timestamp, printf } = format;
const { gray, magenta } = createColors(true); // Force colors activation

function pretty(data: unknown) {
  return inspect(data, { colors: true, depth: 3 });
}

const level = nconf.get("debug") === true ? "debug" : "info";

export function createLogger(name: string): Logger {
  return createWinstonLogger({
    transports: [
      new transports.Console({
        level: level,
        format: combine(
          colorize(),
          label({ label: name }),
          timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          printf(({ level, message, label, timestamp, error, json }) => {
            if (error !== undefined) {
              return `[${gray(timestamp)}] [${level}] [${magenta(label)}] : ${message}${os.EOL}${error.stack}`;
            }
            if (json !== undefined) {
              return `[${gray(timestamp)}] [${level}] [${magenta(label)}] : ${message}${os.EOL}${pretty(json)}`;
            }

            return `[${gray(timestamp)}] [${level}] [${magenta(label)}] : ${message}`;
          })
        ),
      }),
    ],
  });
}
