import { describe, expect, it, vi } from "vitest";
import type { LookupAddress } from "node:dns";

const answers = vi.hoisted(() => ({ value: [] as LookupAddress[] }));
vi.mock("node:dns", () => ({
  lookup: (
    _hostname: string,
    _options: object,
    callback: (error: null, addresses: LookupAddress[]) => void,
  ) => callback(null, answers.value),
}));

const { publicLookup, PublicNetworkError } = await import("./publicLookup");

function resolve(all: boolean) {
  return new Promise<{ error: Error | null; result: unknown }>((done) =>
    publicLookup("site.test", { all }, (error, result) =>
      done({ error, result }),
    ),
  );
}

describe("publicLookup", () => {
  it("returns checked public addresses", async () => {
    answers.value = [{ address: "93.184.215.14", family: 4 }];
    expect(await resolve(false)).toEqual({
      error: null,
      result: "93.184.215.14",
    });
    expect((await resolve(true)).result).toEqual(answers.value);
  });

  it("rejects a hostname when any answer is not public", async () => {
    answers.value = [
      { address: "93.184.215.14", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ];
    expect((await resolve(false)).error).toBeInstanceOf(PublicNetworkError);
  });

  it("rejects an empty answer", async () => {
    answers.value = [];
    expect((await resolve(true)).error).toBeInstanceOf(PublicNetworkError);
  });
});
