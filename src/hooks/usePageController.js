import { useCallback, useEffect, useRef, useState } from "react";
import { advanceSpring, createWheelIntent, WHEEL_IDLE_MS } from "./pageMotion.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function endpointInDirection(position, direction, pageCount) {
  if (direction > 0) {
    return Math.min(Math.floor(position + 0.0001) + 1, pageCount - 1);
  }
  return Math.max(Math.ceil(position - 0.0001) - 1, 0);
}

function canScrollInDirection(element, direction) {
  if (direction < 0) return element.scrollTop > 0;
  return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
}

export function usePageController({
  initialPage,
  pageCount,
  pageIds,
  onFrame,
  getInteractionLocked,
}) {
  const [settledPage, setSettledPage] = useState(initialPage);
  const [targetPage, setTargetPage] = useState(initialPage);
  const [isMoving, setIsMoving] = useState(false);
  const [wheelTargetPage, setWheelTargetPage] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const onFrameRef = useRef(onFrame);
  const interactionLockedRef = useRef(getInteractionLocked);
  const reducedMotionRef = useRef(false);
  const settledPageRef = useRef(initialPage);
  const touchStartRef = useRef(null);
  const motionRef = useRef({
    frame: 0,
    lastTime: 0,
    position: initialPage,
    velocity: 0,
    segmentTarget: initialPage,
    finalTarget: initialPage,
  });
  const wheelRef = useRef({
    blocked: false,
    idleTimer: 0,
    originPage: null,
    intent: createWheelIntent(),
  });

  onFrameRef.current = onFrame;
  interactionLockedRef.current = getInteractionLocked;

  const announceFrame = useCallback((position, velocity) => {
    onFrameRef.current?.(position, velocity);
  }, []);

  const updateHash = useCallback(
    (page) => {
      const nextHash = `#${pageIds[page]}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, "", nextHash);
      }
    },
    [pageIds],
  );

  const finishAt = useCallback(
    (page) => {
      const motion = motionRef.current;
      motion.position = page;
      motion.velocity = 0;
      motion.segmentTarget = page;
      motion.finalTarget = page;
      motion.frame = 0;
      motion.lastTime = 0;
      setTargetPage(page);
      settledPageRef.current = page;
      setSettledPage(page);
      setIsMoving(false);
      announceFrame(page, 0);
    },
    [announceFrame],
  );

  const startMotion = useCallback(() => {
    const motion = motionRef.current;
    if (motion.frame || reducedMotionRef.current) return;

    setIsMoving(true);
    const step = (time) => {
      const current = motionRef.current;
      if (!current.lastTime) current.lastTime = time;
      const elapsed = Math.min((time - current.lastTime) / 1000, 0.032);
      current.lastTime = time;

      const next = advanceSpring(
        current.position,
        current.velocity,
        current.segmentTarget,
        elapsed,
      );
      current.position = next.value;
      current.velocity = next.velocity;
      announceFrame(current.position, current.velocity);

      const segmentSettled =
        Math.abs(current.position - current.segmentTarget) < 0.003 &&
        Math.abs(current.velocity) < 0.02;

      if (segmentSettled) {
        current.position = current.segmentTarget;
        current.velocity = 0;
        settledPageRef.current = current.segmentTarget;
        setSettledPage(current.segmentTarget);
        announceFrame(current.position, 0);

        if (current.segmentTarget !== current.finalTarget) {
          current.segmentTarget += Math.sign(
            current.finalTarget - current.segmentTarget,
          );
          current.lastTime = time;
          current.frame = requestAnimationFrame(step);
          return;
        }

        current.frame = 0;
        current.lastTime = 0;
        setIsMoving(false);
        return;
      }

      current.frame = requestAnimationFrame(step);
    };

    motion.frame = requestAnimationFrame(step);
  }, [announceFrame]);

  const requestPage = useCallback(
    (requestedPage, { updateUrl = true } = {}) => {
      const page = clamp(requestedPage, 0, pageCount - 1);
      const motion = motionRef.current;

      if (updateUrl) updateHash(page);

      if (reducedMotionRef.current) {
        finishAt(page);
        return;
      }

      const direction = Math.sign(page - motion.position);
      if (!direction && page === motion.segmentTarget) {
        motion.finalTarget = page;
        setTargetPage(page);
        return;
      }

      const segmentDirection = Math.sign(
        motion.segmentTarget - motion.position,
      );
      motion.finalTarget = page;
      setTargetPage(page);

      if (!segmentDirection || segmentDirection !== direction) {
        motion.segmentTarget = endpointInDirection(
          motion.position,
          direction,
          pageCount,
        );
      }
      startMotion();
    },
    [finishAt, pageCount, startMotion, updateHash],
  );

  const requestDirection = useCallback(
    (direction) => {
      const motion = motionRef.current;
      const segmentDirection = Math.sign(
        motion.segmentTarget - motion.position,
      );
      const atRest = !motion.frame && !segmentDirection;

      if (atRest) {
        requestPage(motion.segmentTarget + direction);
        return;
      }

      if (direction === segmentDirection) {
        return;
      }

      requestPage(
        endpointInDirection(motion.position, direction, pageCount),
      );
    },
    [pageCount, requestPage],
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = preference.matches;
      setReducedMotion(preference.matches);
      if (preference.matches) {
        const motion = motionRef.current;
        if (motion.frame) cancelAnimationFrame(motion.frame);
        finishAt(motion.finalTarget);
      }
    };

    updatePreference();
    preference.addEventListener("change", updatePreference);
    announceFrame(initialPage, 0);
    return () => preference.removeEventListener("change", updatePreference);
  }, [announceFrame, finishAt, initialPage]);

  useEffect(() => {
    const endWheelTransaction = () => {
      const wheel = wheelRef.current;
      wheel.blocked = false;
      wheel.originPage = null;
      setWheelTargetPage(null);
    };

    const handleWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      const delta = event.deltaY * unit;
      const direction = Math.sign(delta);
      if (!direction) return;

      const wheel = wheelRef.current;
      if (wheel.originPage === null) {
        const target = event.target instanceof Element ? event.target : null;
        const targetSlide = target?.closest("[data-page-index]");
        const originPage = targetSlide ? Number(targetSlide.dataset.pageIndex) : NaN;
        wheel.originPage = Number.isInteger(originPage)
          ? originPage
          : settledPageRef.current;
        setWheelTargetPage(wheel.originPage);

        const scrollRegion = target?.closest("[data-scroll-region]");
        wheel.blocked = Boolean(
          interactionLockedRef.current?.() ||
            scrollRegion ||
            target?.closest("[data-page-nav-block]"),
        );
      }

      window.clearTimeout(wheel.idleTimer);
      wheel.idleTimer = window.setTimeout(
        endWheelTransaction,
        WHEEL_IDLE_MS,
      );

      const target = event.target instanceof Element ? event.target : null;
      const scrollRegion = target?.closest("[data-scroll-region]");
      if (wheel.blocked) {
        if (!scrollRegion || !canScrollInDirection(scrollRegion, direction)) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();
      const intent = wheel.intent(delta, performance.now(), Boolean(motionRef.current.frame));
      if (intent) requestDirection(intent);
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const inDesktop = Boolean(target?.closest("[data-desktop-keyboard]"));
      let nextPage = null;
      if (event.key === "PageDown" || (!inDesktop && event.key === "ArrowDown")) {
        nextPage = motionRef.current.finalTarget + 1;
      } else if (
        event.key === "PageUp" ||
        (!inDesktop && event.key === "ArrowUp")
      ) {
        nextPage = motionRef.current.finalTarget - 1;
      } else if (!inDesktop && event.key === " " && !event.shiftKey) {
        nextPage = motionRef.current.finalTarget + 1;
      } else if (!inDesktop && event.key === " " && event.shiftKey) {
        nextPage = motionRef.current.finalTarget - 1;
      } else if (!inDesktop && event.key === "Home") {
        nextPage = 0;
      } else if (!inDesktop && event.key === "End") {
        nextPage = pageCount - 1;
      }

      if (nextPage === null) return;
      event.preventDefault();
      requestPage(nextPage);
    };

    const handleHistoryChange = () => {
      const page = pageIds.indexOf(window.location.hash.slice(1));
      if (page >= 0) requestPage(page, { updateUrl: false });
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("hashchange", handleHistoryChange);
    window.addEventListener("popstate", handleHistoryChange);
    return () => {
      const motion = motionRef.current;
      if (motion.frame) cancelAnimationFrame(motion.frame);
      window.clearTimeout(wheelRef.current.idleTimer);
      window.removeEventListener("wheel", handleWheel, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("hashchange", handleHistoryChange);
      window.removeEventListener("popstate", handleHistoryChange);
    };
  }, [pageCount, pageIds, requestDirection, requestPage]);

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    const target = event.target instanceof Element ? event.target : null;
    touchStartRef.current = {
      blocked: Boolean(
        interactionLockedRef.current?.() ||
          target?.closest("[data-page-nav-block]"),
      ),
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const handlePointerUp = useCallback(
    (event) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || start.blocked) return;
      const distanceX = event.clientX - start.x;
      const distanceY = event.clientY - start.y;
      if (
        Math.abs(distanceY) < 56 ||
        Math.abs(distanceY) < Math.abs(distanceX) * 1.15
      ) {
        return;
      }
      requestDirection(distanceY < 0 ? 1 : -1);
    },
    [requestDirection],
  );

  return {
    cancelPointer: () => {
      touchStartRef.current = null;
    },
    handlePointerDown,
    handlePointerUp,
    isMoving,
    reducedMotion,
    requestPage,
    settledPage,
    targetPage,
    wheelTargetPage,
  };
}
