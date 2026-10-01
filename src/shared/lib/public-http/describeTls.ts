import type { PeerCertificate } from "node:tls";

export interface TlsDetails {
  /** Negotiated protocol, such as TLSv1.3. */
  protocol: string | null;
  cipher: string | null;
  /** Whether the certificate chain verified against trusted roots. */
  authorized: boolean;
  certificate: {
    subject: string | null;
    issuer: string | null;
    /** Subject alternative names, without the DNS: prefix. */
    names: readonly string[];
    validFrom: string | null;
    validTo: string | null;
  } | null;
}

const iso = (value: string | undefined) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/** The parts of a TLSSocket this summary reads. */
interface TlsSession {
  authorized: boolean;
  getProtocol(): string | null;
  getCipher(): { name: string } | undefined;
  getPeerCertificate(): PeerCertificate;
}

/** Summarize the negotiated TLS session and the server's leaf certificate. */
export function describeTls(socket: TlsSession): TlsDetails {
  const certificate = socket.getPeerCertificate();
  const hasCertificate = certificate && Object.keys(certificate).length > 0;
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? null;
  return {
    protocol: socket.getProtocol() ?? null,
    cipher: socket.getCipher()?.name ?? null,
    authorized: socket.authorized,
    certificate: hasCertificate
      ? {
          subject: first(certificate.subject?.CN),
          issuer: first(certificate.issuer?.O) ?? first(certificate.issuer?.CN),
          names: (certificate.subjectaltname ?? "")
            .split(/,\s*/)
            .filter((name) => name.startsWith("DNS:"))
            .map((name) => name.slice(4)),
          validFrom: iso(certificate.valid_from),
          validTo: iso(certificate.valid_to),
        }
      : null,
  };
}
