import { Client } from "undici";
import { Device, HueEvent } from "../models/index.js";

export type PhilipsHueOptions = {
  bridgeIpAddress: string;
  bridgeDeviceId: string;
  deviceType: string;
  hueUsername: string | null;
  hueApiKey: string | null;
  buttonsActions: { [keyof: string]: string } | null;
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

function stringOrNull(val: unknown): string | null {
  if (typeof val !== "string") {
    return null;
  }

  return val === "" ? null : val;
}

function readButtonsActions(val: unknown): { [keyof: string]: string } | null {
  if (typeof val !== "object") {
    return null;
  }

  return val as { [keyof: string]: string };
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
    buttonsActions: readButtonsActions(opts.buttonsActions),
  };
}

export async function listenPhilipsHueEvents(options: PhilipsHueOptions) {
  const client = new Client(`https://${options.bridgeIpAddress}`, {
    connect: {
      ca: [philipsHueBridgeRootCA],
      rejectUnauthorized: false,
      servername: options.bridgeDeviceId,
    },
  });

  const responseData = await client.request({
    path: "/eventstream/clip/v2",
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "hue-application-key": options.hueUsername!,
    },
    bodyTimeout: 0,
  });
  responseData.body.on("data", async (data: Buffer) => {
    for (const event of HueEvent.fromString(data.toString("utf8"))) {
      if (!event.isButtonEvent() || options.buttonsActions![event.buttonEvent.id] === undefined) {
        continue;
      }

      if (event.buttonEvent.button.last_event !== "initial_press") {
        continue;
      }

      console.log(event.buttonEvent);
      const deviceMac = options.buttonsActions![event.buttonEvent.id] as string;
      const devices = Device.list();
      const device = devices.find((el) => el.mac === deviceMac);
      if (device !== undefined) {
        await device.wakeup();
        console.log(`Message correctement envoyé.`);
      } else {
        console.log(`Appareil inconnu : ${deviceMac}.`);
      }
    }
  });
}
