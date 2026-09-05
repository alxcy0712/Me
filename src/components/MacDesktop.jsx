import {
  AppleLogo,
  ArrowsOut,
  Article,
  BatteryHigh,
  FileText,
  FolderSimple,
  Info,
  MagnifyingGlass,
  Minus,
  Smiley,
  Trash,
  WifiHigh,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { topics } from "../content.js";

const DESKTOP_WIDTH = 1000;
const DESKTOP_HEIGHT = 625;
const STORAGE_KEY = "everything-is-code.macos-session.v4";

const FOLDER_LAYOUT = [
  { id: "human", x: 7, y: 142 },
  { id: "society", x: 122, y: 142 },
  { id: "investing", x: 237, y: 142 },
  { id: "technology", x: 7, y: 310 },
  { id: "self", x: 122, y: 310 },
];

const ENGLISH_NAMES = [
  "Human nature",
  "Society",
  "Investing",
  "Technology",
  "Self",
];

const ZH_NAMES = ["人性", "社会", "投资", "技术", "自我"];

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function readSession() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (value?.version !== 4) return null;
    return value;
  } catch {
    return null;
  }
}

function formatClock(locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).format(new Date());
}

function FolderIcon({ selected }) {
  return (
    <span className="mac-folder-icon" data-selected={selected || undefined}>
      <FolderSimple aria-hidden="true" size={70} weight="fill" />
    </span>
  );
}

function TrafficButton({ color, label, onClick, children }) {
  return (
    <button
      className={`traffic-button traffic-${color}`}
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function FinderWindow({
  folder,
  locale,
  onClose,
  onFocus,
  onMinimize,
  onOpenEssays,
  onToggleFullscreen,
  onQuickLook,
  onShowFiles,
  onWindowChange,
  windowState,
}) {
  const dragRef = useRef(null);
  const copy = locale === "zh";

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || windowState.maximized) return;
    const rect = event.currentTarget.closest(".mac-desktop").getBoundingClientRect();
    const scaleX = DESKTOP_WIDTH / rect.width;
    const scaleY = DESKTOP_HEIGHT / rect.height;
    onWindowChange({
      x: clamp(drag.x + (event.clientX - drag.clientX) * scaleX, 8, 990 - windowState.w),
      y: clamp(drag.y + (event.clientY - drag.clientY) * scaleY, 25, 614 - windowState.h),
    });
  };

  return (
    <section
      className="finder-window"
      data-active={windowState.active || undefined}
      data-maximized={windowState.maximized || undefined}
      role="dialog"
      aria-modal="false"
      aria-label={`${folder.title} — Finder`}
      style={
        windowState.maximized
          ? undefined
          : {
              left: windowState.x,
              top: windowState.y,
              width: windowState.w,
              height: windowState.h,
              zIndex: windowState.z,
            }
      }
      onPointerDown={onFocus}
    >
      <header
        className="finder-titlebar"
        onDoubleClick={onToggleFullscreen}
        onPointerDown={(event) => {
          if (event.button !== 0 || event.target.closest("button")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            x: windowState.x,
            y: windowState.y,
          };
          onFocus();
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <div className="traffic-controls">
          <TrafficButton color="red" label={copy ? "关闭窗口" : "Close window"} onClick={onClose}>
            <X aria-hidden="true" size={8} weight="bold" />
          </TrafficButton>
          <TrafficButton color="yellow" label={copy ? "最小化窗口" : "Minimize window"} onClick={onMinimize}>
            <Minus aria-hidden="true" size={8} weight="bold" />
          </TrafficButton>
          <TrafficButton color="green" label={copy ? "全屏窗口" : "Fullscreen window"} onClick={onToggleFullscreen}>
            <ArrowsOut aria-hidden="true" size={8} weight="bold" />
          </TrafficButton>
        </div>
        <strong>{folder.title}</strong>
        <span className="finder-title-count">3 {copy ? "项" : "items"}</span>
      </header>

      <div className="finder-body">
        <aside className="finder-sidebar" aria-label={copy ? "Finder 侧栏" : "Finder sidebar"}>
          <p>{copy ? "个人收藏" : "FAVORITES"}</p>
          <button type="button" onClick={onShowFiles}><Smiley aria-hidden="true" size={15} weight="fill" />{copy ? "我的文件" : "My Files"}</button>
          <button type="button" onClick={onOpenEssays}><Article aria-hidden="true" size={15} />{copy ? "文章" : "Essays"}</button>
        </aside>
        <div className="finder-content" data-scroll-region>
          <button className="finder-file" type="button" onDoubleClick={onQuickLook} onClick={onQuickLook}>
            <FileText aria-hidden="true" size={44} weight="duotone" />
            <span>README.md</span>
          </button>
          <button className="finder-file" type="button" onDoubleClick={onQuickLook} onClick={onQuickLook}>
            <Article aria-hidden="true" size={44} weight="duotone" />
            <span>{copy ? "正在形成的笔记.pages" : "Notes in progress.pages"}</span>
          </button>
          <button className="finder-file" type="button" onDoubleClick={onQuickLook} onClick={onQuickLook}>
            <Info aria-hidden="true" size={44} weight="duotone" />
            <span>{copy ? "规则与反馈.txt" : "Rules & feedback.txt"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function MacDesktop({
  interactive,
  locale,
  onInteractionLockChange,
  onOpenEssays,
  surfaceRef,
}) {
  const sessionRef = useRef(null);
  if (sessionRef.current === null && typeof window !== "undefined") {
    sessionRef.current = readSession();
  }
  const initial = sessionRef.current;
  const desktopRef = useRef(null);
  const folderDragRef = useRef(null);
  const lastTapRef = useRef({ id: "", time: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [positions, setPositions] = useState(() => {
    return Object.fromEntries(
      FOLDER_LAYOUT.map(({ id, x, y }) => [id, initial?.positions?.[id] ?? { x, y }]),
    );
  });
  const [customNames, setCustomNames] = useState({});
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [windows, setWindows] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [menu, setMenu] = useState(null);
  const [quickLook, setQuickLook] = useState(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [clock, setClock] = useState(() => formatClock(locale));

  const returnFocusToDesktop = () => {
    window.requestAnimationFrame(() => desktopRef.current?.focus());
  };

  const folders = useMemo(
    () =>
      FOLDER_LAYOUT.map((layout, index) => ({
        ...layout,
        description: topics[locale][index][2],
        english: ENGLISH_NAMES[index],
        id: layout.id,
        label: customNames[layout.id] || (locale === "zh" ? ZH_NAMES[index] : ENGLISH_NAMES[index]),
        meta: topics[locale][index][1],
        title: locale === "zh" ? ZH_NAMES[index] : ENGLISH_NAMES[index],
        zh: ZH_NAMES[index],
      })),
    [customNames, locale],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClock(formatClock(locale)), 30_000);
    setClock(formatClock(locale));
    return () => window.clearInterval(timer);
  }, [locale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          positions,
          version: 4,
        }),
      );
    }, 140);
    return () => window.clearTimeout(timer);
  }, [positions]);

  useEffect(() => {
    const locked = interactive && Boolean(contextMenu || menu || quickLook || folderDragRef.current);
    onInteractionLockChange?.(locked);
  }, [contextMenu, interactive, menu, onInteractionLockChange, quickLook]);

  const getFolder = (id) => folders.find((folder) => folder.id === id);

  const focusWindow = (id) => {
    setWindows((current) => {
      const maxZ = Math.max(10, ...current.map((item) => item.z || 10));
      return current.map((item) => ({
        ...item,
        active: item.id === id,
        z: item.id === id ? maxZ + 1 : item.z,
      }));
    });
  };

  const openFolder = (id) => {
    const folder = getFolder(id);
    if (!folder) return;
    setSelectedId(id);
    setContextMenu(null);
    setMenu(null);
    setWindows((current) => {
      const existing = current.find((item) => item.id === id);
      const maxZ = Math.max(10, ...current.map((item) => item.z || 10));
      if (existing) {
        return current.map((item) => ({
          ...item,
          active: item.id === id,
          minimized: item.id === id ? false : item.minimized,
          z: item.id === id ? maxZ + 1 : item.z,
        }));
      }
      const offset = current.length * 24;
      return [
        ...current.map((item) => ({ ...item, active: false })),
        {
          active: true,
          h: 370,
          id,
          maximized: false,
          minimized: false,
          w: 590,
          x: 150 + offset,
          y: 84 + offset,
          z: maxZ + 1,
        },
      ];
    });
    setLiveMessage(locale === "zh" ? `已打开“${folder.title}”` : `Opened ${folder.title}`);
  };

  const openQuickLook = (id = selectedId) => {
    const folder = getFolder(id);
    if (!folder) return;
    setQuickLook(folder);
    setContextMenu(null);
    setMenu(null);
  };

  const beginRename = (id = selectedId) => {
    const folder = getFolder(id);
    if (!folder) return;
    setRenameId(folder.id);
    setRenameValue(folder.label);
    setContextMenu(null);
  };

  const commitRename = () => {
    if (!renameId) return;
    const nextName = renameValue.trim();
    setCustomNames((current) => ({
      ...current,
      [renameId]: nextName || getFolder(renameId).title,
    }));
    setRenameId(null);
    returnFocusToDesktop();
  };

  const setWindow = (id, changes) => {
    setWindows((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  const cleanUpFolders = () => {
    setPositions(Object.fromEntries(FOLDER_LAYOUT.map(({ id, x, y }) => [id, { x, y }])));
    setContextMenu(null);
    setLiveMessage(locale === "zh" ? "已按网格整理桌面" : "Desktop cleaned up by grid");
  };

  const pointerToDesktop = (event) => {
    const rect = desktopRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (DESKTOP_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (DESKTOP_HEIGHT / rect.height),
    };
  };

  const handleDesktopKeyDown = (event) => {
    if (!interactive || renameId) return;
    if (event.key === "Escape") {
      setContextMenu(null);
      setMenu(null);
      setQuickLook(null);
      returnFocusToDesktop();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
      event.preventDefault();
      if (selectedId) openFolder(selectedId);
      return;
    }
    if (event.key === " " && selectedId) {
      event.preventDefault();
      openQuickLook();
      return;
    }
    if (event.shiftKey && event.key === "F10") {
      event.preventDefault();
      const position = positions[selectedId] || { x: 44, y: 86 };
      setContextMenu({
        folderId: selectedId,
        x: position.x + 84,
        y: position.y + 74,
      });
      return;
    }
    if (event.key === "Enter" && selectedId) {
      event.preventDefault();
      beginRename();
      return;
    }
    const direction = {
      ArrowDown: 3,
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    const currentIndex = Math.max(0, folders.findIndex((item) => item.id === selectedId));
    const nextIndex = clamp(currentIndex + direction, 0, folders.length - 1);
    setSelectedId(folders[nextIndex].id);
  };

  const activeFullscreen = windows.some((item) => item.maximized && !item.minimized);

  return (
    <div
      ref={(node) => {
        desktopRef.current = node;
        if (surfaceRef) surfaceRef.current = node;
      }}
      className="mac-desktop"
      data-desktop-keyboard
      data-interactive={interactive || undefined}
      data-fullscreen={activeFullscreen || undefined}
      aria-hidden={!interactive}
      inert={!interactive}
      tabIndex={interactive ? 0 : -1}
      aria-label={locale === "zh" ? "macOS Mojave 思考索引桌面" : "macOS Mojave index of thought desktop"}
      onKeyDown={handleDesktopKeyDown}
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget && !event.target.classList.contains("desktop-wallpaper")) return;
        setSelectedId(null);
        setContextMenu(null);
        setMenu(null);
      }}
      onContextMenu={(event) => {
        if (!interactive) return;
        event.preventDefault();
        const point = pointerToDesktop(event);
        setContextMenu({ folderId: null, x: point.x, y: point.y });
        setMenu(null);
      }}
    >
      <header className="mac-menu-bar" data-page-nav-block>
        <div className="mac-menu-left">
          <button type="button" aria-label={locale === "zh" ? "Apple 菜单" : "Apple menu"} onClick={() => setMenu(menu === "apple" ? null : "apple")}><AppleLogo aria-hidden="true" size={15} weight="fill" /></button>
          <button className="menu-strong" type="button" onClick={() => setMenu(menu === "finder" ? null : "finder")}>Finder</button>
          <button type="button" onClick={() => setMenu(menu === "file" ? null : "file")}>{locale === "zh" ? "文件" : "File"}</button>
          <button type="button" onClick={() => setMenu(menu === "edit" ? null : "edit")}>{locale === "zh" ? "编辑" : "Edit"}</button>
          <button type="button" onClick={() => setMenu(menu === "view" ? null : "view")}>{locale === "zh" ? "显示" : "View"}</button>
          <button type="button" onClick={() => setMenu(menu === "go" ? null : "go")}>{locale === "zh" ? "前往" : "Go"}</button>
          <button type="button" onClick={() => setMenu(menu === "window" ? null : "window")}>{locale === "zh" ? "窗口" : "Window"}</button>
          <button type="button" onClick={() => setMenu(menu === "help" ? null : "help")}>{locale === "zh" ? "帮助" : "Help"}</button>
        </div>
        <div className="mac-menu-right">
          <button type="button" aria-label={locale === "zh" ? "电池状态" : "Battery status"} onClick={() => setMenu(menu === "status" ? null : "status")}><BatteryHigh aria-hidden="true" size={17} weight="fill" /></button>
          <button type="button" aria-label={locale === "zh" ? "Wi-Fi 状态" : "Wi-Fi status"} onClick={() => setMenu(menu === "status" ? null : "status")}><WifiHigh aria-hidden="true" size={15} weight="bold" /></button>
          <button type="button" aria-label={locale === "zh" ? "聚焦搜索" : "Spotlight search"} onClick={() => { setSelectedId("technology"); setLiveMessage(locale === "zh" ? "聚焦已选中“技术”" : "Spotlight selected Technology"); }}><MagnifyingGlass aria-hidden="true" size={14} weight="bold" /></button>
          <span>{clock}</span>
        </div>
      </header>

      <div className="desktop-identity" aria-hidden="true">
        <strong>{locale === "zh" ? "思考索引" : "INDEX OF THOUGHT"}</strong>
        <span>{locale === "zh" ? "~/思考" : "~/thoughts"}</span>
      </div>

      <div className="desktop-folders" role="group" aria-label={locale === "zh" ? "思考主题文件夹" : "Thought folders"}>
        {folders.map((folder) => {
          const position = positions[folder.id];
          const selected = selectedId === folder.id;
          return (
            <button
              className="desktop-folder"
              data-page-nav-block
              data-selected={selected || undefined}
              type="button"
              key={folder.id}
              aria-label={`${folder.title} / ${folder.english}`}
              style={{ left: position.x, top: position.y }}
              onClick={(event) => {
                event.stopPropagation();
                if (folderDragRef.current?.moved) return;
                setSelectedId(folder.id);
                setContextMenu(null);
                setMenu(null);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                openFolder(folder.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const point = pointerToDesktop(event);
                setSelectedId(folder.id);
                setContextMenu({ folderId: folder.id, x: point.x, y: point.y });
                setMenu(null);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                folderDragRef.current = {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  id: folder.id,
                  moved: false,
                  x: position.x,
                  y: position.y,
                };
                setSelectedId(folder.id);
              }}
              onPointerMove={(event) => {
                const drag = folderDragRef.current;
                if (!drag || drag.id !== folder.id) return;
                const rect = desktopRef.current.getBoundingClientRect();
                const dx = (event.clientX - drag.clientX) * (DESKTOP_WIDTH / rect.width);
                const dy = (event.clientY - drag.clientY) * (DESKTOP_HEIGHT / rect.height);
                if (Math.hypot(dx, dy) > 5) drag.moved = true;
                if (!drag.moved) return;
                onInteractionLockChange?.(true);
                setPositions((current) => ({
                  ...current,
                  [folder.id]: {
                    x: clamp(Math.round((drag.x + dx) / 8) * 8, 8, 908),
                    y: clamp(Math.round((drag.y + dy) / 8) * 8, 32, 505),
                  },
                }));
              }}
              onPointerUp={(event) => {
                const drag = folderDragRef.current;
                folderDragRef.current = null;
                onInteractionLockChange?.(false);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                if (drag?.moved) return;
                if (event.pointerType === "touch" || event.pointerType === "pen") {
                  const now = performance.now();
                  if (lastTapRef.current.id === folder.id && now - lastTapRef.current.time < 450) {
                    openFolder(folder.id);
                    lastTapRef.current = { id: "", time: 0 };
                  } else {
                    lastTapRef.current = { id: folder.id, time: now };
                  }
                }
              }}
              onPointerCancel={() => {
                folderDragRef.current = null;
                onInteractionLockChange?.(false);
              }}
            >
              <FolderIcon selected={selected} />
              {renameId === folder.id ? (
                <input
                  autoFocus
                  aria-label={locale === "zh" ? "重命名文件夹" : "Rename folder"}
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") commitRename();
                    if (event.key === "Escape") {
                      setRenameId(null);
                      returnFocusToDesktop();
                    }
                  }}
                />
              ) : (
                <span className="folder-name">
                  <strong>{folder.label}</strong>
                  <small>{folder.english}</small>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {windows.map((windowState) => {
        if (windowState.minimized) return null;
        const folder = getFolder(windowState.id);
        return (
          <FinderWindow
            key={windowState.id}
            folder={folder}
            locale={locale}
            windowState={windowState}
            onFocus={() => focusWindow(windowState.id)}
            onClose={() => setWindows((current) => current.filter((item) => item.id !== windowState.id))}
            onMinimize={() => setWindow(windowState.id, { minimized: true })}
            onOpenEssays={onOpenEssays}
            onToggleFullscreen={() => setWindow(windowState.id, { maximized: !windowState.maximized })}
            onQuickLook={() => openQuickLook(windowState.id)}
            onShowFiles={() => setLiveMessage(locale === "zh" ? "正在显示当前文件夹的三个项目" : "Showing the three items in this folder")}
            onWindowChange={(changes) => setWindow(windowState.id, changes)}
          />
        );
      })}

      {contextMenu ? (
        <div className="mac-popover context-menu" role="menu" data-page-nav-block style={{ left: clamp(contextMenu.x, 8, 790), top: clamp(contextMenu.y, 28, 465) }}>
          {contextMenu.folderId ? (
            <>
              <button role="menuitem" type="button" onClick={() => openFolder(contextMenu.folderId)}>{locale === "zh" ? "打开" : "Open"}</button>
              <button role="menuitem" type="button" onClick={() => openQuickLook(contextMenu.folderId)}>{locale === "zh" ? "快速查看“README.md”" : "Quick Look “README.md”"}</button>
              <button role="menuitem" type="button" onClick={() => beginRename(contextMenu.folderId)}>{locale === "zh" ? "重新命名" : "Rename"}</button>
              <button role="menuitem" type="button" onClick={() => { openQuickLook(contextMenu.folderId); setLiveMessage(locale === "zh" ? "正在显示文件夹信息" : "Showing folder information"); }}>{locale === "zh" ? "显示简介" : "Get Info"}</button>
            </>
          ) : (
            <>
              <button role="menuitem" type="button" onClick={() => { setContextMenu(null); setLiveMessage(locale === "zh" ? "桌面已刷新" : "Desktop refreshed"); }}>{locale === "zh" ? "刷新桌面" : "Refresh Desktop"}</button>
              <button role="menuitem" type="button" onClick={cleanUpFolders}>{locale === "zh" ? "整理" : "Clean Up"}</button>
              <button role="menuitem" type="button" onClick={cleanUpFolders}>{locale === "zh" ? "按网格整理" : "Clean Up By Grid"}</button>
            </>
          )}
        </div>
      ) : null}

      {menu ? (
        <div className={`mac-popover menu-popover menu-${menu}`} role="menu" data-page-nav-block>
          {menu === "apple" ? <button role="menuitem" type="button" onClick={() => { setMenu(null); setLiveMessage(locale === "zh" ? "2015 Retina MacBook Pro · macOS Mojave" : "2015 Retina MacBook Pro · macOS Mojave"); }}>{locale === "zh" ? "关于本机" : "About This Mac"}</button> : null}
          {menu === "finder" ? <button role="menuitem" type="button" onClick={() => openFolder(selectedId || "human")}>{locale === "zh" ? "打开所选项目" : "Open Selected Item"}</button> : null}
          {menu === "file" ? <button role="menuitem" type="button" onClick={() => { if (selectedId) beginRename(selectedId); else { setMenu(null); setLiveMessage(locale === "zh" ? "请先选择一个文件夹" : "Select a folder first"); } }}>{locale === "zh" ? "重新命名" : "Rename"}</button> : null}
          {menu === "edit" ? <button role="menuitem" type="button" onClick={() => { setSelectedId("human"); setMenu(null); setLiveMessage(locale === "zh" ? "已选择桌面第一项" : "Selected the first desktop item"); }}>{locale === "zh" ? "选择第一项" : "Select First Item"}</button> : null}
          {menu === "view" ? <button role="menuitem" type="button" onClick={cleanUpFolders}>{locale === "zh" ? "整理桌面" : "Clean Up Desktop"}</button> : null}
          {menu === "go" ? <button role="menuitem" type="button" onClick={() => openFolder("human")}>{locale === "zh" ? "个人文件夹" : "Home Folder"}</button> : null}
          {menu === "window" ? <button role="menuitem" type="button" onClick={() => { const topWindow = [...windows].sort((a, b) => b.z - a.z)[0]; if (topWindow) focusWindow(topWindow.id); setMenu(null); setLiveMessage(topWindow ? (locale === "zh" ? "窗口已前置" : "Window brought to front") : (locale === "zh" ? "当前没有打开的窗口" : "No open windows")); }}>{locale === "zh" ? "前置窗口" : "Bring Window to Front"}</button> : null}
          {menu === "help" ? <button role="menuitem" type="button" onClick={() => { setMenu(null); setLiveMessage(locale === "zh" ? "可双击文件夹，空格快速查看" : "Double-click folders; press Space for Quick Look"); }}>{locale === "zh" ? "Finder 使用提示" : "Finder Tips"}</button> : null}
          {menu === "status" ? <p>{locale === "zh" ? "电池：86% · Wi-Fi：已连接" : "Battery: 86% · Wi-Fi: Connected"}</p> : null}
        </div>
      ) : null}

      {quickLook ? (
        <section className="quick-look" role="dialog" aria-modal="false" aria-labelledby="quick-look-title" data-page-nav-block>
          <header>
            <span />
            <strong id="quick-look-title">README.md — {quickLook.title}</strong>
            <button type="button" aria-label={locale === "zh" ? "关闭快速查看" : "Close Quick Look"} onClick={() => { setQuickLook(null); returnFocusToDesktop(); }}><X aria-hidden="true" size={16} /></button>
          </header>
          <article data-scroll-region>
            <p className="quick-look-path">~/thoughts/{quickLook.english.toLowerCase().replaceAll(" ", "-")}/README.md</p>
            <h2>{quickLook.zh} / {quickLook.english}</h2>
            <p>{quickLook.description}</p>
            <hr />
            <p className="quick-look-meta">{quickLook.meta}</p>
          </article>
        </section>
      ) : null}

      <nav className="mac-dock" aria-label="Dock" data-page-nav-block>
        <button type="button" aria-label="Finder" onClick={() => openFolder(selectedId || "human")}><Smiley aria-hidden="true" size={34} weight="fill" /><span>Finder</span></button>
        <button type="button" aria-label={locale === "zh" ? "前往文章" : "Open essays"} onClick={onOpenEssays}><Article aria-hidden="true" size={32} weight="duotone" /><span>{locale === "zh" ? "文章" : "Essays"}</span></button>
        {windows.map((windowState) => (
          <button className="dock-window" type="button" key={windowState.id} aria-label={`${locale === "zh" ? "恢复" : "Restore"} ${getFolder(windowState.id).title}`} onClick={() => { setWindow(windowState.id, { minimized: false }); focusWindow(windowState.id); }}>
            <FolderSimple aria-hidden="true" size={30} weight="fill" />
            <span>{getFolder(windowState.id).title}</span>
          </button>
        ))}
        <i aria-hidden="true" />
        <button type="button" aria-label={locale === "zh" ? "废纸篓" : "Trash"} onClick={() => setLiveMessage(locale === "zh" ? "废纸篓是空的" : "Trash is empty")}><Trash aria-hidden="true" size={30} weight="duotone" /><span>{locale === "zh" ? "废纸篓" : "Trash"}</span></button>
      </nav>

      <p className="desktop-live" aria-live="polite">{liveMessage}</p>
    </div>
  );
}
