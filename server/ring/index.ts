import { readFileSync, writeFileSync } from "fs";
import { RingApi, RingDevice, RingDeviceType } from "ring-client-api";
import { getTimes } from "suncalc-ts";
import { Client } from "undici";
import { createLogger } from "../helpers/index.js";
import { PhilipsHueOptions, philipsHueBridgeRootCA } from "../hue/index.js";
import { HueApiError, HueApiSuccess, HueLight, parseHueApiResponseJson } from "../models/index.js";

const logger = createLogger("express:ring");

export enum RingContactSensorActionType {
  powerOnLight = "powerOnLight",
}

export type RingContactSensorAction = {
  type: RingContactSensorActionType;
  target: string;
  onlyAtNight?: boolean;
};

type RingLocation = {
  latitude: number;
  longitude: number;
};

export type RingOptions = {
  refreshToken: string;
  contactSensors: { [keyof: string]: RingContactSensorAction } | null;
  philipsHueOptions: PhilipsHueOptions;
  location: RingLocation | null;
};

function readContactSensors(val: unknown): { [keyof: string]: RingContactSensorAction } | null {
  if (typeof val !== "object") {
    return null;
  }

  return val as { [keyof: string]: RingContactSensorAction };
}

function readLocation(val: unknown): RingLocation | null {
  if (val === null || typeof val !== "object") {
    return null;
  }
  if (typeof (val as RingLocation).latitude !== "number" || typeof (val as RingLocation).longitude !== "number") {
    return null;
  }

  return val as RingLocation;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadRingOptions(opts: any, philipsHueOptions: PhilipsHueOptions | null): RingOptions | null {
  if (opts === null || typeof opts !== "object") {
    return null;
  }
  if (typeof opts.refreshToken !== "string" || philipsHueOptions === null) {
    return null;
  }

  return {
    refreshToken: opts.refreshToken,
    contactSensors: readContactSensors(opts.contactSensors),
    philipsHueOptions: philipsHueOptions,
    location: readLocation(opts.location),
  };
}

let isNight = true;
function checkCurrentTime(latitude: number, longitude: number): void {
  const now = new Date();
  const times = getTimes(now, latitude, longitude);

  isNight = now < times.sunriseEnd || times.sunsetStart < now;
}

async function powerOnLight(options: PhilipsHueOptions, target: string): Promise<void> {
  const client = new Client(`https://${options.bridgeIpAddress}`, {
    connect: {
      ca: [philipsHueBridgeRootCA],
      rejectUnauthorized: false,
      servername: options.bridgeDeviceId,
    },
  });

  const responseData = await client.request({
    path: `/clip/v2/resource/light/${target}`,
    method: "GET",
    headers: {
      "hue-application-key": options.hueUsername!,
    },
  });
  const response = parseHueApiResponseJson(await responseData.body.json());
  if (response instanceof HueApiError) {
    logger.error(response);
    return;
  }
  if (response instanceof HueApiSuccess) {
    logger.error("Unexpected API response");
    return;
  }
  const light = response.data[0];
  if (!(light instanceof HueLight)) {
    logger.error("Unexpected API response");
    return;
  }

  if (!light.isOn()) {
    await client.request({
      path: `/clip/v2/resource/light/${target}`,
      method: "PUT",
      headers: {
        "hue-application-key": options.hueUsername!,
      },
      body: JSON.stringify({ on: { on: true } }),
    });
  }
}

function listenContactSensorEvents(options: RingOptions, device: RingDevice, action: RingContactSensorAction): void {
  // Listen events on the device
  logger.info(`Listen data events on the contact sensor ${device.data.zid}`);
  device.onData.subscribe((data) => {
    // Check if the contact sensor is faulted
    if (data.faulted === true) {
      // Power on the ligth
      logger.info(`Faulted contact sensor ${device.data.zid}`);
      if (action.onlyAtNight !== true || isNight) {
        powerOnLight(options.philipsHueOptions, action.target);
      }
    }
  });
}

export async function listenRingEvents(options: RingOptions, configPath: string): Promise<void> {
  try {
    // Create a client
    const ringApi = new RingApi({
      refreshToken: options.refreshToken,
    });

    // Listen refresh token changes
    ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
      const confString = readFileSync(configPath, { encoding: "utf8" });
      writeFileSync(configPath, confString.replace(options.refreshToken, newRefreshToken), { encoding: "utf8" });
      options.refreshToken = newRefreshToken;
      logger.info("Updated Ring refresh token");
    });

    // Monitor day/night changes
    if (options.location !== null) {
      const { latitude, longitude } = options.location!;
      setInterval(() => checkCurrentTime(latitude, longitude), 60000);
    }

    // List devices
    const locations = await ringApi.getLocations();
    for (const location of locations) {
      const devices = await location.getDevices();
      for (const device of devices) {
        if (
          device.deviceType === RingDeviceType.ContactSensor &&
          options.contactSensors![device.data.zid] !== undefined
        ) {
          const action = options.contactSensors![device.data.zid];
          switch (action.type) {
            case RingContactSensorActionType.powerOnLight:
              listenContactSensorEvents(options, device, action);
              break;
            default:
              logger.warn(`Unkown action type ${action.type}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }
}
