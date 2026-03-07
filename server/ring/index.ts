import { readFileSync, writeFileSync } from "fs";
import { Location, RingApi, RingDevice, RingDeviceType } from "ring-client-api";
import { StreamingSession } from "ring-client-api/streaming/streaming-session";
import { getTimes } from "suncalc-ts";
import { Client } from "undici";
import { createLogger } from "../helpers/index.js";
import { PhilipsHueOptions, philipsHueBridgeRootCA } from "../hue/index.js";
import { HueApiError, HueApiSuccess, HueLight, parseHueApiResponseJson } from "../models/index.js";

const logger = createLogger("express:ring");

export enum RingContactSensorActionType {
  powerOnLight = "powerOnLight",
  startLiveStream = "startLiveStream",
}

export type RingContactSensorAction =
  | {
      type: RingContactSensorActionType.powerOnLight;
      target: string;
      onlyAtNight?: boolean;
    }
  | {
      type: RingContactSensorActionType.startLiveStream;
      target: number;
    };

type RingLocation = {
  latitude: number;
  longitude: number;
};

export type RingOptions = {
  refreshToken: string;
  contactSensors: { [keyof: string]: Array<RingContactSensorAction> | RingContactSensorAction } | null;
  philipsHueOptions: PhilipsHueOptions;
  location: RingLocation | null;
};

function readContactSensors(
  val: unknown
): { [keyof: string]: Array<RingContactSensorAction> | RingContactSensorAction } | null {
  if (typeof val !== "object") {
    return null;
  }

  return val as { [keyof: string]: Array<RingContactSensorAction> | RingContactSensorAction };
}

function castAsArray(val: Array<RingContactSensorAction> | RingContactSensorAction): Array<RingContactSensorAction> {
  return Array.isArray(val) ? val : [val];
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

async function startLiveStream(location: Location, target: number): Promise<StreamingSession | null> {
  try {
    const cameras = await location.cameras;
    const camera = cameras.find((cam) => cam.id === target);
    if (!camera) {
      logger.error(`Camera ${target} can't be found in the location ${location.name}`);
      return null;
    }

    const alarmMode = await location.getAlarmMode();
    if (alarmMode !== "none") {
      logger.warn(`The alarm mode is "${alarmMode}", don't start live stream on camera ${target}`);
      return null;
    }

    const stream = await camera.startLiveCall();
    logger.info(`Started live stream on camera ${target}`);
    stream.onCallEnded.subscribe(() => {
      logger.info(`Live stream ended on camera ${target}`);
    });

    return stream;
  } catch (error) {
    logger.error(`Failed to start live stream on camera ${target}:`, error);
    return null;
  }
}

function stopLiveStream(liveStream: StreamingSession | null, target: number): null {
  try {
    if (liveStream !== null) {
      liveStream.stop();
    }
  } catch (error) {
    logger.error(`Failed to stop live stream on camera ${target}:`, error);
  }

  return null;
}

function listenContactSensorEvents(
  options: RingOptions,
  location: Location,
  device: RingDevice,
  actions: Array<RingContactSensorAction>
): void {
  // Live stream reference to stop it when the contact sensor is no longer faulted
  let liveStream: StreamingSession | null = null;

  // Listen events on the device
  logger.info(`Listen data events on the contact sensor ${device.data.zid}`);
  device.onData.subscribe((data) => {
    // Check if the contact sensor is faulted
    if (data.faulted === true) {
      // Log the event
      logger.info(`Faulted contact sensor ${device.data.zid}`);

      // Iterate through actions
      for (const action of actions) {
        switch (action.type) {
          case RingContactSensorActionType.powerOnLight:
            if (action.onlyAtNight !== true || isNight) {
              powerOnLight(options.philipsHueOptions, action.target);
            }
            break;
          case RingContactSensorActionType.startLiveStream:
            startLiveStream(location, action.target).then((stream) => {
              liveStream = stream;
            });
            break;
        }
      }
    } else {
      // Log the event
      logger.info(`Contact sensor ${device.data.zid} is no longer faulted`);

      // Iterate through actions
      for (const action of actions) {
        switch (action.type) {
          case RingContactSensorActionType.startLiveStream:
            liveStream = stopLiveStream(liveStream, action.target);
            break;
        }
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

    // Iterate through locations
    const locations = await ringApi.getLocations();
    for (const location of locations) {
      // List devices
      const devices = await location.getDevices();
      for (const device of devices) {
        if (
          device.deviceType === RingDeviceType.ContactSensor &&
          options.contactSensors![device.data.zid] !== undefined
        ) {
          // Listen events on the contact sensor
          listenContactSensorEvents(options, location, device, castAsArray(options.contactSensors![device.data.zid]));
        }
      }
    }
  } catch (error) {
    logger.error(error);
  }
}
