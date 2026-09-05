type SettingValue = {
  "info-group": string
  mode: "auto" | "fill" | "off" | string
  country: "au" | "nz" | string
  "auto-jump": "0" | "1" | string
  "jump-url": string
  "teaching-mode": "0" | "1" | string
  "manual-nz-form-number": "0" | "1" | string
  "nz-form-number": string
  "test-mode": "0" | "1" | string
  "auto-refresh-interval": string
  "display-super": "0" | "1" | string
}

type StoredInfo = Record<string, string>

const AUTO_REFRESH_ALARM = "great-x-auto-refresh"

let intervalFunctionId: ReturnType<typeof setInterval> | null = null
let settings: SettingValue | null = null

const defaultAuInfo: StoredInfo = {
  type: "0",
  city: "0",
  Passport: "",
  FamilyName: "",
  GivenName: "",
  Gender: "",
  area: "",
  phone: "",
  mobile: "",
  email: "",
  account: "",
  password: "",
  expire: "",
  birth: "",
  idNum: "",
  nation: "CHN"
}

const defaultNzInfo: StoredInfo = {
  Passport: "",
  FamilyName: "",
  GivenName: "",
  Gender: "",
  area: "",
  phone: "",
  mobile: "",
  email: "",
  account: "",
  password: "",
  expire: "2025-08-24",
  birth: "",
  idNum: "",
  nation: "46",
  personalIDType: "3",
  addressStreetNumber: "",
  addressStreetName: "",
  addressSuburb: "",
  residentCountry: "46",
  addressCity: "",
  personalIDNumber: "",
  beenInNZDate: "",
  beenInNZ: "",
  TBCountry: "",
  personalIDExpire: "",
  PassportStart: "",
  PassportExpire: "",
  birthCountry: "46",
  planNZDate: ""
}

const defaultSetting: SettingValue = {
  "info-group": "0",
  mode: "auto",
  country: "au",
  "auto-jump": "0",
  "jump-url": "",
  "teaching-mode": "1",
  "manual-nz-form-number": "0",
  "nz-form-number": "",
  "test-mode": "0",
  "auto-refresh-interval": "1000",
  "display-super": "0"
}

const cloneDefaultGroups = (info: StoredInfo) =>
  Object.fromEntries(Array.from({ length: 8 }, (_, index) => [String(index), { ...info }]))

async function initializeStorage() {
  const values = await chrome.storage.local.get({
    setting: null,
    au: null,
    nz: null
  })

  if (values.setting === null || values.au === null || values.nz === null) {
    await chrome.storage.local.set({
      setting: { ...defaultSetting },
      au: cloneDefaultGroups(defaultAuInfo),
      nz: cloneDefaultGroups(defaultNzInfo)
    })
    settings = { ...defaultSetting }
    return
  }

  settings = values.setting as SettingValue
  syncAutoRefreshTimer()
}

function syncAutoRefreshTimer() {
  if (intervalFunctionId) {
    clearInterval(intervalFunctionId)
    intervalFunctionId = null
  }

  chrome.alarms.clear(AUTO_REFRESH_ALARM)

  if (settings?.["test-mode"] !== "1") {
    return
  }

  const intervalMs = Number.parseInt(settings["auto-refresh-interval"], 10) || 1000
  intervalFunctionId = setInterval(autoRefresh, intervalMs)
  chrome.alarms.create(AUTO_REFRESH_ALARM, {
    periodInMinutes: Math.max(intervalMs / 60000, 0.5)
  })
}

function changePageIcon(tabId: number | undefined, title: string, isShown: boolean) {
  if (tabId === undefined) {
    return
  }

  if (isShown) {
    chrome.action.enable(tabId)
  } else {
    chrome.action.disable(tabId)
  }

  chrome.action.setTitle({ tabId, title })
}

async function storeSettingValueToDB(key: keyof SettingValue, value: string) {
  const result = await chrome.storage.local.get({ setting: null })
  await chrome.storage.local.set({
    setting: {
      ...(result.setting ?? {}),
      [key]: value
    }
  })
}

function isExtensionPage(url = "") {
  return ["info_au.html", "info_nz.html", "link_au.html", "link_nz.html"].some((page) =>
    url.includes(page)
  )
}

async function autoRefresh() {
  if (!settings || settings.mode !== "auto" || settings["auto-jump"] !== "1" || !settings["jump-url"]) {
    return
  }

  const tabs = await chrome.tabs.query({ status: "complete" })

  for (const tab of tabs) {
    try {
      const isWarningPage = tab.favIconUrl === undefined || tab.favIconUrl.includes("icons/warning.svg")

      if (tab.id && isWarningPage && !isExtensionPage(tab.url)) {
        await chrome.tabs.update(tab.id, {
          url: settings["jump-url"]
        })
      }
    } catch (error) {
      console.log(error instanceof Error ? error.message : error)
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  initializeStorage()
})

chrome.runtime.onStartup.addListener(() => {
  initializeStorage()
})

initializeStorage()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Message from the content script: ${request?.message}`)

  if (request?.message === "set page action icon") {
    changePageIcon(sender.tab?.id, request.title, request.isShown)
  }

  if (request?.message === "set setting value") {
    storeSettingValueToDB(request.key, request.value)
  }

  if (request?.message === "set nz form id") {
    chrome.runtime.sendMessage(request).catch(console.log)
  }

  if (request?.message === "inject notification css" && sender.tab?.id !== undefined) {
    chrome.scripting.insertCSS({
      target: { tabId: sender.tab.id },
      files: ["css/notification.css"]
    })
  }

  if (request?.message === "get storage") {
    chrome.storage.local
      .get({
        setting: null,
        au: null,
        nz: null
      })
      .then((storage) => sendResponse({ storage }))

    return true
  }

  return undefined
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "click-page-cation") {
    return
  }

  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
    highlighted: true
  })
  const activeTab = tabs[0]

  if (!activeTab?.id) {
    return
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, { message: "page action clicked" })
  } catch {
    const storage = await chrome.storage.local.get({
      setting: null,
      au: null,
      nz: null
    })

    if (storage.setting?.mode !== "auto" && storage.setting?.["jump-url"]) {
      await chrome.tabs.update(activeTab.id, {
        active: true,
        url: storage.setting["jump-url"]
      })
    }
  }
})

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== "local" || !changes.setting?.newValue) {
    return
  }

  settings = changes.setting.newValue as SettingValue
  syncAutoRefreshTimer()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_REFRESH_ALARM) {
    autoRefresh()
  }
})
