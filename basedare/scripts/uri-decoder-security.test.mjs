import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import test from "node:test";
const require = createRequire(import.meta.url);

test("the patched decoder remains callable by the existing CommonJS query-string consumer", () => {
  const decode = require("decode-uri-component");
  assert.equal(typeof decode, "function");
  assert.equal(decode("caf%C3%A9%20%F0%9F%8C%8A"), "café 🌊");
  const query = require("query-string");
  const uri = "wc:abc@2?relay-protocol=irn&symKey=0123456789";
  assert.equal(query.parse(query.stringify({ uri })).uri, uri);
  assert.deepEqual([...query.parse("tag=one&tag=two").tag], ["one", "two"]);
  assert.doesNotThrow(() => query.parse("name=%E0%A4%A&tail=%zz"));
});

test("malformed distinct percent runs finish within a bounded subprocess", () => {
  // GHSA-qr28-fpjm-wq7f: the old full-string replacement loop takes ~20s.
  // A subprocess timeout prevents an affected package from hanging the test runner.
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `
    const decode = require('decode-uri-component');
    let value = '';
    for (let i=0;i<32000;i++) value += '%' + Math.floor(i/256).toString(16).padStart(2,'0') + '%' + (i%256).toString(16).padStart(2,'0') + 'x';
    const result = decode(value + '%zz');
    if (typeof result !== 'string') process.exit(1);
  `,
    ],
    { timeout: 5000, encoding: "utf8", cwd: process.cwd() },
  );
  assert.equal(result.error, undefined, "Decoder must not exceed five seconds");
  assert.equal(result.status, 0, result.stderr);
});

test("the actual WalletConnect URI parser still accepts an encoded relay handoff", async () => {
  const { parseUri, formatUri } = await import("@walletconnect/utils");
  const details = {
    protocol: "wc",
    topic: "a".repeat(64),
    version: 2,
    symKey: "b".repeat(64),
    relay: { protocol: "irn" },
  };
  const parsed = parseUri(formatUri(details));
  assert.equal(parsed.topic, details.topic);
  assert.equal(parsed.symKey, details.symKey);
  assert.equal(parsed.relay.protocol, "irn");
});
