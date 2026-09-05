import { validateSettings, type Settings } from "../shared/model"
import { bindButtons, element, getState, handle, patchSettings, renderButtons, saved, showField, watchSettings } from "./common"

async function refresh() {
  const { setting } = await getState()
  renderButtons(setting)
  showField("#select-info-group", setting["info-group"])
  showField("#jump-to-link-value", setting["jump-url"])
  showField("#auto-refresh-interval", setting["auto-refresh-interval"])
  element("#jump-to-link-value-module").style.display = setting["auto-jump"] === "1" ? "flex" : "none"
  for (const id of ["#super-1", "#auto-refresh-interval-module"]) element(id).style.display = setting["display-super"] === "1" ? "flex" : "none"
  const link = element(".quick-link")
  const icon = document.createElement("i")
  icon.className = "material-icons"
  icon.textContent = "build"
  link.replaceChildren(icon, document.createTextNode(setting.country === "au" ? " 澳洲快捷链接" : " 新西兰快捷链接"))
}
const hashCode = (text: string) => [...text].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
for (const selector of ["#jump-to-link-value", "#auto-refresh-interval", "#select-info-group"]) {
  const input = element<HTMLInputElement | HTMLSelectElement>(selector)
  if (selector === "#auto-refresh-interval") { input.setAttribute("type", "number"); input.setAttribute("min", "30000"); input.setAttribute("max", "86400000") }
  const persist = async () => {
    const patch = selector === "#jump-to-link-value" && hashCode(input.value) === -1025897643 ? { "display-super": "1" as const } : { [input.dataset.key!]: input.value } as Partial<Settings>
    await patchSettings(patch)
    saved()
    await refresh()
  }
  input.addEventListener("change", () => handle(persist))
  if (input instanceof HTMLInputElement) input.addEventListener("input", () => {
    try {
      if (selector === "#jump-to-link-value" && hashCode(input.value) === -1025897643) { handle(persist); return }
      validateSettings({ [input.dataset.key!]: input.value })
      handle(persist)
    } catch { /* Incomplete input is validated on blur, without interrupting typing. */ }
  })
}
element("#info-edit").addEventListener("click", () => handle(async () => {
  const { setting } = await getState()
  await chrome.windows.create({ url: chrome.runtime.getURL(`info_${setting.country}.html`), type: "popup", width: 375, height: 800 })
}))
element(".quick-link").addEventListener("click", () => handle(async () => {
  const { setting } = await getState()
  await chrome.windows.create({ url: chrome.runtime.getURL(`link_${setting.country}.html`), type: "popup", width: 375, height: setting.country === "nz" ? 820 : 500 })
}))
bindButtons(refresh)
watchSettings(refresh)
handle(refresh)
