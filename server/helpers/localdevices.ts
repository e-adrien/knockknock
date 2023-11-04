import { exec } from "child_process";
import { getIPRange } from "get-ip-range";
import ip from "ip";
import net from "net";
import os from "os";
import { createLogger } from "./logger.js";

const logger = createLogger("localdevices");

const TEN_MEGA_BYTE = 1024 * 1024 * 10;
const ONE_MINUTE = 60 * 1000;
const options = {
  maxBuffer: TEN_MEGA_BYTE,
  timeout: ONE_MINUTE,
};

export interface LocalDevice {
  name: string;
  ip: string;
  mac: string;
}

type FindResponse = Array<LocalDevice> | LocalDevice | undefined;

const lock: { [key: string]: Promise<FindResponse> } = {};

/**
 * Parses each row in the arp table into { name, ip, mac } on linux.
 *
 * partially inspired by https://github.com/goliatone/arpscan/blob/master/lib/arpscanner.js
 */
function parseLinux(row: string, parseOne: boolean): LocalDevice | undefined {
  // Ignore unresolved hosts.
  if (row === "" || row.indexOf("incomplete") >= 0) {
    return;
  }

  let result: LocalDevice;
  const chunks = row.split(" ").filter(Boolean);
  if (parseOne) {
    result = prepareOne(chunks);
  } else {
    result = prepareAll(chunks);
  }

  return result;
}

function prepareOne(chunks: Array<string>): LocalDevice {
  return {
    name: "?", // a hostname is not provided on the raspberry pi (linux)
    ip: chunks[0],
    mac: chunks[2],
  };
}

function prepareAll(chunks: Array<string>): LocalDevice {
  return {
    name: chunks[0],
    ip: chunks[1]!.match(/\((.*)\)/)![1],
    mac: chunks[3],
  };
}

function isRange(address: string): boolean {
  return address.length > 0 && new RegExp("/|-").test(address);
}

/**
 * Gets the current list of possible servers in the local networks.
 */
function getServers(): Array<string> {
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const key in interfaces) {
    const addresses = interfaces[key] ?? [];
    for (let i = addresses.length; i--; ) {
      const address = addresses[i];
      if (address.family === "IPv4" && !address.internal) {
        const subnet = ip.subnet(address.address, address.netmask);
        let current = ip.toLong(subnet.firstAddress);
        const last = ip.toLong(subnet.lastAddress) - 1;
        while (current++ < last) result.push(ip.fromLong(current));
      }
    }
  }

  return result;
}

/**
 * Sends a ping to all servers to update the arp table.
 */
function pingServers(servers: Array<string>): Promise<Array<string>> {
  return Promise.all(servers.map(pingServer));
}

/**
 * Pings an individual server to update the arp table.
 */
function pingServer(address: string): Promise<string> {
  return new Promise(function (resolve) {
    const socket = new net.Socket();
    socket.setTimeout(1000, close);
    socket.connect(80, address, close);
    socket.once("error", close);

    function close() {
      socket.destroy();
      resolve(address);
    }
  });
}

interface ExecReturn {
  stdout: string;
  stderr: string;
}

/**
 * Reads the arp table.
 */
function arpAll(skipNameResolution: boolean = false, arpPath: string): Promise<Array<LocalDevice> | undefined> {
  const cmd = skipNameResolution ? `${arpPath} -an` : `${arpPath} -a`;

  return new Promise<ExecReturn>((resolve, reject) => {
    exec(cmd, options, (err, stdout, stderr) => {
      err ? reject(err) : resolve({ stdout: stdout, stderr: stderr });
    });
  }).then(parseAll);
}

/**
 * Parses arp scan data into a useable collection.
 */
function parseAll(data: ExecReturn): Array<LocalDevice> | undefined {
  if (!data || !data.stdout) {
    return;
  }

  const rows = data.stdout.split("\n");
  return rows
    .map(function (row) {
      logger.debug(`ARP row : ${row}`);
      return parseLinux(row, false);
    })
    .filter(Boolean) as Array<LocalDevice>;
}

/**
 * Reads the arp table for a single address.
 */
function arpOne(address: string, arpPath: string): Promise<LocalDevice | undefined> {
  if (!ip.isV4Format(address) && !ip.isV6Format(address)) {
    return Promise.reject(new Error("Invalid IP address provided."));
  }

  return new Promise<ExecReturn>((resolve, reject) => {
    exec(`${arpPath} -n ${address}`, options, (err, stdout, stderr) => {
      err ? reject(err) : resolve({ stdout: stdout, stderr: stderr });
    });
  }).then(parseOne);
}

/**
 * Parses a single row of arp data.
 */
function parseOne(data: ExecReturn): LocalDevice | undefined {
  if (!data || !data.stdout) {
    return;
  }

  // ignore unresolved hosts (can happen when parseOne returns only one unresolved host)
  if (data.stdout.indexOf("no entry") >= 0) {
    return;
  }

  // remove first row (containing "headlines")
  const row = data.stdout.split("\n").slice(1)[0];
  logger.debug(`ARP row : ${row}`);
  return parseLinux(row, true);
}

/**
 * Clears the current promise and unlocks (will ping servers again).
 */
function unlock(key: string): (data: FindResponse) => FindResponse {
  return function (data: FindResponse) {
    logger.debug(`Found devices :`, { json: data });

    delete lock[key];
    return data;
  };
}

/**
 * Finds all local devices (ip and mac address) connected to the current network.
 */
export function findLocalDevices({
  address = "",
  skipNameResolution = false,
  arpPath = "arp",
}: {
  address?: string;
  skipNameResolution?: boolean;
  arpPath?: string;
} = {}): Promise<FindResponse> {
  const key = String(address);

  const servers = isRange(address) ? getIPRange(key) : getServers();

  if (!lock[key]) {
    if (!address || isRange(key)) {
      lock[key] = pingServers(servers)
        .then(() => arpAll(skipNameResolution, arpPath))
        .then((devices) => devices?.filter((device) => servers.indexOf(device.ip) !== -1))
        .then(unlock(key));
    } else {
      lock[key] = pingServer(address)
        .then((address) => arpOne(address, arpPath))
        .then(unlock(key));
    }
  }

  return lock[key];
}
