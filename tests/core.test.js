import test from "node:test";
import assert from "node:assert/strict";
import {
  personalize,
  elapsedSince,
  spinTarget,
  winnerAtRotation,
  visibleEvents,
  safeAsset,
} from "../src/core.js";
import { decodeMessage, validEvent } from "../src/tracking.js";
import { config } from "../src/config.js";
test("personalization preserves Vietnamese and bounds untrusted URL input", () => {
  assert.deepEqual(
    personalize("?to=H%C3%A0&from=Vi%E1%BB%87t&msg=Ch%C3%BAc+vui", config),
    { to: "Hà", from: "Việt", message: "Chúc vui" },
  );
  assert.equal(personalize("?to=" + "a".repeat(300), config).to.length, 80);
  assert.equal(personalize("?to=%20", config).to, config.recipient);
});
test("counter handles future, invalid date, and exact elapsed time", () => {
  const start = "2024-10-20T00:00:00+07:00";
  assert.deepEqual(elapsedSince(start, Date.parse(start) + 90061000), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
  });
  assert.deepEqual(elapsedSince("invalid"), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  assert.equal(elapsedSince("2099-01-01").days, 0);
});
test("every prize stops under the pointer after repeated spins", () => {
  let rotation = 0;
  for (let spin = 0; spin < 90; spin++)
    for (let index = 0; index < config.prizes.length; index++) {
      const target = spinTarget(
        rotation,
        index,
        config.prizes.length,
        5 + (spin % 3),
      );
      assert.equal(winnerAtRotation(target, config.prizes.length), index);
      assert.ok(target - rotation >= 1800);
      rotation = target;
    }
});
test("dashboard deduplicates replayed events and retains reset watermark", () => {
  const events = [
    { id: "a", type: "spin_wheel", at: 100 },
    { id: "r", type: "reset_log", at: 200 },
    { id: "b", type: "spin_wheel", at: 300 },
  ];
  assert.deepEqual(
    visibleEvents([...events, events[2], events[0]]).map((event) => event.id),
    ["b"],
  );
  assert.deepEqual(
    visibleEvents([{ id: "c", type: "open_envelope", at: 200 }, ...events]).map(
      (event) => event.id,
    ),
    ["b"],
  );
});
test("ntfy parsing ignores malformed payloads and non-app messages", () => {
  const event = {
    id: "1",
    at: Date.now(),
    type: "spin_wheel",
    to: "Hà",
    from: "Việt",
    details: { prize: "Trà sữa" },
  };
  assert.ok(validEvent(event));
  assert.deepEqual(
    decodeMessage(
      JSON.stringify({ event: "message", message: JSON.stringify(event) }),
    ),
    event,
  );
  assert.equal(decodeMessage("bad json"), null);
  assert.equal(decodeMessage(JSON.stringify({ event: "keepalive" })), null);
  assert.equal(validEvent({ ...event, type: "unexpected" }), false);
  assert.equal(validEvent({ ...event, at: "yesterday" }), false);
});
test("configured asset URLs cannot execute javascript", () => {
  assert.equal(safeAsset("javascript:alert(1)"), "assets/flowers.svg");
  assert.equal(safeAsset("assets/cafe.svg"), "assets/cafe.svg");
  assert.equal(
    safeAsset("https://example.com/photo.jpg"),
    "https://example.com/photo.jpg",
  );
});
