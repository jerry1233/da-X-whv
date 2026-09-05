import { allowedFor, country, defaultLinks, demoProfile, formNumber, record, site, validGroup, validateProfile, validateSettings, type Context, type Settings } from "./shared/model"
import { createStore } from "./shared/store"
import { migratePrivateStorage, privateStorage } from "./shared/private-storage"

const store = createStore(privateStorage)
const ALARM = "great-x-auto-refresh"
const trustedPages = new Set(["/popup.html", "/info_au.html", "/info_nz.html", "/link_au.html", "/link_nz.html"])
let revision = Date.now()
const ready = (async () => {
  if (typeof chrome.storage.local.setAccessLevel === "function") await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  await migratePrivateStorage()
  await store.update(() => undefined)
})()
const reportError = () => console.error("Great X: background operation failed; no profile data was logged.")
void ready.catch(reportError)

function trustedUI(sender: chrome.runtime.MessageSender) {
  if (sender.id !== chrome.runtime.id || !sender.url) return false
  const url = new URL(sender.url)
  return url.protocol === "chrome-extension:" && url.host === chrome.runtime.id && trustedPages.has(url.pathname)
}
function trustedContent(sender: chrome.runtime.MessageSender) {
  return sender.id === chrome.runtime.id && sender.frameId === 0 && sender.tab?.id !== undefined &&
    !!sender.url && !!site(sender.url) && !!sender.tab.url && site(sender.tab.url) === site(sender.url)
}
async function invalidate() {
  revision++
  for (const tab of await chrome.tabs.query({})) {
    if (tab.id !== undefined && tab.url && site(tab.url)) {
      await chrome.tabs.sendMessage(tab.id, { message: "context changed" }, { frameId: 0 }).catch(() => undefined)
    }
  }
}
function retryEnabled(setting: Settings) {
  return setting.mode === "off" && setting["test-mode"] === "1" && setting["auto-jump"] === "1" && allowedFor(setting["jump-url"], setting.country)
}
async function syncAlarm() {
  await ready
  const { setting } = await store.read()
  if (!retryEnabled(setting)) {
    await chrome.alarms.clear(ALARM)
    await chrome.storage.session.remove("retryTabs")
    return
  }
  const periodInMinutes = Number(setting["auto-refresh-interval"]) / 60000
  const current = await chrome.alarms.get(ALARM)
  if (!current || current.periodInMinutes !== periodInMinutes) await chrome.alarms.create(ALARM, { periodInMinutes })
}
let retryQueue: Promise<unknown> = Promise.resolve()
function withRetryQueue(operation: () => Promise<void>) {
  const result = retryQueue.then(operation)
  retryQueue = result.catch(reportError)
  return result
}
async function removeRetry(id: number) {
  const { retryTabs = {} } = await chrome.storage.session.get("retryTabs")
  delete retryTabs[String(id)]
  await chrome.storage.session.set({ retryTabs })
}
async function handleRequest(request: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  await ready
  if (!record(request) || typeof request.message !== "string") throw new Error("无效消息")
  const ui = trustedUI(sender)
  const content = trustedContent(sender)
  if (!ui && !content) throw new Error("来源不受信任")
  if (request.message === "get ui state" && ui) return store.read()
  if (request.message === "patch settings" && ui) {
    const patch = validateSettings(request.patch)
    await store.update(data => {
      const next = { ...data.setting, ...patch }
      if (patch["info-group"] !== undefined && patch["info-group"] !== data.setting["info-group"]) next["nz-form-number"] = ""
      if (patch.country !== undefined || patch["auto-jump"] !== undefined) next["jump-url"] = defaultLinks[next.country]
      if (next["jump-url"] && !allowedFor(next["jump-url"], next.country)) throw new Error("跳转地址与所选国家不匹配")
      data.setting = next
    })
    await invalidate()
    await syncAlarm()
    return (await store.read()).setting
  }
  if (request.message === "patch profile" && ui) {
    const target = request.country, group = request.group
    if (!country(target) || !validGroup(group)) throw new Error("无效国家或资料组")
    const patch = validateProfile(request.patch, target)
    await store.update(data => { Object.assign(data[target][group], patch) })
    await invalidate()
    return true
  }
  if (request.message === "get context" && content) {
    const { setting, ...profiles } = await store.read()
    if (setting.mode === "off" || !allowedFor(sender.url!, setting.country)) return null
    const simulation = site(sender.url!) === "simulation"
    return { setting, profile: simulation ? demoProfile(setting.country) : profiles[setting.country][setting["info-group"]], revision, simulation } satisfies Context
  }
  if (request.message === "context current" && content) {
    const { setting } = await store.read()
    return request.revision === revision && setting.mode !== "off" && allowedFor(sender.url!, setting.country)
  }
  if (request.message === "set nz form id" && content && site(sender.url!) === "nz") {
    const id = request.id
    if (typeof id !== "string" || !/^\d{1,16}$/.test(id) || request.revision !== revision) return false
    if (typeof request.url !== "string" || site(request.url) !== "nz" || formNumber(request.url) !== id) return false
    return store.update(data => {
      if (data.setting.country !== "nz" || data.setting["manual-nz-form-number"] !== "0" || request.group !== data.setting["info-group"]) return false
      data.setting["nz-form-number"] = id
      return true
    })
  }
  if (request.message === "set page action icon" && content) {
    if (typeof request.title === "string" && request.title.length < 200) await chrome.action.setTitle({ tabId: sender.tab!.id, title: request.title })
    return true
  }
  throw new Error("此来源无权执行该操作")
}
chrome.runtime.onMessage.addListener((request, sender, respond) => {
  handleRequest(request, sender).then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error instanceof Error ? error.message : "操作失败" }))
  return true
})
chrome.commands.onCommand.addListener(command => {
  if (command !== "click-page-cation") return
  void (async () => {
    await ready
    const { setting } = await store.read()
    if (setting.mode === "off") return
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id === undefined || !tab.url || !allowedFor(tab.url, setting.country)) return
    await chrome.tabs.sendMessage(tab.id, { message: "page action clicked" }, { frameId: 0 }).catch(() => undefined)
  })().catch(reportError)
})
chrome.webNavigation.onErrorOccurred.addListener(details => {
  if (details.frameId !== 0 || !site(details.url) || details.error === "net::ERR_ABORTED") return
  void withRetryQueue(async () => {
    await ready
    const { setting } = await store.read()
    if (!retryEnabled(setting) || !allowedFor(details.url, setting.country)) return
    const { retryTabs = {} } = await chrome.storage.session.get("retryTabs")
    retryTabs[String(details.tabId)] = details.url
    await chrome.storage.session.set({ retryTabs })
  })
})
chrome.webNavigation.onBeforeNavigate.addListener(details => {
  if (details.frameId === 0) void withRetryQueue(() => removeRetry(details.tabId))
})
chrome.tabs.onRemoved.addListener(id => { void withRetryQueue(() => removeRetry(id)) })
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== ALARM) return
  void withRetryQueue(async () => {
    await ready
    const { setting } = await store.read()
    if (!retryEnabled(setting)) return
    const { retryTabs = {} } = await chrome.storage.session.get("retryTabs")
    for (const [key, failedUrl] of Object.entries(retryTabs)) {
      const id = Number(key)
      const tab = await chrome.tabs.get(id).catch(() => undefined)
      if (typeof failedUrl !== "string" || !allowedFor(failedUrl, setting.country) || !tab || tab.pendingUrl || tab.url !== failedUrl) { await removeRetry(id); continue }
      await chrome.tabs.update(id, { url: setting["jump-url"] }).catch(() => removeRetry(id))
    }
  })
})
chrome.runtime.onStartup.addListener(() => { void syncAlarm().catch(reportError) })
chrome.runtime.onInstalled.addListener(() => { void syncAlarm().catch(reportError) })
void syncAlarm().catch(reportError)
