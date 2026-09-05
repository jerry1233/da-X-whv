import { send } from "../shared/client"
import type { Database, Settings } from "../shared/model"
export const getState = () => send<Database>({ message: "get ui state" })
export const patchSettings = (patch: Partial<Settings>) => send<Settings>({ message: "patch settings", patch })
export function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing UI element: ${selector}`)
  return found
}
let savedTimer: number | undefined
export function saved() {
  const badge = document.querySelector<HTMLElement>(".saved-badge")
  if (!badge) return
  clearTimeout(savedTimer)
  badge.textContent = "已保存"
  badge.style.transition = ""
  badge.style.opacity = "1"
  savedTimer = window.setTimeout(() => { badge.style.transition = "opacity 3s"; badge.style.opacity = "0" }, 20)
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "操作失败，请重试"
  window.alert(message)
}
export function handle(operation: () => Promise<unknown>) { void operation().catch(failure) }
export function renderButtons(settings: Settings) {
  document.querySelectorAll<HTMLElement>(".setting-button-group").forEach(button => {
    const active = settings[button.dataset.key as keyof Settings] === button.dataset.value
    button.classList.toggle("active", active)
    const input = button.querySelector<HTMLInputElement>("input")
    if (input) input.checked = active
  })
}
export function bindButtons(refresh: () => Promise<void>) {
  document.querySelectorAll<HTMLElement>(".setting-button-group").forEach(button => {
    button.addEventListener("click", () => handle(async () => {
      await patchSettings({ [button.dataset.key!]: button.dataset.value! })
      await refresh()
      saved()
    }))
    button.addEventListener("mouseout", () => button.classList.remove("focus"))
  })
}
export function showField(selector: string, value: string) {
  const input = element<HTMLInputElement | HTMLSelectElement>(selector)
  if (document.activeElement !== input) input.value = value
  input.closest(".bmd-form-group")?.classList.toggle("is-filled", !!input.value)
}
export function watchSettings(refresh: () => Promise<void>) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.setting) handle(refresh)
  })
}
export async function copied(button: HTMLElement, text: string) {
  await navigator.clipboard.writeText(text)
  const previous = button.textContent
  button.textContent = "复制成功"
  button.classList.add("btn-success")
  window.setTimeout(() => { button.textContent = previous; button.classList.remove("btn-success") }, 1000)
}
