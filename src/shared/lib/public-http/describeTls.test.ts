import { expect, it } from "vitest";
import type { PeerCertificate } from "node:tls";
import { describeTls } from "./describeTls";

it("summarizes the negotiated session and leaf certificate", () => {
  const details = describeTls({
    authorized: true,
    getProtocol: () => "TLSv1.3",
    getCipher: () => ({
      name: "TLS_AES_128_GCM_SHA256",
      standardName: "",
      version: "TLSv1.3",
    }),
    getPeerCertificate: () =>
      ({
        subject: { CN: "github.com" },
        issuer: { O: "Sectigo Limited", CN: "Sectigo ECC" },
        subjectaltname:
          "DNS:github.com, DNS:www.github.com, IP Address:1.2.3.4",
        valid_from: "Feb  5 00:00:00 2026 GMT",
        valid_to: "Feb  5 23:59:59 2027 GMT",
      }) as unknown as PeerCertificate,
  });
  expect(details).toEqual({
    protocol: "TLSv1.3",
    cipher: "TLS_AES_128_GCM_SHA256",
    authorized: true,
    certificate: {
      subject: "github.com",
      issuer: "Sectigo Limited",
      names: ["github.com", "www.github.com"],
      validFrom: "2026-02-05T00:00:00.000Z",
      validTo: "2027-02-05T23:59:59.000Z",
    },
  });
});

it("handles sessions without a peer certificate", () => {
  expect(
    describeTls({
      authorized: false,
      getProtocol: () => null,
      getCipher: () => undefined,
      getPeerCertificate: () => ({}) as PeerCertificate,
    }).certificate,
  ).toBeNull();
});
