import { send } from "../shared/client"
import { defaults, demoProfile, validateProfile, type Country, type Profile } from "../shared/model"
import { element, failure, getState, handle, saved, showField } from "./common"

const target: Country = location.pathname.endsWith("info_nz.html") ? "nz" : "au"
let group: string
const ready = getState().then(state => {
  group = state.setting["info-group"]
  element("#info").textContent = `您正在填写${target === "au" ? "澳洲" : "新西兰"}个人信息${Number(group) + 1}`
  render(state[target][group])
})
void ready.catch(failure)
function render(profile: Profile) {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".form-control[data-key]").forEach(input => showField(`#${input.id}`, profile[input.dataset.key!] ?? ""))
}
let pending: Promise<unknown> = ready
function save(patch: Profile) {
  const result = pending.catch(() => undefined).then(async () => {
    await ready
    await send({ message: "patch profile", country: target, group, patch: validateProfile(patch, target) })
    saved()
  })
  pending = result
  return result
}
document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".form-control[data-key]").forEach(input => {
  // Persist as the user edits, including when an editor window is closed without blur.
  input.addEventListener(input instanceof HTMLSelectElement ? "change" : "input", () => handle(() => save({ [input.dataset.key!]: input.value })))
})
element("#hidden-export-info").addEventListener("click", () => handle(async () => {
  await pending
  const state = await getState()
  await navigator.clipboard.writeText(JSON.stringify(state[target][group]))
  const button = element("#hidden-export-info")
  button.style.background = "#e0ffe3"
  window.setTimeout(() => { button.style.background = "" }, 100)
}))
element("#hidden-import-info").addEventListener("click", () => handle(async () => {
  const text = await navigator.clipboard.readText()
  if (text.length > 32768) throw new Error("资料文件过大")
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error("剪贴板内容不是有效 JSON") }
  await save(validateProfile(value, target))
  render((await getState())[target][group])
}))
element("#generate-random-info").addEventListener("click", () => handle(async () => {
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
  const example = demoProfile(target)
  const profile = Object.fromEntries(Object.keys(defaults[target]).map(key => [key, example[key] ?? ""]))
  profile.account = `demo-${suffix}`
  profile.email = `demo-${suffix}@example.invalid`
  await save(profile)
  render((await getState())[target][group])
}))
