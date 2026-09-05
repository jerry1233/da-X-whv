import { defaultLinks } from "../shared/model"
import { bindButtons, copied, element, getState, handle, patchSettings, renderButtons, saved, showField, watchSettings } from "./common"
const isNZ = location.pathname.endsWith("link_nz.html")
let number = ""
const staticLinks: Record<string, string> = isNZ ? {
  loginPage: defaultLinks.nz,
  WHVHomePage: `${defaultLinks.nz}WorkingHoliday/`,
  ImmiWHVPage: "https://www.immigration.govt.nz/new-zealand-visas/apply-for-a-visa/about-visa/china-working-holiday-visa"
} : {
  VFSSchedulePage: defaultLinks.au,
  WeiboPage: "https://www.weibo.com/imagineaustralia",
  ambassadorPage: "https://china.embassy.gov.au/bjngchinese/Visas_and_Migration.html",
  ImmiWHVPage: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462",
  MoniPage: "https://moni.iwhver.com/"
}
const paths: Record<string, string> = {
  Personaldetails: "Wizard/Personal1.aspx", Identification: "Wizard/Personal2.aspx", Health: "Wizard/Medical1.aspx",
  Character: "Wizard/Character.aspx", WHSSpecific: "Wizard/WorkingHolidaySpecific.aspx", Submit: "Application/Submit.aspx"
}
function link(key: string): string {
  if (staticLinks[key]) return staticLinks[key]
  if (!number || !paths[key]) throw new Error("暂无表格号")
  const url = new URL(`WorkingHoliday/${paths[key]}`, defaultLinks.nz)
  url.searchParams.set("ApplicationId", number)
  if (key !== "Submit") { url.searchParams.set("IndividualType", "Primary"); url.searchParams.set("IndividualIndex", "1") }
  return url.href
}
async function refresh() {
  if (!isNZ) return
  const { setting } = await getState()
  number = setting["nz-form-number"]
  renderButtons(setting)
  showField("#nz-form-number", number)
  const manual = setting["manual-nz-form-number"] === "1"
  element("#enter-nz-form-number-module").style.display = manual ? "flex" : "none"
  element("#quota-notice-info-module").style.display = manual ? "none" : "block"
  element("#quota-notice-info").classList.toggle("alert-success", !!number)
  element("#quota-notice-info").classList.toggle("alert-warning", !number)
  element("#quota-notice-info-detail").textContent = number ? `表格号 : ${number}` : "暂未探测到表格号"
  document.querySelectorAll<HTMLButtonElement>(".quick-link, .copy-link").forEach(button => {
    button.disabled = !number
    if (button.classList.contains("copy-link")) button.textContent = number ? "复制链接" : "暂无链接"
  })
}
for (const key of [...Object.keys(staticLinks), ...(isNZ ? Object.keys(paths) : [])]) {
  element(`#${key}`).addEventListener("click", () => handle(() => chrome.tabs.create({ url: link(key) })))
  const button = element(`#${key}Copy`)
  button.addEventListener("click", () => handle(() => copied(button, link(key))))
}
if (isNZ) {
  const input = element<HTMLInputElement>("#nz-form-number")
  input.addEventListener("input", () => handle(async () => {
    await patchSettings({ "nz-form-number": input.value })
    saved()
    await refresh()
  }))
  bindButtons(refresh)
  watchSettings(refresh)
}
handle(refresh)
