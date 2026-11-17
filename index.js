/**
 * dsh-daily —— 宿主半身。
 *
 * 浏览器半身（`client.js`）负责画；这里只做一件宿主才有的事：**把 worker 写下的
 * 「今天」交给右栏**。
 *
 * 通道很简单，故意不做数据库：worker 把当天的事写成结构化数据，右栏问
 * `GET /dsh-daily/api/today?date=…` 拿回来渲染。没有文件就是空数组，不是错误。
 *
 * 两条链路并存（2026-11-15 深夜，主人「先两条链路保留一下」）：
 * 1. **结构化（主路）**：`$DSH_HOME/today/<YYYY-MM-DD>.json`，形如
 *    `{"cards":[{"title":"…","body":"…","nodes":[…]}]}`。`nodes` 可选，是一棵
 *    genui spec 节点数组（左栏那套渲染器直接画）；日期不进卡里——它由文件名与右栏的
 *    分区头承担。宿主只校验这棵树的大小与形状，不替 worker 排版。
 * 2. **整页 HTML（旧路，未删）**：`$DSH_HOME/today/<YYYY-MM-DD>.html`，原样下发，
 *    右栏在 `FREE_HTML_UI=true` 时塞进沙箱 iframe。两条路的文件可以同时存在，
 *    响应里两个字段都带上，切换只动右栏那个常量。
 *
 * 历史：扫 `today/` 里所有 `<日期>.json`，只留比今天早、且真有卡的日期，倒序
 * 最多 `HISTORY_LIMIT` 天。没卡的日子整块不出现，右栏也就不画那个分区头。
 *
 * 路由与校验照 `dsh-superagent-reset` 的既有写法：只认本机 host、非 GET 要求同源、
 * 再过一道 `connection.requestRejection`。
 * @module dsh-daily
 */

/** Cordis 插件名。 */
export const name = 'dsh-daily'

/** 浏览器半身由 bundle 的 client 半边装载；宿主这里不等任何服务。 */
export const inject = []

/** 路由前缀。客户端与它写死同一个常量。 */
const API_PREFIX = '/dsh-daily/api'

/** today 围栏的文件目录（相对 `$DSH_HOME`）。 */
const TODAY_DIR = 'today'

/** 单页上限：超过就拒，别让一个 10 MB 的页面把右栏拖死。 */
const MAX_BYTES = 512 * 1024

/** 历史最多往回带这么多天：只为封顶一次请求的体积与目录 IO，不是产品上限。 */
const HISTORY_LIMIT = 14

/** 一天最多这么多张卡；标题与正文各自截断（与 genui 字符串限额同档）。 */
const MAX_CARDS = 50
const MAX_TITLE = 200
const MAX_BODY = 2000
/** 一张卡的 `nodes` 是 genui spec：节点数、嵌套层数、单串长度都封顶。 */
const MAX_NODES = 40
const MAX_NODE_DEPTH = 6

const DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.json$/

function send(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

function failure(res, status, message) {
  send(res, status, { ok: false, message })
}

function allowedHost(host) {
  const value = String(host ?? '').toLowerCase()
  return /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(value)
}

function sameOrigin(req) {
  if (req.headers.origin === undefined) return true
  try {
    return new URL(req.headers.origin).host.toLowerCase() === String(req.headers.host).toLowerCase()
  } catch {
    return false
  }
}

function home() {
  const value = process.env.DSH_HOME
  return typeof value === 'string' && value !== '' ? value : null
}

/**
 * 读一个「大小有上限的普通文件」：不存在、不是文件、太大都是 null。
 * 两条链路共用这一道，别让一个坏文件把请求拖住。
 */
async function readSmall(file) {
  const { readFile, stat } = await import('node:fs/promises')
  try {
    const info = await stat(file)
    if (!info.isFile() || info.size > MAX_BYTES) return null
    return await readFile(file, 'utf8')
  } catch {
    return null
  }
}

/**
 * `nodes` 的结构校验：必须是数组；带 `type` 的节点总数 ≤ `MAX_NODES`；节点
 * 嵌套 ≤ `MAX_NODE_DEPTH` 层（`nodes` 里的节点算第 1 层）；树里任意字符串
 * ≤ `MAX_BODY` 字。未知节点类型不在这里拦——渲染器会丢它、兄弟照常。
 *
 * 这里只守「整页不能炸」这条线：任何一条超限，整张卡丢掉，别的卡不受影响。
 * @param {unknown[]} nodes 已确认是数组的 `nodes`。
 * @returns {boolean} 这棵树能不能交给右栏。
 */
function nodesFit(nodes) {
  let count = 0
  let fit = true
  const walk = (value, depth) => {
    if (!fit) return
    if (typeof value === 'string') {
      if (value.length > MAX_BODY) fit = false
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth)
      return
    }
    if (value === null || typeof value !== 'object') return
    const isNode = typeof value.type === 'string'
    if (isNode) {
      count += 1
      if (count > MAX_NODES || depth > MAX_NODE_DEPTH) {
        fit = false
        return
      }
    }
    for (const key of Object.keys(value)) walk(value[key], depth + (isNode ? 1 : 0))
  }
  for (const node of nodes) walk(node, 1)
  return fit
}

/**
 * 把一份 `{"cards":[{"title","body","nodes"}]}` 洗成能交给右栏的数组。
 *
 * 坏 JSON、不是对象、`cards` 不是数组 —— 一律当「没有卡」，不是故障；单张卡
 * 缺标题、或既没有正文也没有内容节点，只丢它自己。`nodes` 不是数组、或超过
 * 节点/层数/单串上限时，整张卡丢掉（`nodesFit`）——宁可少一张卡，也不让一棵
 * 坏树把整页拖死。日期不在这里：它由文件名与右栏的分区头承担。
 * @param {string} text 文件正文。
 * @returns {{title: string, body?: string, nodes?: unknown[]}[]}
 */
function parseCards(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return []
  const rows = Array.isArray(parsed.cards) ? parsed.cards : []
  const cards = []
  for (const row of rows.slice(0, MAX_CARDS)) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const body = typeof row.body === 'string' ? row.body.trim() : ''
    if (title === '') continue
    let nodes
    if (row.nodes !== undefined) {
      if (!Array.isArray(row.nodes) || !nodesFit(row.nodes)) continue
      if (row.nodes.length > 0) nodes = row.nodes
    }
    if (body === '' && nodes === undefined) continue /* 没有内容可画：半张卡不画 */
    const card = { title: title.slice(0, MAX_TITLE) }
    if (body !== '') card.body = body.slice(0, MAX_BODY)
    if (nodes !== undefined) card.nodes = nodes
    cards.push(card)
  }
  return cards
}

/**
 * 读某天的结构化卡。
 * @returns 卡片数组；没有文件、坏 JSON、坏形状都是空数组。
 */
async function readCards(root, date) {
  if (!DATE.test(date)) return []
  const { join, basename } = await import('node:path')
  const text = await readSmall(join(root, TODAY_DIR, basename(date) + '.json'))
  return text === null ? [] : parseCards(text)
}

/**
 * 读某天的整页 HTML（旧链路）。只认 `today/<date>.html`：日期先用正则卡住，
 * 再 `basename` 兜一次，路径穿不出去。
 * @returns 文件内容；文件不存在或读不了返回 null。
 */
async function readToday(root, date) {
  if (!DATE.test(date)) return null
  const { join, basename } = await import('node:path')
  return await readSmall(join(root, TODAY_DIR, basename(date) + '.html'))
}

/**
 * 历史：扫 `today/` 里的 `<日期>.json`，只留比今天早、且真有卡的日期。
 * 日期是零填充的，字符串比较就是日历序；倒序取前 `HISTORY_LIMIT` 天。
 * @param {string} today 今天的 `YYYY-MM-DD`，它自己不算历史。
 */
async function listHistory(root, today) {
  const { readdir } = await import('node:fs/promises')
  const { join } = await import('node:path')
  let names
  try {
    names = await readdir(join(root, TODAY_DIR))
  } catch {
    return []
  }
  const days = []
  for (const name of names) {
    const match = DAY_FILE.exec(name)
    if (match === null || match[1] >= today) continue
    days.push(match[1])
  }
  days.sort((left, right) => (left < right ? 1 : -1))
  const history = []
  for (const date of days) {
    if (history.length >= HISTORY_LIMIT) break
    const cards = await readCards(root, date)
    if (cards.length > 0) history.push({ date, cards })
  }
  return history
}

/**
 * 挂上「今天的界面」接口。
 * @param ctx - Cordis 上下文。
 */
export function apply(ctx) {
  const logger = ctx.logger('daily')
  ctx.inject(['webServer', 'connection'], scope => {
    scope.effect(() => scope.get('webServer').register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: async (req, res) => {
        if (!allowedHost(req.headers.host)) return failure(res, 403, '只接受本机访问')
        if (req.method !== 'GET' && !sameOrigin(req)) return failure(res, 403, '跨站请求被拒绝')

        const connection = scope.get('connection')
        const rejection = typeof connection?.requestRejection === 'function' ? connection.requestRejection(req) : undefined
        if (rejection !== undefined && rejection !== null && rejection !== false) {
          return failure(res, typeof rejection === 'number' ? rejection : 403, '会话未通过验证')
        }

        const root = home()
        if (root === null) return failure(res, 503, 'DSH_HOME 未设置，找不到 today 目录')

        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        try {
          if (url.pathname === `${API_PREFIX}/today` && req.method === 'GET') {
            const date = String(url.searchParams.get('date') ?? '')
            if (!DATE.test(date)) return failure(res, 400, 'date 要写成 YYYY-MM-DD')
            /* 三个都在同一天目录里读，互不阻塞；没有内容就是空，不当成错误刷日志。 */
            const [cards, html, history] = await Promise.all([
              readCards(root, date),
              readToday(root, date),
              listHistory(root, date),
            ])
            send(res, 200, { ok: true, date, cards, html, history })
            return
          }
          failure(res, 404, '没有这个操作')
        } catch (error) {
          logger.warn(`daily api failed: ${error?.message ?? error}`)
          failure(res, 500, String(error?.message ?? error))
        }
      },
    }), 'daily: today api')
  })
}
