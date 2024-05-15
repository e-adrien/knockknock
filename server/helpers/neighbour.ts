import { execa } from "execa";

export enum NeighbourState {
  permanent = "PERMANENT",
  noarp = "NOARP",
  reachable = "REACHABLE",
  stale = "STALE",
  none = "NONE",
  incomplete = "INCOMPLETE",
  delay = "DELAY",
  probe = "PROBE",
  failed = "FAILED",
}

export class Neighbour {
  public readonly ipAddress: string;
  public readonly netInterface: string;
  public readonly macAddress: string;
  public readonly state: NeighbourState;
  public readonly isRouter: boolean;

  constructor(ipAddress: string, netInterface: string, macAddress: string, state: NeighbourState, isRouter: boolean) {
    this.ipAddress = ipAddress;
    this.netInterface = netInterface;
    this.macAddress = macAddress;
    this.state = state;
    this.isRouter = isRouter;
  }

  public static parseString(string: string): Neighbour {
    const [ipAddress, , netInterface, , macAddress, isRouterOrState, stateOrUndefined] = string.split(" ");

    let state: NeighbourState, isRouter: boolean;
    if (isRouterOrState === "router") {
      isRouter = true;
      state = stateOrUndefined as NeighbourState;
    } else {
      isRouter = false;
      state = isRouterOrState as NeighbourState;
    }

    return new Neighbour(ipAddress, netInterface, macAddress, state, isRouter);
  }

  public static parseLines(lines: string[]): Neighbour[] {
    return lines.map((line) => Neighbour.parseString(line));
  }
}

export async function scanDevices(): Promise<Neighbour[]> {
  try {
    const { stdout } = await execa("ip", ["neigh", "show"], { lines: true });

    return Neighbour.parseLines(stdout);
  } catch (error) {
    throw new Error("Can't scan devices");
  }
}
