import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  GithubLogo,
} from "@phosphor-icons/react";
import { content, plannedEssays, topics } from "./content.js";

const WorldCompiler = lazy(() => import("./components/WorldCompiler.jsx"));

const PAGE_IDS = ["top", "index", "essays"];
const PAGE_LABELS = {
  zh: ["封面", "思考索引", "文章"],
  en: ["Cover", "Index", "Essays"],
};
const PAGE_TRANSITION_MS = 760;
const WHEEL_THRESHOLD = 48;
const WHEEL_IDLE_MS = 240;

function getInitialPage() {
  if (typeof window === "undefined") return 0;
  const page = PAGE_IDS.indexOf(window.location.hash.slice(1));
  return page >= 0 ? page : 0;
}

function Header({ activePage, copy, onNavigate, onToggleLocale }) {
  const navigate = (event, pageId) => {
    event.preventDefault();
    onNavigate(pageId);
  };

  return (
    <header className="site-header">
      <a
        className="brand"
        href="#top"
        aria-current={activePage === 0 ? "page" : undefined}
        aria-label={copy.brandLabel}
        onClick={(event) => navigate(event, "top")}
      >
        {copy.brand}
      </a>
      <nav className="site-nav" aria-label={copy.navLabel}>
        <a
          href="#index"
          aria-current={activePage === 1 ? "page" : undefined}
          onClick={(event) => navigate(event, "index")}
        >
          {copy.nav.index}
        </a>
        <a
          href="#essays"
          aria-current={activePage === 2 ? "page" : undefined}
          onClick={(event) => navigate(event, "essays")}
        >
          {copy.nav.essays}
        </a>
        <button
          className="locale-toggle"
          type="button"
          aria-label={copy.localeToggleLabel}
          onClick={onToggleLocale}
        >
          {copy.localeToggle}
        </button>
      </nav>
    </header>
  );
}

function MachineFallback() {
  return (
    <div className="machine-fallback" aria-hidden="true">
      <span>WORLD COMPILER</span>
    </div>
  );
}

function Hero({ copy, onNavigate }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="folio">NO. 001 · PERSONAL SYSTEM</p>
        <h1>{copy.title}</h1>
        <p className="hero-meta">{copy.heroMeta}</p>

        <div className="definition">
          {copy.definition.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>

        <div className="short-rule" aria-hidden="true" />

        <div className="context-copy">
          {copy.context.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>

        <div className="hero-actions">
          <a
            className="primary-link"
            href="#essays"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("essays");
            }}
          >
            {copy.cta}
            <ArrowRight aria-hidden="true" size={18} weight="regular" />
          </a>
          <div className="social-links" aria-label={copy.socialLabel}>
            <a href="https://github.com/alxcy0712" target="_blank" rel="noreferrer">
              <GithubLogo aria-hidden="true" size={21} weight="regular" />
              GitHub
              <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
            </a>
          </div>
        </div>
      </div>

      <div className="machine-column">
        <Suspense fallback={<MachineFallback />}>
          <WorldCompiler
            hint={copy.machineHint}
            expandedHint={copy.machineExpanded}
            loadingLabel={copy.machineLoading}
            errorLabel={copy.machineError}
          />
        </Suspense>
      </div>
    </section>
  );
}

function ThoughtIndex({ copy, locale }) {
  return (
    <section className="thought-index" id="index" aria-labelledby="index-title">
      <div className="index-heading">
        <h2 id="index-title">{copy.indexTitle}</h2>
        <p>{copy.indexSubtitle}</p>
      </div>
      <div className="topic-grid">
        {topics[locale].map(([title, label, description]) => (
          <article className="topic" key={title}>
            <h3>{title}</h3>
            <p className="topic-label">{label}</p>
            <p className="topic-description">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EssayQueue({ copy, locale }) {
  return (
    <section className="essay-queue" id="essays" aria-labelledby="queue-title">
      <div className="section-kicker">{copy.sectionKicker}</div>
      <h2 id="queue-title">{copy.queueTitle}</h2>
      <div className="essay-list">
        {plannedEssays[locale].map(([number, title, topic]) => (
          <article className="essay-row" key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{topic}</p>
            <ArrowRight aria-hidden="true" size={20} weight="regular" />
          </article>
        ))}
      </div>
    </section>
  );
}

function PageProgress({ activePage, labels, locale, onNavigate }) {
  return (
    <nav
      className="page-progress"
      aria-label={locale === "zh" ? "章节导航" : "Section navigation"}
    >
      {labels.map((label, index) => (
        <button
          className="page-progress-button"
          type="button"
          key={PAGE_IDS[index]}
          aria-current={activePage === index ? "page" : undefined}
          aria-label={
            locale === "zh"
              ? `前往第 ${index + 1} 页：${label}`
              : `Go to page ${index + 1}: ${label}`
          }
          onClick={() => onNavigate(PAGE_IDS[index])}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className="page-progress-rule" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const [locale, setLocale] = useState("zh");
  const [activePage, setActivePage] = useState(getInitialPage);
  const [wheelTargetPage, setWheelTargetPage] = useState(null);
  const activePageRef = useRef(activePage);
  const animationTimeoutRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelDirectionRef = useRef(0);
  const wheelTargetPageRef = useRef(null);
  const wheelIdleTimeoutRef = useRef(0);
  const pointerStartRef = useRef(null);
  const copy = content[locale];
  const pageLabels = PAGE_LABELS[locale];

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = copy.documentTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", copy.documentDescription);
  }, [copy, locale]);

  const goToPage = useCallback((page, { updateHash = true } = {}) => {
    const requestedPage = typeof page === "number" ? page : PAGE_IDS.indexOf(page);
    if (requestedPage < 0) return false;
    const nextPage = Math.min(Math.max(requestedPage, 0), PAGE_IDS.length - 1);
    const nextHash = `#${PAGE_IDS[nextPage]}`;

    if (updateHash && window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    if (nextPage === activePageRef.current) return false;

    activePageRef.current = nextPage;
    setActivePage(nextPage);
    window.clearTimeout(animationTimeoutRef.current);

    if (reducedMotionRef.current) {
      isAnimatingRef.current = false;
    } else {
      isAnimatingRef.current = true;
      animationTimeoutRef.current = window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, PAGE_TRANSITION_MS);
    }
    return true;
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotionRef.current = motionPreference.matches;
      if (motionPreference.matches) {
        window.clearTimeout(animationTimeoutRef.current);
        isAnimatingRef.current = false;
      }
    };

    const resetWheelDelta = () => {
      wheelAccumulatorRef.current = 0;
      wheelDirectionRef.current = 0;
    };

    const endWheelGesture = () => {
      resetWheelDelta();
      if (wheelTargetPageRef.current === null) return;
      wheelTargetPageRef.current = null;
      setWheelTargetPage(null);
    };

    const handleWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();

      if (wheelTargetPageRef.current === null && event.target instanceof Element) {
        const targetSlide = event.target.closest(".page-slide");
        const targetPage = Number(targetSlide?.dataset.pageIndex);
        if (Number.isInteger(targetPage)) {
          wheelTargetPageRef.current = targetPage;
          setWheelTargetPage(targetPage);
        }
      }

      window.clearTimeout(wheelIdleTimeoutRef.current);
      wheelIdleTimeoutRef.current = window.setTimeout(endWheelGesture, WHEEL_IDLE_MS);

      if (isAnimatingRef.current) return;

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      const direction = Math.sign(delta);
      if (!direction) return;
      if (direction !== wheelDirectionRef.current) {
        wheelAccumulatorRef.current = 0;
        wheelDirectionRef.current = direction;
      }
      wheelAccumulatorRef.current += delta;

      if (Math.abs(wheelAccumulatorRef.current) < WHEEL_THRESHOLD) return;
      resetWheelDelta();
      goToPage(activePageRef.current + direction);
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement) {
        if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
        if (event.key === " " && event.target.closest("a, button")) return;
      }

      let nextPage;
      if (["ArrowDown", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey)) {
        nextPage = activePageRef.current + 1;
      } else if (["ArrowUp", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey)) {
        nextPage = activePageRef.current - 1;
      } else if (event.key === "Home") {
        nextPage = 0;
      } else if (event.key === "End") {
        nextPage = PAGE_IDS.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      if (!isAnimatingRef.current) goToPage(nextPage);
    };

    const handleHistoryChange = () => {
      const page = PAGE_IDS.indexOf(window.location.hash.slice(1));
      if (page >= 0) goToPage(page, { updateHash: false });
    };

    updateMotionPreference();
    motionPreference.addEventListener("change", updateMotionPreference);
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("hashchange", handleHistoryChange);
    window.addEventListener("popstate", handleHistoryChange);

    return () => {
      window.clearTimeout(animationTimeoutRef.current);
      window.clearTimeout(wheelIdleTimeoutRef.current);
      motionPreference.removeEventListener("change", updateMotionPreference);
      window.removeEventListener("wheel", handleWheel, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("hashchange", handleHistoryChange);
      window.removeEventListener("popstate", handleHistoryChange);
    };
  }, [goToPage]);

  const navigateToId = useCallback(
    (pageId) => {
      goToPage(pageId);
    },
    [goToPage],
  );

  const toggleLocale = () => {
    startTransition(() => {
      setLocale((current) => {
        return current === "zh" ? "en" : "zh";
      });
    });
  };

  const handlePointerDown = (event) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || isAnimatingRef.current) return;

    const distanceX = event.clientX - start.x;
    const distanceY = event.clientY - start.y;
    if (Math.abs(distanceY) < 56 || Math.abs(distanceY) < Math.abs(distanceX) * 1.15) {
      return;
    }
    goToPage(activePageRef.current + (distanceY < 0 ? 1 : -1));
  };

  return (
    <div className="site-shell">
      <Header
        activePage={activePage}
        copy={copy}
        onNavigate={navigateToId}
        onToggleLocale={toggleLocale}
      />

      <main
        className="page-viewport"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <div
          className="page-slide"
          data-page-index="0"
          data-page-state={activePage === 0 ? "active" : "before"}
          data-wheel-target={wheelTargetPage === 0 ? "true" : undefined}
          aria-hidden={activePage !== 0}
          inert={activePage !== 0 && wheelTargetPage !== 0}
          style={{ transform: `translate3d(0, ${-activePage * 100}%, 0)` }}
        >
          <Hero copy={copy} onNavigate={navigateToId} />
        </div>

        <div
          className="page-slide"
          data-page-index="1"
          data-page-state={activePage === 1 ? "active" : activePage > 1 ? "before" : "after"}
          data-wheel-target={wheelTargetPage === 1 ? "true" : undefined}
          aria-hidden={activePage !== 1}
          inert={activePage !== 1 && wheelTargetPage !== 1}
          style={{ transform: `translate3d(0, ${(1 - activePage) * 100}%, 0)` }}
        >
          <ThoughtIndex copy={copy} locale={locale} />
        </div>

        <div
          className="page-slide"
          data-page-index="2"
          data-page-state={activePage === 2 ? "active" : activePage > 2 ? "before" : "after"}
          data-wheel-target={wheelTargetPage === 2 ? "true" : undefined}
          aria-hidden={activePage !== 2}
          inert={activePage !== 2 && wheelTargetPage !== 2}
          style={{ transform: `translate3d(0, ${(2 - activePage) * 100}%, 0)` }}
        >
          <EssayQueue copy={copy} locale={locale} />
        </div>

        <PageProgress
          activePage={activePage}
          labels={pageLabels}
          locale={locale}
          onNavigate={navigateToId}
        />
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {locale === "zh"
            ? `第 ${activePage + 1} 页，共 ${PAGE_IDS.length} 页：${pageLabels[activePage]}`
            : `Page ${activePage + 1} of ${PAGE_IDS.length}: ${pageLabels[activePage]}`}
        </p>
      </main>
    </div>
  );
}
