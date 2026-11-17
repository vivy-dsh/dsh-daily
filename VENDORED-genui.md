# 右栏里的 genui 子集：从哪来、留了什么、改了什么

「日常」页右栏（Today / 任务 / 悄悄话）的内容现在不是手写 DOM，而是
`dsh-ui` spec 树，由 `client.js` 里一份 **vendored 的最小 genui 渲染器**画出来。
这个文件记录那份代码的来源、裁剪范围、与上游的差异，以及怎么再同步。

## 来源

| 项 | 值 |
| --- | --- |
| 上游仓 | <https://github.com/omdsh-dev/dsh-genui>（npm `@changfenhuang/dsh-genui`） |
| 提交 | `33576039f27a4f62eb60d4307902ee65252eded6`（v0.16.0，2026-11-13） |
| 许可 | MIT，Copyright (c) 2026 dsh-external |
| 本地只读克隆 | `.workspace/genui`（**不要改它**，改的是 `plugins/dsh-daily/client.js`） |
| 参考的上游文件 | `src/client/spec.ts`、`src/client/genui-runtime/limits.ts`、`src/client/guard.ts`、`src/client/blocks/render-node.tsx`、`basic.tsx`、`forms.tsx`、`segmented-control.tsx`、`image.tsx` |

MIT 许可要求保留版权与许可声明，所以 `client.js` 里那段
`/* ── genui dsh-ui spec：vendored 子集 ── */` 的抬头写明了仓库、commit、许可与版权。
下面是上游许可原文（保留）：

```
MIT License

Copyright (c) 2026 dsh-external

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 为什么要 vendor，而不是装包

`client.js` 由宿主的 `window.__ModuleLoader__.load({ factory: (require) => … })`
装载：工厂里只有 `require('react')` 这类外部模块，**没有相对模块解析，也没有构建
步骤**。装 `@changfenhuang/dsh-genui` 只能拿到它的 `lib/client.js`（一整份包含 60 种
节点、图表、3D、地图的 bundle），既超出右栏所需，也没法只取其中几个节点函数。
所以只能把用到的部分抄进同一个文件；代价是文件变长（约 1640 行），收益是无新依赖、
无构建、与宿主装载方式不冲突。

## 保留了哪些节点（19 种）

| 节点 | 字段（与上游一致的部分） | 在右栏的用途 |
| --- | --- | --- |
| `card` | `title` `eyebrow` `tone` `accent` `flat` `items` | 每一块内容（简报、信号、任务、占位说明…） |
| `col` | `gap` `width` `items` | 列表里的竖向小盒 |
| `row` | `wrap` `spacer` `justify` `items` | 标题 + 角标、按钮排 |
| `grid` | `cols` `items`（子节点 `span`） | 身体信号 2×2、快速打开 2×N |
| `text` | `content` `size` `tone` `align` `mono` `center` | 所有文字，`size` = display/h1/h2/h3/body/muted/caption |
| `badge` | `label` `tone` | 「示例」「进行中」「待确认」「明天」等角标 |
| `stat` | `label` `value` `delta` `spark` `size` | 身体信号、天气温度（`size:"hero"`） |
| `hero` | `title` `subtitle` `value` `label` `delta` `spark` `tone` | 预留（右栏没有用，渲染器支持） |
| `progress` | `value`（0–100）`label` `valueLabel` `variant` `target` | 任务/进行中的进度条与环 |
| `divider` | `label` | 预留 |
| `list` | `items`: 字符串 / `{title,desc,icon}` / 节点 | 安排、清单 |
| `keyvalue` | `pairs: [{key,value}]` | 天气的体感/风/湿度 |
| `callout` | `tone` `title` `content` | 预留（渲染器支持） |
| `image` | `src` `alt` `caption` | 每日推荐的示例配图（本地 data URI） |
| `avatar` | `name` `color` | 预留 |
| `button` | `label` `tone` `full` `small` `icon` `name` | 新建任务、查看、打开日历、批准调整、忽略… |
| `switch` | `label` `checked` `name` | 预留（能力页已删，右栏现在没有开关） |
| `segmented-control` | `options` `value` `label` `name` | 任务页筛选 |
| `spacer` | — | 把右侧内容顶到行尾 |

## 删掉了哪些（上游 60 种里的其余 41 种）

表单与输入：`input` `select` `date-picker` `checkbox` `radio` `slider` `textarea`
`submit`。

媒体与图：`video` `audio` `svg` `icon` `mermaid` `scene3d` `map` `image-group`
`carousel` `compare` `diagram` `echart` `chart` `plot` `table` `blocks`。

其它：`link` `tabs` `steps` `timeline` `file-tree` `breadcrumb` `accordion` `copy`
`diff` `json` `code` `quiz` `choices` `popover` `entity-card` `editor` `arrow`。

（8 + 16 + 17 = 41，加上保留的 19 种正好是上游的 60 种。）

一并删掉的上游机制：alias 归一化（`normalize.ts`）、`computed` 计算字段、
`when` / `enableWhen` 条件渲染、`onAction` 动作回路、i18n（`t()` 文案表）、
CSS module、流式增补（`append`/`panel`）、图表/地图/3D 的独立限额。
右栏是静态内容 + 一个本地交互（任务筛选），这些机制一个都用不上。

## 与上游的差异（魔改点）

1. **只认 19 种类型**。未知名、缺必填字段、超深、超预算的节点只丢自己，
   兄弟照常渲染；上游也是这个策略，但它的类型表是 60 种。
   `stack` 例外：模型常把竖排容器写成 `stack`（上游没有这个类型，更像 `col`），
   清洗时当 `col` 的别名处理，`gap` 保留，不因为外层名字不认识就把整条围栏退回原文。
2. **`validateSpec` 是重写的**，只保留右栏需要的限额：
   - `maxDepth: 8`（超过的节点丢，装不下东西的容器跟着消失——与上游一致）；
   - `maxNodes: 200`（预算见底后，后面的兄弟整段省略）；
   - `maxString: 2000`（所有字符串截断）；
   - `maxGridCols: 12`、`maxListItems: 50`、`maxKeyValuePairs: 24`、`maxOptions: 50`；
   - `progress.value` 夹到 0–100，`spec.gap` 夹到 0–40，`grid.cols` 夹到 1–12；
   - `image.src` 只放行 `http(s)://`、相对路径、`data:image/`；
   - `accent` / `avatar.color` 只放行 `#rgb`–`#rrggbbaa` 形式的字面色。
   上游的 `guard.ts` 有 2700 行、按 60 种类型逐字段校验；这里按 19 种重写了一遍。
3. **交互没有回调语义**。上游把 `switch` / `segmented-control` / `button` 的点击交给
   `onAction` 回给模型；这里多一个 **`name` 字段**，插件按名字传 handlers：
   `handlers = { switch(name, next), segmented(name, value), button(name) }`。
   右栏只用了 `segmented`（任务筛选）；悄悄话占位页连 handlers 都不传。没有 handler 的按钮照旧可点，点击没有动作——
   原型里的按钮本来就没有动作，上游会渲染成 `disabled`，这里不这么做（视觉一致优先）。
4. **`icon` 字段换了语义**。上游 `button.icon` 是图标名/字形的字符串，由它的
   `icon` 节点体系解析；这里 `text` / `stat` / `button` / `list` 项的 `icon` 认的是本文件
   开头那张 `ICON` 表（内联 SVG path），渲染成 `<span class="dl-g-icon">`。
   所以把一份上游 spec 直接搬进来时，`icon` 值可能一个都匹配不上（会安静地不画图标）。
5. **`progress.value` 按 0–100 的百分比**。上游 `spec.ts` 只写 `value: number`，
   而 `render-node.tsx` 里 `Math.min(100, node.value)` 再当 `%` 用——也就是它本来就是
   0–100，不是 0–1。这里跟渲染器走。
6. **样式是 `.dl-g-*`**，直接写在本文件的 `CSS` 模板串里，只用 `--dl-*` token
   （纸色、墨色、铅笔线、`--dl-grad`），不引 CSS module、不引外部字体。
   上游的 `.module.css` 一个都没抄。
7. **没有 i18n**：文案全是中文硬编码（这个插件本来就只有中文）。
8. **`image` 没有加载失败态**（上游有 `onError` + 错误提示）；坏图会显示 alt。
9. **`switch` 的 `label` 只做无障碍名**（`.dl-g-sr-only` + `aria-label`），可见标题由
   卡片里的 `text` 提供——否则同一行会重复一遍标题。上游把 label 画在开关左边。

## 右栏的 spec 数据在哪

同一份 `client.js`：

| 位置 | 内容 |
| --- | --- |
| `DAILY_CARDS` | Today 页，`GenuiSpec[]`：天气示例卡、推荐示例卡、晨间简报、身体信号、进行中、安排、待你确认、运行中、旅行、快速打开 |
| `taskCards(filter)` | 任务页：标题行 + `segmented-control`（`name: 'taskFilter'`）+ 按状态过滤的卡片 + 提示 |
| `WHISPER_CARDS` | 悄悄话页：一张占位卡（「这一页还没有做」+ 为什么现在不做的说明） |


两张示例卡（今天天气、每日推荐）的数据是**静态 demo**：不是真实天气、不是真实推荐，
配图是一段内联 SVG 的 data URI，不联网。

## 左栏：assistant 正文里的 dsh-ui 围栏（2026-11-15 深夜）

同一份渲染器现在也画**左栏气泡里的 `dsh-ui` 围栏**。理由：genui 浏览器半边只接管
DSH 聊天通道自己渲染的 DOM（`.genui-dom-fence`），看不到本插件这棵 React 树；它唯一
的宿主嵌入出口 `./embed` 指向未编译的 `src/client/embed.ts`（要打包器、React 18、CSS
Modules），而本文件没有构建步骤。所以复用这份 vendored 渲染器，不跨包引内部实现。

分段规则（与 html 围栏同一套 code-fence 语义，实现在 `splitDshUiFences`）：

- 一条气泡可有多段围栏，每段各成一张卡，段间文字照常成段；
- 语言标记只认 `dsh-ui`（大小写不敏感、吸收尾部手滑标点如 `> `），收尾必须是单独一行的
  ```（与宿主 markdown 一致）；
- 没闭合的围栏按普通文字整段留下，后面的正文一个字不吞；
- 围栏正文 `JSON.parse` 失败、不是对象、或清洗后一个能画的节点都不剩 → **降级成原文**
  （当文字摆出来），不许整块消失；
- 只写了一个组件根的 spec（`{"type":"card",...}`）按上游 `wrapSingleComponentRoot` 包成
  `{ items: [根] }`。

为左栏补的七个节点：`table`（columns/rows/types，num/delta 右对齐；排序、筛选、导出、
详情不实现）、`chart`（`bars` 横条 / `line` 折线 / `donut` 环形，**只画 `data` 单序列**；
`series` 多序列与堆叠整节点丢掉）、`steps`、`timeline`、`code`、`json`、`link`
（只放行 `http(s)` 与 `mailto`，别的协议当文字）。

仍然**不支持**、在清洗阶段整节点丢掉的：表单控件（input/select/checkbox/radio/switch 之外的
editor/date-picker/slider/submit/quiz/choices）、`tabs`/`accordion`/`carousel`/`copy`/`popover`、
`echart`/`plot`/`mermaid`/`svg`/`diagram`/`scene3d`、`audio`/`video`、`image-group`/`compare`、
`diff`、`file-tree`、`breadcrumb`、`arrow`、`blocks`、`icon`、`entity-card`。
`button`/`switch`/`segmented-control` 会画出来但**没有动作**：`[genui-action]` 回路只在
DSH 聊天通道里有，左栏这棵树不接（点了不发消息、不改会话）。

限额：`GENUI_LIMITS` 新增 `maxTableColumns: 12`、`maxTableRows: 50`、`maxChartPoints: 60`、
`maxCode: 4000`；其余（深度 8、节点 200、字符串 2000）沿用。

回归：`node --test tests/daily-client.test.mjs` 里新增的 7 条（分段、坏 JSON、未闭合、
多段、七个新节点）。

## 限额是怎么实现的

`validateSpec` 只做一次深度优先遍历：`cleanSpecNode` 先查深度与节点预算（预算在
`{ left }` 里递减），再按类型跑 `GENUI_NODE_REPAIR[type]`，容器用
`cleanSpecChildren` 递归。任何一步返回 `null` 就只丢这一个节点。

`renderSpec` 渲染前**再**过一遍 `validateSpec`（右栏的调用方不必自己记得清洗），
`renderSpecNode` 兜底：未知类型返回 `null`、深度超限返回 `null`。

## 怎么再同步

1. 在 `.workspace/genui` 里 `git fetch`、checkout 到目标 commit（**只读**，别提交）；
2. 读 `src/client/genui-runtime/limits.ts`：限额变了就改 `GENUI_LIMITS`；
3. 读 `src/client/spec.ts` 对应节点的 interface：字段改名/新增就改 `GENUI_NODE_REPAIR`
   里那一条 + `renderSpecNode` 的 `case`；
4. 读 `src/client/blocks/render-node.tsx` 的对应 `case`：确认渲染语义（类名、顺序、
   `aria-*`）没变，变了就跟进 `.dl-g-*` 与 `CSS`；
5. 跑 `node --test tests/daily-client.test.mjs` 和
   `node .artifacts/dsh-daily-check/render3.mjs`（后者是 jsdom + 真 React 的三页冒烟）；
6. 更新本文件顶部的 commit 与「与上游的差异」。
