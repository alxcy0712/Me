import { lazy, startTransition, Suspense, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  EnvelopeSimple,
  GithubLogo,
} from "@phosphor-icons/react";
import { content, plannedEssays, topics } from "./content.js";

const WorldCompiler = lazy(() => import("./components/WorldCompiler.jsx"));

function Header({ copy, locale, onToggleLocale }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="返回首页">
        EVERYTHING <span>/</span> 万物
      </a>
      <nav className="site-nav" aria-label="主导航">
        <a href="#essays">{copy.nav.essays} / Essays</a>
        <a href="#index">{copy.nav.index} / Index</a>
        <a href="#about">{copy.nav.about} / About</a>
        <button className="locale-toggle" type="button" onClick={onToggleLocale}>
          {locale === "zh" ? "中 / EN" : "中文 / EN"}
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

function Hero({ copy }) {
  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="folio">NO. 001 · PERSONAL SYSTEM</p>
        <h1>{copy.title}</h1>
        <p className="hero-translation">{copy.englishTitle}</p>

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
          <a className="primary-link" href="#essays">
            {copy.cta} / Explore Essays
            <ArrowRight aria-hidden="true" size={18} weight="regular" />
          </a>
          <div className="social-links" aria-label="社交与联系方式">
            <a href="https://github.com/alxcy0712" target="_blank" rel="noreferrer">
              <GithubLogo aria-hidden="true" size={21} weight="regular" />
              GitHub
              <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
            </a>
            <a href="#contact">
              <EnvelopeSimple aria-hidden="true" size={21} weight="regular" />
              Gmail
              <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
            </a>
          </div>
        </div>
      </div>

      <div className="machine-column">
        <Suspense fallback={<MachineFallback />}>
          <WorldCompiler hint={copy.machineHint} expandedHint={copy.machineExpanded} />
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
      <div className="section-kicker">NOTES · 2026</div>
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

function About({ copy }) {
  return (
    <section className="about-section" id="about" aria-labelledby="about-title">
      <p>ABOUT / 关于</p>
      <h2 id="about-title">{copy.aboutTitle}</h2>
      <p className="about-body">{copy.aboutBody}</p>
    </section>
  );
}

function Footer({ copy }) {
  return (
    <footer className="site-footer" id="contact">
      <p>{copy.footer}</p>
      <div>
        <a href="https://github.com/alxcy0712" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span>Gmail · 发布前补充</span>
      </div>
      <p>2026 · VOL. 001</p>
    </footer>
  );
}

export function App() {
  const [locale, setLocale] = useState("zh");
  const copy = content[locale];

  const toggleLocale = () => {
    startTransition(() => {
      setLocale((current) => {
        const nextLocale = current === "zh" ? "en" : "zh";
        document.documentElement.lang = nextLocale === "zh" ? "zh-CN" : "en";
        return nextLocale;
      });
    });
  };

  return (
    <main className="site-shell">
      <Header copy={copy} locale={locale} onToggleLocale={toggleLocale} />
      <Hero copy={copy} />
      <ThoughtIndex copy={copy} locale={locale} />
      <EssayQueue copy={copy} locale={locale} />
      <About copy={copy} />
      <Footer copy={copy} />
    </main>
  );
}
