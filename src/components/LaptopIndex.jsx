import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LockSimple } from "@phosphor-icons/react";
import LaptopStage from "./LaptopStage.jsx";
import MacDesktop from "./MacDesktop.jsx";
import { getLaptopPose } from "./laptopPose.js";
import wallpaper from "../assets/macos/mojave-causal-wallpaper.webp";

function LockScreen({ interactive, locale, onWake }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!interactive) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [interactive]);
  const language = locale === "zh" ? "zh-CN" : "en-US";

  return (
    <button
      className="mac-lock-screen"
      type="button"
      disabled={!interactive}
      aria-hidden={!interactive}
      inert={!interactive}
      aria-label={locale === "zh" ? "唤醒 MacBook，进入思考索引" : "Wake MacBook and enter the index of thought"}
      onClick={onWake}
      onKeyDown={(event) => {
        if (event.key === " ") event.stopPropagation();
      }}
      data-desktop-keyboard
    >
      <span className="lock-identity">{locale === "zh" ? "思考索引" : "INDEX OF THOUGHT"}</span>
      <span className="lock-clock">
        <span className="lock-date">{new Intl.DateTimeFormat(language, { month: "long", day: "numeric", weekday: "long" }).format(now)}</span>
        <span className="lock-time">{new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now)}</span>
      </span>
      <span className="lock-prompt">
        <LockSimple aria-hidden="true" size={21} weight="light" />
        <span>{locale === "zh" ? "点击屏幕唤醒" : "Click the screen to wake"}</span>
      </span>
    </button>
  );
}

const LaptopIndex = forwardRef(function LaptopIndex(
  {
    initialPosition,
    interactive,
    locale,
    onInteractionLockChange,
    onOpenEssays,
    reducedMotion,
    wheelTarget,
  },
  forwardedRef,
) {
  const desktopRef = useRef(null);
  const screenRef = useRef(null);
  const stageRef = useRef(null);
  const poseRef = useRef({ position: initialPosition, velocity: 0 });
  const wakeStateRef = useRef("locked");
  const [stageState, setStageState] = useState("loading");
  const [wakeState, setWakeState] = useState("locked");

  useEffect(() => {
    if (interactive && wakeState === "awake") desktopRef.current?.focus({ preventScroll: true });
  }, [interactive, wakeState]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      setPose(position, velocity) {
        poseRef.current = { position, velocity };
        stageRef.current?.setPose(position, velocity);
        // Reset only once the complete device has left. A reversal before
        // that point keeps the current desktop and camera movement intact.
        if (wakeStateRef.current !== "locked" && getLaptopPose(position).presence === 0) {
          wakeStateRef.current = "locked";
          setWakeState("locked");
          stageRef.current?.setAwake(false);
        }
      },
    }),
    [],
  );

  const wake = () => {
    if (!interactive || stageState !== "ready" || wakeStateRef.current !== "locked") return;
    wakeStateRef.current = "waking";
    setWakeState("waking");
    stageRef.current?.setAwake(true);
  };

  const finishWake = () => {
    if (wakeStateRef.current !== "waking") return;
    wakeStateRef.current = "awake";
    setWakeState("awake");
  };

  return (
    <section
      className="laptop-transition"
      id="index"
      data-page-index="1"
      data-wheel-target={wheelTarget ? "true" : undefined}
      data-stage-state={stageState}
      data-wake-state={wakeState}
      aria-label={
        locale === "zh"
          ? "2015 Retina MacBook Pro 上的思考索引"
          : "Index of thought on a 2015 Retina MacBook Pro"
      }
      aria-hidden={!interactive}
      inert={!interactive && !wheelTarget}
    >
      <LaptopStage
        ref={stageRef}
        screenRef={screenRef}
        reducedMotion={reducedMotion}
        onWakeComplete={finishWake}
        onReady={() => {
          setStageState("ready");
          stageRef.current?.setPose(
            poseRef.current.position,
            poseRef.current.velocity,
          );
        }}
        onError={() => setStageState("error")}
      />
      <div className="laptop-screen" ref={screenRef} aria-busy={wakeState === "waking"}>
        <img className="desktop-wallpaper" src={wallpaper} alt="" draggable="false" />
        <div className="desktop-vignette" aria-hidden="true" />
        <MacDesktop
          surfaceRef={desktopRef}
          interactive={interactive && wakeState === "awake"}
          locale={locale}
          onInteractionLockChange={onInteractionLockChange}
          onOpenEssays={onOpenEssays}
        />
        <LockScreen
          interactive={interactive && stageState === "ready" && wakeState === "locked"}
          locale={locale}
          onWake={wake}
        />
      </div>
      {stageState !== "ready" && interactive ? (
        <p className="laptop-load-state" aria-live="polite">
          {stageState === "error"
            ? locale === "zh"
              ? "MacBook 场景加载失败"
              : "MacBook scene failed to load"
            : locale === "zh"
              ? "正在启动 MacBook…"
              : "Starting MacBook…"}
        </p>
      ) : null}
    </section>
  );
});

export default LaptopIndex;
