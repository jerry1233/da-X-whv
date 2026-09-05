import DOMPurify from "dompurify"

export type NoticeType = "success" | "error" | "warning" | "info"
const paths: Record<NoticeType, string> = {
  success: "M6.41 0l-.69.72-2.78 2.78-.81-.78-.72-.72-1.41 1.41.72.72 1.5 1.5.69.72.72-.72 3.5-3.5.72-.72-1.44-1.41z",
  error: "M1.41 0l-1.41 1.41.72.72 1.78 1.81-1.78 1.78-.72.69 1.41 1.44.72-.72 1.81-1.81 1.78 1.81.69.72 1.44-1.44-.72-.69-1.81-1.78 1.81-1.81.72-.72-1.44-1.41-.69.72-1.78 1.78-1.81-1.78-.72-.72z",
  warning: "M3.09 0c-.06 0-.1.04-.13.09l-2.94 6.81c-.02.05-.03.13-.03.19v.81c0 .05.04.09.09.09h6.81c.05 0 .09-.04.09-.09v-.81c0-.05-.01-.14-.03-.19l-2.94-6.81c-.02-.05-.07-.09-.13-.09h-.81zm-.09 3h1v2h-1v-2zm0 3h1v1h-1v-1z",
  info: "M3 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-1.5 2.5c-.83 0-1.5.67-1.5 1.5h1c0-.28.22-.5.5-.5s.5.22.5.5-1 1.64-1 2.5c0 .86.67 1.5 1.5 1.5s1.5-.67 1.5-1.5h-1c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-.36 1-1.84 1-2.5 0-.81-.67-1.5-1.5-1.5z"
}
let container: HTMLDivElement | undefined
export function notify(type: NoticeType, html: string, duration = 10000) {
  if (!container?.isConnected) {
    container = document.createElement("div")
    container.className = "notifyjs-container"
    document.body.append(container)
  }
  const notice = document.createElement("div")
  notice.className = `notifyjs-notification alert-${type === "error" ? "danger" : type}`
  notice.style.display = "block"
  const icon = document.createElement("div")
  icon.className = "notifyjs-icon"
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 8 8")
  const path = document.createElementNS(svg.namespaceURI, "path")
  path.setAttribute("d", paths[type])
  svg.append(path)
  icon.append(svg)
  notice.append(icon, DOMPurify.sanitize(html, { ALLOWED_TAGS: ["b", "a", "br"], ALLOWED_ATTR: ["href"], RETURN_DOM_FRAGMENT: true }))
  for (const link of notice.querySelectorAll("a")) {
    if (link.protocol !== "https:") link.removeAttribute("href")
    link.target = "_blank"
    link.rel = "noopener noreferrer"
  }
  const progress = document.createElement("p")
  progress.className = "progress"
  notice.append(progress)
  container.append(notice)
  progress.animate([{ right: "100%" }, { right: "0%" }], { duration, fill: "forwards" })
  const timer = window.setTimeout(() => notice.remove(), duration)
  notice.addEventListener("click", () => { clearTimeout(timer); notice.remove() }, { once: true })
  while (container.childElementCount > 5) container.firstElementChild?.remove()
}
