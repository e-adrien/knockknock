import { Neighbour, NeighbourState, pingDevice, scanDevices } from "../helpers/index.js";
import { Device } from "./device.js";

async function checkDevice(neighbours: Array<Neighbour>, device: Device): Promise<AwakableDevice> {
  // Check the device status in neighbours
  const neighbour = neighbours.find((neighbour) => device.mac === neighbour.macAddress);

  // Check if the device is awake
  if (neighbour?.state === NeighbourState.reachable) {
    // The device is on
    return { ...device, awake: true };
  }

  // Check if we can ping the device
  const knownIpAddress = neighbour?.ipAddress ?? device.staticIpAddress;
  if (knownIpAddress === undefined) {
    // The device is off
    return { ...device, awake: false };
  }

  // Try to ping the device
  const pingResult = await pingDevice(knownIpAddress);
  return { ...device, awake: pingResult.succeeded() };
}

export class AwakableDevice {
  public readonly mac: string;
  public readonly name: string;
  public readonly link: string;
  public readonly awake: boolean;

  constructor(mac: string, name: string, link: string, awake: boolean) {
    this.mac = mac;
    this.name = name;
    this.link = link;
    this.awake = awake;
  }

  static async listAwakableDevices(): Promise<Array<AwakableDevice>> {
    // Scan neighbours
    const neighbours = await scanDevices();

    // Check which device can be woken up
    const awakableDevices: Array<AwakableDevice> = await Promise.all(
      Device.list().map((device) => checkDevice(neighbours, device))
    );

    // Return the list of awakable devices
    return awakableDevices;
  }
}
