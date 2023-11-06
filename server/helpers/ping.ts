import { execa } from "execa";

export class PingResult {
  public readonly transmitted: number;
  public readonly received: number;
  public readonly loss: number;
  public readonly time: number;

  constructor(transmitted: number, received: number, loss: number, time: number) {
    this.transmitted = transmitted;
    this.received = received;
    this.loss = loss;
    this.time = time;
  }

  public succeeded(): boolean {
    return this.transmitted === this.received;
  }

  public static parseString(string: string): PingResult {
    const matches = string.match(
      /([0-9]+)\s+packets transmitted, ([0-9]+)\s+received, ([0-9]+)% packet loss, time ([0-9]+)ms/m
    );
    if (matches == null) {
      throw new Error(`Can't parse the ping command output`);
    }

    const [, transmitted, received, loss, time] = matches;

    return new PingResult(parseInt(transmitted, 10), parseInt(received, 10), parseInt(loss, 10), parseInt(time, 10));
  }
}

export async function pingDevice(ipAddress: string): Promise<PingResult> {
  try {
    const { stdout } = await execa("ping", ["-c", "1", "-w", "1", ipAddress]);

    return PingResult.parseString(stdout);
  } catch (error) {
    throw new Error("Can't ping device");
  }
}
