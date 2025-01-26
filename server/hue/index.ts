import { Client, Dispatcher, ErrorEvent, EventSource, MessageEvent } from "undici";
import { IncomingHttpHeaders } from "undici/types/header.js";
import { createLogger, stringOrNull } from "../helpers/index.js";
import {
  Device,
  HueApiError,
  HueApiSuccess,
  HueEvent,
  HueGroupedLight,
  HueLight,
  parseHueApiResponseJson,
} from "../models/index.js";

const logger = createLogger("express:hue");

export enum PhilipsHueButtonActionType {
  wakeUpDevice = "wakeUpDevice",
  toggleGroupedLight = "toggleGroupedLight",
  toggleLight = "toggleLight",
}

export type PhilipsHueButtonAction = {
  type: PhilipsHueButtonActionType;
  target: string;
};

export type PhilipsHueOptions = {
  bridgeIpAddress: string;
  bridgeDeviceId: string;
  deviceType: string;
  hueUsername: string | null;
  hueApiKey: string | null;
  buttons: { [keyof: string]: PhilipsHueButtonAction } | null;
};

export const philipsHueBridgeRootCA = `-----BEGIN CERTIFICATE-----
MIICMjCCAdigAwIBAgIUO7FSLbaxikuXAljzVaurLXWmFw4wCgYIKoZIzj0EAwIw
OTELMAkGA1UEBhMCTkwxFDASBgNVBAoMC1BoaWxpcHMgSHVlMRQwEgYDVQQDDAty
b290LWJyaWRnZTAiGA8yMDE3MDEwMTAwMDAwMFoYDzIwMzgwMTE5MDMxNDA3WjA5
MQswCQYDVQQGEwJOTDEUMBIGA1UECgwLUGhpbGlwcyBIdWUxFDASBgNVBAMMC3Jv
b3QtYnJpZGdlMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEjNw2tx2AplOf9x86
aTdvEcL1FU65QDxziKvBpW9XXSIcibAeQiKxegpq8Exbr9v6LBnYbna2VcaK0G22
jOKkTqOBuTCBtjAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNV
HQ4EFgQUZ2ONTFrDT6o8ItRnKfqWKnHFGmQwdAYDVR0jBG0wa4AUZ2ONTFrDT6o8
ItRnKfqWKnHFGmShPaQ7MDkxCzAJBgNVBAYTAk5MMRQwEgYDVQQKDAtQaGlsaXBz
IEh1ZTEUMBIGA1UEAwwLcm9vdC1icmlkZ2WCFDuxUi22sYpLlwJY81Wrqy11phcO
MAoGCCqGSM49BAMCA0gAMEUCIEBYYEOsa07TH7E5MJnGw557lVkORgit2Rm1h3B2
sFgDAiEA1Fj/C3AN5psFMjo0//mrQebo0eKd3aWRx+pQY08mk48=
-----END CERTIFICATE----`;

function readButtons(val: unknown): { [keyof: string]: PhilipsHueButtonAction } | null {
  if (typeof val !== "object") {
    return null;
  }

  return val as { [keyof: string]: PhilipsHueButtonAction };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadPhilipsHueOptions(opts: any): PhilipsHueOptions | null {
  if (opts === null || typeof opts !== "object") {
    return null;
  }
  if (
    typeof opts.bridgeIpAddress !== "string" ||
    typeof opts.bridgeDeviceId !== "string" ||
    typeof opts.deviceType !== "string"
  ) {
    return null;
  }

  return {
    bridgeIpAddress: opts.bridgeIpAddress,
    bridgeDeviceId: opts.bridgeDeviceId,
    deviceType: opts.deviceType,
    hueUsername: stringOrNull(opts.hueUsername),
    hueApiKey: stringOrNull(opts.hueApiKey),
    buttons: readButtons(opts.buttons),
  };
}

async function wakeUpDevice(target: string) {
  const deviceMac = target;
  const devices = Device.list();
  const device = devices.find((el) => el.mac === deviceMac);
  if (device !== undefined) {
    await device.wakeup();
    logger.info(`Message correctement envoyé.`);
  } else {
    logger.warn(`Appareil inconnu : ${deviceMac}.`);
  }
}

async function toggleGroupedLight(options: PhilipsHueOptions, target: string) {
  const client = new Client(`https://${options.bridgeIpAddress}`, {
    connect: {
      ca: [philipsHueBridgeRootCA],
      rejectUnauthorized: false,
      servername: options.bridgeDeviceId,
    },
  });

  const responseData = await client.request({
    path: `/clip/v2/resource/grouped_light/${target}`,
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
  const groupedLight = response.data[0];
  if (!(groupedLight instanceof HueGroupedLight)) {
    logger.error("Unexpected API response");
    return;
  }

  await client.request({
    path: `/clip/v2/resource/grouped_light/${target}`,
    method: "PUT",
    headers: {
      "hue-application-key": options.hueUsername!,
    },
    body: JSON.stringify({ on: { on: !groupedLight.isOn() } }),
  });
}

async function toggleLight(options: PhilipsHueOptions, target: string) {
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

  await client.request({
    path: `/clip/v2/resource/light/${target}`,
    method: "PUT",
    headers: {
      "hue-application-key": options.hueUsername!,
    },
    body: JSON.stringify({ on: { on: !light.isOn() } }),
  });
}

async function onMessage(options: PhilipsHueOptions, data: string): Promise<void> {
  for (const event of HueEvent.fromString(data)) {
    if (!event.isButtonEvent() || options.buttons![event.buttonEvent.id] === undefined) {
      continue;
    }

    if (event.buttonEvent.button.last_event !== "initial_press") {
      continue;
    }

    const action = options.buttons![event.buttonEvent.id];
    switch (action.type) {
      case PhilipsHueButtonActionType.wakeUpDevice:
        await wakeUpDevice(action.target);
        break;
      case PhilipsHueButtonActionType.toggleGroupedLight:
        await toggleGroupedLight(options, action.target);
        break;
      case PhilipsHueButtonActionType.toggleLight:
        await toggleLight(options, action.target);
        break;
      default:
        logger.warn(`Unkown action type ${action.type}`);
    }
  }
}

export async function listenPhilipsHueEvents(options: PhilipsHueOptions) {
  class EventSourceClient extends Client {
    constructor(options: PhilipsHueOptions) {
      super(`https://${options.bridgeIpAddress}`, {
        connect: {
          ca: [philipsHueBridgeRootCA],
          rejectUnauthorized: false,
          servername: options.bridgeDeviceId,
        },
        bodyTimeout: 0,
      });
    }

    dispatch(opts: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler) {
      const headers = (opts.headers ?? []) as unknown as IncomingHttpHeaders;
      headers["Accept"] = "text/event-stream";
      headers["hue-application-key"] = options.hueUsername!;
      opts.headers = headers;
      return super.dispatch(opts, handler);
    }
  }

  const client = new EventSourceClient(options);

  const responseData = new EventSource(`https://${options.bridgeIpAddress}/eventstream/clip/v2`, {
    dispatcher: client,
  });

  responseData.addEventListener("open", function () {
    logger.info("Connected to the Philips Hue Bridge.");
  });

  responseData.addEventListener("error", function (event: ErrorEvent) {
    logger.error(`Connection to the Philips Hue Bridge lost. ${event.message}`);
  });

  responseData.addEventListener("message", function (message: MessageEvent<string>) {
    onMessage(options, message.data);
  });
}
