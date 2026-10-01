import { isIP } from "node:net";

// IPv4 ranges that are private, shared, reserved, documentation, or multicast.
const BLOCKED_IPV4: readonly [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToNumber(address: string): number {
  return address
    .split(".")
    .reduce((value, part) => value * 256 + Number(part), 0);
}

function isPublicIpv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  return BLOCKED_IPV4.every(([base, bits]) => {
    const size = 2 ** (32 - bits);
    const start = ipv4ToNumber(base);
    return value < start || value >= start + size;
  });
}

/** Expand an IPv6 address into eight 16-bit groups. */
function ipv6Groups(address: string): number[] {
  let text = address.split("%")[0].toLowerCase();
  const embedded = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embedded) {
    const value = ipv4ToNumber(embedded[1]);
    text = text.replace(
      embedded[1],
      `${(value >>> 16).toString(16)}:${(value & 0xffff).toString(16)}`,
    );
  }
  const [head, tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const fill =
    tail === undefined ? [] : Array(8 - left.length - right.length).fill("0");
  return [...left, ...fill, ...right].map((group) => parseInt(group, 16));
}

function groupsToIpv4(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function isPublicIpv6(address: string): boolean {
  const groups = ipv6Groups(address);
  const [first, second] = groups;
  const zeroPrefix = groups.slice(0, 5).every((group) => group === 0);
  // IPv4-mapped (::ffff:a.b.c.d) addresses reach the embedded IPv4 host.
  if (zeroPrefix && groups[5] === 0xffff)
    return isPublicIpv4(groupsToIpv4(groups[6], groups[7]));
  // NAT64 (64:ff9b::/96) translates to the embedded IPv4 host.
  if (
    first === 0x64 &&
    second === 0xff9b &&
    groups.slice(2, 6).every((g) => !g)
  )
    return isPublicIpv4(groupsToIpv4(groups[6], groups[7]));
  // Only global unicast (2000::/3) is public. Exclude IETF protocol
  // assignments including Teredo (2001::/23), documentation (2001:db8::/32),
  // and 6to4 relays (2002::/16) that can tunnel to arbitrary IPv4 hosts.
  if ((first & 0xe000) !== 0x2000) return false;
  if (first === 0x2001 && second < 0x200) return false;
  if (first === 0x2001 && second === 0xdb8) return false;
  return first !== 0x2002;
}

/** Whether an IP literal is routable on the public internet. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address.split("%")[0]);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}
