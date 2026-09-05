import { access, readFile, readdir } from "node:fs/promises"
import path from "node:path"
import assert from "node:assert/strict"
import { pages } from "./postbuild.mjs"

export async function verify(mode) {
  const root = path.resolve(`build/chrome-mv3-${mode}`)
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"))
  const pkg = JSON.parse(await readFile("package.json", "utf8"))
  assert.equal(manifest.version, pkg.version)
  assert.equal(manifest.manifest_version, 3)
  assert.ok(!manifest.host_permissions.some(match => match === "<all_urls>" || match.includes("://*/*")))
  const files = [manifest.background.service_worker, manifest.action.default_popup, ...Object.values(manifest.icons)]
  for (const script of manifest.content_scripts) files.push(...script.js, ...script.css)
  for (const page of pages) {
    const html = await readFile(path.join(root, `${page}.html`), "utf8")
    for (const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
      if (!/^(?:https?:|data:|\/\/)/.test(match[1])) files.push(match[1])
    }
  }
  for (const file of files) await access(path.join(root, file))
  assert.ok(!(await readdir(path.join(root, "js"))).includes("bg.js"))
  console.log(`Verified ${mode} manifest, page resources and release version`)
}
