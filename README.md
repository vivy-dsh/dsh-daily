# dsh-daily

DIVA 的「日常」工作台：左栏连接 Superagent 主会话，右栏提供 Today、任务、悄悄话三个页签。插件使用宿主的 React 与 ModuleLoader，不需要单独构建。

## 当前行为

- 左栏显示主会话消息、发送输入并显示工具过程；「新建聊天」只折叠当前历史，不创建另一条模型会话。真正初始化主会话由独立插件 `dsh-superagent-reset` 负责。
- 消息里的 `dsh-ui` 围栏使用本地 genui 子集渲染，其余文字支持 Markdown。`FREE_HTML_UI=false`，自由 HTML 围栏保留为文字。
- Today 从 `$DSH_HOME/today/<YYYY-MM-DD>.json` 读取卡片，并按日期展示历史；无数据时显示空态。
- 任务页目前没有真实任务数据源，显示空态；悄悄话保留占位内容。不会提供演示天气、推荐或虚构任务。
- 页面里的 genui 子集用于展示；卡片按钮没有调用宿主动作的通道。

## 今日卡文件

```json
{
  "cards": [
    {
      "title": "工作结果",
      "body": "已完成的变化与验证。",
      "nodes": [{ "type": "badge", "label": "已验证" }]
    }
  ]
}
```

卡片需要标题，可带正文或 `nodes`。旧的标题加正文格式继续有效。`nodes` 最多 40 个节点、6 层，每个字符串最多 2000 字符；不合规的树会使整张卡被丢弃。未知节点类型交给渲染器处理。

宿主同时保留旧的 `.html` 读取接口，但自由 HTML 开关关闭时不会把整页 HTML 渲成 iframe。JSON 是当前主路径。

## 接线与文件

在 diva-dsh 中，本插件是独立 Git 子模块，`scripts/lib/component-setup.mjs` 已登记包名。停服后运行 `npm run setup:components` 注册，再启动宿主；genui 的工具与教学来自第三方包，首次安装还需运行 `npm run setup:third-party`。

| 文件 | 用途 |
| --- | --- |
| `index.js` | 今日卡与历史数据的宿主路由、日期及内容校验 |
| `client.js` | 工作台、消息显示、Markdown 与 genui 子集渲染 |
| `cordis.patch.yml` | bundle 注册 |
| `VENDORED-genui.md` | genui 来源、版权、MIT 许可全文与同步说明 |

客户端改动需要刷新页面，宿主路由改动需要重启。genui 子集的许可与来源说明必须随源码分发。

## 验证

在 diva-dsh 根目录运行：

```powershell
node --test tests/daily-client.test.mjs tests/daily-today.test.mjs
```

这些测试覆盖渲染、卡片校验、旧格式兼容与路由边界；真实宿主重启、窄窗显示和 worker 自动产出链路仍需运行期验收。
