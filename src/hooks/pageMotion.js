export const WHEEL_IDLE_MS = 240;
const SPRING_FREQUENCY = 6.2;

export function advanceSpring(value, velocity, target, elapsed, frequency = SPRING_FREQUENCY) {
  const displacement = value - target;
  const correction = velocity + frequency * displacement;
  const decay = Math.exp(-frequency * elapsed);
  return {
    value: target + (displacement + correction * elapsed) * decay,
    velocity: (velocity - frequency * correction * elapsed) * decay,
  };
}

// A gesture owns one transition. Its decaying tail keeps that ownership;
// renewed pressure or sustained deliberate input can advance after settling.
export function createWheelIntent() {
  let lastTime = -Infinity;
  let direction = 0;
  let previous = 0;
  let peak = 0;
  let accumulator = 0;
  let consumed = false;
  let decaying = false;

  return (delta, time, moving) => {
    const magnitude = Math.abs(delta);
    const nextDirection = Math.sign(delta);
    if (!nextDirection) return 0;
    const fresh = time - lastTime > WHEEL_IDLE_MS || nextDirection !== direction;
    const renewed = consumed && decaying && magnitude > Math.max(12, previous * 1.7);
    lastTime = time;

    if (fresh || renewed) {
      direction = nextDirection;
      peak = 0;
      accumulator = 0;
      consumed = false;
      decaying = false;
    }
    peak = Math.max(peak, magnitude);
    if (magnitude < peak * 0.65) decaying = true;
    previous = magnitude;

    if (consumed) {
      if (moving || decaying || magnitude < 12) {
        accumulator = 0;
        return 0;
      }
      accumulator += magnitude;
      if (accumulator < 96) return 0;
    } else {
      accumulator += magnitude;
      if (accumulator < 48) return 0;
    }

    consumed = true;
    accumulator = 0;
    return direction;
  };
}
