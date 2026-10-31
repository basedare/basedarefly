/** Actual storage adapter with an isolated SDK/transport fixture, never a live provider. */
import assert from "node:assert/strict";
import { test } from "node:test";
const Module = require("node:module");
const originalLoad = Module._load;
let mode = "ok";
let entered: () => void = () => {};
let publicCalls = 0;
const cid = "bafy" + "a".repeat(50);
class FixtureSDK {
  upload = {
    private: {
      file: () => ({
        name: () => {
          entered();
          if (mode === "upload-hang") return new Promise(() => {});
          if (mode === "upload-fail")
            return Promise.reject(new Error("Isolated provider failure"));
          return Promise.resolve({ cid });
        },
      }),
    },
    public: {
      file: () => {
        publicCalls++;
        throw Error("Public fallback forbidden");
      },
    },
  };
  gateways = {
    private: {
      createAccessLink: () => {
        entered();
        if (mode === "sign-hang") return new Promise(() => {});
        return Promise.resolve(
          mode === "unsafe-link"
            ? "https://evil.invalid/file"
            : "https://private-fixture.pinata.cloud/file",
        );
      },
    },
  };
}
Module._load = function (name: string, ...args: unknown[]) {
  if (name === "pinata") return { PinataSDK: FixtureSDK };
  return originalLoad.call(this, name, ...args);
};
const {
  uploadPrivateMoment,
  privateMomentResponse,
} = require("@/lib/moment-media");
Module._load = originalLoad;

test("private SDK stalls are bounded; failures and signed-link mismatch never use public storage", async (t) => {
  process.env.PINATA_JWT = "isolated-provider-fixture-only";
  process.env.PINATA_GATEWAY = "private-fixture.pinata.cloud";
  const file = new File([new Uint8Array([255, 216, 255, 1])], "fixture.jpg", {
    type: "image/jpeg",
  });
  for (const kind of ["upload-hang", "sign-hang"]) {
    mode = kind;
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const task =
      kind === "upload-hang"
        ? uploadPrivateMoment(file)
        : privateMomentResponse(cid, "image/jpeg", null);
    const rejected = assert.rejects(task, /PRIVATE_STORAGE_TIMEOUT/);
    await started;
    t.mock.timers.tick(12000);
    await rejected;
    t.mock.timers.reset();
  }
  mode = "upload-fail";
  await assert.rejects(uploadPrivateMoment(file), /Isolated provider failure/);
  const realFetch = globalThis.fetch;
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    throw Error("Must not fetch an unsafe signed URL");
  };
  try {
    mode = "unsafe-link";
    await assert.rejects(
      privateMomentResponse(cid, "image/jpeg", null),
      /PRIVATE_STORAGE_UNAVAILABLE/,
    );
    assert.equal(fetched, false);
    mode = "ok";
    globalThis.fetch = async (_input, options) => {
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal instanceof AbortSignal);
      return new Response(new Uint8Array([255, 216, 255]), {
        headers: { "Content-Type": "image/jpeg" },
      });
    };
    const response = await privateMomentResponse(cid, "image/jpeg", null);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("content-security-policy")!, /sandbox/);
    assert.equal((await response.arrayBuffer()).byteLength, 3);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(publicCalls, 0);
});
