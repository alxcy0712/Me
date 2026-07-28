import { MouseSimple } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState } from "react";
import MachineStage3D from "./MachineStage3D.jsx?v=20260728-26";

const PART_ROOT_V4 = "/world-compiler/parts-v4";
const PART_ROOT_V5 = "/world-compiler/parts-v5";
const ASSET_VERSION_V4 = "20260718-12";
const ASSET_VERSION_V5 = "20260722-2";
const partAsset = (root, name, version) => `${root}/${name}?v=${version}`;
const partAssetV4 = (name) => partAsset(PART_ROOT_V4, name, ASSET_VERSION_V4);
const partAssetV5 = (name) => partAsset(PART_ROOT_V5, name, ASSET_VERSION_V5);

const LAYERS = {
  backplateLeft: partAssetV4("backplate-left.webp"),
  backplateRight: partAssetV4("backplate-right.webp"),
  casingLeft: partAssetV4("casing-left.webp"),
  casingRight: partAssetV4("casing-right.webp"),
  inputFrame: partAssetV5("input-frame-3x.webp"),
  inputGuide: partAssetV5("input-guide-3x.webp"),
  outputFrame: partAssetV4("output-frame.webp"),
  rock: partAssetV4("rock.webp"),
  rulesFrame: partAssetV4("rules-frame.webp"),
  stateFrame: partAssetV4("state-frame.webp"),
};

const CANVAS_WIDTH = 936;
const CANVAS_HEIGHT = 660;
const TIMELINE_DURATION = 1000;
const SPRING_FREQUENCY = 7.5;
const BASE_SHAFT_PERIOD = 14000;
const BASE_SHAFT_OMEGA = (Math.PI * 2) / BASE_SHAFT_PERIOD;
const MECHANISM_RESPONSE_MS = 320;
const MECHANISM_FRAME_INTERVAL = 1000 / 30;
const SAMPLE_POINTS = [0, 0.04, 0.1, 0.18, 0.28, 0.4, 0.54, 0.68, 0.8, 0.9, 1];

const PARTS = [
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
    name: "input-guide",
    src: LAYERS.inputGuide,
    crop: [269, 176, 43, 160],
    origin: [301, 263],
    z: 31,
    from: { x: 64, y: 60, scale: 0.6 },
    to: { x: 0, y: 55 },
    range: [0.08, 0.88],
  },
  {
    name: "input-frame",
    src: LAYERS.inputFrame,
    crop: [155, 25, 176, 393],
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
  const offsets = [...new Set([...SAMPLE_POINTS, 0.03, 0.42, 0.7, 0.78])].sort(
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
  const offsets = [...new Set([...SAMPLE_POINTS, 0.04, 0.62])].sort(
    (a, b) => a - b,
  );

  return offsets.map((offset) => {
    const progress = smootherstep((offset - 0.04) / 0.58);
    return {
      offset,
      clipPath: `inset(${mix(34.24, 0, progress)}% ${mix(33.12, 0, progress)}% ${mix(34.7, 0, progress)}% ${mix(35.15, 0, progress)}%)`,
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

function cropStyle([left, top, width, height]) {
  return {
    left: `${(left / CANVAS_WIDTH) * 100}%`,
    top: `${(top / CANVAS_HEIGHT) * 100}%`,
    width: `${(width / CANVAS_WIDTH) * 100}%`,
    height: `${(height / CANVAS_HEIGHT) * 100}%`,
  };
}

export default function WorldCompiler({ hint, expandedHint }) {
  const sceneRef = useRef(null);
  const stageRef = useRef(null);
  const animationsRef = useRef([]);
  const mechanismsActiveRef = useRef(false);
  const assetsReadyRef = useRef(false);
  const imagesReadyRef = useRef(false);
  const stageReadyRef = useRef(false);
  const inViewportRef = useRef(false);
  const pageVisibleRef = useRef(true);
  const hoveredRef = useRef(false);
  const pointerTypeRef = useRef("");
  const reducedMotionRef = useRef(false);
  const mechanismMotionRef = useRef({
    phase: 0,
    speed: 0,
    targetSpeed: 0,
    enabled: false,
    frame: 0,
    lastTime: 0,
    lastRenderTime: 0,
  });
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

  const renderMechanismPhase = () => {
    stageRef.current?.setPhase(mechanismMotionRef.current.phase);
  };

  const startMechanismClock = () => {
    const mechanism = mechanismMotionRef.current;
    if (mechanism.frame || !mechanism.enabled) return;

    mechanism.lastTime = performance.now();
    mechanism.lastRenderTime = mechanism.lastTime - MECHANISM_FRAME_INTERVAL;
    const step = (time) => {
      mechanism.frame = 0;
      if (!mechanism.enabled) return;

      const elapsed = Math.min(time - mechanism.lastTime, 64);
      mechanism.lastTime = time;
      const response = 1 - Math.exp(-elapsed / MECHANISM_RESPONSE_MS);
      mechanism.speed += (mechanism.targetSpeed - mechanism.speed) * response;
      if (Math.abs(mechanism.targetSpeed - mechanism.speed) < 0.0001) {
        mechanism.speed = mechanism.targetSpeed;
      }

      if (mechanism.speed > 0.0001) {
        mechanism.phase =
          (mechanism.phase + BASE_SHAFT_OMEGA * mechanism.speed * elapsed) %
          (Math.PI * 2);
        if (time - mechanism.lastRenderTime >= MECHANISM_FRAME_INTERVAL) {
          mechanism.lastRenderTime =
            time -
            ((time - mechanism.lastRenderTime) % MECHANISM_FRAME_INTERVAL);
          renderMechanismPhase();
        }
      }

      if (mechanism.targetSpeed > 0.0001 || mechanism.speed > 0.0001) {
        mechanism.frame = requestAnimationFrame(step);
      } else {
        mechanismsActiveRef.current = false;
        sceneRef.current?.setAttribute("data-mechanisms-active", "false");
      }
    };

    mechanism.frame = requestAnimationFrame(step);
  };

  const syncMechanismPlayback = (progress = motionRef.current.progress) => {
    const mechanism = mechanismMotionRef.current;
    const speed = smootherstep((progress - 0.45) / 0.34);
    const enabled =
      assetsReadyRef.current &&
      inViewportRef.current &&
      pageVisibleRef.current &&
      !reducedMotionRef.current;
    const canRun = enabled && (speed > 0.0001 || mechanism.speed > 0.0001);

    mechanism.targetSpeed = enabled ? speed : 0;
    mechanism.enabled = enabled;
    mechanismsActiveRef.current = canRun;
    sceneRef.current?.setAttribute("data-mechanisms-active", String(canRun));

    if (!enabled) {
      if (mechanism.frame) cancelAnimationFrame(mechanism.frame);
      mechanism.frame = 0;
      mechanism.speed = 0;
      mechanism.lastRenderTime = 0;
      return;
    }
    if (canRun) startMechanismClock();
  };

  const commitReadyState = () => {
    if (!imagesReadyRef.current || !stageReadyRef.current) return;
    assetsReadyRef.current = true;
    setAssetState("ready");
    syncMechanismPlayback();
  };

  const handleStageReady = () => {
    stageReadyRef.current = true;
    stageRef.current?.setProgress(motionRef.current.progress);
    renderMechanismPhase();
    commitReadyState();
  };

  const renderProgress = (progress) => {
    const currentTime = progress * TIMELINE_DURATION;
    animationsRef.current.forEach((animation) => {
      animation.currentTime = currentTime;
    });
    stageRef.current?.setProgress(progress);
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
    imagesReadyRef.current = false;
    inViewportRef.current = false;
    pageVisibleRef.current = document.visibilityState !== "hidden";
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

    stageRef.current?.setProgress(motionRef.current.progress);
    renderMechanismPhase();
    const debugApi = {
      getState() {
        return {
          stage: stageRef.current?.getState?.() ?? null,
          active: mechanismsActiveRef.current,
          speed: mechanismMotionRef.current.targetSpeed,
          angularSpeed: mechanismMotionRef.current.speed,
          timeline: { ...motionRef.current, frame: Boolean(motionRef.current.frame) },
        };
      },
    };
    window.__WC_MECHANISMS__ = debugApi;

    Promise.all(images.map((image) => image.decode())).then(
      () => {
        if (cancelled) return;
        imagesReadyRef.current = true;
        commitReadyState();
      },
      () => {
        if (cancelled) return;
        assetsReadyRef.current = false;
        setAssetState("error");
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
      imagesReadyRef.current = false;
      inViewportRef.current = false;
      const motion = motionRef.current;
      const mechanism = mechanismMotionRef.current;
      if (motion.frame) cancelAnimationFrame(motion.frame);
      if (mechanism.frame) cancelAnimationFrame(mechanism.frame);
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      mechanism.speed = 0;
      mechanism.targetSpeed = 0;
      mechanism.enabled = false;
      mechanism.frame = 0;
      mechanism.lastRenderTime = 0;
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePageVisibility);
      media.removeEventListener("change", updateMotionPreference);
      if (window.__WC_MECHANISMS__ === debugApi) {
        delete window.__WC_MECHANISMS__;
      }
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
          <MachineStage3D ref={stageRef} onReady={handleStageReady} />
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
                {part.crop ? (
                  <span className="machine-part-asset" style={cropStyle(part.crop)}>
                    <img src={part.src} alt="" draggable="false" />
                  </span>
                ) : (
                  <img src={part.src} alt="" draggable="false" />
                )}
              </span>
            </span>
          ))}
        </span>

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

      {assetState !== "ready" ? (
        <span className="machine-load-state" aria-hidden="true">
          {assetState === "error" ? "WORLD COMPILER / ASSET ERROR" : "WORLD COMPILER / LOADING"}
        </span>
      ) : null}
    </button>
  );
}
