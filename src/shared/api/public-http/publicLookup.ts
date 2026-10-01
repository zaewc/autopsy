import { lookup, type LookupAddress } from "node:dns";
import type { LookupFunction } from "node:net";
import { isPublicAddress } from "./isPublicAddress";

/** Raised when a request would reach a private, loopback, or reserved host. */
export class PublicNetworkError extends Error {
  constructor(hostname: string) {
    super(`${hostname} does not resolve to a public internet address.`);
    this.name = "PublicNetworkError";
  }
}

/**
 * Create a `dns.lookup` replacement for socket connections. Every resolved
 * address must satisfy the policy, and the connection uses the address that
 * was checked, so a changing DNS answer cannot redirect the socket.
 */
export function createGuardedLookup(
  isAllowedAddress: (address: string) => boolean,
): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error, "", 0);
      const list = addresses as LookupAddress[];
      if (
        !list.length ||
        list.some(({ address }) => !isAllowedAddress(address))
      )
        return callback(new PublicNetworkError(hostname), "", 0);
      if (options.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    });
  };
}

/** Lookup that only connects to public internet addresses. */
export const publicLookup = createGuardedLookup(isPublicAddress);
