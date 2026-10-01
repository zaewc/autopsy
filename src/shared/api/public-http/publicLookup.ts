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
 * A `dns.lookup` replacement for socket connections. Every resolved address
 * must be public, and the connection uses the address that was checked, so a
 * changing DNS answer cannot redirect the socket to an internal host.
 */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as LookupAddress[];
    if (!list.length || list.some(({ address }) => !isPublicAddress(address)))
      return callback(new PublicNetworkError(hostname), "", 0);
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
};
