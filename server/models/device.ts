import nconf from "nconf";
import { wake } from "../helpers/index.js";

class RequiredDevice {
  public readonly device: string;
  public readonly delay: number;

  constructor(device: string, delay: number) {
    this.device = device;
    this.delay = delay;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static loadFromConf(data: any): RequiredDevice | undefined {
    if (data === null || typeof data !== "object") {
      return undefined;
    }
    if (typeof data.device !== "string" || typeof data.delay !== "number") {
      return undefined;
    }

    return new RequiredDevice(data.device, data.delay);
  }
}

export class Device {
  public readonly mac: string;
  public readonly name: string;
  public readonly desc: string;
  public readonly link: string;
  public readonly staticIpAddress?: string;
  public readonly require?: RequiredDevice;

  private static kDevices: Array<Device> | null = null;

  constructor(
    mac: string,
    name: string,
    desc: string,
    link: string,
    staticIpAddress?: string,
    require?: RequiredDevice
  ) {
    this.mac = mac;
    this.name = name;
    this.desc = desc;
    this.link = link;
    this.staticIpAddress = staticIpAddress;
    this.require = require;
  }

  public async wakeup(): Promise<void> {
    if (this.require !== undefined) {
      await wake(this.require.device);
      setTimeout(() => wake(this.mac), this.require.delay * 1000);
    } else {
      await wake(this.mac);
    }
  }

  public static list(): Array<Device> {
    if (Device.kDevices === null) {
      Device.kDevices = (nconf.get("devices") as Array<Device>).map((el) => Device.loadFromConf(el));
    }

    return Device.kDevices;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static loadFromConf(data: any): Device {
    const require = data.require ? RequiredDevice.loadFromConf(data.require) : undefined;

    return new Device(data.mac, data.name, data.desc, data.link, data.staticIpAddress, require);
  }
}
