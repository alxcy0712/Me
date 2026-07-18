import { lazy, startTransition, Suspense, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  EnvelopeSimple,
  GithubLogo,
} from "@phosphor-icons/react";

const WorldCompiler = lazy(() => import("./WorldCompiler.jsx"));

const content = {
  zh: {
    nav: { essays: "文章", index: "索引", about: "关于" },
    title: "万物皆为代码。",
    englishTitle: "EVERYTHING IS CODE.",
    definition: [
      "世界并非随机堆叠。每一种现象，",
      "都有它的输入、规则、状态与反馈。",
    ],
    context: ["从软件工程出发，继续理解人性、", "社会、市场与自己。"],
    cta: "阅读思考",
    indexTitle: "思考索引",
    indexSubtitle: "INDEX OF THOUGHT",
    aboutTitle: "关于这个人",
    aboutBody:
      "22 年毕业，曾从事 Java 开发。现在研究 AI、价值投资与思维方式，并记录复杂世界背后的运行规则。",
    queueTitle: "正在形成的文章",
    footer: "一个持续编译中的个人系统。",
    machineHint: "悬停，拆解这台机器",
    machineExpanded: "移开，重新合拢",
  },
  en: {
    nav: { essays: "Essays", index: "Index", about: "About" },
    title: "Everything is code.",
    englishTitle: "万物皆为代码。",
    definition: [
      "The world is not a random pile of events.",
      "Every phenomenon has inputs, rules, states, and feedback.",
    ],
    context: [
      "Starting from software engineering, I keep studying",
      "human nature, society, markets, and the self.",
    ],
    cta: "Explore essays",
    indexTitle: "Index of thought",
    indexSubtitle: "思考索引",
    aboutTitle: "About the observer",
    aboutBody:
      "I graduated in 2022 and previously worked as a Java developer. Today I study AI, value investing, and thinking systems while tracing the rules beneath a complex world.",
    queueTitle: "Essays taking shape",
    footer: "A personal system, continuously compiling.",
    machineHint: "Hover to decompile",
    machineExpanded: "Leave to recompile",
  },
};

const topics = {
  zh: [
    ["人性", "HUMAN NATURE", "决策、偏见、动机与成长，在复杂性中理解真实的人。"],
    ["社会", "SOCIETY", "制度、群体与协作，理解秩序如何产生与演化。"],
    ["投资", "INVESTING", "价值、概率与长期主义，在不确定中寻找可持续的复利。"],
    ["技术", "TECHNOLOGY", "工具、算法与系统思维，技术如何放大人的能力边界。"],
    ["自我", "SELF", "注意力、习惯与意义，构建清醒而自由的生活方式。"],
  ],
  en: [
    ["Human nature", "人性", "Decision, bias, motive, and growth—the rules behind a real person."],
    ["Society", "社会", "Institutions, groups, and cooperation—how order forms and evolves."],
    ["Investing", "投资", "Value, probability, and long horizons—compounding through uncertainty."],
    ["Technology", "技术", "Tools, algorithms, and systems—how technology extends human agency."],
    ["Self", "自我", "Attention, habit, and meaning—building a lucid and independent life."],
  ],
};

const plannedEssays = {
  zh: [
    ["01", "人为什么会为相信的东西寻找证据", "人性"],
    ["02", "群体如何把偶然变成共识", "社会"],
    ["03", "用规则对抗投资中的情绪", "价值投资"],
  ],
  en: [
    ["01", "Why belief keeps searching for evidence", "Human nature"],
    ["02", "How groups turn accidents into consensus", "Society"],
    ["03", "Using rules against emotion in investing", "Value investing"],
  ],
};

function MachineFallback() {
  return (
    <div className="machine-fallback" aria-hidden="true">
      <span>WORLD COMPILER</span>
    </div>
  );
}

export function App() {
  const [locale, setLocale] = useState("zh");
  const copy = content[locale];

  const toggleLocale = () => {
    startTransition(() => {
      setLocale((current) => (current === "zh" ? "en" : "zh"));
      document.documentElement.lang = locale === "zh" ? "en" : "zh-CN";
    });
  };

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="返回首页">
          EVERYTHING <span>/</span> 万物
        </a>
        <nav className="site-nav" aria-label="主导航">
          <a href="#essays">{copy.nav.essays} / Essays</a>
          <a href="#index">{copy.nav.index} / Index</a>
          <a href="#about">{copy.nav.about} / About</a>
          <button className="locale-toggle" type="button" onClick={toggleLocale}>
            {locale === "zh" ? "中 / EN" : "中文 / EN"}
          </button>
        </nav>
      </header>

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
            <WorldCompiler
              hint={copy.machineHint}
              expandedHint={copy.machineExpanded}
            />
          </Suspense>
        </div>
      </section>

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

      <section className="about-section" id="about" aria-labelledby="about-title">
        <p>ABOUT / 关于</p>
        <h2 id="about-title">{copy.aboutTitle}</h2>
        <p className="about-body">{copy.aboutBody}</p>
      </section>

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
    </main>
  );
}
