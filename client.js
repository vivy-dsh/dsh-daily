/**
 * dsh-daily —— 「日常」页面插件（浏览器半身）。
 *
 * 视觉与条目最初照着 Open Design 的 OpenToday 工作台原型（index.html + assets/app.js）
 * 抄：左边是对话栏，右边是上下文面板。**但分块按主人 2026-11-14 17:44 的方案**，不是原型
 * 那四页——右栏是 Today / 任务 / 悄悄话 三页；悄悄话还没有数据源，只放占位。
 * 外观是 Lumen Studio 式的轻商务工作台（暖灰画布、白卡、细发丝线、软投影、
 * 珊瑚色强调；字标是小写衬线 diva.）。
 *
 * 只有界面：切换标签只活在组件 state 里。右栏不碰真正的邮件/日历/任务。
 *
 * 左栏是接 Superagent 主会话的微信式聊天，手写 DOM；右栏三页（Today / 任务 / 悄悄话）
 * 不再手写卡片 DOM，全部由 genui `dsh-ui` spec 渲染：spec 数据在本文件上半部
 * （`EMPTY_TODAY` / `EMPTY_TASKS` / `WHISPER_CARDS`），渲染器是本文件里 vendored 的一小份
 * genui 子集（`validateSpec` + `renderSpec`，19 种节点）。来源、裁剪范围与魔改点见
 * VENDORED-genui.md。
 *
 * 左侧栏入口在 `sidebar.panellist` 注册：id `daily`、order -5（在「插件」之上）。
 * 它必须在 VIVY 的分组之外，这一条由 dsh-vivy-studio 的 sidebar-core.js 白名单保证。
 */

window.__ModuleLoader__.load({
  /* 必须是包名。名字对不上时宿主毫无异样，只会在控制台留一句
     `loaded without registering`，用户看到的现象就是左栏没有这一栏。 */
  id: 'dsh-daily',
  factory: (require) => {
    const React = require('react');

    const inject = ['slots'];

/* ── 图标：一支描边的笔，24 格，currentColor ──────────────────────────────── */

const ico = (children, size) => React.createElement('svg', {
  viewBox: '0 0 24 24',
  width: size || 16,
  height: size || 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}, children);

const p = (d) => React.createElement('path', { key: 'p' + d.length + d.slice(0, 6), d, fill: 'none' });
const c = (cx, cy, r, filled) => React.createElement('circle', {
  key: 'c' + cx + '-' + cy + '-' + r,
  cx, cy, r,
  fill: filled ? 'currentColor' : 'none',
  stroke: filled ? 'none' : undefined,
});

const ICON = {
  spark: () => ico([p('M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.6 10.4 12.2 6 10.6 10.4 9Z'), p('M18.5 4v2.4'), p('M17.3 5.2h2.4')]),
  mail: () => ico([p('M3.6 7.2h16.8v9.6H3.6z'), p('m3.6 8.2 8.4 5.4 8.4-5.4')]),
  calendar: () => ico([p('M4.4 6.4h15.2v13.2H4.4z'), p('M4.4 10.4h15.2'), p('M8.6 4.2v4'), p('M15.4 4.2v4')]),
  folder: () => ico([p('M3.8 7.2h6l2 2.2h8.4v9.4H3.8z')]),
  chat: () => ico([p('M20 12.6c0 3.3-3.6 6-8 6-.9 0-1.8-.1-2.6-.3L5 20l1.1-3.1A5.6 5.6 0 0 1 4 12.6c0-3.3 3.6-6 8-6s8 2.7 8 6Z')]),
  globe: () => ico([c(12, 12, 8.2), p('M3.8 12h16.4'), p('M12 3.8c2.4 2.2 3.6 5 3.6 8.2s-1.2 6-3.6 8.2c-2.4-2.2-3.6-5-3.6-8.2S9.6 6 12 3.8Z')]),
  monitor: () => ico([p('M3.6 5.4h16.8v10.2H3.6z'), p('M9 19.4h6'), p('M12 15.6v3.8')]),
  lock: () => ico([p('M6.4 10.8h11.2v8.4H6.4z'), p('M9.2 10.8V8.2a2.8 2.8 0 0 1 5.6 0v2.6')]),
  plus: () => ico([p('M12 5.4v13.2'), p('M5.4 12h13.2')]),
  chevron: () => ico([p('m9.6 6.6 5.4 5.4-5.4 5.4')]),
  more: () => ico([c(6, 12, 1.2, true), c(12, 12, 1.2, true), c(18, 12, 1.2, true)]),
  send: () => ico([p('M12 18.6V6'), p('m6.4 11.2 5.6-5.6 5.6 5.6')]),
  check: () => ico([p('m5.4 12.4 4.2 4.2L18.6 7.6')]),
  clock: () => ico([c(12, 12, 8), p('M12 7.8V12l3 1.8')]),
  moon: () => ico([p('M20 14.4A8.2 8.2 0 1 1 9.6 4 6.6 6.6 0 0 0 20 14.4Z')]),
  sun: () => ico([c(12, 12, 4.2), p('M12 3.4v2.4'), p('M12 18.2v2.4'), p('M3.4 12h2.4'), p('M18.2 12h2.4'), p('M5.9 5.9l1.7 1.7'), p('M16.4 16.4l1.7 1.7'), p('M18.1 5.9l-1.7 1.7'), p('M7.6 16.4l-1.7 1.7')]),
  pulse: () => ico([p('M3.4 12.4h3.4l2.2-5.2 3 10 2.4-6 1.8 3h4.4')]),
  steps: () => ico([p('M13.6 8.6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'), p('M11.2 20c-1.4-1.6-1.6-3.6-.4-5.2l1.6-2.2-3 1.2'), p('M16.4 13.6a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4Z'), p('M15.2 20c1.2-1.4 1.6-3 1-4.6')]),
  heart: () => ico([p('M12 19.6S4.6 15.4 4.6 10.6a4 4 0 0 1 7.4-2 4 4 0 0 1 7.4 2c0 4.8-7.4 9-7.4 9Z')]),
  pin: () => ico([p('M12 20s5.6-5 5.6-9.2a5.6 5.6 0 1 0-11.2 0C6.4 15 12 20 12 20Z'), c(12, 10.8, 2.1)]),
  target: () => ico([c(12, 12, 8), c(12, 12, 3.6)]),
  file: () => ico([p('M6.4 4.4h7.2l4 4v11.2H6.4z'), p('M13.6 4.4v4h4')]),
};

/* ── 内容：全部照抄原型 ──────────────────────────────────────────────────── */

/* 左栏只留「她的话 / 你的话」，所以这一段文案不再有假对话、假清单、假邮件。 */
const CHAT = {
  brand: 'diva',
  placeholder: '和她说点什么…',
  send: '发送',
  stop: '停止',
  retry: '重试',
  typing: '正在输入…',
  noSession: '还没有接上 Superagent 主会话',
  noSessionHint: '主会话起来之后这一栏会自动接上，也可以点重试再找一次。',
  attachFailed: '接不上 Superagent 主会话',
  sendFailed: '发送失败：',
  firstWords: '说第一句话吧。',
  newChat: '新建聊天',
  newChatHint: '从这里重新开始看：上面的收起来，会话还是同一条。',
  foldMore: (count) => '展开更早的 ' + count + ' 条',
  foldLess: '收起',
  fresh: '新的一段，从这句话开始。',
  at: '在线',
  busy: '处理中',
  offline: '未接上',
};

/* ── 右栏内容：genui `dsh-ui` spec ──────────────────────────────────────────

   右栏不再手写卡片 DOM：每一块内容都是一份 spec（`{ title?, gap?, items }`），
   交给本文件下半部 vendored 的渲染器（`renderSpec`）画。文案仍然逐行照抄原型。

   下面几个小工厂只是把 spec 写短一点，产出仍然是普通的 GenuiSpec / GenuiNode。
   验证期那几张示例卡与四条演示任务已经删除（2026-11-15）；没有数据源时右栏给
   安静的空态，不再摆假内容。 */

const t = (content, size, extra) => ({ type: 'text', content, size: size || 'body', ...extra });
const badge = (label, tone) => ({ type: 'badge', label, tone });
const card = (items, extra) => ({ type: 'card', items, ...extra });
const row = (items, extra) => ({ type: 'row', items, ...extra });
const spacer = { type: 'spacer' };

/* ── 样式：Lumen 式的工作台 ───────────────────────────────────────────────── */

const CSS = `
/* ── 纸墨 → 轻商务：Lumen Studio 式的工作台 ─────────────────────────────────

   参考 oil-ui-pro 作品库里的 Lumen Studio（设计工作室运营台）：暖白灰画布、
   纯白卡片、细发丝线、软投影、珊瑚色强调，字重只分 400/500/600/650，
   数字用等宽对齐。整个页面是一张浅灰工作台，对话栏和右栏卡片浮在上面。

   保留可读性与状态语义：小字最低 11px，正文 13–13.5px，行高 1.6 以上；
   颜色仍是同一套语义（成功/警告/危险/强调），不靠色相区分状态。 */
.dl{--dl-canvas:#f4f3ef;--dl-paper:#ffffff;--dl-paper-2:#f7f6f2;--dl-paper-3:#f1efeb;--dl-ink:#1f1e1c;--dl-ink-2:#6e6b66;--dl-ink-3:#9a968f;--dl-rule:#e7e5e0;--dl-rule-soft:#efede9;--dl-rule-strong:#dbd8d2;--dl-lede:rgb(31 30 28/.1);--dl-accent:#e4603e;--dl-accent-ink:#b8432a;--dl-accent-wash:#fdefe9;--dl-me:#ffece6;--dl-me-line:#f6d5ca;--dl-ok:#3f7d5a;--dl-ok-bg:#edf6f1;--dl-warn:#a8681a;--dl-warn-bg:#fbf1e1;--dl-danger:#c0392b;--dl-danger-bg:#fdeeec;--dl-grad:linear-gradient(135deg,#e4603e 0%,#d94b2b 100%);--dl-brand:var(--dl-accent);--dl-r:16px;--dl-r-sm:12px;--dl-r-xs:10px;--dl-shadow:0 1px 2px rgb(31 30 28/.04),0 16px 40px -24px rgb(31 30 28/.24);--dl-shadow-sm:0 1px 2px rgb(31 30 28/.06);--dl-shadow-hover:0 2px 4px rgb(31 30 28/.05),0 22px 48px -26px rgb(31 30 28/.3);--dl-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--dl-fs-caption:11px;--dl-fs-small:12px;--dl-fs-body:13px;--dl-fs-h3:13.5px;--dl-fs-h2:15px;--dl-fs-h1:22px;--dl-fs-display:26px;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dl-canvas);color:var(--dl-ink);font-size:var(--dl-fs-body);line-height:1.65;text-wrap:pretty}
.dl *,.dl *::before,.dl *::after{box-sizing:border-box}
.dl-app{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:18px;padding:22px;font-family:inherit}
.dl-app>*{min-width:0;min-height:0}

/* 左：对话栏 */
.dl-chat{display:flex;flex-direction:column;min-height:0;background:var(--dl-paper);border:1px solid var(--dl-rule);border-radius:var(--dl-r);box-shadow:var(--dl-shadow);overflow:hidden}
.dl-chat-head{flex:none;display:flex;align-items:center;gap:12px;padding:16px 20px 12px}
.dl-wordmark{display:inline-flex;align-items:baseline;gap:1px;font-family:Georgia,"Palatino Linotype","Noto Serif SC","Songti SC",serif;font-size:22px;font-weight:400;line-height:1;letter-spacing:-.045em;color:var(--dl-ink);white-space:nowrap}
.dl-wordmark-dot{color:var(--dl-accent);font-size:1em;line-height:1;letter-spacing:0}
.dl-thread-pill{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding:5px 11px;border:1px solid #dcefe5;border-radius:999px;background:var(--dl-ok-bg);color:#2f6e4f;font:inherit;font-size:11.5px;font-weight:600;cursor:default}
.dl-thread-pill i{width:6px;height:6px;border-radius:50%;background:#4cae72;box-shadow:0 0 0 3px rgb(76 174 114/.14)}
.dl-thread-pill[data-live="off"]{border-color:#f0e2cb;background:var(--dl-warn-bg);color:var(--dl-warn)}
.dl-thread-pill[data-live="off"] i{background:#c8944a;box-shadow:0 0 0 3px rgb(200 148 74/.16)}
.dl-head-actions{display:flex;align-items:center;gap:8px}
.dl-thread{flex:1;min-height:0;overflow:auto;padding:8px 20px 10px;scrollbar-width:thin;scrollbar-color:var(--dl-rule-strong) transparent}
.dl-thread::-webkit-scrollbar,.dl-ctx-scroll::-webkit-scrollbar{width:10px}
.dl-thread::-webkit-scrollbar-thumb,.dl-ctx-scroll::-webkit-scrollbar-thumb{background:var(--dl-rule-strong);border-radius:99px;border:3px solid transparent;background-clip:padding-box}
.dl-thread::-webkit-scrollbar-thumb:hover,.dl-ctx-scroll::-webkit-scrollbar-thumb:hover{background:#cdcac4;background-clip:padding-box}
.dl-thread::-webkit-scrollbar-track,.dl-ctx-scroll::-webkit-scrollbar-track{background:transparent}
.dl-msg{display:flex;margin-bottom:14px}
.dl-msg--me{justify-content:flex-end}
.dl-bubble{max-width:86%;min-width:0;padding:10px 14px;border-radius:16px 16px 16px 6px;background:var(--dl-paper-2);border:1px solid var(--dl-rule-soft);font-size:13.5px;line-height:1.68;color:var(--dl-ink)}
.dl-bubble p{margin:0;white-space:pre-wrap;word-break:break-word}
.dl-bubble p+p{margin-top:10px}
.dl-msg--me .dl-bubble{background:var(--dl-me);border-color:var(--dl-me-line);border-radius:16px 16px 6px 16px}
.dl-msg--ui .dl-bubble{flex:1 1 auto;max-width:100%}
/* 她写的界面：沙箱 iframe。边框与卡片同一套语言，高度由内容回报。 */
.dl-ui{margin:10px 0}
.dl-ui:first-child{margin-top:0}
.dl-ui:last-child{margin-bottom:0}
.dl-ui-frame{display:block;width:100%;border:1px solid var(--dl-rule);border-radius:var(--dl-r-sm);background:var(--dl-paper)}
/* 右栏 Today：worker 写的那一页。标题条常驻，没内容时只说还没有人写。 */
.dl-today-bar{display:flex;align-items:center;gap:8px;margin:0 0 12px}
.dl-today-label{flex:1;min-width:0;font-size:11.5px;color:var(--dl-ink-3);letter-spacing:.04em}
.dl-today-refresh{flex:none;appearance:none;cursor:pointer;font:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:8px;border:1px solid var(--dl-rule);background:var(--dl-paper);color:var(--dl-ink-2);box-shadow:var(--dl-shadow-sm)}
.dl-today-refresh:hover{color:var(--dl-ink);border-color:var(--dl-rule-strong)}
.dl-today-refresh:disabled{opacity:.45;cursor:default;box-shadow:none}
.dl-today-wrap{margin:0 0 12px}
.dl-today-frame{display:block;width:100%;border:1px solid var(--dl-rule);border-radius:var(--dl-r-sm);background:var(--dl-paper)}
/* Today：按天分区的结构化卡（genui spec）。日期分区头就是 divider 的 label。 */
.dl-today-days{display:flex;flex-direction:column;gap:16px;min-width:0}
.dl-today-days .dl-g-divider--labeled{font-size:11.5px;font-weight:600;letter-spacing:.04em;color:var(--dl-ink-3);gap:10px;margin:6px 0 2px;font-variant-numeric:tabular-nums}
/* 右栏 Today 的读取态：三张空卡骨架。只占位，不假装「今天没卡」。 */
.dl-today-days--loading{gap:12px}
.dl-skel-card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px 17px;background:var(--dl-paper);border:1px solid var(--dl-rule-soft);border-radius:var(--dl-r-sm);box-shadow:var(--dl-shadow-sm)}
.dl-skel-line{height:10px;border-radius:5px;background:linear-gradient(90deg,#efede9,#e5e2dc,#efede9);background-size:200% 100%;animation:dl-skel 1.6s ease-in-out infinite}
.dl-skel-line--title{height:12px;width:52%}
.dl-skel-line--w1{width:64%}
.dl-skel-line--w2{width:92%}
.dl-skel-line--w3{width:76%}
@keyframes dl-skel{0%{background-position:100% 0}100%{background-position:-100% 0}}
.dl-btn{appearance:none;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;padding:6px 14px;border-radius:var(--dl-r-xs);border:1px solid var(--dl-ink);background:var(--dl-ink);color:#fff;box-shadow:none;transition:transform 120ms ease,background 120ms ease,color 120ms ease}
.dl-btn:hover{background:#33312e;border-color:#33312e}
.dl-btn:active{transform:translateY(1px)}
.dl-btn--ghost{background:var(--dl-paper);color:var(--dl-ink);border-color:var(--dl-rule);box-shadow:var(--dl-shadow-sm)}
.dl-btn--ghost:hover{background:var(--dl-paper-3);border-color:var(--dl-rule-strong)}
.dl-composer{flex:none;padding:10px 20px 16px}
.dl-composer-pill{display:flex;align-items:flex-end;gap:8px;padding:8px 8px 8px 14px;border-radius:14px;background:var(--dl-paper);border:1px solid var(--dl-rule);box-shadow:var(--dl-shadow-sm)}
.dl-composer-pill:focus-within{border-color:var(--dl-accent);box-shadow:0 0 0 3px rgb(228 96 62/.14)}
.dl-input{flex:1;min-width:0;border:0;background:transparent;font:inherit;font-size:13px;color:var(--dl-ink);outline:none;padding:5px 0 3px}
.dl-input::placeholder{color:var(--dl-ink-3)}
.dl-send{flex:none;width:30px;height:30px;border-radius:9px;border:0;background:var(--dl-ink);color:#fff;display:grid;place-items:center;cursor:pointer}
.dl-send:hover{background:#33312e}

/* 右：上下文栏 */
.dl-ctx{display:flex;flex-direction:column;min-height:0}
.dl-ctx-head{flex:none;display:flex;align-items:center;gap:8px;padding:4px 2px 12px}
.dl-tabs{display:flex;gap:2px;padding:3px;border-radius:10px;background:#ecebe6;border:1px solid var(--dl-rule-soft)}
.dl-tab{appearance:none;border:0;background:transparent;font:inherit;font-size:12.5px;font-weight:550;color:var(--dl-ink-2);padding:5px 14px;border-radius:8px;cursor:pointer;transition:background 140ms ease,color 140ms ease,box-shadow 140ms ease}
.dl-tab:hover{color:var(--dl-ink);background:rgb(31 30 28/.04)}
.dl-tab[data-active="true"]{background:var(--dl-paper);color:var(--dl-ink);box-shadow:var(--dl-shadow-sm);font-weight:650}
.dl-ctx-scroll{flex:1;min-height:0;overflow:auto;padding:2px 2px 22px;scrollbar-width:thin;scrollbar-color:var(--dl-rule-strong) transparent}
.dl-view{display:flex;flex-direction:column;gap:14px}

/* 右栏：genui dsh-ui spec 渲染（.dl-g-*，vendored 子集）
   颜色/圆角/阴影全部取上面的 --dl-* token，不新造配色、不引外部字体。 */
.dl-g-root{display:flex;flex-direction:column;gap:12px;min-width:0}
.dl-g-text{font-size:var(--dl-fs-body);color:var(--dl-ink);min-width:0;word-break:break-word}
.dl-g-text--display{font-size:var(--dl-fs-display);line-height:1.2;font-weight:650;letter-spacing:-.03em}
.dl-g-text--h1{font-size:var(--dl-fs-h1);line-height:1.25;font-weight:650;letter-spacing:-.02em}
.dl-g-text--h2{font-size:var(--dl-fs-h2);line-height:1.4;font-weight:600}
.dl-g-text--h3{font-size:var(--dl-fs-h3);line-height:1.45;font-weight:600}
.dl-g-text--body{font-size:var(--dl-fs-body)}
.dl-g-text--muted{font-size:12.5px;color:var(--dl-ink-2)}
.dl-g-text--caption{font-size:var(--dl-fs-caption);color:var(--dl-ink-3);letter-spacing:.02em}
.dl-g-text[data-tone="muted"]{color:var(--dl-ink-3)}
.dl-g-text[data-tone="danger"]{color:var(--dl-danger)}
.dl-g-text[data-tone="success"]{color:var(--dl-ok)}
.dl-g-text[data-tone="warning"]{color:var(--dl-warn)}
.dl-g-text[data-tone="info"]{color:var(--dl-ink-2)}
.dl-g-text--center{text-align:center}
.dl-g-text--right{text-align:right}
.dl-g-mono{font-family:var(--dl-mono);font-size:.94em}
.dl-g-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;margin-right:6px;vertical-align:-2px;color:currentColor}
.dl-g-card{display:flex;flex-direction:column;gap:12px;min-width:0;background:var(--dl-paper);border:1px solid var(--dl-rule);border-radius:var(--dl-r-sm);box-shadow:var(--dl-shadow-sm);padding:16px 17px}
.dl-g-card--flat{background:var(--dl-paper-2);box-shadow:none}
.dl-g-card[data-tone="info"]{background:var(--dl-paper-2);border-color:var(--dl-rule)}
.dl-g-card[data-tone="success"]{background:var(--dl-ok-bg);border-color:#dcefe5}
.dl-g-card[data-tone="warning"]{background:var(--dl-warn-bg);border-color:#f0e2cb}
.dl-g-card[data-tone="danger"]{background:var(--dl-danger-bg);border-color:#f5d9d4}
.dl-g-card-eyebrow{font-size:var(--dl-fs-caption);font-weight:600;letter-spacing:.08em;color:var(--dl-ink-3)}
.dl-g-card-title{font-size:14px;font-weight:650;line-height:1.42;letter-spacing:-.01em}
.dl-g-row{display:flex;align-items:center;gap:8px;min-width:0}
.dl-g-row--wrap{flex-wrap:wrap}
.dl-g-row--center{justify-content:center}
.dl-g-row--end{justify-content:flex-end}
.dl-g-row--between{justify-content:space-between}
.dl-g-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.dl-g-grid{display:grid;grid-template-columns:repeat(var(--dl-g-cols,2),minmax(0,1fr));gap:10px}
.dl-g-grid-span{min-width:0}
.dl-g-spacer{flex:1 1 auto;min-width:0;min-height:0}
.dl-g-badge{flex:none;display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;font-size:var(--dl-fs-caption);font-weight:600;letter-spacing:.01em;background:var(--dl-paper-3);color:var(--dl-ink-2);border:1px solid var(--dl-rule)}
.dl-g-badge::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor}
.dl-g-badge[data-tone="accent"]{background:var(--dl-accent-wash);color:var(--dl-accent-ink);border-color:#f4d3c7}
.dl-g-badge[data-tone="warn"]{background:var(--dl-warn-bg);color:var(--dl-warn);border-color:#f0e2cb}
.dl-g-badge[data-tone="success"]{background:var(--dl-ok-bg);color:var(--dl-ok);border-color:#dcefe5}
.dl-g-card > .dl-g-badge{align-self:flex-start}
.dl-g-badge[data-tone="danger"]{background:var(--dl-danger-bg);color:var(--dl-danger);border-color:#f5d9d4}
.dl-g-stat{display:flex;align-items:center;gap:10px;min-width:0;padding:11px 12px;border-radius:var(--dl-r-xs);background:var(--dl-paper-2);border:1px solid var(--dl-rule-soft)}
.dl-g-stat-body{display:flex;flex-direction:column;min-width:0;flex:1}
.dl-g-stat-label{font-size:var(--dl-fs-caption);color:var(--dl-ink-3);letter-spacing:.02em}
.dl-g-stat-value{font-size:13.5px;font-weight:650;line-height:1.35;font-variant-numeric:tabular-nums}
.dl-g-stat--hero{border:0;background:transparent;padding:0;gap:12px}
.dl-g-stat--hero .dl-g-stat-value{font-size:30px;line-height:1.1;letter-spacing:-.03em}
.dl-g-stat-delta{font-size:var(--dl-fs-caption);color:var(--dl-ink-3);font-variant-numeric:tabular-nums}
.dl-g-stat-delta[data-dir="up"]{color:var(--dl-ok)}
.dl-g-stat-delta[data-dir="down"]{color:var(--dl-danger)}
.dl-g-spark{flex:none;width:72px;height:24px;color:var(--dl-accent);overflow:visible}
.dl-g-hero{display:flex;flex-direction:column;gap:4px;padding:16px;border-radius:var(--dl-r-sm);background:var(--dl-paper-2);border:1px solid var(--dl-rule-soft)}
.dl-g-hero[data-tone="success"]{background:var(--dl-ok-bg)}
.dl-g-hero[data-tone="warning"]{background:var(--dl-warn-bg)}
.dl-g-hero[data-tone="danger"]{background:var(--dl-danger-bg)}
.dl-g-hero-label{font-size:var(--dl-fs-caption);letter-spacing:.06em;color:var(--dl-ink-3)}
.dl-g-hero-value{font-size:30px;line-height:1.1;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.dl-g-hero-title{font-size:14px;font-weight:650}
.dl-g-hero-subtitle{font-size:12px;color:var(--dl-ink-2)}
.dl-g-progress{display:flex;flex-direction:column;gap:6px;min-width:0}
.dl-g-progress-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--dl-ink-2)}
.dl-g-track{position:relative;height:6px;border-radius:99px;background:#ecebe7;overflow:hidden}
.dl-g-fill{position:absolute;inset:0 auto 0 0;border-radius:99px;background:var(--dl-accent)}
.dl-g-target{position:absolute;top:0;bottom:0;width:2px;background:var(--dl-ink-2)}
.dl-g-ring{display:flex;align-items:center;gap:12px}
.dl-g-ring-track{stroke:#ecebe7}
.dl-g-ring-fill{stroke:var(--dl-accent)}
.dl-g-ring-value{font-size:15px;font-weight:650;fill:var(--dl-ink)}
.dl-g-divider{border:0;border-top:1px solid var(--dl-rule-soft);margin:4px 0}
.dl-g-divider--labeled{display:flex;align-items:center;gap:10px;border-top:0;font-size:var(--dl-fs-caption);color:var(--dl-ink-3)}
.dl-g-divider--labeled::before,.dl-g-divider--labeled::after{content:'';height:1px;flex:1;background:var(--dl-rule)}
.dl-g-list{display:flex;flex-direction:column;min-width:0}
.dl-g-li{display:flex;align-items:flex-start;gap:9px;min-width:0;padding:9px 0;border-top:1px solid var(--dl-rule-soft);font-size:13px}
.dl-g-li:first-child{border-top:0;padding-top:0}
.dl-g-li:last-child{padding-bottom:0}
.dl-g-li-body{flex:1;min-width:0}
.dl-g-li-title{font-size:13px;font-weight:600}
.dl-g-li-desc{font-size:11.5px;color:var(--dl-ink-3)}
.dl-g-kv{display:flex;flex-direction:column;gap:5px;min-width:0}
.dl-g-kv-row{display:flex;align-items:baseline;gap:8px;font-size:12.5px}
.dl-g-kv-key{flex:none;min-width:40px;font-size:11.5px;color:var(--dl-ink-3)}
.dl-g-kv-value{min-width:0;font-weight:600;color:var(--dl-ink)}
.dl-g-callout{display:flex;flex-direction:column;gap:4px;padding:12px 13px;border-radius:var(--dl-r-xs);background:var(--dl-paper-2);border:1px solid var(--dl-rule-soft)}
.dl-g-callout[data-tone="success"]{background:var(--dl-ok-bg);border-color:#dcefe5}
.dl-g-callout[data-tone="warning"]{background:var(--dl-warn-bg);border-color:#f0e2cb}
.dl-g-callout[data-tone="error"]{background:var(--dl-danger-bg);border-color:#f5d9d4}
.dl-g-callout-title{font-size:13px;font-weight:650}
.dl-g-callout-body{margin:0;font-size:12px;color:var(--dl-ink-2)}
.dl-g-image{display:flex;flex-direction:column;gap:5px;margin:0;min-width:0}
.dl-g-image-img{display:block;width:100%;height:auto;max-height:240px;object-fit:cover;border-radius:var(--dl-r-xs);border:1px solid var(--dl-rule-soft);background:var(--dl-paper-2)}
.dl-g-image-label{font-size:var(--dl-fs-caption);color:var(--dl-ink-3)}
.dl-g-image-caption{font-size:var(--dl-fs-caption);color:var(--dl-ink-3)}
.dl-g-avatar{flex:none;width:28px;height:28px;border-radius:50%;color:#fff;font-size:11.5px;font-weight:650;display:grid;place-items:center;letter-spacing:.02em}
.dl-g-btn{display:inline-flex;align-items:center;gap:5px}
.dl-g-btn--full{width:100%;justify-content:center}
.dl-g-btn--small{font-size:11.5px;padding:4px 10px}
.dl-g-btn[data-tone="success"]{background:var(--dl-ok);border-color:var(--dl-ok)}
.dl-g-btn[data-tone="danger"]{background:var(--dl-danger);border-color:var(--dl-danger)}
.dl-g-btn .dl-g-icon{margin-right:0}
.dl-g-switch-row{display:flex;align-items:center;gap:8px}
.dl-g-switch{flex:none;width:36px;height:20px;border-radius:99px;border:1px solid transparent;background:#e2e0db;position:relative;cursor:pointer;padding:0}
.dl-g-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(31 30 28/.2);transition:transform 140ms ease}
.dl-g-switch[data-on="true"]{background:var(--dl-accent)}
.dl-g-switch[data-on="true"]::after{transform:translateX(16px)}
.dl-g-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.dl-g-seg-wrap{display:flex;align-items:center;gap:8px;min-width:0}
.dl-g-seg-label{flex:none;font-size:11.5px;color:var(--dl-ink-3)}
.dl-g-seg{display:inline-flex;gap:2px;padding:3px;border-radius:10px;background:#ecebe6;border:1px solid var(--dl-rule-soft)}
.dl-g-seg-opt{appearance:none;border:0;background:transparent;font:inherit;font-size:12.5px;font-weight:550;color:var(--dl-ink-2);padding:5px 14px;border-radius:8px;cursor:pointer;transition:background 140ms ease,color 140ms ease,box-shadow 140ms ease}
.dl-g-seg-opt[data-active="true"]{background:var(--dl-paper);color:var(--dl-ink);box-shadow:var(--dl-shadow-sm);font-weight:650}
.dl-note{text-align:center;font-size:11px;color:var(--dl-ink-3);margin:16px 0 0}
.dl-empty{padding:32px 16px;text-align:center;font-size:12.5px;color:var(--dl-ink-2);background:var(--dl-paper);border:1px solid var(--dl-rule-soft);border-radius:var(--dl-r-sm);box-shadow:var(--dl-shadow-sm)}

/* 左栏：接真会话之后新增的几处（其余气泡与卡片样式沿用上面） */
.dl-input--area{resize:none;line-height:1.6;max-height:110px;overflow:auto;font-family:inherit}
.dl-bubble--pending{opacity:.6}
.dl-typing{display:flex;align-items:center;gap:5px;padding:13px 15px}
.dl-typing i{width:5px;height:5px;border-radius:50%;background:var(--dl-ink-3);animation:dl-typing 1.2s infinite ease-in-out}
.dl-typing i:nth-child(2){animation-delay:.18s}
.dl-typing i:nth-child(3){animation-delay:.36s}
@keyframes dl-typing{0%,60%,100%{opacity:.22;transform:none}30%{opacity:1;transform:translateY(-2px)}}
.dl-empty--chat{margin:10px 0;text-align:left;padding:20px 18px}
.dl-empty b{display:block;font-size:13.5px;font-weight:650;color:var(--dl-ink);margin-bottom:5px}
.dl-empty p{display:block;margin:0 0 10px;font-size:12px;line-height:1.65;word-break:break-word}
.dl-empty .dl-btn{font-size:12px}
.dl-msg-error{margin:2px 2px 10px;font-size:12px;line-height:1.55;color:var(--dl-danger);word-break:break-word}
.dl-fold{display:flex;justify-content:center;margin:6px 0 14px}
.dl-fold-btn{appearance:none;cursor:pointer;font:inherit;font-size:11px;font-weight:600;color:var(--dl-ink-2);background:var(--dl-paper);border:1px solid var(--dl-rule);border-radius:999px;padding:4px 12px}
.dl-fold-btn:hover{color:var(--dl-ink);border-color:var(--dl-rule-strong)}
.dl-btn:disabled{opacity:.4;cursor:not-allowed;filter:none;transform:none}
.dl-send:disabled{background:#d9d6d0;color:#fff;cursor:not-allowed}
.dl :focus-visible{outline:2px solid var(--dl-accent);outline-offset:2px;border-radius:6px}
/* 左栏气泡里的 Markdown：和 genui 卡同一套纸面，不引第三方样式。 */
.dl-md{min-width:0}
.dl-md>:first-child{margin-top:0}
.dl-md>:last-child{margin-bottom:0}
.dl-md p{margin:0}
.dl-md p+p{margin-top:9px}
.dl-md h1,.dl-md h2,.dl-md h3,.dl-md h4,.dl-md h5,.dl-md h6{margin:14px 0 7px;line-height:1.35;font-weight:650;letter-spacing:-.01em;color:var(--dl-ink)}
.dl-md h1{font-size:18px}
.dl-md h2{font-size:16.5px}
.dl-md h3{font-size:15px}
.dl-md h4{font-size:14px}
.dl-md h5,.dl-md h6{font-size:13px;color:var(--dl-ink-2)}
.dl-md ul,.dl-md ol{margin:8px 0;padding-left:20px}
.dl-md li{margin:4px 0}
.dl-md li::marker{color:var(--dl-ink-3)}
.dl-md li>p{margin:0}
.dl-md li ul,.dl-md li ol{margin:4px 0}
.dl-md blockquote{margin:10px 0;padding:2px 0 2px 12px;border-left:3px solid var(--dl-rule-strong);color:var(--dl-ink-2)}
.dl-md blockquote>:first-child{margin-top:0}
.dl-md blockquote>:last-child{margin-bottom:0}
.dl-md code{font-family:var(--dl-mono);font-size:.92em;background:var(--dl-paper-3);border:1px solid var(--dl-rule-soft);border-radius:5px;padding:1px 5px}
.dl-md pre{margin:10px 0;padding:11px 13px;background:var(--dl-paper-2);border:1px solid var(--dl-rule);border-radius:10px;overflow:auto;line-height:1.55}
.dl-md pre code{background:transparent;border:0;padding:0;font-size:12px;white-space:pre;word-break:normal}
.dl-md a{color:var(--dl-accent-ink);text-decoration:underline;text-underline-offset:3px}
.dl-md a:hover{color:var(--dl-ink)}
.dl-md hr{border:0;border-top:1px solid var(--dl-rule);margin:12px 0}
.dl-md strong{font-weight:650}
.dl-md em{font-style:italic}
.dl-md del{color:var(--dl-ink-3)}
.dl-md-table{min-width:0;overflow-x:auto;margin:10px 0}
.dl-md table{width:100%;border-collapse:collapse;font-size:12.5px}
.dl-md th{padding:6px 8px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dl-ink-3);border-bottom:1px solid var(--dl-rule)}
.dl-md td{padding:7px 8px;border-bottom:1px solid var(--dl-rule-soft);vertical-align:top;word-break:break-word}
.dl-md tr:last-child td{border-bottom:0}

@media (max-width:940px){.dl-app{grid-template-columns:minmax(0,1fr)}.dl-ctx{min-height:420px}}
/* 左栏 dsh-ui spec：表格/图表/步骤/时间线/代码/链接。气泡里的卡不再叠一层重边框：
   气泡自己是浅灰纸，里面的卡用白底细线，只做一层轻内衬。 */
.dl-spec{display:flex;flex-direction:column;min-width:0}
.dl-spec .dl-g-card{background:var(--dl-paper);border-color:var(--dl-rule-soft);box-shadow:none;padding:14px 15px}
.dl-g-root-title{font-size:14px;font-weight:650;letter-spacing:-.01em}
.dl-g-table{width:100%;border-collapse:collapse;font-size:12.5px}
.dl-g-table th{text-align:left;font-size:var(--dl-fs-caption);font-weight:600;letter-spacing:.04em;color:var(--dl-ink-3);padding:6px 8px;border-bottom:1px solid var(--dl-rule)}
.dl-g-table td{padding:7px 8px;border-bottom:1px solid var(--dl-rule-soft);vertical-align:top;word-break:break-word}
.dl-g-table tr:last-child td{border-bottom:0}
.dl-g-table--num{text-align:right;font-variant-numeric:tabular-nums}
.dl-g-chart{display:flex;flex-direction:column;gap:6px;min-width:0}
.dl-g-chart-row{display:flex;align-items:center;gap:8px;font-size:11.5px;min-width:0}
.dl-g-chart-label{flex:none;width:64px;color:var(--dl-ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dl-g-chart-track{flex:1;min-width:0;height:8px;border-radius:99px;background:#ecebe7;overflow:hidden}
.dl-g-chart-fill{display:block;height:100%;border-radius:99px;background:var(--dl-accent)}
.dl-g-chart-value{flex:none;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dl-ink)}
.dl-g-chart-svg{width:100%;height:64px;color:var(--dl-accent)}
.dl-g-chart-legend{font-size:11px;color:var(--dl-ink-3)}
.dl-g-chart--donut{flex-direction:row;align-items:center;gap:12px}
.dl-g-chart-donut{flex:none;width:68px;height:68px;color:var(--dl-accent)}
.dl-g-chart-donut-track{stroke:#ecebe7;stroke-opacity:1}
.dl-g-chart-key{display:flex;flex-direction:column;gap:3px;font-size:11.5px;min-width:0;flex:1}
.dl-g-chart-key-row{display:flex;align-items:center;gap:5px;min-width:0}
.dl-g-chart-dot{flex:none;width:7px;height:7px;border-radius:50%;background:currentColor;color:var(--dl-accent)}
.dl-g-chart-key-row b{margin-left:auto;font-variant-numeric:tabular-nums}
.dl-g-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;counter-reset:dlstep}
.dl-g-step{position:relative;padding-left:24px;font-size:12.5px;counter-increment:dlstep}
.dl-g-step::before{content:counter(dlstep);position:absolute;left:0;top:1px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:650;background:var(--dl-paper-3);color:var(--dl-ink-2)}
.dl-g-step--now::before{background:var(--dl-accent);color:#fff}
.dl-g-step-title{font-weight:600}
.dl-g-step-desc{display:block;font-size:11.5px;color:var(--dl-ink-3)}
.dl-g-timeline{display:flex;flex-direction:column;gap:8px;min-width:0}
.dl-g-tl{display:flex;gap:9px;min-width:0;font-size:12.5px}
.dl-g-tl-time{flex:none;width:54px;font-size:11px;color:var(--dl-ink-3);font-variant-numeric:tabular-nums}
.dl-g-tl-body{display:flex;flex-direction:column;min-width:0}
.dl-g-tl-title{font-weight:600}
.dl-g-tl-desc{font-size:11.5px;color:var(--dl-ink-3)}
.dl-g-code{margin:0;padding:10px 12px;border-radius:8px;background:var(--dl-paper-2);border:1px solid var(--dl-rule-soft);font-family:var(--dl-mono);font-size:12px;line-height:1.55;overflow-x:auto;white-space:pre-wrap;word-break:break-word}
.dl-g-link{color:var(--dl-accent-ink);text-decoration:underline;text-underline-offset:3px}
@media (max-width:680px){.dl-g-grid{--dl-g-cols:1}.dl-app{padding:12px;gap:12px}.dl-chat-head{padding:14px 16px 10px;gap:9px}.dl-thread{padding:6px 16px 8px}.dl-composer{padding:8px 16px 14px}.dl-ctx-head{padding:2px 0 10px}.dl-ctx-scroll{padding:0 0 18px}.dl-bubble{max-width:92%}.dl-g-card{padding:14px 15px}}
@media (prefers-reduced-motion:reduce){.dl-tab,.dl-btn,.dl-g-switch,.dl-g-seg-opt{transition:none}.dl-typing i{animation:none;opacity:.55}.dl-skel-line{animation:none;background:#eceae6}}




`;

/* ── 小组件 ─────────────────────────────────────────────────────────────── */

function useReact() {
  /* 工厂里拿到的那个 react；每个组件只用这里的，避免节外生枝。 */
  return React;
}

/* ── genui `dsh-ui` spec：vendored 子集 ──────────────────────────────────────

   来源：https://github.com/omdsh-dev/dsh-genui
   commit：33576039f27a4f62eb60d4307902ee65252eded6（v0.16.0）
   许可：MIT，Copyright (c) 2026 dsh-external（全文见 VENDORED-genui.md）
   上游文件：src/client/spec.ts、src/client/genui-runtime/limits.ts、
            src/client/guard.ts、src/client/blocks/render-node.tsx、basic.tsx 等。

   这是从上面几份里裁出来的最小渲染器：保留右栏与左栏用到的 26 种节点，样式换成
   本文件 CSS 里的 `.dl-g-*`（只用 --dl-* token），用 createElement 直接写 DOM。
   没有相对模块解析、没有构建步骤，所以只能整段住在这个文件里。

   与上游的差异（魔改点，逐条也写在 VENDORED-genui.md 里）：
   - 只有 19 种类型，未知名只丢自己、兄弟照常渲染；没有 alias 归一化、没有
     computed、没有 when/enableWhen 条件、没有表格/图表/表单控件的深度校验；
   - validateSpec 重写：深度 ≤ 8、节点 ≤ 200、字符串 ≤ 2000、按类型逐字段清洗
     （数字夹区间、数组成员数截断、未知类型剔除），不重排、不改写内容；
   - 交互节点没有回调语义：switch / segmented-control / button 多一个 `name` 字段，
     由插件按名字传 handlers；上游是把它们交给 onAction 回路；
   - `icon` 字段（text / stat / button / list 项）认的是本文件的 ICON 表，画成内联
     SVG；上游 icon 是图标名或字形，不是同一套；
   - progress.value 按上游渲染器当 0–100 的百分比处理（render-node.tsx 里就是这么
     夹的），到 100 封顶；
   - 没有 handler 的按钮仍然可点（原型里的按钮本来就没有动作），上游会渲染 disabled；
   - image 不本地缓存失败态、不设参考策略之外的东西；没有音频/视频。

   左栏新增（2026-11-15 深夜，`dsh-ui` 围栏进日常左栏）：table / chart（bars|line|donut，
   只画 data 单序列）/ steps / timeline / code / json / link。这七个之外的节点（表单控件、
   tabs/accordion、echart/plot/mermaid/svg/diagram/scene3d、audio/video、image-group/compare、
   diff、file-tree、blocks、arrow、icon、entity-card、copy/popover/quiz/choices、carousel）
   仍然不进这一档：清洗阶段整节点丢掉（兄弟照常），整条围栏一个能画的都不剩时降级成原文。 */

const createEl = React.createElement;

const GENUI_LIMITS = {
  maxDepth: 8,
  maxNodes: 200,
  maxString: 2000,
  maxGridCols: 12,
  maxListItems: 50,
  maxKeyValuePairs: 24,
  maxOptions: 50,
  maxTableColumns: 12,
  maxTableRows: 50,
  maxChartPoints: 60,
  maxCode: 4000,
};

const GENUI_TEXT_SIZES = ['display', 'h1', 'h2', 'h3', 'body', 'muted', 'caption'];
const GENUI_TEXT_TONES = ['danger', 'success', 'warning', 'info', 'muted'];
const GENUI_TEXT_ALIGNS = ['left', 'center', 'right'];
const GENUI_CARD_TONES = ['info', 'success', 'warning', 'danger'];
const GENUI_BADGE_TONES = ['success', 'warn', 'danger', 'accent'];
const GENUI_CALLOUT_TONES = ['info', 'success', 'warning', 'error'];
const GENUI_HERO_TONES = ['accent', 'success', 'warning', 'danger'];
const GENUI_BUTTON_TONES = ['primary', 'danger', 'success', 'ghost'];
const GENUI_ROW_JUSTIFY = ['start', 'center', 'end', 'between'];
const GENUI_TABLE_CELL_TYPES = ['text', 'num', 'delta', 'bar', 'ring', 'spark', 'badge', 'index', 'group'];
const GENUI_CHART_KINDS = ['bars', 'line', 'donut'];

/* 模型常把竖排容器写成 `stack`（上游 60 种里没有它，更像 col）。
   有标题时当 card（标题要留住），没有标题时当 col（gap 保住）；
   不因为一个外层名字不认识，就把整条围栏退回原文。 */
const GENUI_TYPE_ALIASES = { stack: 'col' };

function resolveGenuiType(value) {
  const rawType = value.type;
  if (typeof rawType !== 'string') return rawType;
  if (rawType === 'stack') {
    return typeof value.title === 'string' && value.title.trim() !== '' ? 'card' : 'col';
  }
  return Object.hasOwn(GENUI_TYPE_ALIASES, rawType) ? GENUI_TYPE_ALIASES[rawType] : rawType;
}
/* 头像底色：沿用页面里已有的几支色（徽章/日程行那几档），不新造配色。 */
const GENUI_AVATAR_TONES = ['#3f6fa8', '#3f7d5a', '#a4732f', '#8c76ba', '#c47460', '#6f6055'];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const field = (key, value) => (value === undefined ? {} : { [key]: value });
const text = (value, cap) => {
  if (typeof value !== 'string') return undefined;
  const limit = cap === undefined ? GENUI_LIMITS.maxString : cap;
  return value.length > limit ? value.slice(0, limit) : value;
};
const pickOne = (value, allowed) => (typeof value === 'string' && allowed.indexOf(value) !== -1 ? value : undefined);
const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const ranged = (value, low, high) => {
  const num = number(value);
  return num === undefined ? undefined : Math.min(high, Math.max(low, num));
};
const hexColor = (value) => (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value) ? value : undefined);
/* 只放行 http(s)、相对路径与 data:image；别的（javascript: 之类）整节点丢掉。 */
const mediaSrc = (value) => {
  const src = text(value);
  if (src === undefined || src === '') return undefined;
  return /^(https?:\/\/|data:image\/|\.{0,2}\/)/i.test(src) ? src : undefined;
};
/* stat.spark：2–60 个有限数字，否则整段丢掉。 */
function sparkValues(value) {
  if (!Array.isArray(value)) return undefined;
  const out = [];
  for (const raw of value.slice(0, 60)) {
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(num)) return undefined;
    out.push(num);
  }
  return out.length >= 2 ? out : undefined;
}

/* 逐类型清洗。返回 null 表示这个节点坏掉了——调用方只丢它自己，
   兄弟节点继续走。字段名与上游 spec.ts 一致（见 VENDORED-genui.md）。 */
const GENUI_NODE_REPAIR = {
  text(value) {
    const content = text(value.content) !== undefined ? text(value.content) : text(value.text);
    if (content === undefined) return null;
    return {
      type: 'text',
      content,
      ...field('size', pickOne(value.size, GENUI_TEXT_SIZES)),
      ...field('tone', pickOne(value.tone, GENUI_TEXT_TONES)),
      ...field('align', pickOne(value.align, GENUI_TEXT_ALIGNS)),
      ...field('mono', value.mono === true ? true : undefined),
      ...field('center', value.center === true ? true : undefined),
      ...field('icon', text(value.icon, 40)),
    };
  },
  badge(value) {
    const label = text(value.label);
    if (label === undefined) return null;
    return {
      type: 'badge',
      label,
      ...field('tone', pickOne(value.tone, GENUI_BADGE_TONES)),
      ...field('icon', text(value.icon, 40)),
    };
  },
  stat(value) {
    const label = text(value.label);
    const content = text(value.value);
    if (label === undefined || content === undefined) return null;
    return {
      type: 'stat',
      label,
      value: content,
      ...field('delta', text(value.delta)),
      ...field('spark', sparkValues(value.spark)),
      ...field('size', value.size === 'hero' ? 'hero' : undefined),
      ...field('icon', text(value.icon, 40)),
    };
  },
  hero(value) {
    const title = text(value.title);
    if (title === undefined) return null;
    return {
      type: 'hero',
      title,
      ...field('subtitle', text(value.subtitle)),
      ...field('value', text(value.value)),
      ...field('label', text(value.label)),
      ...field('delta', text(value.delta)),
      ...field('spark', sparkValues(value.spark)),
      ...field('tone', pickOne(value.tone, GENUI_HERO_TONES)),
    };
  },
  progress(value) {
    const amount = ranged(value.value, 0, 100);
    if (amount === undefined) return null;
    return {
      type: 'progress',
      value: amount,
      ...field('label', text(value.label)),
      ...field('valueLabel', text(value.valueLabel)),
      ...field('variant', value.variant === 'ring' ? 'ring' : undefined),
      ...field('target', ranged(value.target, 0, 100)),
    };
  },
  divider(value) {
    return { type: 'divider', ...field('label', text(value.label)) };
  },
  list(value, depth, budget) {
    if (!Array.isArray(value.items)) return null;
    const items = [];
    for (const raw of value.items.slice(0, GENUI_LIMITS.maxListItems)) {
      if (typeof raw === 'string') {
        const line = text(raw);
        if (line !== undefined) items.push(line);
        continue;
      }
      if (!isObject(raw)) continue;
      if (typeof raw.type === 'string') {
        const node = cleanSpecNode(raw, depth + 1, budget);
        if (node !== null) items.push(node);
        continue;
      }
      const title = text(raw.title);
      if (title === undefined) continue;
      items.push({ title, ...field('desc', text(raw.desc)), ...field('icon', text(raw.icon, 40)) });
    }
    if (items.length === 0) return null;
    return { type: 'list', items };
  },
  keyvalue(value) {
    if (!Array.isArray(value.pairs)) return null;
    const pairs = [];
    for (const raw of value.pairs.slice(0, GENUI_LIMITS.maxKeyValuePairs)) {
      if (!isObject(raw)) continue;
      const key = text(raw.key);
      const content = text(raw.value);
      if (key === undefined || content === undefined) continue;
      pairs.push({ key, value: content });
    }
    if (pairs.length === 0) return null;
    return { type: 'keyvalue', pairs };
  },
  callout(value) {
    const content = text(value.content);
    if (content === undefined) return null;
    return {
      type: 'callout',
      content,
      ...field('tone', pickOne(value.tone, GENUI_CALLOUT_TONES)),
      ...field('title', text(value.title)),
    };
  },
  image(value) {
    const src = mediaSrc(value.src);
    if (src === undefined) return null;
    return { type: 'image', src, ...field('alt', text(value.alt)), ...field('caption', text(value.caption)) };
  },
  avatar(value) {
    const name = text(value.name, 80);
    if (name === undefined) return null;
    return { type: 'avatar', name, ...field('color', hexColor(value.color)) };
  },
  button(value) {
    const label = text(value.label);
    if (label === undefined) return null;
    return {
      type: 'button',
      label,
      ...field('tone', pickOne(value.tone, GENUI_BUTTON_TONES)),
      ...field('full', value.full === true ? true : undefined),
      ...field('small', value.small === true ? true : undefined),
      ...field('icon', text(value.icon, 40)),
      ...field('name', text(value.name, 80)),
    };
  },
  switch(value) {
    const label = text(value.label);
    if (label === undefined) return null;
    return {
      type: 'switch',
      label,
      ...field('checked', value.checked === true ? true : undefined),
      ...field('name', text(value.name, 80)),
    };
  },
  'segmented-control': function segmentedControl(value) {
    if (!Array.isArray(value.options)) return null;
    const options = [];
    for (const raw of value.options.slice(0, GENUI_LIMITS.maxOptions)) {
      const option = text(raw, 120);
      if (option !== undefined) options.push(option);
    }
    if (options.length === 0) return null;
    return {
      type: 'segmented-control',
      options,
      ...field('label', text(value.label)),
      ...field('value', typeof value.value === 'string' && options.indexOf(value.value) !== -1 ? value.value : undefined),
      ...field('name', text(value.name, 80)),
    };
  },
  spacer() {
    return { type: 'spacer' };
  },
  card(value, depth, budget) {
    const items = cleanSpecChildren(value.items, depth, budget);
    if (items.length === 0) return null;
    return {
      type: 'card',
      items,
      ...field('title', text(value.title)),
      ...field('eyebrow', text(value.eyebrow)),
      ...field('tone', pickOne(value.tone, GENUI_CARD_TONES)),
      ...field('accent', hexColor(value.accent)),
      ...field('flat', value.flat === true ? true : undefined),
    };
  },
  col(value, depth, budget) {
    const items = cleanSpecChildren(value.items, depth, budget);
    if (items.length === 0) return null;
    return {
      type: 'col',
      items,
      ...field('gap', ranged(value.gap, 0, 40)),
      ...field('width', ranged(value.width, 1, 100)),
    };
  },
  row(value, depth, budget) {
    const items = cleanSpecChildren(value.items, depth, budget);
    if (items.length === 0) return null;
    return {
      type: 'row',
      items,
      ...field('wrap', value.wrap === true ? true : undefined),
      ...field('spacer', value.spacer === true ? true : undefined),
      ...field('justify', pickOne(value.justify, GENUI_ROW_JUSTIFY)),
    };
  },
  grid(value, depth, budget) {
    const items = cleanSpecChildren(value.items, depth, budget);
    if (items.length === 0) return null;
    const cols = Math.floor(ranged(value.cols, 1, GENUI_LIMITS.maxGridCols) === undefined
      ? 2 : ranged(value.cols, 1, GENUI_LIMITS.maxGridCols));
    return { type: 'grid', cols, items };
  },
  table(value) {
    if (!Array.isArray(value.columns) || !Array.isArray(value.rows)) return null;
    const columns = [];
    for (const raw of value.columns.slice(0, GENUI_LIMITS.maxTableColumns)) {
      const column = text(raw, 120);
      if (column !== undefined) columns.push(column);
    }
    if (columns.length === 0) return null;
    const rows = [];
    for (const raw of value.rows.slice(0, GENUI_LIMITS.maxTableRows)) {
      if (!Array.isArray(raw)) continue;
      const cells = [];
      for (const cell of raw.slice(0, columns.length)) {
        if (typeof cell === 'number' && Number.isFinite(cell)) {
          cells.push(String(cell));
          continue;
        }
        const line = text(cell);
        cells.push(line === undefined ? '' : line);
      }
      if (cells.length === 0) continue;
      rows.push(cells);
    }
    if (rows.length === 0) return null;
    const types = Array.isArray(value.types)
      ? value.types.slice(0, columns.length).map((raw) => pickOne(raw, GENUI_TABLE_CELL_TYPES))
      : [];
    return {
      type: 'table',
      columns,
      rows,
      ...field('types', types.some((type) => type !== undefined) ? types : undefined),
      ...field('wrap', value.wrap === true ? true : undefined),
    };
  },
  chart(value) {
    if (!Array.isArray(value.data)) return null;
    const data = [];
    for (const raw of value.data.slice(0, GENUI_LIMITS.maxChartPoints)) {
      if (!isObject(raw)) continue;
      const label = text(raw.label, 80);
      const amount = number(raw.value);
      if (label === undefined || amount === undefined) continue;
      data.push({ label, value: amount, ...field('color', hexColor(raw.color)) });
    }
    /* 只有 series 的多序列图（bars/line 分组、堆叠）暂不支持：整节点丢掉，
       外层（整条围栏一个能画的节点都不剩时）降级成原文。 */
    if (data.length === 0) return null;
    return {
      type: 'chart',
      kind: pickOne(value.kind, GENUI_CHART_KINDS) === undefined ? 'bars' : value.kind,
      data,
      ...field('horizontal', value.horizontal === true ? true : undefined),
    };
  },
  steps(value) {
    if (!Array.isArray(value.steps)) return null;
    const steps = [];
    for (const raw of value.steps.slice(0, GENUI_LIMITS.maxListItems)) {
      if (!isObject(raw)) continue;
      const title = text(raw.title);
      if (title === undefined) continue;
      steps.push({ title, ...field('desc', text(raw.desc)) });
    }
    if (steps.length === 0) return null;
    return { type: 'steps', steps, ...field('current', ranged(value.current, 0, steps.length - 1)) };
  },
  timeline(value) {
    if (!Array.isArray(value.items)) return null;
    const items = [];
    for (const raw of value.items.slice(0, GENUI_LIMITS.maxListItems)) {
      if (!isObject(raw)) continue;
      const title = text(raw.title);
      if (title === undefined) continue;
      items.push({ title, ...field('desc', text(raw.desc)), ...field('time', text(raw.time, 80)) });
    }
    if (items.length === 0) return null;
    return { type: 'timeline', items };
  },
  code(value) {
    const content = text(value.code, GENUI_LIMITS.maxCode);
    if (content === undefined || content === '') return null;
    return { type: 'code', code: content, ...field('lang', text(value.lang, 40)) };
  },
  json(value) {
    if (value.value === undefined) return null;
    let dump;
    try {
      dump = JSON.stringify(value.value, null, 2);
    } catch {
      return null;
    }
    if (typeof dump !== 'string' || dump === '') return null;
    return { type: 'json', text: text(dump, GENUI_LIMITS.maxCode) };
  },
  link(value) {
    const label = text(value.label);
    if (label === undefined) return null;
    /* 只放行 http(s) 与 mailto：别的协议当纯文字，不做成可点的东西。 */
    const raw = typeof value.href === 'string' ? value.href.trim() : '';
    const href = /^(https?:\/\/|mailto:)/i.test(raw) ? raw.slice(0, GENUI_LIMITS.maxString) : undefined;
    return { type: 'link', label, ...field('href', href) };
  },
};

/** 清洗一个节点；未知名、坏字段、超深、超预算都只返回 null（丢自己）。 */
function cleanSpecNode(value, depth, budget) {
  if (depth > GENUI_LIMITS.maxDepth) return null;
  if (!isObject(value)) return null;
  const type = resolveGenuiType(value);
  if (typeof type !== 'string' || GENUI_NODE_REPAIR[type] === undefined) return null;
  if (budget.left <= 0) return null; /* 节点预算见底：后面的兄弟整段省略 */
  budget.left -= 1;
  const node = GENUI_NODE_REPAIR[type](value, depth, budget);
  if (node === null) return null;
  const span = ranged(value.span, 1, GENUI_LIMITS.maxGridCols);
  if (span !== undefined && span >= 2) node.span = Math.floor(span);
  return node;
}

function cleanSpecChildren(items, depth, budget) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    const node = cleanSpecNode(item, depth + 1, budget);
    if (node !== null) out.push(node);
  }
  return out;
}

/**
 * spec → 清洗后的 spec：根是 `{ title?, gap?, items }`。
 *
 * 右栏渲染前先过这一道（renderSpec 内部也会过）：深度 ≤ 8、节点 ≤ 200、
 * 字符串 ≤ 2000、非法/未知类型剔除、数字夹回区间、数组按成员上限截断。
 * 坏节点只丢自己，兄弟照常留下。
 */
function validateSpec(spec) {
  const budget = { left: GENUI_LIMITS.maxNodes };
  if (!isObject(spec)) return { items: [] };
  const clean = { items: cleanSpecChildren(spec.items, 0, budget) };
  const title = text(spec.title);
  if (title !== undefined && title !== '') clean.title = title;
  const gap = ranged(spec.gap, 0, 40);
  if (gap !== undefined) clean.gap = gap;
  return clean;
}

/* ── 渲染：spec → React 元素 ───────────────────────────────────────────── */

function specIcon(name, size) {
  const draw = typeof name === 'string' ? ICON[name] : undefined;
  if (typeof draw !== 'function') return null;
  return createEl('span', { key: 'icon', className: 'dl-g-icon', 'aria-hidden': 'true' }, draw(size));
}

/* 极简 sparkline：一条折线，颜色取 currentColor（见 .dl-g-spark）。 */
function specSpark(values) {
  const width = 96;
  const height = 24;
  const pad = 2;
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const span = (max - min) || 1;
  const step = values.length <= 1 ? 0 : (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => [
    (pad + index * step).toFixed(1),
    (height - pad - ((value - min) / span) * (height - pad * 2)).toFixed(1),
  ].join(',')).join(' ');
  return createEl('svg', {
    key: 'spark',
    className: 'dl-g-spark',
    viewBox: '0 0 ' + width + ' ' + height,
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    focusable: 'false',
  }, createEl('polyline', {
    points,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    vectorEffect: 'non-scaling-stroke',
  }));
}

/* ── 图表：只画 data 单序列（多序列 series / echart 在清洗时就丢掉整节点） ────
   bars 画横向条（窄气泡里读数最稳），line 画折线，donut 画环形；
   都不联网、不引引擎，只用 SVG/div 与 --dl-* token。 */
function specChart(node, key) {
  if (node.kind === 'donut') return specDonut(node, key);
  if (node.kind === 'line') return specLine(node, key);
  const max = node.data.reduce((top, point) => Math.max(top, Math.abs(point.value)), 0) || 1;
  return createEl('div', { key, className: 'dl-g-chart dl-g-chart--bars' },
    node.data.map((point, index) => createEl('div', { key: index, className: 'dl-g-chart-row' },
      createEl('span', { className: 'dl-g-chart-label' }, point.label),
      createEl('span', { className: 'dl-g-chart-track' },
        createEl('span', {
          className: 'dl-g-chart-fill',
          style: {
            width: Math.max(2, Math.round((Math.abs(point.value) / max) * 100)) + '%',
            ...(point.color === undefined ? {} : { background: point.color }),
          },
        })),
      createEl('span', { className: 'dl-g-chart-value' }, String(point.value)))));
}

function specLine(node, key) {
  const width = 260;
  const height = 64;
  const pad = 4;
  const values = node.data.map((point) => point.value);
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const span = (max - min) || 1;
  const step = values.length <= 1 ? 0 : (width - pad * 2) / (values.length - 1);
  const points = values.map((value, index) => [
    (pad + index * step).toFixed(1),
    (height - pad - ((value - min) / span) * (height - pad * 2)).toFixed(1),
  ].join(',')).join(' ');
  return createEl('div', { key, className: 'dl-g-chart dl-g-chart--line' },
    createEl('svg', {
      className: 'dl-g-chart-svg',
      viewBox: '0 0 ' + width + ' ' + height,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
    }, createEl('polyline', {
      points,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
      strokeLinecap: 'round',
      vectorEffect: 'non-scaling-stroke',
    })),
    createEl('span', { className: 'dl-g-chart-legend' },
      node.data.map((point) => point.label).join(' · ')));
}

function specDonut(node, key) {
  const total = node.data.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const slices = node.data.map((point, index) => {
    const length = (Math.max(0, point.value) / total) * circumference;
    const slice = createEl('circle', {
      key: index,
      cx: 34,
      cy: 34,
      r: radius,
      fill: 'none',
      strokeWidth: 12,
      stroke: point.color === undefined ? 'currentColor' : point.color,
      strokeOpacity: String(Math.max(0.36, 1 - index * 0.16)),
      strokeDasharray: length.toFixed(2) + ' ' + (circumference - length).toFixed(2),
      strokeDashoffset: (-offset).toFixed(2),
      transform: 'rotate(-90 34 34)',
    });
    offset += length;
    return slice;
  });
  return createEl('div', { key, className: 'dl-g-chart dl-g-chart--donut' },
    createEl('svg', { className: 'dl-g-chart-donut', viewBox: '0 0 68 68', 'aria-hidden': 'true', focusable: 'false' },
      createEl('circle', { cx: 34, cy: 34, r: radius, fill: 'none', strokeWidth: 12, className: 'dl-g-chart-donut-track' }),
      slices),
    createEl('div', { className: 'dl-g-chart-key' },
      node.data.map((point, index) => createEl('span', { key: index, className: 'dl-g-chart-key-row' },
        createEl('i', {
          className: 'dl-g-chart-dot',
          style: point.color === undefined ? undefined : { background: point.color },
        }),
        point.label,
        createEl('b', null, String(point.value))))));
}

const specTextClass = (node) => 'dl-g-text dl-g-text--' + (node.size === undefined ? 'body' : node.size)
  + (node.align === undefined ? (node.center === true ? ' dl-g-text--center' : '') : ' dl-g-text--' + node.align)
  + (node.mono === true ? ' dl-g-mono' : '');

/**
 * 渲染一个（已清洗的）节点。未知类型返回 null：坏节点只丢自己。
 *
 * handlers 是可选的回调表，按 spec 里的 `name` 找：
 * `{ switch(name, next, node), segmented(name, value, node), button(name, node) }`。
 */
function renderSpecNode(node, key, handlers, depth) {
  if (node === null || typeof node !== 'object') return null;
  if (depth > GENUI_LIMITS.maxDepth) return null;
  const book = handlers === null || typeof handlers !== 'object' ? {} : handlers;
  const kids = (items) => items.map((child, index) => renderSpecNode(child, index, book, depth + 1));

  switch (node.type) {
    case 'text':
      return createEl('div', { key, className: specTextClass(node), 'data-tone': node.tone },
        specIcon(node.icon, 13), node.content);
    case 'badge':
      return createEl('span', { key, className: 'dl-g-badge', 'data-tone': node.tone },
        specIcon(node.icon, 11), node.label);
    case 'stat':
      return createEl('div', {
        key,
        className: 'dl-g-stat' + (node.size === 'hero' ? ' dl-g-stat--hero' : ''),
      },
      specIcon(node.icon, node.size === 'hero' ? 22 : 16),
      createEl('div', { className: 'dl-g-stat-body' },
        createEl('span', { className: 'dl-g-stat-label' }, node.label),
        createEl('span', { className: 'dl-g-stat-value' }, node.value),
        node.delta === undefined ? null : createEl('span', {
          className: 'dl-g-stat-delta',
          'data-dir': node.delta.charAt(0) === '-' ? 'down' : 'up',
        }, node.delta)),
      node.spark === undefined ? null : specSpark(node.spark));
    case 'hero':
      return createEl('div', { key, className: 'dl-g-hero', 'data-tone': node.tone === undefined ? 'accent' : node.tone },
        node.label === undefined ? null : createEl('span', { className: 'dl-g-hero-label' }, node.label),
        node.value === undefined ? null : createEl('span', { className: 'dl-g-hero-value' }, node.value),
        node.title === undefined ? null : createEl('span', { className: 'dl-g-hero-title' }, node.title),
        node.subtitle === undefined ? null : createEl('span', { className: 'dl-g-hero-subtitle' }, node.subtitle),
        node.delta === undefined ? null : createEl('span', {
          className: 'dl-g-stat-delta',
          'data-dir': node.delta.charAt(0) === '-' ? 'down' : 'up',
        }, node.delta),
        node.spark === undefined ? null : specSpark(node.spark));
    case 'progress': {
      const amount = Math.max(0, Math.min(100, node.value));
      const label = node.label === undefined ? node.valueLabel : node.label;
      if (node.variant === 'ring') {
        const size = 92;
        const radius = 34;
        const circumference = 2 * Math.PI * radius;
        return createEl('div', {
          key,
          className: 'dl-g-ring',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': amount,
          'aria-label': label,
        },
        createEl('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': 'true' },
          createEl('circle', {
            cx: size / 2, cy: size / 2, r: radius, fill: 'none', strokeWidth: 9, className: 'dl-g-ring-track',
          }),
          createEl('circle', {
            cx: size / 2,
            cy: size / 2,
            r: radius,
            fill: 'none',
            strokeWidth: 9,
            strokeLinecap: 'round',
            className: 'dl-g-ring-fill',
            strokeDasharray: ((amount / 100) * circumference) + ' ' + circumference,
            transform: 'rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')',
          }),
          createEl('text', {
            x: size / 2, y: (size / 2) + 5, textAnchor: 'middle', className: 'dl-g-ring-value',
          }, amount + '%')));
      }
      return createEl('div', {
        key,
        className: 'dl-g-progress',
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': amount,
        'aria-label': label,
      },
      node.label === undefined && node.valueLabel === undefined
        ? null
        : createEl('div', { className: 'dl-g-progress-row' },
          createEl('span', null, node.label === undefined ? '' : node.label),
          node.valueLabel === undefined ? null : createEl('span', null, node.valueLabel)),
      createEl('div', { className: 'dl-g-track' },
        createEl('div', { className: 'dl-g-fill', style: { width: amount + '%' } }),
        node.target === undefined ? null : createEl('span', {
          className: 'dl-g-target',
          style: { left: node.target + '%' },
        })));
    }
    case 'divider':
      return node.label === undefined
        ? createEl('hr', { key, className: 'dl-g-divider' })
        : createEl('div', { key, className: 'dl-g-divider dl-g-divider--labeled' },
          createEl('span', null, node.label));
    case 'list':
      return createEl('div', { key, className: 'dl-g-list' },
        node.items.map((item, index) => {
          if (typeof item === 'string') {
            return createEl('div', { key: index, className: 'dl-g-li' },
              createEl('div', { className: 'dl-g-li-title' }, item));
          }
          if (item.type !== undefined) {
            return createEl('div', { key: index, className: 'dl-g-li' },
              renderSpecNode(item, 'li' + index, book, depth + 1));
          }
          return createEl('div', { key: index, className: 'dl-g-li' },
            specIcon(item.icon, 14),
            createEl('div', { className: 'dl-g-li-body' },
              createEl('div', { className: 'dl-g-li-title' }, item.title),
              item.desc === undefined ? null : createEl('div', { className: 'dl-g-li-desc' }, item.desc)));
        }));
    case 'keyvalue':
      return createEl('div', { key, className: 'dl-g-kv' },
        node.pairs.map((pair, index) => createEl('div', { key: index, className: 'dl-g-kv-row' },
          createEl('span', { className: 'dl-g-kv-key' }, pair.key),
          createEl('span', { className: 'dl-g-kv-value' }, pair.value))));
    case 'callout':
      return createEl('div', {
        key,
        className: 'dl-g-callout',
        'data-tone': node.tone === undefined ? 'info' : node.tone,
      },
      node.title === undefined ? null : createEl('b', { className: 'dl-g-callout-title' }, node.title),
      createEl('p', { className: 'dl-g-callout-body' }, node.content));
    case 'image':
      return createEl('figure', { key, className: 'dl-g-image' },
        node.alt === undefined ? null : createEl('figcaption', { className: 'dl-g-image-label' }, node.alt),
        createEl('img', {
          className: 'dl-g-image-img',
          src: node.src,
          alt: node.alt === undefined ? '' : node.alt,
          loading: 'lazy',
          decoding: 'async',
          referrerPolicy: 'no-referrer',
        }),
        node.caption === undefined ? null : createEl('figcaption', { className: 'dl-g-image-caption' }, node.caption));
    case 'avatar':
      return createEl('div', {
        key,
        className: 'dl-g-avatar',
        style: { background: node.color === undefined ? avatarColor(node.name) : node.color },
      }, node.name.slice(0, 1).toUpperCase());
    case 'button': {
      const onPress = node.name !== undefined && typeof book.button === 'function' ? book.button : null;
      return createEl('button', {
        key,
        type: 'button',
        className: 'dl-btn dl-g-btn'
          + (node.tone === 'ghost' ? ' dl-btn--ghost' : '')
          + (node.full === true ? ' dl-g-btn--full' : '')
          + (node.small === true ? ' dl-g-btn--small' : ''),
        'data-tone': node.tone === undefined ? 'primary' : node.tone,
        onClick: onPress === null ? undefined : () => onPress(node.name, node),
      }, specIcon(node.icon, 13), node.label);
    }
    case 'switch': {
      const onToggle = node.name !== undefined && typeof book.switch === 'function' ? book.switch : null;
      const on = node.checked === true;
      return createEl('div', { key, className: 'dl-g-switch-row' },
        createEl('span', { className: 'dl-g-sr-only' }, node.label),
        createEl('button', {
          type: 'button',
          className: 'dl-g-switch',
          role: 'switch',
          'aria-checked': String(on),
          'aria-label': node.label,
          'data-on': String(on),
          onClick: onToggle === null ? undefined : () => onToggle(node.name, !on, node),
        }));
    }
    case 'segmented-control': {
      const onPick = node.name !== undefined && typeof book.segmented === 'function' ? book.segmented : null;
      return createEl('div', { key, className: 'dl-g-seg-wrap' },
        node.label === undefined ? null : createEl('span', { className: 'dl-g-seg-label' }, node.label),
        createEl('div', { className: 'dl-g-seg', role: 'radiogroup', 'aria-label': node.label === undefined ? '筛选' : node.label },
          node.options.map((option, index) => createEl('button', {
            key: index,
            type: 'button',
            role: 'radio',
            className: 'dl-g-seg-opt',
            'aria-checked': String(node.value === option),
            'data-active': String(node.value === option),
            onClick: onPick === null ? undefined : () => onPick(node.name, option, node),
          }, option))));
    }
    case 'spacer':
      return createEl('div', { key, className: 'dl-g-spacer' });
    case 'card':
      return createEl('section', {
        key,
        className: 'dl-g-card' + (node.flat === true ? ' dl-g-card--flat' : ''),
        'data-tone': node.tone,
        style: node.accent === undefined ? undefined : { borderColor: node.accent },
      },
      node.eyebrow === undefined ? null : createEl('div', { className: 'dl-g-card-eyebrow' }, node.eyebrow),
      node.title === undefined ? null : createEl('div', { className: 'dl-g-card-title' }, node.title),
      kids(node.items));
    case 'row':
      return createEl('div', {
        key,
        className: 'dl-g-row'
          + (node.wrap === true ? ' dl-g-row--wrap' : '')
          + (node.justify === undefined ? '' : ' dl-g-row--' + node.justify),
      },
      kids(node.items),
      node.spacer === true ? createEl('div', { key: 'spacer', className: 'dl-g-spacer' }) : null);
    case 'col':
      return createEl('div', {
        key,
        className: 'dl-g-col',
        style: node.gap === undefined && node.width === undefined ? undefined : {
          ...(node.gap === undefined ? {} : { gap: node.gap + 'px' }),
          ...(node.width === undefined ? {} : { flex: '0 1 ' + node.width + '%' }),
        },
      }, kids(node.items));
    case 'grid':
      return createEl('div', {
        key,
        className: 'dl-g-grid',
        style: { '--dl-g-cols': String(node.cols) },
      },
      node.items.map((child, index) => {
        const span = child.span === undefined ? 1 : Math.max(1, Math.min(GENUI_LIMITS.maxGridCols, child.span));
        const element = renderSpecNode(child, 'cell' + index, book, depth + 1);
        return span > 1
          ? createEl('div', { key: index, className: 'dl-g-grid-span', style: { gridColumn: 'span ' + span } }, element)
          : element;
      }));
    case 'table': {
      const cellClass = (index) => 'dl-g-table-cell'
        + (node.types !== undefined && (node.types[index] === 'num' || node.types[index] === 'delta')
          ? ' dl-g-table--num' : '');
      return createEl('table', { key, className: 'dl-g-table' },
        createEl('thead', null, createEl('tr', null,
          node.columns.map((column, index) => createEl('th', { key: index, className: cellClass(index) }, column)))),
        createEl('tbody', null, node.rows.map((row, rowIndex) => createEl('tr', { key: rowIndex },
          node.columns.map((_, cellIndex) => createEl('td', {
            key: cellIndex,
            className: cellClass(cellIndex),
          }, row[cellIndex] === undefined ? '' : row[cellIndex]))))));
    }
    case 'chart':
      return specChart(node, key);
    case 'steps':
      return createEl('ol', { key, className: 'dl-g-steps' },
        node.steps.map((step, index) => createEl('li', {
          key: index,
          className: 'dl-g-step' + (node.current === index ? ' dl-g-step--now' : ''),
        },
        createEl('b', { className: 'dl-g-step-title' }, step.title),
        step.desc === undefined ? null : createEl('span', { className: 'dl-g-step-desc' }, step.desc))));
    case 'timeline':
      return createEl('div', { key, className: 'dl-g-timeline' },
        node.items.map((item, index) => createEl('div', { key: index, className: 'dl-g-tl' },
          createEl('span', { className: 'dl-g-tl-time' }, item.time === undefined ? '' : item.time),
          createEl('div', { className: 'dl-g-tl-body' },
            createEl('b', { className: 'dl-g-tl-title' }, item.title),
            item.desc === undefined ? null : createEl('span', { className: 'dl-g-tl-desc' }, item.desc)))));
    case 'code':
      return createEl('pre', { key, className: 'dl-g-code', 'data-lang': node.lang },
        createEl('code', null, node.code));
    case 'json':
      return createEl('pre', { key, className: 'dl-g-code dl-g-code--json' },
        createEl('code', null, node.text));
    case 'link':
      return node.href === undefined
        ? createEl('span', { key, className: 'dl-g-link' }, node.label)
        : createEl('a', {
          key,
          className: 'dl-g-link',
          href: node.href,
          target: '_blank',
          rel: 'noreferrer noopener',
        }, node.label);
    default:
      return null;
  }
}

/**
 * spec → React 元素：根是一列（`.dl-g-root`），`gap` 落在内联 style 上。
 * 渲染前先 `validateSpec`；坏节点/未知类型只丢自己，兄弟继续渲染。
 */
function renderSpec(spec, handlers, key) {
  const clean = validateSpec(spec);
  const props = { className: 'dl-g-root' };
  if (key !== undefined) props.key = key;
  if (clean.gap !== undefined) props.style = { gap: clean.gap + 'px' };
  const children = clean.items.map((node, index) => renderSpecNode(node, index, handlers, 0));
  /* 根标题（spec.title）：右栏那几份 spec 没有 title，行为不变；左栏的 `dsh-ui` 围栏常带它。 */
  if (clean.title !== undefined) {
    children.unshift(createEl('div', { key: 'title', className: 'dl-g-root-title' }, clean.title));
  }
  return createEl('div', props, children);
}

/* 头像底色：名字 hash 到已有的那几档色，同一个名字永远同色。 */
function avatarColor(name) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = ((hash * 31) + name.charCodeAt(index)) >>> 0;
  return GENUI_AVATAR_TONES[hash % GENUI_AVATAR_TONES.length];
}

/* ── 会话：接 superagent 的主编排会话 ───────────────────────────────────── */

/* 主会话是 superagent 启动时 ensure 出来的那一个：id 是 `orchestrator-<stateDir 的
   hash>`（superagent/src/app/runtime.ts:104），标题被改成 `dsh-superagent
   orchestrator`（同文件 :210）。这里按这两个特征认它；认不到就空态 + 重试，
   不新建会话——新建出来的是另一条，接不上主编排。 */
const MAIN_SESSION_PREFIX = 'orchestrator-';
const MAIN_SESSION_TITLE = 'dsh-superagent orchestrator';
/* 一屏放不下的旧消息不渲染；已加载的窗口本身不截断（更早的留给 loadOlder）。 */
const MAX_BUBBLES = 200;

/* `apply()` 里从 ctx 拿到的 sessions 服务。整个插件只有一个页面实例。 */
let sessions = null;
const sessionWaiters = new Set();
/* apply 时记下的客户端 ctx：服务可能是后 provide 的，重试时要能再取一次。 */
let hostCtx = null;

function publishSessions(service) {
  /* 只换到手的：还没 provide 时不要把已经连上的拆掉（重绘会重跑 apply）。 */
  if (!service || sessions === service) return;
  sessions = service;
  for (const notify of sessionWaiters) notify();
}

/** 再取一次 sessions 服务；还没 provide 就返回 null。 */
function pickupSessions() {
  if (hostCtx === null || typeof hostCtx.get !== 'function') return null;
  return hostCtx.get('sessions') || null;
}

/* 服务还没到时也得有东西可订阅，否则 hooks 会变成条件调用。 */
const NULL_SOURCE = { getSnapshot: () => null, subscribe: () => () => {} };
const EMPTY_WINDOW = { entries: [], hasMore: false, revision: 0, change: { kind: 'replace', entries: [] } };
const EMPTY_WINDOW_SOURCE = { getSnapshot: () => EMPTY_WINDOW, subscribe: () => () => {} };
const EMPTY_SNAPSHOT = { pendingSubmissions: [], running: false, openState: 'cold', blank: false, removed: false };
const EMPTY_SNAPSHOT_SOURCE = { getSnapshot: () => EMPTY_SNAPSHOT, subscribe: () => () => {} };

/* 认主会话：id 前缀优先，其次标题（标题被改过也能认回来）。 */
function isMainSession(id, row) {
  if (typeof id === 'string' && id.indexOf(MAIN_SESSION_PREFIX) === 0) return true;
  const title = (row && (row.title || row.displayTitle)) || '';
  return title.toLowerCase().indexOf(MAIN_SESSION_TITLE) !== -1;
}

function mainSessionId(state) {
  if (!state || !Array.isArray(state.ids)) return undefined;
  const rows = state.byId || {};
  return state.ids.find((id) => isMainSession(id, rows[id]));
}

/* 订阅一个 ObservableSnapshot：subscribe/getSnapshot 必须绑在 source 上调用，
   解构出来直接传会丢 this。 */
function useSource(source) {
  const { useCallback, useSyncExternalStore } = useReact();
  const subscribe = useCallback((notify) => source.subscribe(notify), [source]);
  const read = useCallback(() => source.getSnapshot(), [source]);
  return useSyncExternalStore(subscribe, read);
}

/* 取文本块。两类事件的判别字段不同：喂进来的消息用 `type`（ui-chat/MessageItem.tsx:30），
   助手消息用 `kind`（ui-chat/conversation-nodes/assistant.ts:61）。只收文本——
   工具调用与思考过程在这里就没有进过界面。 */
function textBlocks(content) {
  if (!Array.isArray(content)) return '';
  const lines = [];
  for (const block of content) {
    if (!block) continue;
    if ((block.kind === 'text' || block.type === 'text') && typeof block.text === 'string' && block.text.trim() !== '') {
      lines.push(block.text);
    }
  }
  return lines.join('\n');
}

/* ── Markdown：气泡正文 ─────────────────────────────────────────────────────

   只做聊天里常见的 Markdown：标题、段落、列表（可嵌套）、引用、代码块、表格、
   分隔线；行内粗体、斜体、删除线、行内代码、链接。全部用 React 元素拼，
   不写 innerHTML——原始 HTML 当文字；链接只放行 http(s)/mailto。
   和围栏的顺序：`dsh-ui` / `html` 围栏先切段，剩下的文字才走这里。 */

const MD_FENCE = /^\s*(```+|~~~+)\s*([A-Za-z0-9_+-]*)\s*$/;
const MD_HEADING = /^(#{1,6})\s+(.*)$/;
const MD_HR = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const MD_QUOTE = /^\s*>\s?/;
const MD_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

function mdIndent(line) {
  return /^\s*/.exec(line)[0].length;
}

/* 只做 http(s) / mailto；别的协议（javascript:、data:）当普通文字。 */
function mdHref(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return /^(https?:\/\/|mailto:)/i.test(value) ? value : null;
}

function mdInline(text, prefix) {
  const source = typeof text === 'string' ? text : '';
  const nodes = [];
  let buffer = '';
  let i = 0;
  const flush = () => {
    if (buffer !== '') { nodes.push(buffer); buffer = ''; }
  };
  const push = (node) => { flush(); nodes.push(node); };
  while (i < source.length) {
    const rest = source.slice(i);
    const next = source[i + 1] || '';
    if (rest[0] === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > i + 1) {
        push(createEl('code', { key: prefix + '-c' + nodes.length }, source.slice(i + 1, end)));
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith('**') || rest.startsWith('__')) {
      const mark = rest.slice(0, 2);
      const end = source.indexOf(mark, i + 2);
      if (end > i + 2) {
        push(createEl('strong', { key: prefix + '-b' + nodes.length }, mdInline(source.slice(i + 2, end), prefix + 'b' + nodes.length)));
        i = end + 2;
        continue;
      }
    }
    if (rest.startsWith('~~')) {
      const end = source.indexOf('~~', i + 2);
      if (end > i + 2) {
        push(createEl('del', { key: prefix + '-d' + nodes.length }, mdInline(source.slice(i + 2, end), prefix + 'd' + nodes.length)));
        i = end + 2;
        continue;
      }
    }
    if (rest[0] === '*' || rest[0] === '_') {
      const mark = rest[0];
      const before = i === 0 ? ' ' : source[i - 1];
      const atWordEdge = !/[A-Za-z0-9]/.test(before) && next !== '' && !/\s/.test(next);
      const end = source.indexOf(mark, i + 1);
      if (atWordEdge && end > i + 1) {
        push(createEl('em', { key: prefix + '-i' + nodes.length }, mdInline(source.slice(i + 1, end), prefix + 'i' + nodes.length)));
        i = end + 1;
        continue;
      }
    }
    if (rest[0] === '[') {
      const match = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest);
      if (match) {
        const href = mdHref(match[2]);
        push(href === null
          ? match[0]
          : createEl('a', { key: prefix + '-a' + nodes.length, href, target: '_blank', rel: 'noreferrer noopener' }, mdInline(match[1], prefix + 'a' + nodes.length)));
        i += match[0].length;
        continue;
      }
    }
    buffer += source[i];
    i += 1;
  }
  flush();
  return nodes;
}

function mdSplitRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function mdTableAt(lines, index) {
  if (index + 1 >= lines.length) return null;
  if (!lines[index].includes('|') || !lines[index + 1].includes('|')) return null;
  const header = mdSplitRow(lines[index]);
  const align = mdSplitRow(lines[index + 1]);
  if (header.length === 0 || align.length !== header.length) return null;
  if (!align.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
  const rows = [];
  let i = index + 2;
  while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
    rows.push(mdSplitRow(lines[i]));
    i += 1;
  }
  return { header, align, rows, next: i };
}

function mdAlign(cell) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  return left && right ? 'center' : right ? 'right' : undefined;
}

function mdTable(block, prefix) {
  const head = createEl('tr', null, block.header.map((cell, index) => createEl('th', {
    key: prefix + 'h' + index,
    style: { textAlign: mdAlign(block.align[index]) },
  }, mdInline(cell, prefix + 'h' + index))));
  const body = block.rows.length === 0 ? null : createEl('tbody', null, block.rows.map((row, rowIndex) => createEl('tr', { key: prefix + 'r' + rowIndex },
    block.header.map((_, cellIndex) => createEl('td', {
      key: prefix + 'c' + rowIndex + '-' + cellIndex,
      style: { textAlign: mdAlign(block.align[cellIndex]) },
    }, mdInline(row[cellIndex] || '', prefix + 'c' + rowIndex + '-' + cellIndex))))));
  return createEl('div', { key: prefix + '-table', className: 'dl-md-table' },
    createEl('table', null, createEl('thead', null, head), body));
}

/* 段落里的单换行按聊天习惯保留成 <br>，不按 CommonMark 的软换行处理。 */
function mdParagraph(lines, prefix) {
  const nodes = [];
  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    if (nodes.length > 0) nodes.push(createEl('br', { key: prefix + '-br' + index }));
    nodes.push(mdInline(line, prefix + '-l' + index));
  });
  return nodes;
}

function mdListAt(lines, start, prefix) {
  const first = MD_ITEM.exec(lines[start]);
  const base = first[1].length;
  const ordered = /^\d/.test(first[2]);
  const items = [];
  let i = start;
  while (i < lines.length) {
    const match = MD_ITEM.exec(lines[i]);
    if (match === null) {
      if (items.length > 0 && lines[i].trim() !== '' && mdIndent(lines[i]) > base) {
        items[items.length - 1].lines.push(lines[i].trim());
        i += 1;
        continue;
      }
      break;
    }
    const indent = match[1].length;
    if (indent < base) break;
    if (indent > base) {
      const nested = mdListAt(lines, i, prefix + 'n' + items.length);
      if (items.length === 0) items.push({ lines: [], nested: [] });
      items[items.length - 1].nested.push(nested.node);
      i = nested.next;
      continue;
    }
    if (/^\d/.test(match[2]) !== ordered) break;
    const item = { lines: [match[3]], nested: [] };
    items.push(item);
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && MD_ITEM.test(lines[i]) === false && mdIndent(lines[i]) > base) {
      item.lines.push(lines[i].trim());
      i += 1;
    }
  }
  const tag = ordered ? 'ol' : 'ul';
  return {
    node: createEl(tag, { key: prefix + '-list' }, items.map((item, index) => createEl('li', { key: prefix + '-li' + index },
      mdParagraph(item.lines, prefix + '-li' + index), item.nested))),
    next: i,
  };
}

function mdBlockStart(lines, index) {
  const line = lines[index];
  return MD_FENCE.test(line) || MD_HEADING.test(line) || MD_HR.test(line)
    || MD_QUOTE.test(line) || MD_ITEM.test(line) || mdTableAt(lines, index) !== null;
}

function mdBlocks(text, prefix) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i += 1; continue; }
    const fence = MD_FENCE.exec(line);
    if (fence) {
      const close = new RegExp('^\\s*' + fence[1][0] + '{3,}\\s*$');
      const code = [];
      i += 1;
      while (i < lines.length && close.test(lines[i]) === false) { code.push(lines[i]); i += 1; }
      if (i < lines.length) i += 1;
      blocks.push(createEl('pre', { key: prefix + '-pre' + blocks.length },
        createEl('code', { className: fence[2] ? 'language-' + fence[2] : undefined }, code.join('\n'))));
      continue;
    }
    const heading = MD_HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(createEl('h' + level, { key: prefix + '-h' + blocks.length }, mdInline(heading[2], prefix + '-h' + blocks.length)));
      i += 1;
      continue;
    }
    if (MD_HR.test(line)) {
      blocks.push(createEl('hr', { key: prefix + '-hr' + blocks.length }));
      i += 1;
      continue;
    }
    if (MD_QUOTE.test(line)) {
      const inner = [];
      while (i < lines.length && MD_QUOTE.test(lines[i])) {
        inner.push(lines[i].replace(MD_QUOTE, ''));
        i += 1;
      }
      blocks.push(createEl('blockquote', { key: prefix + '-q' + blocks.length }, mdBlocks(inner.join('\n'), prefix + '-q' + blocks.length)));
      continue;
    }
    const table = mdTableAt(lines, i);
    if (table !== null) {
      blocks.push(mdTable(table, prefix + '-t' + blocks.length));
      i = table.next;
      continue;
    }
    if (MD_ITEM.test(line)) {
      const list = mdListAt(lines, i, prefix + '-u' + blocks.length);
      blocks.push(list.node);
      i = list.next;
      continue;
    }
    const paragraph = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && mdBlockStart(lines, i) === false) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(createEl('p', { key: prefix + '-p' + blocks.length }, mdParagraph(paragraph, prefix + '-p' + blocks.length)));
  }
  return blocks;
}

function renderMarkdown(text, prefix) {
  const blocks = mdBlocks(text, prefix || 'md');
  if (blocks.length === 0) return null;
  return createEl('div', { className: 'dl-md', 'data-markdown': '1' }, blocks);
}

/* ── 自由 UI：她写 ```html 围栏，左栏把它渲成沙箱 iframe ─────────────────────

   右栏走的是「白名单 spec」（只能拼预置组件）；这一条是另一条路：她能写任意
   HTML/CSS/JS，代价是每次要好几百行代码，所以默认仍然只说话。

   安全边界三层，缺一层都不装：
   1. `sandbox="allow-scripts"`，**没有** `allow-same-origin`——文档拿不到父页面
      的源，碰不到 DOM / localStorage / cookie；也没有 top-navigation、popups、forms。
   2. srcdoc 里再压一层 CSP：`connect-src 'none'`（fetch / XHR / WebSocket 全断）、
      图只认 `data:` / `blob:`、不许提交表单。
   3. 父页面只认 `event.source === iframe.contentWindow` 的高度回报，别的消息不理。

   没有兜底卡片：她写坏了就是一个坏页面，但消息本体还在、字一个不丢。 */
/* 自由 HTML 通道总开关（2026-11-15 深夜，主人「先两条链路保留一下」）。
   false（当前）= 两条路都走结构化：左栏 html 围栏当普通文字原样显示（字一个不丢），
                  右栏 Today 渲 worker 写的 `<日期>.json` 卡片；
   true          = 恢复自由 HTML：左栏 html 围栏渲成沙箱框，右栏 Today 今天有
                  `<日期>.html` 就塞沙箱框。
   两条路共用同一份宿主接口（响应里 cards 与 html 一起带），所以切换只改这一行 +
   硬刷新，不用重启。代码、沙箱边界与 card-guide 技能都还在。 */
const FREE_HTML_UI = false;
const UI_FENCE = /```[ \t]*(?:html|htm)[ \t]*\r?\n([\s\S]*?)```/gi;
/* 左栏：正文里的 `dsh-ui` 围栏 → genui spec 卡片。
   和 html 围栏共用同一套 code-fence 分段规则：多段围栏各自成段、没闭合的那条整段
   按普通文字处理，后面的正文一个字都不吞。语言标记跟 genui 自己的规范走（只认
   `dsh-ui`，大小写不敏感，并吸收标签尾部的手滑标点，如 ```dsh-ui>）。
   收尾必须是单独一行的 ```（与宿主 markdown 一致）。 */
const SPEC_FENCE = /```[ \t]*dsh-ui[ \t]*[>`"'.,;:)\]】」』]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/gi;

/* 一条正文切成「文字段 / dsh-ui 段」。没围栏时返回一段文字；全是空白时返回空数组。 */
function splitDshUiFences(text) {
  const source = typeof text === 'string' ? text : '';
  const segments = [];
  let last = 0;
  SPEC_FENCE.lastIndex = 0;
  let match = SPEC_FENCE.exec(source);
  while (match !== null) {
    if (match.index > last) segments.push({ kind: 'text', text: source.slice(last, match.index) });
    segments.push({ kind: 'spec', code: match[1] });
    last = match.index + match[0].length;
    match = SPEC_FENCE.exec(source);
  }
  if (last < source.length) segments.push({ kind: 'text', text: source.slice(last) });
  return segments.filter((segment) => segment.kind === 'spec' || segment.text.trim() !== '');
}

/* 围栏正文 → 可直接渲染的 spec。坏 JSON、不是对象、清洗后一个节点都不剩，一律返回
   null：调用方把原文当文字摆出来——卡片画不出来不许让字跟着消失。 */
function parseSpecFence(code) {
  let parsed;
  try {
    parsed = JSON.parse(String(code));
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;
  /* 只写了一个组件根的 spec：上游把它包成 items（spec.ts 的 wrapSingleComponentRoot）。 */
  const spec = typeof parsed.type === 'string'
    ? { items: [parsed] }
    : (Array.isArray(parsed.items) ? parsed : null);
  if (spec === null) return null;
  const clean = validateSpec(spec);
  return clean.items.length === 0 ? null : clean;
}

const UI_POLICY = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; "
  + "img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; "
  + "form-action 'none'; base-uri 'none'";

/* 卡片里能用的主题变量：她写 `var(--dl-ink)`，框里就自动是这页的墨色。
   抄的是 openhanako 的做法（它从主题里抠 20 个变量注入 iframe），这条决定了
   卡片看起来像这页的一部分，而不是一段外来网页。 */
const UI_TOKENS = [
  '--dl-paper', '--dl-paper-2', '--dl-paper-3',
  '--dl-ink', '--dl-ink-2', '--dl-ink-3',
  '--dl-rule', '--dl-rule-soft', '--dl-lede',
  '--dl-brand', '--dl-grad',
];

/* 采集当前主题变量。token 定义在 `.dl` 上（不是 `:root`），所以先找 `.dl`。
   值要拼进 `<style>`：带 `<>{}` 的一律丢掉，杜绝闭合标签逃逸。 */
function uiThemeVars() {
  try {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return '';
    const scope = typeof document.querySelector === 'function'
      ? (document.querySelector('.dl') || document.documentElement)
      : null;
    if (scope === null) return '';
    const style = getComputedStyle(scope);
    return UI_TOKENS.map((name) => {
      const value = String(style.getPropertyValue(name) || '').trim();
      return value !== '' && !/[<>{}]/.test(value) ? name + ':' + value : '';
    }).filter(Boolean).join(';');
  } catch {
    return '';
  }
}

/* 基础排版：她只该写结构（h2/table/blockquote），字距行高由这里定。
   没有这一段，`<h2>` 会带着浏览器默认的衬线大字直接怼进纸色里。 */
const UI_FRAME_CSS = 'html,body{margin:0;padding:0}'
  + 'body{padding:10px 12px;font:13px/1.62 system-ui,-apple-system,"Segoe UI",sans-serif;'
  + 'color:var(--dl-ink,#241c16);background:transparent;-webkit-font-smoothing:antialiased}'
  + 'a{color:var(--dl-brand,#b8452f)}img{max-width:100%}button{font:inherit}'
  + 'h1{font-size:17px;font-weight:650;letter-spacing:-.01em;margin:0 0 6px}'
  + 'h2{font-size:14px;font-weight:650;margin:14px 0 6px}'
  + 'h3{font-size:13px;font-weight:650;margin:10px 0 4px}'
  + 'p{margin:4px 0}small{font-size:11px;color:var(--dl-ink-3,#8d7c70)}'
  + 'strong{font-weight:650}hr{border:none;border-top:1px solid var(--dl-rule-soft,rgb(120 86 62/.16));margin:10px 0}'
  + 'table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}'
  + 'th{text-align:left;font-weight:600;color:var(--dl-ink-2,#6f6055);padding:5px 8px;'
  + 'border-bottom:1px solid var(--dl-rule,rgb(120 86 62/.35))}'
  + 'td{padding:4px 8px;border-bottom:1px solid var(--dl-rule-soft,rgb(120 86 62/.16))}'
  + 'tr:last-child td{border-bottom:none}'
  + 'ul,ol{padding-left:18px;margin:4px 0}li{margin:2px 0}'
  + 'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}'
  + 'pre{background:var(--dl-paper-2,#f7f1e6);border:1px solid var(--dl-rule-soft,rgb(120 86 62/.16));'
  + 'border-radius:8px;padding:8px 10px;overflow-x:auto}'
  + 'blockquote{margin:8px 0;padding:2px 0 2px 10px;border-left:2px solid var(--dl-rule,rgb(120 86 62/.35));'
  + 'color:var(--dl-ink-2,#6f6055)}';

/* 报高度：量 body 的盒子，不是 documentElement.scrollHeight——后者被框的
   视口撑满，短页面也会报 200，气泡就会留一片空白。
   再挂一个 ping：宿主在 load 后发一次，兜住「首报早于监听器挂上」的竞态。 */
const UI_REPORT = 'var r=function(){var b=document.body;'
  + 'var h=b?Math.ceil(b.getBoundingClientRect().height):0;'
  + 'parent.postMessage({dlUiFrame:1,h:h},"*")};'
  + 'addEventListener("load",r);new ResizeObserver(r).observe(document.body);r();'
  + 'addEventListener("message",function(e){if(e.data==="dlUiPing")r()});';

/* 把一条气泡的正文切成「文字段」和「界面段」。没闭合的围栏不算界面——
   宁可把它当普通文字显示，也不要把后面的正文一起吞掉。 */
function splitUiFences(text) {
  const source = typeof text === 'string' ? text : '';
  /* 通道停用：整条当文字，围栏原样留在正文里（不丢字、不吞正文）。 */
  if (!FREE_HTML_UI) return source.trim() === '' ? [] : [{ kind: 'text', text: source }];
  const segments = [];
  let last = 0;
  UI_FENCE.lastIndex = 0;
  let match = UI_FENCE.exec(source);
  while (match !== null) {
    if (match.index > last) segments.push({ kind: 'text', text: source.slice(last, match.index) });
    segments.push({ kind: 'ui', code: match[1] });
    last = match.index + match[0].length;
    match = UI_FENCE.exec(source);
  }
  if (last < source.length) segments.push({ kind: 'text', text: source.slice(last) });
  return segments.filter((segment) => segment.kind === 'ui' || segment.text.trim() !== '');
}

function uiDocument(code, themeVars) {
  const vars = typeof themeVars === 'string' && themeVars !== '' ? themeVars : uiThemeVars();
  return '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="' + UI_POLICY + '">'
    + (vars === '' ? '' : '<style>:root{' + vars + '}</style>')
    + '<style>' + UI_FRAME_CSS + '</style></head><body>' + String(code)
    + '<script>' + UI_REPORT + '</scr' + 'ipt></body></html>';
}

/* 高度跟着内容走：80–620 之间，超出就在框里滚。
   不用 state：直接写节点上，省掉一次重渲染——界面高度是浏览器的反馈，不是 React 的状态。
   监听器只有一条（window 上），按 `event.source` 认是哪一帧，别的一律不理。 */
const UI_MIN_H = 80;
const UI_MAX_H = 620;
const UI_FRAMES = new Set();
let UI_WATCHING = false;

/* 卡片里的按钮：她只能**替你写好一句话**，不能替你发。
   框里 `parent.postMessage({dlUiPick:'先做评审'})` → 这里把话填进输入框，光标留在那，
   发不发、发什么，还是你按。派单不在这里发生：谁派活、派什么，要走她正常的接单路径，
   不能塞进一张卡片里——尤其右栏那张是 worker 写的。 */
const UI_PICK_MAX = 500;
let UI_PICK_SINK = null;

function setUiPickSink(sink) {
  UI_PICK_SINK = typeof sink === 'function' ? sink : null;
}

/* 卡片送来的话：只接字符串、去掉两头空白、统一换行、截断超长。 */
function uiPickText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\r\n?/g, '\n').trim().slice(0, UI_PICK_MAX);
}

function deliverUiPick(raw) {
  const text = uiPickText(raw);
  if (text !== '' && UI_PICK_SINK !== null) UI_PICK_SINK(text);
}

/* 只认我们挂上去的框：别的窗口/扩展发来的消息一律不理。 */
function uiFrameOf(source) {
  if (!source) return null;
  for (const node of UI_FRAMES) {
    if (node.contentWindow === source) return node;
  }
  return null;
}

function watchUiHeight() {
  if (UI_WATCHING || typeof window === 'undefined') return;
  UI_WATCHING = true;
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const owner = uiFrameOf(event.source);
    if (owner === null) return;

    /* 按钮点出来的话：只接字符串，截断超长，空话不算数。 */
    if (typeof data.dlUiPick === 'string') {
      deliverUiPick(data.dlUiPick);
      return;
    }

    if (data.dlUiFrame !== 1) return;
    const next = Number(data.h);
    if (!Number.isFinite(next) || next <= 0) return;
    const height = Math.max(UI_MIN_H, Math.min(UI_MAX_H, Math.ceil(next))) + 'px';
    owner.style.height = height;
  });
}

/* 一个沙箱框。左栏（她给你做的界面）与右栏（worker 写的今天的界面）共用同一套
   边界与同一套高度回报，只有类名与标题不同。 */
function sandboxFrame(h, { key, code, wrapClass, frameClass, title }) {
  let mounted = null;
  const ref = (node) => {
    if (node !== null) {
      mounted = node;
      UI_FRAMES.add(node);
      watchUiHeight();
      /* load 后再 ping 一次：首报可能早于父页面挂上监听。 */
      if (typeof node.addEventListener === 'function') {
        node.addEventListener('load', () => {
          try {
            if (node.contentWindow) node.contentWindow.postMessage('dlUiPing', '*');
          } catch {
            /* 跨源时这里的异常没有意义，吞掉 */
          }
        });
      }
      return;
    }
    if (mounted !== null) UI_FRAMES.delete(mounted);
    mounted = null;
  };
  return h('div', { key, className: wrapClass }, h('iframe', {
    ref,
    className: frameClass,
    title,
    sandbox: 'allow-scripts',
    style: { height: '200px' },
    srcDoc: uiDocument(code),
  }));
}

function uiFrame(h, key, code) {
  return sandboxFrame(h, { key, code, wrapClass: 'dl-ui', frameClass: 'dl-ui-frame', title: '她做的界面' });
}

/* 事件窗口 → 气泡。纯函数：同一份窗口永远折叠出同一串气泡。
   瞬态 `assistant/live-chunk` 不进来（微信是整条到达，不是逐字），
   等待感由「正在输入」承担。 */
function foldThread(feed) {
  const bubbles = [];
  const entries = (feed && feed.entries) || [];
  for (const entry of entries) {
    if (!entry || entry.type !== 'event' || !entry.event) continue;
    const event = entry.event;
    if (event.type === 'user/message') {
      const message = event.data || {};
      if (!message.source || message.source.kind !== 'user') continue; /* 注入的上下文不是人话 */
      const text = textBlocks(message.content);
      if (text !== '') bubbles.push({ key: 'u' + event.seq, seq: event.seq, role: 'me', text });
      continue;
    }
    if (event.type === 'assistant/message') {
      const message = (event.data && event.data.message) || {};
      const text = textBlocks(message.content);
      if (text !== '') bubbles.push({ key: 'a' + event.seq, seq: event.seq, role: 'her', text }); /* 只有工具调用的步骤不留空泡 */
    }
  }
  return bubbles;
}

/* 「新建聊天」只折叠显示：会话还是那条 master，模型看到的历史一条不少，
   这里只是不把前面那段摆在你眼前。分界记成一条气泡的 seq——不晚于它的收进
   折叠行，之后的是新的一段。 */
function splitThread(thread, fold) {
  if (fold === null || fold === undefined) return { folded: [], shown: thread };
  const folded = [];
  const shown = [];
  for (const bubble of thread) {
    if (typeof bubble.seq === 'number' && bubble.seq <= fold) folded.push(bubble);
    else shown.push(bubble);
  }
  return { folded, shown };
}

/* 分界存本地：刷新之后还收着，否则一次刷新就把「新建」抹掉了。
   存不进去（隐私模式、被禁用）就当没存过，不挡住聊天。 */
const FOLD_KEY = 'dsh-daily/fold/';

function foldStore() {
  try { return window.localStorage || null; } catch { return null; }
}

function readFold(sessionId) {
  const store = foldStore();
  if (store === null) return null;
  try {
    const value = Number(store.getItem(FOLD_KEY + sessionId));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}

function writeFold(sessionId, seq) {
  const store = foldStore();
  if (store === null) return;
  try {
    if (seq === null) store.removeItem(FOLD_KEY + sessionId);
    else store.setItem(FOLD_KEY + sessionId, String(seq));
  } catch { /* 存不下就当这次折叠只活在这个页面里。 */ }
}

/* 绑定日常会话：认不出就建一条、钉标题，然后 retain 等 ready；卸载时释放。
   ready 失败要说出来，不能静默停在空态。 */
function useMainSession() {
  const { useCallback, useEffect, useMemo, useRef, useState } = useReact();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const notify = () => setTick((value) => value + 1);
    sessionWaiters.add(notify);
    return () => { sessionWaiters.delete(notify); };
  }, []);
  const listState = useSource(sessions === null ? NULL_SOURCE : sessions.list);
  const id = useMemo(() => mainSessionId(listState), [listState]);
  const [bind, setBind] = useState({ id: undefined, binding: null, error: null });
  const pulled = useRef(false);

  /* 列表都还没来时先拉一次；只拉一次——refresh 会重发快照，不设闸会自己叫自己。 */
  useEffect(() => {
    if (sessions === null || listState === null || pulled.current) return;
    if (listState.phase === 'ready') return;
    pulled.current = true;
    sessions.refresh().catch(() => {});
  }, [listState]);

  useEffect(() => {
    if (sessions === null || id === undefined) {
      setBind({ id, binding: null, error: null });
      return undefined;
    }
    let live = true;
    let reference;
    try {
      reference = sessions.retain(id, { source: 'daily' });
    } catch (failure) {
      setBind({ id, binding: null, error: String((failure && failure.message) || failure) });
      return undefined;
    }
    setBind({ id, binding: null, error: null });
    reference.ready.then(
      (binding) => { if (live) setBind({ id, binding, error: null }); },
      (failure) => { if (live) setBind({ id, binding: null, error: String((failure && failure.message) || failure) }); },
    );
    return () => { live = false; reference.release(); };
  }, [id, tick]);

  const snapshot = useSource(bind.binding === null ? EMPTY_SNAPSHOT_SOURCE : bind.binding.session);
  const retry = useCallback(() => {
    publishSessions(pickupSessions());
    setTick((value) => value + 1);
    if (sessions !== null) sessions.refresh().catch(() => {});
  }, []);
  return { id, binding: bind.binding, error: bind.error, snapshot, retry };
}

/* ── 左栏 ───────────────────────────────────────────────────────────────── */

function ChatPane() {
  const { createElement: h, useCallback, useEffect, useMemo, useRef, useState } = useReact();
  const { id, binding, error, snapshot, retry } = useMainSession();
  const feed = useSource(binding === null ? EMPTY_WINDOW_SOURCE : binding.eventSource);
  const thread = useMemo(() => foldThread(feed), [feed]);
  const pending = snapshot.pendingSubmissions || [];
  const reachable = binding !== null;

  /* 折叠分界跟会话走：换一条会话就是另一个 key；会话 id 到手后读一次本地记录。 */
  const [fold, setFold] = useState(null);
  const [unfolded, setUnfolded] = useState(false);
  const readFor = useRef(null);
  useEffect(() => {
    if (id === undefined || readFor.current === id) return;
    readFor.current = id;
    setFold(readFold(id));
    setUnfolded(false);
  }, [id]);

  /* 会话被重写过（历史清零、seq 从头数）时，本地那条分界指向不存在的消息：
     照着它收，会把新的一段一起吞掉。分界比整条会话的最后一条还大 → 作废并抹掉。 */
  const lastSeq = thread.length === 0 ? null : thread[thread.length - 1].seq;
  const stale = typeof fold === 'number' && typeof lastSeq === 'number' && lastSeq < fold;
  const boundary = stale ? null : fold;
  useEffect(() => {
    if (!stale) return;
    setFold(null);
    if (id !== undefined) writeFold(id, null);
  }, [stale, id]);
  const { folded, shown } = useMemo(() => splitThread(thread, boundary), [thread, boundary]);
  const bubbles = shown.length > MAX_BUBBLES ? shown.slice(shown.length - MAX_BUBBLES) : shown;

  const [draft, setDraft] = useState('');
  const [failure, setFailure] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const stick = useRef(true);

  /* 卡片按钮送来的话：填进输入框，不发送。输入框里已经有字就另起一行，
     不覆盖你正在打的——误点一下最多多一行字，按退格就没了。 */
  useEffect(() => {
    setUiPickSink((text) => {
      setDraft((prev) => (prev.trim() === '' ? text : prev.replace(/\s+$/, '') + '\n' + text));
      const box = inputRef.current;
      if (box && typeof box.focus === 'function') {
        box.focus();
        try {
          box.setSelectionRange(text.length, text.length);
        } catch {
          /* 老浏览器没有 setSelectionRange，光标位置不重要 */
        }
      }
    });
    return () => setUiPickSink(null);
  }, []);

  /* 新建聊天：把眼下最后一条当分界收起来，之后从空的一页开始说。
     消息照旧发给同一条 master 会话——历史没被删，也没被改。 */
  const newChat = useCallback(() => {
    const last = thread.length === 0 ? null : thread[thread.length - 1].seq;
    if (typeof last !== 'number') return;
    setFold(last);
    setUnfolded(false);
    if (id !== undefined) writeFold(id, last);
  }, [thread, id]);

  /* 新消息来了才滚到底，而且只有本来就在底部时才滚——翻旧消息时不被拽回来。 */
  const count = bubbles.length + pending.length;
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || !stick.current) return;
    box.scrollTop = box.scrollHeight;
  }, [count, snapshot.running]);

  const onScroll = useCallback(() => {
    const box = scrollRef.current;
    if (!box) return;
    stick.current = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (text === '' || binding === null) return;
    setDraft('');
    setFailure('');
    let handle;
    try {
      /* 先登记本地回声再发：DSH 在持久事件到达时自己把它退场，
         我们不必做「消息到了再把乐观气泡删掉」的去重。 */
      handle = binding.session.beginSubmission({ mode: 'queue', text, attachments: [] });
      const result = await binding.session.prompt([{ type: 'text', text }], 'queue', undefined, handle.requestId);
      if (result && result.ok === false) {
        handle.abandon();
        setDraft(text);
        setFailure((result.error && (result.error.message || result.error.code)) || '未知原因');
      }
    } catch (thrown) {
      if (handle) handle.abandon();
      setDraft(text);
      setFailure(String((thrown && thrown.message) || thrown));
    }
  }, [binding, draft]);

  const stop = useCallback(() => {
    if (binding === null) return;
    /* 停止走 scope 上的 conversation：它是按 ctx 上的会话标签寻址的。 */
    const conversation = binding.ctx && binding.ctx.conversation;
    if (!conversation) return;
    conversation.cancel().catch(() => {});
  }, [binding]);

  const status = reachable ? (snapshot.running ? CHAT.busy : CHAT.at) : CHAT.offline;

  /* 一条气泡的渲染：换到的会话、折叠段、新的一段都走这里，样式只有一套。
     正文先切 `dsh-ui` 围栏（→ spec 卡片，本文件上半部的 vendored 渲染器），
     文字段再切 `html` 围栏（→ 沙箱 iframe，FREE_HTML_UI 关着时原样当文字）。
     两段都不吞正文：围栏没闭合时整条按文字走；spec 画不出来时把围栏原文当文字摆出来。
     带界面的气泡放宽宽度，否则 88% 的窄栏里放一张卡没意义。 */
  const bubble = (item) => {
    const segments = [];
    for (const part of splitDshUiFences(item.text)) {
      if (part.kind === 'spec') {
        const spec = parseSpecFence(part.code);
        /* 坏 JSON / 一个能画的节点都没有：降级成原文，不许整块消失。 */
        segments.push(spec === null ? { kind: 'text', text: part.code } : { kind: 'spec', spec });
        continue;
      }
      for (const inner of splitUiFences(part.text)) segments.push(inner);
    }
    const hasUi = segments.some((segment) => segment.kind !== 'text');
    return h('div', {
      key: item.key,
      className: (item.role === 'me' ? 'dl-msg dl-msg--me' : 'dl-msg') + (hasUi ? ' dl-msg--ui' : ''),
    }, h('div', { className: 'dl-bubble' },
      segments.map((segment, at) => {
        if (segment.kind === 'ui') return uiFrame(h, item.key + '-ui' + at, segment.code);
        if (segment.kind === 'spec') {
          return h('div', { key: item.key + '-spec' + at, className: 'dl-spec' },
            renderSpec(segment.spec, null, item.key + '-spec' + at));
        }
        return renderMarkdown(segment.text, item.key + '-md-' + at);
      })));
  };
  /* 页头只留一个 diva 字标：侧栏已经有「日常」，不再重复，也不挂会话副标题。
     字标用衬线小写 + 珊瑚句点，和 Lumen Studio 的报头同一种写法。 */
  return h('section', { className: 'dl-chat' },
    h('header', { className: 'dl-chat-head' },
      h('span', { className: 'dl-wordmark' },
        CHAT.brand,
        h('span', { className: 'dl-wordmark-dot', 'aria-hidden': 'true' }, '.')),
      h('span', { className: 'dl-thread-pill', 'data-live': reachable ? 'on' : 'off', role: 'status' },
        h('i', { 'aria-hidden': 'true' }),
        status),
      h('div', { className: 'dl-head-actions' },
        h('button', {
          type: 'button',
          className: 'dl-btn dl-btn--ghost',
          title: CHAT.newChatHint,
          disabled: !reachable || thread.length === 0,
          onClick: newChat,
        }, CHAT.newChat),
        snapshot.running ? h('button', { type: 'button', className: 'dl-btn dl-btn--ghost', onClick: stop }, CHAT.stop) : null)),

    h('div', { className: 'dl-thread', ref: scrollRef, onScroll },

      reachable ? null : h('div', { className: 'dl-empty dl-empty--chat' },
        h('b', null, error === null ? CHAT.noSession : CHAT.attachFailed),
        h('p', null, error === null ? CHAT.noSessionHint : error),
        h('button', { type: 'button', className: 'dl-btn dl-btn--ghost', onClick: retry }, CHAT.retry)),

      folded.length === 0 ? null : h('div', { className: 'dl-fold' },
        h('button', {
          type: 'button',
          className: 'dl-fold-btn',
          'aria-expanded': String(unfolded),
          onClick: () => setUnfolded((value) => !value),
        }, unfolded ? CHAT.foldLess : CHAT.foldMore(folded.length))),

      unfolded ? folded.map(bubble) : null,

      reachable && bubbles.length === 0 && pending.length === 0
        ? h('div', { className: 'dl-note' }, fold === null ? CHAT.firstWords : CHAT.fresh)
        : null,

      bubbles.map(bubble),

      pending.map((echo) => h('div', { key: 'p' + echo.requestId, className: 'dl-msg dl-msg--me' },
        h('div', { className: 'dl-bubble dl-bubble--pending' }, h('p', null, echo.text)))),

      reachable && snapshot.running
        ? h('div', { className: 'dl-msg' },
          h('div', { className: 'dl-bubble dl-typing', title: CHAT.typing }, h('i'), h('i'), h('i')))
        : null,

      failure === '' ? null : h('div', { className: 'dl-msg-error', role: 'alert' }, CHAT.sendFailed + failure)),

    h('div', { className: 'dl-composer' },
      h('div', { className: 'dl-composer-pill' },
        h('textarea', {
          ref: inputRef,
          className: 'dl-input dl-input--area',
          rows: 1,
          value: draft,
          placeholder: reachable ? CHAT.placeholder : CHAT.offline,
          'aria-label': reachable ? CHAT.placeholder : CHAT.offline,
          enterKeyHint: 'send',
          disabled: !reachable,
          onChange: (event) => setDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            send();
          },
        }),
        h('button', {
          type: 'button',
          className: 'dl-send',
          'aria-label': CHAT.send,
          disabled: !reachable || draft.trim() === '',
          onClick: send,
        }, ICON.send()))));
}

/* ── 右栏：Today / 任务 / 悄悄话 ─────────────────────────────────────────────

   Today 有两条链路，宿主用同一个响应一起下发（`cards` 与 `html` 同时带）：
   - **结构化（当前）**：worker 写 `$DSH_HOME/today/<日期>.json`，
     `{"cards":[{"title","body","nodes"}]}`。这里把「今天 + 历史」映射成已有的 genui
     词汇——日期分区头用 `divider` 的 label，每张卡是 `card` 的 title + 可选 body +
     可选 nodes（原样塞进 card 的 items）——再交给左右栏共用的 `renderSpec`。
     排版归宿主与渲染器，worker 只写标题、正文与一棵 spec 节点树。
   - **整页 HTML（旧路，未删）**：`FREE_HTML_UI = true` 且今天有 `<日期>.html` 时，
     塞进一个沙箱 iframe（和左栏「她给你做的界面」同一套边界）。

   今天没有卡 → 一句安静的空态（验证期那几张示例卡已经删掉）；历史只画有卡的日子，
   没有内容的日期整块不出现。

   任务页同理：四条演示任务、它们的假计数与筛选器都删掉了，没有数据源就只留空态。

   悄悄话还没有数据源，只放占位——它要的不是数据接口，是主体性（她形成「我注意到
   了你没说的事」并承担说出来的后果），那属于《心流》自主能力与《野兔》情绪系统；
   现在做只会得到一个「随机建议」栏目。 */

function TodayView({ today, onRefresh }) {
  /* 读盘途中给骨架：不拿「今天没卡」冒充结果，也不空白。读完才按真数据画。 */
  const loading = today.data === null && today.state === 'loading';
  const data = today.data === null
    ? { date: todayKey(), cards: [], html: null, history: [] }
    : today.data;
  const legacy = FREE_HTML_UI && typeof data.html === 'string'
    ? createEl('div', { className: 'dl-today' }, sandboxFrame(createEl, {
      key: 'today-frame',
      code: data.html,
      wrapClass: 'dl-today-wrap',
      frameClass: 'dl-today-frame',
      title: '今天的界面',
    }))
    : null;
  const label = FREE_HTML_UI
    ? (legacy === null ? '今天的界面 · 自由 HTML 通道开着，今天没有 HTML' : '今天的界面 · worker 写的 HTML')
    : '今天的界面 · 结构化卡片';
  const skeleton = loading
    ? createEl('div', { className: 'dl-today-days dl-today-days--loading', 'aria-busy': 'true' },
      [0, 1, 2].map((index) => createEl('div', { key: 'skel' + index, className: 'dl-skel-card', 'aria-hidden': 'true' },
        createEl('div', { className: 'dl-skel-line dl-skel-line--title' }),
        createEl('div', { className: 'dl-skel-line dl-skel-line--w2' }),
        createEl('div', { className: 'dl-skel-line dl-skel-line--w1' }))))
    : null;
  return createEl('div', { className: 'dl-view' },
    createEl('div', { className: 'dl-today-bar' },
      createEl('span', { className: 'dl-today-label' }, label),
      createEl('button', {
        type: 'button',
        className: 'dl-today-refresh',
        onClick: onRefresh,
        disabled: loading,
        title: '重新读一次',
      }, loading ? '读取中…' : '刷新')),
    loading ? skeleton : legacy,
    loading || legacy !== null
      ? null
      : createEl('div', { className: 'dl-today-days' }, renderSpec(todaySpec(data), null, 'today')));
}

function TasksView() {
  return createEl('div', { className: 'dl-view' }, renderSpec(EMPTY_TASKS, null, 'tasks-empty'));
}

/* 悄悄话：占位页。没有数据源、没有开关、没有任何回调——它现在唯一要说的话
   就是「还没做，为什么还没做」。 */
function WhisperView() {
  return createEl('div', { className: 'dl-view' },
    WHISPER_CARDS.map((spec, index) => renderSpec(spec, null, 'whisper' + index)));
}

/* ── 右栏：Today 的空态与按天分区 ────────────────────────────────────────────

   验证期用的示例卡（今天天气 / 每日推荐）与四条演示任务在 2026-11-15 按主人要求
   删掉了：那些只是验证能力，不是内容。Today 现在只画 worker 真正写下的卡，
   没有就一句话——不摆假数据，也不新造示例。 */

const TODAY_EMPTY_TEXT = '今天还没有要注意的事情哦！';

/** '2026-11-15' → '11 月 15 日'；不是今年的带上年份，免得历史跨年分不清。 */
function dayHeading(date, now) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof date === 'string' ? date : '');
  if (match === null) return typeof date === 'string' ? date : '';
  const day = now instanceof Date ? now : new Date();
  const head = Number(match[2]) + ' 月 ' + Number(match[3]) + ' 日';
  return Number(match[1]) === day.getFullYear() ? head : match[1] + ' 年 ' + head;
}

/**
 * 一天 → spec 节点：日期分区头 + 每张卡（标题 + 可选正文 + 可选 nodes）。日期不进卡里。
 *
 * 卡内顺序固定为 title（card 的标题）、body（小字）、nodes（worker 写的 genui
 * 节点，原样交给 renderSpec）。没有 nodes 的旧卡就是「标题 + 正文」两行，行为不变。
 */
function daySection(day, now) {
  const nodes = [{ type: 'divider', label: dayHeading(day.date, now) }];
  const cards = Array.isArray(day.cards) ? day.cards : [];
  for (const item of cards) {
    const row = item !== null && typeof item === 'object' ? item : {};
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const body = typeof row.body === 'string' ? row.body.trim() : '';
    const extra = Array.isArray(row.nodes) ? row.nodes : [];
    if (title === '' || (body === '' && extra.length === 0)) continue; /* 半张卡不画 */
    const items = [];
    if (body !== '') items.push(t(body, 'body'));
    for (const node of extra) items.push(node);
    nodes.push({ type: 'card', title, items });
  }
  return nodes;
}

/** 整页 spec：今天一块（没卡就一句空态）+ 历史倒序往下；没卡的日子不画分区头。 */
function todaySpec(data, now) {
  const items = daySection(data, now);
  if (data.cards.length === 0) items.push({ type: 'text', size: 'muted', content: TODAY_EMPTY_TEXT });
  for (const day of data.history) items.push.apply(items, daySection(day, now));
  return { items };
}

const EMPTY_TASKS = {
  items: [
    row([t('任务', 'display'), t('还没有接数据源', 'caption')]),
    card([
      t('她接下任务之后，这里会列出来。', 'muted'),
    ]),
  ],
};

/* 悄悄话的占位内容：一页、一张卡、一句话交代为什么现在不做。 */
const WHISPER_CARDS = [{
  items: [
    row([t('悄悄话', 'display'), t('她没问、但注意到的事，以及她想改的地方', 'caption')]),
    card([
      row([t('这一页还没有做', 'h3'), spacer, badge('待实现')]),
      t('以后这里放两类话：你没问但她注意到的（小贴士、提醒），以及她自己想改的地方。', 'muted'),
      t('按主人的决定，等《心流》自主能力系统与《野兔》情绪系统上线再接——在那之前，做出来只会是一个随机建议栏目。', 'caption'),
    ]),
    t('占位 · 暂无数据源，不接任何接口', 'caption'),
  ],
}];

/* ── 主体 ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'tasks', label: '任务' },
  { id: 'whisper', label: '悄悄话' },
];

/* ── 今天的界面：问宿主要 worker 写的数据 ──────────────────────────────────

   宿主半边 `index.js` 一条 `GET /dsh-daily/api/today?date=…` 同时下发三样：
   `cards`（今天的结构化卡）、`html`（旧链路的整页 HTML，可空）、`history`
   （更早的日期，倒序，只含有卡的日子）。文件在
   `$DSH_HOME/today/<YYYY-MM-DD>.json` / `.html`。拿不到（还没人写 / 宿主没起）
   就当没有，右栏给一句空态——不给错误提示，因为「今天还没人写」是常态，不是故障。 */
const TODAY_API = '/dsh-daily/api/today';

function todayKey(now) {
  const day = now instanceof Date ? now : new Date();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return day.getFullYear() + '-' + month + '-' + date;
}

/** 只留「有标题、且有正文或有 nodes」的卡；别的形状当没有。 */
function cardsOf(value) {
  const cards = [];
  if (!Array.isArray(value)) return cards;
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const body = typeof item.body === 'string' ? item.body.trim() : '';
    const nodes = Array.isArray(item.nodes) && item.nodes.length > 0 ? item.nodes : undefined;
    if (title === '' || (body === '' && nodes === undefined)) continue;
    cards.push({ title, body, nodes });
  }
  return cards;
}

/** 历史：只收「日期像样 + 真有卡」的日子，顺序照宿主给的倒序。 */
function historyOf(value) {
  const days = [];
  if (!Array.isArray(value)) return days;
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue;
    if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
    const cards = cardsOf(item.cards);
    if (cards.length === 0) continue;
    days.push({ date: item.date, cards });
  }
  return days;
}

async function fetchToday(date) {
  const scope = typeof window === 'undefined' ? null : window;
  if (scope === null || typeof scope.fetch !== 'function') return null;
  try {
    const reply = await scope.fetch(TODAY_API + '?date=' + encodeURIComponent(date), {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!reply || reply.ok !== true) return null;
    const body = await reply.json();
    if (body === null || typeof body !== 'object' || body.ok !== true) return null;
    const html = typeof body.html === 'string' && body.html.trim() !== '' ? body.html : null;
    return { date, cards: cardsOf(body.cards), html, history: historyOf(body.history) };
  } catch {
    return null;
  }
}

function DailyPage() {
  const { createElement: h, useState, useEffect } = useReact();
  const [tab, setTab] = useState('today');
  const [today, setToday] = useState({ state: 'loading', data: null });
  const [reload, setReload] = useState(0);

  /* 读今天那块。两条链路共用一次请求：结构化要 cards，旧链路要 html。
     `alive` 挡住竞态：连点刷新时，先回来的旧结果不能盖掉新的。 */
  useEffect(() => {
    let alive = true;
    setToday((previous) => ({ state: previous.data === null ? 'loading' : 'ready', data: previous.data }));
    (async () => {
      const data = await fetchToday(todayKey());
      if (!alive) return;
      setToday({ state: data === null ? 'failed' : 'ready', data });
    })();
    return () => { alive = false; };
  }, [reload]);

  /* 右栏没有交互节点：三个页签在本组件里切，空态 spec 里没有 name 回调。 */

  return h('div', { className: 'dl' },
    h('div', { className: 'dl-app' },
      h(ChatPane, null),
      h('aside', { className: 'dl-ctx' },
        h('header', { className: 'dl-ctx-head' },
          h('div', { className: 'dl-tabs', role: 'tablist', 'aria-label': '上下文' },
            TABS.map((item) => h('button', {
              key: item.id,
              type: 'button',
              role: 'tab',
              className: 'dl-tab',
              'data-active': String(tab === item.id),
              'aria-selected': String(tab === item.id),
              onClick: () => setTab(item.id),
            }, item.label)))),
        h('div', { className: 'dl-ctx-scroll' },
          tab === 'today' ? h(TodayView, { today, onRefresh: () => setReload((value) => value + 1) }) : null,
          tab === 'tasks' ? h(TasksView, null) : null,
          tab === 'whisper' ? h(WhisperView, null) : null))),
    h('style', { 'data-plugin': 'dsh-daily' }, CSS));
}

/* ── 左栏图标 ───────────────────────────────────────────────────────────── */

/* 一枚咖啡杯：杯身、把手、三缕热气。画在 24 格上、描边 2 单位，和同一列
   VIVY 分组表头的扳手一个画法；16px 时落在 1.33px，粗细与相邻图标一致。 */
function DailyIcon(props) {
  const size = props && props.size ? props.size : 16;
  const { createElement: h } = useReact();
  return h('svg', {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  },
  h('path', { d: 'M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1' }),
  h('path', { d: 'M6 2v2' }),
  h('path', { d: 'M10 2v2' }),
  h('path', { d: 'M14 2v2' }));
}

/* ── 注册 ───────────────────────────────────────────────────────────────── */

function apply(ctx) {
  hostCtx = ctx;
  /* 会话服务不写进 `inject`：那样服务一缺，整个插件就停在 pending，用户看到的是
     「日常」从侧栏消失。这里先取一次现成的，迟到的交给 inject 等。 */
  publishSessions(pickupSessions());
  if (typeof ctx.inject === 'function') {
    ctx.inject(['sessions'], (child) => { publishSessions(child.sessions); });
  }

  /* 主面板：点左栏那一行就切到 key 相同的这一页。 */
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'daily' }, DailyPage));
  /* 左栏入口：order -5 落在「相遇」(-10) 与「插件」(0) 之间；
     名字必须在 VIVY 的分组白名单里，否则它会被折进「VIVY心核」。 */
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: 'daily',
    order: -5,
    label: () => '日常',
  }, DailyIcon));
}

    return { apply, inject, name: 'dsh-daily' };
  },
});
