import { spawn } from "node:child_process"
import { watch } from "chokidar"
import { readFile, rm } from "node:fs/promises"
import { prepare, pages } from "./postbuild.mjs"

const manifestPath = "build/chrome-mv3-dev/manifest.json"
await rm("build/chrome-mv3-dev", { recursive: true, force: true })
let lastManifest = "", timer, running = false, pending = false, stopping = false
async function rebuild() {
  if (running) { pending = true; return }
  running = true
  try {
    await prepare("dev")
    lastManifest = await readFile(manifestPath, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") pending = true
    else console.error(error)
  } finally {
    running = false
    if (pending) { pending = false; schedule() }
  }
}
function schedule() { if (!stopping) { clearTimeout(timer); timer = setTimeout(rebuild, 200) } }
const watcher = watch(["src", "assets", "css", "images", "js/jquery-3.5.1.min.js", ...pages.map(page => `${page}.html`), "build"], { ignoreInitial: true })
watcher.on("all", async (_event, file) => {
  if (file.startsWith("build/") && file !== manifestPath) return
  if (file === manifestPath) {
    try { if (await readFile(file, "utf8") === lastManifest) return } catch { return }
  }
  schedule()
})
const child = spawn("node_modules/.bin/plasmo", ["dev"], { stdio: "inherit" })
async function stop(code = 0) {
  if (stopping) return
  stopping = true
  clearTimeout(timer)
  await watcher.close()
  child.kill("SIGTERM")
  process.exitCode = code
}
child.on("error", error => { console.error(error); void stop(1) })
child.on("exit", code => { void stop(code ?? 0) })
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void stop() })
schedule()
