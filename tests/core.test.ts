import test from "node:test"
import assert from "node:assert/strict"
import { allowedFor, defaultSettings, demoProfile, formNumber, normalizeDatabase, site, validateProfile, validateSettings } from "../src/shared/model"
import { createStore } from "../src/shared/store"

test("host matching rejects query/path/suffix/userinfo/HTTP spoofs", () => {
  for (const url of ["https://review.invalid/?next=onlineservices.immigration.govt.nz", "https://review.invalid/onlineservices.immigration.govt.nz", "https://onlineservices.immigration.govt.nz.evil.invalid/", "https://onlineservices.immigration.govt.nz@evil.invalid/", "http://onlineservices.immigration.govt.nz/", "https://onlineservices.immigration.govt.nz:8443/", "javascript:alert(1)", "https://visa.vfsglobal.com/chn/en/fra/login"]) assert.equal(site(url), null, url)
  assert.equal(site("https://onlineservices.immigration.govt.nz/WorkingHoliday/"), "nz")
  assert.equal(site("https://visa.vfsglobal.com/chn/en/aus/login"), "au")
  assert.equal(allowedFor("https://onlineservices.immigration.govt.nz/", "au"), false)
})
test("form ID uses the entire ApplicationId parameter, case insensitive", () => {
  assert.equal(formNumber("https://onlineservices.immigration.govt.nz/?date=20260905&ApplicationID=1234567890"), "1234567890")
  assert.equal(formNumber("https://onlineservices.immigration.govt.nz/12345678"), "")
  assert.equal(formNumber("https://onlineservices.immigration.govt.nz/?ApplicationId=123456x"), "")
})
test("settings validate enums, URLs, groups and MV3 refresh range", () => {
  for (const value of [{ mode: "unknown" }, { country: "xx" }, { "info-group": "8" }, { "auto-refresh-interval": "1000" }, { "auto-refresh-interval": "Infinity" }, { "jump-url": "javascript:alert(1)" }, { "nz-form-number": "12&foo=1" }, { foo: "1" }]) assert.throws(() => validateSettings(value))
  assert.deepEqual(validateSettings({ mode: "off", "auto-refresh-interval": "30000" }), { mode: "off", "auto-refresh-interval": "30000" })
})
test("imports reject invalid shapes, types, dates and prototype keys", () => {
  for (const value of [null, [], "string", { account: 1 }, { password: "x".repeat(513) }, { birth: "2025-02-29" }, { birth: "2026-01-99" }, JSON.parse('{"__proto__":{"polluted":true}}')]) assert.throws(() => validateProfile(value, "nz"))
  assert.deepEqual(validateProfile({ birth: "2024-02-29", personalIDStart: "2020-01-15" }, "nz"), { birth: "2024-02-29", personalIDStart: "2020-01-15" })
  assert.equal(({} as Record<string, unknown>).polluted, undefined)
})
test("partial migration preserves existing profiles and fills missing fields", () => {
  const result = normalizeDatabase({ setting: { mode: "fill" }, au: { 3: { account: "TEST-AU", password: "TEST-PASS" } } })
  assert.equal(result.au["3"].account, "TEST-AU")
  assert.equal(result.au["3"].password, "TEST-PASS")
  assert.equal(result.setting.mode, "fill")
  assert.equal(result.nz["0"].personalIDStart, "")
  assert.equal(result.nz["0"].expire, "")
  assert.equal(Object.keys(result.nz).length, 8)
})
test("serialized updates do not lose simultaneous settings or profile fields", async () => {
  let data: Record<string, unknown> = { setting: defaultSettings }
  const store = createStore({
    get: async () => { await new Promise(resolve => setTimeout(resolve, 3)); return structuredClone(data) },
    set: async values => { await new Promise(resolve => setTimeout(resolve, 3)); data = structuredClone(values) }
  })
  await Promise.all([
    store.update(db => { db.setting.mode = "fill" }),
    store.update(db => { db.setting["teaching-mode"] = "0" }),
    store.update(db => { db.nz["2"].account = "TEST-NZ" }),
    store.update(db => { db.nz["2"].password = "TEST-SECRET" })
  ])
  const result = await store.read()
  assert.equal(result.setting.mode, "fill")
  assert.equal(result.setting["teaching-mode"], "0")
  assert.equal(result.nz["2"].account, "TEST-NZ")
  assert.equal(result.nz["2"].password, "TEST-SECRET")
  await assert.rejects(store.update(() => { throw new Error("Invalid update") }))
  await store.update(db => { db.setting.mode = "off" })
  assert.equal((await store.read()).setting.mode, "off")
})
test("simulation data is synthetic and all generated dates remain valid", () => {
  const profile = demoProfile("nz")
  assert.equal(profile.email, "demo@example.invalid")
  assert.ok(Date.parse(profile.PassportExpire) > Date.now())
  assert.ok(Date.parse(profile.planNZDate) > Date.now())
  validateProfile(profile, "nz")
})
