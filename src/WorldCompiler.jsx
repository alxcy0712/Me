import { MouseSimple } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState } from "react";

const PART_ROOT = "/world-compiler/parts-v4";
const partAsset = (name) => `${PART_ROOT}/${name}?v=20260718-11`;
const LAYERS = {
  backplateLeft: partAsset("backplate-left.webp"),
  backplateRight: partAsset("backplate-right.webp"),
  casingLeft: partAsset("casing-left.webp"),
  casingRight: partAsset("casing-right.webp"),
  inputFrame: partAsset("input-frame.webp"),
  inputGuide: partAsset("input-guide.webp"),
  inputFront: partAsset("input-core-front.webp"),
  inputRotor: partAsset("input-rotor-cycle.webp"),
  outputCore: partAsset("output-core-front.webp"),
  outputFrame: partAsset("output-frame.webp"),
  outputRotor: partAsset("output-rotor-cycle.webp"),
  rock: partAsset("rock.webp"),
  rulesFront: partAsset("rules-core-front.webp"),
  rulesFrame: partAsset("rules-frame.webp"),
  rulesGearInner: partAsset("rules-gear-inner.webp"),
  rulesGearInnerMask: partAsset("rules-gear-inner-mask.webp"),
  rulesGearOuter: partAsset("rules-gear-outer.webp"),
  rulesGearOuterMask: partAsset("rules-gear-outer-mask.webp"),
  shaft: partAsset("shaft.webp"),
  stateCore: partAsset("state-core-front.webp"),
  stateFrame: partAsset("state-frame.webp"),
  stateRotor: partAsset("state-rotor-cycle.webp"),
};

const CANVAS_WIDTH = 936;
const CANVAS_HEIGHT = 660;
const TIMELINE_DURATION = 1000;
const SPRING_FREQUENCY = 7.5;
const MECHANISM_SAMPLE_COUNT = 17;
const SAMPLE_POINTS = [0, 0.04, 0.1, 0.18, 0.28, 0.4, 0.54, 0.68, 0.8, 0.9, 1];

const PARTS = [
  {
    name: "shaft",
    src: LAYERS.shaft,
    origin: [501, 258],
    z: 20,
    from: { x: -39, y: 63, scaleX: 0.401, scaleY: 0.455 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.88],
  },
  {
    name: "rock",
    src: LAYERS.rock,
    origin: [78, 260],
    z: 22,
    from: { x: 262, y: 63, scale: 0.42 },
    to: { x: 0, y: 55 },
    range: [0.16, 0.94],
  },
  {
    name: "input-rotor",
    src: LAYERS.inputFront,
    rotor: { name: "input", src: LAYERS.inputRotor },
    origin: [201, 263],
    z: 30,
    from: { x: 131, y: 60, scale: 0.68 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.88],
  },
  {
    name: "input-guide",
    src: LAYERS.inputGuide,
    origin: [301, 263],
    z: 31,
    from: { x: 64, y: 60, scale: 0.6 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.88],
  },
  {
    name: "rules-core",
    src: LAYERS.rulesFront,
    origin: [417, 257],
    z: 32,
    from: { x: 5, y: 66, scale: 0.545, rotate: 0.55 },
    to: { x: 0, y: 55 },
    range: [0.07, 0.87],
  },
  {
    name: "state-core",
    src: LAYERS.stateCore,
    rotor: { name: "state", src: LAYERS.stateRotor },
    origin: [585, 257],
    z: 34,
    from: { x: -85, y: 65, scaleX: 0.72, scaleY: 0.65 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.88],
  },
  {
    name: "output-core",
    src: LAYERS.outputCore,
    rotor: { name: "output", src: LAYERS.outputRotor },
    origin: [788, 258],
    z: 36,
    from: { x: -218, y: 62, scale: 0.72 },
    to: { x: 0, y: 55 },
    range: [0.1, 0.9],
  },
  {
    name: "input-frame",
    src: LAYERS.inputFrame,
    origin: [315, 263],
    z: 40,
    from: { x: 55, y: 60, scale: 0.72 },
    to: { x: 0, y: 55 },
    range: [0.06, 0.9],
  },
  {
    name: "rules-frame",
    src: LAYERS.rulesFrame,
    origin: [497, 257],
    z: 42,
    from: { x: -15, y: 64, scale: 0.7 },
    to: { x: 0, y: 55 },
    range: [0.06, 0.9],
  },
  {
    name: "state-frame",
    src: LAYERS.stateFrame,
    origin: [678, 252],
    z: 44,
    from: { x: -92, y: 68, scale: 0.65 },
    to: { x: 0, y: 55 },
    range: [0.07, 0.91],
  },
  {
    name: "output-frame",
    src: LAYERS.outputFrame,
    origin: [845, 252],
    z: 46,
    from: { x: -231, y: 68, scale: 0.68 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.92],
  },
];

const MECHANISM_CYCLES = [
  {
    selector: '[data-mechanism="input"]',
    amplitude: 10,
    aspect: 0.58,
    duration: 5800,
  },
  {
    selector: '[data-mechanism="rules-outer"]',
    amplitude: 8,
    aspect: 0.5,
    duration: 3800,
  },
  {
    selector: '[data-mechanism="rules-inner"]',
    amplitude: -12.4,
    aspect: 35 / 68,
    duration: 3800,
  },
  {
    selector: '[data-mechanism="state"]',
    amplitude: -6.5,
    aspect: 0.52,
    duration: 8200,
  },
  {
    selector: '[data-mechanism="output"]',
    amplitude: 5.8,
    aspect: 0.94,
    duration: 10400,
  },
];

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(Math.max(value, minimum), maximum);

function smootherstep(value) {
  const progress = clamp(value);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function normalizedTransform(transform) {
  return {
    x: transform.x ?? 0,
    y: transform.y ?? 0,
    scaleX: transform.scaleX ?? transform.scale ?? 1,
    scaleY: transform.scaleY ?? transform.scale ?? 1,
    rotate: transform.rotate ?? 0,
  };
}

function mix(from, to, progress) {
  return from + (to - from) * progress;
}

function transformValue(transform) {
  const x = (transform.x / CANVAS_WIDTH) * 100;
  const y = (transform.y / CANVAS_HEIGHT) * 100;

  return `translate3d(${x}%, ${y}%, 0) rotateZ(${transform.rotate}deg) scale3d(${transform.scaleX}, ${transform.scaleY}, 1)`;
}

function partFrames(fromValue, toValue, [start, end]) {
  const from = normalizedTransform(fromValue);
  const to = normalizedTransform(toValue);
  const offsets = [...new Set([...SAMPLE_POINTS, start, end])].sort((a, b) => a - b);

  return offsets.map((offset) => {
    const progress = smootherstep((offset - start) / (end - start));
    return {
      offset,
      opacity: 1,
      transform: transformValue({
        x: mix(from.x, to.x, progress),
        y: mix(from.y, to.y, progress),
        scaleX: mix(from.scaleX, to.scaleX, progress),
        scaleY: mix(from.scaleY, to.scaleY, progress),
        rotate: mix(from.rotate, to.rotate, progress),
      }),
    };
  });
}

function shellFrames(direction) {
  const travel = direction === "left" ? -330 : 330;
  const offsets = [...new Set([...SAMPLE_POINTS, 0.03, 0.7, 0.42, 0.78])].sort(
    (a, b) => a - b,
  );

  return offsets.map((offset) => {
    const progress = smootherstep((offset - 0.03) / 0.67);
    const fade = smootherstep((offset - 0.42) / 0.36);
    return {
      offset,
      opacity: 1 - fade,
      transform: transformValue({
        x: travel * progress,
        y: -24 * progress,
        scaleX: mix(1, 0.96, progress),
        scaleY: mix(1, 0.96, progress),
        rotate: direction === "left" ? -1.4 * progress : 1.4 * progress,
      }),
    };
  });
}

function maskFrames() {
  const offsets = [...new Set([...SAMPLE_POINTS, 0.04, 0.62])].sort((a, b) => a - b);

  return offsets.map((offset) => {
    const progress = smootherstep((offset - 0.04) / 0.58);
    return {
      offset,
      clipPath: `inset(${mix(34.24, 0, progress)}% ${mix(33.12, 0, progress)}% ${mix(34.7, 0, progress)}% ${mix(35.15, 0, progress)}%)`,
    };
  });
}

function rotorFrames(amplitude, aspect) {
  return Array.from({ length: MECHANISM_SAMPLE_COUNT }, (_, index) => {
    const offset = index / (MECHANISM_SAMPLE_COUNT - 1);
    const angle = amplitude * Math.sin(Math.PI * 2 * offset);

    return {
      offset,
      transform: `scaleX(${aspect}) rotateZ(${angle}deg) scaleX(${1 / aspect})`,
    };
  });
}

const MOTION_EFFECTS = [
  ...PARTS.flatMap((part) => [
    {
      selector: `[data-motion="${part.name}-mask"]`,
      keyframes: maskFrames(),
    },
    {
      selector: `[data-motion="${part.name}"]`,
      keyframes: partFrames(part.from, part.to, part.range),
    },
  ]),
  {
    selector: '[data-motion="backplate-left"]',
    keyframes: shellFrames("left"),
  },
  {
    selector: '[data-motion="backplate-right"]',
    keyframes: shellFrames("right"),
  },
  {
    selector: '[data-motion="casing-left"]',
    keyframes: shellFrames("left"),
  },
  {
    selector: '[data-motion="casing-right"]',
    keyframes: shellFrames("right"),
  },
];

function partStyle(part) {
  return {
    transformOrigin: `${(part.origin[0] / CANVAS_WIDTH) * 100}% ${(part.origin[1] / CANVAS_HEIGHT) * 100}%`,
  };
}

export default function WorldCompiler({ hint, expandedHint }) {
  const sceneRef = useRef(null);
  const animationsRef = useRef([]);
  const mechanismAnimationsRef = useRef([]);
  const mechanismsActiveRef = useRef(false);
  const mechanismSpeedRef = useRef(-1);
  const assetsReadyRef = useRef(false);
  const inViewportRef = useRef(false);
  const pageVisibleRef = useRef(true);
  const hoveredRef = useRef(false);
  const pointerTypeRef = useRef("");
  const reducedMotionRef = useRef(false);
  const motionRef = useRef({
    progress: 0,
    velocity: 0,
    target: 0,
    frame: 0,
    lastTime: 0,
  });
  const [assetState, setAssetState] = useState("loading");
  const [expanded, setExpanded] = useState(false);
  const [moving, setMoving] = useState(false);

  const syncMechanismPlayback = (progress = motionRef.current.progress) => {
    const speed = smootherstep((progress - 0.45) / 0.34);
    const canRun =
      assetsReadyRef.current &&
      inViewportRef.current &&
      pageVisibleRef.current &&
      !reducedMotionRef.current &&
      speed > 0.001;
    const speedChanged = Math.abs(mechanismSpeedRef.current - speed) > 0.0001;

    if (mechanismsActiveRef.current !== canRun) {
      mechanismsActiveRef.current = canRun;
      sceneRef.current?.setAttribute("data-mechanisms-active", String(canRun));
    }

    mechanismAnimationsRef.current.forEach((animation) => {
      if (!canRun) {
        animation.pause();
        return;
      }

      if (speedChanged) animation.updatePlaybackRate(speed);
      if (animation.playState !== "running") animation.play();
    });
    if (canRun && speedChanged) mechanismSpeedRef.current = speed;
  };

  const renderProgress = (progress) => {
    const currentTime = progress * TIMELINE_DURATION;
    animationsRef.current.forEach((animation) => {
      animation.currentTime = currentTime;
    });
    syncMechanismPlayback(progress);
  };

  const startSpring = () => {
    const motion = motionRef.current;
    if (motion.frame || reducedMotionRef.current) return;

    setMoving(true);
    motion.lastTime = performance.now();

    const step = (time) => {
      const elapsed = Math.min((time - motion.lastTime) / 1000, 0.032);
      motion.lastTime = time;

      const displacement = motion.progress - motion.target;
      const correction = motion.velocity + SPRING_FREQUENCY * displacement;
      const decay = Math.exp(-SPRING_FREQUENCY * elapsed);
      motion.progress =
        motion.target + (displacement + correction * elapsed) * decay;
      motion.velocity =
        (motion.velocity - SPRING_FREQUENCY * correction * elapsed) * decay;

      if (motion.progress <= 0 || motion.progress >= 1) {
        motion.progress = clamp(motion.progress);
        if (
          (motion.progress === 0 && motion.velocity < 0) ||
          (motion.progress === 1 && motion.velocity > 0)
        ) {
          motion.velocity = 0;
        }
      }

      renderProgress(motion.progress);

      const settled =
        Math.abs(motion.target - motion.progress) < 0.001 &&
        Math.abs(motion.velocity) < 0.001;

      if (settled) {
        motion.progress = motion.target;
        motion.velocity = 0;
        motion.frame = 0;
        setMoving(false);
        renderProgress(motion.progress);
        return;
      }

      motion.frame = requestAnimationFrame(step);
    };

    motion.frame = requestAnimationFrame(step);
  };

  const moveTo = (nextExpanded) => {
    const target = nextExpanded ? 1 : 0;
    const motion = motionRef.current;
    if (motion.target === target) return;

    motion.target = target;
    setExpanded(nextExpanded);

    if (reducedMotionRef.current) {
      if (motion.frame) cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.progress = target;
      motion.velocity = 0;
      setMoving(false);
      renderProgress(target);
      return;
    }

    startSpring();
  };

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    let cancelled = false;
    assetsReadyRef.current = false;
    inViewportRef.current = false;
    pageVisibleRef.current = document.visibilityState !== "hidden";
    mechanismSpeedRef.current = -1;
    const images = [...scene.querySelectorAll("img")];

    animationsRef.current = MOTION_EFFECTS.flatMap(({ selector, keyframes }) => {
      const element = scene.querySelector(selector);
      if (!element) return [];

      const animation = element.animate(keyframes, {
        duration: TIMELINE_DURATION,
        easing: "linear",
        fill: "both",
      });
      animation.pause();
      animation.currentTime = 0;
      return animation;
    });

    mechanismAnimationsRef.current = MECHANISM_CYCLES.flatMap(
      ({ selector, amplitude, aspect, duration }) => {
        const element = scene.querySelector(selector);
        if (!element) return [];

        const animation = element.animate(rotorFrames(amplitude, aspect), {
          duration,
          easing: "linear",
          iterations: Infinity,
        });
        animation.pause();
        animation.currentTime = 0;
        return animation;
      },
    );

    Promise.all(images.map((image) => image.decode())).then(
      () => {
        if (!cancelled) {
          assetsReadyRef.current = true;
          setAssetState("ready");
          syncMechanismPlayback();
        }
      },
      () => {
        if (!cancelled) {
          assetsReadyRef.current = false;
          setAssetState("error");
          syncMechanismPlayback();
        }
      },
    );

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewportRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.1;
        syncMechanismPlayback();
      },
      { threshold: 0.1 },
    );
    observer.observe(scene);

    const updatePageVisibility = () => {
      pageVisibleRef.current = document.visibilityState !== "hidden";
      syncMechanismPlayback();
    };
    updatePageVisibility();
    document.addEventListener("visibilitychange", updatePageVisibility);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotionRef.current = media.matches;
      if (media.matches) {
        const motion = motionRef.current;
        if (motion.frame) cancelAnimationFrame(motion.frame);
        motion.frame = 0;
        motion.progress = motion.target;
        motion.velocity = 0;
        setMoving(false);
        renderProgress(motion.progress);
      }
      syncMechanismPlayback();
    };

    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    return () => {
      cancelled = true;
      assetsReadyRef.current = false;
      inViewportRef.current = false;
      const motion = motionRef.current;
      if (motion.frame) cancelAnimationFrame(motion.frame);
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      mechanismAnimationsRef.current.forEach((animation) => animation.cancel());
      mechanismAnimationsRef.current = [];
      mechanismsActiveRef.current = false;
      mechanismSpeedRef.current = -1;
      scene.removeAttribute("data-mechanisms-active");
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePageVisibility);
      media.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  return (
    <button
      className="machine-interaction"
      type="button"
      disabled={assetState !== "ready"}
      aria-label={expanded ? expandedHint : hint}
      aria-pressed={expanded}
      aria-busy={assetState === "loading"}
      data-expanded={expanded}
      data-moving={moving}
      data-ready={assetState === "ready"}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        hoveredRef.current = true;
        moveTo(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        hoveredRef.current = false;
        if (document.activeElement !== event.currentTarget) moveTo(false);
      }}
      onPointerDown={(event) => {
        pointerTypeRef.current = event.pointerType;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          moveTo(motionRef.current.target === 0);
        }
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        pointerTypeRef.current = "";
      }}
      onPointerCancel={() => {
        pointerTypeRef.current = "";
        moveTo(false);
      }}
      onClick={(event) => {
        if (event.detail === 0) moveTo(motionRef.current.target === 0);
      }}
      onLostPointerCapture={() => {
        pointerTypeRef.current = "";
      }}
      onFocus={() => {
        if (pointerTypeRef.current !== "touch" && pointerTypeRef.current !== "pen") {
          moveTo(true);
        }
      }}
      onBlur={() => {
        if (!hoveredRef.current) moveTo(false);
      }}
    >
      <span ref={sceneRef} className="machine-scene" aria-hidden="true">
        <span
          className="machine-layer machine-backplate machine-backplate-left"
          data-motion="backplate-left"
        >
          <img src={LAYERS.backplateLeft} alt="" draggable="false" />
        </span>
        <span
          className="machine-layer machine-backplate machine-backplate-right"
          data-motion="backplate-right"
        >
          <img src={LAYERS.backplateRight} alt="" draggable="false" />
        </span>

        <span className="machine-internals">
          {PARTS.map((part) => (
            <span
              className="machine-part-mask"
              data-motion={`${part.name}-mask`}
              key={part.name}
              style={{ zIndex: part.z }}
            >
              <span
                className="machine-layer machine-part"
                data-motion={part.name}
                style={partStyle(part)}
              >
                {part.name === "rules-core" ? (
                  <>
                    <span className="machine-gear-window machine-gear-window-outer">
                      <span
                        className="machine-cycle-rotor"
                        data-mechanism="rules-outer"
                      >
                        <img src={LAYERS.rulesGearOuter} alt="" draggable="false" />
                      </span>
                    </span>
                    <span className="machine-gear-window machine-gear-window-inner">
                      <span
                        className="machine-cycle-rotor"
                        data-mechanism="rules-inner"
                      >
                        <img src={LAYERS.rulesGearInner} alt="" draggable="false" />
                      </span>
                    </span>
                    <img
                      className="machine-part-front"
                      src={part.src}
                      alt=""
                      draggable="false"
                    />
                  </>
                ) : part.rotor ? (
                  <>
                    <span
                      className={`machine-rotor-window machine-rotor-window-${part.rotor.name}`}
                    >
                      <span
                        className="machine-cycle-rotor"
                        data-mechanism={part.rotor.name}
                      >
                        <img src={part.rotor.src} alt="" draggable="false" />
                      </span>
                    </span>
                    <img
                      className="machine-part-front"
                      src={part.src}
                      alt=""
                      draggable="false"
                    />
                  </>
                ) : (
                  <img src={part.src} alt="" draggable="false" />
                )}
              </span>
            </span>
          ))}
        </span>

        <img
          className="machine-asset-probe"
          src={LAYERS.rulesGearOuterMask}
          alt=""
          draggable="false"
        />
        <img
          className="machine-asset-probe"
          src={LAYERS.rulesGearInnerMask}
          alt=""
          draggable="false"
        />

        <span
          className="machine-layer machine-casing machine-casing-left"
          data-motion="casing-left"
        >
          <img src={LAYERS.casingLeft} alt="" draggable="false" />
        </span>
        <span
          className="machine-layer machine-casing machine-casing-right"
          data-motion="casing-right"
        >
          <img src={LAYERS.casingRight} alt="" draggable="false" />
        </span>
      </span>

      <span className="machine-hint" aria-hidden="true">
        <MouseSimple size={17} weight="regular" />
        <span>{expanded ? expandedHint : hint}</span>
      </span>

      {assetState !== "ready" && (
        <span className="machine-load-state" aria-hidden="true">
          {assetState === "error" ? "WORLD COMPILER / ASSET ERROR" : "WORLD COMPILER / LOADING"}
        </span>
      )}
    </button>
  );
}
