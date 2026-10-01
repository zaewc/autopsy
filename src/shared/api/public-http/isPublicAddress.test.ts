import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./isPublicAddress";

describe("isPublicAddress", () => {
  it.each([
    "8.8.8.8",
    "140.82.112.3",
    "1.1.1.1",
    "2606:4700:4700::1111",
    "2a00:1450:4001:82a::200e",
    "::ffff:8.8.8.8",
    "64:ff9b::808:808",
  ])("accepts public address %s", (address) =>
    expect(isPublicAddress(address)).toBe(true),
  );

  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.2.10",
    "192.168.1.1",
    "198.18.0.1",
    "203.0.113.5",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::a00:1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1%lo0",
    "ff02::1",
    "2001:db8::1",
    "2001:0:4136:e378::1",
    "2002:7f00:1::1",
    "localhost",
    "example.com",
  ])("rejects non-public address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );

  it("treats range boundaries precisely", () => {
    expect(isPublicAddress("172.15.255.255")).toBe(true);
    expect(isPublicAddress("172.32.0.0")).toBe(true);
    expect(isPublicAddress("100.63.255.255")).toBe(true);
    expect(isPublicAddress("100.128.0.0")).toBe(true);
  });
});
