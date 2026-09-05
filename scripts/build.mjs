import { spawn } from "node:child_process"
import { rm } from "node:fs/promises"
import { prepare } from "./postbuild.mjs"
import { verify } from "./verify-build.mjs"

await rm("build/chrome-mv3-prod", { recursive: true, force: true })
const code = await new Promise((resolve, reject) => {
  const child = spawn("node_modules/.bin/plasmo", ["build"], { stdio: "inherit" })
  child.once("error", reject)
  child.once("exit", resolve)
})
if (code !== 0) process.exitCode = typeof code === "number" ? code : 1
else { await prepare("prod"); await verify("prod") }
