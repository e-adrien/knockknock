import assert from "assert";
import { Neighbour, NeighbourState } from "../helpers/neighbour.js";

describe("ip neigh show", () => {
  it("parse device", async () => {
    const parsed = Neighbour.parseString("192.168.1.1 dev wlan0 lladdr 11:22:33:44:55:66 STALE");

    assert.strictEqual(parsed.ipAddress, "192.168.1.1");
    assert.strictEqual(parsed.netInterface, "wlan0");
    assert.strictEqual(parsed.macAddress, "11:22:33:44:55:66");
    assert.strictEqual(parsed.isRouter, false);
    assert.strictEqual(parsed.state, NeighbourState.stale);
  });

  it("parse router", async () => {
    const parsed = Neighbour.parseString("fe80::1 dev wlan0 lladdr 11:22:33:44:55:66 router REACHABLE");

    assert.strictEqual(parsed.ipAddress, "fe80::1");
    assert.strictEqual(parsed.netInterface, "wlan0");
    assert.strictEqual(parsed.macAddress, "11:22:33:44:55:66");
    assert.strictEqual(parsed.isRouter, true);
    assert.strictEqual(parsed.state, NeighbourState.reachable);
  });
});
