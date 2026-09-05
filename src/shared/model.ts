export type Country = "au" | "nz"
export type Profile = Record<string, string>
export type Settings = {
  "info-group": string
  mode: "auto" | "fill" | "off"
  country: Country
  "auto-jump": "0" | "1"
  "jump-url": string
  "teaching-mode": "0" | "1"
  "manual-nz-form-number": "0" | "1"
  "nz-form-number": string
  "test-mode": "0" | "1"
  "auto-refresh-interval": string
  "display-super": "0" | "1"
}
export type Database = { setting: Settings; au: Record<string, Profile>; nz: Record<string, Profile> }
export type Context = { setting: Settings; profile: Profile; revision: number; simulation: boolean }
export const defaultSettings: Settings = {
  "info-group": "0", mode: "auto", country: "au", "auto-jump": "0", "jump-url": "",
  "teaching-mode": "1", "manual-nz-form-number": "0", "nz-form-number": "",
  "test-mode": "0", "auto-refresh-interval": "30000", "display-super": "0"
}
const common: Profile = {
  Passport: "", FamilyName: "", GivenName: "", Gender: "", area: "", phone: "", mobile: "",
  email: "", account: "", password: "", expire: "", birth: "", idNum: ""
}
export const defaults: Record<Country, Profile> = {
  au: { ...common, type: "0", city: "0", nation: "CHN" },
  nz: { ...common, nation: "46", personalIDType: "3", addressStreetNumber: "", addressStreetName: "",
    addressSuburb: "", residentCountry: "46", addressCity: "", personalIDNumber: "", beenInNZDate: "",
    beenInNZ: "", TBCountry: "", personalIDExpire: "", personalIDStart: "", PassportStart: "",
    PassportExpire: "", birthCountry: "46", planNZDate: "" }
}
export const defaultLinks = {
  au: "https://www.vfsglobal.cn/australia/china/schedule_an_appointment.html",
  nz: "https://onlineservices.immigration.govt.nz/"
}
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
}
export function country(value: unknown): value is Country { return value === "au" || value === "nz" }
export function validGroup(value: unknown): value is string { return typeof value === "string" && /^[0-7]$/.test(value) }
export function formNumber(url: string): string {
  try {
    for (const [key, value] of new URL(url).searchParams) {
      if (key.toLowerCase() === "applicationid" && /^\d{1,16}$/.test(value)) return value
    }
  } catch { /* Invalid page URLs are not application IDs. */ }
  return ""
}
export function site(url: string): Country | "simulation" | null {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null
    if (u.hostname === "onlineservices.immigration.govt.nz") return "nz"
    if (u.hostname === "moni.iwhver.com") return "simulation"
    if (["online.vfsglobal.com", "www.vfsvisaonline.com"].includes(u.hostname)) return "au"
    if (u.hostname === "www.vfsglobal.cn" && /^\/australia\/china(?:\/|$)/i.test(u.pathname)) return "au"
    if (u.hostname === "visa.vfsglobal.com" && /^\/chn\/(?:en|zh)\/aus(?:\/|$)/i.test(u.pathname)) return "au"
  } catch { /* Deny malformed and non-HTTPS URLs. */ }
  return null
}
export function allowedFor(url: string, value: Country) {
  const target = site(url)
  return target === value || target === "simulation"
}
export function validateSettings(patch: unknown): Partial<Settings> {
  if (!record(patch)) throw new Error("设置格式不正确")
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(defaultSettings, key) || typeof value !== "string") throw new Error("未知设置或无效类型")
    if (key === "country" ? !country(value) : key === "mode" ? !["auto", "fill", "off"].includes(value) :
      key === "info-group" ? !validGroup(value) : key === "nz-form-number" ? !/^\d{0,16}$/.test(value) :
      key === "jump-url" ? value !== "" && !site(value) : key === "auto-refresh-interval" ?
      !/^\d+$/.test(value) || Number(value) < 30000 || Number(value) > 86400000 : !["0", "1"].includes(value)) {
      throw new Error(key === "auto-refresh-interval" ? "MV3 后台重试间隔需为 30000 至 86400000 毫秒" : "设置值无效；跳转仅支持允许的 HTTPS 站点")
    }
  }
  return patch as Partial<Settings>
}
const dates = new Set(["birth", "expire", "PassportStart", "PassportExpire", "personalIDStart", "personalIDExpire", "beenInNZDate", "planNZDate"])
export function validateProfile(value: unknown, target: Country): Profile {
  if (!record(value)) throw new Error("资料必须是 JSON 对象")
  const result: Profile = {}
  for (const [key, field] of Object.entries(value)) {
    if (!Object.hasOwn(defaults[target], key) || typeof field !== "string" || field.length > 512 || /[\u0000-\u001f]/.test(field)) throw new Error("资料含未知字段、错误类型或过长内容")
    if (dates.has(key) && field && (!/^\d{4}-\d{2}-\d{2}$/.test(field) || !Number.isFinite(Date.parse(field)) || new Date(field).toISOString().slice(0, 10) !== field)) throw new Error("日期格式应为有效的 YYYY-MM-DD")
    result[key] = field
  }
  return result
}
export function normalizeDatabase(raw: Record<string, unknown>): Database {
  const setting = { ...defaultSettings }
  if (record(raw.setting)) for (const [key, value] of Object.entries(raw.setting)) {
    try { Object.assign(setting, validateSettings({ [key]: value })) } catch { /* Keep safe defaults for invalid settings. */ }
  }
  if (setting["jump-url"] && !allowedFor(setting["jump-url"], setting.country)) setting["jump-url"] = ""
  const groups = (name: Country) => Object.fromEntries(Array.from({ length: 8 }, (_, i) => {
    const existing = record(raw[name]) ? raw[name][String(i)] : null
    const profile = { ...defaults[name] }
    if (record(existing)) for (const [key, value] of Object.entries(existing)) {
      if (Object.hasOwn(profile, key) && typeof value === "string") profile[key] = value
    }
    return [String(i), profile]
  }))
  return { setting, au: groups("au"), nz: groups("nz") }
}
export function demoProfile(target: Country): Profile {
  const year = new Date().getFullYear()
  return { ...defaults[target], account: "DEMO-ONLY", password: "DEMO-NotARealPassword1", GivenName: "DEMO", FamilyName: "EXAMPLE",
    Passport: "DEMO00000", Gender: "F", birth: `${year - 25}-01-15`, email: "demo@example.invalid", area: "086",
    phone: "00000000", mobile: "10000000000", expire: `${year + 5}-01-15`, PassportStart: `${year - 1}-01-15`,
    PassportExpire: `${year + 5}-01-15`, personalIDStart: `${year - 1}-01-15`, personalIDExpire: `${year + 5}-01-15`,
    planNZDate: `${year + 1}-01-15`, beenInNZ: "No", TBCountry: "No", addressCity: "EXAMPLE", addressStreetName: "DEMO STREET" }
}
