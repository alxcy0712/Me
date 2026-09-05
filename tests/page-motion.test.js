import assert from "node:assert/strict";
import test from "node:test";
import { advanceSpring, createWheelIntent } from "../src/hooks/pageMotion.js";
import { CLOSED_LID_ANGLE, getLaptopPose, OPEN_LID_ANGLE } from "../src/components/laptopPose.js";

for (const direction of [1, -1]) {
  test(`one long trackpad flick holds page 02 from direction ${direction}`, () => {
    const intent = createWheelIntent();
    const transitions = [];
    let movingUntil = 0;
    for (let frame = 0; frame < 180; frame += 1) {
      const time = frame * 16;
      const delta = direction * 80 * Math.exp(-frame / 28);
      const result = intent(delta, time, time < movingUntil);
      if (result) {
        transitions.push(result);
        movingUntil = time + 1400;
      }
    }
    assert.deepEqual(transitions, [direction]);
  });
}

test("a fresh gesture advances after settling, with a stationary pointer", () => {
  const intent = createWheelIntent();
  assert.equal(intent(64, 0, false), 1);
  assert.equal(intent(8, 1500, false), 0);
  assert.equal(intent(64, 1800, false), 1);
});

test("sustained deliberate scrolling advances only after a page settles", () => {
  const intent = createWheelIntent();
  assert.equal(intent(64, 0, false), 1);
  for (let time = 16; time < 1400; time += 16) assert.equal(intent(32, time, true), 0);
  // A repeated wheel step / renewed push owns the next page.
  assert.equal(intent(64, 1410, false), 1);
});

test("steady wheel input continues sequentially without an idle gap", () => {
  const intent = createWheelIntent();
  assert.equal(intent(48, 0, false), 1);
  for (let time = 16; time <= 1400; time += 16) assert.equal(intent(48, time, true), 0);
  assert.equal(intent(48, 1410, false), 0);
  assert.equal(intent(48, 1426, false), 1);
});

test("opposite input can reverse a moving transition", () => {
  const intent = createWheelIntent();
  assert.equal(intent(60, 0, false), 1);
  assert.equal(intent(-20, 50, true), 0);
  assert.equal(intent(-30, 66, true), -1);
});

test("a decaying tail can be interrupted by a new push without idle", () => {
  const intent = createWheelIntent();
  assert.equal(intent(80, 0, false), 1);
  for (let time = 16; time < 1400; time += 16) intent(4, time, true);
  assert.equal(intent(60, 1400, false), 1);
});

test("both entry directions open, both exit directions close, at identical poses", () => {
  assert.equal(getLaptopPose(0).lidAngle, CLOSED_LID_ANGLE);
  assert.equal(getLaptopPose(2).lidAngle, CLOSED_LID_ANGLE);
  assert.ok(Math.abs(getLaptopPose(1).lidAngle - OPEN_LID_ANGLE) < 1e-12);
  let previous = 0;
  for (let step = 0; step <= 100; step += 1) {
    const position = step / 100;
    const forward = getLaptopPose(position);
    const backward = getLaptopPose(2 - position);
    assert.ok(forward.openness >= previous - 1e-12);
    assert.ok(Math.abs(forward.lidAngle - backward.lidAngle) < 1e-12);
    assert.ok(Math.abs(forward.screenOpacity - backward.screenOpacity) < 1e-12);
    previous = forward.openness;
  }
  assert.equal(getLaptopPose(0.16).openness, 0, "device arrives closed before the hinge moves");
  assert.equal(getLaptopPose(1.84).openness, 0, "hinge closes before device departs");
});

test("spring motion is frame-rate independent and preserves reversal velocity", () => {
  const single = advanceSpring(0, 0, 1, 1 / 30);
  const half = advanceSpring(0, 0, 1, 1 / 60);
  const double = advanceSpring(half.value, half.velocity, 1, 1 / 60);
  assert.ok(Math.abs(single.value - double.value) < 1e-12);
  assert.ok(Math.abs(single.velocity - double.velocity) < 1e-12);
  const forward = advanceSpring(0, 0, 1, 0.22);
  const reverse = advanceSpring(forward.value, forward.velocity, 0, 1 / 1000);
  assert.ok(Math.abs(reverse.value - forward.value) < 0.004);
  assert.ok(reverse.velocity > 0, "preserves existing forward momentum during reversal");
  const settled = advanceSpring(reverse.value, reverse.velocity, 0, 2);
  assert.ok(Math.abs(settled.value) < 0.0001);
});

for (const destination of [0, 2]) {
  test(`MacBook closes and clears within 350 ms when leaving for page ${destination + 1}`, () => {
    const closing = getLaptopPose(advanceSpring(1, 0, destination, 0.22).value);
    assert.equal(closing.lidAngle, CLOSED_LID_ANGLE);
    assert.ok(closing.presence > 0, "the closed chassis remains visible before retreating");
    assert.equal(closing.screenOpacity, 0, "desktop clears with the closed lid");
    for (const elapsed of [0.35, 0.5, 0.8, 1.2]) {
      const pose = getLaptopPose(advanceSpring(1, 0, destination, elapsed).value);
      assert.equal(pose.presence, 0, "no chassis remains over the arriving page");
      assert.equal(pose.screenOpacity, 0);
    }
  });
}
