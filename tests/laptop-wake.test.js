import assert from "node:assert/strict";
import test from "node:test";
import { advanceSpring } from "../src/hooks/pageMotion.js";
import { getLaptopPose } from "../src/components/laptopPose.js";

test("wake reaches a quiet endpoint without overshoot at different frame rates", () => {
  const endpoints = [30, 60, 120].map((fps) => {
    let frame = { value: 0, velocity: 0 };
    for (let index = 0; index < fps; index += 1) {
      const next = advanceSpring(frame.value, frame.velocity, 1, 1 / fps, 10);
      assert.ok(next.value >= frame.value && next.value <= 1);
      frame = next;
    }
    assert.ok(frame.value > 0.999 && frame.velocity < 0.01);
    return frame.value;
  });
  assert.ok(Math.max(...endpoints) - Math.min(...endpoints) < 1e-12);
});

for (const destination of [0, 2]) {
  test(`an awake or waking MacBook pulls back and clears on departure to ${destination}`, () => {
    for (const wake of [0, 0.3, 0.8, 1]) {
      assert.equal(getLaptopPose(1, wake).focus, wake);
      const closed = getLaptopPose(advanceSpring(1, 0, destination, 0.22).value, wake);
      assert.equal(closed.focus, 0, "camera pulls back before the chassis leaves");
      assert.equal(closed.screenOpacity, 0);
      const gone = getLaptopPose(advanceSpring(1, 0, destination, 0.35).value, wake);
      assert.equal(gone.presence, 0, "wake cannot leave pixels over the next page");
      assert.equal(gone.focus, 0);
    }
  });
}

test("the focused view reverses symmetrically with the lid", () => {
  for (const wake of [0.25, 1]) {
    let previous = 0;
    for (let step = 0; step <= 100; step += 1) {
      const position = step / 100;
      const entering = getLaptopPose(position, wake);
      const leaving = getLaptopPose(2 - position, wake);
      assert.ok(Math.abs(entering.focus - leaving.focus) < 1e-12);
      assert.ok(entering.focus >= previous - 1e-12);
      previous = entering.focus;
    }
  }
});
