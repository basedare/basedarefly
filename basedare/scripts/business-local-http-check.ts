/** Guest enquiry → actual saved admin record. Disposable localhost fixture only. */
import assert from "node:assert/strict";
import { request } from "node:http";
import {
  BUSINESS_REQUESTS,
  BUSINESS_GOAL_ORDER,
  businessRequestHref,
  confirmedBusinessEnquiry,
} from "../lib/business-request";

const origin = "http://localhost:3217";
async function main() {
  const fixture = await fetch(origin + "/moments/moment-browser-approved");
  assert.equal(fixture.status, 200);
  assert.match(await fixture.text(), /Local verification fixture/);
  for (const path of ["/brands/portal", "/activations"]) {
    const page = await fetch(origin + path);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /BaseDare helps businesses attract real people/);
    for (const text of [
      "Bring people in",
      "Get creator content",
      "Get more visibility",
      "Grow my business",
    ])
      assert.ok(html.includes(text), text);
  }
  const ids: string[] = [];
  for (const [i, kind] of BUSINESS_GOAL_ORDER.entries()) {
    const page = await fetch(
      origin +
        businessRequestHref(kind, "buyer-workspace", "General Luna, Siargao"),
    );
    assert.equal(page.status, 200);
    const payload = {
      company: "Local HTTP business fixture",
      contactName: "Test Founder",
      email: "business-http@example.test",
      city: "General Luna, Siargao",
      buyerType: "other",
      budgetRange: "discuss",
      timeline: "exploring",
      goal: BUSINESS_REQUESTS[kind].goal,
      packageId: "pilot-drop",
      notes: "Illustrative local test only. Do not contact or publish.",
      routedMissionType: kind,
      routedSource: "buyer-workspace",
    };
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "x-forwarded-for": `192.0.2.${100 + i}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    };
    const response = await fetch(origin + "/api/activation-intake", options);
    assert.equal(response.status, 200, await response.clone().text());
    const receipt = confirmedBusinessEnquiry(await response.json());
    assert.ok(
      receipt?.closeRoomHref,
      "Actual saved ID and private review link required",
    );
    ids.push(receipt.id);
    const retry = await fetch(origin + "/api/activation-intake", options);
    assert.equal(retry.status, 200);
    assert.equal(confirmedBusinessEnquiry(await retry.json())?.id, receipt.id);
    assert.equal((await fetch(origin + receipt.closeRoomHref)).status, 200);
  }
  assert.equal(
    new Set(ids).size,
    3,
    "Different goals must not overwrite one another",
  );
  // Chunked request deliberately has no Content-Length.
  const oversized = await new Promise<number>((resolve, reject) => {
    const req = request(
      origin + "/api/activation-intake",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.0.2.109",
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode!));
      },
    );
    req.on("error", reject);
    req.write('{"notes":"');
    req.write("x".repeat(70000));
    req.end('"}');
  });
  assert.equal(oversized, 413);
  const login = await fetch(origin + "/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      adminSecret: "local-browser-fixture-admin-secret-2026",
    }),
  });
  assert.equal(login.status, 200);
  const admin = await fetch(origin + "/api/admin/activation-intakes", {
    headers: { Cookie: login.headers.get("set-cookie")!.split(";")[0] },
  });
  assert.equal(admin.status, 200);
  const records = (await admin.json()).data.intakes;
  for (const id of ids) {
    const row = records.find((value: { id: string }) => value.id === id);
    assert.ok(row);
    assert.equal(row.status, "NEW");
    assert.equal(row.amount, null);
    assert.equal(row.budgetRange, "discuss");
    assert.equal(row.city, "General Luna, Siargao");
    assert.equal(row.email, "business-http@example.test");
  }
  console.log(
    "PASS: three guest goals, saved private reviews, retry dedupe, chunked body cap and actual NEW/unpriced admin records. Local fixtures only.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
