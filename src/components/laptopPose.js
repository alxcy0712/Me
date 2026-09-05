const clamp = (value) => Math.min(Math.max(value, 0), 1);
const smoothstep = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export const CLOSED_LID_ANGLE = Math.PI / 2;
export const OPEN_LID_ANGLE = -0.12;
export const LAPTOP_WIDTH = 9.25;
export const LID_HEIGHT = 6.08;
export const SCREEN = { width: 8.56, height: 5.35, bottom: 0.36, z: 0.118 };

// Distance from either neighbouring page gives both entry paths the same
// closed → open choreography, and both exit paths its exact reverse.
export function getLaptopPose(pagePosition, wakeProgress = 0) {
  const proximity = clamp(1 - Math.abs(pagePosition - 1));
  // Finish closing in the first ~220 ms, then clear the scene by ~350 ms.
  // Position owns the choreography so an interrupted exit reverses smoothly.
  const presence = smoothstep((proximity - 0.4) / 0.22);
  const t = clamp((proximity - 0.62) / 0.38);
  const openness = t * t * t * (t * (t * 6 - 15) + 10);
  return {
    presence,
    openness,
    focus: clamp(wakeProgress) * openness,
    lidAngle: CLOSED_LID_ANGLE + (OPEN_LID_ANGLE - CLOSED_LID_ANGLE) * openness,
    screenOpacity: smoothstep((openness - 0.12) / 0.72),
    // Keep the compact silhouette in frame while the composition follows
    // the opening display up to the seated-eye endpoint.
    lift: 2.6 * (1 - openness) - 3.8 * (1 - presence),
    yaw: 0.055 * (1 - openness),
    dolly: 0.6 * (1 - openness),
  };
}
