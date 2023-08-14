/**
 * Based on https://github.com/song940/wake-on-lan
 */
import udp from "dgram";
import net from "net";
import { createLogger } from "./logger";

const logger = createLogger("wakeonlan");

function createMagicPacket(mac: string): Buffer {
  const MAC_REPEAT = 16;
  const MAC_LENGTH = 0x06;
  const PACKET_HEADER = 0x06;
  const parts = mac.match(/[0-9a-fA-F]{2}/g);

  if (!parts || parts.length != MAC_LENGTH) {
    throw new Error(`malformed MAC address "${mac}"`);
  }

  let buffer = Buffer.alloc(PACKET_HEADER);
  const bufMac = Buffer.from(parts.map((p) => parseInt(p, 16)));
  buffer.fill(0xff);
  for (let i = 0; i < MAC_REPEAT; i++) {
    buffer = Buffer.concat([buffer, bufMac]);
  }

  return buffer;
}

export function wake(mac: string, options?: { address?: string; port?: number }): Promise<boolean> {
  logger.debug(`Send a WOL packet for ${mac}`);

  const { address, port } = Object.assign(
    {
      address: "255.255.255.255",
      port: 9,
    },
    options || {}
  );

  // create magic packet
  const magicPacket = createMagicPacket(mac);
  const socket = udp
    .createSocket(net.isIPv6(address) ? "udp6" : "udp4")
    .on("error", function () {
      socket.close();
    })
    .once("listening", function () {
      socket.setBroadcast(true);
    });

  return new Promise((resolve, reject) => {
    socket.send(magicPacket, 0, magicPacket.length, port, address, function (err, res) {
      const result = res == magicPacket.length;

      if (err) {
        reject(err);
      } else {
        resolve(result);
      }

      socket.close();
    });
  });
}
