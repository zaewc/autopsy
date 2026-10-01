import http from "node:http";
import net, { isIP } from "node:net";
import type { Duplex } from "node:stream";
import { isPublicAddress } from "./isPublicAddress";
import { createGuardedLookup } from "./publicLookup";

export interface ProxyOptions {
  /** Address policy; defaults to public internet addresses only. */
  isAllowedAddress?: (address: string) => boolean;
  /** Destination ports; defaults to 80 and 443. */
  allowedPorts?: readonly string[];
  /** Total bytes relayed in both directions before every connection closes. */
  maxBytes?: number;
}

export interface PublicProxy {
  /** `http://127.0.0.1:<port>` for a browser's proxy setting. */
  url: string;
  /** Destinations refused by the address or port policy. */
  readonly blocked: readonly string[];
  /** Whether the byte budget was exhausted. */
  readonly exhausted: boolean;
  close(): Promise<void>;
}

/**
 * Start a loopback HTTP proxy that only reaches allowed destinations. Plain
 * HTTP requests and CONNECT tunnels (HTTPS, WebSocket) both resolve hosts
 * through the guarded lookup at connection time, so a page cannot use DNS
 * changes or literal addresses to reach internal services.
 */
export async function startPublicProxy({
  isAllowedAddress = isPublicAddress,
  allowedPorts = ["80", "443"],
  maxBytes = 30_000_000,
}: ProxyOptions = {}): Promise<PublicProxy> {
  const lookup = createGuardedLookup(isAllowedAddress);
  const blocked: string[] = [];
  const sockets = new Set<Duplex>();
  let relayed = 0;
  let exhausted = false;

  function track(socket: Duplex) {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => socket.destroy());
  }
  function count(chunk: Buffer | string) {
    relayed += chunk.length;
    if (relayed <= maxBytes) return;
    exhausted = true;
    for (const socket of sockets) socket.destroy();
  }
  /** Reason the destination is refused, or null when it may be contacted. */
  function refusal(host: string, port: string) {
    if (!allowedPorts.includes(port)) return `port ${port}`;
    const literal = host.replace(/^\[|\]$/g, "");
    if (isIP(literal) && !isAllowedAddress(literal)) return "address";
    return null;
  }
  function refuse(destination: string) {
    if (!blocked.includes(destination)) blocked.push(destination);
  }

  const server = http.createServer((request, response) => {
    track(request.socket);
    let target: URL;
    try {
      target = new URL(request.url ?? "");
    } catch {
      return response.writeHead(400).end();
    }
    const port = target.port || "80";
    if (target.protocol !== "http:" || refusal(target.hostname, port)) {
      refuse(`${target.hostname}:${port}`);
      return response.writeHead(403).end();
    }
    const headers = { ...request.headers };
    delete headers["proxy-connection"];
    delete headers["proxy-authorization"];
    const outgoing = http.request(
      target,
      { method: request.method, headers, lookup },
      (upstream) => {
        response.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.on("data", count);
        upstream.pipe(response);
      },
    );
    outgoing.on("socket", track);
    outgoing.on("error", (error) => {
      if (error.name === "PublicNetworkError")
        refuse(`${target.hostname}:${port}`);
      if (!response.headersSent)
        response.writeHead(error.name === "PublicNetworkError" ? 403 : 502);
      response.end();
    });
    request.on("data", count);
    request.pipe(outgoing);
  });

  server.on("connect", (request, client: Duplex, head: Buffer) => {
    track(client);
    const match = (request.url ?? "").match(/^(\[[^\]]+\]|[^:]+):(\d+)$/);
    const host = match?.[1] ?? "";
    const port = match?.[2] ?? "";
    if (!match || refusal(host, port)) {
      refuse(`${host}:${port}`);
      return client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    }
    const upstream = net.connect({
      host: host.replace(/^\[|\]$/g, ""),
      port: Number(port),
      lookup,
    });
    track(upstream);
    upstream.on("error", (error) => {
      if (error.name === "PublicNetworkError") refuse(`${host}:${port}`);
      client.end(
        `HTTP/1.1 ${error.name === "PublicNetworkError" ? "403 Forbidden" : "502 Bad Gateway"}\r\n\r\n`,
      );
    });
    upstream.on("connect", () => {
      client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.on("data", count);
      client.on("data", count);
      upstream.pipe(client);
      client.pipe(upstream);
    });
  });
  server.on("clientError", (_error, socket) => socket.destroy());

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as net.AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    blocked,
    get exhausted() {
      return exhausted;
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
