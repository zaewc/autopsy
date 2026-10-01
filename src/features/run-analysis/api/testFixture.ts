import {
  isPublicAddress,
  type FetchOptions,
} from "@/shared/lib/public-http/index.server";

/**
 * Browser tests scan a fixture server on this loopback port. Never set it in a
 * deployment: it lets the scanner reach 127.0.0.1 on that port.
 */
export function testFixtureOptions(): FetchOptions {
  const port = process.env.AUTOPSY_SCAN_FIXTURE_PORT;
  if (!port) return {};
  return {
    isAllowedAddress: (address) =>
      address === "127.0.0.1" || isPublicAddress(address),
    allowedPorts: ["80", "443", port],
  };
}
