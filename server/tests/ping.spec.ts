import assert from "assert";
import { PingResult } from "../helpers/ping.js";

describe("ping ip", () => {
  it("failed ping", async () => {
    const result = PingResult.parseString(`
PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.

--- 192.168.1.1 ping statistics ---
1 packets transmitted, 0 received, 100% packet loss, time 0ms
`);

    assert.strictEqual(result.transmitted, 1);
    assert.strictEqual(result.received, 0);
    assert.strictEqual(result.loss, 100);
    assert.strictEqual(result.time, 0);
    assert.strictEqual(result.succeeded(), false);
  });

  it("succeeded ping", async () => {
    const result = PingResult.parseString(`
PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=5.63 ms

--- 192.168.1.1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss, time 0ms
rtt min/avg/max/mdev = 5.632/5.632/5.632/0.000 ms
`);

    assert.strictEqual(result.transmitted, 1);
    assert.strictEqual(result.received, 1);
    assert.strictEqual(result.loss, 0);
    assert.strictEqual(result.time, 0);
    assert.strictEqual(result.succeeded(), true);
  });
});
