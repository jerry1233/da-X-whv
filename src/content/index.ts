import { send } from "../shared/client"
import { allowedFor, formNumber, site, type Context } from "../shared/model"
import { notify } from "./notifications"
import { runEngine } from "./legacy-engine"

let generation = 0
let active: AbortController | undefined
function cancel() { generation++; active?.abort(); active = undefined }

async function run(manual: boolean) {
  cancel()
  const currentGeneration = generation
  const context = await send<Context | null>({ message: "get context" })
  if (currentGeneration !== generation || !context || context.setting.mode === "off" || !allowedFor(location.href, context.setting.country)) return
  active = new AbortController()
  const signal = active.signal
  const pageURL = location.href
  const valid = () => !signal.aborted && generation === currentGeneration && location.href === pageURL
  const current = async () => valid() && await send<boolean>({ message: "context current", revision: context.revision }) && valid()
  const polls = new Set<number>()
  const clearPoll = (id: number) => { window.clearInterval(id); polls.delete(id) }
  signal.addEventListener("abort", () => { for (const id of polls) clearPoll(id) }, { once: true })
  const poll = (callback: () => void, interval: number) => {
    const started = Date.now()
    let busy = false
    const id = window.setInterval(async () => {
      if (busy) return
      busy = true
      try {
        if (Date.now() - started > 15000) { clearPoll(id); if (valid()) notify("warning", "<b>大X:</b> 等待表单超时，请检查页面后重试"); return }
        if (!await current()) { clearPoll(id); return }
        callback()
      } catch { clearPoll(id); if (valid()) notify("error", "<b>大X:</b> 页面已变化，请检查后重试") }
      finally { busy = false }
    }, Math.max(interval, 100))
    polls.add(id)
    return id
  }
  if (!await current()) return
  if (context.simulation) notify("warning", "<b>大X:</b> 模拟站点仅使用虚构示例资料，不读取真实账号和护照")
  runEngine(context, {
    manual, poll, clearPoll, notify,
    setTitle: (title: string) => { void send({ message: "set page action icon", title }).catch(() => undefined) },
    navigate: (url: string) => {
      if (valid() && allowedFor(url, context.setting.country) && url !== location.href) location.assign(url)
    },
    reload: () => {
      const timer = window.setTimeout(() => {
        void current().then(authorized => { if (authorized) location.reload() }).catch(() => undefined)
      }, Number(context.setting["auto-refresh-interval"]))
      signal.addEventListener("abort", () => clearTimeout(timer), { once: true })
    },
    updateForm: (url: string) => {
      const id = formNumber(url)
      if (!id || context.simulation || !valid() || context.setting["manual-nz-form-number"] !== "0" || context.setting["nz-form-number"] === id) return
      void send<boolean>({ message: "set nz form id", id, url, group: context.setting["info-group"], revision: context.revision }).then(saved => {
        if (saved && valid()) { context.setting["nz-form-number"] = id; notify("success", `<b>大X:</b> 探测到表格号为 ${id}，已更新到快捷链接工具。`) }
      }).catch(() => undefined)
    }
  })
}
if (window.top === window && site(location.href)) {
  chrome.runtime.onMessage.addListener((request, sender) => {
    if (sender.id !== chrome.runtime.id) return
    if (request?.message === "context changed") cancel()
    if (request?.message === "page action clicked") void run(true).catch(() => notify("error", "<b>大X:</b> 无法读取设置，请重新加载扩展"))
  })
  window.addEventListener("pagehide", cancel)
  window.addEventListener("popstate", cancel)
  const start = () => { void run(false).catch(() => undefined) }
  if (document.readyState === "complete") start()
  else window.addEventListener("load", start, { once: true })
}
