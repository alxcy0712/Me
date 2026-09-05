import {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, ArrowUpRight, GithubLogo } from "@phosphor-icons/react";
import { content, plannedEssays } from "./content.js";
import { usePageController } from "./hooks/usePageController.js";

const WorldCompiler = lazy(() => import("./components/WorldCompiler.jsx"));
const LaptopIndex = lazy(() => import("./components/LaptopIndex.jsx"));

const PAGE_IDS = ["top", "index", "essays"];
const PAGE_LABELS = {
  zh: ["封面", "思考索引", "文章"],
  en: ["Cover", "Index", "Essays"],
};

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function smoothstep(value) {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
}

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
          {copy.definition.map((line) => <span key={line}>{line}</span>)}
        </div>
        <div className="short-rule" aria-hidden="true" />
        <div className="context-copy">
          {copy.context.map((line) => <span key={line}>{line}</span>)}
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
    <nav className="page-progress" aria-label={locale === "zh" ? "章节导航" : "Section navigation"}>
      {labels.map((label, index) => (
        <button
          className="page-progress-button"
          type="button"
          key={PAGE_IDS[index]}
          aria-current={activePage === index ? "page" : undefined}
          aria-label={locale === "zh" ? `前往第 ${index + 1} 页：${label}` : `Go to page ${index + 1}: ${label}`}
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
  const initialPageRef = useRef(getInitialPage());
  const [locale, setLocale] = useState("zh");
  const [mountLaptop, setMountLaptop] = useState(initialPageRef.current === 1);
  const heroSlideRef = useRef(null);
  const essaySlideRef = useRef(null);
  const viewportRef = useRef(null);
  const laptopRef = useRef(null);
  const pagePositionRef = useRef(initialPageRef.current);
  const desktopLockedRef = useRef(false);
  const copy = content[locale];
  const pageLabels = PAGE_LABELS[locale];

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = copy.documentTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", copy.documentDescription);
  }, [copy, locale]);

  const renderFrame = useCallback((position, velocity) => {
    pagePositionRef.current = position;
    if (viewportRef.current) {
      viewportRef.current.dataset.pagePosition = position.toFixed(4);
      viewportRef.current.dataset.pageVelocity = velocity.toFixed(4);
    }
    const heroProgress = clamp(position, 0, 1);
    const essayProgress = clamp(position - 1, 0, 1);
    if (heroSlideRef.current) {
      const reveal = 1 - smoothstep(heroProgress / 0.58);
      heroSlideRef.current.style.transform = `translate3d(0, ${(reveal - 1) * 100}%, 0)`;
      heroSlideRef.current.style.opacity = String(reveal);
    }
    if (essaySlideRef.current) {
      const reveal = smoothstep((essayProgress - 0.42) / 0.58);
      essaySlideRef.current.style.transform = `translate3d(0, ${(1 - reveal) * 100}%, 0)`;
      essaySlideRef.current.style.opacity = String(reveal);
    }
    laptopRef.current?.setPose(position, velocity);
  }, []);

  const {
    cancelPointer,
    handlePointerDown,
    handlePointerUp,
    isMoving,
    reducedMotion,
    requestPage,
    settledPage,
    targetPage,
    wheelTargetPage,
  } = usePageController({
    getInteractionLocked: () => desktopLockedRef.current,
    initialPage: initialPageRef.current,
    onFrame: renderFrame,
    pageCount: PAGE_IDS.length,
    pageIds: PAGE_IDS,
  });

  useEffect(() => {
    if (isMoving || targetPage === 1 || settledPage === 1) setMountLaptop(true);
  }, [isMoving, settledPage, targetPage]);

  useEffect(() => {
    // Prepare the second scene while the cover is idle, before the first swipe.
    if (window.requestIdleCallback) {
      const idle = window.requestIdleCallback(() => setMountLaptop(true), { timeout: 1200 });
      return () => window.cancelIdleCallback(idle);
    }
    const timer = window.setTimeout(() => setMountLaptop(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mountLaptop) laptopRef.current?.setPose(pagePositionRef.current, 0);
  }, [mountLaptop]);

  const navigateToId = useCallback((pageId) => {
    const page = typeof pageId === "number" ? pageId : PAGE_IDS.indexOf(pageId);
    if (page >= 0) requestPage(page);
  }, [requestPage]);

  const toggleLocale = () => {
    startTransition(() => setLocale((current) => (current === "zh" ? "en" : "zh")));
  };

  const indicatedPage = isMoving ? targetPage : settledPage;
  const laptopInteractive = settledPage === 1 && !isMoving;

  return (
    <div
      className="site-shell"
      data-page={indicatedPage}
      data-reduced-motion={reducedMotion || undefined}
    >
      <Header activePage={indicatedPage} copy={copy} onNavigate={navigateToId} onToggleLocale={toggleLocale} />
      <main
        ref={viewportRef}
        className="page-viewport"
        data-moving={isMoving || undefined}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelPointer}
      >
        {mountLaptop ? (
          <Suspense fallback={<div className="laptop-transition laptop-suspense" aria-hidden="true" />}>
            <LaptopIndex
              ref={laptopRef}
              initialPosition={pagePositionRef.current}
              interactive={laptopInteractive}
              locale={locale}
              reducedMotion={reducedMotion}
              onInteractionLockChange={(locked) => {
                desktopLockedRef.current = locked;
              }}
              onOpenEssays={() => navigateToId("essays")}
              wheelTarget={wheelTargetPage === 1}
            />
          </Suspense>
        ) : null}

        <div
          ref={heroSlideRef}
          className="page-slide page-slide-hero"
          data-page-index="0"
          data-wheel-target={wheelTargetPage === 0 ? "true" : undefined}
          aria-hidden={settledPage !== 0}
          inert={settledPage !== 0 && wheelTargetPage !== 0}
        >
          <Hero copy={copy} onNavigate={navigateToId} />
        </div>

        <div
          ref={essaySlideRef}
          className="page-slide page-slide-essays"
          data-page-index="2"
          data-wheel-target={wheelTargetPage === 2 ? "true" : undefined}
          aria-hidden={settledPage !== 2}
          inert={settledPage !== 2 && wheelTargetPage !== 2}
          style={{ transform: `translate3d(0, ${(2 - initialPageRef.current) * 100}%, 0)` }}
        >
          <EssayQueue copy={copy} locale={locale} />
        </div>

        <PageProgress activePage={indicatedPage} labels={pageLabels} locale={locale} onNavigate={navigateToId} />
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {locale === "zh"
            ? `第 ${settledPage + 1} 页，共 ${PAGE_IDS.length} 页：${pageLabels[settledPage]}`
            : `Page ${settledPage + 1} of ${PAGE_IDS.length}: ${pageLabels[settledPage]}`}
        </p>
      </main>
    </div>
  );
}
