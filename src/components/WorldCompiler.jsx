import { MouseSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import ArmillaryStage from "./ArmillaryStage.jsx";

const OPEN_FREQUENCY = 7.8;
const TILT_FREQUENCY = 10.5;
const MAX_TILT_X = 4;
const MAX_TILT_Y = 5;

function advanceSpring(value, velocity, target, elapsed, frequency) {
  const displacement = value - target;
  const correction = velocity + frequency * displacement;
  const decay = Math.exp(-frequency * elapsed);
  return {
    value: target + (displacement + correction * elapsed) * decay,
    velocity: (velocity - frequency * correction * elapsed) * decay,
  };
}

function isSettled(value, velocity, target, epsilon = 0.001) {
  return Math.abs(target - value) < epsilon && Math.abs(velocity) < epsilon;
}

export default function WorldCompiler({ hint, expandedHint }) {
  const interactionRef = useRef(null);
  const stageRef = useRef(null);
  const pointerBoundsRef = useRef(null);
  const hoveredRef = useRef(false);
  const pointerTypeRef = useRef("");
  const pointerStartRef = useRef(null);
  const motionRef = useRef({
    frame: 0,
    lastTime: 0,
    progress: 0,
    progressVelocity: 0,
    progressTarget: 0,
    tiltX: 0,
    tiltXVelocity: 0,
    tiltXTarget: 0,
    tiltY: 0,
    tiltYVelocity: 0,
    tiltYTarget: 0,
    reducedMotion: false,
    inViewport: true,
    pageVisible: true,
  });
  const [assetState, setAssetState] = useState("loading");
  const [expanded, setExpanded] = useState(false);

  const stopAtRest = () => {
    const motion = motionRef.current;
    motion.progress = motion.progressTarget;
    motion.progressVelocity = 0;
    motion.tiltX = motion.tiltXTarget;
    motion.tiltXVelocity = 0;
    motion.tiltY = motion.tiltYTarget;
    motion.tiltYVelocity = 0;
    motion.frame = 0;
    motion.lastTime = 0;
    stageRef.current?.setPose(
      motion.progress,
      motion.tiltX,
      motion.tiltY,
    );
  };

  const startMotion = () => {
    const motion = motionRef.current;
    if (
      motion.frame ||
      motion.reducedMotion ||
      !motion.inViewport ||
      !motion.pageVisible
    ) {
      return;
    }

    const step = (time) => {
      const current = motionRef.current;
      if (!current.inViewport || !current.pageVisible || current.reducedMotion) {
        current.frame = 0;
        current.lastTime = 0;
        return;
      }

      if (!current.lastTime) current.lastTime = time;
      const elapsed = Math.min((time - current.lastTime) / 1000, 0.032);
      current.lastTime = time;

      const progress = advanceSpring(
        current.progress,
        current.progressVelocity,
        current.progressTarget,
        elapsed,
        OPEN_FREQUENCY,
      );
      current.progress = progress.value;
      current.progressVelocity = progress.velocity;

      const tiltX = advanceSpring(
        current.tiltX,
        current.tiltXVelocity,
        current.tiltXTarget,
        elapsed,
        TILT_FREQUENCY,
      );
      current.tiltX = tiltX.value;
      current.tiltXVelocity = tiltX.velocity;

      const tiltY = advanceSpring(
        current.tiltY,
        current.tiltYVelocity,
        current.tiltYTarget,
        elapsed,
        TILT_FREQUENCY,
      );
      current.tiltY = tiltY.value;
      current.tiltYVelocity = tiltY.velocity;

      stageRef.current?.setPose(
        current.progress,
        current.tiltX,
        current.tiltY,
      );

      const settled =
        isSettled(
          current.progress,
          current.progressVelocity,
          current.progressTarget,
        ) &&
        isSettled(current.tiltX, current.tiltXVelocity, current.tiltXTarget, 0.01) &&
        isSettled(current.tiltY, current.tiltYVelocity, current.tiltYTarget, 0.01);

      if (settled) {
        stopAtRest();
        return;
      }
      current.frame = requestAnimationFrame(step);
    };

    motion.frame = requestAnimationFrame(step);
  };

  const setOpen = (nextExpanded) => {
    const motion = motionRef.current;
    if (motion.reducedMotion) return;
    motion.progressTarget = nextExpanded ? 1 : 0;
    if (!nextExpanded) {
      motion.tiltXTarget = 0;
      motion.tiltYTarget = 0;
    }
    setExpanded(nextExpanded);
    startMotion();
  };

  const updatePointerTilt = (event) => {
    const bounds = pointerBoundsRef.current;
    if (!bounds) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    const motion = motionRef.current;
    motion.tiltXTarget = Math.max(-1, Math.min(1, -y)) * MAX_TILT_X;
    motion.tiltYTarget = Math.max(-1, Math.min(1, x)) * MAX_TILT_Y;
    startMotion();
  };

  useEffect(() => {
    const interaction = interactionRef.current;
    if (!interaction) return undefined;
    const motion = motionRef.current;
    motion.pageVisible = document.visibilityState !== "hidden";

    const observer = new IntersectionObserver(
      ([entry]) => {
        motion.inViewport = entry.isIntersecting && entry.intersectionRatio >= 0.08;
        if (motion.inViewport) startMotion();
      },
      { threshold: 0.08 },
    );
    observer.observe(interaction);

    const updateVisibility = () => {
      motion.pageVisible = document.visibilityState !== "hidden";
      if (motion.pageVisible) startMotion();
    };
    document.addEventListener("visibilitychange", updateVisibility);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      motion.reducedMotion = media.matches;
      if (media.matches) {
        if (motion.frame) cancelAnimationFrame(motion.frame);
        motion.progressTarget = 0;
        motion.tiltXTarget = 0;
        motion.tiltYTarget = 0;
        setExpanded(false);
        stopAtRest();
      }
    };
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    return () => {
      if (motion.frame) cancelAnimationFrame(motion.frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
      media.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  return (
    <button
      ref={interactionRef}
      className="machine-interaction"
      type="button"
      disabled={assetState !== "ready"}
      aria-label={expanded ? expandedHint : hint}
      aria-pressed={expanded}
      aria-busy={assetState === "loading"}
      data-expanded={expanded}
      data-ready={assetState === "ready"}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        hoveredRef.current = true;
        pointerBoundsRef.current = event.currentTarget.getBoundingClientRect();
        setOpen(true);
        updatePointerTilt(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") updatePointerTilt(event);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        hoveredRef.current = false;
        pointerBoundsRef.current = null;
        setOpen(false);
      }}
      onPointerDown={(event) => {
        pointerTypeRef.current = event.pointerType;
        pointerStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerStartRef.current;
        const isTap =
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10;
        if ((event.pointerType === "touch" || event.pointerType === "pen") && isTap) {
          setOpen(motionRef.current.progressTarget === 0);
        }
        pointerTypeRef.current = "";
        pointerStartRef.current = null;
      }}
      onPointerCancel={() => {
        pointerTypeRef.current = "";
        pointerStartRef.current = null;
        setOpen(false);
      }}
      onClick={(event) => {
        if (event.detail === 0) setOpen(motionRef.current.progressTarget === 0);
      }}
      onFocus={() => {
        if (pointerTypeRef.current !== "touch" && pointerTypeRef.current !== "pen") {
          setOpen(true);
        }
      }}
      onBlur={() => {
        if (!hoveredRef.current) setOpen(false);
      }}
    >
      <span className="machine-viewport" aria-hidden="true">
        <span className="machine-plane">
          <ArmillaryStage
            ref={stageRef}
            onReady={() => {
              setAssetState("ready");
              const motion = motionRef.current;
              stageRef.current?.setPose(
                motion.progress,
                motion.tiltX,
                motion.tiltY,
              );
            }}
            onError={() => setAssetState("error")}
          />
        </span>
      </span>

      <span className="machine-hint" aria-hidden="true">
        <MouseSimple size={16} weight="regular" />
        <span>{expanded ? expandedHint : hint}</span>
      </span>

      {assetState !== "ready" ? (
        <span className="machine-load-state" aria-hidden="true">
          {assetState === "error" ? "WORLD COMPILER / RENDER ERROR" : "WORLD COMPILER / LOADING"}
        </span>
      ) : null}
    </button>
  );
}
